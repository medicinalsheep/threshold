#!/usr/bin/env node
/**
 * S1 — Write TC Show .threshold-game.json (mirrors MORE → EXPORT for tc-show edition).
 *
 * Usage:
 *   npm run tc:export:manifest
 *   node scripts/tc-export-manifest.cjs --out exports/tc-show.threshold-game.json
 */
const fs = require('fs');
const path = require('path');
const { ROOT, buildTcManifest, slugify } = require('./tc-export-lib.cjs');

function parseArgs(argv) {
    const args = { out: 'exports/tc-show.threshold-game.json', help: false };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--out' || a === '-o') args.out = argv[++i];
    }
    return args;
}

function printHelp() {
    console.log(`
TC export manifest (Phase S1)

  npm run tc:export:manifest [-- --out exports/tc-show.threshold-game.json]

Options:
  --out, -o   Output path (default: exports/tc-show.threshold-game.json)
  --help, -h  Show this help

Synthesizes .threshold-game.json from on-disk TC assets (no browser EXPORT wizard).
Next: npm run tc:ship or npm run store:prep -- --manifest <file>
`);
}

function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        printHelp();
        return;
    }

    const manifest = buildTcManifest();
    const outPath = path.resolve(ROOT, args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

    const rel = path.relative(ROOT, outPath).replace(/\\/g, '/');
    const inv = manifest.assetRegistry?.inventory || {};
    const mapped = manifest.assetRegistry?.storeAssets?.mappedCount || 0;

    console.log(`\n[tc-export-manifest] ${manifest.game.name}`);
    console.log(`  path: ${rel}`);
    console.log(`  bundleId: ${manifest.branding.bundleId}`);
    console.log(`  inventory: ${inv.objects} obj · ${inv.models} models · ${inv.textures} tex · ${inv.sounds} sfx · ${inv.videos} vid`);
    console.log(`  storeAssets: ${manifest.assetRegistry?.storeAssets?.status} · ${mapped} mapped`);
    console.log(`\nNext:`);
    console.log(`  npm run store:prep -- --manifest ${rel}`);
    console.log(`  npm run tc:ship:verify`);
}

main();