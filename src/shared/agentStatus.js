import { Auth } from '../auth/main.js';
import { CreativeWatch } from './creativeWatch.js';
import { OllamaClient } from './ollamaClient.js';
import { AgentHub } from './agentHub.js';
import { TextureLibrary } from './textureLibrary.js';
import { CREATIVE_WATCH_URL } from '../config.js';

let lastSnapshot = null;

function chipClass(state) {
    if (state === 'ok') return 'agent-status-ok';
    if (state === 'warn') return 'agent-status-warn';
    return 'agent-status-off';
}

function renderChip(id, label, state, detail) {
    return `<span class="agent-status-chip ${chipClass(state)}" data-status-id="${id}" title="${detail || ''}">${label}</span>`;
}

export const AgentStatus = {
    get snapshot() {
        return lastSnapshot;
    },

    async refresh() {
        const grokOk = Auth.isLoggedIn();
        const localCfg = AgentHub.getConfig('local');
        const localOn = localCfg.enabled && localCfg.script?.trim();
        const texCount = TextureLibrary.list()?.length ?? 0;

        let ollama = { ok: false, models: [], error: 'checking…' };
        let watchHealth = false;
        try {
            ollama = await OllamaClient.probe(2500);
        } catch (e) {
            ollama = { ok: false, models: [], error: e.message };
        }

        const baseUrl = CREATIVE_WATCH_URL.replace(/\/$/, '');
        try {
            const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1500) });
            watchHealth = res.ok;
        } catch {
            watchHealth = false;
        }

        const watchConnected = CreativeWatch.connected;
        const watchState = watchConnected ? 'ok' : (watchHealth ? 'warn' : 'off');
        const watchDetail = watchConnected
            ? 'Hot-reload active (textures / GLTF / video)'
            : (watchHealth ? 'Relay up — open Engine on localhost to connect' : 'Run: npm run textures:watch');

        lastSnapshot = {
            grok: grokOk,
            ollama,
            watchHealth,
            watchConnected,
            localOn,
            texCount,
            ollamaModel: OllamaClient.defaultModel,
        };

        const el = document.getElementById('agent-status-chips');
        if (!el) return lastSnapshot;

        const ollamaState = ollama.ok ? 'ok' : 'off';
        const ollamaDetail = ollama.ok
            ? `${ollama.models.length} model(s) — using ${OllamaClient.defaultModel}`
            : `Offline (${ollama.error}) — ollama serve`;

        el.innerHTML = [
            renderChip('grok', grokOk ? 'Grok ✓' : 'Grok —', grokOk ? 'ok' : 'off',
                grokOk ? 'xAI key in this tab (sessionStorage)' : 'Paste xAI key below — not shared from other Grok tabs'),
            renderChip('ollama', ollama.ok ? 'Ollama ✓' : 'Ollama —', ollamaState, ollamaDetail),
            renderChip('watch', watchConnected ? 'Watch ✓' : 'Watch —', watchState, watchDetail),
            renderChip('textures', texCount ? `Tex ${texCount}` : 'Tex —', texCount ? 'ok' : 'warn',
                texCount ? 'Scene texture library loaded' : 'GIMP → textures/ — npm run textures:watch'),
            renderChip('local', localOn ? 'Local ✓' : 'Local —', localOn ? 'ok' : 'off',
                localOn ? `Interval ${localCfg.intervalMs}ms` : 'Set script + interval to enable'),
        ].join('');

        const modelSel = document.getElementById('agent-ollama-model');
        if (modelSel && ollama.ok) {
            const prev = OllamaClient.defaultModel;
            modelSel.innerHTML = ollama.models.map((m) =>
                `<option value="${m}" ${m === prev ? 'selected' : ''}>${m}</option>`,
            ).join('');
            if (!modelSel.dataset.wired) {
                modelSel.dataset.wired = '1';
                modelSel.addEventListener('change', () => {
                    OllamaClient.setPreferredModel(modelSel.value);
                    AgentStatus.refresh();
                });
            }
        }

        return lastSnapshot;
    },
};

window.AgentStatus = AgentStatus;