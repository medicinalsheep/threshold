#!/usr/bin/env node
/**
 * PNG → KTX2 sidecars (BasisU / toktx) for native + ultra graphics tiers.
 * Skips gracefully when no encoder is on PATH.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { maxDimFor } = require('./texture-tier-utils.cjs');

const ROOT = path.join(__dirname, '..');
const DIRS = [
    path.join(ROOT, 'textures'),
    path.join(ROOT, 'public', 'bundle', 'textures'),
];

function hasCmd(cmd) {
    try {
        execSync(process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`, { stdio: 'pipe', shell: true });
        return true;
    } catch {
        return false;
    }
}

function listPngs(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
}

function encodeKtx2(pngPath, ktx2Path, maxDim) {
    if (fs.existsSync(ktx2Path)) fs.unlinkSync(ktx2Path);
    const scale = maxDim < 4096
        ? `-vf "scale='min(${maxDim},iw)':'min(${maxDim},ih)':force_original_aspect_ratio=decrease"`
        : '';
    const tmp = path.join(path.dirname(ktx2Path), `_ktx2_tmp_${path.basename(pngPath)}`);
    if (scale && hasCmd('ffmpeg')) {
        execSync(`ffmpeg -y -i "${pngPath}" ${scale} "${tmp}"`, { stdio: 'pipe', shell: true });
    } else {
        fs.copyFileSync(pngPath, tmp);
    }
    const input = tmp;
    if (hasCmd('toktx')) {
        execSync(`toktx --t2 --bcmp --genmipmap --assign_oetf srgb "${ktx2Path}" "${input}"`, { stdio: 'pipe', shell: true });
    } else if (hasCmd('basisu')) {
        execSync(`basisu -ktx2 "${input}" -output_file "${ktx2Path}"`, { stdio: 'pipe', shell: true });
    } else {
        fs.unlinkSync(tmp);
        return false;
    }
    if (fs.existsSync(tmp) && tmp !== pngPath) fs.unlinkSync(tmp);
    return fs.existsSync(ktx2Path);
}

function main() {
    if (!hasCmd('toktx') && !hasCmd('basisu')) {
        console.log('[compress-ktx2] toktx/basisu not on PATH — skip KTX2 (WebP/PNG OK)');
        process.exit(0);
    }

    const primary = DIRS[0];
    const pngs = listPngs(primary);
    let ok = 0;

    for (const name of pngs) {
        const pngPath = path.join(primary, name);
        const ktx2Name = name.replace(/\.png$/i, '.ktx2');
        const ktx2Path = path.join(primary, ktx2Name);
        try {
            if (encodeKtx2(pngPath, ktx2Path, maxDimFor(name))) {
                ok += 1;
                for (const dir of DIRS) {
                    if (dir === primary) continue;
                    fs.mkdirSync(dir, { recursive: true });
                    fs.copyFileSync(ktx2Path, path.join(dir, ktx2Name));
                }
            }
        } catch (e) {
            console.warn(`[compress-ktx2] ${name}: ${e.message}`);
        }
    }

    console.log(`[compress-ktx2] ${ok}/${pngs.length} KTX2 sidecars`);
}

main();