#!/usr/bin/env node
/** Sprint W — action control defaults + doc truth smoke */
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

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
console.log(`controls:verify — v${pkg.version} binding defaults + doc truth\n`);

const controlsSrc = read('src/shared/controls.js');

if (controlsSrc.includes("aim: ['Mouse0']") || controlsSrc.includes('aim: ["Mouse0"]')) {
    ok('default aim binds to Mouse0 (LMB)');
} else {
    fail('default aim should bind to Mouse0');
}

if (controlsSrc.includes("fire: ['Mouse2'") || controlsSrc.includes('fire: ["Mouse2"')) {
    ok('default fire binds to Mouse2 (RMB)');
} else {
    fail('default fire should bind to Mouse2');
}

const schemaMatch = controlsSrc.match(/const BINDINGS_SCHEMA = (\d+)/);
const schema = schemaMatch ? parseInt(schemaMatch[1], 10) : 0;
if (schema >= 2) {
    ok(`binding schema v${schema} present`);
} else {
    fail('BINDINGS_SCHEMA missing or invalid');
}

if (!controlsSrc.includes('FiveM') && !controlsSrc.includes('GTA')) {
    ok('controls.js has no game-name references');
} else {
    fail('controls.js still mentions FiveM/GTA');
}

if (fs.existsSync(path.join(ROOT, 'docs/CONTROLS.md'))) {
    ok('docs/CONTROLS.md exists');
} else {
    fail('docs/CONTROLS.md missing');
}

if (!fs.existsSync(path.join(ROOT, 'docs/CONTROLS_FIVEM.md'))) {
    ok('docs/CONTROLS_FIVEM.md removed');
} else {
    fail('docs/CONTROLS_FIVEM.md should be deleted');
}

const controlsMd = read('docs/CONTROLS.md');
if (controlsMd.includes('LMB') && controlsMd.includes('RMB') && !controlsMd.includes('FiveM')) {
    ok('CONTROLS.md describes LMB/RMB without game names');
} else {
    fail('CONTROLS.md content check failed');
}

if (controlsSrc.includes("uiMouse:") && controlsSrc.includes("uiMouse: ['KeyM']")) {
    ok('uiMouse mode binds to KeyM');
} else {
    fail('uiMouse binding missing or not KeyM');
}

if (controlsSrc.includes('MAX_KB_BINDS') && controlsSrc.includes('_setBindingSlot')) {
    ok('secondary keybind slots (primary + 2nd) present');
} else {
    fail('missing dual keybind slot helpers');
}

if (controlsSrc.includes("Mouse3: 'Mouse4'") || controlsSrc.includes('Mouse3: "Mouse4"')) {
    ok('Mouse3/Mouse4 labels for side buttons');
} else {
    fail('Mouse3/Mouse4 labels missing');
}

if (controlsSrc.includes("mousedown") && controlsSrc.includes('_finishKeyboardRebind')) {
    ok('rebind captures mouse buttons');
} else {
    fail('keyboard rebind should listen for mousedown');
}

if (controlsMd.includes('UI mouse') || controlsMd.includes('UI mouse mode')) {
    ok('CONTROLS.md documents UI mouse mode');
} else {
    fail('CONTROLS.md missing UI mouse mode');
}

const playerSrc = read('src/engine/player.js');
if (!playerSrc.includes('FiveM')) {
    ok('player.js spawn hint is neutral');
} else {
    fail('player.js still mentions FiveM');
}

const viteSrc = read('vite.config.js');
if (viteSrc.includes('manualChunks')) {
    ok('vite.config.js has manualChunks (Sprint T)');
} else {
    fail('vite.config.js missing manualChunks');
}

const mainSrc = read('src/main.js');
if (mainSrc.includes("import('./engine/main.js')")) {
    ok('main.js lazy-loads engine chunk');
} else {
    fail('main.js should lazy-import engine');
}

console.log(failed ? `\n${failed} check(s) failed\n` : '\nAll controls + hygiene checks passed.\n');
process.exit(failed ? 1 : 0);