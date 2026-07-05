#!/usr/bin/env node
/** G1 — TC Circuit multiplayer lap sync smoke (static) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = [
    'src/shared/tcCircuit.js',
    'src/shared/remotePlayers.js',
    'config/tc-circuit.json',
];

const SYNC_MARKERS = ["case 'LAP_CROSS':", "case 'CIRCUIT_START':", 'circuit: window.TcCircuit'];
const NETWORK_MARKERS = ['fromKey: from', 'TcCircuit?.state?.running'];
const HTML_MARKERS = ['id="circuit-hud"', 'id="circuit-board"'];

let fail = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function bad(m) { console.log(`  ✗ ${m}`); fail += 1; }

console.log('[tc-circuit-verify] G1 modules');
FILES.forEach((f) => (fs.existsSync(path.join(ROOT, f)) ? ok(f) : bad(`missing ${f}`)));

console.log('[tc-circuit-verify] sync.js');
const sync = fs.readFileSync(path.join(ROOT, 'src/shared/sync.js'), 'utf8');
SYNC_MARKERS.forEach((m) => (sync.includes(m) ? ok(m) : bad(`sync missing ${m}`)));

console.log('[tc-circuit-verify] network.js');
const net = fs.readFileSync(path.join(ROOT, 'src/shared/network.js'), 'utf8');
NETWORK_MARKERS.forEach((m) => (net.includes(m) ? ok(m) : bad(`network missing ${m}`)));

console.log('[tc-circuit-verify] workflow');
const ref = fs.readFileSync(path.join(ROOT, 'src/shared/referenceLibrary.js'), 'utf8');
if (!ref.includes('World.startTcCircuit')) bad('referenceLibrary missing World.startTcCircuit');
else ok('WORKFLOWS → World.startTcCircuit()');
if (!ref.includes('multiplayer lap sync')) bad('workflow summary missing multiplayer');
else ok('G1 multiplayer lap sync doc');

console.log('[tc-circuit-verify] UI');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
HTML_MARKERS.forEach((m) => (html.includes(m) ? ok(m) : bad(`html missing ${m}`)));

console.log('[tc-circuit-verify] World API');
const eng = fs.readFileSync(path.join(ROOT, 'src/engine/main.js'), 'utf8');
if (!eng.includes('startTcCircuit')) bad('engine missing startTcCircuit');
else ok('World.startTcCircuit wired');

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/tc-circuit.json'), 'utf8'));
if (cfg.checkpointId !== 'tc_cp') bad(`checkpointId=${cfg.checkpointId}`);
else ok('checkpoint tc_cp');

console.log(fail ? `\n[tc-circuit-verify] FAILED (${fail})` : '\n[tc-circuit-verify] PASS');
process.exit(fail ? 1 : 0);