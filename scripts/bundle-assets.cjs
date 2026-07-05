#!/usr/bin/env node
/**
 * Copy creative assets (textures/, import/) into dist-pages/bundle/ for native/web packaging.
 * Run automatically before package:win / package:android, or standalone: npm run bundle:assets
 */
const fs = require('fs');
const path = require('path');
const { groupTextureFiles } = require('./hilod-utils.cjs');
const LOD_DISTANCES = require('../config/lod-distances.json').distances;

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist-pages', 'bundle');
const DIRS = ['textures', 'import', 'video', 'sounds'];
const MANIFESTS = {
    textures: 'threshold_manifest.json',
    import: 'threshold_blender_manifest.json',
    video: 'threshold_video_manifest.json',
};

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return 0;
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        ensureDir(dest);
        let count = 0;
        for (const entry of fs.readdirSync(src)) {
            count += copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
        return count;
    }
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    return 1;
}

function listFiles(dir, base = dir) {
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            out.push(...listFiles(full, base));
        } else {
            out.push(path.relative(base, full).replace(/\\/g, '/'));
        }
    }
    return out;
}

function main() {
    const distIndex = path.join(ROOT, 'dist-pages', 'index.html');
    if (!fs.existsSync(distIndex)) {
        console.error('[bundle-assets] dist-pages missing — run npm run build first');
        process.exit(1);
    }

    ensureDir(OUT);
    let copied = 0;

    for (const dirName of DIRS) {
        const src = path.join(ROOT, dirName);
        const dest = path.join(OUT, dirName);
        copied += copyRecursive(src, dest);
    }

    const basisSrc = path.join(ROOT, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'basis');
    const basisDest = path.join(OUT, 'basis');
    if (fs.existsSync(basisSrc)) {
        copied += copyRecursive(basisSrc, basisDest);
    }
    const publicBasis = path.join(ROOT, 'public', 'basis');
    if (fs.existsSync(publicBasis)) {
        copied += copyRecursive(publicBasis, basisDest);
    }

    const index = {
        format: 'threshold-asset-bundle',
        bundledAt: new Date().toISOString(),
        root: 'bundle/',
        dirs: DIRS,
        manifests: MANIFESTS,
        lodDistances: LOD_DISTANCES,
        files: {},
        textureGroups: [],
    };

    for (const dirName of DIRS) {
        const bundleDir = path.join(OUT, dirName);
        index.files[dirName] = listFiles(bundleDir);
    }

    const textureFiles = (index.files.textures || []).map((rel) => path.basename(rel));
    index.textureGroups = groupTextureFiles(textureFiles).map((group) => ({
        ...group,
        variants: group.variants.map((v) => ({
            ...v,
            path: `textures/${index.files.textures.find((rel) => path.basename(rel) === v.file) || v.file}`,
        })),
    }));

    fs.writeFileSync(path.join(OUT, 'bundle-index.json'), JSON.stringify(index, null, 2));

    const texCount = index.files.textures?.length ?? 0;
    const importCount = index.files.import?.length ?? 0;
    const videoCount = index.files.video?.length ?? 0;
    console.log(`[bundle-assets] ${copied} file(s) → dist-pages/bundle/ (${texCount} textures, ${importCount} import, ${videoCount} video)`);
}

main();