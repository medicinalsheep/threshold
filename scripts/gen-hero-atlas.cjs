#!/usr/bin/env node
/**
 * H2 — pack skin / shirt / pants / shoe tiles into the hero UV atlas.
 * Usage: node scripts/gen-hero-atlas.cjs
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const TEX = path.join(ROOT, 'textures');
const PUB = path.join(ROOT, 'public', 'bundle', 'textures');
const TPL = path.join(TEX, '_templates');
const SRC = path.join(ROOT, 'textures', '_handpainted_src');
const SIZE = 2048;

const UV = {
    HEAD: [0.02, 0.68, 0.48, 0.98],
    NECK: [0.02, 0.60, 0.18, 0.68],
    ARM_L: [0.52, 0.72, 0.74, 0.98],
    ARM_R: [0.76, 0.72, 0.98, 0.98],
    TORSO: [0.02, 0.34, 0.50, 0.60],
    HAND_L: [0.54, 0.50, 0.74, 0.70],
    HAND_R: [0.76, 0.50, 0.98, 0.70],
    HIPS: [0.02, 0.02, 0.38, 0.32],
    LEG_L: [0.42, 0.14, 0.68, 0.48],
    LEG_R: [0.70, 0.14, 0.96, 0.48],
    FOOT_L: [0.42, 0.02, 0.68, 0.13],
    FOOT_R: [0.70, 0.02, 0.96, 0.13],
};

const SKIN_ISLANDS = ['HEAD', 'NECK', 'ARM_L', 'ARM_R', 'HAND_L', 'HAND_R'];
const SHIRT_ISLANDS = ['TORSO'];
const PANTS_ISLANDS = ['HIPS', 'LEG_L', 'LEG_R'];
const SHOE_ISLANDS = ['FOOT_L', 'FOOT_R'];

const TONES = [
    { id: 'starter_skin_porcelain', hex: '#f2d4c8' },
    { id: 'starter_skin_light', hex: '#e8c4a8' },
    { id: 'starter_skin_honey', hex: '#e0b090' },
    { id: 'starter_skin_olive', hex: '#c4a070' },
    { id: 'starter_skin_medium', hex: '#c9956c' },
    { id: 'starter_skin_tan', hex: '#b88858' },
    { id: 'starter_skin_caramel', hex: '#8b5a3c' },
    { id: 'starter_skin_deep', hex: '#5c3a28' },
    { id: 'starter_skin_ebony', hex: '#2a1a14' },
];

function hexRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rectPx(rect) {
    const [u0, v0, u1, v1] = rect;
    const x = Math.round(u0 * SIZE);
    const w = Math.max(1, Math.round((u1 - u0) * SIZE));
    const y = Math.round((1 - v1) * SIZE);
    const h = Math.max(1, Math.round((v1 - v0) * SIZE));
    return { left: x, top: y, width: w, height: h };
}

function findTile(candidates) {
    for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
    }
    return null;
}

async function flattenLighting(inputPath, size) {
    const { data, info } = await sharp(inputPath)
        .resize(size, size, { fit: 'cover', position: 'centre' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const ch = info.channels;
    const blur = 48;
    const blurBuf = await sharp(data, { raw: { width: w, height: h, channels: ch } })
        .blur(blur)
        .raw()
        .toBuffer();
    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i += ch) {
        for (let c = 0; c < 3; c++) {
            const b = blurBuf[i + c] || 1;
            const v = data[i + c] / b * 140;
            out[i + c] = Math.max(0, Math.min(255, Math.round(v)));
        }
        if (ch > 3) out[i + 3] = 255;
    }
    return { data: out, w, h, ch };
}

async function offsetBlend(raw, w, h, ch) {
    const out = Buffer.alloc(raw.length);
    const ox = (w / 2) | 0;
    const oy = (h / 2) | 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * ch;
            const j = (((y + oy) % h) * w + ((x + ox) % w)) * ch;
            const edge = Math.min(x, y, w - 1 - x, h - 1 - y) / (w * 0.12);
            const t = Math.max(0, Math.min(1, 1 - edge));
            const a = 0.55 + 0.45 * (1 - t);
            for (let c = 0; c < 3; c++) {
                out[i + c] = Math.round(raw[i + c] * a + raw[j + c] * (1 - a));
            }
            if (ch > 3) out[i + 3] = 255;
        }
    }
    return out;
}

async function prepareTile(inputPath, size, { flatten = false } = {}) {
    let data;
    let w;
    let h;
    let ch;
    if (flatten) {
        const f = await flattenLighting(inputPath, size);
        data = f.data;
        w = f.w;
        h = f.h;
        ch = f.ch;
    } else {
        const raw = await sharp(inputPath)
            .resize(size, size, { fit: 'cover', position: 'centre' })
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        data = raw.data;
        w = raw.info.width;
        h = raw.info.height;
        ch = raw.info.channels;
    }
    const blended = await offsetBlend(data, w, h, ch);
    return sharp(blended, { raw: { width: w, height: h, channels: ch } }).png().toBuffer();
}

function meanRgb(buf, w, h, ch) {
    let r = 0;
    let g = 0;
    let b = 0;
    const n = w * h;
    for (let i = 0; i < buf.length; i += ch) {
        r += buf[i];
        g += buf[i + 1];
        b += buf[i + 2];
    }
    return [r / n, g / n, b / n];
}

async function tintToward(pngBuf, hex) {
    const [tr, tg, tb] = hexRgb(hex);
    const { data, info } = await sharp(pngBuf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const [mr, mg, mb] = meanRgb(data, info.width, info.height, info.channels);
    const sr = tr / Math.max(8, mr);
    const sg = tg / Math.max(8, mg);
    const sb = tb / Math.max(8, mb);
    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i += info.channels) {
        out[i] = Math.max(0, Math.min(255, Math.round(data[i] * sr)));
        out[i + 1] = Math.max(0, Math.min(255, Math.round(data[i + 1] * sg)));
        out[i + 2] = Math.max(0, Math.min(255, Math.round(data[i + 2] * sb)));
        if (info.channels > 3) out[i + 3] = 255;
    }
    return sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toBuffer();
}

async function islandBuf(tilePng, island) {
    return sharp(tilePng)
        .resize(island.width, island.height, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();
}

async function packAtlas(fills) {
    const base = sharp({
        create: { width: SIZE, height: SIZE, channels: 3, background: { r: 18, g: 18, b: 22 } },
    });
    const comps = [];
    for (const { keys, tile } of fills) {
        for (const key of keys) {
            const r = rectPx(UV[key]);
            comps.push({ input: await islandBuf(tile, r), left: r.left, top: r.top });
        }
    }
    return base.composite(comps).png().toBuffer();
}

async function writeNormal(pngBuf, outPath, strength = 1.2) {
    const { data, info } = await sharp(pngBuf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const ch = info.channels;
    const lum = new Float32Array(w * h);
    for (let i = 0, p = 0; i < lum.length; i++, p += ch) {
        lum[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
    }
    const out = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            const dx = (lum[i] - lum[y * w + ((x + 1) % w)]) * strength;
            const dy = (lum[i] - lum[((y + 1) % h) * w + x]) * strength;
            let nx = -dx;
            let ny = -dy;
            let nz = 1;
            const len = Math.hypot(nx, ny, nz) || 1;
            nx /= len;
            ny /= len;
            nz /= len;
            const o = i * 3;
            out[o] = Math.round((nx * 0.5 + 0.5) * 255);
            out[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
            out[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        }
    }
    await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toFile(outPath);
}

async function writeRoughness(pngBuf, outPath, bias = 0.58, contrast = 0.28) {
    const { data, info } = await sharp(pngBuf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const ch = info.channels;
    const out = Buffer.alloc(w * h * 3);
    for (let i = 0, p = 0; i < w * h; i++, p += ch) {
        const lum = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
        let v = bias + (0.5 - lum) * contrast;
        v = Math.max(0.12, Math.min(0.92, v));
        const g = Math.round(v * 255);
        const o = i * 3;
        out[o] = out[o + 1] = out[o + 2] = g;
    }
    await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toFile(outPath);
}

function mirror(rel) {
    const src = path.join(ROOT, rel);
    const dest = path.join(PUB, path.relative(TEX, src));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
}

async function writeMaster(slug, slot, buf) {
    const name = `${slug}_${slot}.png`;
    const dest = path.join(TEX, name);
    await sharp(buf).resize(SIZE, SIZE).png().toFile(dest);
    mirror(path.join('textures', name));
    return dest;
}

async function main() {
    console.log('gen-hero-atlas (H2)\n');
    const sess = path.join(
        process.env.USERPROFILE || '',
        '.grok',
        'sessions',
        'C%3A%5CUsers%5Cjusti%5COneDrive%5CDesktop%5CThreshold',
        '01a00e39-283c-7f82-9a09-3fa39f46e5e9',
        'images',
    );

    const skinSrc = findTile([
        path.join(TPL, 'hero_skin_tile.jpg'),
        path.join(TPL, 'hero_skin_tile.png'),
        path.join(sess, '1.jpg'),
        path.join(SRC, 'starter_skin_medium.jpg'),
    ]);
    const shirtSrc = findTile([
        path.join(TPL, 'hero_shirt_tile.jpg'),
        path.join(SRC, 'starter_fabric.jpg'),
        path.join(TEX, 'starter_fabric_albedo.png'),
    ]);
    const pantsSrc = findTile([
        path.join(TPL, 'hero_pants_tile.jpg'),
        path.join(TPL, 'hero_pants_tile.png'),
        path.join(sess, '3.jpg'),
        shirtSrc,
    ]);
    const shoeSrc = findTile([
        path.join(TPL, 'hero_shoe_tile.jpg'),
        path.join(TPL, 'hero_shoe_tile.png'),
        path.join(sess, '2.jpg'),
        path.join(SRC, 'starter_asphalt.jpg'),
    ]);

    if (!skinSrc || !shirtSrc) {
        console.error('missing skin or shirt tile');
        process.exit(1);
    }

    fs.mkdirSync(TPL, { recursive: true });
    if (skinSrc.includes('images') && !fs.existsSync(path.join(TPL, 'hero_skin_tile.jpg'))) {
        fs.copyFileSync(skinSrc, path.join(TPL, 'hero_skin_tile.jpg'));
    }
    if (pantsSrc && pantsSrc.includes('images') && !fs.existsSync(path.join(TPL, 'hero_pants_tile.jpg'))) {
        fs.copyFileSync(pantsSrc, path.join(TPL, 'hero_pants_tile.jpg'));
    }
    if (shoeSrc && shoeSrc.includes('images') && !fs.existsSync(path.join(TPL, 'hero_shoe_tile.jpg'))) {
        fs.copyFileSync(shoeSrc, path.join(TPL, 'hero_shoe_tile.jpg'));
    }

    const skinTile = await prepareTile(skinSrc, 1024, { flatten: true });
    const shirtTile = await prepareTile(shirtSrc, 1024, { flatten: false });
    const pantsTile = await prepareTile(pantsSrc || shirtSrc, 1024, { flatten: false });
    const shoeTile = await prepareTile(shoeSrc || shirtSrc, 1024, { flatten: true });

    const fabricAlbedo = await packAtlas([
        { keys: SHIRT_ISLANDS, tile: shirtTile },
        { keys: PANTS_ISLANDS, tile: pantsTile },
        { keys: SHOE_ISLANDS, tile: shoeTile },
    ]);
    const fabricPath = await writeMaster('starter_fabric', 'albedo', fabricAlbedo);
    await writeNormal(fabricAlbedo, path.join(TEX, 'starter_fabric_normal.png'), 1.6);
    await writeRoughness(fabricAlbedo, path.join(TEX, 'starter_fabric_roughness.png'), 0.72, 0.22);
    mirror('textures/starter_fabric_normal.png');
    mirror('textures/starter_fabric_roughness.png');
    console.log('  fabric atlas', path.basename(fabricPath));

    for (const tone of TONES) {
        const tinted = await tintToward(skinTile, tone.hex);
        const albedo = await packAtlas([{ keys: SKIN_ISLANDS, tile: tinted }]);
        const p = await writeMaster(tone.id, 'albedo', albedo);
        await writeNormal(albedo, path.join(TEX, `${tone.id}_normal.png`), 0.85);
        await writeRoughness(albedo, path.join(TEX, `${tone.id}_roughness.png`), 0.52, 0.22);
        mirror(`textures/${tone.id}_normal.png`);
        mirror(`textures/${tone.id}_roughness.png`);
        console.log(' ', tone.id, path.basename(p));
    }

    console.log('\ngen-hero-atlas — done. next: npm run textures:hilod (or hilod those slugs)');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
