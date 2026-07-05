#!/usr/bin/env node
/**
 * R2 Child vehicles build — Blender export when available, else Node GLB generator.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLEND = path.join(ROOT, 'plugins', 'threshold-blender', 'child_vehicles.blend');
const BUILD_BLEND = path.join(ROOT, 'plugins', 'threshold-blender', 'build_child_vehicles.py');
const GENERATE = path.join(__dirname, 'generate-child-vehicle-glb.cjs');

const BLENDER_CANDIDATES = [
    process.env.BLENDER_EXE,
    'C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    '/Applications/Blender.app/Contents/MacOS/Blender',
    'blender',
].filter(Boolean);

function findBlender() {
    for (const candidate of BLENDER_CANDIDATES) {
        if (candidate === 'blender') {
            const probe = spawnSync('where', ['blender'], { shell: true, encoding: 'utf8' });
            if (probe.status === 0 && probe.stdout.trim()) return probe.stdout.trim().split(/\r?\n/)[0];
            continue;
        }
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

function runNode(script) {
    const res = spawnSync(process.execPath, [script], { stdio: 'inherit', cwd: ROOT });
    return res.status === 0;
}

function runBlenderPipeline() {
    const blender = findBlender();
    if (!blender) return false;

    if (!fs.existsSync(BLEND)) {
        const build = spawnSync(blender, ['--background', '--python', BUILD_BLEND], { stdio: 'inherit', cwd: ROOT });
        if (build.status !== 0) return false;
    }

    const vehicles = [
        { object: 'Threshold Runner', mass: '3.4', friction: '0.36', restitution: '0.14' },
        { object: 'Threshold Hauler', mass: '5.8', friction: '0.44', restitution: '0.1' },
    ];

    for (const v of vehicles) {
        const res = spawnSync(
            blender,
            [
                '--background', BLEND,
                '--python', path.join(ROOT, 'plugins', 'threshold-blender', 'headless_export.py'),
                '--',
                '--object', v.object,
                '--output', path.join(ROOT, 'import'),
                '--lod',
                '--mass', v.mass,
                '--friction', v.friction,
                '--restitution', v.restitution,
            ],
            { stdio: 'inherit', cwd: ROOT }
        );
        if (res.status !== 0) return false;
    }

    const pub = path.join(ROOT, 'public', 'bundle', 'import');
    fs.mkdirSync(pub, { recursive: true });
    for (const f of fs.readdirSync(path.join(ROOT, 'import'))) {
        if (f.endsWith('.glb') || f === 'threshold_blender_manifest.json') {
            fs.copyFileSync(path.join(ROOT, 'import', f), path.join(pub, f));
        }
    }
    return true;
}

function main() {
    console.log('[child-vehicles] R2 build starting…');
    if (runBlenderPipeline()) {
        console.log('[child-vehicles] Blender export complete');
        process.exit(0);
    }
    console.log('[child-vehicles] Blender unavailable — Node GLB generator');
    process.exit(runNode(GENERATE) ? 0 : 1);
}

main();