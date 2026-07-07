import { ViewPrefs } from './viewPrefs.js';
import { CONTROL_ACTIONS } from './controls.js';

const HOLD_MS = 480;
const DOUBLE_MS = 380;
const LAYOUT_KEY = 'touchLayoutV2';
const STICK_SIZE = 120;
const BTN_SIZE = 52;

/** Standard controller-style touch actions */
export const STANDARD_TOUCH_BUTTONS = [
    { id: 'jump', action: 'jump', label: '⬆', size: 52 },
    { id: 'sprint', action: 'sprint', label: 'RUN', size: 48 },
    { id: 'crouch', action: 'crouch', label: '↓', size: 44 },
    { id: 'aim', action: 'aim', label: 'ADS', size: 56, hold: true },
    { id: 'fire', action: 'fire', label: '●', size: 56, hold: true },
    { id: 'reload', action: 'reload', label: 'R', size: 44 },
    { id: 'melee', action: 'melee', label: 'M', size: 44 },
    { id: 'holster', action: 'holster', label: 'H', size: 44 },
    { id: 'interact', action: 'interact', label: 'F', size: 52 },
    { id: 'thirdEye', action: 'thirdEye', label: '👁', size: 48 },
    { id: 'enterVehicle', action: 'enterVehicle', label: 'VEH', size: 44 },
    { id: 'flashlight', action: 'flashlight', label: '🔦', size: 44 },
    { id: 'toggleView', action: 'toggleView', label: 'FPS', size: 44 },
    { id: 'pause', action: 'pause', label: '⏸', size: 44 },
];

const DEFAULT_LAYOUT = {
    sticks: {
        'stick-left': { x: 16, y: 24, w: STICK_SIZE, h: STICK_SIZE },
        'stick-right': { x: -136, y: 24, w: STICK_SIZE, h: STICK_SIZE, anchor: 'br' },
    },
    buttons: {
        jump: { x: -148, y: 100, w: 52, h: 52, anchor: 'br' },
        sprint: { x: -148, y: 36, w: 48, h: 48, anchor: 'br' },
        crouch: { x: -204, y: 36, w: 44, h: 44, anchor: 'br' },
        aim: { x: -84, y: 68, w: 56, h: 56, anchor: 'br' },
        fire: { x: -36, y: 100, w: 56, h: 56, anchor: 'br' },
        reload: { x: -204, y: 100, w: 44, h: 44, anchor: 'br' },
        melee: { x: -36, y: 36, w: 44, h: 44, anchor: 'br' },
        holster: { x: -84, y: 36, w: 44, h: 44, anchor: 'br' },
        interact: { x: -260, y: 68, w: 52, h: 52, anchor: 'br' },
        thirdEye: { x: -260, y: 128, w: 48, h: 48, anchor: 'br' },
        enterVehicle: { x: -316, y: 68, w: 44, h: 44, anchor: 'br' },
        flashlight: { x: -316, y: 128, w: 44, h: 44, anchor: 'br' },
        toggleView: { x: -316, y: 24, w: 44, h: 44, anchor: 'br' },
        pause: { x: -372, y: 24, w: 44, h: 44, anchor: 'br' },
    },
    custom: [],
    hidden: [],
};

function loadLayout() {
    const saved = ViewPrefs.get(LAYOUT_KEY, null);
    if (!saved) return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
    return {
        sticks: { ...DEFAULT_LAYOUT.sticks, ...saved.sticks },
        buttons: { ...DEFAULT_LAYOUT.buttons, ...saved.buttons },
        custom: saved.custom || [],
        hidden: saved.hidden || [],
    };
}

function saveLayout(layout) {
    ViewPrefs.set(LAYOUT_KEY, layout);
}

export const TouchControls = {
    enabled: false,
    userOverride: null,
    left: { x: 0, y: 0, active: false },
    right: { x: 0, y: 0, active: false },
    buttons: {},
    _pointers: new Map(),
    _holdTimer: null,
    _holdPoint: null,
    _edgeLatches: {},
    _layout: loadLayout(),

    init() {
        const stored = ViewPrefs.get('touchControls');
        this.userOverride = stored === 'on' ? true : stored === 'off' ? false : null;
        this._renderLayout();
        this._applyEnabled();
        this._bindCanvasGestures();
        this._wireAddButton();

        window.addEventListener('resize', () => {
            if (this.userOverride === null) this._applyEnabled();
            this._applyPositions();
        });

        window.addEventListener('hub-layout-edit-change', () => this._syncEditMode());
        this._syncEditMode();
    },

    getLayout() {
        return this._layout;
    },

    saveLayout() {
        saveLayout(this._layout);
    },

    _syncEditMode() {
        const editing = document.body.classList.contains('hub-layout-edit');
        const root = document.getElementById('touch-controls');
        const addBtn = document.getElementById('touch-add-btn');
        if (root) root.classList.toggle('touch-layout-edit', editing);
        if (addBtn) addBtn.hidden = !editing;
        if (editing) root?.classList.add('visible');
    },

    _renderLayout() {
        const root = document.getElementById('touch-layout-root');
        if (!root) return;
        root.innerHTML = '';

        const hidden = new Set(this._layout.hidden || []);

        Object.entries(this._layout.sticks || {}).forEach(([id, pos]) => {
            if (hidden.has(id)) return;
            const role = id.includes('right') ? 'camera' : 'move';
            const zone = document.createElement('div');
            zone.id = id;
            zone.className = `touch-stick-zone touch-layout-item${role === 'camera' ? ' touch-camera' : ''}`;
            zone.dataset.touchLayoutId = id;
            zone.dataset.touchRole = role;
            zone.setAttribute('aria-label', role === 'camera' ? 'Camera' : 'Move');
            zone.innerHTML = '<div class="touch-knob"></div>';
            root.appendChild(zone);
            this._applyItemPosition(zone, pos);
            this._bindStick(zone, id.includes('right') ? 'right' : 'left');
        });

        const builtIn = STANDARD_TOUCH_BUTTONS.filter((b) => !hidden.has(b.id));
        builtIn.forEach((def) => {
            const pos = this._layout.buttons?.[def.id] || DEFAULT_LAYOUT.buttons[def.id];
            if (!pos) return;
            root.appendChild(this._createButtonEl(def.id, def.action, def.label, def.size || BTN_SIZE, pos));
        });

        (this._layout.custom || []).forEach((c) => {
            if (hidden.has(c.id)) return;
            root.appendChild(this._createButtonEl(c.id, c.action, c.label, c.size || BTN_SIZE, c));
        });
    },

    _createButtonEl(id, action, label, size, pos) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'touch-btn touch-layout-item';
        btn.dataset.touchLayoutId = id;
        btn.dataset.touchBtn = action;
        btn.dataset.touchUid = id;
        btn.setAttribute('aria-label', CONTROL_ACTIONS[action]?.label || action);
        btn.textContent = label;
        btn.style.width = `${size}px`;
        btn.style.height = `${size}px`;
        this._applyItemPosition(btn, { ...pos, w: size, h: size });
        this._bindButton(btn, action);
        return btn;
    },

    _applyItemPosition(el, pos = {}) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const anchor = pos.anchor || 'bl';
        const width = pos.w || el.offsetWidth || BTN_SIZE;
        const height = pos.h || el.offsetHeight || BTN_SIZE;
        let left = pos.x ?? 16;
        let bottom = pos.y ?? 24;

        if (anchor === 'br' || anchor === 'tr') {
            left = w + (pos.x ?? -100) - width;
        }
        if (anchor === 'tr' || anchor === 'tl') {
            bottom = h - (pos.y ?? 24) - height;
        }

        el.style.position = 'absolute';
        el.style.left = `${Math.max(4, left)}px`;
        el.style.bottom = `${Math.max(4, bottom)}px`;
        el.style.right = 'auto';
        el.style.top = 'auto';
    },

    _applyPositions() {
        document.querySelectorAll('#touch-layout-root [data-touch-layout-id]').forEach((el) => {
            const id = el.dataset.touchLayoutId;
            const pos = this._layout.sticks?.[id]
                || this._layout.buttons?.[id]
                || (this._layout.custom || []).find((c) => c.id === id);
            if (pos) this._applyItemPosition(el, pos);
        });
    },

    setItemPosition(id, rect) {
        const el = document.querySelector(`[data-touch-layout-id="${id}"]`);
        if (!el) return;
        const pos = {
            x: rect.x,
            y: window.innerHeight - rect.y - (rect.h || el.offsetHeight),
            w: rect.w || el.offsetWidth,
            h: rect.h || el.offsetHeight,
            anchor: 'bl',
        };
        if (this._layout.sticks?.[id]) {
            this._layout.sticks[id] = { ...this._layout.sticks[id], ...pos };
        } else if (this._layout.buttons?.[id]) {
            this._layout.buttons[id] = { ...this._layout.buttons[id], ...pos };
        } else {
            const custom = (this._layout.custom || []).find((c) => c.id === id);
            if (custom) Object.assign(custom, pos);
        }
        this._applyItemPosition(el, pos);
        this.saveLayout();
    },

    addCustomButton(action = 'interact', label = '+') {
        const id = `custom_${Date.now().toString(36)}`;
        const entry = {
            id,
            action,
            label: label.slice(0, 4),
            size: 48,
            x: 16,
            y: 160,
            w: 48,
            h: 48,
            anchor: 'bl',
        };
        this._layout.custom = this._layout.custom || [];
        this._layout.custom.push(entry);
        this.saveLayout();
        this._renderLayout();
        window.UI?.status?.(`Touch button added — drag to position, LOCK when done`);
    },

    resetLayout() {
        this._layout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
        this.saveLayout();
        this._renderLayout();
    },

    _wireAddButton() {
        document.getElementById('touch-add-btn')?.addEventListener('click', () => {
            const action = window.prompt(
                `Action id (${Object.keys(CONTROL_ACTIONS).slice(0, 8).join(', ')}…)`,
                'interact',
            );
            if (!action) return;
            if (!CONTROL_ACTIONS[action]) {
                window.UI?.status?.(`Unknown action "${action}" — pick from Keys menu list`);
                return;
            }
            const label = window.prompt('Button label (1–4 chars)', action.slice(0, 3).toUpperCase()) || 'BTN';
            this.addCustomButton(action, label);
        });
    },

    _autoEnabled() {
        const coarse = window.matchMedia('(pointer: coarse)').matches;
        const narrow = window.innerWidth < 900;
        return coarse || narrow;
    },

    _applyEnabled() {
        const editing = document.body.classList.contains('hub-layout-edit');
        this.enabled = this.userOverride === null ? this._autoEnabled() : this.userOverride;
        const root = document.getElementById('touch-controls');
        if (root) root.classList.toggle('visible', this.enabled || editing);
        document.body.classList.toggle('touch-on', this.enabled);
        document.body.classList.toggle('touch-off', !this.enabled && !editing);
    },

    setEnabled(on) {
        this.userOverride = !!on;
        ViewPrefs.set('touchControls', on ? 'on' : 'off');
        this._applyEnabled();
        window.UI?.updateTouchToggle?.();
    },

    toggle() {
        this.setEnabled(!this.enabled);
    },

    _bindButton(btn, action) {
        const hold = STANDARD_TOUCH_BUTTONS.find((b) => b.action === action)?.hold
            || ['aim', 'fire', 'sprint', 'crouch', 'stealthWalk', 'voipPtt'].includes(action);

        btn.addEventListener('pointerdown', (e) => {
            if (document.body.classList.contains('hub-layout-edit')) return;
            e.preventDefault();
            this.buttons[action] = true;
            btn.classList.add('pressed');
        });
        const up = () => {
            this.buttons[action] = false;
            btn.classList.remove('pressed');
        };
        btn.addEventListener('pointerup', up);
        btn.addEventListener('pointerleave', up);
        btn.addEventListener('pointercancel', up);
        if (!hold) btn.dataset.touchTap = '1';
    },

    _bindStick(zone, slot) {
        const knob = zone?.querySelector('.touch-knob');
        if (!zone || !knob) return;
        const maxR = 42;

        zone.addEventListener('pointerdown', (e) => {
            if (document.body.classList.contains('hub-layout-edit')) return;
            e.preventDefault();
            zone.setPointerCapture(e.pointerId);
            this._pointers.set(e.pointerId, { slot, startX: e.clientX, startY: e.clientY });
            this[slot].active = true;
        });

        zone.addEventListener('pointermove', (e) => {
            const p = this._pointers.get(e.pointerId);
            if (!p || p.slot !== slot) return;
            let dx = e.clientX - p.startX;
            let dy = e.clientY - p.startY;
            const len = Math.hypot(dx, dy);
            if (len > maxR) { dx = (dx / len) * maxR; dy = (dy / len) * maxR; }
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            this[slot].x = dx / maxR;
            this[slot].y = dy / maxR;
        });

        const end = (e) => {
            const p = this._pointers.get(e.pointerId);
            if (!p || p.slot !== slot) return;
            this._pointers.delete(e.pointerId);
            this[slot].active = false;
            this[slot].x = 0;
            this[slot].y = 0;
            knob.style.transform = '';
        };
        zone.addEventListener('pointerup', end);
        zone.addEventListener('pointercancel', end);
    },

    _bindCanvasGestures() {
        const canvas = document.querySelector('#canvas-container canvas');
        if (!canvas) return;
        canvas.addEventListener('pointerdown', (e) => this._onCanvasPointer(e));
        canvas.addEventListener('pointerup', (e) => this._onCanvasUp(e));
        canvas.addEventListener('pointermove', (e) => this._onCanvasMove(e));
        canvas.addEventListener('pointercancel', (e) => this._onCanvasUp(e));
    },

    _onCanvasPointer(e) {
        if (!this.enabled || e.target.closest('#touch-controls')) return;
        if (e.pointerType === 'touch') {
            this._holdPoint = { x: e.clientX, y: e.clientY, time: Date.now() };
            clearTimeout(this._holdTimer);
            this._holdTimer = setTimeout(() => {
                if (this._holdPoint) window.Engine?.openContextAtScreen?.(this._holdPoint.x, this._holdPoint.y);
                this._holdPoint = null;
            }, HOLD_MS);
        }
        const now = Date.now();
        if (this._lastTap && now - this._lastTap.time < DOUBLE_MS
            && Math.hypot(e.clientX - this._lastTap.x, e.clientY - this._lastTap.y) < 40) {
            clearTimeout(this._holdTimer);
            this._holdPoint = null;
            window.Engine?.openContextAtScreen?.(e.clientX, e.clientY);
            this._lastTap = null;
            return;
        }
        this._lastTap = { x: e.clientX, y: e.clientY, time: now };
    },

    _onCanvasMove(e) {
        if (this._holdPoint && Math.hypot(e.clientX - this._holdPoint.x, e.clientY - this._holdPoint.y) > 18) {
            clearTimeout(this._holdTimer);
            this._holdPoint = null;
        }
    },

    _onCanvasUp() {
        clearTimeout(this._holdTimer);
        this._holdPoint = null;
    },

    applyToControls(Controls) {
        if (!this.enabled) return;
        const dead = 0.2;
        if (this.left.active) {
            if (this.left.y < -dead) Controls.gamepadActions.forward = true;
            if (this.left.y > dead) Controls.gamepadActions.back = true;
            if (this.left.x < -dead) Controls.gamepadActions.left = true;
            if (this.left.x > dead) Controls.gamepadActions.right = true;
        }
        if (this.right.active) {
            Controls.cameraStick.x = this.right.x;
            Controls.cameraStick.y = this.right.y;
        }

        const holdActions = ['aim', 'sprint', 'crouch', 'stealthWalk', 'voipPtt', 'fire'];
        holdActions.forEach((action) => {
            if (this.buttons[action]) {
                if (action === 'fire') Controls.mouseHeld.Mouse2 = true;
                else Controls.gamepadActions[action] = true;
            }
        });

        const edgeActions = [
            'jump', 'interact', 'reload', 'melee', 'holster', 'thirdEye',
            'enterVehicle', 'flashlight', 'toggleView', 'pause', 'emote', 'horn',
        ];
        edgeActions.forEach((action) => {
            if (!this.buttons[action]) {
                this._edgeLatches[action] = false;
                return;
            }
            if (!this._edgeLatches[action]) {
                Controls.justPressed[action] = true;
                this._edgeLatches[action] = true;
            }
        });
    },
};

window.TouchControls = TouchControls;
window.STANDARD_TOUCH_BUTTONS = STANDARD_TOUCH_BUTTONS;