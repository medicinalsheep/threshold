/** Toolbar chip — agent connection status; tap to open portal */

import { Auth } from '../auth/main.js';
import { OllamaClient } from './ollamaClient.js';

let lastState = '';

export const AgentReconnectChip = {
    init() {
        const el = document.getElementById('agent-reconnect-chip');
        if (!el) return;
        el.addEventListener('click', () => window.AgentPortal?.show?.());
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.AgentPortal?.show?.();
            }
        });
        window.addEventListener('agent-portal-change', () => this.refresh());
        window.addEventListener('agent-config-change', () => this.refresh());
        this.refresh();
    },

    async refresh() {
        const el = document.getElementById('agent-reconnect-chip');
        if (!el) return;

        const session = window.AgentPortal?.getSession?.() || {};
        const connected = !!session.connected;

        let grok = Auth.isLoggedIn();
        let ollama = false;
        try {
            const p = await OllamaClient.probe(1200);
            ollama = p.ok;
        } catch { /* offline */ }

        const hasProvider = grok || ollama;
        let state = 'off';
        if (connected && hasProvider) state = 'ok';
        else if (hasProvider) state = 'warn';

        if (state === lastState && el.dataset.state === state) return;
        lastState = state;
        el.dataset.state = state;

        el.classList.remove('agent-reconnect-ok', 'agent-reconnect-warn', 'agent-reconnect-off');
        el.classList.add(`agent-reconnect-${state}`);

        const longLabel = state === 'ok' ? 'Agent ✓' : 'Agent —';
        const shortLabel = state === 'ok' ? 'AI ✓' : 'AI —';
        el.innerHTML = `<span class="chip-label-long">${longLabel}</span><span class="chip-label-short">${shortLabel}</span>`;

        const titles = {
            ok: 'AI connected — tap to open build assistant',
            warn: 'Provider detected — tap to connect and start building',
            off: 'No AI provider — tap to add Grok key or start Ollama',
        };
        el.title = titles[state];
        el.setAttribute('aria-label', el.title);
        window.CornerHub?.syncAgentChip?.();
    },
};

window.AgentReconnectChip = AgentReconnectChip;