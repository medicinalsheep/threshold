#!/usr/bin/env node
/**
 * Sync web build into Capacitor iOS project.
 * Full IPA: open Xcode on macOS and Archive → Distribute.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const iosDir = path.join(root, 'ios');

function run(cmd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

run('npm run build');
run('npm run bundle:assets');

if (!fs.existsSync(iosDir)) {
    console.log('iOS platform missing — running init:native (iOS)…');
    run('node scripts/init-native.cjs --ios');
} else {
    run('npx cap sync ios');
}

console.log('\niOS web assets synced.');
console.log('  On macOS: npm run cap:open:ios');
console.log('  Xcode: Product → Archive → Distribute App → TestFlight / App Store');
console.log('  See docs/NATIVE_SHELLS.md § iOS & TestFlight');