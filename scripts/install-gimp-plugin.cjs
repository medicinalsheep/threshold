/**
 * Copy Threshold GIMP plugin into the user GIMP plug-ins folder.
 * Windows: %APPDATA%\GIMP\2.10\plug-ins\ or 3.0
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'plugins', 'threshold-gimp', 'threshold_export.py');

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
    if (!fs.existsSync(SOURCE)) {
        console.error('Plugin source not found:', SOURCE);
        process.exit(1);
    }

    const { dir, ver } = pickTargetDir();
    fs.mkdirSync(dir, { recursive: true });

    const dest = path.join(dir, 'threshold_export.py');
    fs.copyFileSync(SOURCE, dest);

    if (process.platform !== 'win32') {
        try {
            fs.chmodSync(dest, 0o755);
        } catch {
            /* ignore */
        }
    }

    console.log(`Installed Threshold GIMP plugin for GIMP ${ver}:`);
    console.log(' ', dest);
    console.log('');
    console.log('Restart GIMP, then use Filters → Threshold → Export PBR Maps…');
    console.log('Export folder tip: point at your project textures/ directory.');
}

main();