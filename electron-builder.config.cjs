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
    win: {
        target: [{ target: 'portable', arch: ['x64'] }],
        artifactName: 'Threshold-${version}-win-portable.${ext}',
    },
    mac: {
        target: ['dmg'],
        category: 'public.app-category.games',
    },
    linux: {
        target: ['AppImage'],
    },
    asar: true,
};