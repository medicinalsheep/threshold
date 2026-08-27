#!/usr/bin/env node
/** Static checks for optional Colab pipeline (no GPU, no Google). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const IMP = path.join(ROOT, 'scripts', 'colab-asset-import.cjs');
let failed = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function fail(m) { console.error(`  ✗ ${m}`); failed += 1; }

function runImport(args) {
    return spawnSync(process.execPath, [IMP, ...args], { cwd: ROOT, encoding: 'utf8' });
}

function cleanup(slug) {
    const suffixes = ['', '_1k', '_2k', '_512'];
    for (const slot of ['albedo', 'roughness', 'normal', 'metalness']) {
        for (const sfx of suffixes) {
            for (const dest of [
                path.join(ROOT, 'textures', `${slug}_${slot}${sfx}.png`),
                path.join(ROOT, 'public', 'bundle', 'textures', `${slug}_${slot}${sfx}.png`),
            ]) {
                try { fs.unlinkSync(dest); } catch { /* leftover */ }
            }
        }
    }
}

console.log('colab-pipeline-verify\n');

const nb = path.join(ROOT, 'colab', 'threshold_pbr_starter.ipynb');
if (!fs.existsSync(nb)) fail('missing starter notebook');
else {
    try {
        const j = JSON.parse(fs.readFileSync(nb, 'utf8'));
        const src = JSON.stringify(j);
        if (j.nbformat >= 4) ok('notebook JSON');
        else fail('notebook nbformat');
        if (src.includes('slugify') && src.includes('_albedo.png') && src.includes('threshold-asset.json')) {
            ok('notebook naming + manifest');
        } else fail('notebook missing slug / albedo / threshold-asset.json');
        if (src.includes('RUN_SD') && src.includes('T4') && src.includes('pick_out')) {
            ok('notebook documents T4 / optional SD / portable OUT');
        } else fail('notebook missing T4/SD/OUT honesty');
        if (src.includes('_metalness.png') && src.includes('family_of')) ok('notebook metalness + family');
        else fail('notebook missing metalness / family');
    } catch (e) {
        fail(`notebook parse: ${e.message}`);
    }
}

const docs = fs.readFileSync(path.join(ROOT, 'docs', 'COLAB_ASSET_PIPELINE.md'), 'utf8');
if (/T4/i.test(docs) && /90/i.test(docs) && /optional/i.test(docs) && /--zip/i.test(docs)) {
    ok('docs mention T4 + idle + optional + zip import');
} else fail('COLAB_ASSET_PIPELINE.md incomplete');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (html.includes('colab-pipeline-optin') && html.includes('data-surface="creator"')) ok('SETUP opt-in is creator-only');
else fail('SETUP Colab UI missing / not gated');

const js = fs.readFileSync(path.join(ROOT, 'src', 'shared', 'colabPipeline.js'), 'utf8');
if (js.includes('Google.colab') && !/oauth|client_secret|googleapis/i.test(js)) ok('no Google auth in SPA module');
else fail('colabPipeline.js auth leak or missing extension link');

const tmp = path.join(ROOT, 'dist-store', 'colab-import-smoke');
fs.mkdirSync(tmp, { recursive: true });
const smokeName = 'Colab Smoke Probe';
const smokeSlug = 'colab_smoke_probe';
fs.writeFileSync(path.join(tmp, `${smokeSlug}_albedo.png`), Buffer.from([137, 80, 78, 71]));
fs.writeFileSync(path.join(tmp, `${smokeSlug}_metalness.png`), Buffer.from([137, 80, 78, 71]));
fs.writeFileSync(path.join(tmp, 'threshold-asset.json'), JSON.stringify({
    schema: 'threshold-asset/v1',
    objectName: smokeName,
    slug: smokeSlug,
    slots: ['albedo', 'metalness'],
}, null, 2));

const r = runImport(['--dir', tmp, '--no-bundle', '--no-hilod']);
const dest = path.join(ROOT, 'textures', `${smokeSlug}_albedo.png`);
const destM = path.join(ROOT, 'textures', `${smokeSlug}_metalness.png`);
if (r.status === 0 && fs.existsSync(dest) && fs.existsSync(destM)) ok('colab-asset-import copies slug maps');
else fail(`import helper failed: ${(r.stderr || r.stdout || '').slice(0, 240)}`);
cleanup(smokeSlug);

const infer = runImport(['--dir', tmp, '--no-bundle', '--no-hilod']);
if (infer.status === 0 && fs.existsSync(dest) && /Colab Smoke Probe/.test(infer.stdout || '')) {
    ok('import infers Engine Name from threshold-asset.json');
} else fail('import did not infer name from manifest');
cleanup(smokeSlug);

const zipDir = fs.mkdtempSync(path.join(os.tmpdir(), 'th-colab-zip-'));
const zipSlug = 'colab_zip_probe';
fs.writeFileSync(path.join(zipDir, `${zipSlug}_albedo.png`), Buffer.from([137, 80, 78, 71]));
fs.writeFileSync(path.join(zipDir, 'threshold-asset.json'), JSON.stringify({
    schema: 'threshold-asset/v1',
    objectName: 'Colab Zip Probe',
    slug: zipSlug,
    slots: ['albedo'],
}, null, 2));
const zipPath = path.join(ROOT, 'dist-store', 'colab-import-smoke', 'colab_zip_probe_threshold_pbr.zip');
const tar = spawnSync('tar', ['-a', '-cf', zipPath, '-C', zipDir, `${zipSlug}_albedo.png`, 'threshold-asset.json'], {
    encoding: 'utf8',
});
if (tar.status !== 0) {
    fail(`could not build smoke zip: ${(tar.stderr || '').slice(0, 200)}`);
} else {
    const z = runImport(['--zip', zipPath, '--no-bundle', '--no-hilod']);
    const zDest = path.join(ROOT, 'textures', `${zipSlug}_albedo.png`);
    if (z.status === 0 && fs.existsSync(zDest) && /Colab Zip Probe/.test(z.stdout || '')) {
        ok('import --zip reads pack and copies maps');
    } else {
        fail(`zip import failed: ${(z.stderr || z.stdout || '').slice(0, 240)}`);
    }
    cleanup(zipSlug);
}

const dry = runImport(['--dir', tmp, '--dry-run']);
if (dry.status === 0 && /would copy/.test(dry.stdout || '') && !fs.existsSync(dest)) {
    ok('import --dry-run does not write textures');
} else fail('dry-run wrote files or failed');
if (dry.status === 0 && /hilod=on/.test(dry.stdout || '') && /would run HILOD/i.test(dry.stdout || '')) {
    ok('import HILOD is on by default');
} else fail('import should default to HILOD (use --no-hilod to skip)');

if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
}
console.log('\ncolab-pipeline-verify — PASS');
