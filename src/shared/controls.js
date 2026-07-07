const STORAGE_KB_HOST = 'threshold_bindings_host';
const STORAGE_KB_USER = 'threshold_bindings_user';
const STORAGE_GP_HOST = 'threshold_gamepad_host';
const STORAGE_GP_USER = 'threshold_gamepad_user';
const STORAGE_BINDINGS_SCHEMA = 'threshold_bindings_schema';
const BINDINGS_SCHEMA = 3;

/** Action control map — groups match KEYS menu sections */
export const CONTROL_ACTIONS = {
    forward: { label: 'Move Forward', group: 'movement', hint: 'WASD' },
    back: { label: 'Move Back', group: 'movement' },
    left: { label: 'Move Left', group: 'movement' },
    right: { label: 'Move Right', group: 'movement' },
    up: { label: 'Fly Up', group: 'movement' },
    down: { label: 'Fly Down', group: 'movement' },
    jump: { label: 'Jump', group: 'movement' },
    sprint: { label: 'Sprint / Run (hold)', group: 'movement' },
    crouch: { label: 'Crouch (hold)', group: 'movement', walkOnly: true },
    stealthWalk: { label: 'Stealth Walk (hold)', group: 'movement', walkOnly: true },
    interact: { label: 'Interact', group: 'general' },
    toggleMode: { label: 'Toggle Walk / Fly', group: 'general' },
    enterVehicle: { label: 'Enter / Exit Vehicle', group: 'vehicle' },
    pause: { label: 'Pause Scene (host)', group: 'host', hostOnly: true },
    bindingsMenu: { label: 'Open Keys Menu', group: 'general' },
    sessionPanel: { label: 'Session / Players Panel', group: 'general' },
    cameraReset: { label: 'Reset Camera Behind Player', group: 'camera' },
    fire: { label: 'Fire / Shoot', group: 'combat', mouse: 2 },
    aim: { label: 'Aim Down Sights (hold)', group: 'combat', mouse: 0 },
    reload: { label: 'Reload', group: 'combat' },
    melee: { label: 'Melee / Punch', group: 'combat' },
    holster: { label: 'Holster Weapon', group: 'combat' },
    emote: { label: 'Emote / Hands Up', group: 'social' },
    voipPtt: { label: 'Voice Push-to-Talk (hold)', group: 'social' },
    toggleView: { label: 'Toggle FPS / TPS', group: 'camera' },
    thirdEye: { label: 'Third Eye / Interact', group: 'camera' },
    flashlight: { label: 'Flashlight', group: 'camera' },
    lookBehind: { label: 'Look Behind (tap)', group: 'camera' },
    horn: { label: 'Horn', group: 'vehicle' },
};

export const CONTROL_GROUPS = [
    { id: 'movement', label: 'Movement' },
    { id: 'combat', label: 'Combat' },
    { id: 'camera', label: 'Camera' },
    { id: 'vehicle', label: 'Vehicle' },
    { id: 'social', label: 'Social / Voice' },
    { id: 'general', label: 'General' },
    { id: 'host', label: 'Host' },
];

export const GAMEPAD_BUTTON_LABELS = {
    0: 'A / Cross', 1: 'B / Circle', 2: 'X / Square', 3: 'Y / Triangle',
    4: 'LB / L1', 5: 'RB / R1', 6: 'LT / L2', 7: 'RT / R2',
    8: 'Select / Share', 9: 'Start / Options', 10: 'L3', 11: 'R3',
    12: 'D-Up', 13: 'D-Down', 14: 'D-Left', 15: 'D-Right'
};

/** Gamepad defaults — L-stick move · R-stick camera */
const DEFAULT_GAMEPAD_BINDINGS = {
    jump: 0,
    melee: 1,
    interact: 2,
    toggleMode: 3,
    enterVehicle: 3,
    up: 4,
    reload: 5,
    sprint: 10,
    bindingsMenu: 8,
    pause: 9,
    cameraReset: 11,
    fire: 7,
    aim: 6,
    toggleView: 13,
    thirdEye: 12,
    horn: 14,
    emote: 15,
    flashlight: 4,
    holster: 9,
    voipPtt: 8,
    crouch: 6,
    stealthWalk: 10,
    down: 1,
    sessionPanel: 8,
};

/** Keyboard defaults — LMB aim · RMB fire · F interact/third eye · E vehicle · Y walk/fly */
const DEFAULT_HOST_KEYBOARD = {
    forward: ['KeyW', 'ArrowUp'],
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    up: ['KeyQ'],
    down: ['KeyC'],
    jump: ['Space'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    crouch: ['ControlLeft', 'ControlRight'],
    stealthWalk: ['KeyU'],
    interact: ['KeyF'],
    toggleMode: ['KeyY'],
    enterVehicle: ['KeyE'],
    pause: ['KeyP'],
    bindingsMenu: ['Backquote'],
    sessionPanel: ['Tab'],
    cameraReset: ['Home'],
    fire: ['Mouse2', 'KeyG'],
    aim: ['Mouse0'],
    reload: ['KeyR'],
    melee: ['KeyB'],
    holster: ['KeyZ'],
    emote: ['KeyX'],
    voipPtt: ['KeyN'],
    toggleView: ['KeyV'],
    thirdEye: ['KeyF'],
    flashlight: ['KeyL'],
    lookBehind: ['KeyO'],
    horn: ['KeyH'],
};

const DEFAULT_USER_KEYBOARD = {
    ...DEFAULT_HOST_KEYBOARD,
    pause: [],
    bindingsMenu: [],
    sessionPanel: [],
    cameraReset: []
};

const KEY_LABELS = {
    KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyQ: 'Q', KeyE: 'E', KeyC: 'C',
    KeyF: 'F', KeyG: 'G', KeyH: 'H', KeyP: 'P', KeyR: 'R', KeyT: 'T', KeyV: 'V',
    KeyX: 'X', KeyY: 'Y', KeyZ: 'Z', KeyM: 'M', KeyN: 'N', KeyL: 'L', KeyB: 'B',
    KeyU: 'U', Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Shift',
    ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt',
    Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB',
    Backquote: '`', Tab: 'Tab', Home: 'Home',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→'
};

const GAMEPAD_DEADZONE = 0.18;
const EDGE_ACTIONS = new Set([
    'toggleMode', 'interact', 'bindingsMenu', 'cameraReset', 'pause', 'fire',
    'toggleView', 'thirdEye', 'reload', 'melee', 'holster', 'emote', 'enterVehicle',
    'flashlight', 'lookBehind', 'horn', 'sessionPanel',
]);

const MOUSE_HELD_ACTIONS = new Set(['aim', 'crouch', 'stealthWalk', 'voipPtt', 'sprint']);

function cloneKbDefaults(profile) {
    const src = profile === 'host' ? DEFAULT_HOST_KEYBOARD : DEFAULT_USER_KEYBOARD;
    return JSON.parse(JSON.stringify(src));
}

function cloneGpDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_GAMEPAD_BINDINGS));
}

function migrateKeyboardBindings(bindings) {
    const fire = bindings.fire || [];
    const aim = bindings.aim || [];

    if (aim.includes('KeyR')) {
        bindings.aim = aim.filter((c) => c !== 'KeyR');
        if (!bindings.aim.includes('Mouse0')) bindings.aim.unshift('Mouse0');
    }

    const oldLmbFireRmbAim =
        fire.includes('Mouse0')
        && aim.includes('Mouse2')
        && !aim.includes('Mouse0')
        && !fire.includes('Mouse2');
    if (oldLmbFireRmbAim) {
        const fireKeys = fire.filter((c) => !c.startsWith('Mouse'));
        const aimKeys = aim.filter((c) => !c.startsWith('Mouse'));
        bindings.fire = ['Mouse2', ...fireKeys];
        bindings.aim = ['Mouse0', ...aimKeys];
    }

    const stealth = bindings.stealthWalk || [];
    if (stealth.includes('AltLeft') || stealth.includes('AltRight')) {
        bindings.stealthWalk = stealth
            .filter((c) => c !== 'AltLeft' && c !== 'AltRight');
        if (!bindings.stealthWalk.includes('KeyU')) bindings.stealthWalk.unshift('KeyU');
    }
}

function loadKeyboardFromStorage(profile) {
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

function bootstrapKeyboardBindings() {
    const schema = parseInt(localStorage.getItem(STORAGE_BINDINGS_SCHEMA) || '0', 10);
    const host = loadKeyboardFromStorage('host');
    const user = loadKeyboardFromStorage('user');
    if (schema < BINDINGS_SCHEMA) {
        migrateKeyboardBindings(host);
        migrateKeyboardBindings(user);
        saveKeyboard('host', host);
        saveKeyboard('user', user);
        localStorage.setItem(STORAGE_BINDINGS_SCHEMA, String(BINDINGS_SCHEMA));
    }
    return { host, user };
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
    bindings: bootstrapKeyboardBindings(),
    gamepadBindings: { host: loadGamepad('host'), user: loadGamepad('user') },
    sessionHostBindings: null,
    sessionHostGamepad: null,
    gamepad: null,
    gamepadName: '',
    gamepadActions: {},
    mouseHeld: {},
    cameraStick: { x: 0, y: 0 },
    justPressed: {},
    _prevButtons: {},
    _rebind: null,
    _rebindGamepad: null,
    _sprintToggle: false,
    _holstered: false,

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
        return KEY_LABELS[code] || code.replace('Key', '').replace('Mouse', 'M');
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

    setMouseButton(button, pressed) {
        const code = `Mouse${button}`;
        const was = !!this.mouseHeld[code];
        this.mouseHeld[code] = pressed;
        if (pressed && !was) {
            const action = this.getActionForCode(code);
            if (action && EDGE_ACTIONS.has(action)) this.justPressed[action] = true;
        }
    },

    _mouseCodesFor(action) {
        return (this.getActiveBindings()[action] || []).filter((c) => c.startsWith('Mouse'));
    },

    _btnIndex(action) {
        const map = this.getActiveGamepadMap();
        return typeof map[action] === 'number' ? map[action] : null;
    },

    isAction(action) {
        const codes = this.getActiveBindings()[action] || [];
        const keys = window.State?.keys || {};
        if (codes.some((c) => !c.startsWith('Mouse') && keys[c])) return true;
        if (codes.some((c) => c.startsWith('Mouse') && this.mouseHeld[c])) return true;
        if (action === 'sprint' && this._sprintToggle) return true;
        return !!this.gamepadActions[action];
    },

    isHolstered() {
        return this._holstered;
    },

    getSprintMultiplier() {
        return this.isAction('sprint') ? 1.85 : 1;
    },

    markJustPressed(action) {
        if (action) this.justPressed[action] = true;
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
        const kbEdges = { ...this.justPressed };
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

        MOUSE_HELD_ACTIONS.forEach((action) => {
            if (press(action)) this.gamepadActions[action] = true;
        });
        if (press('jump')) this.gamepadActions.jump = true;
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

        EDGE_ACTIONS.forEach((action) => {
            if (action === 'pause' && !this.canUse('pause')) return;
            edge(action);
        });

        Object.keys(prevJust).forEach((k) => {
            if (prevJust[k] && k.startsWith('touch_')) this.justPressed[k] = true;
        });
        Object.keys(kbEdges).forEach((k) => {
            if (kbEdges[k]) this.justPressed[k] = true;
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
            PC.applyLookInput(-x * 14, y * 14, 1.2);
            return;
        }

        const Engine = window.Engine;
        if (!Engine?.camera || !Engine.controls) return;

        const offset = Engine.camera.position.clone().sub(Engine.controls.target);
        const THREE = window.THREE;
        if (!THREE) return;
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta += x * 0.045;
        spherical.phi = Math.max(0.12, Math.min(Math.PI - 0.12, spherical.phi - y * 0.035));
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
            const lock = window.Engine?._lookPointerLocked ? ' · aim' : ' · click to aim';
            const peek = window.ThirdEye?.isPointerFree?.() ? ' · mouse free' : '';
            const alt = document.body.classList.contains('ui-immersive') ? ' · Alt peek' : '';
            return `${profile}${admin}: ${view} · LMB aim · RMB shoot · F third eye · Alt peek${lock}${peek}${alt}${pad}${touch}`;
        }
        return `${profile}${admin}: fly · Y walk · R-stick cam${pad}${touch}`;
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
                    ? 'Action defaults — LMB aim · RMB fire · F interact/third eye · E vehicle · host syncs to guests.'
                    : 'Host controls are read-only for guests — customize Guest profile locally.';
            } else {
                note.textContent = 'Guest profile saved on this device — overrides host per key/button.';
            }
        }

        const actions = Object.entries(CONTROL_ACTIONS).filter(([, meta]) => !meta.hostOnly || isHostProfile);
        const locked = isHostProfile && !canEditHost;

        const rowsForGroup = (groupId, bindAttr, clearAttr, isGp = false) => actions
            .filter(([, meta]) => meta.group === groupId)
            .filter(([a]) => !isGp || DEFAULT_GAMEPAD_BINDINGS[a] !== undefined)
            .map(([action, meta]) => `
            <div class="binding-row" data-action="${action}">
                <span class="binding-label">${meta.label}</span>
                <button type="button" class="binding-key btn-sm" data-${bindAttr}="${action}" ${locked ? 'disabled' : ''}>
                    ${isGp
        ? this.formatGamepadButton(this.gamepadBindings[profile][action])
        : (this.bindings[profile][action] || []).map((c) => this.formatCode(c)).join(', ') || (locked ? 'Host only' : 'Bind key')}
                </button>
                ${locked ? '' : `<button type="button" class="binding-clear btn-sm" data-${clearAttr}="${action}" title="${isGp ? 'Reset default' : 'Clear'}">${isGp ? '↺' : '✕'}</button>`}
            </div>
        `).join('');

        kbList.innerHTML = CONTROL_GROUPS
            .filter((g) => actions.some(([, m]) => m.group === g.id))
            .map((g) => `
            <div class="binding-group">
                <div class="binding-group-title">${g.label}</div>
                ${rowsForGroup(g.id, 'bind', 'clear-kb')}
            </div>
        `).join('');

        gpList.innerHTML = `
            <p class="insert-hint" style="font-size:0.65rem;margin-top:0;">L-stick move · R-stick camera</p>
            ${CONTROL_GROUPS
        .filter((g) => actions.some(([a, m]) => m.group === g.id && DEFAULT_GAMEPAD_BINDINGS[a] !== undefined))
        .map((g) => `
            <div class="binding-group">
                <div class="binding-group-title">${g.label}</div>
                ${rowsForGroup(g.id, 'gpad-bind', 'clear-gp', true)}
            </div>
        `).join('')}`;
    }
};

window.Controls = Controls;