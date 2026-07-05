#!/usr/bin/env node
/**
 * Copy reference edition assets → import/, textures/, public/bundle/ (dev static)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EDITION = path.join(ROOT, 'reference', 'editions', 'threshold-ref-lite');

function copyFile(src, dest) {
    if (!fs.existsSync(src)) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
}

function syncPair(rel) {
    const src = path.join(EDITION, rel);
    const targets = [
        path.join(ROOT, rel),
        path.join(ROOT, 'public', 'bundle', rel),
    ];
    let ok = 0;
    targets.forEach((dest) => {
        if (copyFile(src, dest)) ok += 1;
    });
    return ok;
}

function main() {
    const manifestPath = path.join(EDITION, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        console.error('Missing edition manifest — run: npm run reference:fetch');
        process.exit(1);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const files = [
        ...(manifest.models || []).map((m) => m.file),
        ...(manifest.textures || []).map((t) => t.file),
    ];
    console.log('Syncing Threshold Reference Lite…\n');
    let count = 0;
    files.forEach((rel) => {
        const src = path.join(EDITION, rel);
        if (!fs.existsSync(src)) {
            console.warn(`  skip (missing): ${rel}`);
            return;
        }
        syncPair(rel);
        console.log(`  ${rel}`);
        count += 1;
    });
    const pubManifest = path.join(ROOT, 'public', 'reference', 'editions', 'threshold-ref-lite', 'manifest.json');
    copyFile(manifestPath, pubManifest);

    console.log(`\nSynced ${count} file(s) → import/, textures/, public/bundle/`);
    console.log('Dev: assets at /bundle/import/… · Native: npm run bundle:assets');
}

main();