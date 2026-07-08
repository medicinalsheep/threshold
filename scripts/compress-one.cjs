#!/usr/bin/env node
/** Single PNG → WebP (creative-watch / hilod-tiers helper) */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { maxDimFor, WEBP_QUALITY } = require('./texture-tier-utils.cjs');

let _sharp = null;

function loadSharp() {
    if (_sharp !== null) return _sharp;
    try {
        _sharp = require('sharp');
    } catch {
        _sharp = false;
    }
    return _sharp;
}

function hasFfmpeg() {
    try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

async function compressPng(pngPath) {
    if (!fs.existsSync(pngPath)) return false;
    const webpPath = pngPath.replace(/\.png$/i, '.webp');
    const name = path.basename(pngPath);
    const maxDim = maxDimFor(name);
    if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);

    const sharp = loadSharp();
    if (sharp) {
        try {
            await sharp(pngPath)
                .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: WEBP_QUALITY })
                .toFile(webpPath);
            return fs.existsSync(webpPath);
        } catch { /* fall through */ }
    }

    if (!hasFfmpeg()) return false;
    const cmd = `ffmpeg -y -i "${pngPath}" -vf "scale='min(${maxDim},iw)':'min(${maxDim},ih)':force_original_aspect_ratio=decrease" -quality ${WEBP_QUALITY} "${webpPath}"`;
    execSync(cmd, { stdio: 'pipe', shell: true });
    return fs.existsSync(webpPath);
}

const pngPath = process.argv[2];
if (!pngPath) process.exit(0);

const abs = path.isAbsolute(pngPath) ? pngPath : path.join(process.cwd(), pngPath);

compressPng(abs).then((ok) => {
    if (ok) console.log(`[compress-one] ${path.basename(abs)} → webp`);
}).catch(() => process.exit(0));