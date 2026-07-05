#!/usr/bin/env node
/**
 * Fetch real ambient clips (rain/thunder/wind) from Mixkit, direct URLs, or YouTube.
 * Clips with ffmpeg → 22 kHz mono WAV + OGG → sounds/starter/
 *
 * npm run sounds:fetch:ambient
 * npm run sounds:process:ambient   # re-process sounds/import/weather/ only
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawnSync, execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const IMPORT = path.join(ROOT, 'sounds', 'import', 'weather');
const OUT_DIRS = [
    path.join(ROOT, 'sounds', 'starter'),
    path.join(ROOT, 'public', 'bundle', 'sounds', 'starter'),
];
const MANIFEST_PATH = path.join(ROOT, 'config', 'starter-sounds.json');
const SR = 22050;
const SOURCES = path.join(ROOT, 'config', 'ambient-sound-sources.json');

function hasCmd(cmd, args = ['--version']) {
    const r = spawnSync(cmd, args, { stdio: 'pipe', shell: true });
    return r.status === 0;
}

function run(label, cmd, args, opts = {}) {
    console.log(`[fetch-ambient] ${label}`);
    const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    if (r.status !== 0) {
        console.error(`[fetch-ambient] FAILED: ${label}`);
        return false;
    }
    return true;
}

function ytDlp() {
    if (hasCmd('yt-dlp')) return 'yt-dlp';
    if (hasCmd('python', ['-m', 'yt_dlp', '--version'])) return 'python';
    return null;
}

function findFfmpeg() {
    if (hasCmd('ffmpeg', ['-version'])) return 'ffmpeg';
    const roots = [
        process.env.FFMPEG_PATH,
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages'),
        'C:\\ffmpeg\\bin',
    ].filter(Boolean);
    for (const root of roots) {
        if (!fs.existsSync(root)) continue;
        const tryPath = (p) => {
            if (fs.existsSync(p)) {
                process.env.PATH = `${path.dirname(p)}${path.delimiter}${process.env.PATH || ''}`;
                return p;
            }
            return null;
        };
        const direct = tryPath(path.join(root, 'ffmpeg.exe'));
        if (direct) return direct;
        try {
            const hits = [];
            const walk = (dir, depth) => {
                if (depth > 4 || hits.length) return;
                for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
                    const full = path.join(dir, ent.name);
                    if (ent.isDirectory()) walk(full, depth + 1);
                    else if (ent.name === 'ffmpeg.exe') hits.push(full);
                }
            };
            walk(root, 0);
            if (hits[0]) return tryPath(hits[0]);
        } catch { /* */ }
    }
    return null;
}

function ffmpeg() {
    return findFfmpeg();
}

function loadSources() {
    return JSON.parse(fs.readFileSync(SOURCES, 'utf8'));
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        lib.get(url, { headers: { 'User-Agent': 'Threshold-Asset-Fetch/1.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const next = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : new URL(res.headers.location, url).href;
                httpGet(next).then(resolve).catch(reject);
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

function sourceUrl(src) {
    if (src.url) return src.url;
    if (src.mixkitId) return `https://assets.mixkit.co/active_storage/sfx/${src.mixkitId}/${src.mixkitId}-preview.mp3`;
    return null;
}

async function downloadDirect(src) {
    const url = sourceUrl(src);
    if (!url) return null;
    fs.mkdirSync(IMPORT, { recursive: true });
    const ext = path.extname(new URL(url).pathname) || '.mp3';
    const dest = path.join(IMPORT, `${src.id}${ext}`);
    console.log(`[fetch-ambient] download ${src.id} ← ${url}`);
    const buf = await httpGet(url);
    fs.writeFileSync(dest, buf);
    return dest;
}

function downloadYoutube(src) {
    fs.mkdirSync(IMPORT, { recursive: true });
    const outTpl = path.join(IMPORT, `${src.id}.%(ext)s`);
    const ytdlp = ytDlp();
    if (!ytdlp) {
        console.error('[fetch-ambient] yt-dlp not found — pip install yt-dlp');
        return null;
    }
    const extra = ['--js-runtimes', 'node', '--remote-components', 'ejs:github'];
    const args = ytdlp === 'yt-dlp'
        ? ['-f', 'bestaudio/best', '--no-playlist', '-o', outTpl, ...extra, src.url]
        : ['-m', 'yt_dlp', '-f', 'bestaudio/best', '--no-playlist', '-o', outTpl, ...extra, src.url];
    const cmd = ytdlp === 'yt-dlp' ? 'yt-dlp' : 'python';
    if (!run(`download ${src.id}`, cmd, args)) return null;
    const files = fs.readdirSync(IMPORT).filter((f) => f.startsWith(src.id + '.'));
    return files.length ? path.join(IMPORT, files[0]) : null;
}

async function downloadSource(src) {
    if (src.mixkitId || (src.url && !src.url.includes('youtube.com'))) {
        return downloadDirect(src);
    }
    if (src.url?.includes('youtube.com')) {
        return downloadYoutube(src);
    }
    console.warn(`[fetch-ambient] no url/mixkitId for ${src.id}`);
    return null;
}

function processClip(src, inputPath) {
    const ff = ffmpeg();
    if (!ff) {
        console.warn('[fetch-ambient] ffmpeg missing — copy raw (install: winget install Gyan.FFmpeg)');
        const ext = path.extname(inputPath);
        for (const dir of OUT_DIRS) {
            fs.mkdirSync(dir, { recursive: true });
            fs.copyFileSync(inputPath, path.join(dir, `${src.outFile}${ext}`));
        }
        return { wav: `${src.outFile}${ext}`, ogg: null, preferred: 'wav' };
    }

    const wavOut = path.join(OUT_DIRS[0], `${src.outFile}.wav`);
    const oggOut = path.join(OUT_DIRS[0], `${src.outFile}.ogg`);
    fs.mkdirSync(OUT_DIRS[0], { recursive: true });

    const trim = src.trimSec || {};
    const ss = trim.start != null ? String(trim.start) : '0';
    const dur = trim.duration != null ? String(trim.duration) : null;
    const fade = src.fadeSec || 0.4;
    const vol = src.gain != null ? src.gain : 1;

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
        ogg = `${src.outFile}.ogg`;
    } catch {
        console.warn(`[fetch-ambient] OGG skip for ${src.outFile}`);
    }

    for (const dir of OUT_DIRS) {
        if (dir === OUT_DIRS[0]) continue;
        fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(wavOut, path.join(dir, `${src.outFile}.wav`));
        if (ogg && fs.existsSync(oggOut)) fs.copyFileSync(oggOut, path.join(dir, ogg));
    }

    const stat = fs.statSync(wavOut);
    const oggBytes = ogg && fs.existsSync(oggOut) ? fs.statSync(oggOut).size : null;
    return {
        wav: `sounds/starter/${src.outFile}.wav`,
        ogg: ogg ? `sounds/starter/${src.outFile}.ogg` : null,
        bytes: stat.size,
        oggBytes,
        preferred: ogg ? 'ogg' : 'wav',
    };
}

function mergeManifest(newClips) {
    const manifest = fs.existsSync(MANIFEST_PATH)
        ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
        : { format: 'threshold-starter-sounds', version: 3, sampleRate: SR, clips: [] };

    const byId = new Map((manifest.clips || []).map((c) => [c.id, c]));
    newClips.forEach((c) => byId.set(c.id, c));
    manifest.clips = [...byId.values()];
    manifest.version = 4;
    manifest.realAmbient = true;

    const json = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(MANIFEST_PATH, json);
    for (const dir of OUT_DIRS) {
        fs.writeFileSync(path.join(dir, 'starter-sounds.json'), json);
    }
}

function buildClipEntry(src, meta) {
    const source = src.url
        || (src.mixkitId ? `https://mixkit.co/free-sound-effects/` : null);
    return {
        id: src.clipId,
        name: src.name,
        wav: meta.wav,
        ogg: meta.ogg,
        category: src.category || 'ambient',
        vehicle: null,
        bytes: meta.bytes,
        oggBytes: meta.oggBytes,
        preferred: meta.preferred,
        license: src.license,
        source: source || `mixkit:${src.mixkitId}`,
        dynamic: src.dynamic || null,
    };
}

async function processLocalOnly() {
    const cfg = loadSources();
    if (!ffmpeg()) {
        console.error('[fetch-ambient] ffmpeg required for process-local');
        process.exit(1);
    }
    const clips = [];
    for (const src of cfg.sources) {
        const local = fs.readdirSync(IMPORT).find((f) => f.startsWith(src.id + '.'));
        if (!local) continue;
        const meta = processClip(src, path.join(IMPORT, local));
        if (!meta) continue;
        clips.push(buildClipEntry(src, meta));
    }
    if (clips.length) mergeManifest(clips);
    console.log(`[fetch-ambient] processed ${clips.length} local clip(s)`);
}

async function main() {
    const localOnly = process.argv.includes('--local-only');
    if (localOnly) {
        await processLocalOnly();
        return;
    }

    if (!ffmpeg()) {
        console.error('[fetch-ambient] ffmpeg required — winget install Gyan.FFmpeg');
        process.exit(1);
    }

    const cfg = loadSources();
    const clips = [];
    const refetch = process.argv.includes('--refetch');

    for (const src of cfg.sources) {
        let input = fs.readdirSync(IMPORT).find((f) => f.startsWith(src.id + '.'));
        input = input ? path.join(IMPORT, input) : null;
        if (!input || refetch) {
            input = await downloadSource(src);
        }
        if (!input) {
            console.warn(`[fetch-ambient] skip ${src.id} — no source file`);
            continue;
        }
        const meta = processClip(src, input);
        if (!meta) continue;
        clips.push(buildClipEntry(src, meta));
        const kb = meta.bytes ? (meta.bytes / 1024).toFixed(1) : '?';
        const oggKb = meta.oggBytes ? ` + ${(meta.oggBytes / 1024).toFixed(1)} KB ogg` : '';
        console.log(`[fetch-ambient] ✓ ${src.clipId} (${kb} KB wav${oggKb})`);
    }

    if (!clips.length) {
        console.error('[fetch-ambient] no clips produced — check ffmpeg and config/ambient-sound-sources.json');
        process.exit(1);
    }

    mergeManifest(clips);
    console.log(`[fetch-ambient] DONE — ${clips.length} real ambient clip(s) → sounds/starter/`);
    console.log('[fetch-ambient] Credits required — see config/ambient-sound-sources.json + reference/SOURCES.md');
}

main().catch((e) => {
    console.error('[fetch-ambient]', e);
    process.exit(1);
});