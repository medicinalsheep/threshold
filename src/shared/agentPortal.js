/**
 * Agent Portal — auto-detect Grok Build / Ollama on entry, connect providers,
 * then conversational build intake (one task at a time via tiered router).
 */

import { Auth } from '../auth/main.js';
import { IS_GROK_EDITION, CREATIVE_WATCH_URL } from '../config.js';
import { ViewPrefs } from './viewPrefs.js';
import { OllamaClient } from './ollamaClient.js';
import { GrokClient } from '../grok/client.js';
import { AgentRouter } from './agentRouter.js';
import { AgentStatus } from './agentStatus.js';
import { stripCodeFences } from './agentPrompts.js';
import { sanitizeSceneCode, codeReadinessSummary } from './codeSanitizer.js';
import { TIER_GUIDE, tierOptionsHtml, renderTierGuideHtml } from './agentModelGuide.js';
import { BuildJob } from './buildJob.js';
import { LiveBuild } from './liveBuild.js';
import { getSceneApiPrompt } from './sceneApiPrompt.js';
import { buildAgentPortalSystemPrompt, buildCompilerRequest, validateProductionReady } from './assetProductionPlan.js';
import { enrichReadyContext, applyAppearancePlan } from './generationPolicy.js';
import { assessTierPrefs, renderMatrixHtml, buildModelMatrix, countDistinctLocalModels, getDeviceProfile } from './modelCapability.js';
import { OllamaRunQueue } from './ollamaRunQueue.js';
import { WorkFolderScope } from './workFolderScope.js';

const PREFS_KEY = 'agentPortalSession';

const TIER_HINTS = {
    small: ['threshold-mini-npc', 'llama3.2:3b', 'gemma3:4b', 'qwen2.5-coder:1.5b'],
    medium: ['threshold-mini-dev', 'qwen2.5-coder:7b', 'qwen2.5-coder:1.5b-base'],
    large: ['threshold-dev', 'threshold-large-scenes', 'llama3.1:8b', 'deepseek-r1:8b'],
};

/** Published Threshold-trained models (Ollama library namespace medicinalsheep). */
const TRAINED_PULLS = [
    {
        id: 'threshold-mini-npc',
        pull: 'medicinalsheep/threshold-mini-npc',
        label: 'Mini NPC',
        detail: 'Intent + NPC chat · small tier',
        size: '~2 GB',
        page: 'https://ollama.com/medicinalsheep/threshold-mini-npc',
    },
    {
        id: 'threshold-mini-dev',
        pull: 'medicinalsheep/threshold-mini-dev',
        label: 'Mini Dev',
        detail: 'Patches + plans · medium tier',
        size: '~1 GB',
        page: 'https://ollama.com/medicinalsheep/threshold-mini-dev',
    },
    {
        id: 'threshold-mini-mobile',
        pull: 'medicinalsheep/threshold-mini-mobile',
        label: 'Mini Mobile',
        detail: '1B intent/NPC · low RAM',
        size: '~1.3 GB',
        page: 'https://ollama.com/medicinalsheep/threshold-mini-mobile',
    },
];

function modelIsInstalled(installed, entry) {
    const list = (installed || []).map((m) => String(m).toLowerCase());
    const id = entry.id.toLowerCase();
    const pull = entry.pull.toLowerCase();
    return list.some((m) => m === id || m.startsWith(`${id}:`) || m.includes(pull) || m.includes(id));
}

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function loadSession() {
    return ViewPrefs.get(PREFS_KEY, {
        connected: false,
        dismissed: false,
        primaryProvider: 'auto',
        chatHistory: [],
        buildContext: null,
        lastProbe: null,
    });
}

function saveSession(patch) {
    const next = { ...loadSession(), ...patch };
    ViewPrefs.set(PREFS_KEY, next);
    return next;
}

function tierForModel(name) {
    const n = String(name || '').toLowerCase();
    for (const [tier, hints] of Object.entries(TIER_HINTS)) {
        if (hints.some((h) => n.includes(h.split(':')[0]))) return tier;
    }
    if (n.includes('3b') || n.includes('4b') || n.includes('1.5b')) return 'small';
    if (n.includes('7b') || n.includes('coder')) return 'medium';
    if (n.includes('8b') || n.includes('70b')) return 'large';
    return 'medium';
}

function hasAnyProvider(probe) {
    return probe.grokApi?.ok || probe.grokKey || probe.grokBuild || probe.ollama?.ok;
}

function hostingContext() {
    const host = window.location.hostname;
    const onPages = host.includes('github.io') || host.includes('github.dev');
    const onLocal = host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host);
    return { onPages, onLocal, host };
}

function buildChatSystem(session = {}) {
    const hist = session.chatHistory || [];
    const lastUser = [...hist].reverse().find((m) => m.role === 'user')?.text || '';
    const ctx = session.buildContext || {};
    return buildAgentPortalSystemPrompt({
        message: lastUser,
        title: ctx.title,
        summary: ctx.summary,
        taskType: ctx.taskType,
        placement: ctx.placement,
        idea: lastUser,
    });
}

function parseReadySignal(text) {
    const raw = stripCodeFences(text);
    try {
        const j = JSON.parse(raw);
        if (j?.ready) return j;
    } catch { /* continue */ }
    const m = text.match(/\{[\s\S]*"ready"\s*:\s*true[\s\S]*\}/);
    if (m) {
        try {
            return JSON.parse(m[0]);
        } catch { /* ignore */ }
    }
    return null;
}

function looksLikeCode(text) {
    const t = stripCodeFences(text);
    return /\(function\s*\(|World\.|Engine\.|State\./.test(t);
}

/** True when the message is a scene/asset brief (not small talk). Enables GENERATE without multi-turn ready JSON. */
function looksLikeBuildBrief(text) {
    const t = String(text || '').trim();
    if (t.length < 10) return false;
    if (/^(hi|hello|hey|help|thanks|what can you|how do i|who are)/i.test(t) && t.length < 48) return false;
    if (/\b(build|make|create|add|place|spawn|generate|live build|courtyard|plaza|room|scene|world|prop|npc|character|outfit|dress|floor|layout|crate|landmark)\b/i.test(t)) {
        return true;
    }
    return t.length >= 48;
}

/** Infer a production-ready context so GENERATE is not blocked on chat “ready” JSON. */
function inferBuildContext(text) {
    const t = String(text || '').trim();
    let taskType = 'world';
    if (/\b(character|npc|avatar|outfit|dress|operator|scientist|explorer)\b/i.test(t)) taskType = 'character';
    else if (/\b(prop|crate|barrel|bench|furniture|beacon)\b/i.test(t) && !/\b(world|scene|room|courtyard)\b/i.test(t)) {
        taskType = 'prop';
    } else if (/\b(texture|pbr|albedo)\b/i.test(t) && !/\b(scene|world|room)\b/i.test(t)) taskType = 'texture';
    else if (/\b(sound|sfx|audio|ambient)\b/i.test(t) && !/\b(scene|world)\b/i.test(t)) taskType = 'sound';

    let placement = 'exterior';
    if (/\b(interior|inside|indoor|room|lab|hall|corridor)\b/i.test(t)) placement = 'interior';
    else if (/\b(floating|sky|void|air)\b/i.test(t)) placement = 'floating';
    else if (/\b(doorway|transitional|threshold|courtyard)\b/i.test(t)) placement = 'transitional';

    const title = t.slice(0, 72).replace(/\s+/g, ' ').trim() || 'Quick build';
    const sheltered = placement === 'interior';
    return {
        ready: true,
        taskType,
        title,
        summary: t,
        placement,
        weatherExposure: sheltered ? 'sheltered' : (placement === 'floating' ? 'none' : 'full'),
        weatherVariants: placement === 'exterior' || placement === 'transitional' ? ['wet'] : [],
        surfaceType: placement === 'interior' ? 'concrete' : 'concrete',
        collision: taskType === 'prop' ? 'dynamic' : (taskType === 'character' ? 'dynamic' : 'static'),
        sheltered,
        intensity: 'focused',
        style: 'realistic PBR',
        textureRes: '2k',
        workflow: 'gimp',
        atmospherePreset: sheltered ? 'interior_soft' : 'day_clear',
        _inferred: true,
    };
}

function creativePipelineHint(userText, probe) {
    const t = String(userText || '').toLowerCase();
    const hints = [];
    if (/texture|pbr|gimp|material|albedo|normal|roughness|skin|uv/.test(t)) {
        hints.push('GIMP: save PBR maps to textures/ — run npm run textures:watch for hot-reload into the scene.');
    }
    if (/model|glb|gltf|avatar|mesh|blender|rig|character/.test(t)) {
        hints.push('Blender: export GLTF to import/ — npm run blender:install for the Threshold addon.');
    }
    if (hints.length && probe && !probe.watchHealth) {
        hints.push('Creative watch is offline on this device (local npm run textures:watch).');
    }
    return hints.length ? `\n\n💡 ${hints.join(' ')}` : '';
}

function emitPortalChange() {
    window.dispatchEvent(new CustomEvent('agent-portal-change'));
    window.AgentReconnectChip?.refresh?.();
}

export const AgentPortal = {
    _modal: null,
    _step: 'connect',
    _probe: null,
    _busy: false,
    _session: loadSession(),

    getSession() {
        return loadSession();
    },

    isConnected() {
        return !!loadSession().connected;
    },

    init() {
        this._modal = document.getElementById('agent-portal-modal');
        this.bindOnce();
        // Wire static CTA if present in index.html
        const cta = document.getElementById('build-something-cta');
        if (cta && !cta.dataset.bound) {
            cta.dataset.bound = '1';
            cta.addEventListener('click', () => {
                void this.openBuildFast();
            });
        }
    },

    bindOnce() {
        if (this._modal?.dataset.bound) return;
        if (this._modal) this._modal.dataset.bound = '1';

        document.getElementById('agent-portal-close')?.addEventListener('click', () => this.hide());
        document.getElementById('agent-portal-skip')?.addEventListener('click', () => this.skip());
        document.getElementById('agent-portal-reprobe')?.addEventListener('click', () => {
            window.OllamaClient?.resetBase?.();
            this.runDetect();
        });
        document.getElementById('agent-portal-connect')?.addEventListener('click', () => this.connect());
        document.getElementById('agent-portal-send')?.addEventListener('click', () => this.sendChat());
        document.getElementById('agent-portal-generate')?.addEventListener('click', () => this.generateFromContext());
        document.getElementById('agent-portal-stop-job')?.addEventListener('click', () => {
            BuildJob.stop();
            const status = document.getElementById('agent-portal-status');
            if (status) status.textContent = 'Stopping after current step…';
        });
        document.getElementById('agent-portal-run-engine')?.addEventListener('click', () => this.runInEngine());
        document.getElementById('agent-portal-open-setup')?.addEventListener('click', () => {
            this.hide();
            window.SceneDock?.openTab?.('setup');
        });

        document.getElementById('agent-portal-chat-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChat();
            }
        });

        document.getElementById('agent-portal-xai-save')?.addEventListener('click', () => {
            const key = document.getElementById('agent-portal-xai-key')?.value?.trim();
            const remember = document.getElementById('agent-portal-xai-remember')?.checked === true;
            if (key && Auth.login(key, { remember })) {
                window.UI?.status?.(remember ? 'xAI key saved on this device' : 'xAI key saved for this tab');
                this.fillGrokModelSelect();
                this.runDetect();
            }
        });

        document.getElementById('agent-portal-grok-test')?.addEventListener('click', () => {
            void this.testGrokKey();
        });

        document.getElementById('agent-portal-grok-model')?.addEventListener('change', (e) => {
            const id = e.target?.value;
            if (id) {
                GrokClient.setPrefs({ chatModel: id, codeModel: id });
                window.UI?.status?.(`Grok model: ${id}`);
            }
        });

        this.fillGrokModelSelect();
        const rem = document.getElementById('agent-portal-xai-remember');
        if (rem) rem.checked = Auth.isRemembered?.() === true;

        this._modal?.addEventListener('click', (e) => {
            if (e.target === this._modal && !this._busy && !this._pulling) this.hide();
            const pullBtn = e.target.closest?.('[data-ollama-pull]');
            if (pullBtn && !pullBtn.disabled) {
                e.preventDefault();
                void this.pullTrainedModel(pullBtn.dataset.ollamaPull, pullBtn);
                return;
            }
            if (e.target.closest?.('[data-ollama-pull-all]')) {
                e.preventDefault();
                void this.pullAllTrainedModels();
            }
        });
    },

    fillGrokModelSelect() {
        const sel = document.getElementById('agent-portal-grok-model');
        if (!sel || !GrokClient?.listChatModels) return;
        const current = GrokClient.getChatModel();
        const models = GrokClient.listChatModels();
        sel.innerHTML = models.map((m) =>
            `<option value="${m.id}" ${m.id === current ? 'selected' : ''}>${m.label || m.id}</option>`
        ).join('');
    },

    async testGrokKey() {
        const status = document.getElementById('agent-portal-grok-status');
        const keyInput = document.getElementById('agent-portal-xai-key');
        const remember = document.getElementById('agent-portal-xai-remember')?.checked === true;
        const typed = keyInput?.value?.trim();
        if (typed) Auth.login(typed, { remember });
        if (!Auth.isLoggedIn()) {
            if (status) status.textContent = 'Paste an xai-… key from console.x.ai first';
            return;
        }
        if (status) status.textContent = 'Testing api.x.ai…';
        const result = await GrokClient.probe(10000);
        if (result.ok) {
            if (status) {
                status.textContent = `✓ Grok API OK · model ${result.model || GrokClient.getChatModel()}${result.via ? ` (${result.via})` : ''}`;
            }
            window.UI?.status?.('Grok API connected');
            this.runDetect();
        } else {
            if (status) status.textContent = `✗ ${result.detail || result.error}`;
            window.UI?.status?.(String(result.error || 'Grok probe failed').slice(0, 80));
        }
    },

    async probe() {
        Auth.hydrate?.();
        const grokKey = Auth.isLoggedIn();
        const grokBuild = IS_GROK_EDITION && grokKey;

        let grokApi = { ok: false, error: 'no_key' };
        if (grokKey) {
            try {
                grokApi = await GrokClient.probe(6000);
            } catch (e) {
                grokApi = { ok: false, error: e.message };
            }
        }

        let ollama = { ok: false, models: [], error: 'offline' };
        if (window.SurfaceProfile && !window.SurfaceProfile.allowsOllamaProbe()) {
            ollama = {
                ok: false,
                models: [],
                error: 'skipped — play surface',
                skippedSurface: true,
            };
        } else {
            try {
                ollama = await OllamaClient.probe(3000);
            } catch (e) {
                ollama = { ok: false, models: [], error: e.message };
            }
        }

        let watchHealth = false;
        const baseUrl = CREATIVE_WATCH_URL.replace(/\/$/, '');
        try {
            const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1500) });
            watchHealth = res.ok;
        } catch {
            watchHealth = false;
        }

        const probe = {
            grokBuild,
            grokEdition: IS_GROK_EDITION,
            grokKey,
            grokApi,
            grokModel: GrokClient.getChatModel?.() || 'grok-4.5',
            ollama,
            watchHealth,
            at: Date.now(),
        };
        this._probe = probe;
        this._session = saveSession({ lastProbe: probe });
        return probe;
    },

    renderDetect(probe) {
        const el = document.getElementById('agent-portal-detect');
        if (!el) return;

        const grokLine = probe.grokBuild
            ? { state: 'ok', label: 'Grok Build portal', detail: 'Connected via Grok Build edition' }
            : probe.grokApi?.ok
                ? {
                    state: 'ok',
                    label: 'Grok API (xAI)',
                    detail: `Live · ${probe.grokModel || GrokClient.getChatModel()} — SuperGrok-class models via console key`,
                }
                : probe.grokKey
                    ? {
                        state: 'warn',
                        label: 'Grok API key present',
                        detail: probe.grokApi?.error
                            ? `Key saved but probe failed: ${String(probe.grokApi.error).slice(0, 80)}`
                            : 'Key saved — tap TEST to verify api.x.ai',
                    }
                    : probe.grokEdition
                        ? { state: 'warn', label: 'Grok Build', detail: 'Sign in with your xAI key below' }
                        : {
                            state: 'warn',
                            label: 'Grok / xAI API',
                            detail: 'Paste console.x.ai key below (not SuperGrok tab cookie) — works on Pages + local',
                        };

        const ctx = hostingContext();
        const ollamaBase = probe.ollama?.baseUrl ? ` via ${probe.ollama.baseUrl}` : '';
        const ollamaDetail = probe.ollama?.ok
            ? `${probe.ollama.models.length} models${ollamaBase} — incl. threshold-mini-* if installed`
            : probe.ollama?.corsBlocked || /blocked from this page|11435|Private/i.test(probe.ollama?.error || '')
                ? 'Browser blocked localhost Ollama (Pages/CORS). On this PC: npm run ollama:serve → keep open → RE-SCAN'
                : ctx.onPages && !ctx.onLocal
                    ? 'Pages needs local proxy: in Threshold repo run npm run ollama:serve (listens :11435), then RE-SCAN'
                    : `Not reachable — ${probe.ollama?.error || 'offline'}. Run: npm run ollama:serve`;

        const ollamaLine = probe.ollama?.ok
            ? { state: 'ok', label: 'Ollama (your models)', detail: ollamaDetail }
            : { state: 'off', label: 'Ollama (your models)', detail: ollamaDetail };

        const watchLine = probe.watchHealth
            ? { state: 'ok', label: 'Creative watch', detail: 'GIMP/Blender hot-reload relay up' }
            : { state: 'off', label: 'Creative watch', detail: 'Optional — npm run textures:watch' };

        const rows = [grokLine, ollamaLine, watchLine];
        const ready = hasAnyProvider(probe);
        const ollamaHowToBody = `
            <strong>Use Ollama (desktop / laptop):</strong>
            <ol class="agent-portal-howto-steps">
                <li>Install <a href="https://ollama.com" target="_blank" rel="noopener">Ollama</a> on this PC</li>
                <li>In the Threshold repo: <code>npm install</code> then <code>npm run ollama:serve</code>
                    <em>— not plain <code>ollama serve</code> (CORS/403 on Pages)</em></li>
                <li>Download minis below (or <code>ollama pull …</code>) → <strong>RE-SCAN</strong></li>
            </ol>
            <p class="agent-portal-howto-note">Phones: paste a Grok/xAI key above — local Ollama is not on-device in the APK.</p>
        `;
        const ollamaHowTo = !probe.ollama?.ok
            ? ready
                ? `<details class="agent-portal-advanced"><summary class="insert-hint">Ollama offline — how to enable local models</summary>
                    <div class="agent-portal-ollama-howto insert-hint">${ollamaHowToBody}</div>
                   </details>`
                : `<div class="agent-portal-ollama-howto insert-hint">${ollamaHowToBody}</div>`
            : '';

        const readyBanner = ready
            ? `<div class="agent-portal-ready-banner">
                <p class="agent-portal-kicker">Ready to build</p>
                <p class="insert-hint" style="margin:0 0 8px;">
                    ${probe.grokApi?.ok || probe.grokKey
                        ? 'Grok/xAI available'
                        : 'Ollama online'} · tap <strong>START BUILDING</strong> and describe a scene.
                    Live apply runs a quick 3-step job in the grid.
                </p>
               </div>`
            : `<p class="agent-portal-kicker">Connect a model</p>`;

        el.innerHTML = `
            ${readyBanner}
            <ul class="agent-portal-detect-list">
                ${rows.map((r) => `
                    <li class="agent-portal-detect-item agent-portal-${r.state}">
                        <span class="agent-portal-detect-dot"></span>
                        <span><strong>${esc(r.label)}</strong><br><span class="agent-portal-detect-detail">${esc(r.detail)}</span></span>
                    </li>
                `).join('')}
            </ul>
            ${ollamaHowTo}
            ${ready
                ? `<details class="agent-portal-advanced"><summary class="insert-hint">Trained minis (optional)</summary>
                    ${this.renderTrainedPullsHtml(probe)}
                   </details>`
                : this.renderTrainedPullsHtml(probe)}
            ${!ready ? `<p class="insert-hint"><strong>Phone / quick path:</strong> paste a Grok key from
                <a href="https://console.x.ai" target="_blank" rel="noopener">console.x.ai</a>, SAVE, then START BUILDING.
                Or start Ollama on desktop and RE-SCAN. You can explore the grid without AI.</p>` : ''}
            ${ctx.onPages ? '<p class="insert-hint">Hosted on GitHub Pages — AI keys and Ollama stay on your device.</p>' : ''}
        `;

        this.renderModelPicker(probe, { collapsed: ready });
        this.renderProviderPick(probe, { collapsed: ready });

        const keyWrap = document.getElementById('agent-portal-xai-wrap');
        if (keyWrap) {
            keyWrap.style.display = probe.grokKey && (probe.grokApi?.ok || probe.grokBuild) ? 'none' : '';
        }

        const connectBtn = document.getElementById('agent-portal-connect');
        if (connectBtn) {
            connectBtn.textContent = ready ? 'START BUILDING →' : 'CONNECT & START BUILDING';
            connectBtn.style.display = 'inline-block';
            connectBtn.disabled = false;
        }
    },

    renderTrainedPullsHtml(probe) {
        const installed = probe.ollama?.ok ? (probe.ollama.models || []) : [];
        const ollamaReady = !!probe.ollama?.ok;
        const cards = TRAINED_PULLS.map((m) => {
            const ok = modelIsInstalled(installed, m);
            const btnLabel = ok ? 'Installed ✓' : 'Download';
            const disabled = ok || !ollamaReady || this._pulling ? 'disabled' : '';
            const stateClass = ok ? 'installed' : (ollamaReady ? 'ready' : 'blocked');
            return `
                <div class="agent-portal-pull-card agent-portal-pull-${stateClass}" data-pull-card="${esc(m.pull)}">
                    <div class="agent-portal-pull-meta">
                        <strong>${esc(m.label)}</strong>
                        <span class="agent-portal-pull-detail">${esc(m.detail)} · ${esc(m.size)}</span>
                        <code class="agent-portal-pull-name">${esc(m.pull)}</code>
                    </div>
                    <div class="agent-portal-pull-actions">
                        <button type="button" class="btn-sm agent-portal-pull-btn" data-ollama-pull="${esc(m.pull)}" ${disabled}
                            title="${ok ? 'Already on this PC' : (ollamaReady ? 'Pull into local Ollama' : 'Start Ollama first')}">
                            ${btnLabel}
                        </button>
                        <a class="agent-portal-pull-link" href="${esc(m.page)}" target="_blank" rel="noopener">Library</a>
                    </div>
                    <div class="agent-portal-pull-progress" hidden>
                        <div class="agent-portal-pull-bar"><span style="width:0%"></span></div>
                        <span class="agent-portal-pull-status"></span>
                    </div>
                </div>
            `;
        }).join('');

        const anyMissing = TRAINED_PULLS.some((m) => !modelIsInstalled(installed, m));
        const allDisabled = !ollamaReady || this._pulling || !anyMissing ? 'disabled' : '';

        return `
            <div class="agent-portal-pulls" id="agent-portal-pulls">
                <p class="agent-portal-kicker">Threshold trained models</p>
                <p class="insert-hint">Pull our published minis into <strong>your</strong> Ollama (same PC as this tab). Needs <code>npm run ollama:serve</code> or Ollama with CORS.</p>
                <div class="agent-portal-pull-list">${cards}</div>
                <div class="agent-portal-pull-footer">
                    <button type="button" class="btn-sm" data-ollama-pull-all ${allDisabled}
                        title="${ollamaReady ? 'Download all missing minis' : 'Start Ollama first'}">
                        Download all minis
                    </button>
                    ${!ollamaReady ? '<span class="insert-hint">Ollama offline — start it, then RE-SCAN</span>' : ''}
                </div>
                <p id="agent-portal-pull-log" class="agent-portal-pull-log insert-hint" aria-live="polite"></p>
            </div>
        `;
    },

    setPullUi(model, { percent, status, error, done, installed } = {}) {
        const card = [...document.querySelectorAll('[data-pull-card]')].find((c) => c.dataset.pullCard === model);
        if (!card) return;
        const progress = card.querySelector('.agent-portal-pull-progress');
        const bar = card.querySelector('.agent-portal-pull-bar span');
        const st = card.querySelector('.agent-portal-pull-status');
        const btn = card.querySelector('[data-ollama-pull]');
        if (progress) progress.hidden = !!(done && !error);
        if (progress && (status || percent != null)) progress.hidden = false;
        if (bar && percent != null) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        if (st) {
            if (error) st.textContent = error;
            else if (status) st.textContent = percent != null ? `${status} · ${percent}%` : status;
        }
        if (btn) {
            if (installed || (done && !error)) {
                btn.textContent = 'Installed ✓';
                btn.disabled = true;
                card.classList.add('agent-portal-pull-installed');
                card.classList.remove('agent-portal-pull-ready', 'agent-portal-pull-blocked');
                if (progress) progress.hidden = true;
            } else if (this._pulling) {
                btn.disabled = true;
            }
        }
        const log = document.getElementById('agent-portal-pull-log');
        if (log && (status || error)) {
            log.textContent = error
                ? `Pull failed: ${error}`
                : `${model}: ${status}${percent != null ? ` (${percent}%)` : ''}`;
        }
    },

    async pullTrainedModel(model, btnEl) {
        const name = String(model || '').trim();
        if (!name || this._pulling) return;

        const probe = this._probe || await this.probe();
        if (!probe.ollama?.ok) {
            window.UI?.status?.('Start Ollama first (npm run ollama:serve), then RE-SCAN');
            const log = document.getElementById('agent-portal-pull-log');
            if (log) log.textContent = 'Ollama offline — cannot download until serve is up.';
            return;
        }

        this._pulling = true;
        document.querySelectorAll('[data-ollama-pull], [data-ollama-pull-all]').forEach((b) => {
            b.disabled = true;
        });
        if (btnEl) btnEl.textContent = 'Downloading…';
        this.setPullUi(name, { status: 'starting', percent: 0 });

        try {
            await OllamaClient.pull(name, {
                onProgress: (p) => {
                    this.setPullUi(name, {
                        status: p.status || 'pulling',
                        percent: p.percent ?? (p.status === 'success' ? 100 : undefined),
                    });
                },
            });
            this.setPullUi(name, { status: 'success', percent: 100, done: true, installed: true });
            window.UI?.status?.(`Downloaded ${name}`);
            OllamaClient.setPreferredModel(name);
            await this.runDetect();
        } catch (e) {
            const msg = e.message || 'pull failed';
            this.setPullUi(name, { error: msg, done: true });
            window.UI?.status?.(msg.slice(0, 80));
            if (btnEl && !btnEl.textContent.includes('Installed')) btnEl.textContent = 'Retry download';
        } finally {
            this._pulling = false;
            // re-enable missing buttons via re-render if detect ran; else soft unlock
            if (!document.getElementById('agent-portal-pulls')) return;
            const still = this._probe;
            if (still?.ollama?.ok) {
                document.querySelectorAll('[data-ollama-pull]').forEach((b) => {
                    const m = TRAINED_PULLS.find((t) => t.pull === b.dataset.ollamaPull);
                    if (m && !modelIsInstalled(still.ollama.models, m)) {
                        b.disabled = false;
                        if (b.textContent === 'Downloading…') b.textContent = 'Download';
                    }
                });
                const anyMissing = TRAINED_PULLS.some((m) => !modelIsInstalled(still.ollama.models, m));
                const allBtn = document.querySelector('[data-ollama-pull-all]');
                if (allBtn) allBtn.disabled = !anyMissing;
            }
        }
    },

    async pullAllTrainedModels() {
        if (this._pulling) return;
        const probe = this._probe || await this.probe();
        if (!probe.ollama?.ok) {
            window.UI?.status?.('Start Ollama first, then RE-SCAN');
            return;
        }
        const missing = TRAINED_PULLS.filter((m) => !modelIsInstalled(probe.ollama.models, m));
        if (!missing.length) {
            window.UI?.status?.('All Threshold minis already installed');
            return;
        }
        for (const m of missing) {
            const btn = [...document.querySelectorAll('[data-ollama-pull]')].find((b) => b.dataset.ollamaPull === m.pull);
            await this.pullTrainedModel(m.pull, btn);
            if (!this._probe?.ollama?.ok) break;
            // stop chain if a pull left an error on the log without installing
            const stillMissing = !modelIsInstalled(this._probe?.ollama?.models || [], m);
            if (stillMissing) break;
        }
    },

    renderProviderPick(probe, opts = {}) {
        const el = document.getElementById('agent-portal-provider-pick');
        if (!el) return;

        const canGrok = probe.grokKey || probe.grokBuild;
        const canOllama = probe.ollama?.ok;
        const pref = this._session.primaryProvider || 'auto';

        const options = [
            { id: 'auto', label: 'Auto (smart routing)', show: canGrok || canOllama },
            { id: 'grok', label: 'Grok / xAI', show: canGrok },
            { id: 'ollama', label: 'Ollama (local)', show: canOllama },
        ].filter((o) => o.show);

        if (!options.length) {
            el.innerHTML = '<p class="insert-hint">Connect a provider above to enable generation.</p>';
            return;
        }

        const body = `
            <p class="agent-portal-kicker">Primary provider</p>
            <div class="agent-portal-provider-row">
                ${options.map((o) => `
                    <label class="agent-portal-provider-opt">
                        <input type="radio" name="portal-provider" value="${o.id}" ${pref === o.id ? 'checked' : ''}>
                        ${esc(o.label)}
                    </label>
                `).join('')}
            </div>
            <p class="insert-hint">Tasks run one at a time — small models for chat, large for full scene scripts.</p>
        `;
        el.innerHTML = opts.collapsed
            ? `<details class="agent-portal-advanced"><summary class="insert-hint">Provider routing (optional)</summary>${body}</details>`
            : body;
    },

    renderModelPicker(probe, opts = {}) {
        const el = document.getElementById('agent-portal-models');
        if (!el) return;

        const models = probe.ollama?.ok ? probe.ollama.models : [];
        const prefs = AgentRouter.getTierPrefs();
        const canGrok = probe.grokKey || probe.grokBuild;

        const body = `
            <p class="agent-portal-kicker">Model tiers — when &amp; why</p>
            <div class="agent-tier-guide">${renderTierGuideHtml()}</div>
            ${['small', 'medium', 'large'].map((tier) => `
                <div class="prop-row agent-portal-tier-row">
                    <label style="min-width:52px;" title="${esc(TIER_GUIDE[tier].why)}">${TIER_GUIDE[tier].label}</label>
                    <select id="portal-tier-${tier}" class="insert-input" style="flex:1;">
                        ${tierOptionsHtml(models, prefs[tier] || 'auto', tier, canGrok)}
                    </select>
                </div>
            `).join('')}
            ${canGrok ? `<label class="export-wizard-check" style="margin:6px 0;">
                <input type="checkbox" id="portal-prefer-grok-large" ${prefs.preferGrokLarge !== false ? 'checked' : ''}>
                Prefer Grok for large tasks (world scripts)
            </label>` : ''}
            <label class="export-wizard-check" style="margin:6px 0;">
                <input type="checkbox" id="portal-allow-parallel" ${OllamaRunQueue.getPrefs().allowParallelLocal ? 'checked' : ''}>
                Allow parallel local models (advanced — strong PC)
            </label>
            <p class="insert-hint">Default: <strong>one Ollama model at a time</strong>. Red ✗ = cannot perform tier.</p>
            <p class="agent-portal-kicker" style="margin-top:8px;">Working folder</p>
            <p class="insert-hint" style="margin:0 0 4px;">Scope memory while local models run — screen freezes, loads pause, assets restore after.</p>
            ${WorkFolderScope.renderSelectHtml('portal-work-folder-scope')}
            <label class="export-wizard-check" style="margin:6px 0;">
                <input type="checkbox" id="portal-work-folder-freeze" ${WorkFolderScope.shouldFreezeOnLocal() ? 'checked' : ''}>
                Freeze screen during local Ollama
            </label>
            <div id="portal-model-matrix" class="portal-model-matrix"></div>
            <div id="portal-tier-warnings"></div>
        `;
        el.innerHTML = opts.collapsed
            ? `<details class="agent-portal-advanced"><summary class="insert-hint">Advanced: tiers &amp; work folder</summary>${body}</details>`
            : body;
        WorkFolderScope.bindSelect('portal-work-folder-scope');
        WorkFolderScope.bindFreezeCheckbox('portal-work-folder-freeze');
        if (models.length) {
            const matrixEl = document.getElementById('portal-model-matrix');
            if (matrixEl) matrixEl.innerHTML = renderMatrixHtml(buildModelMatrix(models), { compact: true });
            const tierAssess = assessTierPrefs(prefs, models, getDeviceProfile());
            const warnEl = document.getElementById('portal-tier-warnings');
            if (warnEl) {
                warnEl.innerHTML = ['small', 'medium', 'large'].map((t) => {
                    const a = tierAssess[t];
                    if (!a || a.state === 'ok') return '';
                    const cls = a.state === 'fail' ? 'model-cap-fail' : 'model-cap-warn';
                    return `<p class="model-cap-pick-warn ${cls}"><strong>${t}</strong>: ${a.reason}</p>`;
                }).join('');
            }
        }
    },

    renderBuildControls() {
        const el = document.getElementById('agent-portal-build-controls');
        if (!el) return;

        const prefs = BuildJob.getPrefs();
        const route = AgentRouter.getTierPrefs();
        el.innerHTML = `
            <details class="agent-portal-build-details" open>
                <summary>Build options</summary>
                <label class="export-wizard-check"><input type="checkbox" id="portal-multistep" ${prefs.multiStep !== false ? 'checked' : ''}> Multi-step build</label>
                <label class="export-wizard-check"><input type="checkbox" id="portal-live-apply" ${prefs.liveApply !== false ? 'checked' : ''}> <strong>Live apply in scene</strong> — watch each step land while you walk</label>
                <label class="export-wizard-check"><input type="checkbox" id="portal-resume-play" ${prefs.resumePlay !== false ? 'checked' : ''}> Resume PLAY after each step (inspect while agents work)</label>
                <div class="prop-row" style="margin-top:6px;">
                    <label style="min-width:72px;">Pipeline</label>
                    <select id="portal-intensity" class="insert-input" style="flex:1;">
                        <option value="focused" ${prefs.intensity !== 'full' ? 'selected' : ''}>Quick live (3 steps: layout → props → atmosphere)</option>
                        <option value="full" ${prefs.intensity === 'full' ? 'selected' : ''}>Full production (7 steps: collision → textures → weather…)</option>
                    </select>
                </div>
                <div class="prop-row" style="margin-top:6px;">
                    <label style="min-width:72px;">Time limit</label>
                    <select id="portal-time-limit" class="insert-input" style="flex:1;">
                        <option value="0" ${prefs.timeLimitMin === 0 ? 'selected' : ''}>No limit — run until done</option>
                        <option value="2" ${prefs.timeLimitMin === 2 ? 'selected' : ''}>2 minutes</option>
                        <option value="5" ${prefs.timeLimitMin === 5 ? 'selected' : ''}>5 minutes</option>
                        <option value="10" ${prefs.timeLimitMin === 10 ? 'selected' : ''}>10 minutes</option>
                        <option value="15" ${prefs.timeLimitMin === 15 ? 'selected' : ''}>15 minutes</option>
                    </select>
                </div>
                <p class="insert-hint">Live mode docks this panel so you stay in the 3D view. HUD <strong>↩</strong> undoes the last live step. GIMP <code>textures:watch</code> still hot-reloads maps with a mesh pulse.</p>
                <p class="insert-hint">Routing: small→<code>${esc(route.small || 'auto')}</code> · medium→<code>${esc(route.medium || 'auto')}</code> · large→<code>${esc(route.large || 'auto')}</code> · ${OllamaRunQueue.getPrefs().allowParallelLocal ? 'parallel' : 'sequential'} · folder: <code>${esc(WorkFolderScope.scopeLabel())}</code></p>
            </details>
            <div id="agent-portal-job-log" class="agent-portal-job-log"></div>
        `;
        this._bindBuildPrefInputs();
        this._syncGenerateLabel();
    },

    _bindBuildPrefInputs() {
        const save = () => {
            BuildJob.setPrefs({
                multiStep: document.getElementById('portal-multistep')?.checked !== false,
                liveApply: document.getElementById('portal-live-apply')?.checked !== false,
                resumePlay: document.getElementById('portal-resume-play')?.checked !== false,
                intensity: document.getElementById('portal-intensity')?.value || 'focused',
                timeLimitMin: parseInt(document.getElementById('portal-time-limit')?.value || '0', 10) || 0,
            });
            this._syncGenerateLabel();
        };
        ['portal-multistep', 'portal-live-apply', 'portal-resume-play', 'portal-intensity', 'portal-time-limit'].forEach((id) => {
            document.getElementById(id)?.addEventListener('change', save);
        });
    },

    _syncGenerateLabel() {
        const genBtn = document.getElementById('agent-portal-generate');
        if (!genBtn) return;
        const live = document.getElementById('portal-live-apply')?.checked !== false
            && BuildJob.getPrefs().liveApply !== false;
        genBtn.textContent = live ? 'GENERATE → LIVE SCENE' : 'GENERATE NOW → COMPILER';
    },

    /** Dock portal so the 3D view stays visible during live build. */
    dockForLive() {
        if (!this._modal) return;
        this._modal.classList.add('open', 'agent-portal-docked');
        document.body.classList.add('agent-portal-open', 'agent-portal-live-dock');
    },

    expandFromLive() {
        if (!this._modal) return;
        this._modal.classList.add('open');
        this._modal.classList.remove('agent-portal-docked');
        document.body.classList.add('agent-portal-open');
        document.body.classList.remove('agent-portal-live-dock');
        this.showStep('build');
        this.renderChat();
    },

    renderJobLog(events = []) {
        const el = document.getElementById('agent-portal-job-log');
        if (!el || !events.length) return;
        el.innerHTML = events.map((e) => {
            if (e.type === 'step-start') {
                return `<div class="agent-portal-job-step">⏳ ${esc(e.label)} (${e.step + 1}/${e.total})</div>`;
            }
            if (e.type === 'step-done') {
                const last = e.log?.[e.log.length - 1];
                const live = e.chunk ? ' · live' : '';
                return `<div class="agent-portal-job-step done">✓ ${esc(e.label)} — ${esc(last?.provider)}/${esc(last?.model)} ${last?.ms || 0}ms${live}</div>`;
            }
            if (e.type === 'timeout') return '<div class="agent-portal-job-step warn">⏱ Time limit reached — partial code saved</div>';
            if (e.type === 'stopped') return '<div class="agent-portal-job-step warn">■ Stopped by user</div>';
            return '';
        }).join('');
    },

    renderChat() {
        const log = document.getElementById('agent-portal-chat-log');
        if (!log) return;

        const history = this._session.chatHistory || [];
        if (!history.length) {
            log.innerHTML = `<div class="agent-portal-msg agent-portal-msg-assistant">
                <p>Terminal grid is live. Describe a scene in one message — e.g. “small courtyard with crates and soft lighting”.</p>
                <p><strong>GENERATE → LIVE SCENE</strong> unlocks as soon as your brief is clear (no multi-turn required). Optional: refine in chat first.</p>
            </div>`;
            return;
        }

        log.innerHTML = history.map((m) => `
            <div class="agent-portal-msg agent-portal-msg-${m.role}">
                <p>${esc(m.text).replace(/\n/g, '<br>')}</p>
                ${m.meta ? `<span class="agent-portal-msg-meta">${esc(m.meta)}</span>` : ''}
            </div>
        `).join('');
        log.scrollTop = log.scrollHeight;
    },

    showStep(step) {
        this._step = step;
        document.querySelectorAll('[data-portal-step]').forEach((s) => {
            s.classList.toggle('hidden', s.dataset.portalStep !== step);
        });

        const connectBtn = document.getElementById('agent-portal-connect');
        const sendBtn = document.getElementById('agent-portal-send');
        const genBtn = document.getElementById('agent-portal-generate');
        const footer = document.getElementById('agent-portal-footer');

        if (footer) {
            footer.style.display = step === 'build' ? 'none' : '';
        }
        if (connectBtn) connectBtn.style.display = step === 'connect' ? 'inline-block' : 'none';
        if (sendBtn) sendBtn.style.display = step === 'build' ? 'inline-block' : 'none';
        this._syncGenerateVisibility();
        const stopBtn = document.getElementById('agent-portal-stop-job');
        if (stopBtn) stopBtn.style.display = step === 'build' && BuildJob.isRunning() ? 'inline-block' : 'none';
        if (step === 'build') this.renderBuildControls();

        const title = document.getElementById('agent-portal-title');
        if (title) {
            const titles = {
                connect: 'Connect your agent',
                build: 'Build assistant',
            };
            title.textContent = titles[step] || 'Agent Portal';
        }
    },

    _syncGenerateVisibility() {
        const genBtn = document.getElementById('agent-portal-generate');
        if (!genBtn) return;
        const ready = !!this._session.buildContext?.ready;
        const show = this._step === 'build' && ready && !BuildJob.isRunning();
        genBtn.style.display = show ? 'inline-block' : 'none';
        if (show) this._syncGenerateLabel?.();
    },

    async runDetect() {
        this.showStep('connect');
        const status = document.getElementById('agent-portal-status');
        if (status) status.textContent = 'Detecting providers…';
        const detectEl = document.getElementById('agent-portal-detect');
        if (detectEl) detectEl.innerHTML = '<p class="insert-hint">Scanning Grok Build, Ollama, creative watch…</p>';

        const probe = await this.probe();
        this.renderDetect(probe);
        AgentStatus.refresh?.();
        emitPortalChange();

        if (status) status.textContent = '';
    },

    connect() {
        const provider = document.querySelector('input[name="portal-provider"]:checked')?.value || 'auto';
        const probe = this._probe;

        if (!hasAnyProvider(probe)) {
            window.UI?.status?.('Add xAI key or start Ollama — or skip to explore');
            return;
        }

        const patch = {
            small: document.getElementById('portal-tier-small')?.value || 'auto',
            medium: document.getElementById('portal-tier-medium')?.value || 'auto',
            large: document.getElementById('portal-tier-large')?.value || 'auto',
            preferGrokLarge: document.getElementById('portal-prefer-grok-large')?.checked !== false,
        };

        if (provider === 'grok') {
            patch.preferGrokLarge = true;
        } else if (provider === 'ollama') {
            patch.preferGrokLarge = false;
            if (patch.small === 'auto' && probe.ollama?.ok) {
                const pick = probe.ollama.models.find((m) => tierForModel(m) === 'small');
                if (pick) patch.small = pick;
            }
            if (patch.medium === 'auto' && probe.ollama?.ok) {
                const pick = probe.ollama.models.find((m) => tierForModel(m) === 'medium');
                if (pick) patch.medium = pick;
            }
            if (patch.large === 'auto' && probe.ollama?.ok) {
                const pick = probe.ollama.models.find((m) => tierForModel(m) === 'large');
                if (pick) patch.large = pick;
            }
            if (probe.ollama?.models?.[0]) OllamaClient.setPreferredModel(probe.ollama.models[0]);
        } else if (provider === 'auto' && !(probe.grokKey || probe.grokBuild)) {
            patch.preferGrokLarge = false;
        }

        AgentRouter.setTierPrefs(patch);
        OllamaRunQueue.setPrefs({ allowParallelLocal: document.getElementById('portal-allow-parallel')?.checked === true });
        WorkFolderScope.setPrefs({
            scopeId: document.getElementById('portal-work-folder-scope')?.value || WorkFolderScope.getPrefs().scopeId,
            freezeOnLocal: document.getElementById('portal-work-folder-freeze')?.checked !== false,
        });
        const distinct = countDistinctLocalModels(patch);
        if (distinct > 1 && !OllamaRunQueue.getPrefs().allowParallelLocal) {
            window.UI?.status?.(`Connected — ${distinct} local models run sequentially`);
        }

        this._session = saveSession({
            connected: true,
            dismissed: false,
            primaryProvider: provider,
            chatHistory: [],
            buildContext: null,
        });

        emitPortalChange();
        AgentStatus.refresh?.();
        window.UI?.status?.('Agent connected — describe what you want to build');
        this.showStep('build');
        this.renderChat();
    },

    skip() {
        this._session = saveSession({ dismissed: true });
        emitPortalChange();
        this.hide();
        this.showBuildCta();
        window.UI?.status?.('Explore the grid — tap BUILD SOMETHING or AI (top-left) anytime');
    },

    /** Primary entry: probe → auto-connect when possible → build chat. */
    async openBuildFast(opts = {}) {
        if (window.SurfaceProfile?.isPlayer?.()) {
            window.SurfaceProfile.set('creator');
            window.UI?.status?.('Creator tools on');
        }
        window.SceneDock?.setFullyHidden?.(false, true);
        this.hideBuildCta();

        if (!this._modal) this.init();
        this._modal?.classList.add('open');
        document.body.classList.add('agent-portal-open');
        this._modal?.classList.remove('agent-portal-docked');
        document.body.classList.remove('agent-portal-live-dock');

        const status = document.getElementById('agent-portal-status');
        if (status) status.textContent = 'Checking agents…';

        const probe = await this.probe();
        this.renderDetect(probe);
        AgentStatus.refresh?.();
        emitPortalChange();

        if (!hasAnyProvider(probe)) {
            this.showStep('connect');
            if (status) {
                status.textContent = 'Paste a Grok key (console.x.ai) or start Ollama, then START BUILDING';
            }
            // Focus key field for phone path
            document.getElementById('agent-portal-xai-key')?.focus?.();
            return false;
        }

        if (!this._session.connected) {
            this.connect();
        } else {
            this.showStep('build');
            this.renderChat();
        }

        if (opts.prefill) this.prefillChat(opts.prefill);
        if (status) status.textContent = '';
        window.UI?.status?.('Describe what to build — one clear message is enough');
        document.getElementById('agent-portal-chat-input')?.focus?.();
        return true;
    },

    showBuildCta() {
        if (ViewPrefs.get('buildCtaDismissed', false)) return;
        let el = document.getElementById('build-something-cta');
        if (!el) {
            el = document.createElement('button');
            el.type = 'button';
            el.id = 'build-something-cta';
            el.className = 'build-something-cta';
            el.textContent = 'BUILD SOMETHING';
            el.title = 'Open Agent Portal and start a live build';
            const layer = document.getElementById('ui-layer') || document.body;
            layer.appendChild(el);
        }
        if (!el.dataset.bound) {
            el.dataset.bound = '1';
            el.addEventListener('click', () => {
                void this.openBuildFast();
            });
        }
        el.hidden = false;
        el.classList.add('visible');
    },

    hideBuildCta() {
        const el = document.getElementById('build-something-cta');
        if (el) {
            el.hidden = true;
            el.classList.remove('visible');
        }
    },

    dismissBuildCta() {
        ViewPrefs.set('buildCtaDismissed', true);
        this.hideBuildCta();
    },

    async sendChat() {
        if (this._busy) return;
        const input = document.getElementById('agent-portal-chat-input');
        const text = input?.value?.trim();
        if (!text) return;

        if (!hasAnyProvider(this._probe || this._session.lastProbe || {})) {
            window.UI?.status?.('Connect Grok or Ollama first');
            return;
        }

        const history = [...(this._session.chatHistory || [])];
        history.push({ role: 'user', text });
        this._session = saveSession({ chatHistory: history });
        if (input) input.value = '';
        this.renderChat();

        // Fast path: clear scene brief → enable GENERATE immediately (no multi-turn ready JSON)
        const brief = looksLikeBuildBrief(text);
        if (brief) {
            const inferred = enrichReadyContext(inferBuildContext(text), text);
            history.push({
                role: 'assistant',
                text: `Ready from your brief: ${inferred.title} (${inferred.taskType} · ${inferred.placement}). `
                    + 'Tap GENERATE → LIVE SCENE now, or wait while I refine the plan…',
                meta: 'fast-path · inferred plan',
            });
            this._session = saveSession({
                chatHistory: history,
                buildContext: { ...inferred, ready: true },
            });
            this.renderChat();
            this._syncGenerateVisibility();
            window.UI?.status?.('Brief ready — GENERATE → LIVE SCENE or keep chatting');
        }

        this._busy = true;
        const status = document.getElementById('agent-portal-status');
        if (status) status.textContent = brief ? 'Refining plan (optional)…' : 'Thinking (small tier)…';

        try {
            const transcript = history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
            const result = await AgentRouter.runTask('npc_chat', {
                message: text,
                systemOverride: buildChatSystem(this._session),
                context: transcript,
            });

            const reply = result.text || '';
            let ready = parseReadySignal(reply);
            if (ready) {
                ready = enrichReadyContext(ready, text);
            }
            const pipelineHint = creativePipelineHint(text, this._probe || this._session.lastProbe);

            if (ready) {
                // Character / loadout: apply reasoned MOD plan to player skin
                if (ready.appearance && (ready.taskType === 'character' || ready.appearance.mods?.length)) {
                    try {
                        await applyAppearancePlan(ready.appearance, { applyToPlayer: true });
                        window.UI?.status?.(`Loadout applied · ${ready.intensity || 'focused'} · ${(ready.appearance.mods || []).length} mods`);
                    } catch (e) {
                        console.warn('[portal] appearance apply', e.message || e);
                    }
                }
                const modLine = ready.appearance?.mods?.length
                    ? `\nLoadout (${ready.appearance.archetype || 'custom'} · ${ready.intensity || 'focused'}): ${ready.appearance.mods.join(', ')}`
                    : '';
                const budgetLine = ready.generationBudget
                    ? `\nBudget: ≤${ready.generationBudget.maxProps} props · intensity ${ready.intensity || 'focused'}`
                    : '';
                history.push({
                    role: 'assistant',
                    text: `Ready to build: ${ready.title || ready.taskType}\n${ready.summary || ''}${modLine}${budgetLine}${pipelineHint}`,
                    meta: `${result.provider}/${result.model} · ${result.ms}ms`,
                });
                this._session = saveSession({
                    chatHistory: history,
                    buildContext: { ...ready, ready: true },
                });
                this._syncGenerateVisibility();
            } else if (looksLikeCode(reply)) {
                history.push({
                    role: 'assistant',
                    text: 'I have a script ready — tap GENERATE → LIVE SCENE (or review in Compiler).',
                    meta: `${result.provider}/${result.model}`,
                });
                this._session = saveSession({
                    chatHistory: history,
                    buildContext: { ready: true, title: 'Scene script', summary: text, _code: stripCodeFences(reply) },
                });
                this._syncGenerateVisibility();
            } else if (brief && this._session.buildContext?.ready) {
                // Keep inferred plan; append agent reply as notes only
                history.push({
                    role: 'assistant',
                    text: `${reply}${pipelineHint}\n\n(Your brief is still ready — GENERATE whenever you like.)`,
                    meta: `${result.provider}/${result.model}`,
                });
                this._session = saveSession({ chatHistory: history });
            } else {
                history.push({
                    role: 'assistant',
                    text: `${reply}${pipelineHint}`,
                    meta: `${result.provider}/${result.model} · small tier`,
                });
                this._session = saveSession({ chatHistory: history });
            }

            this.renderChat();
            if (status) status.textContent = '';
        } catch (e) {
            if (status) status.textContent = e.message || 'Agent unavailable';
            window.UI?.status?.(e.message || 'Check SETUP — Grok key or Ollama required');
        } finally {
            this._busy = false;
        }
    },

    async generateFromContext() {
        if (this._busy) return;
        const ctx = this._session.buildContext;
        if (!ctx?.ready) {
            window.UI?.status?.('Keep chatting — agent will signal when ready');
            return;
        }

        const gate = validateProductionReady(ctx);
        if (!gate.canGenerate) {
            const msg = gate.errors[0] || 'Production plan incomplete';
            window.UI?.status?.(`Blocked: ${msg}`);
            const status = document.getElementById('agent-portal-status');
            if (status) {
                status.textContent = `Plan incomplete — ${gate.errors.join(' · ')}`;
            }
            return;
        }
        if (gate.warnings.length) {
            window.UI?.status?.(`Generating (${gate.warnings.length} plan warning(s) — review after)`);
        }

        if (ctx._code) {
            this.applyCode(ctx._code, 'portal');
            return;
        }

        const multiStep = document.getElementById('portal-multistep')?.checked !== false;
        const liveApply = document.getElementById('portal-live-apply')?.checked !== false;
        const resumePlay = document.getElementById('portal-resume-play')?.checked !== false;
        const intensity = document.getElementById('portal-intensity')?.value || 'focused';
        const timeLimitMin = parseInt(document.getElementById('portal-time-limit')?.value || '0', 10) || 0;
        BuildJob.setPrefs({ multiStep, liveApply, resumePlay, intensity, timeLimitMin });

        this._busy = true;
        const status = document.getElementById('agent-portal-status');
        const jobEvents = [];
        LiveBuild.init();
        if (liveApply) {
            const planLen = multiStep
                ? BuildJob.planSteps(ctx.taskType || 'world', { ctx, prefs: { intensity } }).length
                : 1;
            LiveBuild.startSession({
                total: planLen,
                label: multiStep
                    ? (intensity === 'full' ? 'Full pipeline live build…' : 'Quick live build (3 steps)…')
                    : 'Generating live scene…',
                resumePlay,
                dockPortal: true,
            });
            LiveBuild._resumePlay = resumePlay;
        }

        BuildJob.onProgress((ev) => {
            jobEvents.push(ev);
            this.renderJobLog(jobEvents);
            if (ev.type === 'step-start' && status) {
                status.textContent = liveApply
                    ? `Live: ${ev.label} (${ev.step + 1}/${ev.total})…`
                    : `Building: ${ev.label} (${ev.step + 1}/${ev.total})…`;
            }
        });

        document.getElementById('agent-portal-generate')?.style && (document.getElementById('agent-portal-generate').style.display = 'none');
        document.getElementById('agent-portal-stop-job')?.style && (document.getElementById('agent-portal-stop-job').style.display = 'inline-block');

        try {
            let code;
            let meta;
            let appliedDuringJob = false;

            if (multiStep && (ctx.taskType === 'world' || !ctx.taskType || ['prop', 'character'].includes(ctx.taskType))) {
                if (status) {
                    status.textContent = liveApply
                        ? 'Live multi-step build — watch the scene…'
                        : 'Multi-step build starting (large → medium)…';
                }
                const job = await BuildJob.run(ctx);
                code = job.code;
                appliedDuringJob = liveApply && LiveBuild.appliedLive;
                const last = job.log[job.log.length - 1];
                meta = last
                    ? `${last.provider}/${last.model} · ${job.log.length} steps${appliedDuringJob ? ' · live' : ''}`
                    : 'build-job';
            } else {
                if (status) status.textContent = liveApply ? 'Generating → live scene…' : 'Generating scene (large tier)…';
                const idea = `${buildCompilerRequest(ctx, this._session.chatHistory || [])}

${getSceneApiPrompt()}`;

                const result = await AgentRouter.runTask('prompter_generate', {
                    idea,
                    systemOverride: `Threshold scene agent. Follow ASSET PRODUCTION PLAN order. Full IIFE with try/catch.\n${getSceneApiPrompt()}`,
                }, { timeoutMs: 300000 });
                code = result.code || result.text || '';
                meta = `${result.provider}/${result.model} · ${result.ms}ms`;
                if (liveApply && code) {
                    const liveResult = await LiveBuild.applyFullCode(code, {
                        label: ctx.title || 'Scene',
                        source: 'portal-live',
                    });
                    appliedDuringJob = !!liveResult?.ok;
                    if (appliedDuringJob) meta += ' · live';
                }
            }

            this.applyCode(code, meta, {
                stayInEngine: liveApply && (appliedDuringJob || LiveBuild.appliedLive),
                alreadyLive: appliedDuringJob || LiveBuild.appliedLive,
            });
            if (status) {
                status.textContent = liveApply && (appliedDuringJob || LiveBuild.appliedLive)
                    ? 'Live build finished — walk the scene (code also in Compiler)'
                    : '';
            }
        } catch (e) {
            if (status) status.textContent = e.message || 'Generation failed';
            window.UI?.status?.(e.message || 'Generation failed');
            LiveBuild.endSession({ label: 'Build failed', holdMs: 2000 });
        } finally {
            this._busy = false;
            document.getElementById('agent-portal-stop-job')?.style && (document.getElementById('agent-portal-stop-job').style.display = 'none');
            const ready = !!this._session.buildContext?.ready;
            if (ready) document.getElementById('agent-portal-generate')?.style && (document.getElementById('agent-portal-generate').style.display = 'inline-block');
            this._syncGenerateLabel();
        }
    },

    runInEngine() {
        const out = document.getElementById('comp-output');
        const code = out?.value?.trim();
        if (!code) {
            window.UI?.status?.('No code in Compiler output');
            return;
        }
        // Guard: full script re-run after live apply will often duplicate objects
        if (LiveBuild.appliedLive) {
            const go = window.confirm(
                'Scene already applied live.\n\n'
                + 'OK = run full script anyway (may duplicate objects)\n'
                + 'Cancel = keep live scene (code stays in Compiler)',
            );
            if (!go) {
                window.UI?.status?.('Kept live scene — open Compiler to edit without re-running');
                document.querySelector('[data-target="view-engine"]')?.click();
                return;
            }
        }
        const live = BuildJob.getPrefs().liveApply !== false;
        if (live && !LiveBuild.appliedLive) {
            void LiveBuild.applyFullCode(code, { label: 'Compiler run', source: 'portal-run' });
            return;
        }
        if (window.State && !window.State.isPaused) {
            window.UI?.togglePause?.('AI build');
        }
        document.querySelector('[data-target="view-engine"]')?.click();
        setTimeout(() => {
            if (window.Actions) {
                window.Actions.dispatch('RUN_CODE', { code, source: 'portal' });
            } else {
                window.Runtime?.execute?.(code, 'portal');
            }
        }, 150);
    },

    applyCode(code, meta, opts = {}) {
        const sanitized = sanitizeSceneCode(code);
        const readiness = codeReadinessSummary(sanitized);
        const out = document.getElementById('comp-output');
        const inp = document.getElementById('comp-input');
        if (inp) inp.value = sanitized;
        if (out) out.value = sanitized;

        const stayInEngine = !!opts.stayInEngine;
        const alreadyLive = !!opts.alreadyLive;

        const history = [...(this._session.chatHistory || [])];
        let readyNote;
        if (alreadyLive) {
            readyNote = 'Scene applied live — walk around to inspect. Full script also saved in Compiler (re-run only if you need a clean pass).';
        } else if (readiness.hasEditGuard && readiness.hasIife && readiness.usesWorldApi) {
            readyNote = 'Code sanitized & ready — tap RUN IN ENGINE or review in Compiler.';
        } else {
            readyNote = 'Code in Compiler — review readiness checks, then RUN IN ENGINE.';
        }
        history.push({
            role: 'assistant',
            text: readyNote,
            meta: String(meta),
        });
        this._session = saveSession({ chatHistory: history, buildContext: null });
        this.renderChat();

        const runBtn = document.getElementById('agent-portal-run-engine');
        if (runBtn) {
            runBtn.style.display = 'inline-block';
            runBtn.textContent = alreadyLive ? 'RE-RUN IN ENGINE' : 'RUN IN ENGINE';
        }

        window.SessionUi?.setShowAllTools?.(true, { silent: true });
        if (stayInEngine) {
            document.querySelector('[data-target="view-engine"]')?.click();
            this.dockForLive();
        } else {
            document.querySelector('[data-target="view-compiler"]')?.click();
            this._modal?.classList.remove('agent-portal-docked');
            document.body.classList.remove('agent-portal-live-dock');
        }
        window.Compiler?.checkReady?.();
        window.UI?.status?.(readyNote);
    },

    prefillChat(text) {
        const input = document.getElementById('agent-portal-chat-input');
        if (input && text) input.value = String(text);
    },

    show(opts = {}) {
        if (!this._modal) return;
        this._modal.classList.add('open');
        document.body.classList.add('agent-portal-open');
        this.hideBuildCta();
        if (opts.fastBuild) {
            void this.openBuildFast(opts);
            return;
        }
        if (opts.step === 'build' && this._session.connected) {
            this.showStep('build');
            this.renderChat();
        } else if (opts.step === 'build') {
            void this.openBuildFast(opts);
        } else {
            this.runDetect();
        }
    },

    hide() {
        this._modal?.classList.remove('open', 'agent-portal-docked');
        document.body.classList.remove('agent-portal-live-dock');
        document.body.classList.remove('agent-portal-open');
    },

    openFromTerminal() {
        // Play surface: offer creator tools instead of empty Ollama wall
        if (window.SurfaceProfile?.isPlayer?.()) {
            window.SurfaceProfile.set('creator');
            window.UI?.status?.('Creator tools on — build path open');
        }
        window.SceneDock?.setFullyHidden?.(false, true);
        void this.openBuildFast();
    },

    startIfNeeded(opts = {}) {
        if (this._session.connected && this._session.chatHistory?.length) return;
        if (this._session.dismissed && !opts.preferBuild) return;
        if (IS_GROK_EDITION && !Auth.isLoggedIn()) return;
        // Play surface: show a single path into creator build (no Ollama wall)
        if (window.SurfaceProfile?.isPlayer?.()) {
            setTimeout(() => {
                this.showBuildCta();
                window.UI?.status?.('Tap BUILD SOMETHING for creator tools + Grok key');
            }, 500);
            return;
        }
        if (window.SurfaceProfile && !window.SurfaceProfile.allowsAgentAuto()) return;

        const preferBuild = !!opts.preferBuild
            || ViewPrefs.get('sessionMode', 'play') === 'build';

        setTimeout(() => {
            window.CornerHub?.pulseAgent?.();
            this.showBuildCta();
            if (preferBuild) {
                window.UI?.status?.('Build mode — tap BUILD SOMETHING (or AI top-left) to start a live scene');
            } else {
                window.UI?.status?.('Explore the grid — tap BUILD SOMETHING or AI (top-left) when ready');
            }
        }, 450);
    },

    resetSession() {
        this._session = saveSession({
            connected: false,
            dismissed: false,
            chatHistory: [],
            buildContext: null,
        });
        emitPortalChange();
    },
};

window.AgentPortal = AgentPortal;