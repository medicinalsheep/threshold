/** Sprint S — survival loop: challenge card + Nikola bark */

import { ViewPrefs } from '../../src/shared/viewPrefs.js';

const RUN_DURATION_MS = 180000;
const RUN_MIN_STAT = 35;

function distToPlayer(obj) {
    const PC = window.PlayerController;
    if (!PC?.spawned || !PC.group || !obj?.position) return Infinity;
    const p = PC.group.position;
    const o = obj.position;
    return Math.hypot(p.x - o.x, p.y - o.y, p.z - o.z);
}

export const SurvivalRun = {
    _card: null,
    _active: false,
    _startAt: 0,
    _failed: false,

    init() {
        this._card = document.getElementById('survival-run-card');
        document.getElementById('survival-run-dismiss')?.addEventListener('click', () => this.dismiss());
        document.getElementById('survival-run-start')?.addEventListener('click', () => this.start());
    },

    maybeShow() {
        if (ViewPrefs.get('survivalRunDismissed', false)) return;
        if (!ViewPrefs.get('walkthroughDone', false)) return;
        if (window.State?.templateId !== 'wardenclyffe') return;
        if (window.Network?.mode !== 'solo') return;
        this._card?.classList.add('visible');
    },

    dismiss() {
        ViewPrefs.set('survivalRunDismissed', true);
        this._card?.classList.remove('visible');
        this._active = false;
    },

    start() {
        if (!window.SurvivalNeeds?.isActive?.()) {
            window.UI?.status?.('Switch to PLAY and walk mode to start Survival Run');
            return;
        }
        this._active = true;
        this._failed = false;
        this._startAt = performance.now();
        this._card?.classList.remove('visible');
        window.UI?.status?.('Survival Run — keep all vitals above 35% for 3 minutes');
    },

    tick() {
        if (!this._active || this._failed) return;
        const SN = window.SurvivalNeeds;
        if (!SN?.isActive?.()) return;

        const elapsed = performance.now() - this._startAt;
        const stats = SN.getAll();
        const below = Object.entries(stats).some(([, v]) => v < RUN_MIN_STAT);
        if (below) {
            this._failed = true;
            this._active = false;
            window.UI?.status?.('Survival Run failed — visit coffee, creek, or benches');
            window.SurvivalNeedsHud?.flash?.('critical');
            return;
        }

        if (elapsed >= RUN_DURATION_MS) {
            this._active = false;
            ViewPrefs.set('survivalRunDismissed', true);
            window.UI?.status?.('Survival Run complete — you held vitals for 3 minutes');
            window.StarterSfx?.playStarterSfx?.('starter_terminal_chirp', 0.38);
        }
    },

    isActive() {
        return this._active;
    },
};

export const SurvivalNikolaBark = {
    _lastBark: 0,

    tick() {
        const State = window.State;
        const SN = window.SurvivalNeeds;
        if (!SN?.isActive?.() || State?.controlMode !== 'walk') return;

        const npc = State.objects?.find((o) => o.userData?.id === 'tesla_guide_npc');
        if (!npc || distToPlayer(npc) > 7.5) return;

        const s = SN.getAll();
        const critical = s.health < 28 || s.food < 18 || s.water < 18;
        if (!critical) return;

        const now = performance.now();
        if (now - this._lastBark < 52000) return;
        this._lastBark = now;

        const lines = [
            'Nikola: Rest at the bench — the coil can wait.',
            'Nikola: Coffee nook east — warmth restores calm.',
            'Nikola: Creek water south — hydrate before the lab.',
        ];
        window.UI?.status?.(lines[Math.floor(Math.random() * lines.length)]);
        window.StarterSfx?.playStarterSfx?.('starter_terminal_chirp', 0.24);
    },
};

export function initSurvivalGameplay() {
    SurvivalRun.init();
}

window.SurvivalRun = SurvivalRun;
window.SurvivalNikolaBark = SurvivalNikolaBark;
window.initSurvivalGameplay = initSurvivalGameplay;