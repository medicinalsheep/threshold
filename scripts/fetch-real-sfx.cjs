#!/usr/bin/env node
/**
 * Fetch real combat/impact/footstep/vehicle SFX from Mixkit (+ user clip aliases).
 * npm run sounds:fetch:sfx
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync, execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const IMPORT = path.join(ROOT, 'sounds', 'import', 'sfx');
const OUT_DIRS = [
    path.join(ROOT, 'sounds', 'starter'),
    path.join(ROOT, 'public', 'bundle', 'sounds', 'starter'),
];
const MANIFEST_PATH = path.join(ROOT, 'config', 'starter-sounds.json');
const SR = 22050;
const SOURCES = path.join(ROOT, 'config', 'real-sfx-sources.json');

function run(label, cmd, args) {
    console.log(`[fetch-sfx] ${label}`);
    const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
    if (r.status !== 0) {
        console.error(`[fetch-sfx] FAILED: ${label}`);
        return false;
    }
    return true;
}

function findFfmpeg() {
    const r = spawnSync('ffmpeg', ['-version'], { stdio: 'pipe', shell: true });
    if (r.status === 0) return 'ffmpeg';
    const roots = [
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages'),
        'C:\\ffmpeg\\bin',
    ].filter(Boolean);
    for (const root of roots) {
        if (!fs.existsSync(root)) continue;
        const hits = [];
        const walk = (dir, depth) => {
            if (depth > 4) return;
            for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, ent.name);
                if (ent.isDirectory()) walk(full, depth + 1);
                else if (ent.name === 'ffmpeg.exe') hits.push(full);
            }
        };
        walk(root, 0);
        if (hits[0]) {
            process.env.PATH = `${path.dirname(hits[0])}${path.delimiter}${process.env.PATH || ''}`;
            return hits[0];
        }
    }
    return null;
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Threshold-Asset-Fetch/1.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                httpGet(res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href)
                    .then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                res.resume();
                return;
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

async function downloadMixkit(src) {
    const url = `https://assets.mixkit.co/active_storage/sfx/${src.mixkitId}/${src.mixkitId}-preview.mp3`;
    fs.mkdirSync(IMPORT, { recursive: true });
    const dest = path.join(IMPORT, `${src.id}.mp3`);
    console.log(`[fetch-sfx] download ${src.clipId} ← mixkit:${src.mixkitId}`);
    fs.writeFileSync(dest, await httpGet(url));
    return dest;
}

function resolveFromRecorded(src) {
    const recId = src.fromRecorded;
    const starter = OUT_DIRS[0];
    for (const ext of ['.ogg', '.wav']) {
        const base = recId.replace('starter_', '').replace('starter_rec_', 'rec_');
        const candidates = [
            path.join(starter, `${src.outFile}${ext}`),
            path.join(starter, `${base}${ext}`),
            path.join(starter, `rec_metal_tap${ext}`),
        ];
        for (const p of candidates) {
            if (fs.existsSync(p)) return p;
        }
    }
    return null;
}

function processClip(src, inputPath) {
    const wavOut = path.join(OUT_DIRS[0], `${src.outFile}.wav`);
    const oggOut = path.join(OUT_DIRS[0], `${src.outFile}.ogg`);
    fs.mkdirSync(OUT_DIRS[0], { recursive: true });

    if (src.fromRecorded && !src.trimSec) {
        const ext = path.extname(inputPath);
        for (const dir of OUT_DIRS) {
            fs.mkdirSync(dir, { recursive: true });
            fs.copyFileSync(inputPath, path.join(dir, `${src.outFile}${ext}`));
        }
        const stat = fs.statSync(inputPath);
        return {
            wav: ext === '.wav' ? `sounds/starter/${src.outFile}.wav` : `sounds/starter/${src.outFile}${ext}`,
            ogg: ext === '.ogg' ? `sounds/starter/${src.outFile}.ogg` : null,
            bytes: stat.size,
            oggBytes: ext === '.ogg' ? stat.size : null,
            preferred: ext === '.ogg' ? 'ogg' : 'wav',
        };
    }

    const trim = src.trimSec || {};
    const ss = trim.start != null ? String(trim.start) : '0';
    const dur = trim.duration != null ? String(trim.duration) : null;
    const fade = src.fadeSec ?? 0.15;
    const vol = src.gain ?? 1;
    const af = [
        `afade=t=in:st=0:d=${fade}`,
        dur ? `afade=t=out:st=${Math.max(0, parseFloat(dur) - fade)}:d=${fade}` : null,
        `volume=${vol}`,
    ].filter(Boolean).join(',');

    const ffArgs = ['-y', '-ss', ss];
    if (dur) ffArgs.push('-t', dur);
    ffArgs.push('-i', inputPath, '-af', af, '-ac', '1', '-ar', String(SR), wavOut);
    if (!run(`trim ${src.outFile}`, 'ffmpeg', ffArgs)) return null;

    let ogg = null;
    try {
        execSync(`ffmpeg -y -i "${wavOut}" -ac 1 -ar ${SR} -c:a libvorbis -q:a 5 "${oggOut}"`, { stdio: 'pipe' });
        ogg = `sounds/starter/${src.outFile}.ogg`;
    } catch {
        console.warn(`[fetch-sfx] OGG skip ${src.outFile}`);
    }

    for (const dir of OUT_DIRS) {
        if (dir === OUT_DIRS[0]) continue;
        fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(wavOut, path.join(dir, `${src.outFile}.wav`));
        if (ogg && fs.existsSync(oggOut)) fs.copyFileSync(oggOut, path.join(dir, `${src.outFile}.ogg`));
    }

    const stat = fs.statSync(wavOut);
    const oggBytes = ogg && fs.existsSync(oggOut) ? fs.statSync(oggOut).size : null;
    return {
        wav: `sounds/starter/${src.outFile}.wav`,
        ogg,
        bytes: stat.size,
        oggBytes,
        preferred: ogg ? 'ogg' : 'wav',
    };
}

function mergeManifest(cfg, clips) {
    const manifest = fs.existsSync(MANIFEST_PATH)
        ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
        : { format: 'threshold-starter-sounds', version: 4, sampleRate: SR, clips: [] };

    const removeIds = new Set(cfg.removedProcedural || []);
    const byId = new Map((manifest.clips || []).filter((c) => !removeIds.has(c.id)).map((c) => [c.id, c]));
    clips.forEach((c) => byId.set(c.id, c));
    manifest.clips = [...byId.values()];
    manifest.realSfx = true;
    manifest.version = Math.max(manifest.version || 4, 5);

    const json = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(MANIFEST_PATH, json);
    OUT_DIRS.forEach((dir) => fs.writeFileSync(path.join(dir, 'starter-sounds.json'), json));
}

async function main() {
    if (!findFfmpeg()) {
        console.error('[fetch-sfx] ffmpeg required');
        process.exit(1);
    }
    const cfg = JSON.parse(fs.readFileSync(SOURCES, 'utf8'));
    const clips = [];

    for (const src of cfg.sources || []) {
        let input = null;
        if (src.fromRecorded) {
            input = resolveFromRecorded(src);
            if (!input) {
                console.warn(`[fetch-sfx] skip ${src.clipId} — recorded source missing`);
                continue;
            }
        } else {
            input = await downloadMixkit(src);
        }
        const meta = processClip(src, input);
        if (!meta) continue;
        clips.push({
            id: src.clipId,
            name: src.name,
            wav: meta.wav,
            ogg: meta.ogg,
            category: src.category,
            vehicle: null,
            bytes: meta.bytes,
            oggBytes: meta.oggBytes,
            preferred: meta.preferred,
            license: src.license,
            source: src.mixkitId ? `mixkit:${src.mixkitId}` : src.fromRecorded,
            replaces: src.replaces || null,
        });
        console.log(`[fetch-sfx] ✓ ${src.clipId}`);
    }

    if (!clips.length) process.exit(1);
    mergeManifest(cfg, clips);
    const removed = (cfg.removedProcedural || []).length;
    console.log(`[fetch-sfx] DONE — ${clips.length} real clip(s)${removed ? `, removed ${removed} procedural` : ''}`);
}

main().catch((e) => { console.error(e); process.exit(1); });