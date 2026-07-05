#!/usr/bin/env node
/**
 * S1 — Verify TC ship outputs: manifest, dist-store/, bundle-index, optional preview HTTP.
 *
 * Usage:
 *   npm run tc:ship:verify
 *   npm run tc:ship:verify -- --preview-smoke
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { ROOT, slugify } = require('./tc-export-lib.cjs');

const STORE_FILES = [
    'privacy-policy.md',
    'credits.md',
    'asset-registry.json',
    'play-in-app-products.json',
    'steam-depot-assets.json',
    'itch-asset-packs.json',
    'collectible-registry.json',
    'app-store-metadata.json',
    'play-console-metadata.json',
    'store-prep.json',
    'store-assets-prep.json',
];

const BUNDLE_PATHS = [
    'bundle/import/tc_run.glb',
    'bundle/textures/tc_run_albedo.png',
    'bundle/video/tc_intro.webm',
    'bundle/bundle-index.json',
];

function parseArgs(argv) {
    const args = {
        manifest: 'exports/tc-show.threshold-game.json',
        previewSmoke: false,
        previewPort: 4173,
        help: false,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--manifest' || a === '-m') args.manifest = argv[++i];
        else if (a === '--preview-smoke') args.previewSmoke = true;
        else if (a === '--preview-port') args.previewPort = Number(argv[++i]);
    }
    return args;
}

function printHelp() {
    console.log(`
TC ship verify (Phase S1)

  npm run tc:ship:verify [-- --preview-smoke]

Options:
  --manifest, -m     Manifest path (default: exports/tc-show.threshold-game.json)
  --preview-smoke    Fetch bundle paths from vite preview (default :4173)
  --preview-port     Preview port (default: 4173)
  --help, -h         Show this help
`);
}

let fail = 0;
function ok(msg) { console.log(`  ✓ ${msg}`); }
function bad(msg) { console.log(`  ✗ ${msg}`); fail += 1; }

function fetchUrl(url, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
        });
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            reject(new Error('timeout'));
        });
    });
}

async function previewSmoke(port) {
    console.log('[tc-ship-verify] preview smoke');
    const hosts = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
    let base = null;
    for (const h of hosts) {
        try {
            const res = await fetchUrl(`${h}/`);
            if (res.status === 200) {
                base = h;
                ok(`preview reachable ${h}`);
                break;
            }
        } catch (_) { /* try next */ }
    }
    if (!base) {
        bad(`preview not reachable on :${port} — run npm run preview`);
        return;
    }

    for (const rel of BUNDLE_PATHS) {
        try {
            const res = await fetchUrl(`${base}/${rel}`);
            if (res.status === 200 && res.body.length > 100) ok(`HTTP ${rel} (${res.body.length} B)`);
            else bad(`HTTP ${rel} status=${res.status} size=${res.body.length}`);
        } catch (e) {
            bad(`HTTP ${rel} — ${e.message}`);
        }
    }
}

function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        printHelp();
        return;
    }

    console.log('[tc-ship-verify] manifest');
    const manifestPath = path.resolve(ROOT, args.manifest);
    if (!fs.existsSync(manifestPath)) {
        bad(`missing ${args.manifest}`);
        console.log(fail ? `\n[tc-ship-verify] FAILED (${fail})` : '\n[tc-ship-verify] PASS');
        process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.format !== 'threshold-game') bad(`format=${manifest.format}`);
    else ok('format=threshold-game');
    if (manifest.tcEdition !== 'tc-show') bad(`tcEdition=${manifest.tcEdition}`);
    else ok('tcEdition=tc-show');
    if (manifest.branding?.bundleId !== 'com.threshold.tc') bad(`bundleId=${manifest.branding?.bundleId}`);
    else ok('bundleId=com.threshold.tc');

    const inv = manifest.assetRegistry?.inventory || {};
    if (inv.objects < 6) bad(`inventory.objects=${inv.objects} (want ≥6)`);
    else ok(`inventory: ${inv.objects} obj · ${inv.models} models · ${inv.textures} tex`);
    const mapped = manifest.assetRegistry?.storeAssets?.mappedCount || 0;
    if (mapped < 10) bad(`mappedCount=${mapped}`);
    else ok(`storeAssets mapped: ${mapped}`);

    const slug = slugify(manifest.game?.name || 'tc-show');
    const storeDir = path.join(ROOT, 'dist-store', slug);
    console.log(`[tc-ship-verify] dist-store/${slug}/`);
    if (!fs.existsSync(storeDir)) {
        bad('dist-store missing — run npm run tc:ship');
    } else {
        STORE_FILES.forEach((f) => {
            const p = path.join(storeDir, f);
            if (!fs.existsSync(p)) bad(`missing ${f}`);
            else ok(f);
        });
        const play = JSON.parse(fs.readFileSync(path.join(storeDir, 'play-in-app-products.json'), 'utf8'));
        if ((play.products || []).length < 10) bad(`play products=${(play.products || []).length}`);
        else ok(`play-in-app-products: ${play.products.length} SKUs`);
    }

    console.log('[tc-ship-verify] bundle-index');
    const bundleIndex = path.join(ROOT, 'dist-pages', 'bundle', 'bundle-index.json');
    if (!fs.existsSync(bundleIndex)) {
        bad('bundle-index.json missing — run npm run bundle:assets');
    } else {
        const idx = JSON.parse(fs.readFileSync(bundleIndex, 'utf8'));
        const tcGlb = (idx.files?.import || []).filter((f) => /tc_.*\.glb$/.test(f));
        const tcTex = (idx.files?.textures || []).filter((f) => /^tc_/.test(path.basename(f)));
        const tcVid = (idx.files?.video || []).filter((f) => /tc_intro/.test(f));
        if (tcGlb.length < 12) bad(`bundle GLBs=${tcGlb.length}`);
        else ok(`${tcGlb.length} TC GLBs in bundle`);
        if (tcTex.length < 5) bad(`bundle textures=${tcTex.length}`);
        else ok(`${tcTex.length} TC textures in bundle`);
        if (tcVid.length < 1) bad('bundle missing tc_intro');
        else ok(`${tcVid.length} TC video(s) in bundle`);
    }

    BUNDLE_PATHS.forEach((rel) => {
        const disk = path.join(ROOT, 'dist-pages', rel.replace(/^bundle\//, 'bundle/'));
        if (!fs.existsSync(disk)) bad(`disk missing ${rel}`);
        else ok(`disk ${rel}`);
    });

    const finish = (code) => {
        console.log(code ? `\n[tc-ship-verify] FAILED (${fail})` : '\n[tc-ship-verify] PASS');
        process.exit(code);
    };

    if (args.previewSmoke) {
        previewSmoke(args.previewPort).then(() => finish(fail ? 1 : 0));
    } else {
        console.log('\nTip: npm run tc:ship:verify -- --preview-smoke (preview on :4173 OK)');
        finish(fail ? 1 : 0);
    }
}

main();