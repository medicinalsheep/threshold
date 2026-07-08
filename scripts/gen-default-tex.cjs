#!/usr/bin/env node
/**
 * 10.11.2 — Generate quality-first default textures (grid pad + AI Build Station).
 * 2K masters → HILOD tiers → WebP compression.
 */
const fs = require('fs');
const path = require('path');
const { writePng, fillRgba, scaleRgba } = require('./tc-png.cjs');
const { exportSlot, slotFn, mergeTcEntries, loadManifest, GIMP_MANIFEST, TC_LIC, REALISM } = require('./tc-gen-tex.cjs');
const { HILOD_OUTPUT_TIERS, MASTER_PX } = require('./texture-tier-utils.cjs');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TEX = path.join(ROOT, 'textures');
const PUB = path.join(ROOT, 'public', 'bundle', 'textures');
const CFG = path.join(ROOT, 'config', 'default-textures.json');
const MAN = path.join(TEX, 'threshold_manifest.json');

function exportSlotQuality(asset, slot, masterPx, hilod, outDir) {
    const fn = slotFn(asset, slot);
    const full = fillRgba(masterPx, masterPx, fn);
    const baseName = `${asset.slug}_${slot}`;
    const files = [];

    const fullName = `${baseName}.png`;
    const fullPath = path.join(outDir, fullName);
    writePng(fullPath, masterPx, masterPx, full, fs);
    files.push(fullName);

    const entry = {
        id: `${asset.slug}_${slot}`,
        objectName: asset.objectName,
        slot,
        file: fullName,
        path: `textures/${fullName}`,
        tcEd: asset.tcEd || 'tc-lite',
        license: TC_LIC,
        realism: REALISM,
        variants: [],
    };

    for (const h of hilod) {
        const size = Math.max(8, Math.min(h.px, masterPx));
        const scaled = size === masterPx ? full : scaleRgba(full, masterPx, masterPx, size, size);
        const vName = `${baseName}${h.suffix}.png`;
        writePng(path.join(outDir, vName), size, size, scaled, fs);
        files.push(vName);
        entry.variants.push({
            suffix: h.suffix,
            file: vName,
            path: `textures/${vName}`,
            maxPx: size,
        });
    }
    return { entry, files };
}

async function main() {
    const cfg = JSON.parse(fs.readFileSync(CFG, 'utf8'));
    const masterPx = cfg.masterPx || MASTER_PX;
    const hilod = cfg.hilod || HILOD_OUTPUT_TIERS;

    fs.mkdirSync(TEX, { recursive: true });
    fs.mkdirSync(PUB, { recursive: true });

    const entries = [];
    let fileCount = 0;

    for (const asset of cfg.assets || []) {
        for (const slot of asset.slots || []) {
            const { entry, files } = exportSlotQuality(asset, slot, masterPx, hilod, TEX);
            entries.push(entry);
            fileCount += files.length;
            const compressOne = path.join(__dirname, 'compress-one.cjs');
            for (const f of files) {
                fs.copyFileSync(path.join(TEX, f), path.join(PUB, f));
                spawn(process.execPath, [compressOne, path.join(TEX, f)], { stdio: 'ignore', cwd: ROOT }).unref();
            }
            console.log(`[gen-default-tex] ${asset.slug}_${slot} @ ${masterPx}px + ${entry.variants.length} tier(s)`);
        }
    }

    const man = mergeTcEntries(loadManifest(), entries);
    man.format = GIMP_MANIFEST;
    man.engineVersion = require(path.join(ROOT, 'package.json')).version;
    man.note = cfg.note;
    fs.writeFileSync(MAN, `${JSON.stringify(man, null, 2)}\n`);
    fs.copyFileSync(MAN, path.join(PUB, 'threshold_manifest.json'));

    console.log(`[gen-default-tex] ${fileCount} PNG(s) · manifest updated`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});