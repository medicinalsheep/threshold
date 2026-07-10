import { IS_GROK_EDITION } from '../config.js';
import { XAuth } from './xAuth.js';
import { XFeed } from './xFeed.js';
import { DisplayName } from './displayName.js';
import { GrokAuthUi } from './grokAuthUi.js';

const SESSION_KEY = 'threshold_xai_key';
const LOCAL_KEY = 'threshold_xai_key_persistent';
const REMEMBER_FLAG = 'threshold_xai_remember';

export const Auth = {
    get apiKey() {
        return sessionStorage.getItem(SESSION_KEY)
            || (localStorage.getItem(REMEMBER_FLAG) === '1' ? localStorage.getItem(LOCAL_KEY) : '')
            || '';
    },

    isLoggedIn() {
        return Boolean(this.apiKey);
    },

    isRemembered() {
        return localStorage.getItem(REMEMBER_FLAG) === '1' && Boolean(localStorage.getItem(LOCAL_KEY));
    },

    /**
     * @param {string} apiKey
     * @param {{ remember?: boolean }} [opts]
     */
    login(apiKey, opts = {}) {
        const key = String(apiKey || '').trim();
        if (!key) return false;
        sessionStorage.setItem(SESSION_KEY, key);
        if (opts.remember) {
            localStorage.setItem(REMEMBER_FLAG, '1');
            localStorage.setItem(LOCAL_KEY, key);
        } else if (opts.remember === false) {
            localStorage.removeItem(REMEMBER_FLAG);
            localStorage.removeItem(LOCAL_KEY);
        }
        return true;
    },

    logout() {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(REMEMBER_FLAG);
        localStorage.removeItem(LOCAL_KEY);
    },

    /** Ensure sessionStorage has key if user opted into remember */
    hydrate() {
        if (!sessionStorage.getItem(SESSION_KEY) && this.isRemembered()) {
            sessionStorage.setItem(SESSION_KEY, localStorage.getItem(LOCAL_KEY) || '');
        }
        return this.isLoggedIn();
    },
};

window.Auth = Auth;

export async function initAuth() {
    Auth.hydrate();

    // X OAuth callback (may throw — show status, don't block boot)
    try {
        const session = await XAuth.handleRedirectCallback();
        if (session?.user) {
            // Only auto-switch to X handle if user hasn't set a custom name
            const src = DisplayName.getSource();
            const custom = DisplayName.getCustom();
            if (src === 'custom' && (!custom || /^Player/i.test(custom))) {
                DisplayName.setSource('x_username');
            } else {
                DisplayName.applyResolvedToStorage();
            }
            window.UI?.status?.(`Signed in as @${session.user.username}`);
        }
    } catch (e) {
        console.warn('[auth] X callback', e.message || e);
        window.UI?.status?.(e.message || 'X sign-in failed');
    }

    await XAuth.refreshIfNeeded();
    XAuth.bindUi();
    XAuth.syncUi();
    DisplayName.bindUi();
    XFeed.init();
    GrokAuthUi.init();

    const overlay = document.getElementById('auth-overlay');
    const form = document.getElementById('auth-form');
    const input = document.getElementById('auth-api-key');
    const logoutBtn = document.getElementById('auth-logout-btn');
    const editionBadge = document.getElementById('edition-badge');

    if (editionBadge) {
        editionBadge.textContent = IS_GROK_EDITION ? 'GROK' : 'WEB';
        editionBadge.classList.toggle('grok', IS_GROK_EDITION);
    }

    const syncLogoutBtn = () => {
        if (!logoutBtn) return;
        const xUser = XAuth.getUser();
        const hasXai = Auth.isLoggedIn();
        logoutBtn.style.display = (xUser || hasXai) ? 'inline-block' : 'none';
        if (xUser && hasXai) logoutBtn.textContent = 'SIGN OUT';
        else if (xUser) logoutBtn.textContent = 'SIGN OUT X';
        else if (hasXai) logoutBtn.textContent = 'CLEAR GROK';
        else logoutBtn.textContent = 'LOGOUT';
        GrokAuthUi.syncUi();
    };

    logoutBtn?.addEventListener('click', () => {
        // Clear both account types (user can re-add either)
        XAuth.logout();
        Auth.logout();
        syncLogoutBtn();
        GrokAuthUi.syncUi();
        window.AgentStatus?.refresh?.();
        window.AgentPortal?.runDetect?.();
        window.UI?.status?.('Signed out (X + Grok key cleared)');
    });

    // Grok edition: keep API-key overlay when no xAI key
    if (IS_GROK_EDITION) {
        const showOverlay = () => { if (overlay) overlay.style.display = 'flex'; };
        const hideOverlay = () => { if (overlay) overlay.style.display = 'none'; };

        const syncAuthUi = () => {
            if (Auth.isLoggedIn()) hideOverlay();
            else showOverlay();
            syncLogoutBtn();
            XAuth.syncUi();
        };

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const remember = document.getElementById('auth-remember-key')?.checked === true;
            if (Auth.login(input?.value || '', { remember })) {
                syncAuthUi();
                if (input) input.value = '';
                window.AgentStatus?.refresh?.();
                window.AgentReconnectChip?.refresh?.();
                window.AgentPortal?.startIfNeeded?.();
            }
        });

        syncAuthUi();
    } else {
        overlay?.remove();
        syncLogoutBtn();
    }

    window.addEventListener('x-auth-change', syncLogoutBtn);
    window.addEventListener('grok-config-change', syncLogoutBtn);
}
