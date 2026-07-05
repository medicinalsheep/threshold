const STORAGE_HOST = 'threshold_bindings_host';
const STORAGE_USER = 'threshold_bindings_user';

export const CONTROL_ACTIONS = {
    forward: { label: 'Move Forward', group: 'movement' },
    back: { label: 'Move Back', group: 'movement' },
    left: { label: 'Move Left', group: 'movement' },
    right: { label: 'Move Right', group: 'movement' },
    up: { label: 'Fly Up', group: 'movement' },
    down: { label: 'Fly Down / Descend', group: 'movement' },
    jump: { label: 'Jump', group: 'movement' },
    sprint: { label: 'Sprint / Run', group: 'movement' },
    interact: { label: 'Interact / Insert Menu', group: 'general' },
    toggleMode: { label: 'Toggle Walk / Fly', group: 'general' },
    pause: { label: 'Pause Scene (host)', group: 'host', hostOnly: true }
};

/** GTA V–style defaults (Xbox mapping in browser Gamepad API) */
const DEFAULT_HOST_BINDINGS = {
    forward: ['KeyW', 'ArrowUp'],
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    up: ['KeyQ'],
    down: ['KeyE', 'KeyC'],
    jump: ['Space'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    interact: ['KeyX'],
    toggleMode: ['KeyF'],
    pause: ['KeyP']
};

const DEFAULT_USER_BINDINGS = {
    forward: ['KeyW', 'ArrowUp'],
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    up: ['KeyQ'],
    down: ['KeyE', 'KeyC'],
    jump: ['Space'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    interact: ['KeyX'],
    toggleMode: ['KeyF'],
    pause: []
};

/** Button indices: 0=A 1=B 2=X 3=Y 4=LB 5=RB 6=LT 7=RT 8=Back 9=Start 10=L3 11=R3 */
export const GTA_GAMEPAD = {
    jump: 0,
    descend: 1,
    interact: 2,
    toggleMode: 3,
    flyUp: 4,
    flyDown: 5,
    precision: 6,
    sprint: 7,
    bindingsMenu: 8,
    pause: 9,
    sprintToggle: 10,
    cameraReset: 11
};

const KEY_LABELS = {
    KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyQ: 'Q', KeyE: 'E', KeyC: 'C',
    KeyF: 'F', KeyP: 'P', KeyX: 'X', Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Shift',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→'
};

const GAMEPAD_DEADZONE = 0.18;

function cloneDefaults(profile) {
    const src = profile === 'host' ? DEFAULT_HOST_BINDINGS : DEFAULT_USER_BINDINGS;
    return JSON.parse(JSON.stringify(src));
}

function loadProfile(profile) {
    const key = profile === 'host' ? STORAGE_HOST : STORAGE_USER;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return cloneDefaults(profile);
        const parsed = JSON.parse(raw);
        const base = cloneDefaults(profile);
        Object.keys(base).forEach((action) => {
            if (Array.isArray(parsed[action])) base[action] = parsed[action];
        });
        return base;
    } catch {
        return cloneDefaults(profile);
    }
}

function saveProfile(profile, bindings) {
    const storageKey = profile === 'host' ? STORAGE_HOST : STORAGE_USER;
    localStorage.setItem(storageKey, JSON.stringify(bindings));
}

export const Controls = {
    bindings: { host: loadProfile('host'), user: loadProfile('user') },
    sessionHostBindings: null,
    gamepad: null,
    gamepadName: '',
    gamepadActions: {},
    cameraStick: { x: 0, y: 0 },
    justPressed: {},
    _prevButtons: {},
    _rebind: null,
    _sprintToggle: false,

    init() {
        window.addEventListener('gamepadconnected', (e) => {
            this.gamepad = e.gamepad;
            this.gamepadName = e.gamepad.id;
            window.UI?.updateGamepadStatus?.();
        });
        window.addEventListener('gamepaddisconnected', () => {
            this.gamepad = null;
            this.gamepadName = '';
            this.gamepadActions = {};
            window.UI?.updateGamepadStatus?.();
        });
        window.addEventListener('keydown', (e) => {
            if (!this._rebind) return;
            e.preventDefault();
            this._finishRebind(e.code);
        });
    },

    getProfile() {
        const mode = window.Network?.mode;
        if (mode === 'guest') return 'user';
        return 'host';
    },

    getActiveBindings() {
        const profile = this.getProfile();
        if (profile === 'host') return this.bindings.host;

        const base = this.sessionHostBindings || this.bindings.host;
        const user = this.bindings.user;
        const merged = cloneDefaults('user');
        Object.keys(merged).forEach((action) => {
            merged[action] = (user[action]?.length) ? user[action] : (base[action] || merged[action]);
        });
        return merged;
    },

    exportHostBindings() {
        return JSON.parse(JSON.stringify(this.bindings.host));
    },

    applySessionHostBindings(bindings) {
        if (!bindings) return;
        this.sessionHostBindings = JSON.parse(JSON.stringify(bindings));
        window.UI?.updateControlsHint?.();
    },

    setHostBindings(bindings, persist = true) {
        this.bindings.host = JSON.parse(JSON.stringify(bindings));
        if (persist) saveProfile('host', this.bindings.host);
    },

    saveHostAndBroadcast() {
        saveProfile('host', this.bindings.host);
        if (window.Network?.mode === 'host') window.Network.scheduleBroadcast();
    },

    formatCode(code) {
        return KEY_LABELS[code] || code.replace('Key', '');
    },

    formatActionBindings(action) {
        const codes = this.getActiveBindings()[action] || [];
        return codes.map((c) => this.formatCode(c)).join(', ') || '—';
    },

    getActionForCode(code) {
        const bindings = this.getActiveBindings();
        for (const [action, codes] of Object.entries(bindings)) {
            if (codes.includes(code)) return action;
        }
        return null;
    },

    isAction(action) {
        const codes = this.getActiveBindings()[action] || [];
        const keys = window.State?.keys || {};
        if (codes.some((c) => keys[c])) return true;
        if (action === 'sprint' && this._sprintToggle) return true;
        return !!this.gamepadActions[action];
    },

    getSprintMultiplier() {
        return this.isAction('sprint') ? 1.85 : 1;
    },

    consumeJustPressed(action) {
        if (this.justPressed[action]) {
            delete this.justPressed[action];
            return true;
        }
        return false;
    },

    canUse(action) {
        if (action === 'pause') return window.Permissions?.canPause?.() ?? false;
        if (action === 'interact' && window.State?.isPaused) return false;
        return true;
    },

    pollGamepad() {
        this.gamepadActions = {};
        this.cameraStick = { x: 0, y: 0 };
        const prevJust = { ...this.justPressed };
        this.justPressed = {};

        window.TouchControls?.applyToControls?.(this);

        const pads = navigator.getGamepads?.();
        if (!pads) return;

        let pad = this.gamepad;
        if (!pad?.connected) {
            pad = pads.find((p) => p?.connected) || null;
            if (pad) { this.gamepad = pad; this.gamepadName = pad.id; }
        }
        if (!pad?.connected) return;

        const ax = pad.axes[0] || 0;
        const ay = pad.axes[1] || 0;
        const rx = pad.axes[2] || 0;
        const ry = pad.axes[3] || 0;

        if (ay < -GAMEPAD_DEADZONE) this.gamepadActions.forward = true;
        if (ay > GAMEPAD_DEADZONE) this.gamepadActions.back = true;
        if (ax < -GAMEPAD_DEADZONE) this.gamepadActions.left = true;
        if (ax > GAMEPAD_DEADZONE) this.gamepadActions.right = true;

        if (Math.abs(rx) > GAMEPAD_DEADZONE || Math.abs(ry) > GAMEPAD_DEADZONE) {
            this.cameraStick.x = rx;
            this.cameraStick.y = ry;
        }

        if (pad.buttons[GTA_GAMEPAD.jump]?.pressed) this.gamepadActions.jump = true;
        if (pad.buttons[GTA_GAMEPAD.sprint]?.pressed) this.gamepadActions.sprint = true;
        if (pad.buttons[GTA_GAMEPAD.flyUp]?.pressed) this.gamepadActions.up = true;
        if (pad.buttons[GTA_GAMEPAD.flyDown]?.pressed || pad.buttons[GTA_GAMEPAD.descend]?.pressed) {
            this.gamepadActions.down = true;
        }
        if (pad.buttons[GTA_GAMEPAD.toggleMode]?.pressed) this.gamepadActions.toggleMode = true;

        const edge = (idx, action) => {
            const pressed = !!pad.buttons[idx]?.pressed;
            if (pressed && !this._prevButtons[idx]) this.justPressed[action] = true;
            this._prevButtons[idx] = pressed;
        };

        edge(GTA_GAMEPAD.toggleMode, 'toggleMode');
        edge(GTA_GAMEPAD.interact, 'interact');
        edge(GTA_GAMEPAD.bindingsMenu, 'bindingsMenu');
        edge(GTA_GAMEPAD.cameraReset, 'cameraReset');
        if (this.canUse('pause')) edge(GTA_GAMEPAD.pause, 'pause');
        if (pad.buttons[GTA_GAMEPAD.sprintToggle]?.pressed && !this._prevButtons[10]) {
            this._sprintToggle = !this._sprintToggle;
        }
        this._prevButtons[10] = !!pad.buttons[GTA_GAMEPAD.sprintToggle]?.pressed;

        Object.keys(prevJust).forEach((k) => {
            if (prevJust[k] && k.startsWith('touch_')) this.justPressed[k] = true;
        });
    },

    applyCameraStick() {
        const { x, y } = this.cameraStick;
        if (Math.abs(x) < GAMEPAD_DEADZONE && Math.abs(y) < GAMEPAD_DEADZONE) return;
        const Engine = window.Engine;
        if (!Engine?.camera || !Engine.controls) return;

        const offset = Engine.camera.position.clone().sub(Engine.controls.target);
        const THREE = window.THREE;
        if (!THREE) return;
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta -= x * 0.045;
        spherical.phi = Math.max(0.12, Math.min(Math.PI - 0.12, spherical.phi + y * 0.035));
        offset.setFromSpherical(spherical);
        Engine.camera.position.copy(Engine.controls.target).add(offset);
        Engine.camera.lookAt(Engine.controls.target);
    },

    resetCameraBehindPlayer() {
        const PC = window.PlayerController;
        const Engine = window.Engine;
        if (!PC?.spawned || !Engine?.camera) return;
        const target = PC.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        const back = new THREE.Vector3(0, 0, 4);
        Engine.camera.position.copy(target).add(back);
        Engine.controls.target.copy(target);
    },

    getHint() {
        const profile = this.getProfile() === 'host' ? 'Host' : 'Guest';
        const admin = window.Session?.isAdmin?.(window.Session?.playerKey) ? ' · Admin' : '';
        const mode = window.State?.controlMode === 'walk' && window.PlayerController?.spawned ? 'walk' : 'fly';
        const pad = this.gamepad ? ' · pad' : '';
        const touch = window.TouchControls?.enabled ? ' · touch' : '';
        if (mode === 'walk') {
            return `${profile}${admin}: WASD/stick move · Space/A jump · RT sprint${pad}${touch}`;
        }
        return `${profile}${admin}: WASD/stick fly · RB/B down · LB/Q up · Y toggle${pad}${touch}`;
    },

    startRebind(profile, action, onDone) {
        if (profile === 'host' && window.Network?.mode === 'guest') {
            onDone?.(false);
            return;
        }
        this._rebind = { profile, action, onDone };
    },

    _finishRebind(code) {
        if (!this._rebind) return;
        const { profile, action, onDone } = this._rebind;
        this._rebind = null;
        if (code === 'Escape') { onDone?.(false); return; }

        const list = this.bindings[profile][action] || [];
        if (!list.includes(code)) list.unshift(code);
        this.bindings[profile][action] = list.slice(0, 2);
        saveProfile(profile, this.bindings[profile]);
        if (profile === 'host') this.saveHostAndBroadcast();
        onDone?.(true);
    },

    clearBinding(profile, action) {
        this.bindings[profile][action] = [];
        saveProfile(profile, this.bindings[profile]);
        if (profile === 'host') this.saveHostAndBroadcast();
    },

    resetProfile(profile) {
        this.bindings[profile] = cloneDefaults(profile);
        saveProfile(profile, this.bindings[profile]);
        if (profile === 'host') this.saveHostAndBroadcast();
    },

    renderEditor(profile) {
        const list = document.getElementById('bindings-list');
        const note = document.getElementById('bindings-sync-note');
        if (!list) return;

        const isHostProfile = profile === 'host';
        const canEditHost = window.Permissions?.canEditHostBindings?.();
        if (note) {
            if (profile === 'host') {
                note.textContent = canEditHost
                    ? 'Host bindings sync live to all joined players (they can override personally in Guest profile).'
                    : 'Host bindings are read-only for guests — edit your Guest profile for personal overrides.';
            } else {
                note.textContent = 'Guest profile saves on this device only — overrides host defaults per action.';
            }
        }

        list.innerHTML = Object.entries(CONTROL_ACTIONS)
            .filter(([, meta]) => !meta.hostOnly || isHostProfile)
            .map(([action, meta]) => {
                const locked = isHostProfile && !canEditHost;
                return `
                <div class="binding-row" data-action="${action}">
                    <span class="binding-label">${meta.label}</span>
                    <button type="button" class="binding-key btn-sm" data-bind="${action}" ${locked ? 'disabled' : ''}>
                        ${(this.bindings[profile][action] || []).map((c) => this.formatCode(c)).join(', ') || (locked ? 'Host only' : 'Click to bind')}
                    </button>
                    ${locked ? '' : `<button type="button" class="binding-clear btn-sm" data-clear="${action}" title="Clear">✕</button>`}
                </div>`;
            }).join('');
    }
};

window.Controls = Controls;