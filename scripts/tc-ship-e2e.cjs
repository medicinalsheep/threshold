#!/usr/bin/env node
/**
 * S1 — TC Show export E2E: build → bundle → manifest → store:prep
 *
 * Usage:
 *   npm run tc:ship
 *   npm run tc:ship -- --skip-build --preview-smoke
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ROOT, slugify } = require('./tc-export-lib.cjs');
const { loadManifest } = require('./store-release-lib.cjs');

function parseArgs(argv) {
    const args = {
        skipBuild: false,
        skipTcBuild: false,
        skipVerify: false,
        skipStore: false,
        packageWin: false,
        previewSmoke: false,
        manifest: 'exports/tc-show.threshold-game.json',
        contact: null,
        help: false,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--skip-build') args.skipBuild = true;
        else if (a === '--skip-tc-build') args.skipTcBuild = true;
        else if (a === '--skip-verify') args.skipVerify = true;
        else if (a === '--skip-store') args.skipStore = true;
        else if (a === '--package-win') args.packageWin = true;
        else if (a === '--preview-smoke') args.previewSmoke = true;
        else if (a === '--manifest' || a === '-m') args.manifest = argv[++i];
        else if (a === '--contact') args.contact = argv[++i];
    }
    return args;
}

function printHelp() {
    console.log(`
TC ship E2E (Phase S1)

  npm run tc:ship [options]

Pipeline:
  tc:build → tc:verify → build → bundle:assets → tc:export:manifest → store:prep

Options:
  --skip-tc-build    Skip npm run tc:build
  --skip-build       Skip vite build (requires dist-pages/)
  --skip-verify      Skip tc:verify
  --skip-store       Skip store:prep (manifest only)
  --package-win      Also run package:win (slow — Electron builder)
  --preview-smoke    HTTP-check bundle paths on localhost:4173 after ship
  --manifest, -m     Manifest path (default: exports/tc-show.threshold-game.json)
  --contact          Contact email for store:prep privacy policy
  --help, -h         Show this help
`);
}

function run(cmd, label) {
    console.log(`\n[tc-ship] ${label}`);
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
}

function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        printHelp();
        return;
    }

    const started = Date.now();
    console.log('[tc-ship] TC Show export E2E');

    if (!args.skipTcBuild) run('npm run tc:build', 'tc:build');
    if (!args.skipVerify) run('npm run tc:verify', 'tc:verify');

    if (!args.skipBuild) {
        run('npm run build', 'vite build');
    } else if (!fs.existsSync(path.join(ROOT, 'dist-pages', 'index.html'))) {
        console.error('[tc-ship] dist-pages missing — remove --skip-build or run npm run build');
        process.exit(1);
    }

    run('npm run bundle:assets', 'bundle:assets');

    const manifestRel = args.manifest.replace(/\\/g, '/');
    run(`node scripts/tc-export-manifest.cjs --out ${manifestRel}`, 'export manifest');

    if (!args.skipStore) {
        const contactFlag = args.contact ? ` --contact ${args.contact}` : '';
        run(`npm run store:prep -- --manifest ${manifestRel}${contactFlag}`, 'store:prep');
    }

    if (args.packageWin) {
        run('npm run package:win', 'package:win');
    }

    const manifest = loadManifest(args.manifest);
    const slug = slugify(manifest.game?.name || 'tc-show');
    const storeDir = path.join(ROOT, 'dist-store', slug);
    const prepPath = path.join(storeDir, 'store-prep.json');

    console.log('\n[tc-ship] complete');
    console.log(`  manifest: ${manifestRel}`);
    if (fs.existsSync(prepPath)) {
        const prep = JSON.parse(fs.readFileSync(prepPath, 'utf8'));
        console.log(`  store: ${prep.outDir}/ (${Object.keys(prep.checklist || {}).length} targets)`);
    }
    console.log(`  elapsed: ${((Date.now() - started) / 1000).toFixed(1)}s`);

    if (args.previewSmoke) {
        run(`node scripts/tc-ship-verify.cjs --manifest ${manifestRel} --preview-smoke`, 'preview smoke');
    } else {
        console.log('\nNext: npm run tc:ship:verify [-- --preview-smoke]');
        console.log('      npm run preview  (if not already running on :4173)');
    }
}

main();