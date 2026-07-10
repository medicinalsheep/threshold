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
const REALISM = 'r8';

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

/** Multi-octave noise for hero-quality surfaces */
function fbm(x, y, seed = 0, octaves = 4) {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
        sum += noise(x * freq, y * freq, seed + i * 17) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2.1;
    }
    return sum / (norm || 1);
}

/**
 * Hero concrete slab — expansion joints, grit, soft AO in tile centers.
 * Used for Starter Ground / grid pad (quality-first default).
 */
function concreteAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    // Large-scale tile grid (≈4×4 panels)
    const tiles = 4;
    const tu = (u * tiles) % 1;
    const tv = (v * tiles) % 1;
    const jointW = 0.028;
    const joint = tu < jointW || tv < jointW || tu > 1 - jointW || tv > 1 - jointW;
    // Micro grit + soft variation
    const grit = fbm(x * 0.9, y * 0.9, 23, 5);
    const speck = fbm(x * 3.2, y * 3.2, 29, 3);
    // Subtle radial pad edge (lab floor ring)
    const ring = Math.hypot(u - 0.5, v - 0.5);
    const edgeBand = ring > 0.42 && ring < 0.47;
    // Tile-center darkening (wear bowl)
    const mid = Math.hypot(tu - 0.5, tv - 0.5);
    const wear = Math.max(0, 1 - mid * 2.2) * 10;

    let base = joint ? (pal.ring || [72, 76, 82]) : (pal.base || [42, 44, 48]);
    if (edgeBand && !joint) {
        base = [
            Math.min(255, base[0] + 14),
            Math.min(255, base[1] + 12),
            Math.min(255, base[2] + 10),
        ];
    }
    const n = (grit - 0.5) * 28 + (speck > 0.78 ? 12 : 0) - wear;
    const speck2 = speck > 0.93 ? 16 : 0;
    return [
        Math.max(0, Math.min(255, base[0] + n + speck2)),
        Math.max(0, Math.min(255, base[1] + n + speck2 * 0.9)),
        Math.max(0, Math.min(255, base[2] + n + speck2 * 0.85)),
        255,
    ];
}

function concreteRough(x, y, w, h) {
    const u = x / w;
    const v = y / h;
    const tiles = 4;
    const tu = (u * tiles) % 1;
    const tv = (v * tiles) % 1;
    const jointW = 0.028;
    const joint = tu < jointW || tv < jointW || tu > 1 - jointW || tv > 1 - jointW;
    // Joints slightly smoother (filled sealant); field is matte concrete
    const base = joint ? 165 : 205;
    const n = (fbm(x, y, 31, 4) - 0.5) * 36;
    const val = Math.max(40, Math.min(255, base + n));
    return [val, val, val, 255];
}

function concreteNormal(x, y, w, h) {
    // Height proxy: joints + grit for readable relief at 2K
    const u = x / w;
    const v = y / h;
    const tiles = 4;
    const tu = (u * tiles) % 1;
    const tv = (v * tiles) % 1;
    const jointW = 0.03;
    const joint = tu < jointW || tv < jointW || tu > 1 - jointW || tv > 1 - jointW;
    const h0 = fbm(x, y, 71, 4) * 0.55 + (joint ? 0.35 : 0);
    const hx = fbm(x + 1.2, y, 71, 4) * 0.55 + (((x + 1.2) / w * tiles) % 1 < jointW ? 0.35 : 0);
    const hy = fbm(x, y + 1.2, 71, 4) * 0.55 + ((v + 1.2 / h) * tiles % 1 < jointW ? 0.35 : 0);
    const nx = -(hx - h0) * 2.4;
    const ny = -(hy - h0) * 2.4;
    const nz = 1;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [
        Math.round((nx / len * 0.5 + 0.5) * 255),
        Math.round((ny / len * 0.5 + 0.5) * 255),
        Math.round((nz / len * 0.5 + 0.5) * 255),
        255,
    ];
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

function surfaceNormal(x, y, seed = 71, strength = 0.85) {
    const hx = noise(x + 1, y, seed) - noise(x - 1, y, seed);
    const hy = noise(x, y + 1, seed + 1) - noise(x, y - 1, seed + 1);
    const nx = -hx * strength;
    const ny = -hy * strength;
    const nz = 1;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [
        Math.round((nx / len * 0.5 + 0.5) * 255),
        Math.round((ny / len * 0.5 + 0.5) * 255),
        Math.round((nz / len * 0.5 + 0.5) * 255),
        255,
    ];
}

/**
 * Hero AI Build Station kiosk — chassis, bezel, glowing screen grid, status LEDs.
 */
function terminalAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const body = pal.body || [36, 40, 48];
    const screen = pal.screen || [14, 28, 44];
    const trim = pal.trim || [68, 74, 84];
    const accent = pal.accent || [40, 160, 220];

    // Chassis regions
    const foot = v < 0.12;
    const topCap = v > 0.9;
    const sideRail = u < 0.1 || u > 0.9;
    const screenRect = u > 0.16 && u < 0.84 && v > 0.28 && v < 0.78;
    const bezel = screenRect && (u < 0.2 || u > 0.8 || v < 0.32 || v > 0.74);
    const glass = screenRect && !bezel;
    // Status strip under screen
    const statusBar = u > 0.22 && u < 0.78 && v > 0.18 && v < 0.24;
    const ledOn = statusBar && ((Math.floor(u * 18) % 5) === 0);

    let base = body;
    if (foot || topCap || sideRail) base = trim;
    if (bezel) base = [trim[0] + 8, trim[1] + 8, trim[2] + 10];
    if (glass) {
        // Soft scanline + vignette
        const scan = Math.sin(v * h * 0.35) * 0.5 + 0.5;
        const vig = 1 - Math.hypot(u - 0.5, (v - 0.53) * 1.1) * 1.4;
        const glow = Math.max(0, vig) * 40;
        base = [
            Math.min(255, screen[0] + glow * 0.4 + scan * 8),
            Math.min(255, screen[1] + glow * 0.85 + scan * 12),
            Math.min(255, screen[2] + glow + scan * 18),
        ];
        // Grid of soft “UI tiles”
        const gx = Math.floor((u - 0.2) / 0.08);
        const gy = Math.floor((v - 0.34) / 0.07);
        if (gx >= 0 && gy >= 0 && (gx + gy) % 3 === 0) {
            base = [
                Math.min(255, base[0] + 12),
                Math.min(255, base[1] + 28),
                Math.min(255, base[2] + 40),
            ];
        }
    }
    if (statusBar) base = ledOn ? accent : [22, 26, 32];

    const n = (fbm(x, y, 37, 3) - 0.5) * 14;
    return [
        Math.max(0, Math.min(255, base[0] + n)),
        Math.max(0, Math.min(255, base[1] + n)),
        Math.max(0, Math.min(255, base[2] + n)),
        255,
    ];
}

function terminalRough(x, y, w, h) {
    const u = x / w;
    const v = y / h;
    const glass = u > 0.2 && u < 0.8 && v > 0.32 && v < 0.74;
    const bezel = u > 0.16 && u < 0.84 && v > 0.28 && v < 0.78 && !glass;
    const base = glass ? 55 : bezel ? 120 : 185;
    const n = (fbm(x, y, 41, 3) - 0.5) * 24;
    const val = Math.max(20, Math.min(255, base + n));
    return [val, val, val, 255];
}

function terminalMetal(x, y, w, h) {
    const u = x / w;
    const v = y / h;
    const glass = u > 0.2 && u < 0.8 && v > 0.32 && v < 0.74;
    const bezel = u > 0.16 && u < 0.84 && v > 0.28 && v < 0.78 && !glass;
    const rails = u < 0.1 || u > 0.9 || v < 0.12 || v > 0.9;
    let val = 22;
    if (rails) val = 95;
    if (bezel) val = 155;
    if (glass) val = 8;
    const n = (fbm(x, y, 43, 2) - 0.5) * 16;
    const o = Math.max(0, Math.min(255, val + n));
    return [o, o, o, 255];
}

function grassAlbedo(x, y, w, h, pal) {
    const blade = Math.sin((x / w) * 48 + noise(x, y, 81) * 4) > 0.1;
    const base = blade ? pal.blade : pal.dark;
    const n = noise(x * 3, y * 3, 83) * 16;
    const speck = noise(x, y, 87) > 0.94 ? 22 : 0;
    return [Math.min(255, base[0] + n + speck), Math.min(255, base[1] + n + speck), Math.min(255, base[2] + n), 255];
}

function grassRough(x, y, w, h) {
    const base = 210;
    const n = noise(x, y, 89) * 28;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function woodAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const plank = Math.floor(v * 6) % 2 === 0;
    const grain = Math.sin(u * 42 + noise(x, y, 91) * 2) * 0.5 + 0.5;
    let base = plank ? pal.grain : pal.dark;
    if (grain > 0.72) base = pal.ring;
    const gap = Math.abs((v * 6) % 1 - 0.5) < 0.03;
    if (gap) base = [Math.max(0, base[0] - 28), Math.max(0, base[1] - 28), Math.max(0, base[2] - 28)];
    const n = noise(x, y, 93) * 10;
    return [Math.min(255, base[0] + n), Math.min(255, base[1] + n), Math.min(255, base[2] + n), 255];
}

function woodRough(x, y, w, h) {
    const base = 178;
    const n = noise(x, y, 95) * 24;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function gravelAlbedo(x, y, w, h, pal) {
    const cell = noise(Math.floor(x / 4), Math.floor(y / 4), 97);
    const base = cell > 0.55 ? pal.stone : pal.dark;
    const speck = noise(x, y, 99) > 0.9 ? pal.speck : base;
    const n = noise(x, y, 101) * 12;
    return [Math.min(255, speck[0] + n), Math.min(255, speck[1] + n), Math.min(255, speck[2] + n), 255];
}

function gravelRough(x, y, w, h) {
    const base = 205;
    const n = noise(x, y, 103) * 30;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function dirtAlbedo(x, y, w, h, pal) {
    const streak = noise(x * 0.5, y * 0.5, 135) > 0.62;
    const base = streak ? pal.clay : pal.dust;
    const root = noise(x, y, 137) > 0.94 ? pal.dark : base;
    const n = noise(x, y, 139) * 14;
    return [Math.min(255, root[0] + n), Math.min(255, root[1] + n), Math.min(255, root[2] + n), 255];
}

function dirtRough(x, y, w, h) {
    const base = 218;
    const n = noise(x, y, 141) * 28;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function asphaltAlbedo(x, y, w, h, pal) {
    const crack = noise(x, y, 105) > 0.97;
    const base = crack ? pal.crack : pal.base;
    const n = noise(x, y, 107) * 9;
    const speck = noise(x * 2, y * 2, 109) > 0.93 ? 14 : 0;
    return [Math.min(255, base[0] + n + speck), Math.min(255, base[1] + n + speck), Math.min(255, base[2] + n + speck), 255];
}

function asphaltRough(x, y, w, h) {
    const base = 200;
    const n = noise(x, y, 111) * 22;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function fabricAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const weave = (Math.floor(u * 24) + Math.floor(v * 24)) % 2 === 0;
    const base = weave ? pal.weave : pal.thread;
    const fold = Math.sin(v * 8) * 0.08;
    const n = noise(x, y, 113) * 8;
    const shade = fold < -0.04 ? pal.shadow : base;
    return [Math.min(255, shade[0] + n), Math.min(255, shade[1] + n), Math.min(255, shade[2] + n), 255];
}

function fabricRough(x, y, w, h) {
    const base = 220;
    const n = noise(x, y, 115) * 18;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function skinAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const pore = noise(x, y, 171) * 14;
    const vein = Math.sin(v * 42 + noise(x, y, 173) * 2) * 6;
    const fold = Math.sin(u * 18) * Math.sin(v * 14) * 8;
    let base = pal.base;
    if (fold < -4) base = pal.shadow;
    else if (fold > 4) base = pal.warm;
    const n = pore + vein + noise(x, y, 175) * 6;
    return [Math.min(255, base[0] + n), Math.min(255, base[1] + n), Math.min(255, base[2] + n), 255];
}

function skinRough(x, y, w, h) {
    const pore = noise(x, y, 177) > 0.92 ? 145 : 178;
    const n = noise(x, y, 179) * 22;
    return [Math.min(255, pore + n), Math.min(255, pore + n), Math.min(255, pore + n), 255];
}

function hairAlphaAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const strand = Math.sin(u * 48 + noise(x, y, 181) * 3) * 0.5 + 0.5;
    const root = 1 - Math.pow(v, 0.65);
    const edge = Math.min(u, 1 - u, v, 1 - v);
    const alpha = Math.min(255, Math.floor(root * strand * Math.min(1, edge * 12) * 255));
    const hi = strand > 0.72 ? pal.highlight : pal.strand;
    const n = noise(x, y, 183) * 10;
    if (alpha < 18) return [0, 0, 0, 0];
    return [Math.min(255, hi[0] + n), Math.min(255, hi[1] + n), Math.min(255, hi[2] + n), alpha];
}

function metalGrateAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const slot = (Math.floor(u * 16) % 2 === 0) && (Math.floor(v * 16) % 2 === 0);
    const edge = u < 0.06 || u > 0.94 || v < 0.06 || v > 0.94;
    let base = slot ? pal.slot : pal.plate;
    if (edge) base = pal.edge;
    const n = noise(x, y, 117) * 10;
    return [Math.min(255, base[0] + n), Math.min(255, base[1] + n), Math.min(255, base[2] + n), 255];
}

function metalGrateRough(x, y, w, h) {
    const base = 155;
    const n = noise(x, y, 119) * 20;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function metalGrateMetal(x, y, w, h) {
    const u = x / w;
    const v = y / h;
    const slot = (Math.floor(u * 16) % 2 === 0) && (Math.floor(v * 16) % 2 === 0);
    const val = slot ? 35 : 195;
    const n = noise(x, y, 121) * 15;
    return [Math.min(255, val + n), Math.min(255, val + n), Math.min(255, val + n), 255];
}

function brickAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const row = Math.floor(v * 10);
    const col = Math.floor(u * 14);
    const stagger = row % 2 === 0 ? 0 : 0.5 / 14;
    const bu = (u + stagger) % (1 / 14);
    const bv = v % (1 / 10);
    const mortarX = bu < 0.06 || bu > 0.94;
    const mortarY = bv < 0.08 || bv > 0.92;
    const base = mortarX || mortarY ? pal.mortar : (noise(col, row, 145) > 0.55 ? pal.dark : pal.brick);
    const n = noise(x, y, 147) * 12;
    return [Math.min(255, base[0] + n), Math.min(255, base[1] + n), Math.min(255, base[2] + n), 255];
}

function brickRough(x, y, w, h) {
    const base = 215;
    const n = noise(x, y, 149) * 22;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function copperAlbedo(x, y, w, h, pal) {
    const u = x / w;
    const v = y / h;
    const scratch = noise(x * 2, y * 2, 151) > 0.88;
    const base = scratch ? pal.edge : noise(x, y, 153) > 0.62 ? pal.shine : pal.patina;
    const n = noise(x, y, 155) * 14;
    return [Math.min(255, base[0] + n), Math.min(255, base[1] + n), Math.min(255, base[2] + n), 255];
}

function copperRough(x, y, w, h) {
    const base = 128;
    const n = noise(x, y, 157) * 28;
    return [Math.min(255, base + n), Math.min(255, base + n), Math.min(255, base + n), 255];
}

function copperMetal(x, y, w, h) {
    const base = 210;
    const n = noise(x, y, 159) * 18;
    const scratch = noise(x, y, 161) > 0.94 ? -80 : 0;
    return [Math.min(255, base + n + scratch), Math.min(255, base + n + scratch), Math.min(255, base + n + scratch), 255];
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
        if (slot === 'normal') return (x, y, w, h) => concreteNormal(x, y, w, h);
    }
    if (asset.style === 'wall') {
        if (slot === 'albedo') return (x, y, w, h) => wallAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => wallRough(x, y, w, h);
        if (slot === 'normal') return (x, y) => surfaceNormal(x, y, 73, 0.9);
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
    if (asset.style === 'grass') {
        if (slot === 'albedo') return (x, y, w, h) => grassAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => grassRough(x, y, w, h);
        if (slot === 'normal') return (x, y) => surfaceNormal(x, y, 125, 0.65);
    }
    if (asset.style === 'wood') {
        if (slot === 'albedo') return (x, y, w, h) => woodAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => woodRough(x, y, w, h);
        if (slot === 'normal') return (x, y) => surfaceNormal(x, y, 127, 0.55);
    }
    if (asset.style === 'gravel') {
        if (slot === 'albedo') return (x, y, w, h) => gravelAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => gravelRough(x, y, w, h);
        if (slot === 'normal') return (x, y) => surfaceNormal(x, y, 129, 0.95);
    }
    if (asset.style === 'dirt') {
        if (slot === 'albedo') return (x, y, w, h) => dirtAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => dirtRough(x, y, w, h);
        if (slot === 'normal') return (x, y) => surfaceNormal(x, y, 143, 0.85);
    }
    if (asset.style === 'asphalt') {
        if (slot === 'albedo') return (x, y, w, h) => asphaltAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => asphaltRough(x, y, w, h);
        if (slot === 'normal') return (x, y) => surfaceNormal(x, y, 131, 0.45);
    }
    if (asset.style === 'fabric') {
        if (slot === 'albedo') return (x, y, w, h) => fabricAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => fabricRough(x, y, w, h);
    }
    if (asset.style === 'skin') {
        if (slot === 'albedo') return (x, y, w, h) => skinAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => skinRough(x, y, w, h);
    }
    if (asset.style === 'hair_alpha') {
        if (slot === 'albedo') return (x, y, w, h) => hairAlphaAlbedo(x, y, w, h, asset.palette);
    }
    if (asset.style === 'metal_grate') {
        if (slot === 'albedo') return (x, y, w, h) => metalGrateAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => metalGrateRough(x, y, w, h);
        if (slot === 'metalness') return (x, y, w, h) => metalGrateMetal(x, y, w, h);
        if (slot === 'normal') return (x, y) => surfaceNormal(x, y, 133, 0.7);
    }
    if (asset.style === 'brick') {
        if (slot === 'albedo') return (x, y, w, h) => brickAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => brickRough(x, y, w, h);
        if (slot === 'normal') return (x, y) => surfaceNormal(x, y, 163, 0.82);
    }
    if (asset.style === 'copper') {
        if (slot === 'albedo') return (x, y, w, h) => copperAlbedo(x, y, w, h, asset.palette);
        if (slot === 'roughness') return (x, y, w, h) => copperRough(x, y, w, h);
        if (slot === 'metalness') return (x, y, w, h) => copperMetal(x, y, w, h);
        if (slot === 'normal') return (x, y) => surfaceNormal(x, y, 165, 0.65);
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

if (require.main === module) {
    main();
}

module.exports = {
    exportSlot,
    slotFn,
    mergeTcEntries,
    loadManifest,
    GIMP_MANIFEST,
    TC_LIC,
    REALISM,
};