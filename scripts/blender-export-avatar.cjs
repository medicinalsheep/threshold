#!/usr/bin/env node
/**
 * Export Blender-rigged avatar GLB for Threshold.
 *
 *   npm run blender:avatar -- --blend rig.blend --object Armature
 *   npm run blender:avatar -- --blend rig.blend --object Armature --file my_avatar.glb
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const AVATAR_SCRIPT = path.join(ROOT, 'plugins', 'threshold-blender', 'export_avatar.py');
const PUB = path.join(ROOT, 'public', 'bundle', 'import');

const BLENDER_CANDIDATES = [
    process.env.BLENDER_EXE,
    'blender',
    'C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
    '/Applications/Blender.app/Contents/MacOS/Blender',
    '/usr/bin/blender',
].filter(Boolean);

function parseArgs(argv) {
    const out = {
        blend: process.env.THRESHOLD_BLEND || '',
        object: process.env.THRESHOLD_AVATAR_OBJECT || 'Armature',
        name: 'StarterAvatar',
        output: 'import',
        file: '',
        help: false,
    };
    for (let i = 0; i < argv.length; i += 1) {
        const a = argv[i];
        if (a === '--blend') out.blend = argv[++i] || '';
        else if (a === '--object') out.object = argv[++i] || '';
        else if (a === '--name') out.name = argv[++i] || out.name;
        else if (a === '--output') out.output = argv[++i] || 'import';
        else if (a === '--file') out.file = argv[++i] || '';
        else if (a === '--help' || a === '-h') out.help = true;
    }
    return out;
}

function findBlender() {
    for (const c of BLENDER_CANDIDATES) {
        if (c === 'blender') {
            const p = spawnSync('where', ['blender'], { shell: true, encoding: 'utf8' });
            if (p.status === 0 && p.stdout.trim()) return p.stdout.trim().split(/\r?\n/)[0];
            continue;
        }
        if (fs.existsSync(c)) return c;
    }
    return null;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log(`Threshold avatar export\n  npm run blender:avatar -- --blend rig.blend --object Armature [--file name.glb]`);
        process.exit(0);
    }
    if (!args.blend || !fs.existsSync(args.blend)) {
        console.error('[blender-avatar] --blend path required (existing .blend file)');
        process.exit(1);
    }
    const blender = findBlender();
    if (!blender) {
        console.error('[blender-avatar] Blender not found — set BLENDER_EXE');
        process.exit(1);
    }

    const outDir = path.isAbsolute(args.output) ? args.output : path.join(ROOT, args.output);
    const pyArgs = [
        '--background', args.blend,
        '--python', AVATAR_SCRIPT, '--',
        '--object', args.object,
        '--name', args.name,
        '--output', outDir,
    ];
    if (args.file) pyArgs.push('--file', args.file);

    const r = spawnSync(blender, pyArgs, { stdio: 'inherit', cwd: ROOT });
    if (r.status !== 0) process.exit(r.status || 1);

    const glbName = args.file || `${args.name.replace(/\s+/g, '_').toLowerCase()}.glb`;
    const src = path.join(outDir, glbName);
    if (fs.existsSync(src)) {
        fs.mkdirSync(PUB, { recursive: true });
        fs.copyFileSync(src, path.join(PUB, path.basename(src)));
        console.log(`[blender-avatar] bundled → public/bundle/import/${path.basename(src)}`);
    }
}

main();