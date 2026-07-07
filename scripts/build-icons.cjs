#!/usr/bin/env node
/**
 * Generate favicon ladder + Electron .ico from icons/appicon512.png
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pngPath = path.join(root, 'icons', 'appicon512.png');
const iconsDir = path.join(root, 'icons');
const publicIconsDir = path.join(root, 'public', 'icons');
const resourcesDir = path.join(root, 'electron', 'resources');
const icoPath = path.join(resourcesDir, 'icon.ico');

const SIZES = [
    { name: 'favicon-32.png', size: 32 },
    { name: 'icon-192.png', size: 192 },
];

async function main() {
    if (!fs.existsSync(pngPath)) {
        console.error('Missing icons/appicon512.png');
        process.exit(1);
    }

    let sharp;
    let pngToIco;
    try {
        sharp = require('sharp');
        pngToIco = require('png-to-ico');
    } catch {
        console.error('Run npm install first (sharp, png-to-ico devDependencies).');
        process.exit(1);
    }

    fs.mkdirSync(iconsDir, { recursive: true });
    fs.mkdirSync(publicIconsDir, { recursive: true });
    fs.mkdirSync(resourcesDir, { recursive: true });

    const source = sharp(pngPath);

    for (const { name, size } of SIZES) {
        const buf = await source.clone().resize(size, size).png().toBuffer();
        const rootOut = path.join(iconsDir, name);
        const publicOut = path.join(publicIconsDir, name);
        fs.writeFileSync(rootOut, buf);
        fs.writeFileSync(publicOut, buf);
        console.log(`Wrote icons/${name} + public/icons/${name}`);
    }

    // favicon.ico (16 + 32)
    const png16 = await source.clone().resize(16, 16).png().toBuffer();
    const png32 = await source.clone().resize(32, 32).png().toBuffer();
    const icoBuf = await pngToIco([png16, png32]);
    const faviconRoot = path.join(iconsDir, 'favicon.ico');
    const faviconPublic = path.join(publicIconsDir, 'favicon.ico');
    fs.writeFileSync(faviconRoot, icoBuf);
    fs.writeFileSync(faviconPublic, icoBuf);
    console.log('Wrote icons/favicon.ico + public/icons/favicon.ico');

    // Electron resources
    fs.copyFileSync(pngPath, path.join(resourcesDir, 'icon.png'));
    const electronIco = await pngToIco(pngPath);
    fs.writeFileSync(icoPath, electronIco);
    console.log('Wrote electron/resources/icon.ico + icon.png');

    // Keep public appicon512 in sync
    fs.copyFileSync(pngPath, path.join(publicIconsDir, 'appicon512.png'));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});