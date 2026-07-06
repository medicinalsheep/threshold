/** Phase 17 — interior ambience: radio chatter at terminal, coffee murmur loop */

import { court } from './starterSiteLayout.js';

const terminal = court(2.6, 0.8);
const TERMINAL_ZONE = { x: terminal.x, y: 0.5, z: terminal.z, radius: 4.2, volume: 0.32 };
const coffee = court(-5, 1.25);
const COFFEE_ZONE = { x: coffee.x, y: 0.4, z: coffee.z, radius: 3.8, volume: 0.28 };

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function dist3(a, b) {
    const dx = a.x - b.x;
    const dy = (a.y ?? 0) - (b.y ?? 0);
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function zoneVol(zone, pos, mul = 1) {
    const d = dist3(pos, zone);
    if (d >= zone.radius) return 0;
    const t = 1 - d / zone.radius;
    return zone.volume * t * t * mul;
}

export const InteriorAmbient = {
    _active: false,
    _radioHandle: null,
    _coffeeHandle: null,
    _radioStarting: false,
    _coffeeStarting: false,

    _listenerPos() {
        const PC = window.PlayerController;
        if (PC?.spawned && PC.group) return PC.group.position;
        return window.Engine?.camera?.position;
    },

    start() {
        if (this._active) return;
        this._active = true;
        void this._ensureLoops();
    },

    async startStaggered() {
        if (this._active) return;
        this._active = true;
        await delay(480);
        await this._ensureLoops();
    },

    stop() {
        this._active = false;
        this._radioHandle?.stop?.();
        this._coffeeHandle?.stop?.();
        this._radioHandle = null;
        this._coffeeHandle = null;
        this._radioStarting = false;
        this._coffeeStarting = false;
    },

    async _ensureLoops() {
        await this._ensureRadio();
        await this._ensureCoffee();
        this._updateVolumes();
    },

    async _ensureRadio() {
        if (this._radioHandle || this._radioStarting) return;
        const AudioSys = window.AudioSys;
        if (!AudioSys?.playClipLoop) return;
        this._radioStarting = true;
        try {
            const handle = await AudioSys.playClipLoop('starter_interior_radio_chatter', 0);
            if (this._active) this._radioHandle = handle;
            else handle?.stop?.();
        } finally {
            this._radioStarting = false;
        }
    },

    async _ensureCoffee() {
        if (this._coffeeHandle || this._coffeeStarting) return;
        const AudioSys = window.AudioSys;
        if (!AudioSys?.playClipLoop) return;
        this._coffeeStarting = true;
        try {
            const handle = await AudioSys.playClipLoop('starter_interior_coffee_murmur', 0);
            if (this._active) this._coffeeHandle = handle;
            else handle?.stop?.();
        } finally {
            this._coffeeStarting = false;
        }
    },

    _updateVolumes() {
        const pos = this._listenerPos();
        if (!pos) return;

        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        const rainMul = 1 - rain * 0.45;
        const highwayMul = 1;

        const radio = zoneVol(TERMINAL_ZONE, pos) * rainMul;
        const coffee = zoneVol(COFFEE_ZONE, pos) * rainMul * highwayMul;

        if (this._radioHandle?.setVolume) {
            this._radioHandle.setVolume(radio);
        }
        if (this._coffeeHandle?.setVolume) {
            this._coffeeHandle.setVolume(coffee);
        }
    },

    tick(_dt) {
        if (!this._active || window.State?.isPaused) return;
        if (!this._radioHandle || !this._coffeeHandle) void this._ensureLoops();
        this._updateVolumes();
    },
};

window.InteriorAmbient = InteriorAmbient;