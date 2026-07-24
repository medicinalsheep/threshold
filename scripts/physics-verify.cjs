#!/usr/bin/env node
/** Smoke: Physics engineering API + entry workspace hooks */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let failed = 0;

function ok(m) { console.log(`  ✓ ${m}`); }
function fail(m) { console.error(`  ✗ ${m}`); failed += 1; }
function read(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

console.log('physics-verify\n');

const phys = read('src/engine/physics.js');
for (const t of [
    'export const Physics',
    'syncBodyFromUserData',
    'materialFor',
    'setGravity',
    'resetGravity',
    'hingeBodies',
    'lockBodies',
    'pointBodies',
    'setPadCollider',
    'shapeForMesh',
    'massFromDensity',
    'raycast(',
    'setSolverIterations',
]) {
    if (phys.includes(t)) ok(`physics.js ${t}`);
    else fail(`physics.js missing ${t}`);
}

const world = read('src/engine/world.js');
if (world.includes('force') && world.includes('syncBodyFromUserData') && world.includes('hingeBodies')) {
    ok('world.js force create + joint helpers');
} else fail('world.js missing force/joints');

const ui = read('src/engine/ui.js');
if (ui.includes('syncBodyFromUserData')) ok('ui applies friction/mass to body');
else fail('ui missing syncBodyFromUserData');

const env = read('src/engine/environment.js');
if (env.includes('useWorkspacePad') && env.includes('createConcreteSlabDeck')) {
    ok('environment workspace pad');
} else fail('environment missing useWorkspacePad');

const grid = read('src/shared/starterGrid.js');
if (grid.includes('useWorkspacePad') && grid.includes('spawnStarterKit')) {
    ok('starterGrid pad + kit');
} else fail('starterGrid incomplete');

const kit = read('src/shared/starterKit.js');
for (const t of ['spawnStarterKit', 'spawnPhysicsLabSample', 'clearSimSamples', 'hingeBodies']) {
    if (kit.includes(t)) ok(`starterKit ${t}`);
    else fail(`starterKit missing ${t}`);
}

const lobby = read('src/lobby/main.js');
if (lobby.includes("preferred === 'build'") || lobby.includes("setLobbyMode(preferred")) {
    ok('lobby ENTER honors PLAY/BUILD (default play)');
} else if (lobby.includes("setLobbyMode('play')")) {
    ok('lobby ENTER defaults play');
} else fail('lobby still forces build only');

const html = read('index.html');
if (html.includes('env-gravity') && html.includes('insert-physics-lab')) {
    ok('index gravity + physics lab UI');
} else fail('index missing gravity/physics lab');

if (fs.existsSync(path.join(ROOT, 'docs/PHYSICS.md'))) ok('docs/PHYSICS.md');
else fail('missing docs/PHYSICS.md');

if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
}
console.log('\nAll physics checks passed.');
