import { AgentRouter } from './agentRouter.js';
import { OllamaRunQueue } from './ollamaRunQueue.js';
import { assessTierPrefs, buildModelMatrix, renderMatrixHtml, getDeviceProfile } from './modelCapability.js';
import { WorkFolderScope } from './workFolderScope.js';
import { AiMemoryFreeze } from './aiMemoryFreeze.js';

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

export const ModelStatusHud = {
    _installed: [],

    init() {
        window.addEventListener('ollama-queue-status', () => this.renderHud());
        window.addEventListener('ollama-queue-change', () => this.renderHud());
        window.addEventListener('agent-config-change', () => this.refreshMatrix());
        window.addEventListener('agent-route-complete', () => this.renderHud());
        window.addEventListener('ai-freeze-change', () => this.renderHud());
        window.addEventListener('work-folder-change', () => this.renderHud());

        document.getElementById('agent-allow-parallel')?.addEventListener('change', (e) => {
            OllamaRunQueue.setPrefs({ allowParallelLocal: e.target.checked });
            window.UI?.status?.(e.target.checked ? 'Parallel local models ON' : 'Sequential local models (recommended)');
            this.renderHud();
        });
        document.getElementById('portal-allow-parallel')?.addEventListener('change', (e) => {
            OllamaRunQueue.setPrefs({ allowParallelLocal: e.target.checked });
        });
        this.renderHud();
    },

    hudTargets() {
        return [document.getElementById('model-status-hud-float'), document.getElementById('model-status-hud')].filter(Boolean);
    },

    setInstalled(models) { this._installed = models || []; this.refreshMatrix(); },

    renderHud() {
        const targets = this.hudTargets();
        if (!targets.length) return;
        const q = OllamaRunQueue.getStatus();
        const prefs = AgentRouter.getTierPrefs();
        const parallel = OllamaRunQueue.getPrefs().allowParallelLocal;
        const tierAssess = assessTierPrefs(prefs, this._installed, getDeviceProfile());
        const activeLine = q.active
            ? `<span class="model-hud-active">▶ ${esc(q.active)}</span> <span class="model-hud-meta">${esc(q.taskId || '')}</span>`
            : '<span class="model-hud-idle">idle</span>';
        const queueLine = q.queueDepth > 0 ? `<span class="model-hud-queue">+${q.queueDepth} queued</span>` : '';
        const modeLine = parallel
            ? '<span class="model-hud-warn">parallel local</span>'
            : '<span class="model-hud-ok">sequential</span>';
        const freeze = AiMemoryFreeze.isFrozen();
        const folderLine = freeze
            ? '<span class="model-hud-freeze">❄ frozen</span>'
            : `<span class="model-hud-folder" title="${esc(WorkFolderScope.getScope().hint)}">${esc(WorkFolderScope.scopeLabel())}</span>`;
        const tierLines = ['small', 'medium', 'large'].map((t) => {
            const a = tierAssess[t];
            const pref = prefs[t] || 'auto';
            const cls = a?.state === 'fail' ? 'model-cap-fail' : (a?.state === 'warn' ? 'model-cap-warn' : 'model-cap-ok');
            const icon = a?.state === 'fail' ? '✗' : (a?.state === 'warn' ? '⚠' : '●');
            return `<span class="model-hud-tier ${cls}" title="${esc(a?.reason || '')}">${t[0].toUpperCase()}:${esc(pref)} ${icon}</span>`;
        }).join('');
        const html = `<div class="model-hud-row">${activeLine}${queueLine}<span class="model-hud-mode">${modeLine}</span>${folderLine}</div><div class="model-hud-tiers">${tierLines}</div>`;
        targets.forEach((el) => {
            el.innerHTML = html;
            el.classList.toggle('model-hud-busy', !!q.active || q.queueDepth > 0 || freeze);
            el.classList.toggle('model-hud-frozen', freeze);
        });
    },

    refreshMatrix(installed) {
        if (installed) this._installed = installed;
        const html = renderMatrixHtml(buildModelMatrix(this._installed));
        const wrap = document.getElementById('agent-model-matrix');
        const portal = document.getElementById('portal-model-matrix');
        if (wrap) wrap.innerHTML = html;
        if (portal) portal.innerHTML = renderMatrixHtml(buildModelMatrix(this._installed), { compact: true });
        const chk = document.getElementById('agent-allow-parallel');
        if (chk) chk.checked = OllamaRunQueue.getPrefs().allowParallelLocal;
        const pchk = document.getElementById('portal-allow-parallel');
        if (pchk) pchk.checked = OllamaRunQueue.getPrefs().allowParallelLocal;
        this.renderHud();
    },
};

window.ModelStatusHud = ModelStatusHud;