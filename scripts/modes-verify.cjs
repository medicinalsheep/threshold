#!/usr/bin/env node
/** Smoke: interaction modes + quality ladder modules present (10.15 series) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let failed = 0;

function ok(msg) {
    console.log(`  ✓ ${msg}`);
}
function fail(msg) {
    console.error(`  ✗ ${msg}`);
    failed += 1;
}
function read(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function exists(rel) {
    return fs.existsSync(path.join(ROOT, rel));
}

const pkg = JSON.parse(read('package.json'));
console.log(`modes:verify — v${pkg.version} arrange · play-as · quality ladder\n`);

const mods = [
    ['src/shared/gridSystem.js', 'GridSystem'],
    ['src/shared/arrangeMode.js', 'ArrangeMode'],
    ['src/shared/playAs.js', 'PlayAs'],
    ['src/shared/qualityLadder.js', 'QualityLadder'],
    ['src/shared/simMode.js', 'SimMode'],
    ['src/shared/starterGrid.js', 'buildStarterGrid'],
    ['src/shared/starterKit.js', 'spawnStarterKit'],
];

for (const [file, token] of mods) {
    if (!exists(file)) {
        fail(`missing ${file}`);
        continue;
    }
    const src = read(file);
    if (src.includes(token)) ok(`${file} exports/uses ${token}`);
    else fail(`${file} missing ${token}`);
}

const main = read('src/engine/main.js');
for (const imp of ['arrangeMode', 'playAs', 'qualityLadder', 'gridSystem']) {
    if (main.includes(imp)) ok(`main.js imports ${imp}`);
    else fail(`main.js missing ${imp}`);
}

const starter = read('src/shared/starterGrid.js');
if (/Terminal void|terminal void|not auto|No auto kit/i.test(starter)) {
    ok('starterGrid documents terminal / no-auto kit baseline');
} else {
    fail('starterGrid should document terminal baseline (no auto kit)');
}
if (/\bspawnStarterKit\s*\(/.test(starter) || /\bspawnAiTerminal\s*\(/.test(starter)) {
    fail('starterGrid must not auto-spawn kit or AI terminal');
} else {
    ok('starterGrid does not call spawnStarterKit / spawnAiTerminal');
}

const html = read('index.html');
if (html.includes('data-tab="quality"') || html.includes('data-panel="quality"')) {
    ok('INSERT QUALITY tab present');
} else fail('INSERT QUALITY tab missing');
if (html.includes('data-light-preset')) ok('light preset chips in HTML');
else fail('light preset chips missing');
if (html.includes('btn-play-as') || html.includes('PLAY AS')) ok('Play as UI present');
else fail('Play as UI missing');

const controls = read('src/shared/controls.js');
if (controls.includes('playAs:') && controls.includes("playAs: ['KeyK']")) {
    ok('playAs bound to KeyK by default');
} else fail('playAs KeyK default missing');

const docs = [
    ['docs/CONTROLS.md', 'Arrange mode'],
    ['docs/CONTROLS.md', 'Play as'],
    ['docs/PHYSICS.md', 'terminal void'],
    ['docs/BUILD_FROM.md', 'QUALITY'],
    ['docs/UI_AND_AGENTS.md', 'ARRANGE'],
    ['docs/MATERIALS.md', 'Not on ENTER'],
];
for (const [file, needle] of docs) {
    if (read(file).includes(needle)) ok(`${file} mentions “${needle}”`);
    else fail(`${file} missing “${needle}”`);
}

if (failed) {
    console.error(`\nmodes:verify FAILED (${failed})`);
    process.exit(1);
}
console.log('\nAll modes + quality ladder checks passed.');
