/** Sprint F — contextual first-run teaching hints */

import { ViewPrefs } from './viewPrefs.js';

const HINTS = [
    {
        id: 'walk',
        text: 'Walk the pad — push the crate · try the hinge gate · EDIT (top-left) to build',
        afterMs: 0,
    },
    {
        id: 'physics',
        text: 'EDIT → select prop → mass / friction · SCENE gravity · INSERT Physics Lab for more',
        afterMs: 28000,
    },
    {
        id: 'promptgen',
        text: 'TOOLS → Compiler or PromptGen · AI station (F) for agents',
        afterMs: 52000,
    },
    {
        id: 'export',
        text: 'Ready to ship? TOOLS → Export & play or Export wizard',
        afterMs: 100000,
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
            window.UI?.status?.('Exit to lobby → TC DEMO for the 60s lap challenge');
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
        if (window.State?.templateId !== 'tc-circuit') return;
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