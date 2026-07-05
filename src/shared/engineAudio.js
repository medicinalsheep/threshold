import { SoundLibrary } from './soundLibrary.js';

export const EngineAudio = {
    _source: null,
    _gain: null,
    clipId: null,

    async start(clipId, volume = 0.22) {
        if (!clipId) return false;
        this.stop();

        const AudioSys = window.AudioSys;
        if (!AudioSys) return false;
        AudioSys.ensureContext();
        const ctx = AudioSys.ctx;
        if (!ctx) return false;

        try {
            let buffer = AudioSys.clipCache?.get(clipId);
            if (!buffer) {
                const blob = await SoundLibrary.getBlob(clipId);
                if (!blob) return false;
                const arr = await blob.arrayBuffer();
                buffer = await ctx.decodeAudioData(arr.slice(0));
                AudioSys.clipCache?.set(clipId, buffer);
            }

            const src = ctx.createBufferSource();
            const gain = ctx.createGain();
            src.buffer = buffer;
            src.loop = true;
            gain.gain.value = volume;
            src.connect(gain);
            gain.connect(ctx.destination);
            src.start(0);

            this._source = src;
            this._gain = gain;
            this.clipId = clipId;
            return true;
        } catch (e) {
            console.warn('[engine-audio] start', e);
            return false;
        }
    },

    setThrottle(speed = 0, maxSpeed = 14) {
        if (!this._source || !this._gain) return;
        const t = Math.min(1, Math.max(0, speed / maxSpeed));
        this._gain.gain.value = 0.06 + t * 0.32;
        this._source.playbackRate.value = 0.55 + t * 1.15;
    },

    stop() {
        try {
            this._source?.stop?.();
        } catch { /* already stopped */ }
        this._source = null;
        this._gain = null;
        this.clipId = null;
    },
};

window.EngineAudio = EngineAudio;