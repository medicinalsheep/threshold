#!/usr/bin/env node
/**
 * Phase M — Prepare Steam depot content + steamcmd VDF scripts.
 */
const path = require('path');
const {
    ROOT,
    loadManifest,
    manifestVars,
    slugify,
} = require('./store-release-lib.cjs');
const { writeSteamAppConfig, buildDepotLayout } = require('./steam-depot-lib.cjs');

function parseArgs(argv) {
    const args = { manifest: null, out: null, help: false };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--manifest' || a === '-m') args.manifest = argv[++i];
        else if (a === '--out' || a === '-o') args.out = argv[++i];
    }
    return args;
}

function printHelp() {
    console.log(`
Threshold Steam depot prep (Phase M)

  npm run steam:depot -- --manifest <game>.threshold-game.json [options]

Prerequisites:
  npm run package:steam -- --manifest <game>.threshold-game.json

Options:
  --manifest, -m   Exported .threshold-game.json (required)
  --out, -o        Output base (default: dist-steam/)
  --help, -h       Show this help

Writes:
  dist-steam/content/          — portable .exe + steam_appid.txt + bundle/
  dist-steam/scripts/          — app_build.vdf, depot_build.vdf, upload-steam-depot.cmd
  dist-steam/steam-depot-prep.json
`);
}

function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        printHelp();
        return;
    }
    if (!args.manifest) {
        printHelp();
        process.exit(1);
    }

    const manifest = loadManifest(args.manifest);
    writeSteamAppConfig(manifest, args.manifest);

    const vars = manifestVars(manifest);
    const slug = slugify(vars.GAME_NAME);
    const steamDepotJson = path.join(ROOT, 'dist-store', slug, 'steam-depot-assets.json');

    const prep = buildDepotLayout(manifest, {
        out: args.out,
        sourceManifest: args.manifest,
        steamDepotJson: require('fs').existsSync(steamDepotJson) ? steamDepotJson : null,
    });

    console.log(`\nSteam depot: ${prep.game}`);
    console.log(`App ${prep.appId} · Depot ${prep.depotId}`);
    console.log(`Content: ${prep.contentDir}/`);
    console.log(`  ${prep.executable} + ${prep.bundleFiles} bundle file(s)`);
    console.log('\nUpload:');
    prep.nextSteps.forEach((s) => console.log(`  ${s}`));
}

main();