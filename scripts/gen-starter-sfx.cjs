#!/usr/bin/env node
/**
 * Procedural starter SFX — engines, guns, brakes, locks, glass, impacts.
 * No third-party audio ripped. Optional: drop WAV into sounds/import/ → sounds:compress
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

const CLIPS = [
    { id: 'starter_eng_two_stroke', name: 'Two-Stroke Engine', file: 'engine_two_stroke', synth: synthTwoStroke, category: 'engine', vehicle: 'tc_run' },
    { id: 'starter_eng_v8', name: 'V8 Engine Idle', file: 'engine_v8', synth: synthV8, category: 'engine', vehicle: 'tc_haul' },
    { id: 'starter_terminal_chirp', name: 'Terminal Chirp', file: 'terminal_chirp', synth: synthTerminalChirp, category: 'ui' },
    { id: 'starter_gun_pistol', name: 'Gun — Pistol', file: 'gun_pistol', synth: synthGunPistol, category: 'gun' },
    { id: 'starter_gun_rifle', name: 'Gun — Rifle', file: 'gun_rifle', synth: synthGunRifle, category: 'gun' },
    { id: 'starter_brake_squeal', name: 'Brake Squeal', file: 'brake_squeal', synth: synthBrake, category: 'vehicle' },
    { id: 'starter_door_lock', name: 'Door Lock', file: 'door_lock', synth: synthDoorLock, category: 'door' },
    { id: 'starter_door_unlock', name: 'Door Unlock', file: 'door_unlock', synth: synthDoorUnlock, category: 'door' },
    { id: 'starter_glass_break', name: 'Glass Break', file: 'glass_break', synth: synthGlassBreak, category: 'impact' },
    { id: 'starter_tire_skid', name: 'Tire Skid', file: 'tire_skid', synth: synthTireSkid, category: 'vehicle' },
    { id: 'starter_metal_hit', name: 'Metal Impact', file: 'metal_hit', synth: synthMetalHit, category: 'impact' },
    { id: 'starter_footstep_concrete', name: 'Footstep — Concrete', file: 'footstep_concrete', synth: synthFootstepConcrete, category: 'footstep' },
    { id: 'starter_footstep_metal', name: 'Footstep — Metal', file: 'footstep_metal', synth: synthFootstepMetal, category: 'footstep' },
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

function main() {
    OUT_DIRS.forEach((d) => fs.mkdirSync(d, { recursive: true }));

    const manifest = {
        format: 'threshold-starter-sounds',
        version: 2,
        sampleRate: SR,
        clips: [],
    };

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
        manifest.clips.push({
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