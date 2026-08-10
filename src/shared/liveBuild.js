/**
 * Live Build — apply agent steps into the running scene so creators can
 * walk around and watch layout, materials, and textures appear step-by-step.
 */

import { Runtime } from './runtime.js';
import { sanitizeSceneCode } from './codeSanitizer.js';
import { BuildJob } from './buildJob.js';
import { SceneHistory } from './sceneHistory.js';
import { artPathsStatusForObjects, expectedTexturePath } from './artNaming.js';

const PULSE_MS = 1100;
const RESUME_PLAY_MS = 280;

function objectIdSet(objects = []) {
    const set = new Set();
    for (const o of objects) {
        if (o?.uuid) set.add(o.uuid);
    }
    return set;
}

function collectMeshes(root) {
    const out = [];
    if (!root) return out;
    if (root.isMesh && root.material) out.push(root);
    root.traverse?.((c) => {
        if (c.isMesh && c.material) out.push(c);
    });
    return out;
}

function materialsOf(mesh) {
    if (!mesh?.material) return [];
    return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

export const LiveBuild = {
    _active: false,
    _steps: [],
    _stepIndex: 0,
    _total: 0,
    _appliedLive: false,
    _hud: null,
    _pulseTimers: [],
    _resumePlay: true,
    _boundTexture: null,
    _boundJob: null,
    _checkpointDepth: 0,

    get active() {
        return this._active;
    },

    get appliedLive() {
        return this._appliedLive;
    },

    canUndoLastStep() {
        return SceneHistory.canUndo?.() && this._checkpointDepth > 0;
    },

    init() {
        if (this._boundJob) return;
        this.ensureHud();
        this._boundJob = (e) => this.onJobEvent(e.detail || {});
        this._boundTexture = (e) => this.onTextureApplied(e.detail || {});
        window.addEventListener('build-job-progress', this._boundJob);
        window.addEventListener('live-texture-applied', this._boundTexture);
    },

    ensureHud() {
        if (this._hud?.querySelector?.('.live-build-hud-inner')) return this._hud;
        let el = document.getElementById('live-build-hud');
        if (!el) {
            el = document.createElement('div');
            el.id = 'live-build-hud';
            el.className = 'live-build-hud';
            el.hidden = true;
            el.setAttribute('aria-live', 'polite');
            const layer = document.getElementById('ui-layer') || document.body;
            layer.appendChild(el);
        }
        if (!el.querySelector('.live-build-hud-inner')) {
            el.className = 'live-build-hud';
            el.setAttribute('aria-live', 'polite');
            el.innerHTML = `
                <div class="live-build-hud-inner">
                    <div class="live-build-hud-top">
                        <span class="live-build-hud-badge">LIVE BUILD</span>
                        <button type="button" class="live-build-hud-undo btn-sm" title="Undo last live step" disabled>↩</button>
                        <button type="button" class="live-build-hud-expand btn-sm" title="Open Agent Portal">AI</button>
                        <button type="button" class="live-build-hud-stop btn-sm" title="Stop job">■</button>
                    </div>
                    <div class="live-build-hud-label">Idle</div>
                    <div class="live-build-hud-bar"><div class="live-build-hud-fill"></div></div>
                    <ol class="live-build-hud-steps"></ol>
                </div>
            `;
            el.querySelector('.live-build-hud-expand')?.addEventListener('click', () => {
                window.AgentPortal?.expandFromLive?.() || window.AgentPortal?.show?.({ step: 'build' });
            });
            el.querySelector('.live-build-hud-stop')?.addEventListener('click', () => {
                BuildJob.stop();
                window.UI?.status?.('Stopping live build…');
            });
            el.querySelector('.live-build-hud-undo')?.addEventListener('click', () => {
                void this.undoLastStep();
            });
        }
        this._hud = el;
        return el;
    },

    prefs() {
        return BuildJob.getPrefs();
    },

    isLiveEnabled() {
        const p = this.prefs();
        return p.liveApply !== false;
    },

    startSession(opts = {}) {
        this.init();
        this._active = true;
        this._appliedLive = false;
        this._steps = [];
        this._stepIndex = 0;
        this._total = opts.total || 0;
        this._resumePlay = opts.resumePlay !== false;
        this._checkpointDepth = 0;
        this.clearPulses();
        this.showHud();
        this.renderHud({ label: opts.label || 'Starting live build…', phase: 'start' });
        this.focusEngine({ dockPortal: opts.dockPortal !== false });
        window.dispatchEvent(new CustomEvent('live-build-change', { detail: { active: true } }));
    },

    endSession(opts = {}) {
        this._active = false;
        if (opts.hideHud !== false) {
            setTimeout(() => this.hideHud(), opts.holdMs ?? 2200);
        }
        this.renderHud({
            label: opts.label || (this._appliedLive ? 'Live build complete — walk the scene' : 'Build finished'),
            phase: 'done',
        });
        window.dispatchEvent(new CustomEvent('live-build-change', {
            detail: { active: false, appliedLive: this._appliedLive },
        }));
    },

    showHud() {
        const el = this.ensureHud();
        el.hidden = false;
        el.classList.add('visible');
    },

    hideHud() {
        if (!this._hud) return;
        this._hud.hidden = true;
        this._hud.classList.remove('visible');
    },

    renderHud({ label, phase } = {}) {
        const el = this.ensureHud();
        const labelEl = el.querySelector('.live-build-hud-label');
        const fill = el.querySelector('.live-build-hud-fill');
        const list = el.querySelector('.live-build-hud-steps');
        if (labelEl && label) labelEl.textContent = label;

        const total = Math.max(this._total, this._steps.length, 1);
        const done = this._steps.filter((s) => s.status === 'done').length;
        const pct = phase === 'done'
            ? 100
            : Math.round(((done + (phase === 'running' ? 0.35 : 0)) / total) * 100);
        if (fill) fill.style.width = `${Math.min(100, Math.max(4, pct))}%`;

        if (list) {
            list.innerHTML = this._steps.map((s) => {
                const icon = s.status === 'done' ? '✓' : (s.status === 'running' ? '⏳' : '·');
                const cls = s.status === 'done' ? 'done' : (s.status === 'running' ? 'running' : '');
                return `<li class="live-build-hud-step ${cls}"><span>${icon}</span> ${escapeHtml(s.label)}</li>`;
            }).join('');
        }

        el.classList.toggle('live-build-busy', phase === 'running' || phase === 'applying');
        el.classList.toggle('live-build-done', phase === 'done');
        const undoBtn = el.querySelector('.live-build-hud-undo');
        if (undoBtn) {
            undoBtn.disabled = !this.canUndoLastStep();
            undoBtn.title = this.canUndoLastStep()
                ? 'Undo last live step'
                : 'No live step to undo';
        }
    },

    async undoLastStep() {
        if (!this.canUndoLastStep()) {
            window.UI?.status?.('No live step to undo');
            return false;
        }
        const ok = await SceneHistory.undo({ silent: false });
        if (ok) {
            this._checkpointDepth = Math.max(0, this._checkpointDepth - 1);
            if (this._checkpointDepth === 0) this._appliedLive = false;
            const lastDone = [...this._steps].reverse().find((s) => s.status === 'done');
            if (lastDone) lastDone.status = 'pending';
            this.renderHud({ label: 'Undid last live step', phase: this._active ? 'running' : 'done' });
            window.UI?.status?.('Live step undone');
        }
        return ok;
    },

    focusEngine({ dockPortal = true } = {}) {
        document.querySelector('[data-target="view-engine"]')?.click();
        window.SessionUi?.setShowAllTools?.(true, { silent: true });
        if (dockPortal) {
            window.AgentPortal?.dockForLive?.();
        }
    },

    ensureEditable() {
        const State = window.State;
        if (!State) return false;
        if (!State.isPaused) {
            window.UI?.togglePause?.('Live build');
        }
        return !!State.isPaused;
    },

    resumePlayIfWanted() {
        if (!this._resumePlay) return;
        const State = window.State;
        if (!State?.isPaused) return;
        // Prefer PLAY walk so creators can inspect the new geometry while the next agent step runs
        setTimeout(() => {
            if (!State.isPaused) return;
            // Leave ARRANGE alone — user may be positioning props mid-build
            if (window.SimMode?.isArrange?.()) return;
            window.UI?.togglePause?.('Live build watch');
            if (State.interactionMode === 'edit') {
                State.interactionMode = 'play';
            }
            window.dispatchEvent(new CustomEvent('threshold:mode-change', {
                detail: { mode: 'play', source: 'live-build' },
            }));
        }, RESUME_PLAY_MS);
    },

    snapshotObjects() {
        return objectIdSet(window.State?.objects || []);
    },

    pulseObjects(objects = [], opts = {}) {
        const hex = opts.color ?? 0x00ffaa;
        const intensity = opts.intensity ?? 0.55;
        const ms = opts.ms ?? PULSE_MS;
        const restore = [];

        for (const root of objects) {
            for (const mesh of collectMeshes(root)) {
                for (const mat of materialsOf(mesh)) {
                    if (!mat?.emissive) continue;
                    restore.push({
                        mat,
                        color: mat.emissive.clone(),
                        intensity: mat.emissiveIntensity ?? 0,
                    });
                    mat.emissive.setHex(hex);
                    mat.emissiveIntensity = intensity;
                    mat.needsUpdate = true;
                }
            }
        }

        if (!restore.length) return;
        const t = setTimeout(() => {
            for (const r of restore) {
                try {
                    r.mat.emissive.copy(r.color);
                    r.mat.emissiveIntensity = r.intensity;
                    r.mat.needsUpdate = true;
                } catch {
                    /* disposed */
                }
            }
        }, ms);
        this._pulseTimers.push(t);
    },

    clearPulses() {
        this._pulseTimers.forEach((t) => clearTimeout(t));
        this._pulseTimers = [];
    },

    findNewObjects(beforeSet) {
        const objects = window.State?.objects || [];
        return objects.filter((o) => o?.uuid && !beforeSet.has(o.uuid));
    },

    /**
     * Apply a single step's code into the live scene (not full accumulated script).
     */
    async applyChunk(rawChunk, meta = {}) {
        let code = sanitizeSceneCode(rawChunk || '');
        if (!code || code.length < 12) {
            window.UI?.status?.(`${meta.label || 'Step'} — no executable scene code (comments only)`);
            return { ok: true, skipped: true };
        }
        // Never wipe the scene mid live-build — steps must extend the grid
        if (/World\.clearWorld\s*\(/.test(code)) {
            code = code.replace(/World\.clearWorld\s*\(\s*\)\s*;?/g, '/* live-build: clearWorld blocked */');
            window.UI?.status?.('Live build blocked clearWorld — extending scene instead');
        }

        this.focusEngine({ dockPortal: true });
        this.ensureEditable();

        const before = this.snapshotObjects();
        this.renderHud({
            label: `Applying: ${meta.label || 'step'}…`,
            phase: 'applying',
        });

        // Runtime.execute pushes SceneHistory for world-mutating code (and reverts on fail)
        const depthBefore = SceneHistory.depth?.() ?? 0;
        const result = Runtime.execute(code, meta.source || `live-build:${meta.label || 'step'}`);
        if (!result.ok) {
            window.UI?.status?.(`Live step error: ${result.error || 'failed'}`);
            this.renderHud({
                label: `Error on ${meta.label || 'step'} — check Compiler`,
                phase: 'running',
            });
            return result;
        }

        const depthAfter = SceneHistory.depth?.() ?? 0;
        if (depthAfter > depthBefore) {
            this._checkpointDepth += depthAfter - depthBefore;
        } else {
            // Non-mutating or track-skipped — still allow UI undo of prior live steps
            this._checkpointDepth = Math.max(this._checkpointDepth, 0);
        }
        this._appliedLive = true;
        const created = this.findNewObjects(before);
        const artHint = created.length ? artPathsStatusForObjects(created, { max: 2 }) : '';
        if (created.length) {
            this.pulseObjects(created, { color: 0x00ffaa, intensity: 0.6 });
            // Stash textureHint from name when agents omitted it (GIMP slug contract)
            for (const obj of created) {
                const n = obj?.userData?.name;
                if (n && !obj.userData.textureHint) {
                    obj.userData.textureHint = expectedTexturePath(n, 'albedo');
                }
            }
        } else {
            // Material / atmosphere-only steps — stronger blue pulse so material work is visible
            const recent = (window.State?.objects || []).slice(-8);
            this.pulseObjects(recent, { color: 0x5eb8ff, intensity: 0.55, ms: 900 });
            window.UI?.status?.(`Live: ${meta.label || 'step'} · materials / atmosphere`);
        }

        const baseStatus = created.length
            ? `Live: ${meta.label || 'step'} · +${created.length} object(s)`
            : `Live: ${meta.label || 'step'} applied`;
        window.UI?.status?.(artHint ? `${baseStatus} · ${artHint}` : baseStatus);
        if (artHint) {
            this.renderHud({
                label: `✓ ${meta.label || 'step'} · ${artHint}`,
                phase: 'applying',
            });
        }

        this.resumePlayIfWanted();
        return result;
    },

    onJobEvent(ev = {}) {
        if (!this.isLiveEnabled() && !this._active) return;

        if (ev.type === 'step-start') {
            if (!this._active) {
                this.startSession({ total: ev.total, label: ev.label });
            }
            this._total = ev.total || this._total;
            this._stepIndex = ev.step ?? this._stepIndex;
            const existing = this._steps.find((s) => s.index === ev.step);
            if (existing) {
                existing.status = 'running';
                existing.label = ev.label || existing.label;
            } else {
                this._steps.push({
                    index: ev.step,
                    label: ev.label || `Step ${ev.step + 1}`,
                    status: 'running',
                });
            }
            this.showHud();
            this.renderHud({
                label: `Building: ${ev.label} (${(ev.step || 0) + 1}/${ev.total})…`,
                phase: 'running',
            });
            return;
        }

        if (ev.type === 'step-done') {
            const step = this._steps.find((s) => s.index === ev.step);
            if (step) step.status = 'done';
            else {
                this._steps.push({
                    index: ev.step,
                    label: ev.label || `Step ${(ev.step || 0) + 1}`,
                    status: 'done',
                });
            }
            this.renderHud({
                label: `Applied: ${ev.label}`,
                phase: 'running',
            });

            if (this.isLiveEnabled() && ev.chunk) {
                void this.applyChunk(ev.chunk, {
                    label: ev.label,
                    source: `live-build:${ev.step}`,
                }).then(() => {
                    this.renderHud({
                        label: `✓ ${ev.label} — watching scene`,
                        phase: 'running',
                    });
                });
            }
            return;
        }

        if (ev.type === 'complete' || ev.type === 'stopped' || ev.type === 'timeout') {
            const label = ev.type === 'complete'
                ? 'Live build complete — walk & inspect'
                : ev.type === 'timeout'
                    ? 'Time limit — partial scene kept'
                    : 'Build stopped';
            this.endSession({ label, holdMs: 3200 });
        }
    },

    onTextureApplied(detail = {}) {
        const targets = detail.objects || detail.targets || [];
        if (!targets.length) return;
        this.pulseObjects(targets, {
            color: detail.slot === 'albedo' ? 0xffe08a : 0x7ec8ff,
            intensity: 0.5,
            ms: 900,
        });
        if (this._active || this.isLiveEnabled()) {
            this.showHud();
            this.renderHud({
                label: `Texture: ${detail.file || detail.slot || 'map'} on ${targets.length} mesh(es)`,
                phase: this._active ? 'running' : 'done',
            });
            if (!this._active) {
                setTimeout(() => this.hideHud(), 2400);
            }
        }
    },

    /** One-shot full script apply (non multi-step GENERATE). */
    async applyFullCode(code, meta = {}) {
        if (!this.isLiveEnabled()) return { ok: false, skipped: true };
        this.startSession({ total: 1, label: meta.label || 'Applying scene…' });
        this._steps = [{ index: 0, label: meta.label || 'Scene', status: 'running' }];
        const result = await this.applyChunk(code, meta);
        if (this._steps[0]) this._steps[0].status = result.ok ? 'done' : 'running';
        this.endSession({
            label: result.ok ? 'Scene applied live — walk the grid' : 'Apply failed — open Compiler',
            holdMs: 2800,
        });
        return result;
    },
};

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

window.LiveBuild = LiveBuild;
