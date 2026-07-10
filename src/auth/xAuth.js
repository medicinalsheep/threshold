/**
 * X (Twitter) OAuth 2.0 — Authorization Code + PKCE (public SPA client).
 *
 * Setup (developer.x.com):
 *  1. Create app → User authentication → OAuth 2.0
 *  2. Type: Single page App (public client)
 *  3. Callback URLs: https://medicinalsheep.github.io/threshold/
 *                    http://localhost:5173/
 *                    http://127.0.0.1:5173/
 *  4. Copy Client ID → VITE_X_CLIENT_ID in .env / Pages env
 *
 * This signs you into Threshold as an X user. It does NOT unlock SuperGrok
 * or xAI API keys — those still use console.x.ai for Grok generation.
 */

const STORAGE = 'threshold_x_session_v2';
const PKCE_KEY = 'threshold_x_pkce';
const AUTH_URL = 'https://x.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const ME_URL = 'https://api.twitter.com/2/users/me';
/** Required scopes — missing any means re-sign-in (refresh does not upgrade scopes) */
const SCOPE_LIST = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
const SCOPES = SCOPE_LIST.join(' ');

function clientId() {
    return (import.meta.env.VITE_X_CLIENT_ID || '').trim();
}

function redirectUri() {
    const explicit = (import.meta.env.VITE_X_REDIRECT_URI || '').trim();
    if (explicit) return explicit;
    // Stable path without hash/query — must match X developer portal exactly
    const u = new URL(window.location.href);
    u.hash = '';
    u.search = '';
    // Normalize trailing slash consistency
    let href = u.href;
    if (!href.endsWith('/')) {
        // keep file path as-is for non-dir URLs
        if (href.endsWith('index.html')) href = href.replace(/index\.html$/, '');
    }
    return href;
}

function loadSession() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE) || 'null');
    } catch {
        return null;
    }
}

function saveSession(session) {
    if (!session) {
        localStorage.removeItem(STORAGE);
        return null;
    }
    localStorage.setItem(STORAGE, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent('x-auth-change', { detail: session }));
    return session;
}

function b64url(buf) {
    const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    let s = '';
    bytes.forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(len = 64) {
    const a = new Uint8Array(len);
    crypto.getRandomValues(a);
    return b64url(a);
}

async function sha256(plain) {
    const data = new TextEncoder().encode(plain);
    return crypto.subtle.digest('SHA-256', data);
}

async function createPkce() {
    const verifier = randomString(64);
    const challenge = b64url(await sha256(verifier));
    return { verifier, challenge };
}

async function exchangeToken(body) {
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data.error_description || data.error || `token ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

async function fetchMe(accessToken) {
    const url = `${ME_URL}?user.fields=profile_image_url,name,username`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.detail || data.title || `users/me ${res.status}`);
    }
    return data.data || null;
}

function sessionFromToken(token, user) {
    const expiresIn = Number(token.expires_in) || 7200;
    return {
        accessToken: token.access_token,
        refreshToken: token.refresh_token || null,
        tokenType: token.token_type || 'bearer',
        scope: token.scope || SCOPES,
        expiresAt: Date.now() + expiresIn * 1000 - 30_000,
        user: user
            ? {
                id: user.id,
                name: user.name,
                username: user.username,
                profileImageUrl: user.profile_image_url || null,
            }
            : null,
    };
}

export const XAuth = {
    isConfigured() {
        return Boolean(clientId());
    },

    getClientId: clientId,
    getRedirectUri: redirectUri,

    getSession() {
        return loadSession();
    },

    isLoggedIn() {
        const s = loadSession();
        return Boolean(s?.accessToken && s?.user);
    },

    getUser() {
        return loadSession()?.user || null;
    },

    getAccessToken() {
        return loadSession()?.accessToken || null;
    },

    getGrantedScopes() {
        const raw = loadSession()?.scope || '';
        return new Set(String(raw).split(/[\s+]+/).filter(Boolean));
    },

    hasScope(scope) {
        return this.getGrantedScopes().has(scope);
    },

    /** Scopes we need that the token does not include */
    missingScopes() {
        const granted = this.getGrantedScopes();
        // If scope string empty (old session), treat all as unknown → require re-auth for write
        if (!granted.size && this.isLoggedIn()) {
            return [...SCOPE_LIST];
        }
        return SCOPE_LIST.filter((s) => !granted.has(s));
    },

    canPost() {
        return this.isLoggedIn() && this.hasScope('tweet.write');
    },

    needsRescope() {
        return this.isLoggedIn() && this.missingScopes().length > 0;
    },

    requiredScopes() {
        return [...SCOPE_LIST];
    },

    async _authFetch(url, options = {}) {
        await this.refreshIfNeeded();
        const token = this.getAccessToken();
        if (!token) throw new Error('Sign in with X first');
        const res = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...(options.headers || {}),
            },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data.detail || data.title || data.error_description
                || data.errors?.[0]?.message
                || `X API ${res.status}`;
            const err = new Error(msg);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    },

    /**
     * Home-ish feed: reverse chronological timeline, fallback to own tweets.
     * @returns {Promise<{tweets: object[], source: string, meta?: object}>}
     */
    async fetchFeed(maxResults = 20) {
        const user = this.getUser();
        if (!user?.id) throw new Error('Sign in with X first');
        const n = Math.min(100, Math.max(5, maxResults));

        try {
            const q = new URLSearchParams({
                max_results: String(n),
                expansions: 'author_id',
                'tweet.fields': 'created_at,public_metrics,entities,lang',
                'user.fields': 'name,username,profile_image_url',
            });
            const data = await this._authFetch(
                `https://api.twitter.com/2/users/${user.id}/timelines/reverse_chronological?${q}`
            );
            return {
                tweets: hydrateTweets(data),
                source: 'home',
                meta: data.meta,
            };
        } catch (e) {
            // Free tier / app permissions often block reverse_chronological
            if (e.status === 403 || e.status === 400 || /not available|forbidden|access/i.test(e.message)) {
                const q = new URLSearchParams({
                    max_results: String(n),
                    exclude: 'replies',
                    'tweet.fields': 'created_at,public_metrics,entities,lang',
                    'user.fields': 'name,username,profile_image_url',
                });
                const data = await this._authFetch(
                    `https://api.twitter.com/2/users/${user.id}/tweets?${q}`
                );
                // inject self as author for hydrate
                data.includes = {
                    users: [{
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        profile_image_url: user.profileImageUrl,
                    }],
                };
                return {
                    tweets: hydrateTweets(data),
                    source: 'me',
                    meta: data.meta,
                    notice: 'Home timeline unavailable on this X app tier — showing your posts.',
                };
            }
            throw e;
        }
    },

    /** Post a tweet (needs tweet.write — call login() again after enabling in developer.x.com) */
    async createPost(text) {
        const body = String(text || '').trim();
        if (!body) throw new Error('Write something first');
        if (body.length > 280) throw new Error(`Too long (${body.length}/280)`);
        if (!this.canPost()) {
            throw new Error('Missing tweet.write — Sign out of X, then Sign in with X again (and enable tweet.write on developer.x.com)');
        }
        const data = await this._authFetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            body: JSON.stringify({ text: body }),
        });
        return data.data || data;
    },

    /** x.com home — open in the computer’s browser (Chrome if default). Browse/login there freely. */
    X_HOME: 'https://x.com/',

    /**
     * Open X in a real browser on this PC.
     * @param {{ inApp?: boolean }} [opts] Electron: inApp true = Chromium window; false/default = OS browser
     */
    async openInBrowser(opts = {}) {
        const url = this.X_HOME;
        const shell = window.ThresholdShellBridge || window.ThresholdShell;
        try {
            if (opts.inApp && shell?.openBrowserWindow) {
                await shell.openBrowserWindow(url);
                window.UI?.status?.('Opened X in app window — log in there if you want (separate from Threshold)');
                return true;
            }
            if (shell?.openExternal) {
                await shell.openExternal(url);
            } else {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
            window.UI?.status?.('Opened X in your browser (Chrome if it’s the default)');
            return true;
        } catch (e) {
            window.UI?.status?.(e?.message || 'Could not open browser');
            return false;
        }
    },

    /** Start OAuth redirect (PKCE) — optional Threshold account link, not required to browse X */
    async login() {
        if (!this.isConfigured()) {
            throw new Error('X login not configured — set VITE_X_CLIENT_ID (developer.x.com app, SPA + PKCE)');
        }
        const { verifier, challenge } = await createPkce();
        const state = randomString(24);
        sessionStorage.setItem(PKCE_KEY, JSON.stringify({
            verifier,
            state,
            redirectUri: redirectUri(),
            at: Date.now(),
        }));

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: clientId(),
            redirect_uri: redirectUri(),
            scope: SCOPES,
            state,
            code_challenge: challenge,
            code_challenge_method: 'S256',
        });
        window.location.assign(`${AUTH_URL}?${params.toString()}`);
    },

    logout() {
        saveSession(null);
        sessionStorage.removeItem(PKCE_KEY);
        this.syncUi();
    },

    /**
     * Handle ?code=&state= return from X. Call early on boot.
     * @returns {Promise<object|null>} session or null if no callback
     */
    async handleRedirectCallback() {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const err = url.searchParams.get('error');
        if (err) {
            this._stripOauthParams();
            throw new Error(url.searchParams.get('error_description') || err);
        }
        if (!code || !state) return null;

        const raw = sessionStorage.getItem(PKCE_KEY);
        if (!raw) {
            this._stripOauthParams();
            throw new Error('OAuth state missing — try Sign in with X again');
        }
        let pkce;
        try {
            pkce = JSON.parse(raw);
        } catch {
            throw new Error('Invalid OAuth state store');
        }
        if (pkce.state !== state) {
            this._stripOauthParams();
            throw new Error('OAuth state mismatch — try again');
        }

        const token = await exchangeToken({
            code,
            grant_type: 'authorization_code',
            client_id: clientId(),
            redirect_uri: pkce.redirectUri || redirectUri(),
            code_verifier: pkce.verifier,
        });

        sessionStorage.removeItem(PKCE_KEY);
        const user = await fetchMe(token.access_token);
        const session = sessionFromToken(token, user);
        saveSession(session);
        this._stripOauthParams();
        this.syncUi();
        return session;
    },

    _stripOauthParams() {
        const url = new URL(window.location.href);
        ['code', 'state', 'error', 'error_description'].forEach((k) => url.searchParams.delete(k));
        const clean = url.pathname + (url.search || '') + (url.hash || '');
        window.history.replaceState({}, '', clean || url.pathname);
    },

    async refreshIfNeeded() {
        const s = loadSession();
        if (!s?.refreshToken) return s;
        if (s.expiresAt && Date.now() < s.expiresAt) return s;
        try {
            const token = await exchangeToken({
                grant_type: 'refresh_token',
                refresh_token: s.refreshToken,
                client_id: clientId(),
            });
            const user = s.user || await fetchMe(token.access_token);
            const next = sessionFromToken(token, user);
            // Keep prior refresh if response omits
            if (!next.refreshToken) next.refreshToken = s.refreshToken;
            return saveSession(next);
        } catch (e) {
            console.warn('[x-auth] refresh failed', e.message || e);
            saveSession(null);
            return null;
        }
    },

    /** Wire buttons + show user chip */
    syncUi() {
        const user = this.getUser();
        const configured = this.isConfigured();

        document.querySelectorAll('[data-x-auth-login]').forEach((btn) => {
            // Always show the control — disabled + title if app not configured
            btn.hidden = false;
            btn.disabled = !configured || !!user;
            if (!configured) {
                btn.title = 'Set VITE_X_CLIENT_ID (developer.x.com SPA app) then rebuild';
                btn.setAttribute('aria-disabled', 'true');
            } else if (user) {
                btn.title = `Signed in as @${user.username}`;
                btn.setAttribute('aria-disabled', 'true');
            } else {
                btn.title = 'Opens X OAuth — authorize Threshold (not SuperGrok tab cookies)';
                btn.removeAttribute('aria-disabled');
            }
            // Hide login once signed in (avatar/handle take its place)
            if (user && (btn.closest('.lobby-account-card') || btn.closest('.lobby-x-auth') || btn.closest('#auth-card'))) {
                btn.style.display = 'none';
            } else {
                btn.style.display = '';
            }
        });
        document.querySelectorAll('[data-x-auth-logout]').forEach((btn) => {
            btn.hidden = !user;
        });
        document.querySelectorAll('[data-x-menu-open]').forEach((btn) => {
            btn.hidden = false;
            btn.disabled = !configured;
            btn.classList.toggle('x-menu-signed-in', !!user);
            btn.title = !configured
                ? 'X menu needs VITE_X_CLIENT_ID'
                : (user ? `X · @${user.username}` : 'X feed & post — sign in first');
        });
        document.querySelectorAll('[data-x-auth-user]').forEach((el) => {
            if (!user) {
                el.hidden = true;
                el.textContent = '';
                return;
            }
            el.hidden = false;
            el.textContent = `@${user.username}`;
            el.title = user.name || user.username;
        });
        document.querySelectorAll('[data-x-auth-avatar]').forEach((img) => {
            if (!user?.profileImageUrl) {
                img.hidden = true;
                img.removeAttribute('src');
                return;
            }
            img.hidden = false;
            img.src = user.profileImageUrl.replace('_normal', '_bigger');
            img.alt = `@${user.username}`;
        });
        // Parent user rows (lobby)
        document.querySelectorAll('.lobby-x-user').forEach((row) => {
            row.hidden = !user;
        });
        document.querySelectorAll('[data-x-auth-configured]').forEach((el) => {
            // Show setup hint when Client ID missing
            el.hidden = configured;
        });

        // Nav: Sign in X vs chip
        document.querySelectorAll('nav [data-x-auth-login], #app-nav [data-x-auth-login]').forEach((btn) => {
            if (!configured) {
                btn.style.display = '';
                btn.textContent = 'X (setup)';
            } else if (user) {
                btn.style.display = 'none';
            } else {
                btn.style.display = '';
                if (btn.textContent.includes('setup') || btn.textContent.trim() === 'X (setup)') {
                    btn.textContent = 'Sign in X';
                }
            }
        });

        // Nav logout: show if X or xAI session
        const logoutBtn = document.getElementById('auth-logout-btn');
        if (logoutBtn) {
            const show = Boolean(user) || Boolean(window.Auth?.isLoggedIn?.());
            logoutBtn.style.display = show ? 'inline-block' : 'none';
            logoutBtn.title = user ? `Sign out @${user.username}` : 'Clear xAI key';
        }

        // Display-name X options (lobby)
        window.DisplayName?.syncUi?.();
    },

    bindUi() {
        document.querySelectorAll('[data-x-auth-login]').forEach((btn) => {
            if (btn.dataset.bound) return;
            btn.dataset.bound = '1';
            btn.addEventListener('click', async () => {
                try {
                    if (!this.isConfigured()) {
                        window.UI?.status?.('X login needs VITE_X_CLIENT_ID — see docs/AUTH.md');
                        return;
                    }
                    if (this.isLoggedIn()) {
                        window.UI?.status?.(`Already signed in as @${this.getUser()?.username}`);
                        return;
                    }
                    window.UI?.status?.('Redirecting to X to authorize…');
                    await this.login();
                } catch (e) {
                    window.UI?.status?.(e.message || 'X login failed');
                    console.warn('[x-auth]', e);
                }
            });
        });
        document.querySelectorAll('[data-x-auth-logout]').forEach((btn) => {
            if (btn.dataset.bound) return;
            btn.dataset.bound = '1';
            btn.addEventListener('click', () => {
                this.logout();
                window.UI?.status?.('Signed out of X');
            });
        });
        // Open X in OS browser / optional Electron Chromium window
        document.querySelectorAll('[data-x-open-browser]').forEach((btn) => {
            if (btn.dataset.bound) return;
            btn.dataset.bound = '1';
            btn.addEventListener('click', () => {
                void this.openInBrowser({ inApp: btn.dataset.xOpenBrowser === 'app' });
            });
        });
        this.syncUi();
        window.addEventListener('x-auth-change', () => this.syncUi());
    },
};

function hydrateTweets(data) {
    const users = new Map((data.includes?.users || []).map((u) => [u.id, u]));
    return (data.data || []).map((t) => {
        const author = users.get(t.author_id) || null;
        return {
            id: t.id,
            text: t.text,
            createdAt: t.created_at,
            metrics: t.public_metrics || {},
            author: author
                ? {
                    id: author.id,
                    name: author.name,
                    username: author.username,
                    profileImageUrl: author.profile_image_url,
                }
                : null,
            url: author?.username
                ? `https://x.com/${author.username}/status/${t.id}`
                : `https://x.com/i/web/status/${t.id}`,
        };
    });
}

window.XAuth = XAuth;
