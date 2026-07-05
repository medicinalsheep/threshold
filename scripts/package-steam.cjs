#!/usr/bin/env node
/**
 * Phase M — Build Windows portable for Steam + write steam_appid config.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadManifest, manifestVars } = require('./store-release-lib.cjs');
const { writeSteamAppConfig, getSteamIds } = require('./steam-depot-lib.cjs');

const root = path.join(__dirname, '..');
const distIndex = path.join(root, 'dist-pages', 'index.html');

function parseArgs(argv) {
    const args = { manifest: null, help: false };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--manifest' || a === '-m') args.manifest = argv[++i];
    }
    return args;
}

function run(cmd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

function printHelp() {
    console.log(`
Threshold Steam package (Phase M)

  npm run package:steam -- [--manifest <game>.threshold-game.json]

Builds Windows portable .exe with steam graphics profile (ultra / 4K textures).
Writes config/steam-app.json when manifest includes Steam App ID.

Next: npm run steam:depot -- --manifest <game>.threshold-game.json
`);
}

function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        printHelp();
        return;
    }

    if (!fs.existsSync(distIndex)) run('npm run build');
    run('npm run bundle:assets');
    run('node scripts/export-graphics.cjs --profile steam --install');

    const icoPath = path.join(root, 'electron', 'resources', 'icon.ico');
    if (!fs.existsSync(icoPath)) run('npm run build:icons');

    run('npx electron-builder --config electron-builder.config.cjs --win portable');

    if (args.manifest) {
        const manifest = loadManifest(args.manifest);
        const steamCfg = writeSteamAppConfig(manifest, args.manifest);
        const ids = getSteamIds(manifest);
        console.log(`\nSteam config: App ${steamCfg.appId || ids.appId || '(unset)'} · Depot ${steamCfg.depotId || ids.depotId || '(unset)'}`);
        if (!ids.appId) {
            console.log('  Set Steam App/Depot ID in export PACKS step, then re-run with --manifest');
        }
    } else {
        console.log('\nTip: pass --manifest <game>.threshold-game.json to write config/steam-app.json');
    }

    console.log('\nSteam portable written to dist-electron/');
    console.log('  npm run steam:depot -- --manifest <game>.threshold-game.json');
    console.log('  Guide: docs/STEAM_RELEASE.md');
}

main();