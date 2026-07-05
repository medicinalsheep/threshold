#!/usr/bin/env node
/**
 * Phase L — macOS Electron .dmg (build on macOS).
 * Notarization: set CSC_LINK, CSC_KEY_PASSWORD, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function run(cmd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

if (process.platform !== 'darwin') {
    console.error('[package:mac] macOS build requires running on darwin (macOS).');
    console.error('  For Mac App Store WKWebView app, use npm run package:ios + Xcode instead.');
    process.exit(1);
}

const distIndex = path.join(root, 'dist-pages', 'index.html');
if (!fs.existsSync(distIndex)) run('npm run build');

run('npm run bundle:assets');
run('node scripts/export-graphics.cjs --profile windows --install');

const icoPath = path.join(root, 'electron', 'resources', 'icon.ico');
if (!fs.existsSync(path.join(root, 'electron', 'resources', 'icon.png'))) {
    run('npm run build:icons');
}

run('npx electron-builder --config electron-builder.config.cjs --mac dmg');
console.log('\nmacOS package written to dist-electron/');
console.log('Notarization: see docs/STORE_RELEASE.md § macOS signing');