/**
 * Phase M — Steam depot layout + steamcmd VDF generation.
 */
const fs = require('fs');
const path = require('path');
const { ROOT, loadManifest, manifestVars, slugify } = require('./store-release-lib.cjs');

const STEAM_CONFIG_PATH = path.join(ROOT, 'config', 'steam-release.json');
const STEAM_APP_CONFIG = path.join(ROOT, 'config', 'steam-app.json');
const PKG_PATH = path.join(ROOT, 'package.json');

function loadSteamConfig() {
    return JSON.parse(fs.readFileSync(STEAM_CONFIG_PATH, 'utf8'));
}

function loadPkg() {
    return JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
}

function getSteamIds(manifest) {
    const opportunity = manifest.assetOpportunity || manifest.assetRegistry?.storeAssets?.opportunity || {};
    const steam = opportunity.steam || manifest.packaging?.steam || {};
    return {
        appId: steam.appId || process.env.STEAM_APP_ID || null,
        depotId: steam.depotId || process.env.STEAM_DEPOT_ID || null,
    };
}

function writeSteamAppConfig(manifest, sourceManifest = null) {
    const { appId, depotId } = getSteamIds(manifest);
    const vars = manifestVars(manifest);
    const cfg = {
        format: 'threshold-steam-app',
        appliedAt: new Date().toISOString(),
        sourceManifest: sourceManifest || null,
        appId: appId || null,
        depotId: depotId || null,
        game: vars.GAME_NAME,
        bundleId: vars.BUNDLE_ID,
    };
    fs.mkdirSync(path.dirname(STEAM_APP_CONFIG), { recursive: true });
    fs.writeFileSync(STEAM_APP_CONFIG, JSON.stringify(cfg, null, 2));
    return cfg;
}

function findPortableExe(distElectron, globHint) {
    if (!fs.existsSync(distElectron)) return null;
    const files = fs.readdirSync(distElectron).filter((f) => f.endsWith('.exe') && f.includes('portable'));
    if (!files.length) {
        const any = fs.readdirSync(distElectron).filter((f) => f.endsWith('.exe'));
        return any[0] ? path.join(distElectron, any[0]) : null;
    }
    if (globHint) {
        const match = files.find((f) => f.includes(globHint.replace(/\*/g, '')));
        if (match) return path.join(distElectron, match);
    }
    return path.join(distElectron, files.sort().pop());
}

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(src)) return 0;
    fs.mkdirSync(dest, { recursive: true });
    let count = 0;
    fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            count += copyDirRecursive(s, d);
        } else {
            fs.copyFileSync(s, d);
            count += 1;
        }
    });
    return count;
}

function buildDepotLayout(manifest, options = {}) {
    const steamCfg = loadSteamConfig();
    const depotCfg = steamCfg.depot || {};
    const pkg = loadPkg();
    const vars = manifestVars(manifest, options);
    const ids = getSteamIds(manifest);
    if (!ids.appId) throw new Error('Steam App ID required — set in PACKS step or STEAM_APP_ID');
    if (!ids.depotId) throw new Error('Steam Depot ID required — set in PACKS step or STEAM_DEPOT_ID');

    const slug = slugify(vars.GAME_NAME);
    const baseOut = path.resolve(ROOT, options.out || 'dist-steam');
    const contentDir = path.join(baseOut, 'content');
    const outputDir = path.join(baseOut, 'output');
    const scriptsDir = path.join(baseOut, 'scripts');

    [contentDir, outputDir, scriptsDir].forEach((d) => fs.mkdirSync(d, { recursive: true }));

    const distElectron = path.join(ROOT, 'dist-electron');
    const exeSrc = options.exePath || findPortableExe(distElectron, depotCfg.executableGlob);
    if (!exeSrc || !fs.existsSync(exeSrc)) {
        throw new Error('Portable .exe not found — run npm run package:steam first');
    }

    const exeName = path.basename(exeSrc);
    const exeDest = path.join(contentDir, exeName);
    fs.copyFileSync(exeSrc, exeDest);

    fs.writeFileSync(path.join(contentDir, depotCfg.steamAppIdFile || 'steam_appid.txt'), `${ids.appId}\n`);

    const bundleSrc = path.join(ROOT, 'dist-pages', 'bundle');
    let bundleFiles = 0;
    if (fs.existsSync(bundleSrc)) {
        bundleFiles = copyDirRecursive(bundleSrc, path.join(contentDir, 'bundle'));
    }

    const registry = manifest.assetRegistry?.storeAssets;
    const steamMap = options.steamDepotJson
        ? JSON.parse(fs.readFileSync(options.steamDepotJson, 'utf8'))
        : null;

    const appBuildVdf = [
        '"AppBuild"',
        '{',
        `\t"AppID"\t"${ids.appId}"`,
        `\t"Desc"\t"${vars.GAME_NAME} — Threshold build ${pkg.version}"`,
        `\t"BuildOutput"\t"${outputDir.replace(/\\/g, '/')}"`,
        `\t"ContentRoot"\t"${contentDir.replace(/\\/g, '/')}"`,
        '\t"Depots"',
        '\t{',
        `\t\t"${ids.depotId}"\t"depot_build.vdf"`,
        '\t}',
        '}',
        '',
    ].join('\n');

    const depotBuildVdf = [
        '"DepotBuildConfig"',
        '{',
        `\t"DepotID"\t"${ids.depotId}"`,
        `\t"ContentRoot"\t"${contentDir.replace(/\\/g, '/')}"`,
        '\t"FileMapping"',
        '\t{',
        '\t\t"LocalPath"\t"*"',
        '\t\t"DepotPath"\t"."',
        '\t\t"recursive"\t"1"',
        '\t}',
        '}',
        '',
    ].join('\n');

    fs.writeFileSync(path.join(scriptsDir, 'app_build.vdf'), appBuildVdf);
    fs.writeFileSync(path.join(scriptsDir, 'depot_build.vdf'), depotBuildVdf);

    const uploadCmd = [
        '@echo off',
        'REM Phase M — upload depot via steamcmd (install SteamCMD first)',
        'REM https://partner.steamgames.com/doc/sdk/uploading',
        '',
        'set STEAMCMD=C:\\steamcmd\\steamcmd.exe',
        'if not exist "%STEAMCMD%" set STEAMCMD=steamcmd',
        '',
        `"%STEAMCMD%" +login %STEAM_USER% +run_app_build "${path.join(scriptsDir, 'app_build.vdf').replace(/\\/g, '/')}" +quit`,
        '',
    ].join('\r\n');
    fs.writeFileSync(path.join(scriptsDir, 'upload-steam-depot.cmd'), uploadCmd);

    const relBase = path.relative(ROOT, baseOut).replace(/\\/g, '/');
    const prep = {
        format: 'threshold-steam-depot-prep',
        preparedAt: new Date().toISOString(),
        game: vars.GAME_NAME,
        engineVersion: manifest.engineVersion,
        appId: ids.appId,
        depotId: ids.depotId,
        outDir: relBase,
        contentDir: `${relBase}/content`,
        executable: exeName,
        bundleFiles,
        mappedAssets: registry?.mappedCount || 0,
        scripts: {
            appBuild: `${relBase}/scripts/app_build.vdf`,
            depotBuild: `${relBase}/scripts/depot_build.vdf`,
            upload: `${relBase}/scripts/upload-steam-depot.cmd`,
        },
        steamDepotMap: steamMap?.files?.length || 0,
        nextSteps: [
            'Install SteamCMD + log in with Steamworks partner account',
            `Run ${relBase}/scripts/upload-steam-depot.cmd`,
            'Steamworks → App Admin → confirm build → set live branch',
            'Optional: npm install steamworks.js + launch via Steam client for achievements',
        ],
    };
    fs.writeFileSync(path.join(baseOut, 'steam-depot-prep.json'), JSON.stringify(prep, null, 2));
    return prep;
}

module.exports = {
    loadSteamConfig,
    writeSteamAppConfig,
    getSteamIds,
    buildDepotLayout,
    findPortableExe,
};