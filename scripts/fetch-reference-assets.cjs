#!/usr/bin/env node
/**
 * Download CC0 reference assets into reference/editions/threshold-ref-lite/
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const EDITION = path.join(ROOT, 'reference', 'editions', 'threshold-ref-lite');
const KENNEY = 'https://raw.githubusercontent.com/KenneyNL/Starter-Kit-Racing/main';

const DOWNLOADS = [
    { url: `${KENNEY}/models/vehicle-motorcycle.glb`, rel: 'import/kenney_motorcycle.glb' },
    { url: `${KENNEY}/models/vehicle-truck-green.glb`, rel: 'import/kenney_truck_green.glb' },
    { url: `${KENNEY}/models/track-straight.glb`, rel: 'import/kenney_track_straight.glb' },
    { url: `${KENNEY}/models/Textures/colormap.png`, rel: 'textures/ref_kenney_colormap.png' },
    { url: `${KENNEY}/LICENSE`, rel: 'LICENSE-kenney-racing.txt' },
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
    console.log('Fetching Threshold Reference Lite (Kenney CC0)…\n');
    for (const item of DOWNLOADS) {
        const dest = path.join(EDITION, item.rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        process.stdout.write(`  ${item.rel} … `);
        const buf = await fetchUrl(item.url);
        fs.writeFileSync(dest, buf);
        console.log(`${buf.length} bytes`);
    }
    console.log('\nDone. Run: npm run reference:sync');
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});