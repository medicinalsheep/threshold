import { IS_GROK_EDITION } from '../config.js';

const STORAGE_KEY = 'threshold_xai_key';

export const Auth = {
    get apiKey() {
        return sessionStorage.getItem(STORAGE_KEY) || '';
    },

    isLoggedIn() {
        return Boolean(this.apiKey);
    },

    login(apiKey) {
        const key = apiKey.trim();
        if (!key) return false;
        sessionStorage.setItem(STORAGE_KEY, key);
        return true;
    },

    logout() {
        sessionStorage.removeItem(STORAGE_KEY);
    }
};

export function initAuth() {
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
        logoutBtn?.remove();
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
        if (Auth.login(input?.value || '')) {
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