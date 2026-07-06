/** Phase 16 — urban highway ambience: truck/moto Doppler, siren, construction beep */

import { SITE } from './starterSiteLayout.js';

const HIGHWAY_ZONE = { x: SITE.highway.x, y: 0.5, z: SITE.highway.z, radius: 12, volume: 1 };
const CONSTRUCTION_ZONE = { x: SITE.highway.x - 2, y: 0.3, z: SITE.highway.z + 2, radius: 5.5, volume: 0.55 };

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

export const UrbanAmbient = {
    _active: false,
    _nextTruck: 0,
    _nextMoto: 0,
    _nextSiren: 0,
    _nextBeep: 0,
    _passing: 0,

    _listenerPos() {
        const PC = window.PlayerController;
        if (PC?.spawned && PC.group) return PC.group.position;
        return window.Engine?.camera?.position;
    },

    start() {
        if (this._active) return;
        this._active = true;
        const now = performance.now();
        this._nextTruck = now + 8000;
        this._nextMoto = now + 14000;
        this._nextSiren = now + 45000;
        this._nextBeep = now + 6000;
    },

    async startStaggered() {
        if (this._active) return;
        this._active = true;
        const now = performance.now();
        this._nextTruck = now + 8000;
        this._nextMoto = now + 14000;
        this._nextSiren = now + 45000;
        this._nextBeep = now + 6000;
    },

    stop() {
        this._active = false;
    },

    async _playDoppler(clipId, baseVol, direction = 1) {
        const AudioSys = window.AudioSys;
        if (!AudioSys?.ensureContext || !clipId) return;
        AudioSys.ensureContext();
        const ctx = AudioSys.ctx;
        if (!ctx || ctx.state === 'suspended') {
            try { await ctx?.resume?.(); } catch { /* */ }
        }
        if (!ctx) return;

        try {
            let buffer = AudioSys.clipCache?.get?.(clipId);
            if (!buffer) {
                const blob = await window.SoundLibrary?.getBlob?.(clipId);
                if (!blob) return;
                const arr = await blob.arrayBuffer();
                buffer = await ctx.decodeAudioData(arr.slice(0));
                AudioSys.clipCache?.set?.(clipId, buffer);
            }

            const src = ctx.createBufferSource();
            const gain = ctx.createGain();
            src.buffer = buffer;
            src.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;
            const dur = buffer.duration;
            const peak = now + dur * 0.42;
            const end = now + dur;

            const low = direction > 0 ? 0.72 : 1.28;
            const mid = direction > 0 ? 1.22 : 0.88;
            const tail = direction > 0 ? 0.58 : 1.12;

            src.playbackRate.setValueAtTime(low, now);
            src.playbackRate.linearRampToValueAtTime(mid, peak);
            src.playbackRate.linearRampToValueAtTime(tail, end);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(baseVol, now + 0.08);
            gain.gain.setValueAtTime(baseVol * 0.95, peak);
            gain.gain.linearRampToValueAtTime(0.001, end);

            src.start(now);
            this._passing += 1;
            src.onended = () => { this._passing = Math.max(0, this._passing - 1); };
        } catch (e) {
            console.warn('Doppler pass failed:', e);
        }
    },

    _playOneShot(clipId, vol, rate) {
        window.AudioSys?.playClipVariation?.(clipId, {
            volume: vol,
            playbackRate: rate ?? (0.9 + Math.random() * 0.16),
        });
    },

    tick(_dt) {
        if (!this._active || window.State?.isPaused) return;

        const now = performance.now();
        const pos = this._listenerPos();
        if (!pos) return;

        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        const rainMul = 1 - rain * 0.4;
        const highway = zoneVol(HIGHWAY_ZONE, pos) * rainMul;
        const construction = zoneVol(CONSTRUCTION_ZONE, pos) * rainMul;

        if (this._passing >= 2) return;

        if (highway > 0.08 && now >= this._nextTruck) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            void this._playDoppler('starter_urban_truck_pass', highway * (0.38 + Math.random() * 0.18), dir);
            this._nextTruck = now + 22000 + Math.random() * 28000;
        }

        if (highway > 0.12 && now >= this._nextMoto) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            void this._playDoppler('starter_urban_moto_pass', highway * (0.32 + Math.random() * 0.16), dir);
            this._nextMoto = now + 16000 + Math.random() * 22000;
        }

        if (now >= this._nextSiren) {
            const distFactor = Math.max(0.15, 1 - dist3(pos, HIGHWAY_ZONE) / 28);
            this._playOneShot('starter_urban_siren_distant', 0.14 * distFactor * rainMul, 0.82 + Math.random() * 0.12);
            this._nextSiren = now + 90000 + Math.random() * 120000;
        }

        if (construction > 0.1 && now >= this._nextBeep) {
            this._playOneShot('starter_urban_construction_beep', construction * (0.42 + Math.random() * 0.2));
            this._nextBeep = now + 2800 + Math.random() * 4200;
        }
    },
};

window.UrbanAmbient = UrbanAmbient;