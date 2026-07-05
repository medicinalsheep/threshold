#!/usr/bin/env node
/**
 * PNG → WebP sidecars for default bundle (textures/*.webp next to *.png).
 * Uses ffmpeg libwebp when available; PNG fallback always kept.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIRS = [
    path.join(ROOT, 'textures'),
    path.join(ROOT, 'public', 'bundle', 'textures'),
];
const QUALITY = 82;
const MAX_DIM = 512;

function hasFfmpeg() {
    try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function compressPng(pngPath, webpPath) {
    if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
    const cmd = `ffmpeg -y -i "${pngPath}" -vf "scale='min(${MAX_DIM},iw)':'min(${MAX_DIM},ih)':force_original_aspect_ratio=decrease" -quality ${QUALITY} "${webpPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    return fs.existsSync(webpPath);
}

function listPngs(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith('.png') && !f.includes('_512') && !f.includes('_1k') && !f.includes('_2k'));
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
        try {
            if (compressPng(pngPath, webpPath)) {
                ok += 1;
                const pngSize = fs.statSync(pngPath).size;
                const webpSize = fs.statSync(webpPath).size;
                saved += Math.max(0, pngSize - webpSize);
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