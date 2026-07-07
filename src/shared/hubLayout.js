/**
 * Lock / unlock corner hub positions — drag to arrange when unlocked.
 */

import { ViewPrefs } from './viewPrefs.js';

const PREFS_KEY = 'hubLayoutPositions';
const HUB_IDS = ['tl', 'tr', 'bl', 'br'];

function loadPositions() {
    return ViewPrefs.get(PREFS_KEY, {});
}

function savePositions(pos) {
    ViewPrefs.set(PREFS_KEY, pos);
}

function hubEl(id) {
    return document.querySelector(`.corner-hub-${id}`);
}

function readBounds() {
    const pad = 8;
    const restoreH = document.body.classList.contains('nav-collapsed') ? 28 : 0;
    const vv = window.visualViewport;
    const w = vv?.width ?? window.innerWidth;
    const h = vv?.height ?? window.innerHeight;
    return { pad, restoreH, w, h, topMin: pad + restoreH };
}

export const HubLayout = {
    _locked: true,
    _drag: null,

    init() {
        this._locked = ViewPrefs.get('hubLayoutLocked', true) !== false;
        this.applyPositions();
        this.syncUi();

        document.getElementById('hub-layout-lock')?.addEventListener('click', () => this.toggle());

        HUB_IDS.forEach((id) => {
            const el = hubEl(id);
            if (!el) return;
            el.addEventListener('pointerdown', (e) => this.onPointerDown(id, e));
        });

        window.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', () => this.onPointerUp());
        window.addEventListener('resize', () => this.applyPositions());

        document.getElementById('corner-hubs')?.addEventListener('click', (e) => {
            if (!this._locked) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    },

    isLocked() {
        return this._locked;
    },

    toggle() {
        this._locked = !this._locked;
        ViewPrefs.set('hubLayoutLocked', this._locked);
        document.body.classList.toggle('hub-layout-edit', !this._locked);
        this.syncUi();
        if (this._locked) this.applyPositions();
        window.UI?.status?.(this._locked ? 'UI locked' : 'Drag corner buttons to arrange');
    },

    syncUi() {
        const btn = document.getElementById('hub-layout-lock');
        if (!btn) return;
        btn.textContent = this._locked ? 'LOCK' : 'DONE';
        btn.title = this._locked ? 'Unlock to move corner buttons' : 'Lock layout';
        btn.classList.toggle('hub-layout-unlocked', !this._locked);
    },

    applyPositions() {
        const saved = loadPositions();
        const { pad, w, h, topMin } = readBounds();

        HUB_IDS.forEach((id) => {
            const el = hubEl(id);
            if (!el) return;
            const s = saved[id];
            if (!s) {
                el.style.top = '';
                el.style.left = '';
                el.style.right = '';
                el.style.bottom = '';
                return;
            }
            let x = s.x;
            let y = s.y;
            const rect = el.getBoundingClientRect();
            const bw = rect.width || 48;
            const bh = rect.height || 48;
            x = Math.max(pad, Math.min(x, w - bw - pad));
            y = Math.max(topMin, Math.min(y, h - bh - pad));
            el.style.top = `${y}px`;
            el.style.left = `${x}px`;
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        });
    },

    onPointerDown(id, e) {
        if (this._locked) return;
        if (!e.target.closest('.corner-hub-toggle, .corner-hub-arm button, #hub-layout-lock')) return;
        if (e.target.closest('.corner-hub-menu')) return;

        const el = hubEl(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        this._drag = {
            id,
            el,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            pointerId: e.pointerId,
        };
        el.setPointerCapture?.(e.pointerId);
        e.preventDefault();
    },

    onPointerMove(e) {
        if (!this._drag || e.pointerId !== this._drag.pointerId) return;
        const { pad, w, h, topMin } = readBounds();
        const el = this._drag.el;
        const rect = el.getBoundingClientRect();
        const bw = rect.width || 48;
        const bh = rect.height || 48;
        let x = e.clientX - this._drag.offsetX;
        let y = e.clientY - this._drag.offsetY;
        x = Math.max(pad, Math.min(x, w - bw - pad));
        y = Math.max(topMin, Math.min(y, h - bh - pad));
        el.style.top = `${y}px`;
        el.style.left = `${x}px`;
        el.style.right = 'auto';
        el.style.bottom = 'auto';
    },

    onPointerUp() {
        if (!this._drag) return;
        const { id, el } = this._drag;
        const saved = loadPositions();
        saved[id] = {
            x: parseFloat(el.style.left) || el.offsetLeft,
            y: parseFloat(el.style.top) || el.offsetTop,
        };
        savePositions(saved);
        this._drag = null;
    },
};

window.HubLayout = HubLayout;