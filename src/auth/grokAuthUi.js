/**
 * Grok (xAI) auth UI — optional cloud AI key.
 * Uses Auth (API key) + GrokClient probe; does not use SuperGrok browser session.
 */

import { GrokClient } from '../grok/client.js';

function auth() {
    return window.Auth;
}

export const GrokAuthUi = {
    init() {
        if (this._bound) return;
        this._bound = true;

        document.querySelectorAll('[data-grok-auth-open]').forEach((btn) => {
            btn.addEventListener('click', () => this.openModal());
        });
        document.getElementById('grok-auth-close')?.addEventListener('click', () => this.closeModal());
        document.getElementById('grok-auth-backdrop')?.addEventListener('click', (e) => {
            if (e.target.id === 'grok-auth-backdrop') this.closeModal();
        });
        document.getElementById('grok-auth-save')?.addEventListener('click', () => this.saveFromModal());
        document.getElementById('grok-auth-test')?.addEventListener('click', () => void this.testFromModal());
        document.getElementById('grok-auth-clear')?.addEventListener('click', () => {
            auth()?.logout?.();
            this.syncUi();
            window.AgentPortal?.runDetect?.();
            window.UI?.status?.('Grok key cleared');
        });
        document.getElementById('grok-auth-model')?.addEventListener('change', (e) => {
            const id = e.target?.value;
            if (id) GrokClient.setPrefs({ chatModel: id, codeModel: id });
        });

        this.fillModels();
        this.syncUi();
        window.addEventListener('grok-config-change', () => this.syncUi());
    },

    fillModels() {
        const sel = document.getElementById('grok-auth-model');
        if (!sel || !GrokClient?.listChatModels) return;
        const cur = GrokClient.getChatModel();
        sel.innerHTML = GrokClient.listChatModels().map((m) =>
            `<option value="${m.id}" ${m.id === cur ? 'selected' : ''}>${m.label || m.id}</option>`
        ).join('');
    },

    openModal() {
        this.fillModels();
        const Auth = auth();
        const rem = document.getElementById('grok-auth-remember');
        if (rem) rem.checked = Auth?.isRemembered?.() === true;
        const input = document.getElementById('grok-auth-key');
        if (input) {
            input.value = '';
            input.placeholder = Auth?.isLoggedIn?.() ? '•••••••• (saved — paste to replace)' : 'xai-…';
        }
        const status = document.getElementById('grok-auth-status');
        if (status) {
            status.textContent = Auth?.isLoggedIn?.()
                ? `Key on file · model ${GrokClient.getChatModel?.() || 'grok-4.5'}`
                : 'No key yet — get one at console.x.ai';
        }
        document.getElementById('grok-auth-backdrop')?.classList.add('open');
        document.body.classList.add('grok-auth-open');
    },

    closeModal() {
        document.getElementById('grok-auth-backdrop')?.classList.remove('open');
        document.body.classList.remove('grok-auth-open');
    },

    saveFromModal() {
        const Auth = auth();
        const key = document.getElementById('grok-auth-key')?.value?.trim();
        const remember = document.getElementById('grok-auth-remember')?.checked === true;
        if (!key && Auth?.isLoggedIn?.()) {
            if (!remember && Auth.isRemembered?.()) {
                const k = Auth.apiKey;
                Auth.logout();
                Auth.login(k, { remember: false });
            }
            this.syncUi();
            this.closeModal();
            window.UI?.status?.('Grok settings saved');
            return;
        }
        if (!key) {
            window.UI?.status?.('Paste an xai-… key');
            return;
        }
        if (Auth?.login?.(key, { remember })) {
            this.syncUi();
            void this.testFromModal(true);
            window.AgentPortal?.runDetect?.();
            window.AgentStatus?.refresh?.();
            window.UI?.status?.(remember ? 'Grok key saved on this device' : 'Grok key saved for this tab');
        }
    },

    async testFromModal(quiet = false) {
        const Auth = auth();
        const status = document.getElementById('grok-auth-status');
        const typed = document.getElementById('grok-auth-key')?.value?.trim();
        const remember = document.getElementById('grok-auth-remember')?.checked === true;
        if (typed) Auth?.login?.(typed, { remember });
        if (!Auth?.isLoggedIn?.()) {
            if (status) status.textContent = 'Paste key first';
            return;
        }
        if (status) status.textContent = 'Testing api.x.ai…';
        const result = await GrokClient.probe(10000);
        if (result.ok) {
            if (status) status.textContent = `✓ Grok API OK · ${result.model || GrokClient.getChatModel()}`;
            if (!quiet) window.UI?.status?.('Grok API connected');
            this.syncUi();
            window.AgentPortal?.runDetect?.();
        } else {
            if (status) status.textContent = `✗ ${result.detail || result.error}`;
            if (!quiet) window.UI?.status?.(String(result.error || 'probe failed').slice(0, 80));
        }
    },

    syncUi() {
        const on = !!auth()?.isLoggedIn?.();
        document.querySelectorAll('[data-grok-auth-status]').forEach((el) => {
            el.textContent = on ? 'Grok ✓' : 'Grok';
            el.classList.toggle('grok-auth-on', on);
            el.title = on
                ? `xAI key active · ${GrokClient.getChatModel?.() || 'grok-4.5'}`
                : 'Connect Grok API key (console.x.ai)';
        });
        document.querySelectorAll('[data-grok-auth-chip]').forEach((el) => {
            el.hidden = false;
            el.classList.toggle('grok-auth-on', on);
        });
        document.querySelectorAll('[data-grok-connected]').forEach((el) => {
            el.hidden = !on;
        });
        document.querySelectorAll('[data-grok-disconnected]').forEach((el) => {
            el.hidden = on;
        });
    },
};

window.GrokAuthUi = GrokAuthUi;
