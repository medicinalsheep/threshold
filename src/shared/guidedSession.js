/** Guided session — upfront PLAY vs BUILD, then walkthrough */

import { ViewPrefs } from './viewPrefs.js';
import { Walkthrough } from './walkthrough.js';
import { GraphicsPrompt } from './graphicsPrompt.js';

export const GuidedSession = {
    _root: null,
    _pendingMode: null,

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

    applyMode(mode, reason = '') {
        const build = mode === 'build';
        const State = window.State;
        const Session = window.Session;
        if (!State || !Session) return;

        ViewPrefs.set('sessionMode', mode);
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

    chooseMode(mode) {
        this._pendingMode = mode;
        this.applyMode(mode, mode === 'build' ? 'You chose BUILD' : 'You chose PLAY');
        this.hide();
        Walkthrough.startIfNeeded(mode);
    },

    startIfNeeded() {
        this.applySavedMode();

        if (ViewPrefs.get('walkthroughDone', false)) {
            if (!this.getSavedMode()) this.applyMode('play');
            GraphicsPrompt.startIfNeeded();
            window.ActionHints?.onSessionReady?.();
            return;
        }

        const lobbyMode = this.getSavedMode();
        if (lobbyMode) {
            setTimeout(() => Walkthrough.startIfNeeded(lobbyMode), 320);
            return;
        }

        setTimeout(() => this.show(), 280);
    },

    show() {
        if (!this._root) {
            Walkthrough.startIfNeeded('play');
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