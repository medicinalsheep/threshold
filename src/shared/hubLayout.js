/**
 * Lock / unlock UI layout — drag corner hubs + floating overlays when unlocked.
 */

import { ViewPrefs } from './viewPrefs.js';

const HUB_PREFS_KEY = 'hubLayoutPositions';
const OVERLAY_PREFS_KEY = 'uiOverlayPositions';
const HUB_IDS = ['tl', 'tr', 'bl', 'br'];

const UI_OVERLAYS = [
    { id: 'perf-hud', selector: '#creator-perf-hud' },
    { id: 'model-hud', selector: '#model-status-hud-float' },
    { id: 'game-chat', selector: '#game-chat', grip: '.game-chat-header' },
    { id: 'app-nav', selector: '#app-nav', grip: '.brand' },
    { id: 'proximity', selector: '#proximity-panel', grip: '#proximity-chip' },
];

function loadHubPositions() {
    return ViewPrefs.get(HUB_PREFS_KEY, {});
}

function saveHubPositions(pos) {
    ViewPrefs.set(HUB_PREFS_KEY, pos);
}

function loadOverlayPositions() {
    return ViewPrefs.get(OVERLAY_PREFS_KEY, {});
}

function saveOverlayPositions(pos) {
    ViewPrefs.set(OVERLAY_PREFS_KEY, pos);
}

function hubEl(id) {
    return document.querySelector(`.corner-hub-${id}`);
}

function overlayEl(item) {
    return document.querySelector(item.selector);
}

function overlayGrip(item) {
    const root = overlayEl(item);
    if (!root) return null;
    if (item.grip) return root.querySelector(item.grip) || root;
    return root;
}

function readBounds() {
    const pad = 8;
    const restoreH = document.body.classList.contains('nav-collapsed') && !document.body.classList.contains('nav-ui-custom')
        ? 28
        : 0;
    const vv = window.visualViewport;
    const w = vv?.width ?? window.innerWidth;
    const h = vv?.height ?? window.innerHeight;
    return { pad, restoreH, w, h, topMin: pad + restoreH };
}

function applyOverlayPosition(el, pos) {
    if (!el || !pos) return;
    el.style.position = 'fixed';
    el.style.top = `${pos.y}px`;
    el.style.left = `${pos.x}px`;
    el.style.bottom = 'auto';
    el.style.right = 'auto';
    el.style.transform = 'none';
    el.style.margin = '0';
    el.dataset.uiPositioned = '1';
}

function clearOverlayInline(el) {
    if (!el || el.dataset.uiPositioned !== '1') return;
    el.style.position = '';
    el.style.top = '';
    el.style.left = '';
    el.style.bottom = '';
    el.style.right = '';
    el.style.transform = '';
    el.style.margin = '';
    delete el.dataset.uiPositioned;
}

export const HubLayout = {
    _locked: true,
    _drag: null,

    init() {
        this._locked = ViewPrefs.get('hubLayoutLocked', true) !== false;
        this.applyPositions();
        this.applyOverlayPositions();
        this.syncUi();
        window.dispatchEvent(new CustomEvent('hub-layout-edit-change', { detail: { editing: !this._locked } }));
        window.TouchControls?._syncEditMode?.();

        document.getElementById('hub-layout-lock')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        HUB_IDS.forEach((id) => {
            const el = hubEl(id);
            if (!el) return;
            el.addEventListener('pointerdown', (e) => this.onHubPointerDown(id, e));
        });

        UI_OVERLAYS.forEach((item) => {
            const grip = overlayGrip(item);
            if (!grip) return;
            grip.addEventListener('pointerdown', (e) => this.onOverlayPointerDown(item, e));
        });

        document.getElementById('touch-controls')?.addEventListener('pointerdown', (e) => {
            this.onTouchPointerDown(e);
        });

        window.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', () => this.onPointerUp());
        window.addEventListener('resize', () => {
            this.applyPositions();
            this.applyOverlayPositions();
        });

        document.getElementById('corner-hubs')?.addEventListener('click', (e) => {
            if (this._locked) return;
            if (e.target.closest('#hub-layout-lock')) return;
            if (e.target.closest('.corner-hub-toggle, .corner-hub-arm button, .corner-hub-menu button')) {
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
        window.dispatchEvent(new CustomEvent('hub-layout-edit-change', { detail: { editing: !this._locked } }));
        window.TouchControls?._syncEditMode?.();
        window.TouchControls?._applyEnabled?.();
        this.syncUi();
        if (this._locked) {
            this.applyPositions();
            this.applyOverlayPositions();
            window.UI?.status?.('UI layout locked');
        } else {
            document.getElementById('app-nav')?.classList.remove('nav-ui-hidden-for-edit');
            window.UI?.status?.('Drag corners, proximity chip, HUD, chat, header & touch — tap LOCK when done');
        }
    },

    syncUi() {
        const btn = document.getElementById('hub-layout-lock');
        if (!btn) return;
        btn.textContent = this._locked ? 'UNLOCK' : 'LOCK';
        btn.title = this._locked ? 'Unlock to move UI elements' : 'Lock layout and resume normal controls';
        btn.classList.toggle('hub-layout-unlocked', !this._locked);
    },

    applyPositions() {
        const saved = loadHubPositions();
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

    applyOverlayPositions() {
        const saved = loadOverlayPositions();
        const hasCustomNav = !!saved['app-nav'];
        document.body.classList.toggle('nav-ui-custom', hasCustomNav && this._locked);

        UI_OVERLAYS.forEach((item) => {
            const el = overlayEl(item);
            if (!el) return;
            const pos = saved[item.id];
            if (!pos) {
                if (item.id !== 'app-nav') clearOverlayInline(el);
                return;
            }
            applyOverlayPosition(el, pos);
            if (item.id === 'app-nav') {
                el.classList.remove('nav-ui-hidden-for-edit');
            }
        });
    },

    onHubPointerDown(id, e) {
        if (this._locked) return;
        if (e.target.closest('#hub-layout-lock')) return;
        if (!e.target.closest('.corner-hub-toggle, .corner-hub-arm button')) return;
        if (e.target.closest('.corner-hub-menu')) return;

        const el = hubEl(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        this._drag = {
            kind: 'hub',
            id,
            el,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            pointerId: e.pointerId,
        };
        el.setPointerCapture?.(e.pointerId);
        e.preventDefault();
    },

    onTouchPointerDown(e) {
        if (this._locked) return;
        if (e.target.closest('#touch-add-btn')) return;
        const el = e.target.closest('[data-touch-layout-id]');
        if (!el) return;
        if (e.button !== 0) return;

        const rect = el.getBoundingClientRect();
        this._drag = {
            kind: 'touch',
            id: el.dataset.touchLayoutId,
            el,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            pointerId: e.pointerId,
        };
        el.setPointerCapture?.(e.pointerId);
        e.preventDefault();
    },

    onOverlayPointerDown(item, e) {
        if (this._locked) return;
        if (e.button !== 0) return;
        if (e.target.closest('button, input, select, textarea, a')) return;
        const el = overlayEl(item);
        const grip = overlayGrip(item);
        if (!el || !grip) return;
        // Proximity: allow drag from whole chip while unlocked
        if (item.id === 'proximity' && !e.target.closest('#proximity-chip, #proximity-panel')) return;

        if (item.id === 'app-nav') {
            el.classList.remove('nav-ui-hidden-for-edit');
            document.body.classList.remove('nav-collapsed');
            window.dispatchEvent(new Event('resize'));
        }

        const rect = el.getBoundingClientRect();
        applyOverlayPosition(el, { x: rect.left, y: rect.top });
        this._drag = {
            kind: 'overlay',
            item,
            el,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            pointerId: e.pointerId,
        };
        grip.setPointerCapture?.(e.pointerId);
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

        if (this._drag.kind === 'hub') {
            el.style.top = `${y}px`;
            el.style.left = `${x}px`;
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        } else if (this._drag.kind === 'touch') {
            el.style.top = `${y}px`;
            el.style.left = `${x}px`;
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        } else {
            applyOverlayPosition(el, { x, y });
        }
    },

    onPointerUp() {
        if (!this._drag) return;
        const { el } = this._drag;

        if (this._drag.kind === 'hub') {
            const saved = loadHubPositions();
            saved[this._drag.id] = {
                x: parseFloat(el.style.left) || el.offsetLeft,
                y: parseFloat(el.style.top) || el.offsetTop,
            };
            saveHubPositions(saved);
        } else if (this._drag.kind === 'touch') {
            const rect = el.getBoundingClientRect();
            window.TouchControls?.setItemPosition?.(this._drag.id, {
                x: rect.left,
                y: rect.top,
                w: rect.width,
                h: rect.height,
            });
        } else {
            const saved = loadOverlayPositions();
            const rect = el.getBoundingClientRect();
            saved[this._drag.item.id] = { x: rect.left, y: rect.top };
            saveOverlayPositions(saved);
            if (this._drag.item.id === 'app-nav') {
                document.body.classList.add('nav-ui-custom');
                window.dispatchEvent(new Event('resize'));
            }
        }

        this._drag = null;
    },
};

window.HubLayout = HubLayout;