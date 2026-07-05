#!/usr/bin/env node
/** TC asset build — veh + chr GLB (Blender when available, else Node) */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GEN_VEH = path.join(__dirname, 'tc-gen-veh.cjs');
const GEN_CHR = path.join(__dirname, 'tc-gen-chr.cjs');
const BLEND_VEH = path.join(ROOT, 'plugins', 'threshold-blender', 'tc_veh.blend');
const BUILD_VEH_PY = path.join(ROOT, 'plugins', 'threshold-blender', 'build_tc_veh.py');
const HEADLESS = path.join(ROOT, 'plugins', 'threshold-blender', 'headless_export.py');

const BLENDER = [
    process.env.BLENDER_EXE,
    'C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    '/Applications/Blender.app/Contents/MacOS/Blender',
].filter(Boolean).find((p) => p === 'blender' || fs.existsSync(p));

function runNode(script) {
    return spawnSync(process.execPath, [script], { stdio: 'inherit', cwd: ROOT }).status === 0;
}

function blenderExport(object, mass) {
    if (!BLENDER || !fs.existsSync(BLEND_VEH)) return false;
    const r = spawnSync(BLENDER, [
        '--background', BLEND_VEH, '--python', HEADLESS, '--',
        '--object', object, '--output', path.join(ROOT, 'import'), '--lod',
        '--mass', String(mass),
    ], { stdio: 'inherit', cwd: ROOT });
    return r.status === 0;
}

function main() {
    let ok = false;
    if (BLENDER && fs.existsSync(BUILD_VEH_PY)) {
        spawnSync(BLENDER, ['--background', '--python', BUILD_VEH_PY], { stdio: 'inherit', cwd: ROOT });
        ok = blenderExport('TC Runner', 3.4) && blenderExport('TC Hauler', 5.8);
    }
    if (!ok) runNode(GEN_VEH);
    runNode(GEN_CHR);
    const pub = path.join(ROOT, 'public', 'bundle', 'import');
    fs.mkdirSync(pub, { recursive: true });
    const manPath = path.join(ROOT, 'import', 'threshold_blender_manifest.json');
    if (fs.existsSync(manPath)) {
        const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
        delete man.childEdition;
        man.tcEd = 'tc-show';
        man.engineVersion = require(path.join(ROOT, 'package.json')).version;
        fs.writeFileSync(manPath, JSON.stringify(man, null, 2));
        fs.copyFileSync(manPath, path.join(pub, 'threshold_blender_manifest.json'));
    }
    for (const f of fs.readdirSync(path.join(ROOT, 'import'))) {
        if (/^tc_.*\.glb$/.test(f)) {
            fs.copyFileSync(path.join(ROOT, 'import', f), path.join(pub, f));
        }
    }
    console.log('[tc-build] done');
}

main();