#!/usr/bin/env node
/**
 * Sprint U — store/native packaging verify pass
 *
 * Usage:
 *   npm run store:verify
 *   npm run store:verify -- --skip-tc-ship
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
    const args = {
        skipBuild: false,
        skipTcShip: false,
        skipGraphics: false,
        manifest: 'exports/tc-show.threshold-game.json',
        contact: 'verify@threshold.local',
        help: false,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--skip-build') args.skipBuild = true;
        else if (a === '--skip-tc-ship') args.skipTcShip = true;
        else if (a === '--skip-graphics') args.skipGraphics = true;
        else if (a === '--manifest' || a === '-m') args.manifest = argv[++i];
        else if (a === '--contact') args.contact = argv[++i];
    }
    return args;
}

function run(cmd, label) {
    console.log(`\n[store-verify] ${label}`);
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
}

function checkFile(rel, label) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) throw new Error(`missing ${label}: ${rel}`);
    console.log(`  ✓ ${label}`);
}

function checkChunkPaths() {
    const html = fs.readFileSync(path.join(ROOT, 'dist-pages', 'index.html'), 'utf8');
    const assetsDir = path.join(ROOT, 'dist-pages', 'assets');
    const jsRefs = [...html.matchAll(/assets\/[^"']+\.js/g)].map((m) => m[0]);
    if (!jsRefs.length) throw new Error('no JS chunk refs in index.html');
    jsRefs.forEach((ref) => {
        const p = path.join(ROOT, 'dist-pages', ref);
        if (!fs.existsSync(p)) throw new Error(`chunk missing: ${ref}`);
    });
    const entry = jsRefs.find((r) => r.includes('threshold.js'));
    if (!entry) throw new Error('threshold.js entry not in index.html');
    const lazy = jsRefs.filter((r) => r.includes('app-engine') || r.includes('app-compiler'));
    if (!lazy.length) throw new Error('expected lazy app chunks in index.html preload');
    console.log(`  ✓ ${jsRefs.length} chunk refs resolve on disk`);
    console.log(`  ✓ entry + lazy chunks present`);
}

function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        console.log(`
Sprint U store verify

  npm run store:verify [options]

Options:
  --skip-build       Skip vite build
  --skip-tc-ship     Skip tc:ship (run store steps only)
  --skip-graphics    Skip export:graphics windows
  --manifest, -m     Game manifest (default: exports/tc-show.threshold-game.json)
  --contact          Email for store:prep
`);
        return;
    }

    const started = Date.now();
    console.log('[store-verify] Sprint U — store/native packaging verify\n');

    run('npm run controls:verify', 'controls:verify');

    if (!args.skipBuild) run('npm run build', 'build');
    else if (!fs.existsSync(path.join(ROOT, 'dist-pages', 'index.html'))) {
        throw new Error('dist-pages missing — run npm run build');
    }

    console.log('\n[store-verify] chunk path smoke');
    checkChunkPaths();

    run('npm run tc:verify', 'tc:verify');

    if (!args.skipTcShip) {
        run(`npm run tc:ship -- --skip-tc-build --skip-build --manifest "${args.manifest}"`, 'tc:ship (bundle + manifest + store:prep)');
    }

    const manifestPath = path.join(ROOT, args.manifest);
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`manifest missing: ${args.manifest}`);
    }

    run(`npm run store:assets -- --manifest "${args.manifest}"`, 'store:assets');

    if (!args.skipGraphics) {
        run('npm run build:electron', 'build:electron (native-relative chunk paths)');
        const electronHtml = fs.readFileSync(path.join(ROOT, 'dist-pages', 'index.html'), 'utf8');
        if (electronHtml.includes('src="/threshold/')) {
            throw new Error('electron build still has GitHub Pages absolute paths');
        }
        if (!electronHtml.includes('src="./assets/threshold.js"') && !electronHtml.includes('src="assets/threshold.js"')) {
            throw new Error('electron build missing relative threshold.js entry');
        }
        console.log('  ✓ electron build uses relative chunk paths');
        run(`npm run export:graphics -- --profile windows --manifest "${args.manifest}"`, 'export:graphics windows');
    }

    const slug = 'tc-show';
    const storeDir = path.join(ROOT, 'dist-store', slug);
    if (fs.existsSync(storeDir)) {
        checkFile(path.join('dist-store', slug, 'store-prep.json'), 'store-prep.json');
        checkFile(path.join('dist-store', slug, 'privacy-policy.md'), 'privacy-policy.md');
        checkFile(path.join('dist-store', slug, 'asset-registry.json'), 'asset-registry.json');
    }

    const winExport = path.join(ROOT, 'dist-export', 'windows');
    if (!args.skipGraphics && fs.existsSync(winExport)) {
        console.log('  ✓ dist-export/windows exists');
    }

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`\n[store-verify] PASSED (${elapsed}s)`);
    console.log('[store-verify] Blockers (manual): iOS archive, Play upload, Steam partner, CSC_LINK signing\n');
}

try {
    main();
} catch (e) {
    console.error(`\n[store-verify] FAILED: ${e.message || e}\n`);
    process.exit(1);
}