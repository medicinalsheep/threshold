#!/usr/bin/env node
/** Single PNG → WebP (creative-watch live SYNC helper) */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { maxDimFor } = require('./texture-tier-utils.cjs');

const QUALITY = 82;

function hasFfmpeg() {
    try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function compressPng(pngPath) {
    if (!fs.existsSync(pngPath) || !hasFfmpeg()) return false;
    const webpPath = pngPath.replace(/\.png$/i, '.webp');
    const name = path.basename(pngPath);
    const maxDim = maxDimFor(name);
    if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
    const cmd = `ffmpeg -y -i "${pngPath}" -vf "scale='min(${maxDim},iw)':'min(${maxDim},ih)':force_original_aspect_ratio=decrease" -quality ${QUALITY} "${webpPath}"`;
    execSync(cmd, { stdio: 'pipe', shell: true });
    return fs.existsSync(webpPath);
}

const pngPath = process.argv[2];
if (!pngPath) process.exit(0);
const abs = path.isAbsolute(pngPath) ? pngPath : path.join(process.cwd(), pngPath);
if (compressPng(abs)) {
    console.log(`[compress-one] ${path.basename(abs)} → webp`);
}