#!/usr/bin/env node
/** G3 — TC gate triggers + vehicle enter/exit animations (static) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = [
    'src/shared/tcGateFx.js',
    'config/tc-gates.json',
];

const GATE_MARKERS = [
    'lastGatePulse',
    'TcGateFx',
    'onCircuitPulse',
    'ensureGate',
];

const DRIVE_MARKERS = [
    '_playEnterAnim',
    '_playExitAnim',
    '_animating',
    'isAnimating',
];

let fail = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function bad(m) { console.log(`  ✗ ${m}`); fail += 1; }

console.log('[tc-g3-verify] G3 modules');
FILES.forEach((f) => (fs.existsSync(path.join(ROOT, f)) ? ok(f) : bad(`missing ${f}`)));

console.log('[tc-g3-verify] gate FX + circuit sync');
const circuit = fs.readFileSync(path.join(ROOT, 'src/shared/tcCircuit.js'), 'utf8');
GATE_MARKERS.forEach((m) => (circuit.includes(m) ? ok(`tcCircuit ${m}`) : bad(`tcCircuit missing ${m}`)));

const show = fs.readFileSync(path.join(ROOT, 'src/shared/tcShow.js'), 'utf8');
if (show.includes('tc_gate') && show.includes('tcGate')) ok('tcShow gate mesh');
else bad('tcShow missing gate mesh');

const eng = fs.readFileSync(path.join(ROOT, 'src/engine/main.js'), 'utf8');
if (eng.includes('tcGateFx')) ok('engine imports tcGateFx');
else bad('engine missing tcGateFx import');

console.log('[tc-g3-verify] drive animations');
const drive = fs.readFileSync(path.join(ROOT, 'src/shared/tcDrive.js'), 'utf8');
DRIVE_MARKERS.forEach((m) => (drive.includes(m) ? ok(`tcDrive ${m}`) : bad(`tcDrive missing ${m}`)));

const ref = fs.readFileSync(path.join(ROOT, 'src/shared/referenceLibrary.js'), 'utf8');
if (ref.includes('G3') || ref.includes('gate')) ok('workflow mentions G3/gate');
else bad('workflow missing G3 note');

console.log(fail ? `\n[tc-g3-verify] FAILED (${fail})` : '\n[tc-g3-verify] PASS');
process.exit(fail ? 1 : 0);