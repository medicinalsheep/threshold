#!/usr/bin/env node
/** Batch-compress sounds/starter/*.wav → .ogg (ffmpeg) + refresh manifest preferred fields */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const STARTER = path.join(ROOT, 'sounds', 'starter');
const BUNDLE = path.join(ROOT, 'public', 'bundle', 'sounds', 'starter');
const MANIFEST = path.join(ROOT, 'config', 'starter-sounds.json');
const SR = 22050;

function hasFfmpeg() {
    try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function toOgg(wavPath, oggPath) {
    if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
    execSync(`ffmpeg -y -i "${wavPath}" -ac 1 -ar ${SR} -c:a libvorbis -q:a 5 "${oggPath}"`, { stdio: 'pipe' });
    return fs.existsSync(oggPath);
}

function main() {
    if (!hasFfmpeg()) {
        console.log('[compress-starter-wav] ffmpeg not on PATH — WAV fallback OK (22 kHz mono)');
        process.exit(0);
    }
    fs.mkdirSync(BUNDLE, { recursive: true });
    const wavs = fs.readdirSync(STARTER).filter((f) => f.endsWith('.wav'));
    let ok = 0;
    let saved = 0;
    const byFile = new Map();

    wavs.forEach((wavName) => {
        const base = wavName.replace(/\.wav$/i, '');
        const wavPath = path.join(STARTER, wavName);
        const oggPath = path.join(STARTER, `${base}.ogg`);
        try {
            if (toOgg(wavPath, oggPath)) {
                ok += 1;
                const wavBytes = fs.statSync(wavPath).size;
                const oggBytes = fs.statSync(oggPath).size;
                saved += Math.max(0, wavBytes - oggBytes);
                fs.copyFileSync(oggPath, path.join(BUNDLE, `${base}.ogg`));
                byFile.set(base, { oggBytes, wavBytes });
            }
        } catch (e) {
            console.warn(`[compress-starter-wav] ${wavName}: ${e.message}`);
        }
    });

    if (fs.existsSync(MANIFEST)) {
        const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
        let touched = 0;
        (manifest.clips || []).forEach((clip) => {
            const file = (clip.wav || '').split('/').pop()?.replace(/\.wav$/i, '');
            if (!file || !byFile.has(file)) return;
            const { oggBytes } = byFile.get(file);
            clip.ogg = `sounds/starter/${file}.ogg`;
            clip.oggBytes = oggBytes;
            clip.preferred = 'ogg';
            touched += 1;
        });
        const json = JSON.stringify(manifest, null, 2);
        fs.writeFileSync(MANIFEST, json);
        fs.writeFileSync(path.join(STARTER, 'starter-sounds.json'), json);
        console.log(`[compress-starter-wav] manifest updated (${touched} clips → preferred ogg)`);
    }

    console.log(`[compress-starter-wav] ${ok}/${wavs.length} OGG (saved ~${(saved / 1024).toFixed(0)} KB)`);
}

main();