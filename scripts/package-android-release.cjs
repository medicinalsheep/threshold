#!/usr/bin/env node
/**
 * Phase L — Android release bundle (AAB) via Gradle.
 * Signing: configure in Android Studio or android/app/build.gradle + keystore.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'android');
const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

function run(cmd, cwd = root) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

run('npm run package:android');

if (!fs.existsSync(gradlew)) {
    console.error('\n[package:android:release] Gradle wrapper missing — open Android Studio first.');
    console.error('  npm run cap:open → wait for sync → Build → Generate Signed Bundle');
    process.exit(1);
}

const task = process.platform === 'win32' ? 'gradlew.bat bundleRelease' : './gradlew bundleRelease';
try {
    run(task, androidDir);
} catch (e) {
    console.error('\n[package:android:release] Gradle failed — usually unsigned keystore.');
    console.error('  Android Studio → Build → Generate Signed Bundle / APK');
    console.error('  Or add signingConfig to android/app/build.gradle');
    process.exit(1);
}

const aab = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
if (fs.existsSync(aab)) {
    console.log(`\nRelease AAB: ${path.relative(root, aab)}`);
    console.log('Upload to Play Console → Release → Production or internal testing');
} else {
    console.log('\nGradle finished — check android/app/build/outputs/ for artifacts');
}