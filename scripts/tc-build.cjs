#!/usr/bin/env node
/** TC asset build — veh + chr GLB (Blender R5 when available, else Node) */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GEN_VEH = path.join(__dirname, 'tc-gen-veh.cjs');
const GEN_CHR = path.join(__dirname, 'tc-gen-chr.cjs');
const GEN_TEX = path.join(__dirname, 'tc-gen-tex.cjs');
const BLEND_DIR = path.join(ROOT, 'plugins', 'threshold-blender');
const BLEND_VEH = path.join(BLEND_DIR, 'tc_veh.blend');
const BLEND_CHR = path.join(BLEND_DIR, 'tc_chr.blend');
const BUILD_VEH_PY = path.join(BLEND_DIR, 'build_tc_veh.py');
const BUILD_CHR_PY = path.join(BLEND_DIR, 'build_tc_chr.py');
const HEADLESS = path.join(BLEND_DIR, 'headless_export.py');
const TC_LIC = 'Original — TC';
const REALISM = 'r5';

const BLENDER = [
    process.env.BLENDER_EXE,
    'blender',
    'C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    '/Applications/Blender.app/Contents/MacOS/Blender',
    '/usr/bin/blender',
].filter(Boolean).find((p) => {
    if (p === 'blender') {
        const probe = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['blender'], { encoding: 'utf8' });
        return probe.status === 0 && probe.stdout.trim();
    }
    return fs.existsSync(p);
});

function runNode(script) {
    return spawnSync(process.execPath, [script], { stdio: 'inherit', cwd: ROOT }).status === 0;
}

function blenderBuild(pyScript) {
    if (!BLENDER || !fs.existsSync(pyScript)) return false;
    const r = spawnSync(BLENDER, ['--background', '--python', pyScript], { stdio: 'inherit', cwd: ROOT });
    return r.status === 0;
}

function blenderExport(blend, spec) {
    if (!BLENDER || !fs.existsSync(blend)) return false;
    const pyArgs = [
        '--object', spec.object,
        '--output', path.join(ROOT, 'import'),
        '--slug', spec.slug,
        '--tc-ed', spec.tcEd,
        '--license', TC_LIC,
        '--realism', REALISM,
    ];
    if (spec.lod) pyArgs.push('--lod');
    if (spec.noPhysics) pyArgs.push('--no-physics');
    if (spec.mass != null) pyArgs.push('--mass', String(spec.mass));
    if (spec.fric != null) pyArgs.push('--friction', String(spec.fric));
    if (spec.rest != null) pyArgs.push('--restitution', String(spec.rest));

    const r = spawnSync(BLENDER, [
        '--background', blend, '--python', HEADLESS, '--', ...pyArgs,
    ], { stdio: 'inherit', cwd: ROOT });
    return r.status === 0;
}

function finalizeManifest() {
    const pub = path.join(ROOT, 'public', 'bundle', 'import');
    fs.mkdirSync(pub, { recursive: true });
    const manPath = path.join(ROOT, 'import', 'threshold_blender_manifest.json');
    if (fs.existsSync(manPath)) {
        const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
        delete man.childEdition;
        man.tcEd = 'tc-show';
        man.realism = REALISM;
        man.engineVersion = require(path.join(ROOT, 'package.json')).version;
        (man.models || []).forEach((m) => {
            if (!m.license) m.license = TC_LIC;
            if (!m.realism) m.realism = REALISM;
        });
        fs.writeFileSync(manPath, JSON.stringify(man, null, 2));
        fs.copyFileSync(manPath, path.join(pub, 'threshold_blender_manifest.json'));
    }
    for (const f of fs.readdirSync(path.join(ROOT, 'import'))) {
        if (/^tc_.*\.glb$/.test(f)) {
            fs.copyFileSync(path.join(ROOT, 'import', f), path.join(pub, f));
        }
    }
}

function main() {
    let vehOk = false;
    let chrOk = false;

    if (BLENDER) {
        if (fs.existsSync(BUILD_VEH_PY)) {
            blenderBuild(BUILD_VEH_PY);
            vehOk = blenderExport(BLEND_VEH, {
                object: 'TC Runner', slug: 'tc_run', tcEd: 'tc-veh', lod: true,
                mass: 3.4, fric: 0.36, rest: 0.14,
            }) && blenderExport(BLEND_VEH, {
                object: 'TC Hauler', slug: 'tc_haul', tcEd: 'tc-veh', lod: true,
                mass: 5.8, fric: 0.44, rest: 0.1,
            });
        }
        if (fs.existsSync(BUILD_CHR_PY)) {
            blenderBuild(BUILD_CHR_PY);
            chrOk = blenderExport(BLEND_CHR, {
                object: 'TC Marshal', slug: 'tc_msh', tcEd: 'tc-chr', lod: true, noPhysics: true,
            }) && blenderExport(BLEND_CHR, {
                object: 'TC Mechanic', slug: 'tc_mec', tcEd: 'tc-chr', lod: true, noPhysics: true,
            });
        }
    }

    if (!vehOk) {
        console.log('[tc-build] veh fallback → Node');
        runNode(GEN_VEH);
    } else {
        console.log('[tc-build] veh from Blender R5');
    }
    if (!chrOk) {
        console.log('[tc-build] chr fallback → Node');
        runNode(GEN_CHR);
    } else {
        console.log('[tc-build] chr from Blender R5');
    }

    finalizeManifest();
    runNode(GEN_TEX);
    console.log('[tc-build] done');
}

main();