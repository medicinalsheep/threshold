import { IS_GROK_EDITION } from '../config.js';

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
        // hydrate session from persistent if only local was set
        if (!sessionStorage.getItem(SESSION_KEY) && this.isRemembered()) {
            sessionStorage.setItem(SESSION_KEY, localStorage.getItem(LOCAL_KEY));
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

export function initAuth() {
    Auth.hydrate();

    const overlay = document.getElementById('auth-overlay');
    const form = document.getElementById('auth-form');
    const input = document.getElementById('auth-api-key');
    const logoutBtn = document.getElementById('auth-logout-btn');
    const editionBadge = document.getElementById('edition-badge');

    if (editionBadge) {
        editionBadge.textContent = IS_GROK_EDITION ? 'GROK' : 'WEB';
        editionBadge.classList.toggle('grok', IS_GROK_EDITION);
    }

    if (!IS_GROK_EDITION) {
        overlay?.remove();
        // Keep logout hidden on web unless key present
        if (logoutBtn) {
            logoutBtn.style.display = Auth.isLoggedIn() ? 'inline-block' : 'none';
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
                logoutBtn.style.display = 'none';
                window.AgentStatus?.refresh?.();
                window.AgentPortal?.runDetect?.();
            });
        }
        return;
    }

    const showOverlay = () => {
        if (overlay) overlay.style.display = 'flex';
    };

    const hideOverlay = () => {
        if (overlay) overlay.style.display = 'none';
    };

    const syncAuthUi = () => {
        if (Auth.isLoggedIn()) {
            hideOverlay();
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
        } else {
            showOverlay();
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
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

    logoutBtn?.addEventListener('click', () => {
        Auth.logout();
        syncAuthUi();
    });

    syncAuthUi();
}
