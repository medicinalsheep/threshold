/** Guided session — upfront PLAY vs BUILD, then walkthrough */

import { ViewPrefs } from './viewPrefs.js';
import { Walkthrough } from './walkthrough.js';
import { GraphicsPrompt } from './graphicsPrompt.js';

export const GuidedSession = {
    _root: null,

    init() {
        this._root = document.getElementById('guided-session-modal');
        this.bindOnce();
    },

    bindOnce() {
        if (this._root?.dataset.bound) return;
        if (this._root) this._root.dataset.bound = '1';

        document.getElementById('guided-mode-play')?.addEventListener('click', () => this.chooseMode('play'));
        document.getElementById('guided-mode-build')?.addEventListener('click', () => this.chooseMode('build'));
    },

    getSavedMode() {
        const mode = ViewPrefs.get('sessionMode', null);
        return mode === 'build' || mode === 'play' ? mode : null;
    },

    shouldSkipModeGate() {
        const Session = window.Session;
        const Network = window.Network;
        return !!(
            Session?.isSpectator
            || Network?.mode === 'spectate'
            || Network?.mode === 'guest'
        );
    },

    applyMode(mode, reason = '', persist = true) {
        const build = mode === 'build';
        const State = window.State;
        const Session = window.Session;
        if (!State || !Session) return;

        if (persist) ViewPrefs.set('sessionMode', mode);
        const pauseReason = build ? (reason || 'BUILD mode') : '';
        if (Session.canControlPause?.()) {
            Session.setPaused(build, pauseReason);
        } else {
            State.isPaused = build;
            Session.isPaused = build;
            Session.pauseReason = pauseReason;
            Session.updateUi?.();
        }
        window.UI?.updateSimMode?.();
        window.PlayerController?._syncWalkOrbit?.();
        window.Engine?._releaseLookLock?.();

        const label = build ? 'BUILD — world editable, physics paused' : 'PLAY — simulation running';
        window.UI?.status?.(label);
    },

    applySavedMode() {
        const mode = this.getSavedMode();
        if (mode) this.applyMode(mode);
    },

    applyHostPauseState() {
        const Session = window.Session;
        const State = window.State;
        if (!Session || !State) return 'play';

        Session.syncFromHostState?.();
        const build = !!Session.isPaused;
        State.isPaused = build;
        Session.isPaused = build;
        window.UI?.updateSimMode?.();
        window.PlayerController?._syncWalkOrbit?.();
        return build ? 'build' : 'play';
    },

    chooseMode(mode) {
        this.applyMode(mode, mode === 'build' ? 'You chose BUILD' : 'You chose PLAY');
        this.hide();
        ViewPrefs.set('walkthroughDone', true);
        requestAnimationFrame(() => this.finishPostTour());
    },

    beginTour(mode) {
        requestAnimationFrame(() => Walkthrough.start(0, 'quick', mode));
    },

    finishPostTour() {
        GraphicsPrompt.startIfNeeded();
        window.ActionHints?.onSessionReady?.();
    },

    startIfNeeded() {
        if (this.shouldSkipModeGate()) {
            this.applyHostPauseState();
            this.finishPostTour();
            return;
        }

        this.applySavedMode();

        if (ViewPrefs.get('walkthroughDone', false)) {
            if (!this.getSavedMode()) this.applyMode('play');
            this.finishPostTour();
            return;
        }

        const lobbyMode = this.getSavedMode();
        if (lobbyMode) {
            this.finishPostTour();
            return;
        }

        requestAnimationFrame(() => this.show());
    },

    show() {
        if (!this._root) {
            this.applyMode('play');
            this.finishPostTour();
            return;
        }
        this._root.classList.add('open');
        document.body.classList.add('guided-session-open');
    },

    hide() {
        this._root?.classList.remove('open');
        document.body.classList.remove('guided-session-open');
    },
};

window.GuidedSession = GuidedSession;