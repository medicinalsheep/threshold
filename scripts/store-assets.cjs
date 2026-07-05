#!/usr/bin/env node
/**
 * Phase M+ — Generate platform store asset maps from export manifest.
 *
 * Usage:
 *   npm run store:assets -- --manifest my-game.threshold-game.json
 */
const path = require('path');
const {
    ROOT,
    loadManifest,
    manifestVars,
    generateStoreAssetMaps,
    slugify,
} = require('./store-release-lib.cjs');

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
Threshold store assets (Phase M+)

  npm run store:assets -- --manifest <game>.threshold-game.json [options]

Options:
  --manifest, -m   Exported .threshold-game.json (required)
  --out, -o        Output directory (default: dist-store/<game-slug>/)
  --help, -h       Show this help

Writes (when manifest includes assetRegistry / PACKS step data):
  play-in-app-products.json    — Google Play IAP SKUs
  steam-depot-assets.json      — Steam depot file map
  itch-asset-packs.json        — itch.io DLC structure
  collectible-registry.json    — registryUri items
  store-assets-prep.json       — summary + file list

Also run automatically via npm run store:prep.
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
    const vars = manifestVars(manifest);
    const slug = slugify(vars.GAME_NAME);
    const outDir = path.resolve(ROOT, args.out || path.join('dist-store', slug));
    require('fs').mkdirSync(outDir, { recursive: true });

    const maps = generateStoreAssetMaps(manifest, vars, outDir);
    const s = maps.summary;

    console.log(`\nStore assets: ${vars.GAME_NAME}`);
    console.log(`Output: ${path.relative(ROOT, outDir).replace(/\\/g, '/')}/`);
    console.log(`Status: ${s.status} · mapped: ${s.mappedCount} · Play products: ${s.playProductCount}`);
    if (s.steamAppId) console.log(`Steam: app ${s.steamAppId} · depot ${s.steamDepotId || '(set in PACKS step)'}`);
    console.log('\nFiles:');
    Object.entries(s.files).forEach(([platform, file]) => {
        console.log(`  ${platform}: ${file}`);
    });
    console.log('\nNext:');
    if (s.playProductCount) console.log('  Play Console → Monetize → Products (match play-in-app-products.json SKUs)');
    if (s.steamAppId) console.log('  npm run export:graphics -- --profile steam --install → upload bundle/ to Steam depot');
    if (s.registryItemCount) console.log(`  Registry: ${s.registryItemCount} collectible URI(s) in collectible-registry.json`);
}

main();