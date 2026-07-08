#!/usr/bin/env node
/** G2 — TC drive + live avatar sync smoke (static) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = [
    'src/shared/tcDrive.js',
    'config/tc-drive.json',
];

const SYNC_MARKERS = [
    'captureLive',
    'applyLiveState',
    'playerAvatars',
    'vehicleClaims',
    "case 'VEHICLE_CLAIM':",
];

let fail = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function bad(m) { console.log(`  ✗ ${m}`); fail += 1; }

console.log('[tc-drive-verify] G2 modules');
FILES.forEach((f) => (fs.existsSync(path.join(ROOT, f)) ? ok(f) : bad(`missing ${f}`)));

console.log('[tc-drive-verify] sync + network');
const sync = fs.readFileSync(path.join(ROOT, 'src/shared/sync.js'), 'utf8');
SYNC_MARKERS.forEach((m) => (sync.includes(m) ? ok(`sync ${m}`) : bad(`sync missing ${m}`)));

const net = fs.readFileSync(path.join(ROOT, 'src/shared/network.js'), 'utf8');
['scheduleLiveSync', 'PLAYER_AVATAR', 'getPlayerAvatars', 'updateLocalAvatar', 'LIVE_STATE'].forEach((m) => {
    if (net.includes(m)) ok(`network ${m}`);
    else bad(`network missing ${m}`);
});

console.log('[tc-drive-verify] World API');
function readEngineSources() {
    const dir = path.join(ROOT, 'src/engine');
    return fs.readdirSync(dir)
        .filter((f) => f.endsWith('.js'))
        .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
        .join('\n');
}
const eng = readEngineSources();
['claimTcVehicle', 'enterTcRace', 'TcDrive.prePhysics', "controlMode === 'vehicle'"].forEach((m) => {
    if (eng.includes(m)) ok(m);
    else bad(`engine missing ${m}`);
});

const ref = fs.readFileSync(path.join(ROOT, 'src/shared/referenceLibrary.js'), 'utf8');
if (!ref.includes('World.enterTcRace')) bad('workflow missing enterTcRace');
else ok('WORKFLOWS → World.enterTcRace()');

console.log(fail ? `\n[tc-drive-verify] FAILED (${fail})` : '\n[tc-drive-verify] PASS');
process.exit(fail ? 1 : 0);