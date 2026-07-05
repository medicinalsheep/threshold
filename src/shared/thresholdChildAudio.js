/**
 * Threshold Child audio — original synthesized SFX seeds (R3).
 */

import { SoundLibrary } from './soundLibrary.js';
import {
    CHILD_AUDIO_META,
    getChildAudioSpecs,
} from './thresholdChildMeta.js';

function encodeWavFromBuffer(audioBuffer) {
    const numChannels = 1;
    const sampleRate = audioBuffer.sampleRate;
    const samples = audioBuffer.getChannelData(0);
    const dataLength = samples.length * 2;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeStr = (offset, str) => {
        for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i += 1) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

async function synthesizeClip(spec) {
    const { type = 'sine', freq = 440, duration = 0.2, decay = 0.1 } = spec.synth || {};
    const sampleRate = 44100;
    const length = Math.ceil(sampleRate * duration);
    const ctx = new OfflineAudioContext(1, length, sampleRate);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, 0);
    gain.gain.setValueAtTime(0.35, 0);
    gain.gain.exponentialRampToValueAtTime(Math.max(decay, 0.001), duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(duration);
    const rendered = await ctx.startRendering();
    return encodeWavFromBuffer(rendered);
}

export async function seedThresholdChildAudio() {
    const specs = getChildAudioSpecs();
    let seeded = 0;

    for (const spec of specs) {
        try {
            const blob = await synthesizeClip(spec);
            await SoundLibrary.saveClipWithId(spec.id, spec.label, blob, {
                context: 'Threshold Child original SFX',
                targetType: 'child',
                isThresholdChild: true,
                childEdition: CHILD_AUDIO_META.edition,
                license: CHILD_AUDIO_META.license,
            });
            seeded += 1;
        } catch (e) {
            console.warn('[child-audio] seed failed', spec.id, e);
        }
    }

    return { seeded, edition: CHILD_AUDIO_META.edition, version: CHILD_AUDIO_META.version };
}

export async function wireChildAudioToScene() {
    const State = window.State;
    if (!State?.objects) return 0;

    let wired = 0;
    getChildAudioSpecs().forEach((spec) => {
        spec.targetIds?.forEach((targetId) => {
            const obj = State.objects.find((o) => o.userData?.id === targetId);
            if (!obj) return;
            obj.userData.soundMode = 'clip';
            obj.userData.soundClipId = spec.id;
            obj.userData.soundTrigger = spec.trigger || 'collision';
            wired += 1;
        });
    });
    return wired;
}

export function getChildAudioCreditEntries() {
    return getChildAudioSpecs().map((spec) => ({
        id: spec.id,
        label: spec.label,
        kind: spec.kind,
        license: CHILD_AUDIO_META.license,
        author: CHILD_AUDIO_META.author,
        source: 'Threshold Child edition — synthesized original',
        storeSku: `childaudio.${spec.kind}.${spec.id.replace(/^child_sfx_/, '')}`,
        registryUri: `threshold://${CHILD_AUDIO_META.bundleId}/asset/${spec.id.replace(/^child_sfx_/, '')}`,
    }));
}

window.ThresholdChildAudio = {
    seedThresholdChildAudio,
    wireChildAudioToScene,
    getChildAudioCreditEntries,
};