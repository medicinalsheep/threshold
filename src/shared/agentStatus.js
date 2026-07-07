import { Auth } from '../auth/main.js';
import { CreativeWatch } from './creativeWatch.js';
import { OllamaClient } from './ollamaClient.js';
import { AgentHub } from './agentHub.js';
import { AgentRouter } from './agentRouter.js';
import { AgentBenchmark } from './agentBenchmark.js';
import { TrainingImport } from './trainingImport.js';
import { TextureLibrary } from './textureLibrary.js';
import { CREATIVE_WATCH_URL } from '../config.js';
import { assessTierPrefs, countDistinctLocalModels, getDeviceProfile } from './modelCapability.js';
import { OllamaRunQueue } from './ollamaRunQueue.js';
import { WorkFolderScope } from './workFolderScope.js';

let lastSnapshot = null;
let panelDelegated = false;

function chipClass(state) {
    if (state === 'ok') return 'agent-status-ok';
    if (state === 'warn') return 'agent-status-warn';
    return 'agent-status-off';
}

function renderChip(id, label, state, detail) {
    return `<span class="agent-status-chip ${chipClass(state)}" data-status-id="${id}" title="${detail || ''}">${label}</span>`;
}

function tierOptions(models, current) {
    const opts = ['<option value="auto">auto (benchmark pick)</option>'];
    if (Auth.isLoggedIn()) opts.push(`<option value="grok" ${current === 'grok' ? 'selected' : ''}>grok (xAI)</option>`);
    models.forEach((m) => {
        opts.push(`<option value="${m}" ${current === m ? 'selected' : ''}>${m}</option>`);
    });
    return opts.join('');
}

function initPanelDelegation() {
    if (panelDelegated) return;
    const panel = document.getElementById('agents-panel');
    if (!panel) return;
    panelDelegated = true;
    panel.addEventListener('click', (e) => {
        if (e.target.id === 'agent-tier-save') {
            const patch = {
                small: document.getElementById('agent-tier-small')?.value || 'auto',
                medium: document.getElementById('agent-tier-medium')?.value || 'auto',
                large: document.getElementById('agent-tier-large')?.value || 'auto',
                preferGrokLarge: document.getElementById('agent-prefer-grok-large')?.checked !== false,
            };
            AgentRouter.setTierPrefs(patch);
            window.ModelStatusHud?.refreshMatrix?.();
            const n = countDistinctLocalModels(patch);
            window.UI?.status?.(n > 1 && !OllamaRunQueue.getPrefs().allowParallelLocal
                ? `Saved — ${n} local models run sequentially`
                : 'Agent tier models saved');
        }
        if (e.target.id === 'agent-benchmark-apply') {
            const last = AgentBenchmark.getLastResults();
            const suggested = last?.suggested;
            if (!suggested || !Object.keys(suggested).length) {
                window.UI?.status?.('Run benchmark first');
                return;
            }
            const applied = AgentBenchmark.applySuggestedTiers(suggested, { force: true });
            if (applied.changed) {
                window.UI?.status?.('Suggested tier models applied');
                AgentStatus.refresh();
            } else {
                window.UI?.status?.('No tier changes to apply');
            }
        }
    });
    panel.addEventListener('change', (e) => {
        if (e.target.id === 'agent-prefer-grok-large') {
            AgentRouter.setTierPrefs({ preferGrokLarge: e.target.checked });
        }
    });
    WorkFolderScope.bindSelect('work-folder-scope');
    WorkFolderScope.bindFreezeCheckbox('work-folder-freeze');
    const scopeEl = document.getElementById('work-folder-scope');
    if (scopeEl) scopeEl.value = WorkFolderScope.getPrefs().scopeId;
}

function syncTierUi(models) {
    initPanelDelegation();
    const prefs = AgentRouter.getTierPrefs();
    ['small', 'medium', 'large'].forEach((tier) => {
        const el = document.getElementById(`agent-tier-${tier}`);
        if (el) el.innerHTML = tierOptions(models, prefs[tier] || 'auto');
    });
    const grokChk = document.getElementById('agent-prefer-grok-large');
    if (grokChk) grokChk.checked = prefs.preferGrokLarge !== false;

    const benchEl = document.getElementById('agent-benchmark-results');
    const last = AgentBenchmark.getLastResults();
    if (benchEl && last) benchEl.innerHTML = AgentBenchmark.formatSummaryHtml(last);

    const applyBtn = document.getElementById('agent-benchmark-apply');
    if (applyBtn) {
        const hasSuggestions = last?.suggested && Object.keys(last.suggested).length > 0;
        const needsApply = hasSuggestions && !last?.applied?.changed;
        applyBtn.style.display = needsApply ? 'block' : 'none';
    }
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
        const tierPrefs = AgentRouter.getTierPrefs();

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

        const routeLog = AgentRouter.getRouteLog()[0];

        lastSnapshot = {
            grok: grokOk,
            ollama,
            watchHealth,
            watchConnected,
            localOn,
            texCount,
            ollamaModel: OllamaClient.defaultModel,
            tierPrefs,
            lastRoute: routeLog,
        };

        const el = document.getElementById('agent-status-chips');
        if (el) {
            const ollamaState = ollama.ok ? 'ok' : 'off';
            const routeHint = routeLog ? `${routeLog.taskId}→${routeLog.provider}/${routeLog.model}` : 'no routes yet';
            el.innerHTML = [
                renderChip('grok', grokOk ? 'Grok ✓' : 'Grok —', grokOk ? 'ok' : 'off',
                    grokOk ? 'xAI key in this tab' : 'Paste xAI key below'),
                renderChip('ollama', ollama.ok ? 'Ollama ✓' : 'Ollama —', ollamaState,
                    ollama.ok ? `${ollama.models.length} models · tiers saved` : `Offline (${ollama.error})`),
                renderChip('router', routeLog ? 'Route ✓' : 'Route —', routeLog ? 'ok' : 'warn', routeHint),
                renderChip('watch', watchConnected ? 'Watch ✓' : 'Watch —', watchState, watchDetail),
                renderChip('textures', texCount ? `Tex ${texCount}` : 'Tex —', texCount ? 'ok' : 'warn',
                    texCount ? 'Texture library loaded' : 'GIMP → textures/'),
                renderChip('local', localOn ? 'Local ✓' : 'Local —', localOn ? 'ok' : 'off',
                    localOn ? `Interval ${localCfg.intervalMs}ms` : 'Script agent off'),
                renderChip('folder', `Folder: ${WorkFolderScope.scopeLabel().split(' ')[0]}`,
                    WorkFolderScope.shouldFreezeOnLocal() ? 'ok' : 'warn',
                    `${WorkFolderScope.getScope().hint}${WorkFolderScope.shouldFreezeOnLocal() ? ' · freeze on' : ' · freeze off'}`),
                (() => {
                    const c = window.GraphicsProfile?.getCompatReport?.() || {};
                    const gpuOk = c.usesGpu ? 'ok' : (c.webgl ? 'warn' : 'off');
                    const short = c.discreteGpu ? 'GPU ✓' : (c.softwareFallback ? 'CPU GL' : 'WebGL');
                    return renderChip('gpu', short, gpuOk,
                        c.renderer ? `${c.renderer.slice(0, 72)}${c.softwareFallback ? ' (software — check browser GPU settings)' : ''}` : 'WebGL probe pending');
                })(),
            ].join('');
        }

        if (ollama.ok) syncTierUi(ollama.models);
        window.ModelStatusHud?.setInstalled?.(ollama.models || []);
        window.ModelStatusHud?.refreshMatrix?.(ollama.models || []);
        const warnEl = document.getElementById('agent-tier-warnings');
        if (warnEl && ollama.ok) {
            const tierAssess = assessTierPrefs(tierPrefs, ollama.models, getDeviceProfile());
            warnEl.innerHTML = ['small', 'medium', 'large'].map((t) => {
                const a = tierAssess[t];
                if (!a || a.state === 'ok') return '';
                const cls = a.state === 'fail' ? 'model-cap-fail' : 'model-cap-warn';
                return `<p class="model-cap-pick-warn ${cls}"><strong>${t}</strong>: ${a.reason}</p>`;
            }).join('');
        }
        TrainingImport.syncQueueUi();

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

        window.AgentReconnectChip?.refresh?.();
        return lastSnapshot;
    },
};

window.AgentStatus = AgentStatus;