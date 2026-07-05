#!/usr/bin/env node
/**
 * Tag + clip sounds from a user field recording.
 * Reads config/recorded-sound-sources.json → sounds/starter/ + manifest merge.
 *
 * npm run sounds:tag:recording
 * npm run sounds:tag:recording -- --source "C:\path\to\clip.m4a"
 */
const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, 'config', 'recorded-sound-sources.json');
const TAGS_OUT = path.join(ROOT, 'config', 'recorded-sound-tags.json');
const IMPORT_DIR = path.join(ROOT, 'sounds', 'import', 'recordings');
const OUT_DIRS = [
    path.join(ROOT, 'sounds', 'starter'),
    path.join(ROOT, 'public', 'bundle', 'sounds', 'starter'),
];
const MANIFEST_PATH = path.join(ROOT, 'config', 'starter-sounds.json');
const SR = 22050;

function findFfmpeg() {
    const tryCmd = spawnSync('ffmpeg', ['-version'], { stdio: 'pipe', shell: true });
    if (tryCmd.status === 0) return 'ffmpeg';
    const roots = [
        process.env.FFMPEG_PATH,
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages'),
        'C:\\ffmpeg\\bin',
    ].filter(Boolean);
    for (const root of roots) {
        if (!fs.existsSync(root)) continue;
        const walk = (dir, depth, hits) => {
            if (depth > 4) return;
            for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, ent.name);
                if (ent.isDirectory()) walk(full, depth + 1, hits);
                else if (ent.name === 'ffmpeg.exe') hits.push(full);
            }
        };
        const hits = [];
        walk(root, 0, hits);
        if (hits[0]) {
            process.env.PATH = `${path.dirname(hits[0])}${path.delimiter}${process.env.PATH || ''}`;
            return hits[0];
        }
    }
    return null;
}

function run(label, cmd, args) {
    console.log(`[tag-recording] ${label}`);
    const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
    if (r.status !== 0) {
        console.error(`[tag-recording] FAILED: ${label}`);
        return false;
    }
    return true;
}

function resolveSource(cfg) {
    const srcArg = process.argv.find((a, i) => process.argv[i - 1] === '--source');
    if (srcArg && fs.existsSync(srcArg)) return path.resolve(srcArg);

    const rel = path.join(ROOT, cfg.sourceFile || '');
    if (fs.existsSync(rel)) return rel;

    if (cfg.sourcePath && fs.existsSync(cfg.sourcePath)) {
        fs.mkdirSync(IMPORT_DIR, { recursive: true });
        const dest = path.join(IMPORT_DIR, path.basename(cfg.sourceFile || 'recording.m4a'));
        fs.copyFileSync(cfg.sourcePath, dest);
        console.log(`[tag-recording] copied source → ${dest}`);
        return dest;
    }

    return null;
}

function processSegment(inputPath, seg) {
    const wavOut = path.join(OUT_DIRS[0], `${seg.outFile}.wav`);
    const oggOut = path.join(OUT_DIRS[0], `${seg.outFile}.ogg`);
    fs.mkdirSync(OUT_DIRS[0], { recursive: true });

    const trim = seg.trimSec || {};
    const ss = trim.start != null ? String(trim.start) : '0';
    const dur = trim.duration != null ? String(trim.duration) : null;
    const fade = seg.fadeSec ?? 0.2;
    const vol = seg.gain ?? 1;

    const af = [
        `afade=t=in:st=0:d=${fade}`,
        dur ? `afade=t=out:st=${Math.max(0, parseFloat(dur) - fade)}:d=${fade}` : null,
        `volume=${vol}`,
    ].filter(Boolean).join(',');

    const ffArgs = ['-y', '-ss', ss];
    if (dur) ffArgs.push('-t', dur);
    ffArgs.push('-i', inputPath, '-af', af, '-ac', '1', '-ar', String(SR), wavOut);
    if (!run(`clip ${seg.tag} → ${seg.outFile}`, 'ffmpeg', ffArgs)) return null;

    let ogg = null;
    try {
        execSync(`ffmpeg -y -i "${wavOut}" -ac 1 -ar ${SR} -c:a libvorbis -q:a 5 "${oggOut}"`, { stdio: 'pipe' });
        ogg = `sounds/starter/${seg.outFile}.ogg`;
    } catch {
        console.warn(`[tag-recording] OGG skip ${seg.outFile}`);
    }

    for (const dir of OUT_DIRS) {
        if (dir === OUT_DIRS[0]) continue;
        fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(wavOut, path.join(dir, `${seg.outFile}.wav`));
        if (ogg && fs.existsSync(oggOut)) {
            fs.copyFileSync(oggOut, path.join(dir, `${seg.outFile}.ogg`));
        }
    }

    const stat = fs.statSync(wavOut);
    const oggBytes = ogg && fs.existsSync(oggOut) ? fs.statSync(oggOut).size : null;
    return {
        wav: `sounds/starter/${seg.outFile}.wav`,
        ogg,
        bytes: stat.size,
        oggBytes,
        preferred: ogg ? 'ogg' : 'wav',
    };
}

function mergeManifest(cfg, clips) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const byId = new Map((manifest.clips || []).map((c) => [c.id, c]));
    clips.forEach((c) => byId.set(c.id, c));
    manifest.clips = [...byId.values()];
    manifest.recordedAmbient = true;
    const json = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(MANIFEST_PATH, json);
    OUT_DIRS.forEach((dir) => {
        fs.writeFileSync(path.join(dir, 'starter-sounds.json'), json);
    });

    const tagIndex = {
        format: 'threshold-recorded-sound-tags',
        version: 1,
        source: cfg.sourceFile,
        license: cfg.license,
        tags: {},
    };
    clips.forEach((c) => {
        const tag = c.tag || 'unknown';
        if (!tagIndex.tags[tag]) tagIndex.tags[tag] = [];
        tagIndex.tags[tag].push({
            clipId: c.id,
            name: c.name,
            trimSec: c.trimSec,
            oneshot: !!c.dynamic?.oneshot,
            loop: !!c.dynamic?.loop,
        });
    });
    fs.writeFileSync(TAGS_OUT, JSON.stringify(tagIndex, null, 2));
    const bundleCfg = path.join(ROOT, 'public', 'bundle', 'config');
    fs.mkdirSync(bundleCfg, { recursive: true });
    fs.copyFileSync(TAGS_OUT, path.join(bundleCfg, 'recorded-sound-tags.json'));
}

function main() {
    if (!findFfmpeg()) {
        console.error('[tag-recording] ffmpeg required — winget install Gyan.FFmpeg');
        process.exit(1);
    }

    const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
    const input = resolveSource(cfg);
    if (!input) {
        console.error('[tag-recording] source not found — set sourcePath in config or pass --source');
        process.exit(1);
    }

    const clips = [];
    for (const seg of cfg.segments || []) {
        const meta = processSegment(input, seg);
        if (!meta) continue;
        clips.push({
            id: seg.clipId,
            name: seg.name,
            tag: seg.tag,
            wav: meta.wav,
            ogg: meta.ogg,
            category: seg.category || 'foley',
            vehicle: null,
            bytes: meta.bytes,
            oggBytes: meta.oggBytes,
            preferred: meta.preferred,
            license: cfg.license,
            source: cfg.sourceFile,
            trimSec: seg.trimSec,
            dynamic: seg.dynamic || { tag: seg.tag },
        });
        const kb = (meta.bytes / 1024).toFixed(1);
        const oggKb = meta.oggBytes ? ` + ${(meta.oggBytes / 1024).toFixed(1)} KB ogg` : '';
        console.log(`[tag-recording] ✓ [${seg.tag}] ${seg.clipId} (${kb} KB${oggKb})`);
    }

    if (!clips.length) {
        console.error('[tag-recording] no clips produced');
        process.exit(1);
    }

    mergeManifest(cfg, clips);
    console.log(`[tag-recording] DONE — ${clips.length} tagged clip(s)`);
    console.log(`[tag-recording] tag index → config/recorded-sound-tags.json`);
}

main();