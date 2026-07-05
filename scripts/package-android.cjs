#!/usr/bin/env node
/**
 * Sync web build into Capacitor Android project.
 * Full APK: open Android Studio and Build → Build Bundle(s) / APK(s).
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

run('npm run build');
run('npm run bundle:assets');
run('node scripts/export-graphics.cjs --profile android --install');

if (!fs.existsSync(androidDir)) {
    console.log('Android platform missing — running init:native…');
    run('node scripts/init-native.cjs');
} else {
    run('npx cap sync android');
}

console.log('\nAndroid web assets synced.');
console.log('  Open project:  npm run cap:open');
console.log('  In Android Studio: Build → Build APK(s)');
console.log('  Or CLI (if SDK configured): cd android && ./gradlew assembleDebug');