/** Phase 18.1 — Tesla lab ambience: coil hum loop + random spark crackles */

const COIL_ZONE = { x: -9, y: 1.2, z: 2, radius: 6.0, volume: 0.38 };
const LAB_RADIO_ZONE = { x: -9, y: 1.0, z: 2, radius: 5.5, volume: 0.24 };

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

export const TeslaLabAmbient = {
    _active: false,
    _humHandle: null,
    _radioHandle: null,
    _humStarting: false,
    _radioStarting: false,
    _sparkBusy: false,

    _listenerPos() {
        const PC = window.PlayerController;
        if (PC?.spawned && PC.group) return PC.group.position;
        return window.Engine?.camera?.position;
    },

    start() {
        if (this._active) return;
        this._active = true;
        void this._ensureHum();
    },

    async startStaggered() {
        if (this._active) return;
        this._active = true;
        await delay(620);
        await this._ensureHum();
        await delay(520);
        await this._ensureRadio();
    },

    stop() {
        this._active = false;
        this._humHandle?.stop?.();
        this._radioHandle?.stop?.();
        this._humHandle = null;
        this._radioHandle = null;
        this._humStarting = false;
        this._radioStarting = false;
        this._sparkBusy = false;
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

    async _ensureHum() {
        if (this._humHandle || this._humStarting) return;
        const AudioSys = window.AudioSys;
        if (!AudioSys?.playClipLoop) return;
        this._humStarting = true;
        try {
            const handle = await AudioSys.playClipLoop('starter_tesla_coil_hum', 0);
            if (this._active) this._humHandle = handle;
            else handle?.stop?.();
        } finally {
            this._humStarting = false;
        }
    },

    _updateVolume() {
        const pos = this._listenerPos();
        if (!pos) return;
        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        const rainMul = 1 - rain * 0.25;
        const hum = zoneVol(COIL_ZONE, pos) * rainMul;
        const radio = zoneVol(LAB_RADIO_ZONE, pos) * (1 - rain * 0.35);
        if (this._humHandle?.setVolume) {
            this._humHandle.setVolume(hum);
        }
        if (this._radioHandle?.setVolume) {
            this._radioHandle.setVolume(radio);
        }
    },

    async playSpark() {
        if (!this._active || this._sparkBusy) return;
        const AudioSys = window.AudioSys;
        if (!AudioSys?.playClip) return;
        const pos = this._listenerPos();
        const base = zoneVol(COIL_ZONE, pos || COIL_ZONE, 1);
        if (base < 0.02 && pos) return;
        this._sparkBusy = true;
        try {
            await AudioSys.playClip('starter_tesla_spark', Math.min(0.55, 0.18 + base * 0.9));
        } finally {
            setTimeout(() => { this._sparkBusy = false; }, 120);
        }
    },

    tick(_dt) {
        if (!this._active || window.State?.isPaused) return;
        if (!this._humHandle) void this._ensureHum();
        if (!this._radioHandle) void this._ensureRadio();
        this._updateVolume();
    },
};

window.TeslaLabAmbient = TeslaLabAmbient;