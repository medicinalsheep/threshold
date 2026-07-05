#!/usr/bin/env node
/** TC stack smoke verification — R4 automated QA */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IMPORT = path.join(ROOT, 'import');
const PUB = path.join(ROOT, 'public', 'bundle', 'import');
const MAN = path.join(IMPORT, 'threshold_blender_manifest.json');

const GLBS = [
    'tc_run.glb', 'tc_run_l1.glb', 'tc_run_l2.glb',
    'tc_haul.glb', 'tc_haul_l1.glb', 'tc_haul_l2.glb',
    'tc_msh.glb', 'tc_msh_l1.glb', 'tc_msh_l2.glb',
    'tc_mec.glb', 'tc_mec_l1.glb', 'tc_mec_l2.glb',
];

const BLENDER_SCRIPTS = [
    'plugins/threshold-blender/tc_mesh_lib.py',
    'plugins/threshold-blender/build_tc_veh.py',
    'plugins/threshold-blender/build_tc_chr.py',
];

const MODULES = [
    'src/shared/tcMeta.js',
    'src/shared/tcVeh.js',
    'src/shared/tcChr.js',
    'src/shared/tcSfx.js',
    'src/shared/tcShow.js',
    'src/shared/tcLite.js',
    'src/shared/tcPrompt.js',
    'src/shared/referenceEdition.js',
];

const TC_ID_ALIAS = {
    child_runner: 'tc_run',
    child_hauler: 'tc_haul',
    child_circuit_span: 'tc_span',
    child_marshal: 'tc_msh',
    child_mechanic: 'tc_mec',
    child_checkpoint: 'tc_cp',
};

let fail = 0;
function ok(msg) { console.log(`  ✓ ${msg}`); }
function bad(msg) { console.log(`  ✗ ${msg}`); fail += 1; }

console.log('[tc-verify] blender R5');
BLENDER_SCRIPTS.forEach((f) => (fs.existsSync(path.join(ROOT, f)) ? ok(f) : bad(`missing ${f}`)));

console.log('[tc-verify] modules');
MODULES.forEach((f) => (fs.existsSync(path.join(ROOT, f)) ? ok(f) : bad(`missing ${f}`)));

console.log('[tc-verify] GLBs import/');
GLBS.forEach((f) => {
    const p = path.join(IMPORT, f);
    if (!fs.existsSync(p)) bad(`missing ${f}`);
    else if (fs.statSync(p).size < (f.endsWith('.glb') && !/_l2/.test(f) ? 1500 : 500)) bad(`${f} too small (R5)`);
    else ok(`${f} (${(fs.statSync(p).size / 1024).toFixed(1)} KB)`);
});

console.log('[tc-verify] GLBs public/bundle/import/');
GLBS.forEach((f) => {
    const p = path.join(PUB, f);
    if (!fs.existsSync(p)) bad(`pub missing ${f}`);
    else ok(`pub/${f}`);
});

console.log('[tc-verify] manifest');
if (!fs.existsSync(MAN)) {
    bad('no manifest');
} else {
    const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
    if (man.childEdition) bad(`stale childEdition=${man.childEdition}`);
    else ok('no childEdition');
    if (man.tcEd !== 'tc-show') bad(`root tcEd=${man.tcEd} (want tc-show)`);
    else ok('root tcEd=tc-show');
    if (man.realism !== 'r5') bad(`root realism=${man.realism} (want r5)`);
    else ok('root realism=r5');
    const ids = (man.models || []).map((m) => m.id);
    ['tc_run', 'tc_haul', 'tc_msh', 'tc_mec'].forEach((id) => {
        const m = man.models?.find((x) => x.id === id);
        if (!m) bad(`manifest missing ${id}`);
        else if ((m.lods || []).length < 3) bad(`${id} lods < 3`);
        else if (!m.tcEd) bad(`${id} missing tcEd`);
        else if (m.realism !== 'r5') bad(`${id} realism=${m.realism}`);
        else ok(`${id} — ${m.lods.length} LODs, tcEd=${m.tcEd}, r5`);
    });
}

console.log('[tc-verify] config');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'reference-editions.json'), 'utf8'));
if (cfg.defaultEdition !== 'tc-show') bad(`defaultEdition=${cfg.defaultEdition}`);
else ok(`defaultEdition=tc-show`);
['tc-show', 'tc-veh', 'tc-chr', 'tc-sfx', 'tc-lite'].forEach((e) => {
    if (!cfg.editions?.[e]) bad(`edition ${e}`);
    else ok(`edition ${e}`);
});

console.log('[tc-verify] lobby');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (!html.includes('id="lobby-tc"')) bad('lobby-tc button');
else ok('lobby-tc button');

console.log('[tc-verify] alias map');
const meta = fs.readFileSync(path.join(ROOT, 'src/shared/tcMeta.js'), 'utf8');
Object.entries(TC_ID_ALIAS).forEach(([legacy, tc]) => {
    const keyPat = new RegExp(`${legacy}\\s*:\\s*(TC_IDS\\.\\w+|'${tc}'|"${tc}")`);
    if (!keyPat.test(meta)) bad(`alias ${legacy}→${tc}`);
    else ok(`${legacy} → ${tc}`);
});

console.log('[tc-verify] prompt ASSETS block');
const prompt = fs.readFileSync(path.join(ROOT, 'src/shared/tcPrompt.js'), 'utf8');
if (!prompt.includes('// ASSETS:')) bad('tcPrompt missing ASSETS header');
else ok('ASSETS header');
if (!prompt.includes('getTcVehSpecs') || !prompt.includes('getTcChrSpecs') || !prompt.includes('TC_IDS')) {
    bad('tcPrompt missing spec/id wiring');
} else ok('tcPrompt wires veh/chr specs + TC_IDS');

console.log('[tc-verify] showcase spawn count');
const show = fs.readFileSync(path.join(ROOT, 'src/shared/tcShow.js'), 'utf8');
const veh = fs.readFileSync(path.join(ROOT, 'src/shared/tcVeh.js'), 'utf8');
const chr = fs.readFileSync(path.join(ROOT, 'src/shared/tcChr.js'), 'utf8');
const vehSpecs = (veh.match(/getTcVehSpecs\(\)/g) || []).length;
const chrSpecs = (chr.match(/getTcChrSpecs\(\)/g) || []).length;
if (!show.includes('spawnTcVeh') || !show.includes('spawnTcChr') || !show.includes('spawnCp')) {
    bad('tcShow missing spawn chain');
} else ok('tcShow: veh + chr + cp');
if (vehSpecs < 1 || chrSpecs < 1) bad('veh/chr spec loaders');
else ok('veh/chr spec loaders present (expect ≥6 scene objects in lobby TC →)');

console.log(fail ? `\n[tc-verify] FAILED (${fail})` : '\n[tc-verify] PASS');
process.exit(fail ? 1 : 0);