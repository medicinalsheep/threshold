import { ViewPrefs } from './viewPrefs.js';
import { SceneDock } from './sceneDock.js';
import { GraphicsPrompt } from './graphicsPrompt.js';

function modeLabel(mode) {
    return mode === 'build' ? 'BUILD (EDIT)' : 'PLAY';
}

function resolveHighlight(step, sessionMode) {
    if (!step.highlight) return null;
    return typeof step.highlight === 'function' ? step.highlight(sessionMode) : step.highlight;
}

const STEPS = [
    {
        title: 'Corner hubs',
        body: 'Fullscreen with <strong>L-shaped toggles</strong> in each corner. '
            + '<strong>Top-left:</strong> PLAY/EDIT · AI agent · session link. '
            + '<strong>Bottom-left:</strong> touch · walk/fly · fullscreen. '
            + 'Menus pop open only when you tap a toggle.',
        highlight: '#hub-mode-toggle',
        actions: [
            {
                label: 'Open agent portal',
                run() {
                    window.AgentPortal?.show?.();
                },
            },
        ],
    },
    {
        title: 'EDIT → build',
        body: (mode) => (mode === 'build'
            ? 'You are in <strong>EDIT</strong>. <strong>Top-right TOOLS</strong> opens Compiler, PromptGen, insert, and export. '
                + '<strong>Bottom-right SCENE</strong> opens inspect, environment, and agents.'
            : 'Tap <strong>PLAY</strong> (top-left) to switch to <strong>EDIT</strong> — physics pauses so you can build. '
                + 'Then use <strong>TOOLS</strong> (top-right) for Compiler and PromptGen.'),
        highlight: (m) => (m === 'build' ? '#hub-tools-toggle' : '#hub-mode-toggle'),
        onEnter(sessionMode) {
            if (sessionMode === 'build') window.CornerHub?.pulseHub?.('tools');
        },
        actions: [
            {
                label: 'Open TOOLS',
                run() {
                    document.getElementById('hub-tools-toggle')?.click();
                },
            },
        ],
    },
    {
        title: 'PLAY → test',
        body: (mode) => (mode === 'play'
            ? 'You are in <strong>PLAY</strong> — minimal UI, touch toggle stays on <strong>bottom-left</strong>. '
                + '<strong>SCENE/SKIN</strong> (bottom-right) for your avatar. Walk to the AI Build Station and press <strong>F</strong>.'
            : 'Tap <strong>PLAY</strong> (top-left) to run physics and test. Touch controls toggle on bottom-left. '
                + '<strong>LINK</strong> (top-left) shares your session.'),
        highlight: (m) => (m === 'play' ? '#hub-touch-quick' : '#hub-mode-toggle'),
        actions: [
            {
                label: 'Full tutorial',
                run() {
                    window.Walkthrough?.startFull?.(0);
                },
            },
        ],
    },
];

const FULL_STEPS = [
    {
        title: 'Welcome to Threshold',
        body: 'A game-creation sandbox with a polished starter site, survival systems, multiplayer sync, and export pipeline. '
            + 'This full tour covers build tools, textures, agents, playtest, and ship.',
    },
    {
        title: 'PLAY vs BUILD',
        body: '<strong>BUILD</strong> (paused) unlocks insert, Compiler, inspector, and scene edits. '
            + '<strong>PLAY</strong> runs physics, NPC patrol, weather, and survival vitals.',
        highlight: '#sim-mode-badge',
    },
    {
        title: 'Floating panels',
        body: 'Drag <strong>TOOLS</strong> and <strong>SCENE</strong> anywhere. Tap <strong>LOCK</strong> when layout feels right.',
        highlight: '#engine-toolbar',
    },
    {
        title: 'Build with PromptGen',
        body: 'Describe features in PromptGen — attach live scene context. EXAMPLES sidebar has safe extend prompts.',
        actions: [
            {
                label: 'Open PromptGen',
                run() {
                    document.querySelector('[data-target="view-prompter"]')?.click();
                },
            },
        ],
    },
    {
        title: 'Textures & 3D models',
        body: 'Select mesh → <strong>SCENE → Inspect → Texture</strong> for PBR maps or GIMP sync. '
            + '<strong>+ → GLTF</strong> for Blender exports.',
        highlight: '#inspector',
    },
    {
        title: 'AI-assisted creation',
        body: '<strong>Agent Portal</strong> at the AI Build Station (F) · tiered Grok/Ollama routing · '
            + 'NPC personas in <strong>SETUP</strong> advanced section.',
        actions: [
            {
                label: 'Open portal',
                run() {
                    window.AgentPortal?.show?.();
                },
            },
        ],
    },
    {
        title: 'Survival & interact',
        body: 'In PLAY: vitals HUD (V toggle) · coffee/creek/bench on site · rain affects stress. '
            + 'Wire your own props with <code>interactAction: \'survival\'</code>.',
    },
    {
        title: 'Playtest',
        body: 'Toggle <strong>PLAY</strong> · <strong>WASD</strong> move · <strong>F</strong> interact · export preflight checks your world.',
        highlight: '#btn-host-pause',
    },
    {
        title: 'Save & ship',
        body: '<strong>EXPORT &amp; PLAY</strong> for quick ship · <strong>MORE → EXPORT</strong> for store wizard.',
        highlight: '#btn-toolbar-more',
    },
];

export const Walkthrough = {
    step: 0,
    root: null,
    active: false,
    _mode: 'quick',
    _sessionMode: 'play',

    _steps() {
        return this._mode === 'full' ? FULL_STEPS : STEPS;
    },

    startIfNeeded(sessionMode = null) {
        if (ViewPrefs.get('walkthroughDone', false)) {
            window.ActionHints?.onSessionReady?.();
            return;
        }
        const mode = sessionMode || window.GuidedSession?.getSavedMode?.() || 'play';
        this.start(0, 'quick', mode);
    },

    restart() {
        ViewPrefs.set('walkthroughDone', false);
        ViewPrefs.set('welcomeSeen', false);
        const mode = window.GuidedSession?.getSavedMode?.() || 'play';
        this.start(0, 'quick', mode);
    },

    startFull(fromStep = 0) {
        const mode = window.GuidedSession?.getSavedMode?.() || 'play';
        this.start(fromStep, 'full', mode);
    },

    start(fromStep = 0, mode = 'quick', sessionMode = 'play') {
        this.root = document.getElementById('engine-walkthrough');
        if (!this.root) return;

        window.GuidedSession?.hide?.();

        this._mode = mode;
        this._sessionMode = sessionMode === 'build' ? 'build' : 'play';
        const steps = this._steps();
        this.step = Math.max(0, Math.min(fromStep, steps.length - 1));
        this.active = true;
        this.root.classList.remove('hidden');
        this.bindOnce();
        this.render();
    },

    bindOnce() {
        if (this.root.dataset.bound) return;
        this.root.dataset.bound = '1';

        document.getElementById('walkthrough-skip')?.addEventListener('click', () => this.finish());
        document.getElementById('walkthrough-back')?.addEventListener('click', () => this.prev());
        document.getElementById('walkthrough-next')?.addEventListener('click', () => this.next());
        document.getElementById('walkthrough-action')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-walk-action]');
            if (!btn) return;
            const idx = parseInt(btn.dataset.walkAction, 10);
            const step = this._steps()[this.step];
            const actions = step.actions || (step.action ? [step.action] : []);
            actions[idx]?.run?.();
        });
    },

    _clearStepEffects() {
        document.querySelectorAll('.walkthrough-highlight').forEach((el) => el.classList.remove('walkthrough-highlight'));
        document.getElementById('survival-needs-hud')?.classList.remove('tour-pulse');
    },

    render() {
        const steps = this._steps();
        const step = steps[this.step];
        const total = steps.length;

        this._clearStepEffects();

        document.getElementById('walkthrough-step-label').textContent =
            `${this.step + 1} / ${total}${this._mode === 'full' ? ' · FULL' : ''}`;
        document.getElementById('walkthrough-title').textContent = step.title;

        const body = typeof step.body === 'function' ? step.body(this._sessionMode) : step.body;
        document.getElementById('walkthrough-body').innerHTML = body;

        const backBtn = document.getElementById('walkthrough-back');
        const nextBtn = document.getElementById('walkthrough-next');
        if (backBtn) backBtn.disabled = this.step === 0;
        if (nextBtn) nextBtn.textContent = this.step === total - 1 ? 'DONE' : 'NEXT';

        const actionEl = document.getElementById('walkthrough-action');
        const actions = step.actions || (step.action ? [step.action] : []);
        if (actionEl) {
            if (actions.length) {
                actionEl.classList.remove('hidden');
                actionEl.innerHTML = actions
                    .map((a, i) => `<button type="button" class="btn-sm walkthrough-action-btn" data-walk-action="${i}">${a.label}</button>`)
                    .join('');
            } else {
                actionEl.classList.add('hidden');
                actionEl.innerHTML = '';
            }
        }

        const dots = document.getElementById('walkthrough-dots');
        if (dots) {
            dots.innerHTML = steps.map((_, i) =>
                `<span class="walkthrough-dot${i === this.step ? ' active' : ''}"></span>`
            ).join('');
        }

        const highlight = resolveHighlight(step, this._sessionMode);
        if (highlight) {
            document.querySelector(highlight)?.classList.add('walkthrough-highlight');
        }

        step.onEnter?.(this._sessionMode);
    },

    next() {
        const steps = this._steps();
        if (this.step >= steps.length - 1) {
            this.finish();
            return;
        }
        this.step += 1;
        this.render();
    },

    prev() {
        if (this.step <= 0) return;
        this.step -= 1;
        this.render();
    },

    finish() {
        ViewPrefs.set('walkthroughDone', true);
        ViewPrefs.set('welcomeSeen', true);
        this.hide();
        const label = this._mode === 'full' ? 'Full tutorial complete' : 'Guided tour complete';
        window.UI?.status(`${label} — MORE → TUTORIAL to replay`);
        GraphicsPrompt.startIfNeeded();
        window.ActionHints?.onSessionReady?.();
        window.AgentPortal?.startIfNeeded?.();
    },

    hide() {
        this.active = false;
        this._clearStepEffects();
        this.root?.classList.add('hidden');
    },
};

window.Walkthrough = Walkthrough;