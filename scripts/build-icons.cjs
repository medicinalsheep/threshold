#!/usr/bin/env node
/**
 * Generate Electron Windows .ico from icons/appicon512.png
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pngPath = path.join(root, 'icons', 'appicon512.png');
const resourcesDir = path.join(root, 'electron', 'resources');
const icoPath = path.join(resourcesDir, 'icon.ico');

async function main() {
    if (!fs.existsSync(pngPath)) {
        console.error('Missing icons/appicon512.png');
        process.exit(1);
    }
    fs.mkdirSync(resourcesDir, { recursive: true });
    fs.copyFileSync(pngPath, path.join(resourcesDir, 'icon.png'));

    let pngToIco;
    try {
        pngToIco = require('png-to-ico');
    } catch {
        console.error('Run npm install first (png-to-ico devDependency).');
        process.exit(1);
    }

    const buf = await pngToIco(pngPath);
    fs.writeFileSync(icoPath, buf);
    console.log('Wrote electron/resources/icon.ico');
    console.log('Wrote electron/resources/icon.png');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});