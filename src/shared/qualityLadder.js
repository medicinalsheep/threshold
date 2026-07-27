/**
 * Quality re-add ladder (Phase 4 / 10.15.4).
 * Terminal void stays default — layers are opt-in via SCENE / INSERT / templates.
 *
 * 4a Lighting · 4b AI station · 4c Materials · 4d Physics kit · 4e Workspace pad · 4f Agent cookbook
 */
import { ViewPrefs } from './viewPrefs.js';

/** @typedef {'terminal'|'day'|'soft'|'night'} LightingPresetId */

export const LIGHTING_PRESETS = {
    terminal: {
        id: 'terminal',
        label: 'Terminal',
        timeOfDay: 22,
        fog: 0.018,
        atmosphere: false,
        sunIntensity: 0.85,
        sunColor: 0xc8d4e0,
        hemi: false,
        groundHex: 0x0c0e10,
        hint: 'Dark grid baseline — high contrast, low thrash',
    },
    day: {
        id: 'day',
        label: 'Day',
        timeOfDay: 14,
        fog: 0.012,
        atmosphere: true,
        sunIntensity: null, // driven by setTimeOfDay
        sunColor: null,
        hemi: true,
        groundHex: null,
        hint: 'Daylight PBR · hemi + sun from time of day',
    },
    soft: {
        id: 'soft',
        label: 'Soft',
        timeOfDay: 17.5,
        fog: 0.02,
        atmosphere: true,
        sunIntensity: 0.95,
        sunColor: 0xffd4a8,
        hemi: true,
        hemiSky: 0xffe8d0,
        hemiGround: 0x2a2418,
        hemiIntensity: 0.42,
        groundHex: null,
        hint: 'Warm evening fill — gentle for portraits',
    },
    night: {
        id: 'night',
        label: 'Night',
        timeOfDay: 0.5,
        fog: 0.028,
        atmosphere: true,
        sunIntensity: 0.12,
        sunColor: 0x8899bb,
        hemi: true,
        hemiSky: 0x1a2840,
        hemiGround: 0x0a0c10,
        hemiIntensity: 0.28,
        groundHex: null,
        hint: 'Moonlit · keep emissives readable',
    },
};

const LADDER_STEPS = [
    { id: 'lighting', letter: '4a', title: 'Lighting', where: 'SCENE → Light' },
    { id: 'ai', letter: '4b', title: 'AI Build Station', where: 'INSERT → Quality' },
    { id: 'materials', letter: '4c', title: 'Materials', where: 'INSERT → Quality' },
    { id: 'physics', letter: '4d', title: 'Physics kit', where: 'INSERT → Quality' },
    { id: 'workspace', letter: '4e', title: 'Workspace pad', where: 'Lobby template / Quality' },
    { id: 'cookbook', letter: '4f', title: 'Agent prop recipe', where: 'PromptGen cookbook' },
];

function State() {
    return window.State;
}

function syncEnvSliders(preset) {
    const timeEl = document.getElementById('env-time');
    const fogEl = document.getElementById('env-fog');
    if (timeEl) timeEl.value = String(preset.timeOfDay);
    if (fogEl) fogEl.value = String(preset.fog);
    const atmoBtn = document.getElementById('env-atmo-toggle');
    if (atmoBtn) {
        atmoBtn.textContent = preset.atmosphere ? 'ON' : 'OFF';
        atmoBtn.classList.toggle('active', !!preset.atmosphere);
    }
}

/**
 * Apply a named lighting look without thrashing floor/HILOD.
 * Uses Environment APIs only — no pad rebuild, no texture swaps.
 */
export function applyLightingPreset(id, opts = {}) {
    const preset = LIGHTING_PRESETS[id] || LIGHTING_PRESETS.terminal;
    const Env = window.Environment;
    const S = State();
    if (!Env || !S) return false;

    S.env = S.env || {};
    S.env.lightingPreset = preset.id;
    S.env.timeOfDay = preset.timeOfDay;
    S.env.fogDensity = preset.fog;
    S.env.atmosphereEnabled = !!preset.atmosphere;

    // Atmosphere / hemi first so setTimeOfDay can tint sky when on
    if (preset.atmosphere) {
        if (!Env.hemiLight && window.THREE) {
            const THREE = window.THREE;
            Env.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d1b0e, 0.55);
            window.Engine?.scene?.add?.(Env.hemiLight);
        }
        if (Env.hemiLight) {
            Env.hemiLight.visible = true;
            if (preset.hemiSky != null) Env.hemiLight.color?.setHex?.(preset.hemiSky);
            if (preset.hemiGround != null) Env.hemiLight.groundColor?.setHex?.(preset.hemiGround);
            if (preset.hemiIntensity != null) Env.hemiLight.intensity = preset.hemiIntensity;
            else Env.hemiLight.intensity = 0.55;
        }
    } else if (Env.hemiLight) {
        Env.hemiLight.visible = false;
    }

    Env.setTimeOfDay?.(preset.timeOfDay);
    Env.setFog?.(preset.fog);

    if (preset.sunIntensity != null && Env.sunLight) {
        Env.sunLight.intensity = preset.sunIntensity;
        if (preset.sunColor != null) Env.sunLight.color?.setHex?.(preset.sunColor);
    }

    // Optional ground tint only when still on simple terminal ground (no pad thrash)
    if (preset.groundHex != null && S.enterStyle !== 'workspace') {
        const plane = window.Engine?.groundPlane;
        if (plane?.material?.color && !plane.userData?.isWorkspacePad) {
            plane.material.color.setHex(preset.groundHex);
            plane.material.needsUpdate = true;
        }
    }

    if (!preset.atmosphere) {
        window.Engine?.updateBackground?.();
    }

    syncEnvSliders(preset);
    ViewPrefs.set('lightingPreset', preset.id);
    window.NegativeLod?.notifyEnvChange?.();

    if (!opts.silent) {
        window.UI?.status?.(`Lighting: ${preset.label} — ${preset.hint}`);
    }
    // Deferred: QualityLadder may still be initializing
    queueMicrotask(() => window.QualityLadder?.syncUi?.());
    return true;
}

export function getLightingPresetId() {
    return State()?.env?.lightingPreset
        || ViewPrefs.get('lightingPreset', null)
        || (State()?.enterStyle === 'workspace' ? 'day' : 'terminal');
}

export async function addPhysicsKit() {
    if (!window.StarterKit?.spawnStarterKit) {
        window.UI?.status?.('Physics kit unavailable');
        return false;
    }
    await window.StarterKit.spawnStarterKit({ force: true });
    const S = State();
    if (S) S.qualityLadder = { ...(S.qualityLadder || {}), physics: true };
    window.UI?.status?.('Physics kit added — PLAY to push · EDIT for mass/friction');
    QualityLadder.syncUi();
    return true;
}

export async function addAiStation() {
    const S = State();
    if (S?.objects?.some((o) => o.userData?.id === 'starter_ai_terminal' || o.userData?.isAiTerminal)) {
        window.UI?.status?.('AI Build Station already in scene');
        return false;
    }
    const { spawnAiTerminal } = await import('./aiTerminal.js');
    spawnAiTerminal({
        id: 'starter_ai_terminal',
        pos: { x: -2.8, y: 0, z: 2.4 },
        rotY: 0.35,
        showcase: false,
        name: 'AI Build Station',
        interactLabel: 'AI Build Station',
        interactHint: 'Connect agents — Grok · Ollama · build assistant',
    });
    if (S) S.qualityLadder = { ...(S.qualityLadder || {}), ai: true };
    window.UI?.status?.('AI Build Station placed — F to interact');
    QualityLadder.syncUi();
    return true;
}

export async function addMaterialExamples(mappedOnly = false) {
    if (mappedOnly) {
        document.getElementById('insert-material-mapped')?.click();
    } else {
        document.getElementById('insert-material-examples')?.click();
    }
    const S = State();
    if (S) S.qualityLadder = { ...(S.qualityLadder || {}), materials: true };
    QualityLadder.syncUi();
    return true;
}

export async function applyWorkspacePad() {
    const S = State();
    if (!S || !window.Environment?.useWorkspacePad) {
        window.UI?.status?.('Workspace pad unavailable');
        return false;
    }
    const { FLOOR_HALF } = await import('../engine/environment.js');
    await window.Environment.useWorkspacePad(FLOOR_HALF);
    S.enterStyle = 'workspace';
    S.qualityLadder = { ...(S.qualityLadder || {}), workspace: true };
    // Soft day lighting pairs with pad (no thrash path C)
    applyLightingPreset('day', { silent: true });
    window.UI?.status?.('Workspace pad on — Day lighting · pad PBR (terminal grid was baseline)');
    QualityLadder.syncUi();
    return true;
}

export function ladderStatus() {
    const S = State();
    const objs = S?.objects || [];
    return {
        lighting: getLightingPresetId(),
        ai: objs.some((o) => o.userData?.isAiTerminal || o.userData?.id === 'starter_ai_terminal'),
        materials: objs.some((o) => o.userData?.isMaterialExample || o.userData?.materialPreset),
        physics: !!S?.starterKitSpawned || objs.some((o) => o.userData?.isStarterKit || o.userData?.isSimSample),
        workspace: S?.enterStyle === 'workspace',
        cookbook: true, // always available in PromptGen
    };
}

export const QualityLadder = {
    steps: LADDER_STEPS,
    lightingPresets: LIGHTING_PRESETS,
    applyLightingPreset(id, opts) {
        return applyLightingPreset(id, opts);
    },
    getLightingPresetId,
    addPhysicsKit,
    addAiStation,
    addMaterialExamples,
    applyWorkspacePad,
    status: ladderStatus,

    initUi() {
        if (this._uiBound) return;
        this._uiBound = true;
        // SCENE + INSERT lighting chips
        document.querySelectorAll('[data-light-preset]').forEach((btn) => {
            btn.addEventListener('click', () => {
                applyLightingPreset(btn.dataset.lightPreset);
            });
        });

        document.getElementById('ql-add-physics')?.addEventListener('click', () => {
            void addPhysicsKit();
            document.getElementById('insert-modal')?.classList.remove('open');
        });
        document.getElementById('ql-add-ai')?.addEventListener('click', () => {
            void addAiStation();
            document.getElementById('insert-modal')?.classList.remove('open');
        });
        document.getElementById('ql-add-materials')?.addEventListener('click', () => {
            void addMaterialExamples(false);
        });
        document.getElementById('ql-add-materials-mapped')?.addEventListener('click', () => {
            void addMaterialExamples(true);
        });
        document.getElementById('ql-add-workspace')?.addEventListener('click', () => {
            void applyWorkspacePad();
            document.getElementById('insert-modal')?.classList.remove('open');
        });
        document.getElementById('ql-open-cookbook')?.addEventListener('click', () => {
            document.querySelector('[data-target="view-prompter"]')?.click();
            document.getElementById('insert-modal')?.classList.remove('open');
            window.UI?.status?.('PromptGen cookbook — use “Quality PBR prop” recipe');
        });

        this.syncUi();
    },

    syncUi() {
        const st = ladderStatus();
        const activeLight = st.lighting;
        document.querySelectorAll('[data-light-preset]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.lightPreset === activeLight);
        });
        const badge = document.getElementById('ql-status');
        if (badge) {
            const bits = [];
            bits.push(activeLight);
            if (st.physics) bits.push('kit');
            if (st.ai) bits.push('AI');
            if (st.workspace) bits.push('pad');
            badge.textContent = bits.join(' · ') || 'terminal';
        }
        const list = document.getElementById('ql-steps-list');
        if (list) {
            list.innerHTML = LADDER_STEPS.map((s) => {
                let done = false;
                if (s.id === 'lighting') done = activeLight && activeLight !== 'terminal';
                else if (s.id === 'ai') done = st.ai;
                else if (s.id === 'materials') done = st.materials;
                else if (s.id === 'physics') done = st.physics;
                else if (s.id === 'workspace') done = st.workspace;
                else if (s.id === 'cookbook') done = false;
                return `<li class="ql-step${done ? ' done' : ''}"><span class="ql-letter">${s.letter}</span> ${s.title} <em>${s.where}</em></li>`;
            }).join('');
        }
    },
};

window.QualityLadder = QualityLadder;
window.LightingPresets = LIGHTING_PRESETS;
