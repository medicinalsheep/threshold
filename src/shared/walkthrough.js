import { ViewPrefs } from './viewPrefs.js';
import { SceneDock } from './sceneDock.js';
import { GraphicsPrompt } from './graphicsPrompt.js';

function modeLabel(mode) {
    return mode === 'build' ? 'BUILD (EDIT)' : 'PLAY';
}

const STEPS = [
    {
        title: 'Your session mode',
        body: (mode) => `You started in <strong>${modeLabel(mode)}</strong>. `
            + '<strong>PLAY</strong> runs physics, survival vitals, and walk controls. '
            + '<strong>BUILD</strong> pauses the sim so you can insert objects, run Compiler scripts, and edit textures. '
            + 'Toggle anytime with the badge or <strong>PAUSE</strong>.',
        highlight: '#sim-mode-badge',
    },
    {
        title: 'Wardenclyffe showcase',
        body: 'This is a production-style starter site — textured lab GLBs, courtyard props, weather, survival loops, and MP sync. '
            + 'Walk north to the lab · <strong>F</strong> on terminals · Nikola patrols inside. '
            + 'Use this as a reference world when building your own game.',
    },
    {
        title: 'Extend without wiping',
        body: 'Fastest path: <strong>PromptGen → EXAMPLES</strong> — tested prompts that extend the scene safely. '
            + 'Compiler kiosk and AI terminal are on the visitor path south of the lab.',
        actions: [
            {
                label: 'PromptGen EXAMPLES',
                run() {
                    document.querySelector('[data-target="view-prompter"]')?.click();
                    window.UI?.status('Pick an EXAMPLES prompt → RUN WITH GROK or paste into Compiler');
                },
            },
            {
                label: 'Open Compiler',
                run() {
                    document.querySelector('[data-target="view-compiler"]')?.click();
                },
            },
        ],
    },
    {
        title: 'Playtest your game',
        body: 'Switch to <strong>PLAY</strong> to test walk, survival vitals (top-right HUD), interact props, and weather. '
            + 'Graphics tier is suggested after this tour — tune in <strong>SCENE → ENV</strong>.',
        highlight: '#btn-host-pause',
    },
    {
        title: 'Ship when ready',
        body: '<strong>MORE → EXPORT &amp; PLAY</strong> saves, downloads manifest, and opens a playable tab. '
            + '<strong>SAVE WORLD</strong> shares <code>?world=CODE</code> links for collaborators.',
        highlight: '#btn-toolbar-more',
        actions: [
            {
                label: 'EXPORT & PLAY',
                run() {
                    document.getElementById('toolbar-more-menu')?.classList.remove('open');
                    window.QuickExportPlay?.start?.();
                },
            },
        ],
    },
    {
        title: 'You are set',
        body: 'Replay via <strong>MORE → TUTORIAL</strong>. Deep dive (textures, agents, store export): '
            + '<strong>MORE → TUTORIAL (FULL)</strong> or <code>docs/CREATIVE_WORKFLOW.md</code>.',
        actions: [
            {
                label: 'Open full guide',
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
        body: 'Attach Grok or local agents at terminals · NPC personas in <strong>SCENE → Agents</strong>.',
        actions: [
            {
                label: 'Agents tab',
                run() {
                    SceneDock.openTab('agents');
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
        setTimeout(() => this.start(0, 'quick', mode), 200);
    },

    restart() {
        ViewPrefs.set('walkthroughDone', false);
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

    render() {
        const steps = this._steps();
        const step = steps[this.step];
        const total = steps.length;

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

        document.querySelectorAll('.walkthrough-highlight').forEach((el) => el.classList.remove('walkthrough-highlight'));
        if (step.highlight) {
            document.querySelector(step.highlight)?.classList.add('walkthrough-highlight');
        }
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
    },

    hide() {
        this.active = false;
        this.root?.classList.add('hidden');
        document.querySelectorAll('.walkthrough-highlight').forEach((el) => el.classList.remove('walkthrough-highlight'));
    },
};

window.Walkthrough = Walkthrough;