#!/usr/bin/env node
/**
 * Master PNG → HILOD tier PNGs + WebP compression.
 * Run after GIMP export or via textures:watch on save.
 *
 * Usage: node scripts/generate-hilod-tiers.cjs [textures/foo_albedo.png]
 */
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { parseTextureFileName, variantSuffix } = require('./hilod-utils.cjs');
const { HILOD_OUTPUT_TIERS, MASTER_PX } = require('./texture-tier-utils.cjs');

const ROOT = path.join(__dirname, '..');
const TEX = path.join(ROOT, 'textures');
const PUB = path.join(ROOT, 'public', 'bundle', 'textures');
const MAN = path.join(TEX, 'threshold_manifest.json');

let _sharp = null;

function loadSharp() {
    if (_sharp !== null) return _sharp;
    try {
        _sharp = require('sharp');
    } catch {
        _sharp = false;
    }
    return _sharp;
}

function hasFfmpeg() {
    try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

async function resizePng(srcPath, destPath, px) {
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    const sharp = loadSharp();
    if (sharp) {
        await sharp(srcPath)
            .resize(px, px, { fit: 'inside', withoutEnlargement: true })
            .png()
            .toFile(destPath);
        return fs.existsSync(destPath);
    }
    if (hasFfmpeg()) {
        const cmd = `ffmpeg -y -i "${srcPath}" -vf "scale='min(${px},iw)':'min(${px},ih)':force_original_aspect_ratio=decrease" "${destPath}"`;
        execSync(cmd, { stdio: 'pipe', shell: true });
        return fs.existsSync(destPath);
    }
    return false;
}

function mirrorToBundle(relPath) {
    const src = path.join(ROOT, relPath);
    const dest = path.join(ROOT, 'public', 'bundle', relPath);
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
        fs.copyFileSync(src, dest);
    } catch { /* optional */ }
}

function compressWebp(pngPath) {
    const script = path.join(__dirname, 'compress-one.cjs');
    spawn(process.execPath, [script, pngPath], { stdio: 'ignore', cwd: ROOT }).unref();
}

function baseStem(fileName) {
    const parsed = parseTextureFileName(fileName);
    if (!parsed) return null;
    return `${parsed.slug}_${parsed.slot}`;
}

function tierFileName(stem, suffix) {
    return `${stem}${suffix}.png`;
}

function pickMasterPath(absPath) {
    const fileName = path.basename(absPath);
    const parsed = parseTextureFileName(fileName);
    if (!parsed) return null;

    const stem = `${parsed.slug}_${parsed.slot}`;
    const dir = path.dirname(absPath);

    if (!parsed.hilod) {
        return { masterPath: absPath, stem, dir };
    }

    const candidates = [
        path.join(dir, `${stem}.png`),
        path.join(dir, `${stem}_2k.png`),
        path.join(dir, `${stem}_4k.png`),
        absPath,
    ];
    let best = absPath;
    let bestPx = 0;
    for (const c of candidates) {
        if (!fs.existsSync(c)) continue;
        try {
            const sharp = loadSharp();
            if (sharp) {
                const meta = sharp(c).metadata();
                // sync peek via ffprobe fallback below
            }
        } catch { /* continue */ }
        const stat = fs.statSync(c);
        if (stat.size > bestPx) {
            bestPx = stat.size;
            best = c;
        }
    }
    return { masterPath: best, stem, dir };
}

async function syncManifestVariants(stem, tiers) {
    if (!fs.existsSync(MAN)) return;
    const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
    let touched = false;
    for (const entry of man.textures || []) {
        const entryStem = entry.file?.replace(/\.png$/i, '').replace(/_(1k|2k|4k)$/i, '');
        if (entryStem !== stem) continue;

        const variants = tiers.map((t) => ({
            suffix: t.suffix,
            file: tierFileName(stem, t.suffix),
            path: `textures/${tierFileName(stem, t.suffix)}`,
            maxPx: t.px,
        }));
        entry.variants = variants;
        if (!entry.file || entry.file.includes('_1k') || entry.file.includes('_2k')) {
            entry.file = `${stem}.png`;
            entry.path = `textures/${stem}.png`;
        }
        touched = true;
    }
    if (touched) {
        man.note = 'Quality-first — 2K masters; _1k/_2k tiers + WebP via textures:hilod / textures:watch';
        fs.writeFileSync(MAN, `${JSON.stringify(man, null, 2)}\n`, 'utf8');
        if (fs.existsSync(path.dirname(path.join(PUB, 'x')))) {
            fs.copyFileSync(MAN, path.join(PUB, 'threshold_manifest.json'));
        }
    }
}

async function generateFromMaster(absPath) {
    if (!fs.existsSync(absPath) || !absPath.toLowerCase().endsWith('.png')) return { ok: false, reason: 'not png' };

    const picked = pickMasterPath(absPath);
    if (!picked) return { ok: false, reason: 'unparsed name' };

    const { masterPath, stem, dir } = picked;
    const generated = [];

    for (const tier of HILOD_OUTPUT_TIERS) {
        const outName = tierFileName(stem, tier.suffix);
        const outPath = path.join(dir, outName);
        const targetPx = Math.min(tier.px, MASTER_PX);
        try {
            if (tier.suffix === '_2k' && fs.existsSync(masterPath) && !variantSuffix(path.basename(masterPath))) {
                fs.copyFileSync(masterPath, outPath);
            } else {
                await resizePng(masterPath, outPath, targetPx);
            }
            if (fs.existsSync(outPath)) {
                generated.push({ ...tier, file: outName });
                mirrorToBundle(`textures/${outName}`);
                compressWebp(outPath);
            }
        } catch (e) {
            console.warn(`[hilod-tiers] ${outName}: ${e.message}`);
        }
    }

    compressWebp(masterPath);
    mirrorToBundle(path.relative(ROOT, masterPath).replace(/\\/g, '/'));
    await syncManifestVariants(stem, generated);

    return { ok: true, stem, generated: generated.length };
}

async function main() {
    const arg = process.argv[2];
    if (!arg) {
        console.log('[hilod-tiers] usage: node scripts/generate-hilod-tiers.cjs textures/foo_albedo.png');
        process.exit(0);
    }
    const abs = path.isAbsolute(arg) ? arg : path.join(ROOT, arg);
    const result = await generateFromMaster(abs);
    if (result.ok) {
        console.log(`[hilod-tiers] ${result.stem} → ${result.generated} tier(s) + WebP queue`);
    } else {
        console.log(`[hilod-tiers] skip: ${result.reason}`);
    }
}

if (require.main === module) {
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { generateFromMaster, resizePng };