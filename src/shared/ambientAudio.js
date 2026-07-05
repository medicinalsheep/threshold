/** Zone-based ambient loops — wind, highway, wildlife */

const ZONES = [
    { id: 'wind_open', clipId: 'starter_amb_wind', volume: 0.22, pos: { x: 0, y: 1, z: 0 }, radius: 22, loop: true },
    { id: 'highway_edge', clipId: 'starter_amb_highway', volume: 0.28, pos: { x: 6.5, y: 0.5, z: -3.2 }, radius: 9, loop: true },
    { id: 'gravel_dust', clipId: 'starter_amb_dust', volume: 0.12, pos: { x: -4, y: 0.5, z: -2.8 }, radius: 4.5, loop: false, interval: [8, 18] },
    { id: 'birds_north', clipId: 'starter_amb_bird', volume: 0.38, pos: { x: -3, y: 3, z: -5 }, radius: 14, loop: false, interval: [5, 14] },
    { id: 'cicadas_grass', clipId: 'starter_amb_cicada', volume: 0.16, pos: { x: -4.2, y: 0.5, z: 2.4 }, radius: 5, loop: true },
];

export const AmbientAudio = {
    _zones: [],
    _nextBird: 0,
    _nextDust: 0,
    _windHandle: null,
    _highwayHandle: null,
    _cicadaHandle: null,
    _active: false,

    init() {
        this._zones = ZONES.map((z) => ({ ...z, _timer: 0 }));
        this._nextBird = performance.now() + 4000;
        this._nextDust = performance.now() + 6000;
    },

    start() {
        if (this._active) return;
        this._active = true;
        this.init();
        this._playLoop('starter_amb_wind', 0.18, '_windHandle');
        this._playLoop('starter_amb_highway', 0.14, '_highwayHandle');
        this._playLoop('starter_amb_cicada', 0.1, '_cicadaHandle');
    },

    stop() {
        this._active = false;
        ['_windHandle', '_highwayHandle', '_cicadaHandle'].forEach((k) => {
            if (this[k]?.stop) this[k].stop();
            this[k] = null;
        });
    },

    _playLoop(clipId, vol, key) {
        const AudioSys = window.AudioSys;
        if (!AudioSys?.playClipLoop) {
            AudioSys?.playClip?.(clipId, vol * 0.6);
            return;
        }
        this[key] = AudioSys.playClipLoop(clipId, vol);
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

    tick() {
        if (!this._active || window.State?.isPaused) return;
        const pos = this._listenerPos();
        if (!pos) return;
        const now = performance.now();

        const wind = this._volForZone(this._zones[0], pos);
        const highway = this._volForZone(this._zones[1], pos);
        if (this._windHandle?.setVolume) this._windHandle.setVolume(wind);
        if (this._highwayHandle?.setVolume) this._highwayHandle.setVolume(highway);

        if (now > this._nextBird && this._volForZone(this._zones[3], pos) > 0.05) {
            window.StarterSfx?.playStarterSfx?.('starter_amb_bird', 0.2 + Math.random() * 0.15);
            this._nextBird = now + 5000 + Math.random() * 9000;
        }
        if (now > this._nextDust && this._volForZone(this._zones[2], pos) > 0.04) {
            window.StarterSfx?.playStarterSfx?.('starter_amb_dust', 0.12 + Math.random() * 0.1);
            this._nextDust = now + 8000 + Math.random() * 10000;
        }
    },
};

window.AmbientAudio = AmbientAudio;