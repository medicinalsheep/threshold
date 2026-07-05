#!/usr/bin/env node
/**
 * Native scaffold: Capacitor Android + iOS platforms.
 * Run: npm run init:native
 * iOS only: npm run init:native -- --ios
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'android');
const iosDir = path.join(root, 'ios');
const args = process.argv.slice(2);
const iosOnly = args.includes('--ios');
const androidOnly = args.includes('--android');
const includeIos = iosOnly || (!androidOnly && !iosOnly);
const includeAndroid = androidOnly || (!androidOnly && !iosOnly);

function run(cmd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

function hasPkg(name) {
    const pkgPath = path.join(root, 'node_modules', ...name.split('/'));
    return fs.existsSync(pkgPath);
}

if (!fs.existsSync(path.join(root, 'dist-pages', 'index.html'))) {
    console.log('Building web bundle first…');
    run('npm run build');
}

const iconPng = path.join(root, 'icons', 'appicon512.png');
if (fs.existsSync(iconPng)) {
    try {
        run('npm run cap:assets');
    } catch (e) {
        console.log('cap:assets skipped — run manually after platform exists');
    }
}

if (includeAndroid) {
    if (!fs.existsSync(androidDir)) {
        console.log('Adding Capacitor Android platform…');
        run('npx cap add android');
    } else {
        console.log('Android platform already exists — syncing.');
    }
    run('npx cap sync android');
}

if (includeIos) {
    if (!hasPkg('@capacitor/ios')) {
        console.error('@capacitor/ios not installed — run npm install');
        process.exit(1);
    }
    if (!fs.existsSync(iosDir)) {
        console.log('Adding Capacitor iOS platform…');
        run('npx cap add ios');
    } else {
        console.log('iOS platform already exists — syncing.');
    }
    run('npx cap sync ios');
}

console.log('\nNative scaffold ready.');
if (includeAndroid) console.log('  Android Studio: npm run cap:open');
if (includeIos) console.log('  Xcode (macOS):  npm run cap:open:ios');
console.log('  Windows .exe:   npm run package:win');
if (includeIos) console.log('  iOS sync:       npm run package:ios');