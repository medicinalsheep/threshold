#!/usr/bin/env node
/** TC GIMP-style PBR textures + HILOD — R6 procedural (Node; GIMP build_tc_tex.py optional) */
const fs = require('fs');
const path = require('path');
const { writePng, fillRgba, scaleRgba } = require('./tc-png.cjs');

const ROOT = path.join(__dirname, '..');
const TEX = path.join(ROOT, 'textures');
const PUB = path.join(ROOT, 'public', 'bundle', 'textures');
const CFG = path.join(ROOT, 'config', 'tc-textures.json');
const MAN = path.join(TEX, 'threshold_manifest.json');
const GIMP_MANIFEST = 'threshold-gimp-manifest';
const TC_LIC = 'Original — TC';
const REALISM = 'r7';

function noise(x, y, seed = 0) {
    const n = Math.sin((x * 12.9898 + y * 78.233 + seed) * 43758.5453);
    return n - Math.floor(n);
}

function vehAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const stripe = Math.abs(v - 0.52) < 0.03;
    const cabin = u > 0.2 && u < 0.8 && v > 0.55 && v < 0.78;
    const nose = v > 0.72 && u > 0.25 && u < 0.75;
    const n = noise(x, y, 3) * 18;
    let base = pal.body;
    if (cabin) base = pal.trim;
    if (nose) base = [base[0] + 20, base[1] + 20, base[2] + 25];
    if (stripe) base = pal.accent;
    return [Math.min(255, base[0] + n), Math.min(255, base[1] + n), Math.min(255, base[2] + n), 255];
}

function vehRough(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const wheel = (u < 0.2 || u > 0.8) && (v < 0.35 || v > 0.65);
    const base = wheel ? 210 : 140;
    const n = noise(x, y, 7) * 35;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function vehMetal(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const wheel = (u < 0.22 || u > 0.78) && (v < 0.38 || v > 0.62);
    const stripe = Math.abs(v - 0.52) < 0.03;
    const val = wheel ? 220 : stripe ? 40 : 25;
    return [val, val, val, 255];
}

function chrAlbedo(x, y, w, h, pal) {
    const v = y / h;
    const badge = Math.abs(v - 0.55) < 0.06 && x > w * 0.42 && x < w * 0.58;
    const head = v > 0.72;
    const pants = v < 0.42;
    let base = pal.shirt;
    if (pants) base = pal.pants;
    if (head) base = pal.skin;
    if (badge) base = pal.accent;
    const n = noise(x, y, 11) * 12;
    return [Math.min(255, base[0] + n), Math.min(255, base[1] + n), Math.min(255, base[2] + n), 255];
}

function chrRough(x, y, w, h) {
    const v = y / h;
    const skin = v > 0.7;
    const base = skin ? 175 : 155;
    const n = noise(x, y, 13) * 30;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function spanAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const rail = u < 0.08 || u > 0.92;
    const line = Math.abs(v - 0.5) < 0.02;
    let base = rail ? pal.rail : pal.deck;
    if (line) base = pal.accent;
    const n = noise(x, y, 17) * 10;
    return [Math.min(255, base[0] + n), Math.min(255, base[1] + n), Math.min(255, base[2] + n), 255];
}

function spanRough(x, y, w, h) {
    const base = 165;
    const n = noise(x, y, 19) * 25;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function concreteAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const ring = Math.hypot(u - 0.5, v - 0.5);
    const edge = ring > 0.38 && ring < 0.44;
    let base = edge ? pal.ring : pal.base;
    const n = noise(x, y, 23) * 14;
    const speck = noise(x * 2, y * 2, 29) > 0.92 ? 18 : 0;
    return [Math.min(255, base[0] + n + speck), Math.min(255, base[1] + n + speck), Math.min(255, base[2] + n + speck), 255];
}

function concreteRough(x, y, w, h) {
    const base = 198;
    const n = noise(x, y, 31) * 22;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function wallAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const panel = Math.floor(v * 5) % 2 === 0;
    const seam = Math.abs((u * 8) % 1 - 0.5) < 0.04 || Math.abs((v * 5) % 1 - 0.5) < 0.03;
    let base = panel ? pal.base : pal.speck;
    if (seam) base = pal.ring;
    const n = noise(x, y, 53) * 11;
    return [Math.min(255, base[0] + n), Math.min(255, base[1] + n), Math.min(255, base[2] + n), 255];
}

function wallRough(x, y, w, h) {
    const base = 192;
    const n = noise(x, y, 57) * 28;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function stripeAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const stripe = Math.floor(u * 14) % 2 === 0;
    const base = stripe ? pal.paint : pal.asphalt;
    const n = noise(x, y, 61) * 8;
    return [Math.min(255, base[0] + n), Math.min(255, base[1] + n), Math.min(255, base[2] + n), 255];
}

function stripeRough(x, y, w, h) {
    const base = 175;
    const n = noise(x, y, 63) * 20;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function terminalAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const screen = u > 0.18 && u < 0.82 && v > 0.52 && v < 0.82;
    const trim = v < 0.2 || v > 0.88;
    let base = pal.body;
    if (screen) base = pal.screen;
    if (trim) base = pal.trim;
    const n = noise(x, y, 37) * 10;
    return [Math.min(255, base[0] + n), Math.min(255, base[1] + n), Math.min(255, base[2] + n), 255];
}

function terminalRough(x, y, w, h) {
    const v = y / h;
    const screen = v > 0.52 && v < 0.82;
    const base = screen ? 95 : 175;
    const n = noise(x, y, 41) * 20;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function terminalMetal(x, y, w, h) {
    const v = y / h;
    const bezel = v > 0.48 && v < 0.86;
    const val = bezel ? 140 : 18;
    const n = noise(x, y, 43) * 12;
    return [Math.min(255, val + n), Math.min(255, val + n), Math.min(255, val + n), 255];
}

function slotFn(asset, slot) {
    if (asset.style === 'vehicle') {
        if (slot === 'albedo') return (x, y, w, h) => vehAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => vehRough(x, y, w, h, asset.palette);
        if (slot === 'metalness') return (x, y, w, h) => vehMetal(x, y, w, h, asset.palette);
    }
    if (asset.style === 'character') {
        if (slot === 'albedo') return (x, y, w, h) => chrAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => chrRough(x, y, w, h);
    }
    if (asset.style === 'span') {
        if (slot === 'albedo') return (x, y, w, h) => spanAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => spanRough(x, y, w, h);
    }
    if (asset.style === 'concrete') {
        if (slot === 'albedo') return (x, y, w, h) => concreteAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => concreteRough(x, y, w, h);
    }
    if (asset.style === 'wall') {
        if (slot === 'albedo') return (x, y, w, h) => wallAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => wallRough(x, y, w, h);
    }
    if (asset.style === 'stripe') {
        if (slot === 'albedo') return (x, y, w, h) => stripeAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => stripeRough(x, y, w, h);
    }
    if (asset.style === 'terminal') {
        if (slot === 'albedo') return (x, y, w, h) => terminalAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => terminalRough(x, y, w, h);
        if (slot === 'metalness') return (x, y, w, h) => terminalMetal(x, y, w, h);
    }
    return () => [128, 128, 128, 255];
}

function exportSlot(asset, slot, baseSize, hilod, outDir) {
    const fn = slotFn(asset, slot);
    const full = fillRgba(baseSize, baseSize, fn);
    const baseName = `${asset.slug}_${slot}`;
    const files = [];

    const fullName = `${baseName}.png`;
    const fullPath = path.join(outDir, fullName);
    writePng(fullPath, baseSize, baseSize, full, fs);
    files.push(fullName);

    const entry = {
        id: `${asset.slug}_${slot}`,
        objectName: asset.objectName,
        slot,
        file: fullName,
        path: `textures/${fullName}`,
        tcEd: asset.tcEd,
        license: TC_LIC,
        realism: REALISM,
        variants: [],
    };

    for (const h of hilod) {
        const size = Math.max(8, Math.min(h.maxPx, baseSize * 2));
        const scaled = size === baseSize ? full : scaleRgba(full, baseSize, baseSize, size, size);
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

function loadManifest() {
    if (!fs.existsSync(MAN)) {
        return {
            format: GIMP_MANIFEST,
            formatVersion: 1,
            engineVersion: require(path.join(ROOT, 'package.json')).version,
            textures: [],
        };
    }
    return JSON.parse(fs.readFileSync(MAN, 'utf8'));
}

function mergeTcEntries(man, newEntries) {
    const drop = new Set(newEntries.map((e) => `${e.objectName}|${e.slot}`));
    man.textures = (man.textures || []).filter((t) => !drop.has(`${t.objectName}|${t.slot}`));
    man.textures.push(...newEntries);
    man.format = GIMP_MANIFEST;
    man.exportDir = 'textures';
    man.tcRealism = REALISM;
    man.exportedAt = new Date().toISOString();
    return man;
}

function main() {
    const cfg = JSON.parse(fs.readFileSync(CFG, 'utf8'));
    fs.mkdirSync(TEX, { recursive: true });
    fs.mkdirSync(PUB, { recursive: true });

    const entries = [];
    let fileCount = 0;

    for (const asset of cfg.assets) {
        for (const slot of asset.slots) {
            const { entry, files } = exportSlot(asset, slot, cfg.baseSize || 256, cfg.hilod || [], TEX);
            entries.push(entry);
            fileCount += files.length;
            files.forEach((f) => {
                fs.copyFileSync(path.join(TEX, f), path.join(PUB, f));
            });
            console.log(`[tc-gen-tex] ${asset.slug}_${slot} + ${entry.variants.length} HILOD`);
        }
    }

    const man = mergeTcEntries(loadManifest(), entries);
    fs.writeFileSync(MAN, JSON.stringify(man, null, 2));
    fs.copyFileSync(MAN, path.join(PUB, 'threshold_manifest.json'));

    console.log(`[tc-gen-tex] ${fileCount} PNG(s) · manifest → textures/threshold_manifest.json`);
}

main();