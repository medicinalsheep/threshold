const fs = require('fs');
const path = require('path');

function readNativeApp() {
    try {
        const p = path.join(__dirname, '..', 'config', 'native-app.json');
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
        /* use defaults */
    }
    return {};
}

const nativeApp = readNativeApp();
const pkg = require('../package.json');

/** @type {import('electron-builder').Configuration} */
module.exports = {
    appId: nativeApp.appId || 'com.threshold.suite',
    productName: nativeApp.appName || 'Threshold',
    directories: {
        output: 'dist-electron',
        buildResources: 'electron/resources',
    },
    files: [
        'dist-pages/**/*',
        'electron/main.cjs',
        'electron/preload.cjs',
    ],
    extraMetadata: {
        main: 'electron/main.cjs',
    },
    icon: 'electron/resources/icon.png',
    win: {
        target: [
            { target: 'portable', arch: ['x64'] },
            { target: 'nsis', arch: ['x64'] },
        ],
        artifactName: '${productName}-${version}-win-${target}.${ext}',
        icon: 'electron/resources/icon.ico',
        signingHashAlgorithms: ['sha256'],
    },
    nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        artifactName: '${productName}-${version}-win-setup.${ext}',
    },
    mac: {
        target: ['dmg'],
        category: 'public.app-category.games',
        icon: 'electron/resources/icon.png',
        hardenedRuntime: true,
        gatekeeperAssess: false,
        artifactName: '${productName}-${version}-mac.${ext}',
    },
    linux: {
        target: ['AppImage'],
        icon: 'electron/resources/icon.png',
    },
    asar: true,
};