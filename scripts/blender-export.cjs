/**
 * Headless Blender export hook for Threshold.
 *
 * Usage:
 *   npm run blender:export -- --blend scene.blend --object "Stone Block"
 *   npm run blender:export -- --object "Stone Block"   (uses open blend in background — needs --blend)
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HEADLESS_SCRIPT = path.join(ROOT, 'plugins', 'threshold-blender', 'headless_export.py');

const BLENDER_CANDIDATES = [
    process.env.BLENDER_EXE,
    'blender',
    'C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
    '/Applications/Blender.app/Contents/MacOS/Blender',
    '/usr/bin/blender',
].filter(Boolean);

function parseArgs(argv) {
    const out = {
        blend: process.env.THRESHOLD_BLEND || '',
        object: process.env.THRESHOLD_OBJECT || '',
        blendObject: '',
        output: 'import',
        noPhysics: false,
        mass: '1',
        friction: '0.3',
        restitution: '0.5',
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--blend') out.blend = argv[++i] || '';
        else if (arg === '--object') out.object = argv[++i] || '';
        else if (arg === '--blend-object') out.blendObject = argv[++i] || '';
        else if (arg === '--output') out.output = argv[++i] || 'import';
        else if (arg === '--no-physics') out.noPhysics = true;
        else if (arg === '--mass') out.mass = argv[++i] || '1';
        else if (arg === '--friction') out.friction = argv[++i] || '0.3';
        else if (arg === '--restitution') out.restitution = argv[++i] || '0.5';
        else if (arg === '--help' || arg === '-h') out.help = true;
    }
    return out;
}

function findBlender() {
    for (const candidate of BLENDER_CANDIDATES) {
        if (candidate === 'blender') {
            const probe = spawnSync('where', ['blender'], { shell: true, encoding: 'utf8' });
            if (probe.status === 0 && probe.stdout.trim()) {
                return probe.stdout.trim().split(/\r?\n/)[0];
            }
            continue;
        }
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

function printHelp() {
    console.log(`Threshold headless Blender export

Usage:
  npm run blender:export -- --blend <file.blend> --object "Stone Block" [options]

Options:
  --blend <path>         .blend file (required)
  --object <name>        Engine object name (required)
  --blend-object <name>  Blender object name if different
  --output <dir>         Export folder (default: import)
  --no-physics           Disable physics in manifest
  --mass <n>             Manifest mass (default: 1)
  --friction <n>         Manifest friction (default: 0.3)
  --restitution <n>      Manifest bounce (default: 0.5)

Environment:
  BLENDER_EXE            Path to blender executable
  THRESHOLD_BLEND        Default blend file
  THRESHOLD_OBJECT       Default object name
`);
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        process.exit(0);
    }

    if (!args.blend || !args.object) {
        printHelp();
        console.error('\nError: --blend and --object are required.');
        process.exit(1);
    }

    const blendPath = path.resolve(args.blend);
    if (!fs.existsSync(blendPath)) {
        console.error(`Blend file not found: ${blendPath}`);
        process.exit(1);
    }
    if (!fs.existsSync(HEADLESS_SCRIPT)) {
        console.error(`Headless script not found: ${HEADLESS_SCRIPT}`);
        process.exit(1);
    }

    const blender = findBlender();
    if (!blender) {
        console.error('Blender not found. Set BLENDER_EXE or install Blender.');
        process.exit(1);
    }

    const pyArgs = [
        '--object', args.object,
        '--output', path.resolve(args.output),
        '--mass', args.mass,
        '--friction', args.friction,
        '--restitution', args.restitution,
    ];
    if (args.blendObject) pyArgs.push('--blend-object', args.blendObject);
    if (args.noPhysics) pyArgs.push('--no-physics');

    const result = spawnSync(
        blender,
        [
            '--background',
            blendPath,
            '--python',
            HEADLESS_SCRIPT,
            '--',
            ...pyArgs,
        ],
        { stdio: 'inherit', cwd: ROOT }
    );

    process.exit(result.status ?? 1);
}

main();