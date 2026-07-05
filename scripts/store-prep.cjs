#!/usr/bin/env node
/**
 * Phase L — Prepare store submission assets from a .threshold-game.json manifest.
 *
 * Usage:
 *   npm run store:prep -- --manifest my-game.threshold-game.json
 *   npm run store:prep -- --manifest my-game.threshold-game.json --contact you@example.com
 */
const {
    loadManifest,
    applyNativeAppConfig,
    generateStoreBundle,
    printChecklist,
} = require('./store-release-lib.cjs');

function parseArgs(argv) {
    const args = {
        manifest: null,
        out: null,
        contact: null,
        support: null,
        privacyUrl: null,
        help: false,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--manifest' || a === '-m') args.manifest = argv[++i];
        else if (a === '--out' || a === '-o') args.out = argv[++i];
        else if (a === '--contact') args.contact = argv[++i];
        else if (a === '--support') args.support = argv[++i];
        else if (a === '--privacy-url') args.privacyUrl = argv[++i];
    }
    return args;
}

function printHelp() {
    console.log(`
Threshold store prep (Phase L)

  npm run store:prep -- --manifest <game>.threshold-game.json [options]

Options:
  --manifest, -m   Path to exported .threshold-game.json (required)
  --out, -o        Output directory (default: dist-store/<game-slug>/)
  --contact        Contact email for privacy policy / store listings
  --support        Support URL for store metadata
  --privacy-url    Hosted privacy policy URL (for store forms)
  --help, -h       Show this help

Writes:
  dist-store/<slug>/privacy-policy.md
  dist-store/<slug>/app-store-metadata.json
  dist-store/<slug>/play-console-metadata.json
  dist-store/<slug>/store-prep.json
  config/native-app.json + updates capacitor.config.json appId/appName
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
    applyNativeAppConfig(manifest, {
        sourceManifest: args.manifest,
        contactEmail: args.contact,
        supportUrl: args.support,
        privacyPolicyUrl: args.privacyUrl,
    });

    const prep = generateStoreBundle(manifest, {
        out: args.out,
        contactEmail: args.contact,
        supportUrl: args.support,
        privacyPolicyUrl: args.privacyUrl,
        sourceManifest: args.manifest,
    });

    printChecklist(prep);
    console.log('Next commands:');
    prep.nextSteps.forEach((s) => console.log(`  ${s}`));
}

main();