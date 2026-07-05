#!/usr/bin/env node
/**
 * One-time native scaffold: Capacitor Android project + dependency check.
 * Run: npm run init:native
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'android');

function run(cmd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

if (!fs.existsSync(path.join(root, 'dist-pages', 'index.html'))) {
    console.log('Building web bundle first…');
    run('npm run build');
}

if (!fs.existsSync(androidDir)) {
    console.log('Adding Capacitor Android platform…');
    run('npx cap add android');
} else {
    console.log('Android platform already exists — syncing only.');
}

run('npx cap sync android');
console.log('\nNative scaffold ready.');
console.log('  Android Studio: npm run cap:open');
console.log('  Windows .exe:   npm run package:win');