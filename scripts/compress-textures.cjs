#!/usr/bin/env node
/**
 * PNG → WebP sidecars (all tiers including HILOD).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const { maxDimFor } = require('./texture-tier-utils.cjs');
const DIRS = [
    path.join(ROOT, 'textures'),
    path.join(ROOT, 'public', 'bundle', 'textures'),
];
const QUALITY = 82;

function hasFfmpeg() {
    try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function compressPng(pngPath, webpPath, maxDim) {
    if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
    const cmd = `ffmpeg -y -i "${pngPath}" -vf "scale='min(${maxDim},iw)':'min(${maxDim},ih)':force_original_aspect_ratio=decrease" -quality ${QUALITY} "${webpPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    return fs.existsSync(webpPath);
}

function listPngs(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
}

function main() {
    if (!hasFfmpeg()) {
        console.log('[compress-textures] ffmpeg not on PATH — skip WebP (PNG fallback OK)');
        process.exit(0);
    }

    const primary = DIRS[0];
    const pngs = listPngs(primary);
    let ok = 0;
    let saved = 0;

    for (const name of pngs) {
        const pngPath = path.join(primary, name);
        const webpName = name.replace(/\.png$/i, '.webp');
        const webpPath = path.join(primary, webpName);
        const maxDim = maxDimFor(name);
        try {
            if (compressPng(pngPath, webpPath, maxDim)) {
                ok += 1;
                saved += Math.max(0, fs.statSync(pngPath).size - fs.statSync(webpPath).size);
                for (const dir of DIRS) {
                    if (dir === primary) continue;
                    fs.mkdirSync(dir, { recursive: true });
                    fs.copyFileSync(webpPath, path.join(dir, webpName));
                }
            }
        } catch (e) {
            console.warn(`[compress-textures] ${name}: ${e.message}`);
        }
    }

    const mb = (saved / (1024 * 1024)).toFixed(2);
    console.log(`[compress-textures] ${ok}/${pngs.length} WebP @ q${QUALITY} (saved ~${mb} MB vs PNG)`);
}

main();