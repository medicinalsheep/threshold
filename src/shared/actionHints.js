/** Sprint F — contextual first-run teaching hints */

import { ViewPrefs } from './viewPrefs.js';

const HINTS = [
    {
        id: 'walk',
        text: 'WASD walk · Space jump · F on terminals & survival props · vitals HUD top-right (V)',
        afterMs: 0,
    },
    {
        id: 'promptgen',
        text: 'Try PromptGen → EXAMPLES — one-click extend the Wardenclyffe showcase safely',
        afterMs: 42000,
    },
    {
        id: 'export',
        text: 'Ready to ship? ENGINE → MORE → EXPORT & PLAY saves + opens playable tab',
        afterMs: 95000,
    },
];

export const ActionHints = {
    _el: null,
    _toast: null,
    _sessionStart: 0,
    _shown: new Set(),
    _tcCard: null,

    init() {
        this._el = document.getElementById('action-hint-bar');
        this._toast = document.getElementById('action-hint-toast');
        this._tcCard = document.getElementById('tc-quest-card');
        this._sessionStart = performance.now();

        const done = ViewPrefs.get('actionHintsDone', {});
        HINTS.forEach((h) => {
            if (done[h.id]) this._shown.add(h.id);
        });

        document.getElementById('tc-quest-dismiss')?.addEventListener('click', () => this.dismissTcQuest());
        document.getElementById('tc-quest-go')?.addEventListener('click', () => {
            this.dismissTcQuest();
            window.UI?.status?.('Exit to lobby → TC → for the 60s lap challenge');
        });
    },

    _markDone(id) {
        this._shown.add(id);
        const done = ViewPrefs.get('actionHintsDone', {});
        done[id] = true;
        ViewPrefs.set('actionHintsDone', done);
    },

    _showHint(hint) {
        if (this._shown.has(hint.id)) return;
        this._markDone(hint.id);
        if (this._toast) {
            this._toast.textContent = hint.text;
            this._toast.classList.add('visible');
            clearTimeout(this._toastHide);
            this._toastHide = setTimeout(() => {
                this._toast?.classList.remove('visible');
            }, 9000);
        }
        if (this._el && hint.id === 'walk') {
            this._el.textContent = hint.text;
            this._el.classList.add('visible');
        }
    },

    onIntroEnded() {
        this.onSessionReady();
    },

    onSessionReady() {
        this._showHint(HINTS[0]);
        this._maybeTcQuest();
        this._maybeSurvivalRun();
    },

    tick(time) {
        if (!this._sessionStart) return;
        if (window.State?.introPlaying) return;
        if (window.Walkthrough?.active) return;
        if (document.body.classList.contains('guided-session-open')) return;

        const elapsed = time - this._sessionStart;
        HINTS.forEach((h) => {
            if (elapsed >= h.afterMs) this._showHint(h);
        });
    },

    _maybeTcQuest() {
        if (ViewPrefs.get('tcQuestDismissed', false)) return;
        if (!ViewPrefs.get('walkthroughDone', false)) return;
        if (window.State?.templateId !== 'wardenclyffe') return;
        if (window.Network?.mode !== 'solo') return;
        this._tcCard?.classList.add('visible');
    },

    dismissTcQuest() {
        ViewPrefs.set('tcQuestDismissed', true);
        this._tcCard?.classList.remove('visible');
    },

    _maybeSurvivalRun() {
        window.SurvivalRun?.maybeShow?.();
    },

    onFirstInteract() {
        if (this._shown.has('promptgen')) return;
        const hint = HINTS.find((h) => h.id === 'promptgen');
        if (hint) this._showHint(hint);
    },
};

window.ActionHints = ActionHints;