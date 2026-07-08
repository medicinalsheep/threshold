/**
 * Agent Portal — auto-detect Grok Build / Ollama on entry, connect providers,
 * then conversational build intake (one task at a time via tiered router).
 */

import { Auth } from '../auth/main.js';
import { IS_GROK_EDITION, CREATIVE_WATCH_URL } from '../config.js';
import { ViewPrefs } from './viewPrefs.js';
import { OllamaClient } from './ollamaClient.js';
import { AgentRouter } from './agentRouter.js';
import { AgentStatus } from './agentStatus.js';
import { stripCodeFences } from './agentPrompts.js';
import { sanitizeSceneCode, codeReadinessSummary } from './codeSanitizer.js';
import { TIER_GUIDE, tierOptionsHtml, renderTierGuideHtml } from './agentModelGuide.js';
import { BuildJob } from './buildJob.js';
import { getSceneApiPrompt } from './sceneApiPrompt.js';
import { buildAgentPortalSystemPrompt, buildCompilerRequest, validateProductionReady } from './assetProductionPlan.js';
import { assessTierPrefs, renderMatrixHtml, buildModelMatrix, countDistinctLocalModels, getDeviceProfile } from './modelCapability.js';
import { OllamaRunQueue } from './ollamaRunQueue.js';
import { WorkFolderScope } from './workFolderScope.js';

const PREFS_KEY = 'agentPortalSession';

const TIER_HINTS = {
    small: ['threshold-mini-npc', 'llama3.2:3b', 'gemma3:4b', 'qwen2.5-coder:1.5b'],
    medium: ['threshold-mini-dev', 'qwen2.5-coder:7b', 'qwen2.5-coder:1.5b-base'],
    large: ['threshold-dev', 'threshold-large-scenes', 'llama3.1:8b', 'deepseek-r1:8b'],
};

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
    return probe.grokKey || probe.grokBuild || probe.ollama?.ok;
}

function hostingContext() {
    const host = window.location.hostname;
    const onPages = host.includes('github.io') || host.includes('github.dev');
    const onLocal = host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host);
    return { onPages, onLocal, host };
}

function buildChatSystem() {
    return buildAgentPortalSystemPrompt();
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
    },

    bindOnce() {
        if (this._modal?.dataset.bound) return;
        if (this._modal) this._modal.dataset.bound = '1';

        document.getElementById('agent-portal-close')?.addEventListener('click', () => this.hide());
        document.getElementById('agent-portal-skip')?.addEventListener('click', () => this.skip());
        document.getElementById('agent-portal-reprobe')?.addEventListener('click', () => this.runDetect());
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
            if (key && Auth.login(key)) {
                window.UI?.status?.('xAI key saved for this tab');
                this.runDetect();
            }
        });

        this._modal?.addEventListener('click', (e) => {
            if (e.target === this._modal && !this._busy) this.hide();
        });
    },

    async probe() {
        const grokKey = Auth.isLoggedIn();
        const grokBuild = IS_GROK_EDITION && grokKey;

        let ollama = { ok: false, models: [], error: 'offline' };
        try {
            ollama = await OllamaClient.probe(3000);
        } catch (e) {
            ollama = { ok: false, models: [], error: e.message };
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
            : probe.grokKey
                ? { state: 'ok', label: 'Grok API', detail: 'xAI key active in this tab' }
                : probe.grokEdition
                    ? { state: 'warn', label: 'Grok Build', detail: 'Sign in with your xAI key below' }
                    : { state: 'warn', label: 'Grok / xAI API', detail: 'Paste your xAI key below — works from GitHub Pages anywhere' };

        const ctx = hostingContext();
        const ollamaDetail = probe.ollama?.ok
            ? `${probe.ollama.models.length} models on this device — incl. threshold-mini-* if installed`
            : probe.ollama?.corsBlocked
                ? 'CORS 403 — restart with: npm run ollama:serve (or set OLLAMA_ORIGINS)'
                : ctx.onPages && !ctx.onLocal
                    ? 'Open this page on the PC running Ollama, then run: ollama serve'
                    : `Not reachable — run: ollama serve (${probe.ollama?.error || 'offline'})`;

        const ollamaLine = probe.ollama?.ok
            ? { state: 'ok', label: 'Ollama (your models)', detail: ollamaDetail }
            : { state: 'off', label: 'Ollama (your models)', detail: ollamaDetail };

        const watchLine = probe.watchHealth
            ? { state: 'ok', label: 'Creative watch', detail: 'GIMP/Blender hot-reload relay up' }
            : { state: 'off', label: 'Creative watch', detail: 'Optional — npm run textures:watch' };

        const rows = [grokLine, ollamaLine, watchLine];
        el.innerHTML = `
            <p class="agent-portal-kicker">Scanning your machine…</p>
            <ul class="agent-portal-detect-list">
                ${rows.map((r) => `
                    <li class="agent-portal-detect-item agent-portal-${r.state}">
                        <span class="agent-portal-detect-dot"></span>
                        <span><strong>${esc(r.label)}</strong><br><span class="agent-portal-detect-detail">${esc(r.detail)}</span></span>
                    </li>
                `).join('')}
            </ul>
            ${!hasAnyProvider(probe) ? `<p class="insert-hint"><strong>Bring your own model:</strong> paste a Grok/xAI key (works on any device), or open this tab on the PC where <code>ollama serve</code> runs. Install Threshold mini models: <code>npm run models:mini</code> (dev machine). You can explore the grid without AI.</p>` : ''}
            ${ctx.onPages ? '<p class="insert-hint">Hosted on GitHub Pages — scene runs in your browser; AI keys and Ollama stay on your device, never on our repo.</p>' : ''}
        `;

        this.renderModelPicker(probe);
        this.renderProviderPick(probe);

        const keyWrap = document.getElementById('agent-portal-xai-wrap');
        if (keyWrap) keyWrap.style.display = probe.grokKey ? 'none' : '';
    },

    renderProviderPick(probe) {
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

        el.innerHTML = `
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
    },

    renderModelPicker(probe) {
        const el = document.getElementById('agent-portal-models');
        if (!el) return;

        const models = probe.ollama?.ok ? probe.ollama.models : [];
        const prefs = AgentRouter.getTierPrefs();
        const canGrok = probe.grokKey || probe.grokBuild;

        el.innerHTML = `
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
                <label class="export-wizard-check"><input type="checkbox" id="portal-multistep" ${prefs.multiStep !== false ? 'checked' : ''}> Multi-step build (layout → props → atmosphere)</label>
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
                <p class="insert-hint">Routing: small→<code>${esc(route.small || 'auto')}</code> · medium→<code>${esc(route.medium || 'auto')}</code> · large→<code>${esc(route.large || 'auto')}</code> · ${OllamaRunQueue.getPrefs().allowParallelLocal ? 'parallel' : 'sequential'} · folder: <code>${esc(WorkFolderScope.scopeLabel())}</code></p>
            </details>
            <div id="agent-portal-job-log" class="agent-portal-job-log"></div>
        `;
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
                return `<div class="agent-portal-job-step done">✓ ${esc(e.label)} — ${esc(last?.provider)}/${esc(last?.model)} ${last?.ms || 0}ms</div>`;
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
                <p>You're on a blank grid with Compiler, GIMP/Blender pipelines, and tiered agents ready.</p>
                <p><strong>What do you want to build first?</strong> (world, character, prop, texture, sound…)</p>
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
        if (genBtn) {
            const ready = !!this._session.buildContext?.ready;
            genBtn.style.display = step === 'build' && ready && !BuildJob.isRunning() ? 'inline-block' : 'none';
        }
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
        window.UI?.status?.('Explore the grid — press F at the AI Build Station or SETUP anytime');
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

        this._busy = true;
        const status = document.getElementById('agent-portal-status');
        if (status) status.textContent = 'Thinking (small tier)…';

        try {
            const transcript = history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
            const result = await AgentRouter.runTask('npc_chat', {
                message: text,
                systemOverride: buildChatSystem(),
                context: transcript,
            });

            const reply = result.text || '';
            const ready = parseReadySignal(reply);
            const pipelineHint = creativePipelineHint(text, this._probe || this._session.lastProbe);

            if (ready) {
                history.push({
                    role: 'assistant',
                    text: `Ready to build: ${ready.title || ready.taskType}\n${ready.summary || ''}${pipelineHint}`,
                    meta: `${result.provider}/${result.model} · ${result.ms}ms`,
                });
                this._session = saveSession({
                    chatHistory: history,
                    buildContext: ready,
                });
                document.getElementById('agent-portal-generate')?.style && (document.getElementById('agent-portal-generate').style.display = 'inline-block');
            } else if (looksLikeCode(reply)) {
                history.push({
                    role: 'assistant',
                    text: 'I have a script ready — tap GENERATE NOW to open it in Compiler.',
                    meta: `${result.provider}/${result.model}`,
                });
                this._session = saveSession({
                    chatHistory: history,
                    buildContext: { ready: true, title: 'Scene script', summary: text, _code: stripCodeFences(reply) },
                });
                document.getElementById('agent-portal-generate')?.style && (document.getElementById('agent-portal-generate').style.display = 'inline-block');
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
        const timeLimitMin = parseInt(document.getElementById('portal-time-limit')?.value || '0', 10) || 0;
        BuildJob.setPrefs({ multiStep, timeLimitMin });

        this._busy = true;
        const status = document.getElementById('agent-portal-status');
        const jobEvents = [];
        BuildJob.onProgress((ev) => {
            jobEvents.push(ev);
            this.renderJobLog(jobEvents);
            if (ev.type === 'step-start' && status) {
                status.textContent = `Building: ${ev.label} (${ev.step + 1}/${ev.total})…`;
            }
        });

        document.getElementById('agent-portal-generate')?.style && (document.getElementById('agent-portal-generate').style.display = 'none');
        document.getElementById('agent-portal-stop-job')?.style && (document.getElementById('agent-portal-stop-job').style.display = 'inline-block');

        try {
            let code;
            let meta;

            if (multiStep && (ctx.taskType === 'world' || !ctx.taskType)) {
                if (status) status.textContent = 'Multi-step build starting (large → medium)…';
                const job = await BuildJob.run(ctx);
                code = job.code;
                const last = job.log[job.log.length - 1];
                meta = last ? `${last.provider}/${last.model} · ${job.log.length} steps` : 'build-job';
            } else {
                if (status) status.textContent = 'Generating scene (large tier)…';
                const idea = `${buildCompilerRequest(ctx, this._session.chatHistory || [])}

${getSceneApiPrompt()}`;

                const result = await AgentRouter.runTask('prompter_generate', {
                    idea,
                    systemOverride: `Threshold scene agent. Follow ASSET PRODUCTION PLAN order. Full IIFE with try/catch.\n${getSceneApiPrompt()}`,
                }, { timeoutMs: 300000 });
                code = result.code || result.text || '';
                meta = `${result.provider}/${result.model} · ${result.ms}ms`;
            }

            this.applyCode(code, meta);
            if (status) status.textContent = '';
        } catch (e) {
            if (status) status.textContent = e.message || 'Generation failed';
            window.UI?.status?.(e.message || 'Generation failed');
        } finally {
            this._busy = false;
            document.getElementById('agent-portal-stop-job')?.style && (document.getElementById('agent-portal-stop-job').style.display = 'none');
            const ready = !!this._session.buildContext?.ready;
            if (ready) document.getElementById('agent-portal-generate')?.style && (document.getElementById('agent-portal-generate').style.display = 'inline-block');
        }
    },

    runInEngine() {
        const out = document.getElementById('comp-output');
        const code = out?.value?.trim();
        if (!code) {
            window.UI?.status?.('No code in Compiler output');
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

    applyCode(code, meta) {
        const sanitized = sanitizeSceneCode(code);
        const readiness = codeReadinessSummary(sanitized);
        const out = document.getElementById('comp-output');
        const inp = document.getElementById('comp-input');
        if (inp) inp.value = sanitized;
        if (out) out.value = sanitized;

        const history = [...(this._session.chatHistory || [])];
        const readyNote = readiness.hasEditGuard && readiness.hasIife && readiness.usesWorldApi
            ? 'Code sanitized & ready — tap RUN IN ENGINE or review in Compiler.'
            : 'Code in Compiler — review readiness checks, then RUN IN ENGINE.';
        history.push({
            role: 'assistant',
            text: readyNote,
            meta: String(meta),
        });
        this._session = saveSession({ chatHistory: history, buildContext: null });
        this.renderChat();

        const runBtn = document.getElementById('agent-portal-run-engine');
        if (runBtn) runBtn.style.display = 'inline-block';

        window.SessionUi?.setShowAllTools?.(true, { silent: true });
        document.querySelector('[data-target="view-compiler"]')?.click();
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
        if (opts.step === 'build' && this._session.connected) {
            this.showStep('build');
            this.renderChat();
        } else {
            this.runDetect();
        }
    },

    hide() {
        this._modal?.classList.remove('open');
        document.body.classList.remove('agent-portal-open');
    },

    openFromTerminal() {
        window.SceneDock?.setFullyHidden?.(false, true);
        if (this._session.connected) {
            this.show({ step: 'build' });
        } else {
            this.show();
        }
        window.UI?.status?.('AI Build Station — connect agents or continue building');
    },

    startIfNeeded() {
        if (this._session.connected && this._session.chatHistory?.length) return;
        if (this._session.dismissed) return;
        if (IS_GROK_EDITION && !Auth.isLoggedIn()) return;

        setTimeout(() => {
            window.CornerHub?.pulseAgent?.();
            window.UI?.status?.('Explore the grid — tap AI (top-left) or press F at the build station when ready');
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