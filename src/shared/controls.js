const STORAGE_KB_HOST = 'threshold_bindings_host';
const STORAGE_KB_USER = 'threshold_bindings_user';
const STORAGE_GP_HOST = 'threshold_gamepad_host';
const STORAGE_GP_USER = 'threshold_gamepad_user';

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
    pause: { label: 'Pause Scene (host)', group: 'host', hostOnly: true },
    bindingsMenu: { label: 'Open Keys Menu', group: 'general' },
    cameraReset: { label: 'Reset Camera Behind Player', group: 'general' },
    fire: { label: 'Fire / Shoot', group: 'general' },
    aim: { label: 'Aim Down Sights (hold)', group: 'general' },
    toggleView: { label: 'Toggle FPS / TPS', group: 'general' },
    thirdEye: { label: 'Third Eye (awareness)', group: 'general' },
};

export const GAMEPAD_BUTTON_LABELS = {
    0: 'A / Cross', 1: 'B / Circle', 2: 'X / Square', 3: 'Y / Triangle',
    4: 'LB / L1', 5: 'RB / R1', 6: 'LT / L2', 7: 'RT / R2',
    8: 'Select / Share', 9: 'Start / Options', 10: 'L3', 11: 'R3',
    12: 'D-Up', 13: 'D-Down', 14: 'D-Left', 15: 'D-Right'
};

/** Standard gamepad defaults — browser Gamepad API button indices */
const DEFAULT_GAMEPAD_BINDINGS = {
    jump: 0,       // A / Cross
    down: 1,       // B / Circle — descend / crouch fly
    interact: 2,     // X / Square
    toggleMode: 3,   // Y / Triangle — walk/fly toggle
    up: 4,         // LB / L1 — fly up
    sprint: 10,    // L3 — left stick press (not RT)
    bindingsMenu: 8,
    pause: 9,
    cameraReset: 11,
    fire: 7,
    aim: 6,
    toggleView: 13,
    thirdEye: 12,
};

const DEFAULT_HOST_KEYBOARD = {
    forward: ['KeyW', 'ArrowUp'],
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    up: ['KeyQ'],
    down: ['KeyC'],
    jump: ['Space'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    interact: ['KeyE'],
    toggleMode: ['KeyF'],
    pause: ['KeyP'],
    bindingsMenu: [],
    cameraReset: [],
    fire: ['KeyG'],
    aim: ['KeyR'],
    toggleView: ['KeyV'],
    thirdEye: ['KeyT'],
};

const DEFAULT_USER_KEYBOARD = {
    ...DEFAULT_HOST_KEYBOARD,
    pause: [],
    bindingsMenu: [],
    cameraReset: []
};

const KEY_LABELS = {
    KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyQ: 'Q', KeyE: 'E', KeyC: 'C',
    KeyF: 'F', KeyG: 'G', KeyP: 'P', KeyR: 'R', KeyT: 'T', KeyV: 'V', KeyX: 'X', Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Shift',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→'
};

const GAMEPAD_DEADZONE = 0.18;
const EDGE_ACTIONS = new Set(['toggleMode', 'interact', 'bindingsMenu', 'cameraReset', 'pause', 'fire', 'toggleView', 'thirdEye']);

function cloneKbDefaults(profile) {
    const src = profile === 'host' ? DEFAULT_HOST_KEYBOARD : DEFAULT_USER_KEYBOARD;
    return JSON.parse(JSON.stringify(src));
}

function cloneGpDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_GAMEPAD_BINDINGS));
}

function loadKeyboard(profile) {
    const key = profile === 'host' ? STORAGE_KB_HOST : STORAGE_KB_USER;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return cloneKbDefaults(profile);
        const parsed = JSON.parse(raw);
        const base = cloneKbDefaults(profile);
        Object.keys(base).forEach((action) => {
            if (Array.isArray(parsed[action])) base[action] = parsed[action];
        });
        return base;
    } catch {
        return cloneKbDefaults(profile);
    }
}

function loadGamepad(profile) {
    const key = profile === 'host' ? STORAGE_GP_HOST : STORAGE_GP_USER;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return cloneGpDefaults();
        const parsed = JSON.parse(raw);
        const base = cloneGpDefaults();
        if (parsed._overrides) base._overrides = { ...parsed._overrides };
        Object.keys(base).forEach((action) => {
            if (typeof parsed[action] === 'number') base[action] = parsed[action];
        });
        if (base.sprint === 7 && !parsed._overrides?.sprint) base.sprint = 10;
        return base;
    } catch {
        return cloneGpDefaults();
    }
}

function saveKeyboard(profile, bindings) {
    localStorage.setItem(profile === 'host' ? STORAGE_KB_HOST : STORAGE_KB_USER, JSON.stringify(bindings));
}

function saveGamepad(profile, bindings) {
    localStorage.setItem(profile === 'host' ? STORAGE_GP_HOST : STORAGE_GP_USER, JSON.stringify(bindings));
}

export const Controls = {
    bindings: { host: loadKeyboard('host'), user: loadKeyboard('user') },
    gamepadBindings: { host: loadGamepad('host'), user: loadGamepad('user') },
    sessionHostBindings: null,
    sessionHostGamepad: null,
    gamepad: null,
    gamepadName: '',
    gamepadActions: {},
    cameraStick: { x: 0, y: 0 },
    justPressed: {},
    _prevButtons: {},
    _rebind: null,
    _rebindGamepad: null,
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
            if (this._rebindGamepad && e.code === 'Escape') {
                this._cancelGamepadRebind();
                return;
            }
            if (!this._rebind) return;
            e.preventDefault();
            this._finishKeyboardRebind(e.code);
        });
    },

    getProfile() {
        const mode = window.Network?.mode;
        if (mode === 'guest') return 'user';
        return 'host';
    },

    _mergeKeyboard(profile) {
        if (profile === 'host') return this.bindings.host;
        const base = this.sessionHostBindings || this.bindings.host;
        const user = this.bindings.user;
        const merged = cloneKbDefaults('user');
        Object.keys(merged).forEach((action) => {
            merged[action] = (user[action]?.length) ? user[action] : (base[action] || merged[action]);
        });
        return merged;
    },

    _mergeGamepad(profile) {
        if (profile === 'host') return this.gamepadBindings.host;
        const base = this.sessionHostGamepad || this.gamepadBindings.host;
        const user = this.gamepadBindings.user;
        const merged = cloneGpDefaults();
        Object.keys(merged).forEach((action) => {
            const userVal = user[action];
            const hasOverride = user._overrides?.[action];
            merged[action] = hasOverride ? userVal : (base[action] ?? merged[action]);
        });
        return merged;
    },

    getActiveBindings() {
        return this._mergeKeyboard(this.getProfile());
    },

    getActiveGamepadMap() {
        return this._mergeGamepad(this.getProfile());
    },

    exportHostBindings() {
        return JSON.parse(JSON.stringify(this.bindings.host));
    },

    exportHostGamepad() {
        return JSON.parse(JSON.stringify(this.gamepadBindings.host));
    },

    exportHostControls() {
        return {
            keyboard: this.exportHostBindings(),
            gamepad: this.exportHostGamepad()
        };
    },

    applySessionHostBindings(bindings) {
        if (!bindings) return;
        if (bindings.keyboard) {
            this.sessionHostBindings = JSON.parse(JSON.stringify(bindings.keyboard));
        } else if (!bindings.gamepad) {
            this.sessionHostBindings = JSON.parse(JSON.stringify(bindings));
        }
        if (bindings.gamepad) {
            this.sessionHostGamepad = JSON.parse(JSON.stringify(bindings.gamepad));
        }
        window.UI?.updateControlsHint?.();
    },

    setHostBindings(bindings, persist = true) {
        if (bindings.keyboard) {
            this.bindings.host = JSON.parse(JSON.stringify(bindings.keyboard));
            if (persist) saveKeyboard('host', this.bindings.host);
        } else {
            this.bindings.host = JSON.parse(JSON.stringify(bindings));
            if (persist) saveKeyboard('host', this.bindings.host);
        }
        if (bindings.gamepad) {
            this.gamepadBindings.host = JSON.parse(JSON.stringify(bindings.gamepad));
            if (persist) saveGamepad('host', this.gamepadBindings.host);
        }
    },

    saveHostAndBroadcast() {
        saveKeyboard('host', this.bindings.host);
        saveGamepad('host', this.gamepadBindings.host);
        if (window.Network?.mode === 'host') window.Network.scheduleBroadcast();
    },

    formatCode(code) {
        return KEY_LABELS[code] || code.replace('Key', '');
    },

    formatGamepadButton(idx) {
        if (typeof idx !== 'number') return '—';
        return GAMEPAD_BUTTON_LABELS[idx] || `Btn ${idx}`;
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

    _btnIndex(action) {
        const map = this.getActiveGamepadMap();
        return typeof map[action] === 'number' ? map[action] : null;
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

        if (this._rebindGamepad) this._pollGamepadRebind();

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

        const gp = this.getActiveGamepadMap();
        const press = (action) => {
            const idx = gp[action];
            return typeof idx === 'number' && !!pad.buttons[idx]?.pressed;
        };

        if (press('jump')) this.gamepadActions.jump = true;
        if (press('sprint')) this.gamepadActions.sprint = true;
        if (press('aim')) this.gamepadActions.aim = true;
        if (press('up')) this.gamepadActions.up = true;
        if (press('down')) this.gamepadActions.down = true;

        const edge = (action) => {
            const idx = gp[action];
            if (typeof idx !== 'number') return;
            const pressed = !!pad.buttons[idx]?.pressed;
            if (EDGE_ACTIONS.has(action) && pressed && !this._prevButtons[idx]) {
                this.justPressed[action] = true;
            }
            this._prevButtons[idx] = pressed;
        };

        edge('toggleMode');
        edge('interact');
        edge('fire');
        edge('toggleView');
        edge('thirdEye');
        edge('bindingsMenu');
        edge('cameraReset');
        if (this.canUse('pause')) edge('pause');

        Object.keys(prevJust).forEach((k) => {
            if (prevJust[k] && k.startsWith('touch_')) this.justPressed[k] = true;
        });
    },

    _pollGamepadRebind() {
        const pads = navigator.getGamepads?.();
        const pad = pads?.find((p) => p?.connected);
        if (!pad) return;
        for (let i = 0; i < pad.buttons.length; i++) {
            if (pad.buttons[i]?.pressed) {
                this._finishGamepadRebind(i);
                return;
            }
        }
    },

    applyCameraStick() {
        const { x, y } = this.cameraStick;
        if (Math.abs(x) < GAMEPAD_DEADZONE && Math.abs(y) < GAMEPAD_DEADZONE) return;

        const State = window.State;
        const PC = window.PlayerController;
        if (State?.controlMode === 'walk' && PC?.spawned && !State?.isPaused) {
            PC.applyLookInput(x * 14, y * 14, 1.2);
            return;
        }

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
        PC.resetCameraBehind?.();
        const target = PC.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        Engine.controls.target.copy(target);
    },

    getHint() {
        const profile = this.getProfile() === 'host' ? 'Host' : 'Guest';
        const admin = window.Session?.isAdmin?.(window.Session?.playerKey) ? ' · Admin' : '';
        const mode = window.State?.controlMode === 'walk' && window.PlayerController?.spawned ? 'walk' : 'fly';
        const pad = this.gamepad ? ' · pad' : '';
        const touch = window.TouchControls?.enabled ? ' · touch' : '';
        if (mode === 'walk') {
            const view = window.State?.viewMode === 'fps' ? 'FPS' : 'TPS';
            const lock = window.Engine?._lookPointerLocked ? ' · mouse aim' : ' · click canvas to aim';
            return `${profile}${admin}: ${view} · WASD · Shift sprint · V view · T Third Eye · E interact${lock}${pad}${touch}`;
        }
        return `${profile}${admin}: fly · Y toggle · R-stick cam${pad}${touch}`;
    },

    startKeyboardRebind(profile, action, onDone) {
        if (profile === 'host' && window.Network?.mode === 'guest') { onDone?.(false); return; }
        this._rebind = { profile, action, onDone };
    },

    startGamepadRebind(profile, action, onDone) {
        if (profile === 'host' && window.Network?.mode === 'guest') { onDone?.(false); return; }
        this._rebindGamepad = { profile, action, onDone };
    },

    _finishKeyboardRebind(code) {
        if (!this._rebind) return;
        const { profile, action, onDone } = this._rebind;
        this._rebind = null;
        if (code === 'Escape') { onDone?.(false); return; }

        const list = this.bindings[profile][action] || [];
        if (!list.includes(code)) list.unshift(code);
        this.bindings[profile][action] = list.slice(0, 2);
        saveKeyboard(profile, this.bindings[profile]);
        if (profile === 'host') this.saveHostAndBroadcast();
        onDone?.(true);
    },

    _finishGamepadRebind(buttonIndex) {
        if (!this._rebindGamepad) return;
        const { profile, action, onDone } = this._rebindGamepad;
        this._rebindGamepad = null;

        this.gamepadBindings[profile][action] = buttonIndex;
        if (!this.gamepadBindings[profile]._overrides) this.gamepadBindings[profile]._overrides = {};
        this.gamepadBindings[profile]._overrides[action] = true;
        saveGamepad(profile, this.gamepadBindings[profile]);
        if (profile === 'host') this.saveHostAndBroadcast();
        onDone?.(true, buttonIndex);
    },

    _cancelGamepadRebind() {
        if (!this._rebindGamepad) return;
        const { onDone } = this._rebindGamepad;
        this._rebindGamepad = null;
        onDone?.(false);
        window.UI?.renderBindingsEditor?.();
    },

    clearKeyboardBinding(profile, action) {
        this.bindings[profile][action] = [];
        saveKeyboard(profile, this.bindings[profile]);
        if (profile === 'host') this.saveHostAndBroadcast();
    },

    clearGamepadBinding(profile, action) {
        this.gamepadBindings[profile][action] = DEFAULT_GAMEPAD_BINDINGS[action];
        if (this.gamepadBindings[profile]._overrides) delete this.gamepadBindings[profile]._overrides[action];
        saveGamepad(profile, this.gamepadBindings[profile]);
        if (profile === 'host') this.saveHostAndBroadcast();
    },

    resetProfile(profile) {
        this.bindings[profile] = cloneKbDefaults(profile);
        this.gamepadBindings[profile] = cloneGpDefaults();
        delete this.gamepadBindings[profile]._overrides;
        saveKeyboard(profile, this.bindings[profile]);
        saveGamepad(profile, this.gamepadBindings[profile]);
        if (profile === 'host') this.saveHostAndBroadcast();
    },

    renderEditor(profile, tab = 'keyboard') {
        const kbList = document.getElementById('bindings-list');
        const gpList = document.getElementById('gamepad-bindings-list');
        const note = document.getElementById('bindings-sync-note');
        if (!kbList || !gpList) return;

        const isHostProfile = profile === 'host';
        const canEditHost = window.Permissions?.canEditHostBindings?.();

        if (note) {
            if (profile === 'host') {
                note.textContent = canEditHost
                    ? 'Host keyboard + controller profiles sync live to all players. Guests override personally in Guest profile.'
                    : 'Host controls are read-only for guests — customize your Guest profile locally.';
            } else {
                note.textContent = 'Guest profile is saved on this device — overrides host defaults per key/button.';
            }
        }

        const actions = Object.entries(CONTROL_ACTIONS).filter(([, meta]) => !meta.hostOnly || isHostProfile);
        const locked = isHostProfile && !canEditHost;

        kbList.innerHTML = actions.map(([action, meta]) => `
            <div class="binding-row" data-action="${action}">
                <span class="binding-label">${meta.label}</span>
                <button type="button" class="binding-key btn-sm" data-bind="${action}" ${locked ? 'disabled' : ''}>
                    ${(this.bindings[profile][action] || []).map((c) => this.formatCode(c)).join(', ') || (locked ? 'Host only' : 'Bind key')}
                </button>
                ${locked ? '' : `<button type="button" class="binding-clear btn-sm" data-clear-kb="${action}" title="Clear">✕</button>`}
            </div>
        `).join('');

        gpList.innerHTML = `
            <p class="insert-hint" style="font-size:0.65rem;margin-top:0;">Fixed: L-stick move · R-stick camera (GTA style)</p>
            ${actions.filter(([a]) => DEFAULT_GAMEPAD_BINDINGS[a] !== undefined).map(([action, meta]) => `
            <div class="binding-row" data-action="${action}">
                <span class="binding-label">${meta.label}</span>
                <button type="button" class="binding-key btn-sm" data-gpad-bind="${action}" ${locked ? 'disabled' : ''}>
                    ${this.formatGamepadButton(this.gamepadBindings[profile][action])}
                </button>
                ${locked ? '' : `<button type="button" class="binding-clear btn-sm" data-clear-gp="${action}" title="Reset default">↺</button>`}
            </div>
        `).join('')}`;
    }
};

window.Controls = Controls;