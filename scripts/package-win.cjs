#!/usr/bin/env node
/**
 * Build Threshold Windows portable .exe from dist-pages + Electron shell.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const distIndex = path.join(root, 'dist-pages', 'index.html');

function run(cmd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

if (!fs.existsSync(distIndex)) {
    run('npm run build:electron');
} else {
    const html = fs.readFileSync(distIndex, 'utf8');
    if (html.includes('src="/threshold/')) {
        console.log('[package-win] dist-pages has GitHub Pages base — rebuilding for Electron (./)');
        run('npm run build:electron');
    }
}

run('npm run bundle:assets');
run('node scripts/export-graphics.cjs --profile windows --install');

const icoPath = path.join(root, 'electron', 'resources', 'icon.ico');
if (!fs.existsSync(icoPath)) {
    run('npm run build:icons');
}

run('npx electron-builder --config electron-builder.config.cjs --win portable nsis');
console.log('\nWindows packages written to dist-electron/');
console.log('  Portable + NSIS installer — optional sign: CSC_LINK + CSC_KEY_PASSWORD');
console.log('  Store prep: npm run store:prep -- --manifest <game>.threshold-game.json');
console.log('  Guide: docs/STORE_RELEASE.md');