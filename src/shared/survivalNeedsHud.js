/** Sprint J — vitals HUD (health, food, water, rest, stamina, stress) */

import { ViewPrefs } from './viewPrefs.js';

const BARS = [
    { key: 'health', label: 'HP', class: 'hp' },
    { key: 'food', label: 'Food', class: 'food' },
    { key: 'water', label: 'Water', class: 'water' },
    { key: 'rest', label: 'Rest', class: 'rest' },
    { key: 'stamina', label: 'Sta', class: 'stamina' },
    { key: 'stress', label: 'Stress', class: 'stress', invert: true },
];

function isTypingTarget() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

function barClass(value, invert) {
    const v = invert ? 100 - value : value;
    if (v < 18) return 'crit';
    if (v < 35) return 'low';
    if (v > 72) return 'good';
    return 'mid';
}

export const SurvivalNeedsHud = {
    _root: null,
    _visible: true,
    _flashKind: null,
    _flashUntil: 0,

    init() {
        this._root = document.getElementById('survival-needs-hud');
        this._visible = ViewPrefs.get('survivalHud', true);
        this._applyVisibility();

        document.getElementById('guest-survival-hud')?.addEventListener('change', (e) => {
            ViewPrefs.set('guestSurvivalHud', !!e.target.checked);
            this._applyVisibility();
        });

        window.addEventListener('keydown', (e) => {
            if (e.code !== 'KeyV' || e.ctrlKey || e.metaKey || e.altKey) return;
            if (isTypingTarget()) return;
            if (!document.getElementById('view-engine')?.classList.contains('active')) return;
            e.preventDefault();
            this.setVisible(!this._visible);
        });

        this.render();
    },

    setVisible(on) {
        this._visible = !!on;
        ViewPrefs.set('survivalHud', this._visible);
        this._applyVisibility();
    },

    _applyVisibility() {
        this._root?.classList.toggle('visible', this._visible);
    },

    flash(kind) {
        this._flashKind = kind;
        this._flashUntil = performance.now() + 900;
        this._root?.classList.add('flash');
    },

    _shouldShow() {
        const SN = window.SurvivalNeeds;
        const mode = window.Network?.mode;
        if (!this._visible || !SN?.isActive?.()) return false;
        if (mode === 'guest') return ViewPrefs.get('guestSurvivalHud', false);
        if (mode === 'spectate') return false;
        return true;
    },

    syncGuestToggleUi() {
        const cb = document.getElementById('guest-survival-hud');
        if (!cb) return;
        const isGuest = window.Network?.mode === 'guest';
        cb.closest('.guest-survival-hud-row')?.classList.toggle('hidden', !isGuest);
        cb.checked = ViewPrefs.get('guestSurvivalHud', false);
    },

    tick() {
        const show = this._shouldShow();
        this._root?.classList.toggle('active', !!show);
        if (!show) return;

        if (performance.now() > this._flashUntil) {
            this._root?.classList.remove('flash');
        }
        this.render();
    },

    render() {
        if (!this._root) return;
        const SN = window.SurvivalNeeds;
        if (!SN) return;

        const stats = SN.getAll();
        const effects = SN.getStatusEffects?.() || [];

        const barsHtml = BARS.map((b) => {
            const raw = stats[b.key] ?? 0;
            const pct = Math.round(raw);
            const fill = b.invert ? 100 - pct : pct;
            const cls = barClass(pct, b.invert);
            return `<div class="surv-bar ${b.class} ${cls}" title="${b.label} ${pct}%">
                <span class="surv-bar-label">${b.label}</span>
                <span class="surv-bar-track"><span class="surv-bar-fill" style="width:${fill}%"></span></span>
                <span class="surv-bar-val">${pct}</span>
            </div>`;
        }).join('');

        const fxHtml = effects.length
            ? `<div class="surv-effects">${effects.map((e) =>
                `<span class="surv-fx surv-fx-${e.severity}">${e.label}</span>`).join('')}</div>`
            : '';

        this._root.innerHTML = `<div class="surv-head"><span class="surv-title">VITALS</span><span class="surv-hint">V toggle</span></div>
            <div class="surv-bars">${barsHtml}</div>${fxHtml}`;
    },
};

export function initSurvivalNeedsHud() {
    SurvivalNeedsHud.init();
}

window.SurvivalNeedsHud = SurvivalNeedsHud;
window.initSurvivalNeedsHud = initSurvivalNeedsHud;