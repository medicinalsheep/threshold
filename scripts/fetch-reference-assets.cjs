#!/usr/bin/env node
/**
 * DEV ONLY — download external CC0 packs to reference/_dev-seeds/ for comparison.
 * NOT shipped. Do not copy into Child editions without transformation.
 * See docs/THRESHOLD_CHILD_ASSETS.md
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const SEED_DIR = path.join(ROOT, 'reference', '_dev-seeds', 'kenney-racing');
const KENNEY = 'https://raw.githubusercontent.com/KenneyNL/Starter-Kit-Racing/main';

const DOWNLOADS = [
    { url: `${KENNEY}/models/vehicle-motorcycle.glb`, rel: 'vehicle-motorcycle.glb' },
    { url: `${KENNEY}/models/vehicle-truck-green.glb`, rel: 'vehicle-truck-green.glb' },
    { url: `${KENNEY}/models/track-straight.glb`, rel: 'track-straight.glb' },
    { url: `${KENNEY}/models/Textures/colormap.png`, rel: 'colormap.png' },
    { url: `${KENNEY}/LICENSE`, rel: 'LICENSE.txt' },
];

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchUrl(res.headers.location).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                return;
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

async function main() {
    console.log('DEV ONLY — external seeds (gitignored, not shipped)\n');
    console.log('Policy: transform into Threshold Child assets before any internal use.\n');
    for (const item of DOWNLOADS) {
        const dest = path.join(SEED_DIR, item.rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        process.stdout.write(`  ${item.rel} … `);
        const buf = await fetchUrl(item.url);
        fs.writeFileSync(dest, buf);
        console.log(`${buf.length} bytes`);
    }
    console.log(`\nWrote → ${path.relative(ROOT, SEED_DIR)}/`);
    console.log('Next: kit-bash in Blender → threshold_child_*.glb → new Child edition');
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});