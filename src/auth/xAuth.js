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

const STORAGE = 'threshold_x_session_v1';
const PKCE_KEY = 'threshold_x_pkce';
const AUTH_URL = 'https://x.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const ME_URL = 'https://api.twitter.com/2/users/me';
const SCOPES = ['tweet.read', 'users.read', 'offline.access'].join(' ');

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

    /** Start OAuth redirect (PKCE) */
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
            btn.hidden = !configured;
            btn.disabled = false;
        });
        document.querySelectorAll('[data-x-auth-logout]').forEach((btn) => {
            btn.hidden = !user;
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
        document.querySelectorAll('[data-x-auth-login]').forEach((btn) => {
            if (user && btn.closest('.lobby-x-auth, #agent-portal-xai-wrap, #auth-card')) {
                btn.style.display = user ? 'none' : '';
            } else if (configured) {
                btn.style.display = '';
            }
        });
        document.querySelectorAll('[data-x-auth-configured]').forEach((el) => {
            el.hidden = configured;
        });

        // Nav logout: show if X or xAI session
        const logoutBtn = document.getElementById('auth-logout-btn');
        if (logoutBtn && !document.body.dataset.authLogoutBound) {
            // leave existing handler; visibility managed below
        }
        if (logoutBtn) {
            const show = Boolean(user) || Boolean(window.Auth?.isLoggedIn?.());
            logoutBtn.style.display = show ? 'inline-block' : 'none';
            logoutBtn.title = user ? `Sign out @${user.username}` : 'Clear xAI key';
        }
    },

    bindUi() {
        document.querySelectorAll('[data-x-auth-login]').forEach((btn) => {
            if (btn.dataset.bound) return;
            btn.dataset.bound = '1';
            btn.addEventListener('click', async () => {
                try {
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
        this.syncUi();
        window.addEventListener('x-auth-change', () => this.syncUi());
    },
};

window.XAuth = XAuth;
