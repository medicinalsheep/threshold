/**
 * Multi-step build job — runs asset/scene steps sequentially with optional time limit.
 */

import { AgentRouter } from './agentRouter.js';
import { sanitizeSceneCode } from './codeSanitizer.js';
import { getSceneApiPrompt } from './sceneApiPrompt.js';
import { stripCodeFences } from './agentPrompts.js';
import { buildProductionPlan, buildProductionReviewPrompt } from './assetProductionPlan.js';

const PREFS_KEY = 'buildJobPrefs';

const STEP_PLANS = {
    world: [
        { id: 'layout', label: 'Floor & layout', tier: 'large', taskId: 'prompter_generate' },
        { id: 'collision', label: 'Collision & surfaceType', tier: 'medium', taskId: 'dev_suggest' },
        { id: 'textures', label: 'Texture paths & GIMP names', tier: 'medium', taskId: 'prompt_snippet' },
        { id: 'weather', label: 'Weather hooks (wet/dust/snow)', tier: 'medium', taskId: 'dev_suggest' },
        { id: 'atmosphere', label: 'Lighting & atmosphere', tier: 'medium', taskId: 'dev_suggest' },
        { id: 'shaders', label: 'Material presets', tier: 'medium', taskId: 'dev_suggest' },
        { id: 'props', label: 'Props & landmarks', tier: 'medium', taskId: 'dev_suggest' },
    ],
    character: [
        { id: 'placeholder', label: 'Character placeholder', tier: 'medium', taskId: 'dev_suggest' },
        { id: 'detail', label: 'Appearance & metadata', tier: 'medium', taskId: 'dev_patch' },
    ],
    prop: [
        { id: 'collision', label: 'Collision & surfaceType', tier: 'medium', taskId: 'dev_suggest' },
        { id: 'prop', label: 'Prop mesh', tier: 'medium', taskId: 'dev_suggest' },
        { id: 'textures', label: 'PBR manifest slots', tier: 'medium', taskId: 'prompt_snippet' },
        { id: 'weather', label: 'Weather / interact hooks', tier: 'medium', taskId: 'dev_suggest' },
        { id: 'shaders', label: 'Material preset', tier: 'medium', taskId: 'dev_suggest' },
    ],
    animation: [
        { id: 'motion', label: 'Motion / rotation hooks', tier: 'medium', taskId: 'dev_suggest' },
    ],
    texture: [
        { id: 'materials', label: 'Material hints (GIMP paths)', tier: 'medium', taskId: 'prompt_snippet' },
    ],
    sound: [
        { id: 'audio', label: 'Audio metadata', tier: 'medium', taskId: 'prompt_snippet' },
    ],
};

function loadPrefs() {
    try {
        return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    } catch {
        return {};
    }
}

function savePrefs(patch) {
    const next = { ...loadPrefs(), ...patch };
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    return next;
}

function productionBlock(ctx) {
    if (!ctx.placement && !ctx.weatherExposure) return '';
    const plan = buildProductionPlan({
        type: ctx.taskType || 'world',
        answers: {
            title: ctx.title,
            description: ctx.summary,
            texRes: ctx.textureRes,
            texture: ctx.workflow,
            poly: ctx.polyBudget,
            style: ctx.style,
            production: {
                placement: ctx.placement,
                weatherExposure: ctx.weatherExposure,
                weatherVariants: ctx.weatherVariants || [],
                surfaceType: ctx.surfaceType,
                collision: ctx.collision,
                sheltered: ctx.sheltered,
                atmospherePreset: ctx.atmospherePreset,
                shaderPreset: ctx.shaderPreset,
                audioZone: ctx.audioZone,
            },
        },
    });
    return `\n${buildProductionReviewPrompt(plan)}\n`;
}

function stepPrompt(step, ctx, priorCode) {
    const base = `BUILD STEP: ${step.label}
Type: ${ctx.taskType || 'world'}
Title: ${ctx.title || 'Untitled'}
Summary: ${ctx.summary || ''}
Style: ${ctx.style || 'realistic PBR default'}
${productionBlock(ctx)}
${getSceneApiPrompt()}

${priorCode ? `PRIOR CODE (extend — do not duplicate objects):\n\`\`\`js\n${priorCode.slice(-1200)}\n\`\`\`` : ''}

Output ONLY new JavaScript to append inside the same IIFE pattern. Use World.createObject. No World.clearWorld().`;

    if (step.id === 'layout') {
        return `${base}\nFocus: floor/platform, spatial bounds, locked ground. 3–8 objects max.`;
    }
    if (step.id === 'collision') {
        return `${base}\nFocus: userData.surfaceType, locked static floors, hasPhysics/mass. No new decorative meshes.`;
    }
    if (step.id === 'textures') {
        return `${base}\nFocus: comment // TEXTURE: objectName → textures/slug_albedo.png — names must match userData.name. No mesh spam.`;
    }
    if (step.id === 'weather') {
        return `${base}\nFocus: exterior surfaceType for rain wetness; interior zoneSheltered; wetGlass on glass. No clearWorld.`;
    }
    if (step.id === 'props') {
        return `${base}\nFocus: scatter interactive props, beacons, crates. Build on existing floor.`;
    }
    if (step.id === 'atmosphere') {
        return `${base}\nFocus: Engine.setRenderMode(4), Environment.setTimeOfDay, Environment.setFog. userData.audioZone on interior volumes. No mesh spam.`;
    }
    if (step.id === 'shaders') {
        return `${base}\nFocus: MaterialPresets.applyMaterialPreset per hero mesh; userData.materialPreset id. No CanvasTexture.`;
    }
    return base;
}

function extractIifeBody(code) {
    const m = String(code || '').match(/\(function\s*\(\)\s*\{([\s\S]*)\}\)\s*\(\s*\)/);
    return m ? m[1].trim() : String(code || '').trim();
}

function wrapIife(body) {
    const inner = body.replace(/^\s*try\s*\{/, '').replace(/\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*$/, '').trim();
    return `(function() {\n  try {\n    ${inner}\n  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }\n})();`;
}

function mergeStepCode(accumulated, newRaw) {
    const chunk = sanitizeSceneCode(stripCodeFences(newRaw));
    if (!chunk) return accumulated;
    if (!accumulated) return chunk;
    const merged = `${extractIifeBody(accumulated)}\n\n    // --- build step ---\n    ${extractIifeBody(chunk)}`;
    return wrapIife(merged);
}

export const BuildJob = {
    _running: false,
    _abort: false,
    _onProgress: null,

    getPrefs() {
        return {
            multiStep: true,
            timeLimitMin: 0,
            ...loadPrefs(),
        };
    },

    setPrefs(patch) {
        return savePrefs(patch);
    },

    planSteps(taskType) {
        return [...(STEP_PLANS[taskType] || STEP_PLANS.world)];
    },

    isRunning() {
        return this._running;
    },

    stop() {
        this._abort = true;
    },

    onProgress(fn) {
        this._onProgress = fn;
    },

    emit(event) {
        this._onProgress?.(event);
        window.dispatchEvent(new CustomEvent('build-job-progress', { detail: event }));
    },

    async run(ctx, options = {}) {
        if (this._running) throw new Error('Build job already running');
        this._running = true;
        this._abort = false;

        const prefs = { ...this.getPrefs(), ...options.prefs };
        const steps = options.steps || this.planSteps(ctx.taskType || 'world');
        const deadline = prefs.timeLimitMin > 0
            ? Date.now() + prefs.timeLimitMin * 60 * 1000
            : null;

        let accumulated = '';
        const log = [];

        try {
            for (let i = 0; i < steps.length; i += 1) {
                if (this._abort) {
                    log.push({ step: steps[i].id, status: 'stopped' });
                    this.emit({ type: 'stopped', step: i, total: steps.length, log });
                    break;
                }
                if (deadline && Date.now() > deadline) {
                    log.push({ step: steps[i].id, status: 'timeout' });
                    this.emit({ type: 'timeout', step: i, total: steps.length, log });
                    break;
                }

                const step = steps[i];
                this.emit({
                    type: 'step-start',
                    step: i,
                    total: steps.length,
                    label: step.label,
                    log,
                });

                const prompt = stepPrompt(step, ctx, accumulated);
                const timeoutMs = step.tier === 'large' ? 300000 : 180000;

                const result = await AgentRouter.runTask(step.taskId, {
                    idea: prompt,
                    systemOverride: `Threshold build agent — step ${i + 1}/${steps.length}. ${getSceneApiPrompt()}`,
                }, { timeoutMs });

                const chunk = result.code || result.text || '';
                accumulated = mergeStepCode(accumulated, chunk);
                log.push({
                    step: step.id,
                    status: 'done',
                    provider: result.provider,
                    model: result.model,
                    ms: result.ms,
                });

                this.emit({
                    type: 'step-done',
                    step: i,
                    total: steps.length,
                    label: step.label,
                    code: accumulated,
                    log,
                });
            }

            const finalCode = sanitizeSceneCode(accumulated);
            this.emit({ type: 'complete', code: finalCode, log });
            return { code: finalCode, log, stopped: this._abort };
        } finally {
            this._running = false;
            this._abort = false;
        }
    },
};

window.BuildJob = BuildJob;