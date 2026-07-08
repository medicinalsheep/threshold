import { State } from './state.js';
import { SoundLibrary } from '../shared/soundLibrary.js';

export const AudioSys = {
    ctx: null,
    clipCache: new Map(),

    init: function () {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    },

    ensureContext: function () {
        if (!this.ctx) this.init();
        State.audioEnabled = true;
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    playTone: function (freq, type = 'square', dur = 0.1) {
        if (!this.ctx) return;
        this.ensureContext();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    },

    playClip: async function (clipId, volume = 0.85) {
        if (!clipId) return;
        this.ensureContext();
        try {
            let buffer = this.clipCache.get(clipId);
            if (!buffer) {
                const blob = await SoundLibrary.getBlob(clipId);
                if (!blob) return;
                const arr = await blob.arrayBuffer();
                buffer = await this.ctx.decodeAudioData(arr.slice(0));
                this.clipCache.set(clipId, buffer);
            }
            const src = this.ctx.createBufferSource();
            const gain = this.ctx.createGain();
            src.buffer = buffer;
            gain.gain.value = volume;
            src.connect(gain);
            gain.connect(this.ctx.destination);
            src.start();
        } catch (e) {
            console.warn('Clip playback failed:', e);
        }
    },

    playClipLoop: async function (clipId, volume = 0.5) {
        if (!clipId) return null;
        this.ensureContext();
        try {
            let buffer = this.clipCache.get(clipId);
            if (!buffer) {
                const blob = await SoundLibrary.getBlob(clipId);
                if (!blob) return null;
                const arr = await blob.arrayBuffer();
                buffer = await this.ctx.decodeAudioData(arr.slice(0));
                this.clipCache.set(clipId, buffer);
            }
            const src = this.ctx.createBufferSource();
            const gain = this.ctx.createGain();
            src.buffer = buffer;
            src.loop = true;
            gain.gain.value = volume;
            src.connect(gain);
            gain.connect(this.ctx.destination);
            src.start();
            return {
                stop: () => { try { src.stop(); } catch { /* */ } },
                setVolume: (v) => { gain.gain.value = v; },
            };
        } catch (e) {
            console.warn('Loop playback failed:', e);
            return null;
        }
    },

    playClipVariation: async function (clipId, opts = {}) {
        if (!clipId) return;
        const volume = opts.volume ?? 0.85;
        const playbackRate = opts.playbackRate ?? 1;
        this.ensureContext();
        try {
            let buffer = this.clipCache.get(clipId);
            if (!buffer) {
                const blob = await SoundLibrary.getBlob(clipId);
                if (!blob) return;
                const arr = await blob.arrayBuffer();
                buffer = await this.ctx.decodeAudioData(arr.slice(0));
                this.clipCache.set(clipId, buffer);
            }
            const src = this.ctx.createBufferSource();
            const gain = this.ctx.createGain();
            src.buffer = buffer;
            src.playbackRate.value = playbackRate;
            gain.gain.value = volume;
            src.connect(gain);
            gain.connect(this.ctx.destination);
            src.start();
        } catch (e) {
            console.warn('Variation playback failed:', e);
        }
    },

    playObjectSound: function (obj, trigger = 'test') {
        if (!obj?.userData) return;
        const mode = obj.userData.soundMode || 'tone';
        const configured = obj.userData.soundTrigger || 'collision';
        if (trigger !== 'test' && configured !== trigger) return;

        if (mode === 'clip' && obj.userData.soundClipId) {
            this.playClip(obj.userData.soundClipId);
            return;
        }
        this.playTone(obj.userData.soundFreq || 440, obj.userData.soundType || 'sine', 0.25);
    },

    toggle: function () {
        if (!this.ctx) this.init();
        State.audioEnabled = !State.audioEnabled;
        const btn = document.getElementById('btn-audio');
        if (btn) btn.innerText = State.audioEnabled ? 'AUDIO: ON' : 'AUDIO: OFF';
        if (State.audioEnabled && this.ctx.state === 'suspended') this.ctx.resume();
    },
};
