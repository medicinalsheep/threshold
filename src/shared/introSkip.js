/** Sprint F — skippable intro flythrough */

export const IntroSkip = {
    _bound: false,

    init() {
        if (this._bound) return;
        this._bound = true;

        document.getElementById('intro-skip-btn')?.addEventListener('click', () => this.skip('button'));
        window.addEventListener('keydown', (e) => {
            if (e.code !== 'Escape' || e.repeat) return;
            if (!window.State?.introPlaying) return;
            if (document.querySelector('.modal-backdrop.open')) return;
            e.preventDefault();
            this.skip('esc');
        });
        document.getElementById('view-engine')?.addEventListener('click', (e) => {
            if (!window.State?.introPlaying) return;
            if (e.target.closest('#ui-layer, .engine-walkthrough, .modal-backdrop, #intro-skip-pill')) return;
            this.skip('click');
        });
    },

    tick() {
        const pill = document.getElementById('intro-skip-pill');
        if (!pill) return;
        const playing = !!window.State?.introPlaying;
        pill.classList.toggle('visible', playing);
    },

    skip(source = 'button') {
        const State = window.State;
        const Engine = window.Engine;
        if (!State?.introPlaying) return;

        State.introPlaying = false;
        window.TeslaIntroCaptions?._hide?.();

        if (State.introTo && Engine?.camera) {
            Engine.camera.position.set(State.introTo.x, State.introTo.y, State.introTo.z);
        }
        if (State.introTarget && Engine?.controls) {
            Engine.controls.target.set(State.introTarget.x, State.introTarget.y, State.introTarget.z);
            Engine.controls.update?.();
        }

        document.getElementById('intro-skip-pill')?.classList.remove('visible');
        const label = source === 'esc' ? 'Intro skipped (ESC)' : 'Intro skipped';
        window.UI?.status?.(`${label} — WASD to explore · F to interact`);
        window.ActionHints?.onIntroEnded?.();
    },
};

window.IntroSkip = IntroSkip;