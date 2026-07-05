/**
 * Copy Threshold Blender addon into the user scripts/addons folder.
 * Windows: %APPDATA%\Blender Foundation\Blender\<ver>\scripts\addons\
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'plugins', 'threshold-blender', 'threshold_blender');

const BLENDER_VERSIONS = ['4.4', '4.3', '4.2', '4.1', '4.0', '3.6', '3.5', '3.4', '3.3'];

function blenderAddonsDir(version) {
    const base = process.platform === 'win32'
        ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Blender Foundation', 'Blender')
        : process.platform === 'darwin'
            ? path.join(os.homedir(), 'Library', 'Application Support', 'Blender')
            : path.join(os.homedir(), '.config', 'blender');
    return path.join(base, version, 'scripts', 'addons');
}

function pickTargetDir() {
    for (const ver of BLENDER_VERSIONS) {
        const parent = path.dirname(blenderAddonsDir(ver));
        if (fs.existsSync(parent)) return { dir: blenderAddonsDir(ver), ver };
    }
    return { dir: blenderAddonsDir('4.2'), ver: '4.2' };
}

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(from, to);
        else fs.copyFileSync(from, to);
    }
}

function main() {
    if (!fs.existsSync(SOURCE)) {
        console.error('Addon source not found:', SOURCE);
        process.exit(1);
    }

    const { dir, ver } = pickTargetDir();
    const dest = path.join(dir, 'threshold_blender');
    fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
    }
    copyDir(SOURCE, dest);

    console.log(`Installed Threshold Blender addon for Blender ${ver}:`);
    console.log(' ', dest);
    console.log('');
    console.log('Enable in Blender: Edit → Preferences → Add-ons → search "Threshold"');
    console.log('Export: File → Export → Threshold GLTF (.glb) → project import/ folder');
}

main();