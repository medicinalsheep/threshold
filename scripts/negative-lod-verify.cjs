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
    'applyTierPolicy',
    'maybeAutoEnable',
    'window.NegativeLod',
]) {
    if (mod.includes(token)) ok(`negativeLod.js has ${token.slice(0, 40)}`);
    else fail(`negativeLod.js missing ${token}`);
}

const cfgAuto = JSON.parse(read('config/negative-lod.json'));
if (Array.isArray(cfgAuto.autoEnableTiers) && cfgAuto.autoEnableTiers.includes('compatibility')) {
    ok('autoEnableTiers includes compatibility');
} else fail('autoEnableTiers missing compatibility');
if (cfgAuto.distanceByTier?.balanced > 0) ok('distanceByTier.balanced');
else fail('distanceByTier.balanced missing');
if (cfgAuto.floor?.enabled && cfgAuto.floor.cameraHeight > 0) ok('floor path B config');
else fail('floor config missing');

for (const token of [
    'ensureOwnedMaterials',
    'matSlots',
    'updateFloorTargets',
    'collectFloorTargets',
    'isSkinnedMesh',
    'poolKeys',
    'composeFarColor',
    'sampleEnvTint',
    'sampleAlbedo',
    'notifyEnvChange',
    'isStaticProp',
]) {
    if (mod.includes(token)) ok(`multi-mat/floor has ${token}`);
    else fail(`missing ${token}`);
}
if (cfgAuto.defaultDistance >= 60) ok(`defaultDistance ${cfgAuto.defaultDistance} (far softer)`);
else fail('defaultDistance should be ≥60 for less-noticeable flats');
if (cfgAuto.envBlend > 0 && cfgAuto.appearanceSample !== false) ok('appearance + envBlend enabled');
else fail('appearanceSample/envBlend missing');

const perf = read('src/shared/perfHarness.js');
if (perf.includes('export const PerfHarness') && perf.includes('measure(')) ok('perfHarness.js present');
else fail('perfHarness.js missing');
const mainJs = read('src/engine/main.js');
if (mainJs.includes('perfHarness') && mainJs.includes('applyTierPolicy')) ok('main wires perf + tier policy');
else fail('main missing perf/tier hooks');
const gp = read('src/shared/graphicsProfile.js');
if (gp.includes('applyTierPolicy')) ok('graphicsProfile calls applyTierPolicy');
else fail('graphicsProfile missing applyTierPolicy');

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
    'gatherSpatialCandidates',
    'rebuildSpatialIndex',
    'invalidateSpatial',
    'cellKey',
]) {
    if (vis.includes(token) || (token === "VIS.A" && vis.includes("A: 'A'"))) ok(`visibilitySystem has ${token}`);
    else if (token === "VIS.A" && vis.includes("A: 'A'")) ok('visibilitySystem has class A');
    else fail(`visibilitySystem missing ${token}`);
}
const vcfg = JSON.parse(read('config/visibility.json'));
if (vcfg.spatial?.enabled && vcfg.spatial.minObjects > 0 && vcfg.spatial.cellSize > 0) {
    ok('visibility.json spatial E4 config');
} else fail('visibility.json spatial config missing');
// softer check for A
if (vis.includes("A: 'A'") || vis.includes('VIS.A')) ok('visibility classes A–E defined');

if (!core.includes('VisibilitySystem.update')) fail('engineCore missing VisibilitySystem.update');
else ok('engineCore ticks VisibilitySystem before LOD');

const neg = mod;
if (neg.includes("_visClass") && neg.includes("=== 'D'")) ok('NegativeLod respects off-screen D/E freeze');
else fail('NegativeLod should freeze on D/E vis classes');

// E1 gates
const meshLod = read('src/shared/meshLod.js');
if (meshLod.includes('shouldProcessLod')) ok('MeshLod gated by shouldProcessLod');
else fail('MeshLod missing visibility gate');

const texHilod = read('src/shared/textureHilod.js');
if (texHilod.includes('shouldProcessHeavy')) ok('TextureHilod gated by shouldProcessHeavy');
else fail('TextureHilod missing visibility gate');

if (core.includes('shouldProcessLod(obj)')) ok('engineCore idle/spin gated');
else fail('engineCore missing idle/spin vis gate');

const patrol = read('src/shared/npcPatrol.js');
if (patrol.includes('shouldProcessLod')) ok('NpcPatrol anim gated (sim continues)');
else fail('NpcPatrol missing vis gate');

// E2 sleep / shadow
if (vis.includes('applySleepPolicies') || vis.includes('stashAndDisableShadows')) {
    ok('VisibilitySystem E2 shadow/sleep policies');
} else fail('E2 sleep policies missing');
if (vis.includes('sleepPhysics') && vis.includes('wakePhysics')) ok('E2 physics sleep/wake');
else fail('E2 physics sleep helpers missing');
if (vcfg.sleep?.physicsSleepOnE) ok('config sleep.physicsSleepOnE');
else fail('visibility.json missing sleep block');

// E3 env gates
if (vis.includes('shouldProcessEnv') && vis.includes('resolveClass')) ok('shouldProcessEnv/resolveClass');
else fail('E3 shouldProcessEnv missing');
const weather = read('src/shared/weatherSystem.js');
if (weather.includes('envVisOk') || weather.includes('shouldProcessEnv')) ok('weather gated by env vis');
else fail('weather missing env vis gate');
const sreg = read('src/shared/shaderRegistry.js');
if (sreg.includes('shouldProcessEnv')) ok('ShaderRegistry env gate');
else fail('ShaderRegistry missing env gate');
const sgraph = read('src/shared/shaderNodeGraph.js');
if (sgraph.includes('shouldProcessEnv')) ok('ShaderNodeGraph env gate');
else fail('ShaderNodeGraph missing env gate');
const az = read('src/shared/audioZoneSystem.js');
if (az.includes('shouldProcessEnv')) ok('AudioZoneSystem env gate');
else fail('AudioZoneSystem missing env gate');

if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
}
console.log('\nAll negative-lod checks passed.');
