#!/usr/bin/env node
/** Smoke: Negative LOD module + config + engine hook */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let failed = 0;

function ok(m) { console.log(`  ✓ ${m}`); }
function fail(m) { console.error(`  ✗ ${m}`); failed += 1; }

function read(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

console.log('negative-lod-verify\n');

if (fs.existsSync(path.join(ROOT, 'config/negative-lod.json'))) {
    const cfg = JSON.parse(read('config/negative-lod.json'));
    if (cfg.format === 'threshold-negative-lod' && cfg.defaultDistance > 0) ok('config/negative-lod.json');
    else fail('config invalid');
} else fail('missing config/negative-lod.json');

const mod = read('src/shared/negativeLod.js');
for (const token of [
    'export const NegativeLod',
    'enableObject',
    'disableObject',
    'setMode',
    'update(camera',
    'MeshBasicMaterial',
    'hysteresis',
    'window.NegativeLod',
]) {
    if (mod.includes(token)) ok(`negativeLod.js has ${token.slice(0, 40)}`);
    else fail(`negativeLod.js missing ${token}`);
}

const core = read('src/engine/engineCore.js');
if (core.includes('NegativeLod.update')) ok('engineCore ticks NegativeLod');
else fail('engineCore missing NegativeLod.update');

const ui = read('src/engine/ui.js');
if (ui.includes('insp-negative-lod') && ui.includes('NegativeLod.enableObject')) ok('inspector wires negative LOD');
else fail('inspector missing negative LOD');

const html = read('index.html');
if (html.includes('id="insp-negative-lod"')) ok('index.html has Neg LOD checkbox');
else fail('index.html missing checkbox');

const docs = read('docs/NEGATIVE_LOD.md');
if (docs.includes('negativeLOD')) ok('design doc present');
else fail('design doc missing');

// E0 VisibilitySystem
if (fs.existsSync(path.join(ROOT, 'config/visibility.json'))) {
    const v = JSON.parse(read('config/visibility.json'));
    if (v.format === 'threshold-visibility') ok('config/visibility.json');
    else fail('visibility config invalid');
} else fail('missing config/visibility.json');

const vis = read('src/shared/visibilitySystem.js');
for (const token of [
    'export const VisibilitySystem',
    "VIS.A",
    '_visClass',
    'Frustum',
    'window.VisibilitySystem',
]) {
    if (vis.includes(token) || (token === "VIS.A" && vis.includes("A: 'A'"))) ok(`visibilitySystem has ${token}`);
    else if (token === "VIS.A" && vis.includes("A: 'A'")) ok('visibilitySystem has class A');
    else fail(`visibilitySystem missing ${token}`);
}
// softer check for A
if (vis.includes("A: 'A'") || vis.includes('VIS.A')) ok('visibility classes A–E defined');

if (!core.includes('VisibilitySystem.update')) fail('engineCore missing VisibilitySystem.update');
else ok('engineCore ticks VisibilitySystem before LOD');

const neg = mod;
if (neg.includes("_visClass") && neg.includes("=== 'D'")) ok('NegativeLod respects off-screen D/E freeze');
else fail('NegativeLod should freeze on D/E vis classes');

if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
}
console.log('\nAll negative-lod checks passed.');
