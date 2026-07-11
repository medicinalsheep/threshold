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

if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
}
console.log('\nAll negative-lod checks passed.');
