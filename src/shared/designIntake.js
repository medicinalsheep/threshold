/**
 * Design brief intake — GrokDevPrompt-style forms + agent follow-up questions.
 * User sets textures, sounds, poly budget, export targets before AI generates.
 */

import { ViewPrefs } from './viewPrefs.js';
import { SoundLibrary } from './soundLibrary.js';
import { AgentRouter } from './agentRouter.js';
import { stripCodeFences } from './agentPrompts.js';
import {
    PLACEMENT_OPTIONS,
    WEATHER_EXPOSURE_OPTIONS,
    WEATHER_VARIANT_OPTIONS,
    SURFACE_TYPE_OPTIONS,
    COLLISION_OPTIONS,
    buildProductionPlan,
    buildProductionReviewPrompt,
    buildDesignAgentSystemPrompt,
    formatPipelineChecklist,
    defaultProductionAnswers,
    validateDesignBrief,
    ATMOSPHERE_PRESETS,
    SHADER_PRESET_OPTIONS,
} from './assetProductionPlan.js';

export const DESIGN_TYPES = [
    { id: 'world', label: 'World / Environment', hint: 'Terrain, lighting, layout, atmosphere' },
    { id: 'character', label: 'Character / Avatar', hint: 'Body, appearance, animations, GLB path' },
    { id: 'prop', label: 'Prop / Object', hint: 'Interactive mesh, physics, textures' },
    { id: 'animation', label: 'Animation / Motion', hint: 'NPC behavior, patrol, cutscene motion' },
    { id: 'texture', label: 'Texture / Material', hint: 'GIMP/Blender PBR maps for a slot' },
    { id: 'sound', label: 'Sound / Audio', hint: 'SFX, ambient, collision triggers' },
];

const EXPORT_TARGETS = [
    { id: 'web', label: 'Web (GitHub Pages)' },
    { id: 'android', label: 'Android' },
    { id: 'ios', label: 'iOS' },
    { id: 'windows', label: 'Windows' },
    { id: 'steam', label: 'Steam' },
];

const NATIVE_EXPORT_TARGETS = EXPORT_TARGETS.filter((t) => t.id !== 'web');

const POLY_OPTIONS = [
    { id: 'low', label: 'Low (< 2k tris)' },
    { id: 'medium', label: 'Medium (2k–12k)' },
    { id: 'high', label: 'High (12k–40k)' },
    { id: 'custom', label: 'Custom budget' },
];

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function loadBrief() {
    return ViewPrefs.get('designBriefDraft', null);
}

function saveBrief(brief) {
    ViewPrefs.set('designBriefDraft', brief);
}

export const DesignIntake = {
    _modal: null,
    _brief: loadBrief(),
    _pendingQuestions: null,

    init() {
        this._modal = document.getElementById('design-intake-modal');
        this.bindOnce();
        this.renderTypePicker();
    },

    bindOnce() {
        if (this._modal?.dataset.bound) return;
        if (this._modal) this._modal.dataset.bound = '1';

        document.getElementById('design-intake-close')?.addEventListener('click', () => this.hide());
        document.getElementById('design-intake-back')?.addEventListener('click', () => {
            const step = document.querySelector('[data-intake-step]:not(.hidden)')?.dataset?.intakeStep;
            if (step === 'production') this.showStep('details');
            else if (step === 'details' || step === 'questions') this.showStep('type');
            else if (step === 'review') this.showStep('production');
        });
        document.getElementById('design-intake-submit')?.addEventListener('click', () => this.submitBrief());
        document.getElementById('design-intake-run')?.addEventListener('click', () => this.runAgent());
        document.getElementById('setup-start-brief')?.addEventListener('click', () => this.show());
        document.getElementById('setup-resume-brief')?.addEventListener('click', () => {
            if (this._brief) this.showStep('details');
            else this.show();
        });

        this._modal?.addEventListener('click', (e) => {
            if (e.target === this._modal) this.hide();
        });
    },

    renderTypePicker() {
        const el = document.getElementById('design-type-grid');
        if (!el) return;
        el.innerHTML = DESIGN_TYPES.map((t) => `
            <button type="button" class="design-type-card" data-design-type="${t.id}">
                <span class="design-type-label">${esc(t.label)}</span>
                <span class="design-type-hint">${esc(t.hint)}</span>
            </button>
        `).join('');
        el.querySelectorAll('[data-design-type]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this._brief = { type: btn.dataset.designType, answers: {} };
                saveBrief(this._brief);
                this.showStep('details');
            });
        });
    },

    showStep(step) {
        document.querySelectorAll('[data-intake-step]').forEach((s) => {
            s.classList.toggle('hidden', s.dataset.intakeStep !== step);
        });
        const back = document.getElementById('design-intake-back');
        const submit = document.getElementById('design-intake-submit');
        const run = document.getElementById('design-intake-run');
        if (back) back.style.display = ['details', 'production', 'questions'].includes(step) ? 'inline-block' : 'none';
        if (submit) submit.style.display = step === 'details' || step === 'production' ? 'inline-block' : 'none';
        if (run) run.style.display = step === 'review' ? 'inline-block' : 'none';
        if (submit) {
            submit.textContent = step === 'production' ? 'REVIEW PLAN' : step === 'details' ? 'NEXT — PLACEMENT & WEATHER' : 'REVIEW BRIEF';
        }

        if (step === 'details') this.renderDetailsForm();
        if (step === 'production') this.renderProductionForm();
        if (step === 'review') this.renderReview();
        if (step === 'questions') this.renderQuestionForm(this._pendingQuestions);
    },

    renderDetailsForm() {
        const body = document.getElementById('design-intake-form');
        const type = DESIGN_TYPES.find((t) => t.id === this._brief?.type);
        if (!body || !type) return;

        const a = this._brief.answers || {};
        body.innerHTML = `
            <p class="design-intake-kicker">Step 2 — ${esc(type.label)}</p>
            <label class="design-field">
                <span>Title</span>
                <input type="text" id="di-title" class="insert-input" placeholder="e.g. Forest clearing spawn" value="${esc(a.title || '')}">
            </label>
            <label class="design-field">
                <span>Description</span>
                <textarea id="di-description" class="insert-input" rows="4" placeholder="What should this look, sound, and feel like?">${esc(a.description || '')}</textarea>
            </label>
            <fieldset class="design-fieldset">
                <legend>Export targets</legend>
                <label class="design-check"><input type="checkbox" name="di-export" value="web" ${(a.exports || ['web']).includes('web') ? 'checked' : ''}> Web (GitHub Pages)</label>
                <details class="design-native-exports" ${(a.exports || []).some((id) => id !== 'web') ? 'open' : ''}>
                    <summary>Native &amp; store targets (optional)</summary>
                    ${NATIVE_EXPORT_TARGETS.map((t) => `
                        <label class="design-check"><input type="checkbox" name="di-export" value="${t.id}" ${(a.exports || ['web']).includes(t.id) ? 'checked' : ''}> ${esc(t.label)}</label>
                    `).join('')}
                </details>
            </fieldset>
            <label class="design-field">
                <span>Poly / mesh budget</span>
                <select id="di-poly" class="insert-input">
                    ${POLY_OPTIONS.map((p) => `<option value="${p.id}" ${a.poly === p.id ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}
                </select>
            </label>
            <label class="design-field" id="di-poly-custom-wrap" style="${a.poly === 'custom' ? '' : 'display:none'}">
                <span>Custom triangle budget</span>
                <input type="number" id="di-poly-custom" class="insert-input" min="100" step="100" value="${esc(a.polyCustom || 8000)}">
            </label>
            <label class="design-field">
                <span>Texture workflow</span>
                <select id="di-texture" class="insert-input">
                    <option value="gimp" ${a.texture === 'gimp' || !a.texture ? 'selected' : ''}>GIMP → textures/ (PBR maps, watch hot-reload)</option>
                    <option value="blender" ${a.texture === 'blender' ? 'selected' : ''}>Blender → import/ GLB (embedded PBR)</option>
                    <option value="both" ${a.texture === 'both' ? 'selected' : ''}>GIMP + Blender (full pipeline)</option>
                </select>
            </label>
            <label class="design-field">
                <span>Texture resolution (master export)</span>
                <select id="di-texres" class="insert-input">
                    <option value="1k" ${a.texRes === '1k' || !a.texRes ? 'selected' : ''}>1K master — small props</option>
                    <option value="2k" ${a.texRes === '2k' ? 'selected' : ''}>2K master — desktop default (recommended)</option>
                    <option value="4k" ${a.texRes === '4k' ? 'selected' : ''}>4K master — hero assets / ultra tier</option>
                </select>
            </label>
            <p class="insert-hint">Watch pipeline auto-downscales _1k tiers + WebP compression for Lite/Mobile — export the master PNG first.</p>
            <label class="design-field">
                <span>Visual style</span>
                <select id="di-style" class="insert-input">
                    <option value="realistic" ${a.style === 'realistic' ? 'selected' : ''}>Realistic PBR (default)</option>
                    <option value="stylized" ${a.style === 'stylized' ? 'selected' : ''}>Stylized / illustrated</option>
                    <option value="retro" ${a.style === 'retro' ? 'selected' : ''}>Retro shader (opt-in)</option>
                </select>
            </label>
            <fieldset class="design-fieldset">
                <legend>Reference sounds</legend>
                <p class="insert-hint">Record or pick clips — agents use these when suggesting audio hooks.</p>
                <div id="di-sound-list" class="design-sound-list"></div>
                <div class="prop-row">
                    <button type="button" id="di-sound-record" class="btn-sm">● RECORD</button>
                    <button type="button" id="di-sound-refresh" class="btn-sm">REFRESH LIBRARY</button>
                </div>
                <input type="file" id="di-sound-upload" accept="audio/*" hidden>
                <button type="button" id="di-sound-upload-btn" class="btn-sm" style="margin-top:6px;">UPLOAD AUDIO</button>
            </fieldset>
            <label class="design-field">
                <span>Extra constraints</span>
                <textarea id="di-constraints" class="insert-input" rows="2" placeholder="e.g. must work on mobile, no external CDN, use existing grid">${esc(a.constraints || '')}</textarea>
            </label>
        `;

        document.getElementById('di-poly')?.addEventListener('change', (e) => {
            const wrap = document.getElementById('di-poly-custom-wrap');
            if (wrap) wrap.style.display = e.target.value === 'custom' ? '' : 'none';
        });

        this.renderSoundPicker();
        document.getElementById('di-sound-refresh')?.addEventListener('click', () => this.renderSoundPicker());
        document.getElementById('di-sound-upload-btn')?.addEventListener('click', () => {
            document.getElementById('di-sound-upload')?.click();
        });
        document.getElementById('di-sound-upload')?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await SoundLibrary.saveClip(file.name.replace(/\.[^.]+$/, ''), file, { context: 'design-brief-upload' });
            this.renderSoundPicker();
        });
        document.getElementById('di-sound-record')?.addEventListener('click', () => this.recordSound());
    },

    async renderSoundPicker() {
        const list = document.getElementById('di-sound-list');
        if (!list) return;
        await SoundLibrary.init?.();
        const clips = SoundLibrary.list?.() || [];
        const selected = new Set(this._brief?.answers?.soundIds || []);
        if (!clips.length) {
            list.innerHTML = '<p class="insert-hint">No sounds yet — record or upload above.</p>';
            return;
        }
        list.innerHTML = clips.map((c) => `
            <label class="design-check">
                <input type="checkbox" class="di-sound-pick" value="${esc(c.id)}" ${selected.has(c.id) ? 'checked' : ''}>
                ${esc(c.name)} <code>${esc(c.id)}</code>
            </label>
        `).join('');
    },

    async recordSound() {
        const btn = document.getElementById('di-sound-record');
        if (!btn) return;
        try {
            if (SoundLibrary.recording) {
                const blob = await SoundLibrary.stopRecording();
                if (blob) {
                    await SoundLibrary.saveClip(`Brief ${Date.now().toString(36).slice(-4)}`, blob, { context: 'design-brief' });
                    this.renderSoundPicker();
                    window.UI?.status?.('Sound saved to library');
                }
                btn.textContent = '● RECORD';
            } else {
                await SoundLibrary.startRecording();
                btn.textContent = '■ STOP';
                window.UI?.status?.('Recording…');
            }
        } catch (e) {
            window.UI?.status?.(e.message || 'Mic permission required');
        }
    },

    renderProductionForm() {
        const body = document.getElementById('design-intake-production');
        if (!body) return;
        const p = { ...defaultProductionAnswers(), ...(this._brief?.answers?.production || {}) };
        const variants = new Set(p.weatherVariants || []);

        body.innerHTML = `
            <p class="design-intake-kicker">Step 3 — Placement, weather & collision</p>
            <p class="insert-hint">Review before codegen — order matters: collision → textures → weather hooks → Compiler.</p>
            <label class="design-field">
                <span>Placement</span>
                <select id="di-placement" class="insert-input">
                    ${PLACEMENT_OPTIONS.map((o) => `<option value="${esc(o.id)}" ${p.placement === o.id ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
                </select>
            </label>
            <label class="design-field">
                <span>Weather exposure</span>
                <select id="di-weather-exp" class="insert-input">
                    ${WEATHER_EXPOSURE_OPTIONS.map((o) => `<option value="${esc(o.id)}" ${p.weatherExposure === o.id ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
                </select>
            </label>
            <fieldset class="design-fieldset">
                <legend>Weather surface variants (exterior)</legend>
                ${WEATHER_VARIANT_OPTIONS.map((o) => `
                    <label class="design-check"><input type="checkbox" class="di-weather-var" value="${esc(o.id)}" ${variants.has(o.id) ? 'checked' : ''}> ${esc(o.label)}</label>
                `).join('')}
            </fieldset>
            <label class="design-field">
                <span>Footstep / rain surfaceType</span>
                <select id="di-surface" class="insert-input">
                    ${SURFACE_TYPE_OPTIONS.map((s) => `<option value="${esc(s)}" ${p.surfaceType === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
                </select>
            </label>
            <label class="design-field">
                <span>Collision</span>
                <select id="di-collision" class="insert-input">
                    ${COLLISION_OPTIONS.map((o) => `<option value="${esc(o.id)}" ${p.collision === o.id ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
                </select>
            </label>
            <label class="design-check"><input type="checkbox" id="di-sheltered" ${p.sheltered ? 'checked' : ''}> zoneSheltered (interior / covered)</label>
            <label class="design-check"><input type="checkbox" id="di-interact" ${p.interact ? 'checked' : ''}> F-key interact + optional sound</label>
            <label class="design-field">
                <span>Atmosphere preset</span>
                <select id="di-atmosphere" class="insert-input">
                    ${ATMOSPHERE_PRESETS.map((o) => `<option value="${esc(o.id)}" ${p.atmospherePreset === o.id ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
                </select>
            </label>
            <label class="design-field">
                <span>Material / shader preset</span>
                <select id="di-shader" class="insert-input">
                    ${SHADER_PRESET_OPTIONS.map((o) => `<option value="${esc(o.id)}" ${p.shaderPreset === o.id ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
                </select>
            </label>
            <label class="design-check"><input type="checkbox" id="di-audio-zone" ${p.audioZone ? 'checked' : ''}> Ambient audio zone (interior reverb)</label>
            <label class="design-field">
                <span>Production notes</span>
                <textarea id="di-prod-notes" class="insert-input" rows="2" placeholder="e.g. wet cobble only on exterior pad; glass kiosk uses wetGlass">${esc(p.notes || '')}</textarea>
            </label>
            <p class="insert-hint"><strong>Pipeline:</strong> ${esc(formatPipelineChecklist(buildProductionPlan(this._brief)))}</p>
        `;

        const syncWeather = () => {
            const placement = document.getElementById('di-placement')?.value;
            const sheltered = placement === 'interior';
            const cb = document.getElementById('di-sheltered');
            if (cb && sheltered) cb.checked = true;
        };
        document.getElementById('di-placement')?.addEventListener('change', syncWeather);
    },

    collectProductionAnswers() {
        const weatherVariants = [...document.querySelectorAll('.di-weather-var:checked')].map((el) => el.value);
        return {
            placement: document.getElementById('di-placement')?.value || 'exterior',
            weatherExposure: document.getElementById('di-weather-exp')?.value || 'full',
            weatherVariants,
            surfaceType: document.getElementById('di-surface')?.value || 'concrete',
            collision: document.getElementById('di-collision')?.value || 'static',
            sheltered: !!document.getElementById('di-sheltered')?.checked,
            wetGlass: weatherVariants.includes('wet_glass'),
            interact: !!document.getElementById('di-interact')?.checked,
            atmospherePreset: document.getElementById('di-atmosphere')?.value || 'day_clear',
            shaderPreset: document.getElementById('di-shader')?.value || 'pbr_default',
            audioZone: !!document.getElementById('di-audio-zone')?.checked,
            notes: document.getElementById('di-prod-notes')?.value?.trim() || '',
        };
    },

    collectAnswers() {
        const exports = [...document.querySelectorAll('input[name="di-export"]:checked')].map((el) => el.value);
        const soundIds = [...document.querySelectorAll('.di-sound-pick:checked')].map((el) => el.value);
        return {
            title: document.getElementById('di-title')?.value?.trim() || '',
            description: document.getElementById('di-description')?.value?.trim() || '',
            exports: exports.length ? exports : ['web'],
            poly: document.getElementById('di-poly')?.value || 'medium',
            polyCustom: document.getElementById('di-poly-custom')?.value || '',
            texture: document.getElementById('di-texture')?.value || 'gimp',
            texRes: document.getElementById('di-texres')?.value || '1k',
            style: document.getElementById('di-style')?.value || 'realistic',
            soundIds,
            constraints: document.getElementById('di-constraints')?.value?.trim() || '',
        };
    },

    submitBrief() {
        if (!this._brief?.type) return;
        const step = document.querySelector('[data-intake-step]:not(.hidden)')?.dataset?.intakeStep;
        if (step === 'details') {
            this._brief.answers = { ...(this._brief.answers || {}), ...this.collectAnswers() };
            saveBrief(this._brief);
            this.showStep('production');
            return;
        }
        if (step === 'production') {
            this._brief.answers = {
                ...(this._brief.answers || {}),
                production: this.collectProductionAnswers(),
            };
            saveBrief(this._brief);
            this.showStep('review');
            return;
        }
        this._brief.answers = this.collectAnswers();
        saveBrief(this._brief);
        this.showStep('review');
    },

    renderReview() {
        const el = document.getElementById('design-intake-review');
        const type = DESIGN_TYPES.find((t) => t.id === this._brief?.type);
        const a = this._brief?.answers || {};
        const plan = buildProductionPlan(this._brief);
        if (!el || !type) return;
        el.innerHTML = `
            <p class="design-intake-kicker">Review — ${esc(type.label)}</p>
            <dl class="design-review-dl">
                <dt>Title</dt><dd>${esc(a.title || '—')}</dd>
                <dt>Description</dt><dd>${esc(a.description || '—')}</dd>
                <dt>Placement</dt><dd>${esc(plan.placementLabel)}</dd>
                <dt>Weather</dt><dd>${esc(plan.weatherExposureLabel)}${plan.weatherVariants.length ? ` · ${esc(plan.weatherVariants.join(', '))}` : ''}</dd>
                <dt>Surface / collision</dt><dd>${esc(plan.surfaceType)} · ${esc(plan.collisionLabel)}</dd>
                <dt>Atmosphere / material</dt><dd>${esc(plan.atmospherePreset)} · ${esc(plan.shaderPreset)}</dd>
                <dt>Export</dt><dd>${esc((a.exports || []).join(', '))}</dd>
                <dt>Poly</dt><dd>${esc(a.poly)}${a.poly === 'custom' ? ` (${a.polyCustom} tris)` : ''}</dd>
                <dt>Textures</dt><dd>${esc(a.texture)} · ${esc(a.texRes || '2k')} master · ${esc(a.style)}</dd>
                <dt>Pipeline</dt><dd>${esc(formatPipelineChecklist(plan))}</dd>
                <dt>Sounds</dt><dd>${(a.soundIds || []).length ? esc(a.soundIds.join(', ')) : 'none selected'}</dd>
                <dt>Constraints</dt><dd>${esc(a.constraints || '—')}</dd>
                ${plan.notes ? `<dt>Prod notes</dt><dd>${esc(plan.notes)}</dd>` : ''}
            </dl>
            <p class="insert-hint">Agent follows pipeline order — may ask one follow-up before Compiler codegen.</p>
        `;
    },

    buildPrompt() {
        const type = this._brief?.type || 'prop';
        const a = this._brief?.answers || {};
        const typeLabel = DESIGN_TYPES.find((t) => t.id === type)?.label || type;
        const planBlock = buildProductionReviewPrompt(buildProductionPlan(this._brief));
        return `DESIGN BRIEF — ${typeLabel}
Title: ${a.title || 'Untitled'}
Description: ${a.description || '(none)'}
Export targets: ${(a.exports || ['web']).join(', ')}
Poly budget: ${a.poly}${a.poly === 'custom' ? ` (${a.polyCustom} tris)` : ''}
Texture workflow: ${a.texture} · ${a.texRes || '2k'} master (${a.style} style)
Reference sound IDs: ${(a.soundIds || []).join(', ') || 'none'}
Constraints: ${a.constraints || 'none'}
${a.followUp && Object.keys(a.followUp).length ? `Follow-up answers: ${JSON.stringify(a.followUp)}` : ''}

${planBlock}

If critical details are missing, respond ONLY with a JSON block (no markdown prose):
\`\`\`json
{"intake_questions":[{"id":"...","label":"...","type":"text|select|number|textarea|sound_pick","options":["..."],"required":true}]}
\`\`\`
Otherwise return executable Threshold JavaScript (IIFE) for Compiler — wire userData per production plan BEFORE UI.status.`;
    },

    parseIntakeQuestions(text) {
        const raw = stripCodeFences(text);
        try {
            const j = JSON.parse(raw);
            if (j?.intake_questions?.length) return j.intake_questions;
        } catch { /* continue */ }
        const m = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/\{[\s\S]*"intake_questions"[\s\S]*\}/);
        if (m) {
            try {
                const j = JSON.parse(m[1] || m[0]);
                if (j?.intake_questions?.length) return j.intake_questions;
            } catch { /* ignore */ }
        }
        return null;
    },

    renderQuestionForm(questions) {
        const body = document.getElementById('design-intake-questions');
        if (!body || !questions?.length) return;
        body.innerHTML = `
            <p class="design-intake-kicker">Agent needs a few details</p>
            ${questions.map((q) => this.renderQuestionField(q)).join('')}
        `;
    },

    renderQuestionField(q) {
        const id = `diq-${q.id}`;
        if (q.type === 'select' && q.options?.length) {
            return `<label class="design-field"><span>${esc(q.label)}</span>
                <select id="${id}" class="insert-input" data-qid="${esc(q.id)}">
                    ${q.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
                </select></label>`;
        }
        if (q.type === 'textarea') {
            return `<label class="design-field"><span>${esc(q.label)}</span>
                <textarea id="${id}" class="insert-input" rows="3" data-qid="${esc(q.id)}"></textarea></label>`;
        }
        return `<label class="design-field"><span>${esc(q.label)}</span>
            <input type="${q.type === 'number' ? 'number' : 'text'}" id="${id}" class="insert-input" data-qid="${esc(q.id)}"></label>`;
    },

    collectQuestionAnswers() {
        const out = {};
        document.querySelectorAll('[data-qid]').forEach((el) => {
            out[el.dataset.qid] = el.value?.trim?.() ?? el.value;
        });
        return out;
    },

    async runAgent() {
        const status = document.getElementById('design-intake-status');
        const gate = validateDesignBrief(this._brief);
        if (!gate.canGenerate) {
            const msg = gate.errors.join(' — ');
            if (status) status.textContent = msg;
            window.UI?.status?.(`Blocked: ${gate.errors[0]}`);
            if (!this._brief?.answers?.production) this.showStep('production');
            return;
        }
        if (status) status.textContent = 'Contacting agent…';
        try {
            if (this._pendingQuestions) {
                const followUp = this.collectQuestionAnswers();
                this._brief.answers = { ...this._brief.answers, followUp };
                saveBrief(this._brief);
            }
            const prompt = this.buildPrompt();
            const result = await AgentRouter.runTask('prompter_generate', {
                idea: prompt,
                systemOverride: buildDesignAgentSystemPrompt(),
            });

            const questions = this.parseIntakeQuestions(result.code || result.text || '');
            if (questions) {
                this._pendingQuestions = questions;
                this.showStep('questions');
                if (status) status.textContent = 'Answer the questions below, then RUN AGENT again.';
                document.getElementById('design-intake-run').textContent = 'SUBMIT ANSWERS → GENERATE';
                return;
            }

            this._pendingQuestions = null;
            const code = stripCodeFences(result.code || result.text || '');
            const out = document.getElementById('comp-output');
            const inp = document.getElementById('comp-input');
            if (inp) inp.value = code;
            if (out) out.value = code;
            saveBrief(this._brief);
            this.hide();
            window.SessionUi?.setShowAllTools?.(true, { silent: true });
            document.querySelector('[data-target="view-compiler"]')?.click();
            window.UI?.status?.(`Design generated (${result.provider}/${result.model}) — review in Compiler`);
            if (status) status.textContent = '';
            document.getElementById('design-intake-run').textContent = 'RUN AGENT → GENERATE';
        } catch (e) {
            if (status) status.textContent = e.message || 'Agent failed';
            window.UI?.status?.(e.message || 'Design agent failed — check SETUP keys');
        }
    },

    show() {
        if (!this._brief) this.showStep('type');
        else this.showStep('details');
        this._modal?.classList.add('open');
        document.body.classList.add('design-intake-open');
    },

    hide() {
        this._modal?.classList.remove('open');
        document.body.classList.remove('design-intake-open');
    },
};

window.DesignIntake = DesignIntake;