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
    run('npm run build');
}

run('npm run bundle:assets');

const icoPath = path.join(root, 'electron', 'resources', 'icon.ico');
if (!fs.existsSync(icoPath)) {
    run('npm run build:icons');
}

run('npx electron-builder --config electron-builder.config.cjs --win portable');
console.log('\nWindows package written to dist-electron/');