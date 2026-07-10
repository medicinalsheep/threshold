import { ViewPrefs } from './viewPrefs.js';
import { CONTROL_ACTIONS } from './controls.js';

const HOLD_MS = 480;
const DOUBLE_MS = 380;
/** Bump when default visible set / positions change so users get new lean layout once */
const LAYOUT_KEY = 'touchLayoutV4';
const STICK_SIZE = 128;
const BTN_SIZE = 52;

/**
 * Catalog of touch actions — all wired in applyToControls when visible.
 * Only CORE_TOUCH_IDS ship visible by default; others add via + BTN (layout unlock).
 */
export const STANDARD_TOUCH_BUTTONS = [
    { id: 'jump', action: 'jump', label: 'JMP', size: 52 },
    { id: 'sprint', action: 'sprint', label: 'RUN', size: 48 },
    { id: 'crouch', action: 'crouch', label: 'CRH', size: 44 },
    { id: 'aim', action: 'aim', label: 'ADS', size: 58, hold: true },
    { id: 'fire', action: 'fire', label: '●', size: 64, hold: true },
    { id: 'reload', action: 'reload', label: 'R', size: 46 },
    { id: 'melee', action: 'melee', label: 'ATK', size: 44 },
    { id: 'holster', action: 'holster', label: 'H', size: 40 },
    { id: 'interact', action: 'interact', label: 'F', size: 54 },
    { id: 'thirdEye', action: 'thirdEye', label: '👁', size: 46 },
    { id: 'uiMouse', action: 'uiMouse', label: 'UI', size: 46 },
    { id: 'enterVehicle', action: 'enterVehicle', label: 'VEH', size: 46 },
    { id: 'flashlight', action: 'flashlight', label: 'LIT', size: 40 },
    { id: 'toggleView', action: 'toggleView', label: 'FPS', size: 42 },
    { id: 'pause', action: 'pause', label: 'II', size: 42 },
];

/** Always on when touch UI is enabled — move / look + essentials */
export const CORE_TOUCH_IDS = ['jump', 'sprint', 'interact', 'pause'];

/**
 * Coordinates: bottom-left origin unless anchor 'br'/'tr' (x negative = left from right edge).
 */
const DEFAULT_LAYOUT = {
    sticks: {
        'stick-left': { x: 20, y: 28, w: STICK_SIZE, h: STICK_SIZE, anchor: 'bl' },
        'stick-right': { x: -148, y: 24, w: STICK_SIZE, h: STICK_SIZE, anchor: 'br' },
    },
    buttons: {
        sprint: { x: 158, y: 36, w: 52, h: 48, anchor: 'bl' },
        crouch: { x: 158, y: 96, w: 48, h: 48, anchor: 'bl' },

        fire: { x: -42, y: 162, w: 64, h: 64, anchor: 'br' },
        aim: { x: -118, y: 168, w: 58, h: 58, anchor: 'br' },
        jump: { x: -48, y: 236, w: 52, h: 52, anchor: 'br' },
        reload: { x: -188, y: 168, w: 46, h: 46, anchor: 'br' },
        melee: { x: -188, y: 224, w: 44, h: 44, anchor: 'br' },

        interact: { x: -258, y: 175, w: 54, h: 54, anchor: 'br' },
        enterVehicle: { x: -258, y: 238, w: 46, h: 46, anchor: 'br' },
        thirdEye: { x: -318, y: 175, w: 46, h: 46, anchor: 'br' },
        uiMouse: { x: -318, y: 230, w: 46, h: 46, anchor: 'br' },

        pause: { x: -16, y: 16, w: 42, h: 42, anchor: 'tr' },
        toggleView: { x: -66, y: 16, w: 42, h: 42, anchor: 'tr' },
        flashlight: { x: -116, y: 16, w: 40, h: 40, anchor: 'tr' },
        holster: { x: -162, y: 16, w: 40, h: 40, anchor: 'tr' },
    },
    custom: [],
    /** Non-core buttons start hidden — add via + BTN when unlocked */
    hidden: STANDARD_TOUCH_BUTTONS.map((b) => b.id).filter((id) => !CORE_TOUCH_IDS.includes(id)),
};

function loadLayout() {
    const saved = ViewPrefs.get(LAYOUT_KEY, null);
    if (!saved) return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
    const coreHidden = STANDARD_TOUCH_BUTTONS.map((b) => b.id).filter((id) => !CORE_TOUCH_IDS.includes(id));
    const hidden = Array.isArray(saved.hidden)
        ? [...new Set(saved.hidden)]
        : coreHidden;
    return {
        sticks: { ...DEFAULT_LAYOUT.sticks, ...saved.sticks },
        buttons: { ...DEFAULT_LAYOUT.buttons, ...saved.buttons },
        custom: saved.custom || [],
        hidden,
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
    _contextVisible: new Set(),

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

    isButtonVisible(id) {
        if ((this._layout.hidden || []).includes(id)) return false;
        if (this._contextVisible.has(id)) return true;
        return CORE_TOUCH_IDS.includes(id)
            || !!(this._layout.buttons?.[id] && !(this._layout.hidden || []).includes(id));
    },

    /**
     * Context show/hide for situational actions (e.g. vehicle near player).
     * Does not permanently unhide in saved layout.
     */
    setContextVisible(id, on) {
        const was = this._contextVisible.has(id);
        if (on) this._contextVisible.add(id);
        else this._contextVisible.delete(id);
        if (was !== on) this._renderLayout();
    },

    _syncEditMode() {
        const editing = document.body.classList.contains('hub-layout-edit');
        const root = document.getElementById('touch-controls');
        const addBtn = document.getElementById('touch-add-btn');
        if (root) root.classList.toggle('touch-layout-edit', editing);
        if (addBtn) addBtn.hidden = !editing;
        if (editing) root?.classList.add('visible');
        this._renderLayout();
    },

    _isHidden(id) {
        const editing = document.body.classList.contains('hub-layout-edit');
        const permanentlyHidden = (this._layout.hidden || []).includes(id);
        if (editing) {
            // In unlock mode show all standard buttons so user can position / unhide
            return false;
        }
        if (!permanentlyHidden) return false;
        // Context can temporarily surface a hidden wired action
        return !this._contextVisible.has(id);
    },

    _renderLayout() {
        const root = document.getElementById('touch-layout-root');
        if (!root) return;
        root.innerHTML = '';

        const editing = document.body.classList.contains('hub-layout-edit');

        Object.entries(this._layout.sticks || {}).forEach(([id, pos]) => {
            if (this._isHidden(id) && !editing) return;
            if ((this._layout.hidden || []).includes(id) && !editing) return;
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

        STANDARD_TOUCH_BUTTONS.forEach((def) => {
            const permanentlyHidden = (this._layout.hidden || []).includes(def.id);
            if (!editing && permanentlyHidden && !this._contextVisible.has(def.id)) return;
            const pos = this._layout.buttons?.[def.id] || DEFAULT_LAYOUT.buttons[def.id];
            if (!pos) return;
            const el = this._createButtonEl(def.id, def.action, def.label, def.size || BTN_SIZE, pos);
            if (editing && permanentlyHidden) {
                el.classList.add('touch-btn-dormant');
                el.title = `${CONTROL_ACTIONS[def.action]?.label || def.action} — double-tap to enable`;
            } else if (editing) {
                el.title = `${CONTROL_ACTIONS[def.action]?.label || def.action} — double-tap to hide`;
            }
            root.appendChild(el);
        });

        (this._layout.custom || []).forEach((c) => {
            if (!editing && (this._layout.hidden || []).includes(c.id)) return;
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
        this._bindButton(btn, action, id);
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

    /** Enable a built-in (remove from hidden) or add a custom action button. */
    addOrShowAction(action = 'interact', label = '+') {
        const builtIn = STANDARD_TOUCH_BUTTONS.find((b) => b.action === action);
        if (builtIn) {
            this._layout.hidden = (this._layout.hidden || []).filter((id) => id !== builtIn.id);
            if (!this._layout.buttons[builtIn.id]) {
                this._layout.buttons[builtIn.id] = {
                    ...(DEFAULT_LAYOUT.buttons[builtIn.id] || {
                        x: 16, y: 160, w: 48, h: 48, anchor: 'bl',
                    }),
                };
            }
            this.saveLayout();
            this._renderLayout();
            window.UI?.status?.(`${CONTROL_ACTIONS[action]?.label || action} touch button shown — drag to place, LOCK when done`);
            return builtIn.id;
        }
        return this.addCustomButton(action, label);
    },

    hideButton(id) {
        if (!id || id.startsWith('stick-')) return;
        if (CORE_TOUCH_IDS.includes(id) && !id.startsWith('custom_')) {
            // Allow hiding core too if user insists, but warn
            window.UI?.status?.('Core control hidden — restore via + BTN');
        }
        this._layout.hidden = [...new Set([...(this._layout.hidden || []), id])];
        // custom: also remove from list if permanently hidden
        if (String(id).startsWith('custom_')) {
            this._layout.custom = (this._layout.custom || []).filter((c) => c.id !== id);
            this._layout.hidden = (this._layout.hidden || []).filter((h) => h !== id);
        }
        this.saveLayout();
        this._renderLayout();
        window.UI?.status?.('Touch button hidden');
    },

    toggleBuiltInVisible(id) {
        const hidden = new Set(this._layout.hidden || []);
        if (hidden.has(id)) {
            hidden.delete(id);
            this._layout.hidden = [...hidden];
            this.saveLayout();
            this._renderLayout();
            window.UI?.status?.('Touch button enabled');
        } else {
            this.hideButton(id);
        }
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
        window.UI?.status?.('Touch button added — drag to position, LOCK when done');
        return id;
    },

    resetLayout() {
        this._layout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
        this.saveLayout();
        this._renderLayout();
        window.UI?.status?.('Touch layout reset — core buttons only');
    },

    _wireAddButton() {
        document.getElementById('touch-add-btn')?.addEventListener('click', () => {
            window.TouchActionPicker?.open?.(({ action, label }) => {
                this.addOrShowAction(action, label);
            }, 'fire');
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

    _bindButton(btn, action, id) {
        const hold = STANDARD_TOUCH_BUTTONS.find((b) => b.action === action)?.hold
            || ['aim', 'fire', 'sprint', 'crouch', 'stealthWalk', 'voipPtt'].includes(action);

        let lastTap = 0;
        btn.addEventListener('pointerdown', (e) => {
            if (document.body.classList.contains('hub-layout-edit')) {
                // Double-tap in unlock mode toggles hide/show for built-ins
                const now = Date.now();
                if (now - lastTap < DOUBLE_MS && id) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleBuiltInVisible(id);
                    lastTap = 0;
                    return;
                }
                lastTap = now;
                return;
            }
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
            'uiMouse',
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
