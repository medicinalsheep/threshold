#!/usr/bin/env node
/**
 * Export lightweight starter texture kit for forks / reference.
 * WebP base + _512 HILOD only — immersive defaults without full TC vehicle set.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEX = path.join(ROOT, 'textures');
const OUT = path.join(ROOT, 'exports', 'starter-texture-kit');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'starter-kit.json'), 'utf8'));
const MAN_PATH = path.join(TEX, 'threshold_manifest.json');

function copyIfExists(src, dest) {
    if (!fs.existsSync(src)) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
}

function resolveTextureFile(pngName, tier, preferWebp) {
    const stem = pngName.replace(/\.png$/i, '');
    const withTier = tier ? `${stem}${tier}` : stem;
    const webp = `${withTier}.webp`;
    const png = `${withTier}.png`;
    if (preferWebp && fs.existsSync(path.join(TEX, webp))) return webp;
    if (fs.existsSync(path.join(TEX, png))) return png;
    return null;
}

function main() {
    if (!fs.existsSync(MAN_PATH)) {
        console.error('[kit:export] run npm run tc:gen:tex first');
        process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(MAN_PATH, 'utf8'));
    const names = new Set(CFG.objectNames || []);
    const tiers = CFG.includeTiers || ['', '_512'];
    const preferWebp = CFG.preferWebp !== false;

    const entries = (manifest.textures || []).filter((t) => names.has(t.objectName));
    const copied = new Set();
    let fileCount = 0;

    fs.rmSync(OUT, { recursive: true, force: true });
    fs.mkdirSync(path.join(OUT, 'textures'), { recursive: true });

    for (const entry of entries) {
        for (const tier of tiers) {
            const file = resolveTextureFile(entry.file, tier, preferWebp);
            if (!file || copied.has(file)) continue;
            if (copyIfExists(path.join(TEX, file), path.join(OUT, 'textures', file))) {
                copied.add(file);
                fileCount += 1;
            }
        }
    }

    const kitManifest = {
        ...manifest,
        textures: entries.map((e) => ({
            ...e,
            variants: (e.variants || []).filter((v) => tiers.includes(v.suffix || '')),
        })),
        kitExportedAt: new Date().toISOString(),
        kitNote: CFG.description,
    };
    fs.writeFileSync(path.join(OUT, 'textures', 'threshold_manifest.json'), JSON.stringify(kitManifest, null, 2));

    for (const rel of CFG.includeConfigs || []) {
        const src = path.join(ROOT, rel);
        const dest = path.join(OUT, rel);
        if (copyIfExists(src, dest)) fileCount += 1;
    }

    const soundsDir = path.join(OUT, 'sounds', 'starter');
    fs.mkdirSync(soundsDir, { recursive: true });
    const soundMap = {
        starter_footstep_concrete: 'footstep_concrete.ogg',
        starter_footstep_grass: 'footstep_grass.ogg',
        starter_footstep_wood: 'footstep_wood.ogg',
        starter_footstep_gravel: 'footstep_gravel.ogg',
        starter_footstep_asphalt: 'footstep_asphalt.ogg',
        starter_footstep_metal: 'footstep_metal.ogg',
    };
    for (const id of CFG.includeSounds || []) {
        const oggName = soundMap[id] || `${id.replace('starter_', '')}.ogg`;
        const src = path.join(ROOT, 'sounds', 'starter', oggName);
        if (copyIfExists(src, path.join(soundsDir, oggName))) fileCount += 1;
    }

    const meta = {
        format: CFG.format,
        version: CFG.version,
        exportedAt: new Date().toISOString(),
        objects: CFG.objectNames,
        textureFiles: [...copied].sort(),
        fileCount,
        usage: [
            'Copy textures/ + config/ into your Threshold project',
            'Match mesh userData.name to objectName in manifest',
            'npm run tex:compress for full WebP set',
            'config/starter-textures.json controls UV tiling',
        ],
    };
    fs.writeFileSync(path.join(OUT, 'kit-manifest.json'), JSON.stringify(meta, null, 2));

    let bytes = 0;
    const walk = (dir) => {
        for (const f of fs.readdirSync(dir)) {
            const p = path.join(dir, f);
            if (fs.statSync(p).isDirectory()) walk(p);
            else bytes += fs.statSync(p).size;
        }
    };
    walk(OUT);
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    console.log(`[kit:export] ${fileCount} files → exports/starter-texture-kit/ (~${mb} MB)`);
    console.log(`[kit:export] ${entries.length} object preset(s) · tiers: ${tiers.join(', ')}`);

    try {
        const { main: exportChr } = require('./export-character-kit.cjs');
        exportChr();
    } catch (e) {
        console.warn('[kit:export] character kit skipped:', e.message || e);
    }
}

main();