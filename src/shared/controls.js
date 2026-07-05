const STORAGE_HOST = 'threshold_bindings_host';
const STORAGE_USER = 'threshold_bindings_user';

export const CONTROL_ACTIONS = {
    forward: { label: 'Move Forward', group: 'movement' },
    back: { label: 'Move Back', group: 'movement' },
    left: { label: 'Move Left', group: 'movement' },
    right: { label: 'Move Right', group: 'movement' },
    up: { label: 'Fly Up', group: 'movement' },
    down: { label: 'Fly Down', group: 'movement' },
    jump: { label: 'Jump', group: 'movement' },
    toggleMode: { label: 'Toggle Walk / Fly', group: 'general' },
    pause: { label: 'Pause Scene (host only)', group: 'host', hostOnly: true }
};

const DEFAULT_HOST_BINDINGS = {
    forward: ['KeyW', 'ArrowUp'],
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    up: ['KeyQ'],
    down: ['KeyE'],
    jump: ['Space'],
    toggleMode: ['KeyF'],
    pause: ['KeyP']
};

const DEFAULT_USER_BINDINGS = {
    forward: ['KeyW', 'ArrowUp'],
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    up: ['KeyQ'],
    down: ['KeyE'],
    jump: ['Space'],
    toggleMode: ['KeyF'],
    pause: []
};

const KEY_LABELS = {
    KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyQ: 'Q', KeyE: 'E',
    KeyF: 'F', KeyP: 'P', Space: 'Space', ArrowUp: '↑', ArrowDown: '↓',
    ArrowLeft: '←', ArrowRight: '→'
};

const GAMEPAD_DEADZONE = 0.25;

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
    const key = profile === 'host' ? STORAGE_HOST : STORAGE_USER;
    localStorage.setItem(key, JSON.stringify(bindings));
}

export const Controls = {
    bindings: { host: loadProfile('host'), user: loadProfile('user') },
    gamepad: null,
    gamepadName: '',
    gamepadActions: {},
    justPressed: {},
    _prevButtons: {},
    _rebind: null,

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
        return this.bindings[this.getProfile()];
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
        return !!this.gamepadActions[action];
    },

    consumeJustPressed(action) {
        if (this.justPressed[action]) {
            delete this.justPressed[action];
            return true;
        }
        return false;
    },

    canUse(action) {
        if (action === 'pause') {
            const mode = window.Network?.mode;
            return mode === 'host' || mode === 'solo';
        }
        return true;
    },

    pollGamepad() {
        this.gamepadActions = {};
        this.justPressed = {};
        const pads = navigator.getGamepads?.();
        if (!pads) return;

        let pad = this.gamepad;
        if (!pad || !pad.connected) {
            pad = pads.find((p) => p?.connected) || null;
            if (pad) {
                this.gamepad = pad;
                this.gamepadName = pad.id;
            }
        }
        if (!pad?.connected) return;

        const ax = pad.axes[0] || 0;
        const ay = pad.axes[1] || 0;
        if (ay < -GAMEPAD_DEADZONE) this.gamepadActions.forward = true;
        if (ay > GAMEPAD_DEADZONE) this.gamepadActions.back = true;
        if (ax < -GAMEPAD_DEADZONE) this.gamepadActions.left = true;
        if (ax > GAMEPAD_DEADZONE) this.gamepadActions.right = true;

        if (pad.buttons[0]?.pressed) this.gamepadActions.jump = true;
        if (pad.buttons[4]?.pressed) this.gamepadActions.up = true;
        if (pad.buttons[5]?.pressed) this.gamepadActions.down = true;
        if (pad.buttons[3]?.pressed) this.gamepadActions.toggleMode = true;

        const edge = (idx, action) => {
            const pressed = !!pad.buttons[idx]?.pressed;
            if (pressed && !this._prevButtons[idx]) this.justPressed[action] = true;
            this._prevButtons[idx] = pressed;
        };
        edge(3, 'toggleMode');
        if (this.canUse('pause')) edge(9, 'pause');
    },

    getHint() {
        const b = this.getActiveBindings();
        const profile = this.getProfile() === 'host' ? 'Host' : 'Guest';
        const fwd = (b.forward || []).map((c) => this.formatCode(c)).join('/');
        const mode = window.State?.controlMode === 'walk' && window.PlayerController?.spawned ? 'walk' : 'fly';
        const pad = this.gamepad ? ' · gamepad OK' : '';
        if (mode === 'walk') {
            return `${profile}: ${fwd} walk · ${this.formatActionBindings('jump')} jump${pad}`;
        }
        return `${profile}: ${fwd} fly · ${this.formatActionBindings('up')}/${this.formatActionBindings('down')} up/down${pad}`;
    },

    startRebind(profile, action, onDone) {
        this._rebind = { profile, action, onDone };
    },

    _finishRebind(code) {
        if (!this._rebind) return;
        const { profile, action, onDone } = this._rebind;
        this._rebind = null;
        if (code === 'Escape') {
            onDone?.(false);
            return;
        }
        const list = this.bindings[profile][action] || [];
        if (!list.includes(code)) list.unshift(code);
        this.bindings[profile][action] = list.slice(0, 2);
        saveProfile(profile, this.bindings[profile]);
        onDone?.(true);
    },

    clearBinding(profile, action) {
        this.bindings[profile][action] = [];
        saveProfile(profile, this.bindings[profile]);
    },

    resetProfile(profile) {
        this.bindings[profile] = cloneDefaults(profile);
        saveProfile(profile, this.bindings[profile]);
    },

    renderEditor(profile) {
        const list = document.getElementById('bindings-list');
        if (!list) return;
        const isHost = profile === 'host';
        list.innerHTML = Object.entries(CONTROL_ACTIONS)
            .filter(([, meta]) => !meta.hostOnly || isHost)
            .map(([action, meta]) => `
                <div class="binding-row" data-action="${action}">
                    <span class="binding-label">${meta.label}</span>
                    <button type="button" class="binding-key btn-sm" data-bind="${action}">
                        ${(this.bindings[profile][action] || []).map((c) => this.formatCode(c)).join(', ') || 'Click to bind'}
                    </button>
                    <button type="button" class="binding-clear btn-sm" data-clear="${action}" title="Clear">✕</button>
                </div>
            `).join('');
    }
};

window.Controls = Controls;