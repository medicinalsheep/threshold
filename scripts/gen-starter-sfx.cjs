#!/usr/bin/env node
/**
 * Procedural starter SFX — engines + UI chirp only.
 * Combat/impact/footsteps/ambient: npm run sounds:fetch:sfx (+ sounds:tag:recording)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DIRS = [
    path.join(ROOT, 'public', 'bundle', 'sounds', 'starter'),
    path.join(ROOT, 'sounds', 'starter'),
];
const MANIFEST = path.join(ROOT, 'config', 'starter-sounds.json');
const SR = 22050;

function writeWav(filePath, samples) {
    const n = samples.length;
    const dataSize = n * 2;
    const buf = Buffer.alloc(44 + dataSize);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(SR, 24);
    buf.writeUInt32LE(SR * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);
    for (let i = 0; i < n; i += 1) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        buf.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, 44 + i * 2);
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buf);
}

function synthTwoStroke(sec = 1.6) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const fire = 38 + 4 * Math.sin(t * 9.1);
        const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(2 * Math.PI * fire * t)) ** 3;
        const buzz = Math.sin(2 * Math.PI * 165 * t)
            + 0.45 * Math.sin(2 * Math.PI * 330 * t)
            + 0.2 * Math.sin(2 * Math.PI * 495 * t);
        const noise = (Math.random() * 2 - 1) * 0.22;
        const exhaust = Math.sin(2 * Math.PI * 62 * t) * 0.25;
        out[i] = (buzz * 0.42 + noise + exhaust) * pulse * 0.55;
    }
    return out;
}

function synthV8(sec = 2.0) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const wobble = 1 + 0.06 * Math.sin(2 * Math.PI * 3.3 * t);
        const f0 = 26 + 2 * Math.sin(t * 4.7);
        const cyl = Math.sin(2 * Math.PI * f0 * t) * 0.55
            + Math.sin(2 * Math.PI * f0 * 1.5 * t + 0.4) * 0.35
            + Math.sin(2 * Math.PI * f0 * 2 * t + 0.9) * 0.28
            + Math.sin(2 * Math.PI * f0 * 2.5 * t + 1.2) * 0.18;
        const rumble = Math.sin(2 * Math.PI * 11 * t) * 0.42;
        const noise = (Math.random() * 2 - 1) * 0.06;
        const lope = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 6.5 * t));
        out[i] = (cyl + rumble + noise) * lope * wobble * 0.48;
    }
    return out;
}

function synthTerminalChirp(sec = 0.18) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = Math.exp(-t * 14);
        out[i] = Math.sin(2 * Math.PI * (520 + t * 180) * t) * env * 0.35;
    }
    return out;
}

function envHit(t, peak = 0.004, decay = 18) {
    if (t < peak) return t / peak;
    return Math.exp(-(t - peak) * decay);
}

function synthGunPistol(sec = 0.38) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = envHit(t, 0.002, 22);
        const noise = (Math.random() * 2 - 1) * 0.85;
        const crack = Math.sin(2 * Math.PI * (180 - t * 420) * t) * 0.35;
        const thump = Math.sin(2 * Math.PI * 58 * t) * Math.exp(-t * 35) * 0.55;
        out[i] = (noise * 0.55 + crack + thump) * env * 0.72;
    }
    return out;
}

function synthGunRifle(sec = 0.48) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = envHit(t, 0.0015, 16);
        const noise = (Math.random() * 2 - 1);
        const snap = Math.sin(2 * Math.PI * (320 - t * 800) * t) * 0.4;
        const body = Math.sin(2 * Math.PI * 95 * t) * Math.exp(-t * 28) * 0.35;
        out[i] = (noise * 0.62 + snap + body) * env * 0.68;
    }
    return out;
}

function synthBrake(sec = 0.62) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = Math.min(1, t * 8) * Math.exp(-t * 2.8);
        const squeal = Math.sin(2 * Math.PI * (2100 + Math.sin(t * 40) * 400) * t);
        const scrape = (Math.random() * 2 - 1) * 0.35;
        out[i] = (squeal * 0.42 + scrape) * env * 0.5;
    }
    return out;
}

function synthDoorLock(sec = 0.14) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const click = t < 0.012 ? Math.sin(2 * Math.PI * 2400 * t) * 0.5 : 0;
        const thunk = t > 0.02 && t < 0.09 ? Math.sin(2 * Math.PI * 180 * t) * Math.exp(-(t - 0.02) * 55) * 0.45 : 0;
        const latch = t > 0.05 && t < 0.08 ? (Math.random() * 2 - 1) * 0.2 : 0;
        out[i] = (click + thunk + latch) * 0.85;
    }
    return out;
}

function synthDoorUnlock(sec = 0.12) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const c1 = t > 0.01 && t < 0.03 ? Math.sin(2 * Math.PI * 2800 * t) * 0.35 : 0;
        const c2 = t > 0.05 && t < 0.07 ? Math.sin(2 * Math.PI * 2200 * t) * 0.3 : 0;
        out[i] = (c1 + c2) * 0.9;
    }
    return out;
}

function synthGlassBreak(sec = 0.72) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = envHit(t, 0.001, 7);
        const shatter = (Math.random() * 2 - 1) * 0.9;
        const tinkle = Math.sin(2 * Math.PI * (3200 + (i % 17) * 90) * t) * Math.exp(-t * 9) * 0.22;
        const crack = Math.sin(2 * Math.PI * 640 * t) * Math.exp(-t * 14) * 0.25;
        out[i] = (shatter * 0.5 + tinkle + crack) * env * 0.65;
    }
    return out;
}

function synthTireSkid(sec = 0.85) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = Math.min(1, t * 6) * (1 - Math.max(0, (t - 0.55) / 0.3));
        const scrape = (Math.random() * 2 - 1) * 0.55;
        const tone = Math.sin(2 * Math.PI * (140 + Math.sin(t * 12) * 30) * t) * 0.2;
        out[i] = (scrape + tone) * env * 0.48;
    }
    return out;
}

function synthFootstepConcrete(sec = 0.12) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = envHit(t, 0.001, 28);
        const thump = Math.sin(2 * Math.PI * 95 * t) * Math.exp(-t * 35) * 0.45;
        const grit = (Math.random() * 2 - 1) * 0.35 * Math.exp(-t * 22);
        out[i] = (thump + grit) * env * 0.55;
    }
    return out;
}

function synthFootstepMetal(sec = 0.1) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = envHit(t, 0.0008, 32);
        const ring = Math.sin(2 * Math.PI * 520 * t) * Math.exp(-t * 40) * 0.28;
        const tap = (Math.random() * 2 - 1) * 0.25 * Math.exp(-t * 45);
        out[i] = (ring + tap) * env * 0.48;
    }
    return out;
}

function synthFootstepGrass(sec = 0.11) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = envHit(t, 0.001, 28);
        const rustle = (Math.random() * 2 - 1) * 0.35 * Math.exp(-t * 22);
        const soft = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 35) * 0.12;
        out[i] = (rustle + soft) * env * 0.42;
    }
    return out;
}

function synthFootstepWood(sec = 0.1) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = envHit(t, 0.0009, 30);
        const knock = Math.sin(2 * Math.PI * 240 * t) * Math.exp(-t * 38) * 0.32;
        const creak = (Math.random() * 2 - 1) * 0.18 * Math.exp(-t * 28);
        out[i] = (knock + creak) * env * 0.45;
    }
    return out;
}

function synthFootstepGravel(sec = 0.12) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = envHit(t, 0.0012, 26);
        const crunch = (Math.random() * 2 - 1) * 0.42 * Math.exp(-t * 18);
        const grit = Math.sin(2 * Math.PI * 320 * t) * Math.exp(-t * 42) * 0.14;
        out[i] = (crunch + grit) * env * 0.5;
    }
    return out;
}

function synthFootstepAsphalt(sec = 0.1) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = envHit(t, 0.0008, 34);
        const thud = Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t * 32) * 0.22;
        const scuff = (Math.random() * 2 - 1) * 0.2 * Math.exp(-t * 40);
        out[i] = (thud + scuff) * env * 0.4;
    }
    return out;
}

function synthWindLoop(sec = 5.5) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const gust = 0.45 + 0.55 * Math.sin(t * 0.55 + Math.sin(t * 1.3) * 0.7);
        const noise = (Math.random() * 2 - 1) * 0.5;
        const low = Math.sin(2 * Math.PI * 38 * t) * 0.18;
        const fade = Math.min(1, i / (SR * 0.2), (n - i) / (SR * 0.2));
        out[i] = (noise * 0.38 + low) * gust * 0.28 * fade;
    }
    return out;
}

function synthHighwayLoop(sec = 4.8) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const whoosh = (Math.random() * 2 - 1) * 0.4;
        const rumble = Math.sin(2 * Math.PI * 52 * t) * 0.22 + Math.sin(2 * Math.PI * 104 * t) * 0.12;
        const pass = Math.max(0, Math.sin(t * 2.8 + 1.2)) ** 2;
        const fade = Math.min(1, i / (SR * 0.15), (n - i) / (SR * 0.15));
        out[i] = (whoosh * 0.35 + rumble + pass * whoosh * 0.5) * 0.38 * fade;
    }
    return out;
}

function synthBirdChirp(sec = 0.55) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = Math.exp(-t * 5) * (1 - Math.exp(-t * 40));
        const f = 1800 + Math.sin(t * 28) * 400;
        out[i] = Math.sin(2 * Math.PI * f * t) * env * 0.22;
    }
    return out;
}

function synthCicadaLoop(sec = 3.2) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const buzz = Math.sin(2 * Math.PI * 4200 * t) * 0.08 + Math.sin(2 * Math.PI * 4350 * t) * 0.06;
        const mod = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 6.2));
        const fade = Math.min(1, i / (SR * 0.1), (n - i) / (SR * 0.1));
        out[i] = buzz * mod * fade * 0.35;
    }
    return out;
}

function synthDustGust(sec = 0.9) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = Math.min(1, t * 4) * Math.exp(-t * 2.5);
        out[i] = (Math.random() * 2 - 1) * 0.45 * env * 0.35;
    }
    return out;
}

function synthHorn(sec = 0.65) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = Math.min(1, t * 12) * Math.exp(-t * 1.8);
        const tone = Math.sin(2 * Math.PI * 312 * t) + Math.sin(2 * Math.PI * 468 * t) * 0.4;
        out[i] = tone * env * 0.42;
    }
    return out;
}

function synthMetalHit(sec = 0.28) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = Math.exp(-t * 12);
        const ring = Math.sin(2 * Math.PI * 420 * t) * 0.35 + Math.sin(2 * Math.PI * 880 * t) * 0.18;
        const hit = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.5;
        out[i] = (ring + hit) * env * 0.55;
    }
    return out;
}

function synthCreekLoop(sec = 4.0) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.35 * t);
        const babble = (Math.random() * 2 - 1) * 0.35;
        const flow = Math.sin(2 * Math.PI * (48 + Math.sin(t * 3) * 8) * t) * 0.12;
        const ripple = Math.sin(2 * Math.PI * (220 + Math.sin(t * 7) * 40) * t) * 0.06 * lfo;
        out[i] = (babble * 0.4 + flow + ripple) * 0.42;
    }
    return out;
}

function synthPowerHum(sec = 3.0) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const hum = Math.sin(2 * Math.PI * 60 * t) * 0.22
            + Math.sin(2 * Math.PI * 120 * t) * 0.1
            + Math.sin(2 * Math.PI * 180 * t) * 0.05;
        const buzz = (Math.random() * 2 - 1) * 0.04;
        const wobble = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.9 * t);
        out[i] = (hum + buzz) * wobble * 0.38;
    }
    return out;
}

function synthCicadaLoop(sec = 3.5) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const pulse = Math.max(0, Math.sin(2 * Math.PI * 42 * t)) ** 4;
        const tone = Math.sin(2 * Math.PI * 4200 * t) * 0.08
            + Math.sin(2 * Math.PI * 5100 * t) * 0.05;
        const noise = (Math.random() * 2 - 1) * 0.04;
        out[i] = (tone + noise) * pulse * 0.55;
    }
    return out;
}

function synthCricketsLoop(sec = 4.0) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const chirp = Math.sin(2 * Math.PI * 38 * t + Math.sin(t * 5) * 2);
        const pulse = Math.max(0, chirp) ** 6;
        const tone = Math.sin(2 * Math.PI * (3800 + Math.sin(t * 2.5) * 400) * t) * 0.07;
        const bed = (Math.random() * 2 - 1) * 0.025;
        out[i] = (tone * pulse + bed) * 0.48;
    }
    return out;
}

function synthDogBark(sec = 0.35) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = Math.exp(-t * 9);
        const bark = Math.sin(2 * Math.PI * (280 - t * 120) * t) * 0.55;
        const noise = (Math.random() * 2 - 1) * 0.25;
        out[i] = (bark + noise) * env * 0.7;
    }
    return out;
}

function synthCatMeow(sec = 0.55) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = Math.exp(-t * 4.5);
        const meow = Math.sin(2 * Math.PI * (520 + t * 380) * t) * 0.45;
        const cry = Math.sin(2 * Math.PI * 1040 * t) * 0.12 * Math.exp(-t * 6);
        out[i] = (meow + cry) * env * 0.62;
    }
    return out;
}

function synthOwlHoot(sec = 0.9) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const h1 = t < 0.22 ? Math.sin(2 * Math.PI * 320 * t) * 0.5 : 0;
        const h2 = t > 0.28 && t < 0.5 ? Math.sin(2 * Math.PI * 280 * (t - 0.28)) * 0.42 : 0;
        const env = Math.exp(-t * 3.2);
        out[i] = (h1 + h2) * env * 0.65;
    }
    return out;
}

function synthFishSplash(sec = 0.28) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = Math.exp(-t * 14);
        const splash = (Math.random() * 2 - 1) * 0.5;
        const drip = Math.sin(2 * Math.PI * (180 + t * 200) * t) * 0.2;
        out[i] = (splash + drip) * env * 0.55;
    }
    return out;
}

function synthFenceRattle(sec = 0.42) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const env = Math.exp(-t * 5.5);
        const clank = (Math.random() * 2 - 1) * 0.55;
        const ring = Math.sin(2 * Math.PI * (680 + (i % 9) * 40) * t) * Math.exp(-t * 12) * 0.25;
        const chain = Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t * 8) * 0.18;
        out[i] = (clank * 0.45 + ring + chain) * env * 0.62;
    }
    return out;
}

function synthTruckPass(sec = 2.4) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const p = t / sec;
        const env = Math.sin(p * Math.PI) ** 1.4;
        const rumble = Math.sin(2 * Math.PI * 42 * t) * 0.38 + Math.sin(2 * Math.PI * 84 * t) * 0.22;
        const whoosh = (Math.random() * 2 - 1) * 0.55 * (0.4 + p * 0.6);
        const tire = Math.sin(2 * Math.PI * (18 + p * 8) * t) * 0.15;
        out[i] = (rumble + whoosh * 0.5 + tire) * env * 0.58;
    }
    return out;
}

function synthMotorcyclePass(sec = 1.1) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const p = t / sec;
        const env = Math.sin(p * Math.PI) ** 2.2;
        const rev = Math.sin(2 * Math.PI * (220 + p * 480) * t) * 0.42;
        const exhaust = (Math.random() * 2 - 1) * 0.35 * Math.exp(-((p - 0.35) ** 2) * 18);
        const whine = Math.sin(2 * Math.PI * (880 + p * 1200) * t) * 0.12;
        out[i] = (rev + exhaust + whine) * env * 0.55;
    }
    return out;
}

function synthSirenDistant(sec = 3.6) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const wail = Math.sin(2 * Math.PI * (420 + Math.sin(t * 2.8) * 180) * t);
        const bed = (Math.random() * 2 - 1) * 0.08;
        const env = 0.55 + Math.sin(t * 0.9) * 0.15;
        out[i] = (wail * 0.32 + bed) * env * 0.42;
    }
    return out;
}

function synthConstructionBeep(sec = 0.55) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const beepOn = (Math.floor(t * 2.2) % 2) === 0;
        const tone = beepOn ? Math.sin(2 * Math.PI * 980 * t) * 0.45 : 0;
        const click = beepOn && (i % 120 < 8) ? (Math.random() * 2 - 1) * 0.12 : 0;
        const env = Math.exp(-t * 1.8);
        out[i] = (tone + click) * env * 0.58;
    }
    return out;
}

function synthRadioChatterLoop(sec = 4.2) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const burst = Math.max(0, Math.sin(t * 3.6 + 0.8)) ** 3;
        const voice = (Math.random() * 2 - 1) * 0.22 * burst;
        const formant = Math.sin(2 * Math.PI * (180 + Math.sin(t * 5) * 60) * t) * 0.08 * burst;
        const staticBed = (Math.random() * 2 - 1) * 0.06;
        const hiss = Math.sin(2 * Math.PI * 4200 * t) * 0.02 * (0.4 + burst);
        const fade = Math.min(1, i / (SR * 0.12), (n - i) / (SR * 0.12));
        out[i] = (voice + formant + staticBed + hiss) * 0.42 * fade;
    }
    return out;
}

function synthCoffeeMurmurLoop(sec = 5.0) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const crowd = (Math.random() * 2 - 1) * 0.28;
        const murmur = Math.sin(2 * Math.PI * 95 * t) * 0.12 + Math.sin(2 * Math.PI * 140 * t) * 0.08;
        const clink = Math.exp(-(((t % 0.9) - 0.15) ** 2) * 120) * (Math.random() * 2 - 1) * 0.18;
        const cup = Math.exp(-(((t % 1.4) - 0.55) ** 2) * 80) * 0.12;
        const fade = Math.min(1, i / (SR * 0.2), (n - i) / (SR * 0.2));
        out[i] = (crowd * 0.35 + murmur + clink + cup) * 0.38 * fade;
    }
    return out;
}

function synthDoorCreak(sec = 0.85) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const scrape = Math.sin(2 * Math.PI * (120 + t * 85) * t) * 0.35;
        const grit = (Math.random() * 2 - 1) * 0.28;
        const env = Math.sin(Math.min(1, t / 0.08) * Math.PI * 0.5) * Math.exp(-t * 2.2);
        out[i] = (scrape + grit * 0.55) * env * 0.58;
    }
    return out;
}

function synthElevatorDing(sec = 0.65) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const ding = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 6);
        const overtone = Math.sin(2 * Math.PI * 1320 * t) * Math.exp(-t * 8) * 0.35;
        const bell = Math.sin(2 * Math.PI * 1760 * t) * Math.exp(-t * 12) * 0.15;
        out[i] = (ding + overtone + bell) * 0.62;
    }
    return out;
}

function synthCashRegister(sec = 0.75) {
    const n = Math.floor(SR * sec);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        const ka = t < 0.12 ? Math.sin(2 * Math.PI * 620 * t) * 0.5 : 0;
        const ching = t > 0.1 && t < 0.35 ? Math.sin(2 * Math.PI * 1480 * (t - 0.1)) * Math.exp(-(t - 0.1) * 14) * 0.55 : 0;
        const drawer = t > 0.28 ? (Math.random() * 2 - 1) * 0.22 * Math.exp(-(t - 0.28) * 8) : 0;
        const bell = Math.exp(-((t - 0.18) ** 2) * 200) * 0.35;
        out[i] = (ka + ching + drawer + bell) * 0.58;
    }
    return out;
}

/** Procedural-only — combat/impact/footsteps/ambient use sounds:fetch:sfx + recorded clips */
const CLIPS = [
    { id: 'starter_eng_two_stroke', name: 'Two-Stroke Engine', file: 'engine_two_stroke', synth: synthTwoStroke, category: 'engine', vehicle: 'tc_run' },
    { id: 'starter_eng_v8', name: 'V8 Engine Idle', file: 'engine_v8', synth: synthV8, category: 'engine', vehicle: 'tc_haul' },
    { id: 'starter_terminal_chirp', name: 'Terminal Chirp', file: 'terminal_chirp', synth: synthTerminalChirp, category: 'ui' },
    { id: 'starter_amb_creek', name: 'Creek Water', file: 'amb_creek', synth: synthCreekLoop, category: 'ambient' },
    { id: 'starter_amb_power_hum', name: 'Power Line Hum', file: 'amb_power_hum', synth: synthPowerHum, category: 'ambient' },
    { id: 'starter_fence_rattle', name: 'Fence Chain Rattle', file: 'fence_rattle', synth: synthFenceRattle, category: 'ambient' },
    { id: 'starter_amb_cicada', name: 'Cicadas (day)', file: 'amb_cicada', synth: synthCicadaLoop, category: 'ambient' },
    { id: 'starter_amb_crickets', name: 'Crickets (night)', file: 'amb_crickets', synth: synthCricketsLoop, category: 'ambient' },
    { id: 'starter_wildlife_dog_bark', name: 'Dog Bark', file: 'wildlife_dog_bark', synth: synthDogBark, category: 'wildlife' },
    { id: 'starter_wildlife_cat_meow', name: 'Cat Meow', file: 'wildlife_cat_meow', synth: synthCatMeow, category: 'wildlife' },
    { id: 'starter_wildlife_owl_hoot', name: 'Owl Hoot', file: 'wildlife_owl_hoot', synth: synthOwlHoot, category: 'wildlife' },
    { id: 'starter_wildlife_fish_splash', name: 'Fish Splash', file: 'wildlife_fish_splash', synth: synthFishSplash, category: 'wildlife' },
    { id: 'starter_urban_truck_pass', name: 'Semi Truck Pass', file: 'urban_truck_pass', synth: synthTruckPass, category: 'urban' },
    { id: 'starter_urban_moto_pass', name: 'Motorcycle Pass', file: 'urban_moto_pass', synth: synthMotorcyclePass, category: 'urban' },
    { id: 'starter_urban_siren_distant', name: 'Distant Siren', file: 'urban_siren_distant', synth: synthSirenDistant, category: 'urban' },
    { id: 'starter_urban_construction_beep', name: 'Construction Beep', file: 'urban_construction_beep', synth: synthConstructionBeep, category: 'urban' },
    { id: 'starter_interior_radio_chatter', name: 'Radio Chatter', file: 'interior_radio_chatter', synth: synthRadioChatterLoop, category: 'interior' },
    { id: 'starter_interior_coffee_murmur', name: 'Coffee Shop Murmur', file: 'interior_coffee_murmur', synth: synthCoffeeMurmurLoop, category: 'interior' },
    { id: 'starter_interior_door_creak', name: 'Door Creak', file: 'interior_door_creak', synth: synthDoorCreak, category: 'interior' },
    { id: 'starter_interior_elevator_ding', name: 'Elevator Ding', file: 'interior_elevator_ding', synth: synthElevatorDing, category: 'interior' },
    { id: 'starter_interior_cash_register', name: 'Cash Register', file: 'interior_cash_register', synth: synthCashRegister, category: 'interior' },
];

function tryCompress(wavPath, oggPath) {
    if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    const cmds = [
        `ffmpeg -y -i "${wavPath}" -ac 1 -ar ${SR} -c:a libvorbis -q:a 5 "${oggPath}"`,
        `ffmpeg -y -i "${wavPath}" -ac 1 -ar ${SR} -c:a libopus -b:a 48k "${oggPath.replace(/\.ogg$/, '.opus')}"`,
    ];
    for (const cmd of cmds) {
        try {
            execSync(cmd, { stdio: 'pipe' });
            if (fs.existsSync(oggPath) || fs.existsSync(oggPath.replace(/\.ogg$/, '.opus'))) return true;
        } catch { /* next */ }
    }
    return false;
}

function mergeManifest(newClips) {
    const existing = fs.existsSync(MANIFEST)
        ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
        : { format: 'threshold-starter-sounds', version: 4, sampleRate: SR, clips: [] };
    const proceduralIds = new Set(CLIPS.map((c) => c.id));
    const preserved = (existing.clips || []).filter((c) => !proceduralIds.has(c.id));
    const byId = new Map(preserved.map((c) => [c.id, c]));
    newClips.forEach((c) => byId.set(c.id, c));
    existing.clips = [...byId.values()];
    existing.sampleRate = SR;
    existing.version = Math.max(existing.version || 4, 4);
    return existing;
}

function main() {
    OUT_DIRS.forEach((d) => fs.mkdirSync(d, { recursive: true }));

    const newClips = [];
    let compressed = 0;
    for (const clip of CLIPS) {
        const samples = clip.synth();
        const wavName = `${clip.file}.wav`;
        for (const dir of OUT_DIRS) {
            writeWav(path.join(dir, wavName), samples);
        }
        const wavPath = path.join(OUT_DIRS[0], wavName);
        const oggPath = path.join(OUT_DIRS[0], `${clip.file}.ogg`);
        if (tryCompress(wavPath, oggPath)) {
            compressed += 1;
            for (const dir of OUT_DIRS) {
                if (dir !== OUT_DIRS[0] && fs.existsSync(oggPath)) {
                    fs.copyFileSync(oggPath, path.join(dir, `${clip.file}.ogg`));
                }
            }
        }

        const stat = fs.statSync(wavPath);
        const oggExists = fs.existsSync(oggPath);
        const oggBytes = oggExists ? fs.statSync(oggPath).size : null;
        newClips.push({
            id: clip.id,
            name: clip.name,
            wav: `sounds/starter/${wavName}`,
            ogg: oggExists ? `sounds/starter/${clip.file}.ogg` : null,
            category: clip.category || 'fx',
            vehicle: clip.vehicle || null,
            bytes: stat.size,
            oggBytes,
            preferred: oggExists ? 'ogg' : 'wav',
            license: 'Original — Threshold procedural',
        });
        console.log(`[gen-starter-sfx] ${clip.id} → ${wavName} (${(stat.size / 1024).toFixed(1)} KB)`);
    }

    const manifest = mergeManifest(newClips);
    const manifestJson = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(MANIFEST, manifestJson);
    for (const dir of OUT_DIRS) {
        fs.writeFileSync(path.join(dir, 'starter-sounds.json'), manifestJson);
    }
    console.log('[gen-starter-sfx] manifest → config/starter-sounds.json + bundle/sounds/starter/');
    if (compressed) console.log(`[gen-starter-sfx] ${compressed} clip(s) compressed to OGG via ffmpeg`);
    else console.log('[gen-starter-sfx] ffmpeg not found — WAV only (still lightweight at 22 kHz mono)');
}

main();