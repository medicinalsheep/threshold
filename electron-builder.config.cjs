/** @type {import('electron-builder').Configuration} */
module.exports = {
    appId: 'com.threshold.suite',
    productName: 'Threshold',
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
        target: [{ target: 'portable', arch: ['x64'] }],
        artifactName: 'Threshold-${version}-win-portable.${ext}',
        icon: 'electron/resources/icon.ico',
    },
    mac: {
        target: ['dmg'],
        category: 'public.app-category.games',
        icon: 'electron/resources/icon.png',
    },
    linux: {
        target: ['AppImage'],
        icon: 'electron/resources/icon.png',
    },
    asar: true,
};