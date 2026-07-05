import { ViewPrefs } from './viewPrefs.js';
import { SceneDock } from './sceneDock.js';

const STEPS = [
    {
        title: 'Welcome to Threshold',
        body: 'You are in a solo session with a starter scene — platform, beacon, and <strong>Guide</strong> NPC. This short tour covers design, AI, playtest, and export.',
    },
    {
        title: 'Floating panels',
        body: 'Drag <strong>TOOLS</strong> and <strong>SCENE</strong> anywhere on screen. Tap <strong>LOCK</strong> on a panel header when the layout feels right.',
        highlight: '#engine-toolbar',
    },
    {
        title: 'EDIT vs PLAY',
        body: '<strong>EDIT</strong> (paused) unlocks the world — insert objects, run Compiler code, tweak inspector. <strong>PLAY</strong> resumes physics so you can walk and test.',
        highlight: '#sim-mode-badge',
    },
    {
        title: 'Build something',
        body: 'Tap <strong>+</strong> or right-click the ground to insert. Try adding a physics block now, or skip and build freely after the tour.',
        action: {
            label: 'Add tutorial block',
            run() {
                const World = window.World;
                const m = World?.createObject('cube', 'Tutorial Block', 0xffaa44, true);
                if (m) {
                    m.position.set(0.5, 0.5, -0.8);
                    m.scale.setScalar(0.6);
                    window.UI?.status('Tutorial block added — drag it in EDIT');
                }
            },
        },
    },
    {
        title: 'AI-assisted creation',
        body: 'Pick one path now (you can use both later): attach a <strong>Grok NPC</strong> agent to Guide, or jump to <strong>PromptGen</strong> to describe a world for the Compiler.',
        actions: [
            {
                label: 'Guide + AI tab',
                run() {
                    let guide = null;
                    window.Engine?.scene?.traverse((o) => {
                        if (o.userData?.id === 'guide_npc') guide = o;
                    });
                    if (guide) window.UI?.selectObject(guide);
                    SceneDock.openTab('agents');
                    window.UI?.status('Guide selected — set persona and ATTACH TO NPC');
                },
            },
            {
                label: 'Open PromptGen',
                run() {
                    document.querySelector('[data-target="view-prompter"]')?.click();
                    window.UI?.status('PromptGen — describe your scene, paste into Compiler');
                },
            },
        ],
    },
    {
        title: 'Playtest',
        body: 'When ready, tap <strong>PLAY</strong> on the toolbar (or <strong>PAUSE</strong> to return to EDIT). Use <strong>WASD</strong> to move; switch <strong>FLY</strong> / walk with the mode button.',
        highlight: '#btn-host-pause',
    },
    {
        title: 'Save & ship',
        body: '<strong>MORE</strong> → <strong>SAVE WORLD</strong> for share links. When your game is ready, <strong>MORE</strong> → <strong>EXPORT</strong> opens the packaging wizard (manifest + <code>package:android</code> / <code>package:win</code>).',
        highlight: '#btn-toolbar-more',
    },
    {
        title: 'You are set',
        body: 'Restart this tour anytime from <strong>MORE → TUTORIAL</strong>. Compiler workflows live under WORKFLOWS in the sidebar. Have fun building.',
    },
];

export const Walkthrough = {
    step: 0,
    root: null,
    active: false,

    startIfNeeded() {
        if (ViewPrefs.get('walkthroughDone', false)) return;
        if (ViewPrefs.get('welcomeSeen', false)) {
            ViewPrefs.set('walkthroughDone', true);
            return;
        }
        setTimeout(() => this.start(0), 400);
    },

    restart() {
        ViewPrefs.set('walkthroughDone', false);
        this.start(0);
    },

    start(fromStep = 0) {
        this.root = document.getElementById('engine-walkthrough');
        if (!this.root) return;

        this.step = Math.max(0, Math.min(fromStep, STEPS.length - 1));
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
            const step = STEPS[this.step];
            const actions = step.actions || (step.action ? [step.action] : []);
            actions[idx]?.run?.();
        });
    },

    render() {
        const step = STEPS[this.step];
        const total = STEPS.length;

        document.getElementById('walkthrough-step-label').textContent = `${this.step + 1} / ${total}`;
        document.getElementById('walkthrough-title').textContent = step.title;
        document.getElementById('walkthrough-body').innerHTML = step.body;

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
            dots.innerHTML = STEPS.map((_, i) =>
                `<span class="walkthrough-dot${i === this.step ? ' active' : ''}"></span>`
            ).join('');
        }

        document.querySelectorAll('.walkthrough-highlight').forEach((el) => el.classList.remove('walkthrough-highlight'));
        if (step.highlight) {
            document.querySelector(step.highlight)?.classList.add('walkthrough-highlight');
        }
    },

    next() {
        if (this.step >= STEPS.length - 1) {
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
        window.UI?.status('Tutorial complete — MORE → TUTORIAL to replay');
    },

    hide() {
        this.active = false;
        this.root?.classList.add('hidden');
        document.querySelectorAll('.walkthrough-highlight').forEach((el) => el.classList.remove('walkthrough-highlight'));
    },
};