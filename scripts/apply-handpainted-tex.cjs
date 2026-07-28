#!/usr/bin/env node
/**
 * Apply hand-painted albedo masters → full PBR slots + HILOD + WebP + manifest.
 * Usage: node scripts/apply-handpainted-tex.cjs [--src-dir path]
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execFileSync } = require('child_process');
const { mergeTcEntries, loadManifest, GIMP_MANIFEST, TC_LIC, REALISM } = require('./tc-gen-tex.cjs');

const ROOT = path.join(__dirname, '..');
const TEX = path.join(ROOT, 'textures');
const PUB = path.join(ROOT, 'public', 'bundle', 'textures');
const CFG = path.join(ROOT, 'config', 'default-textures.json');
const MASTER = 2048;

/** Map source JPG → slug (session hand-painted set) */
const DEFAULT_MAP = {
    '1.jpg': 'starter_ground',
    '2.jpg': 'starter_terminal',
    '3.jpg': 'starter_dirt',
    '4.jpg': 'starter_wood',
    '5.jpg': 'starter_asphalt',
    '6.jpg': 'starter_brick',
    '7.jpg': 'starter_copper',
    '8.jpg': 'starter_fabric',
    '9.jpg': 'starter_metal_mat',
    '10.jpg': 'starter_plaster',
    '11.jpg': 'starter_grass',
    '12.jpg': 'starter_gravel',
};

const METAL_SLUGS = new Set(['starter_metal_mat', 'starter_copper', 'starter_terminal']);

function parseArgs() {
    const args = process.argv.slice(2);
    let srcDir = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--src-dir' && args[i + 1]) srcDir = args[++i];
    }
    if (!srcDir) {
        // Prefer session images folder if present
        const sess = path.join(
            process.env.USERPROFILE || '',
            '.grok',
            'sessions',
            'C%3A%5CWindows%5CSystem32',
            '019f4aef-8ed0-78a3-98e9-e265c915ebec',
            'images',
        );
        if (fs.existsSync(path.join(sess, '1.jpg'))) srcDir = sess;
        else srcDir = path.join(ROOT, 'textures', '_handpainted_src');
    }
    return { srcDir };
}

/** Offset-blend for softer tiling (reduces hard seam on AI tiles). */
async function makeSeamlessish(inputPath, size) {
    const half = size / 2;
    const base = await sharp(inputPath)
        .resize(size, size, { fit: 'cover', position: 'centre' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Cross-offset blend: average with 50% shifted version along both axes
    const { data, info } = base;
    const w = info.width;
    const h = info.height;
    const ch = info.channels;
    const out = Buffer.alloc(data.length);
    const ox = half | 0;
    const oy = half | 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * ch;
            const sx = (x + ox) % w;
            const sy = (y + oy) % h;
            const j = (sy * w + sx) * ch;
            // Distance to edge for blend weight (stronger blend near edges)
            const edge = Math.min(x, y, w - 1 - x, h - 1 - y) / (size * 0.12);
            const t = Math.max(0, Math.min(1, 1 - edge)); // 1 near edge, 0 center
            const a = 0.5 + 0.5 * (1 - t); // center keep base; edges mix 50/50
            for (let c = 0; c < 3; c++) {
                out[i + c] = Math.round(data[i + c] * a + data[j + c] * (1 - a));
            }
            if (ch > 3) out[i + 3] = 255;
        }
    }
    return sharp(out, { raw: { width: w, height: h, channels: ch } }).png();
}

async function luminanceRaw(pngSharp) {
    const { data, info } = await pngSharp.clone().raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const ch = info.channels;
    const lum = new Float32Array(w * h);
    for (let i = 0, p = 0; i < lum.length; i++, p += ch) {
        lum[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
    }
    return { lum, w, h, rgb: data, ch };
}

async function writeNormalFromLum(lum, w, h, outPath, strength = 2.2) {
    const out = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            const l = lum[i];
            const lx = lum[y * w + ((x + 1) % w)];
            const ly = lum[((y + 1) % h) * w + x];
            let dx = (l - lx) * strength;
            let dy = (l - ly) * strength;
            // Encode tangent-space normal
            let nx = -dx;
            let ny = -dy;
            let nz = 1;
            const len = Math.hypot(nx, ny, nz) || 1;
            nx /= len;
            ny /= len;
            nz /= len;
            const o = i * 3;
            out[o] = Math.max(0, Math.min(255, Math.round((nx * 0.5 + 0.5) * 255)));
            out[o + 1] = Math.max(0, Math.min(255, Math.round((ny * 0.5 + 0.5) * 255)));
            out[o + 2] = Math.max(0, Math.min(255, Math.round((nz * 0.5 + 0.5) * 255)));
        }
    }
    await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toFile(outPath);
}

async function writeRoughnessFromLum(lum, w, h, outPath, invert = true, bias = 0.55, contrast = 0.35) {
    const out = Buffer.alloc(w * h * 3);
    for (let i = 0; i < lum.length; i++) {
        let v = invert ? 1 - lum[i] : lum[i];
        v = bias + (v - 0.5) * contrast;
        v = Math.max(0.08, Math.min(0.95, v));
        const g = Math.round(v * 255);
        const o = i * 3;
        out[o] = out[o + 1] = out[o + 2] = g;
    }
    await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toFile(outPath);
}

async function writeMetalnessFromLum(lum, w, h, outPath, base = 0.75) {
    const out = Buffer.alloc(w * h * 3);
    for (let i = 0; i < lum.length; i++) {
        // Brighter → slightly more metal; patina/dark → less
        let v = base + (lum[i] - 0.45) * 0.5;
        v = Math.max(0.15, Math.min(0.98, v));
        const g = Math.round(v * 255);
        const o = i * 3;
        out[o] = out[o + 1] = out[o + 2] = g;
    }
    await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toFile(outPath);
}

async function writeTiers(masterPath, baseName, outDir) {
    const files = [];
    // Master without suffix
    const masterOut = path.join(outDir, `${baseName}.png`);
    await sharp(masterPath).png().toFile(masterOut);
    files.push(`${baseName}.png`);

    for (const [suffix, px] of [['_1k', 1024], ['_2k', 2048]]) {
        const name = `${baseName}${suffix}.png`;
        await sharp(masterPath).resize(px, px, { fit: 'fill', kernel: 'lanczos3' }).png().toFile(path.join(outDir, name));
        files.push(name);
    }
    return files;
}

function compressWebp(pngPath) {
    const compressOne = path.join(__dirname, 'compress-one.cjs');
    try {
        execFileSync(process.execPath, [compressOne, pngPath], {
            cwd: ROOT,
            stdio: 'pipe',
            timeout: 120000,
        });
    } catch (e) {
        console.warn('[webp]', path.basename(pngPath), e.message || e);
    }
}

async function processSlug(slug, srcJpg, assetCfg) {
    const slots = assetCfg?.slots || ['albedo', 'roughness', 'normal'];
    const tmpDir = path.join(TEX, '_tmp_hp');
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(TEX, { recursive: true });
    fs.mkdirSync(PUB, { recursive: true });

    const seamlessPng = path.join(tmpDir, `${slug}_albedo_master.png`);
    await (await makeSeamlessish(srcJpg, MASTER)).toFile(seamlessPng);

    const { lum, w, h } = await luminanceRaw(sharp(seamlessPng));
    const produced = [];

    // Albedo
    if (slots.includes('albedo')) {
        const files = await writeTiers(seamlessPng, `${slug}_albedo`, TEX);
        produced.push(...files.map((f) => ({ slot: 'albedo', file: f })));
    }

    // Roughness
    if (slots.includes('roughness')) {
        const roughTmp = path.join(tmpDir, `${slug}_rough.png`);
        const inv = !METAL_SLUGS.has(slug); // metals: bright = smoother
        await writeRoughnessFromLum(lum, w, h, roughTmp, inv, METAL_SLUGS.has(slug) ? 0.4 : 0.58, 0.4);
        const files = await writeTiers(roughTmp, `${slug}_roughness`, TEX);
        produced.push(...files.map((f) => ({ slot: 'roughness', file: f })));
    }

    // Normal
    if (slots.includes('normal')) {
        const nTmp = path.join(tmpDir, `${slug}_n.png`);
        await writeNormalFromLum(lum, w, h, nTmp, METAL_SLUGS.has(slug) ? 1.4 : 2.4);
        const files = await writeTiers(nTmp, `${slug}_normal`, TEX);
        produced.push(...files.map((f) => ({ slot: 'normal', file: f })));
    }

    // Metalness
    if (slots.includes('metalness')) {
        const mTmp = path.join(tmpDir, `${slug}_m.png`);
        const base = slug === 'starter_copper' ? 0.7 : slug === 'starter_terminal' ? 0.45 : 0.82;
        await writeMetalnessFromLum(lum, w, h, mTmp, base);
        const files = await writeTiers(mTmp, `${slug}_metalness`, TEX);
        produced.push(...files.map((f) => ({ slot: 'metalness', file: f })));
    }

    // WebP + public copy
    for (const { file } of produced) {
        const src = path.join(TEX, file);
        fs.copyFileSync(src, path.join(PUB, file));
        compressWebp(src);
        const webp = file.replace(/\.png$/i, '.webp');
        const webpSrc = path.join(TEX, webp);
        if (fs.existsSync(webpSrc)) fs.copyFileSync(webpSrc, path.join(PUB, webp));
    }

    console.log(`[handpainted] ${slug} → ${produced.length} files`);
    return produced;
}

function buildManifestEntries(slug, objectName, produced) {
    const bySlot = {};
    for (const p of produced) {
        if (!bySlot[p.slot]) bySlot[p.slot] = [];
        bySlot[p.slot].push(p.file);
    }
    const entries = [];
    for (const [slot, files] of Object.entries(bySlot)) {
        const master = files.find((f) => f === `${slug}_${slot}.png`) || files[0];
        const entry = {
            id: `${slug}_${slot}`,
            objectName,
            slot,
            file: master,
            path: `textures/${master}`,
            tcEd: 'tc-lite',
            license: TC_LIC,
            realism: REALISM,
            source: 'handpainted-10.15.7',
            variants: [],
        };
        for (const f of files) {
            const m = f.match(/_(1k|2k)\.png$/i);
            if (m) {
                entry.variants.push({
                    suffix: `_${m[1]}`,
                    file: f,
                    path: `textures/${f}`,
                    maxPx: m[1] === '1k' ? 1024 : 2048,
                });
            }
        }
        entries.push(entry);
    }
    return entries;
}

async function main() {
    const { srcDir } = parseArgs();
    const cfg = JSON.parse(fs.readFileSync(CFG, 'utf8'));
    const bySlug = Object.fromEntries((cfg.assets || []).map((a) => [a.slug, a]));

    if (!fs.existsSync(srcDir)) {
        console.error('Source dir missing:', srcDir);
        process.exit(1);
    }

    // Also accept textures/_handpainted_src/starter_*.jpg
    const map = { ...DEFAULT_MAP };
    for (const a of cfg.assets || []) {
        const alt = path.join(srcDir, `${a.slug}.jpg`);
        const altPng = path.join(srcDir, `${a.slug}.png`);
        if (fs.existsSync(alt)) map[`${a.slug}.jpg`] = a.slug;
        if (fs.existsSync(altPng)) map[`${a.slug}.png`] = a.slug;
    }

    const allEntries = [];
    let count = 0;
    for (const [file, slug] of Object.entries(map)) {
        const src = path.join(srcDir, file);
        if (!fs.existsSync(src)) {
            console.warn('[skip missing]', file);
            continue;
        }
        const asset = bySlug[slug];
        if (!asset) {
            console.warn('[skip unknown slug]', slug);
            continue;
        }
        const produced = await processSlug(slug, src, asset);
        allEntries.push(...buildManifestEntries(slug, asset.objectName, produced));
        count += 1;
    }

    const man = mergeTcEntries(loadManifest(), allEntries);
    man.format = GIMP_MANIFEST;
    man.updated = new Date().toISOString();
    man.handpainted = true;
    man.handpaintedNote = 'Albedo from painted masters; normal/roughness/metalness derived (10.15.7)';
    fs.writeFileSync(path.join(TEX, 'threshold_manifest.json'), JSON.stringify(man, null, 2));
    fs.copyFileSync(path.join(TEX, 'threshold_manifest.json'), path.join(PUB, 'threshold_manifest.json'));

    // Bump default-textures note
    cfg.note = 'Starter PBR library — hand-painted albedos (10.15.7) + derived N/R/M + HILOD 1k/2k + WebP';
    cfg.version = 4;
    cfg.masterPx = MASTER;
    cfg.handpainted = true;
    fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2) + '\n');

    console.log(`\nDone: ${count} materials · ${allEntries.length} manifest slots`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
