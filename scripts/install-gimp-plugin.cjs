/**
 * Copy Threshold GIMP plugin into the user GIMP plug-ins folder.
 * Windows: %APPDATA%\GIMP\2.10\plug-ins\ or 3.0
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const GIMP_DIR = path.join(ROOT, 'plugins', 'threshold-gimp');
const PLUGINS = ['threshold_export.py', 'build_tc_tex.py'];

const GIMP_VERSIONS = ['3.0', '2.10'];

function gimpPluginDir(version) {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    if (process.platform === 'win32') {
        return path.join(appData, 'GIMP', version, 'plug-ins');
    }
    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'GIMP', version, 'plug-ins');
    }
    return path.join(os.homedir(), '.config', 'GIMP', version, 'plug-ins');
}

function pickTargetDir() {
    for (const ver of GIMP_VERSIONS) {
        const dir = gimpPluginDir(ver);
        if (fs.existsSync(path.dirname(dir))) return { dir, ver };
    }
    return { dir: gimpPluginDir('2.10'), ver: '2.10' };
}

function main() {
    const { dir, ver } = pickTargetDir();
    fs.mkdirSync(dir, { recursive: true });

    const installed = [];
    for (const name of PLUGINS) {
        const src = path.join(GIMP_DIR, name);
        if (!fs.existsSync(src)) {
            console.warn('Skip missing:', src);
            continue;
        }
        const dest = path.join(dir, name);
        fs.copyFileSync(src, dest);
        installed.push(dest);
        if (process.platform !== 'win32') {
            try { fs.chmodSync(dest, 0o755); } catch { /* ignore */ }
        }
    }

    if (!installed.length) {
        console.error('No GIMP plugins found in', GIMP_DIR);
        process.exit(1);
    }

    console.log(`Installed Threshold GIMP plugins for GIMP ${ver}:`);
    installed.forEach((p) => console.log(' ', p));
    console.log('');
    console.log('Restart GIMP:');
    console.log('  Filters → Threshold → Export PBR Maps…');
    console.log('  Filters → Threshold → Build TC Textures (R6)…');
    console.log('Export folder tip: point at your project textures/ directory.');
}

main();