#!/usr/bin/env node
/**
 * Copy Colab (or any) PBR PNGs into textures/ using Engine naming.
 *
 *   npm run colab:import -- --zip ~/Downloads/stone_block_threshold_pbr.zip
 *   npm run colab:import -- --dir ./inbox --name "Mat Wood Crate"
 *   node scripts/colab-asset-import.cjs --dir ./inbox --dry-run --no-hilod
 *
 * Prefers threshold-asset.json (objectName + slug).
 * HILOD is ON by default (--no-hilod to skip). Pings textures:watch when it is up.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TEX = path.join(ROOT, 'textures');
const PUB = path.join(ROOT, 'public', 'bundle', 'textures');
const IMP = path.join(ROOT, 'import');
const SLOTS = ['albedo', 'roughness', 'normal', 'metalness'];

function slugify(name = '') {
    return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'object';
}

function titleFromSlug(slug) {
    return String(slug).split('_').filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Object';
}

function arg(flag) {
    const i = process.argv.indexOf(flag);
    if (i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith('-')) {
        return process.argv[i + 1];
    }
    return null;
}

const WATCH_URL = process.env.VITE_CREATIVE_WATCH_URL || 'http://127.0.0.1:3927';

function usage() {
    console.log(`colab-asset-import — copy Threshold-named PBR maps into textures/

  npm run colab:import -- --zip <file.zip> [--name "Stone Block"]
  npm run colab:import -- --dir <folder>   [--name "Stone Block"]
  node scripts/colab-asset-import.cjs --zip pack.zip --dry-run --no-hilod --no-bundle

HILOD runs by default. --no-hilod skips tiers. Name is optional when the pack has threshold-asset.json.
`);
}

async function pingWatch() {
    const base = String(WATCH_URL).replace(/\/$/, '');
    try {
        const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(800) });
        if (!health.ok) return false;
        try {
            await fetch(`${base}/gimp-sync`, { method: 'POST', signal: AbortSignal.timeout(800) });
        } catch { /* watch up but sync optional */ }
        return true;
    } catch {
        return false;
    }
}

function runHilod(dest) {
    const r = spawnSync(process.execPath, [path.join(__dirname, 'generate-hilod-tiers.cjs'), dest], {
        cwd: ROOT,
        stdio: 'inherit',
    });
    if (r.status) console.warn('  hilod exited', r.status, '— master PNG is still in textures/');
    return r.status === 0;
}

function isZip(p) {
    return !!p && /\.zip$/i.test(p) && fs.existsSync(p) && fs.statSync(p).isFile();
}

function extractZip(zipPath) {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'th-colab-'));
    const tar = spawnSync('tar', ['-xf', zipPath, '-C', dest], { encoding: 'utf8' });
    if (tar.status === 0) return dest;
    const ps = spawnSync('powershell', [
        '-NoProfile', '-Command',
        `Expand-Archive -LiteralPath ${JSON.stringify(zipPath)} -DestinationPath ${JSON.stringify(dest)} -Force`,
    ], { encoding: 'utf8' });
    if (ps.status === 0) return dest;
    console.error(`unzip failed: ${(tar.stderr || ps.stderr || '').trim()}`);
    process.exit(1);
}

function findPackRoot(dir) {
    const hasMan = fs.existsSync(path.join(dir, 'threshold-asset.json'));
    const hasAlb = fs.existsSync(dir) && fs.readdirSync(dir).some((f) => /_albedo\.png$/i.test(f));
    if (hasMan || hasAlb) return dir;
    const subs = fs.existsSync(dir)
        ? fs.readdirSync(dir, { withFileTypes: true })
            .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== '__MACOSX')
        : [];
    if (subs.length === 1) return findPackRoot(path.join(dir, subs[0].name));
    return dir;
}

function readManifest(dir) {
    const p = path.join(dir, 'threshold-asset.json');
    if (!fs.existsSync(p)) return null;
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
        return null;
    }
}

function findSlot(dir, slug, objectName, slot) {
    const names = [
        `${slug}_${slot}.png`,
        `${slugify(objectName)}_${slot}.png`,
        `${objectName}_${slot}.png`,
    ];
    for (const n of names) {
        const p = path.join(dir, n);
        if (fs.existsSync(p)) return p;
        const up = path.join(dir, n.replace(/\.png$/i, '.PNG'));
        if (fs.existsSync(up)) return up;
    }
    return null;
}

function findGlb(dir, slug) {
    for (const n of [`${slug}.glb`, `${slug}.gltf`]) {
        const p = path.join(dir, n);
        if (fs.existsSync(p)) return p;
    }
    return null;
}

async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        usage();
        return;
    }
    const dry = process.argv.includes('--dry-run');
    const noHilod = process.argv.includes('--no-hilod') || process.argv.includes('--hilod=false');
    const wantHilod = !noHilod;
    const noBundle = process.argv.includes('--no-bundle');
    let srcArg = arg('--zip') || arg('--dir') || arg('-d');
    const nameFlag = arg('--name') || arg('-n');

    if (!srcArg) {
        usage();
        console.error('need --zip <file.zip> or --dir <folder>');
        process.exit(1);
    }
    srcArg = path.resolve(srcArg);
    if (!fs.existsSync(srcArg)) {
        console.error(`missing ${srcArg}`);
        process.exit(1);
    }

    let workDir = srcArg;
    let tmp = null;
    if (isZip(srcArg) || arg('--zip')) {
        if (!isZip(srcArg)) {
            console.error(`not a zip: ${srcArg}`);
            process.exit(1);
        }
        tmp = extractZip(srcArg);
        workDir = findPackRoot(tmp);
    } else if (fs.statSync(srcArg).isDirectory()) {
        workDir = findPackRoot(srcArg);
    } else {
        console.error(`--dir must be a folder (or pass --zip): ${srcArg}`);
        process.exit(1);
    }

    const man = readManifest(workDir);
    const objectName = (nameFlag || man?.objectName || '').trim();
    let slug = man?.slug ? slugify(man.slug) : '';
    if (!objectName && !slug) {
        const alb = fs.readdirSync(workDir).find((f) => /_albedo\.png$/i.test(f));
        if (alb) slug = alb.replace(/_albedo\.png$/i, '');
    }
    if (!slug && objectName) slug = slugify(objectName);
    const displayName = objectName || (slug ? titleFromSlug(slug) : '');
    if (!slug || !displayName) {
        console.error('need --name "Object Name" or a threshold-asset.json / *_albedo.png in the pack');
        process.exit(1);
    }

    console.log(`colab-asset-import  name=${displayName}  slug=${slug}${dry ? '  (dry-run)' : ''}${wantHilod ? '  hilod=on' : '  hilod=off'}`);
    if (man?.objectName && nameFlag && slugify(man.objectName) !== slugify(nameFlag)) {
        console.warn(`  warn: --name ${JSON.stringify(nameFlag)} ≠ pack ${JSON.stringify(man.objectName)}`);
    }

    fs.mkdirSync(TEX, { recursive: true });
    let copied = 0;
    for (const slot of SLOTS) {
        const src = findSlot(workDir, slug, displayName, slot);
        if (!src) {
            if (slot === 'albedo') {
                console.error(`need ${slug}_albedo.png in ${workDir}`);
                process.exit(1);
            }
            continue;
        }
        const destName = `${slug}_${slot}.png`;
        const dest = path.join(TEX, destName);
        console.log(`  ${dry ? 'would copy' : 'copy'} ${destName}${dry && wantHilod ? ' + hilod' : ''}`);
        if (!dry) {
            fs.copyFileSync(src, dest);
            if (!noBundle) {
                const pub = path.join(PUB, destName);
                fs.mkdirSync(path.dirname(pub), { recursive: true });
                try { fs.copyFileSync(dest, pub); } catch { /* optional bundle */ }
            }
            if (wantHilod) runHilod(dest);
        }
        copied += 1;
    }

    const glb = findGlb(workDir, slug);
    if (glb) {
        const destGlb = path.join(IMP, path.basename(glb));
        console.log(`  ${dry ? 'would copy' : 'copy'} import/${path.basename(glb)}`);
        if (!dry) {
            fs.mkdirSync(IMP, { recursive: true });
            fs.copyFileSync(glb, destGlb);
        }
    }

    if (tmp) {
        try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* tmp */ }
    }

    console.log(`${dry ? 'would copy' : 'copied'} ${copied} map(s) → textures/${slug}_*.png`);
    if (wantHilod) {
        console.log(dry
            ? 'would run HILOD (_1k / _2k) on those maps'
            : 'HILOD: _1k / _2k written next to the masters (or skipped if sharp/ffmpeg missing)');
    }
    console.log(`Engine Name must be exactly: ${displayName}`);
    if (dry) {
        console.log('Then: keep npm run textures:watch or reload the Engine Art paths.');
    } else {
        const watchUp = await pingWatch();
        if (watchUp) {
            console.log('creative watch is up — Engine should hot-reload. If not: GIMP SYNC / reload Art paths.');
        } else {
            console.log('Watch not running. Start `npm run textures:watch` in another terminal, or reload the Engine.');
        }
    }
}

main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
});
