/** Zone-based ambient loops — real wind/highway + recorded birds */

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const ZONES = [
    { id: 'wind_open', clipId: 'starter_amb_wind', volume: 0.22, pos: { x: 0, y: 1, z: 0 }, radius: 22, loop: true },
    { id: 'highway_edge', clipId: 'starter_amb_highway', volume: 0.28, pos: { x: 6.5, y: 0.5, z: -3.2 }, radius: 9, loop: true },
    { id: 'creek_edge', clipId: 'starter_amb_creek', volume: 0.26, pos: { x: -5.4, y: 0.2, z: 0.6 }, radius: 5.5, loop: true },
    { id: 'power_hum', clipId: 'starter_amb_power_hum', volume: 0.14, pos: { x: 0, y: 2, z: -6 }, radius: 14, loop: true, rainDuck: 0.15 },
];

export const AmbientAudio = {
    _zones: [],
    _windHandle: null,
    _highwayHandle: null,
    _creekHandle: null,
    _powerHandle: null,
    _active: false,

    init() {
        this._zones = ZONES.map((z) => ({ ...z }));
        window.WeatherSystem?.init?.();
    },

    start() {
        if (this._active) return;
        this._active = true;
        this.init();
        void this._playLoop('starter_amb_wind', 0.18, '_windHandle');
        void this._playLoop('starter_amb_highway', 0.14, '_highwayHandle');
        window.RecordedAmbient?.start?.();
    },

    /** Stagger loop decode/start to avoid main-thread spikes on first session. */
    async startStaggered() {
        if (this._active) return;
        this._active = true;
        this.init();
        await this._playLoop('starter_amb_wind', 0.18, '_windHandle');
        await delay(420);
        await this._playLoop('starter_amb_highway', 0.14, '_highwayHandle');
        await delay(380);
        await this._playLoop('starter_amb_creek', 0.12, '_creekHandle');
        await delay(450);
        await this._playLoop('starter_amb_power_hum', 0.08, '_powerHandle');
        await delay(520);
        window.RecordedAmbient?.start?.();
        await window.WildlifeAmbient?.startStaggered?.();
        await window.UrbanAmbient?.startStaggered?.();
        await window.InteriorAmbient?.startStaggered?.();
        await window.TeslaLabAmbient?.startStaggered?.();
    },

    stop() {
        this._active = false;
        ['_windHandle', '_highwayHandle', '_creekHandle', '_powerHandle'].forEach((k) => {
            if (this[k]?.stop) this[k].stop();
            this[k] = null;
        });
        window.WeatherSystem?.stop?.();
        window.RecordedAmbient?.stop?.();
        window.WildlifeAmbient?.stop?.();
        window.UrbanAmbient?.stop?.();
        window.InteriorAmbient?.stop?.();
        window.TeslaLabAmbient?.stop?.();
    },

    async _playLoop(clipId, vol, key) {
        const AudioSys = window.AudioSys;
        if (!AudioSys?.playClipLoop) {
            AudioSys?.playClip?.(clipId, vol * 0.6);
            return;
        }
        const handle = await AudioSys.playClipLoop(clipId, vol);
        if (this._active) this[key] = handle;
    },

    _listenerPos() {
        const PC = window.PlayerController;
        if (PC?.spawned && PC.group) return PC.group.position;
        return window.Engine?.camera?.position;
    },

    _volForZone(zone, pos) {
        if (!pos) return 0;
        const dx = pos.x - zone.pos.x;
        const dy = pos.y - zone.pos.y;
        const dz = pos.z - zone.pos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist >= zone.radius) return 0;
        const t = 1 - dist / zone.radius;
        return zone.volume * t * t;
    },

    tick(dt) {
        if (!this._active || window.State?.isPaused) return;
        const pos = this._listenerPos();
        if (!pos) return;

        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        const rainDuck = 1 - rain * 0.35;

        const wind = this._volForZone(this._zones[0], pos) * rainDuck;
        const highway = this._volForZone(this._zones[1], pos) * (1 - rain * 0.15);
        const creek = this._volForZone(this._zones[2], pos) * (1 - rain * 0.08);
        const powerZone = this._zones[3];
        const powerRainMul = 1 - rain * (powerZone.rainDuck ?? 0.2);
        const power = this._volForZone(powerZone, pos) * powerRainMul;
        if (this._windHandle?.setVolume) this._windHandle.setVolume(wind);
        if (this._highwayHandle?.setVolume) this._highwayHandle.setVolume(highway);
        if (this._creekHandle?.setVolume) this._creekHandle.setVolume(creek);
        if (this._powerHandle?.setVolume) this._powerHandle.setVolume(power);

        window.WeatherSystem?.tick?.(dt);
        window.RecordedAmbient?.tick?.();
        window.WildlifeAmbient?.tick?.(dt);
        window.UrbanAmbient?.tick?.(dt);
        window.InteriorAmbient?.tick?.(dt);
        window.TeslaLabAmbient?.tick?.(dt);
    },
};

window.AmbientAudio = AmbientAudio;