import { SoundLibrary } from './soundLibrary.js';
import { getTcSfxSpecs, TC_META, TC_LIC, TC_AUTH, tcSku, tcUri, normTcId } from './tcMeta.js';

function wav(buf) {
    const ch = buf.getChannelData(0);
    const n = ch.length * 2;
    const b = new ArrayBuffer(44 + n);
    const v = new DataView(b);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n, true);
    let o = 44;
    for (let i = 0; i < ch.length; i++) {
        const s = Math.max(-1, Math.min(1, ch[i]));
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        o += 2;
    }
    return new Blob([b], { type: 'audio/wav' });
}

async function synth(spec) {
    const { type = 'sine', freq = 440, dur = 0.2, dec = 0.1 } = spec.syn || {};
    const sr = 44100;
    const len = Math.ceil(sr * dur);
    const ctx = new OfflineAudioContext(1, len, sr);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.35, 0);
    g.gain.exponentialRampToValueAtTime(Math.max(dec, 0.001), dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(0);
    osc.stop(dur);
    return wav(await ctx.startRendering());
}

export async function seedTcSfx() {
    let n = 0;
    for (const spec of getTcSfxSpecs()) {
        try {
            await SoundLibrary.saveClipWithId(spec.id, spec.nm, await synth(spec), {
                context: 'TC synth', isTC: true, tcEd: TC_META.sfx.ed, license: TC_LIC,
            });
            n += 1;
        } catch (e) { console.warn('[tc-sfx]', spec.id, e); }
    }
    return { n, ed: TC_META.sfx.ed, ver: TC_META.sfx.ver };
}

export function wireTcSfx() {
    const objs = window.State?.objects || [];
    let w = 0;
    getTcSfxSpecs().forEach((spec) => {
        spec.tgts?.forEach((tid) => {
            const obj = objs.find((o) => normTcId(o.userData?.id) === normTcId(tid));
            if (!obj) return;
            obj.userData.soundMode = 'clip';
            obj.userData.soundClipId = spec.id;
            obj.userData.soundTrigger = spec.trig || 'collision';
            w += 1;
        });
    });
    return w;
}

export function getTcSfxCredits() {
    return getTcSfxSpecs().map((s) => ({
        id: s.id, label: s.nm, kind: s.k, license: TC_LIC, author: TC_AUTH,
        source: 'TC synth', storeSku: tcSku(s.k, s.id.replace(/^tc_sfx_/, '')), registryUri: tcUri(s.id.replace(/^tc_sfx_/, '')),
    }));
}

window.TcSfx = { seedTcSfx, wireTcSfx, getTcSfxCredits };