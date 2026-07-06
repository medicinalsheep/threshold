#!/usr/bin/env node
/** Export character kit — GLBs, hair, skin PBR, avatar manifest (R8.2.6) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IMPORT = path.join(ROOT, 'import');
const TEX = path.join(ROOT, 'textures');
const OUT = path.join(ROOT, 'exports', 'starter-character-kit');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'character-kit.json'), 'utf8'));
const AVATAR_MAN = path.join(ROOT, 'config', 'avatar-manifest.json');
const TEX_MAN = path.join(TEX, 'threshold_manifest.json');

function copyIfExists(src, dest) {
    if (!fs.existsSync(src)) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
}

function resolveTextureFile(slug, slot, tier, preferWebp) {
    const base = `${slug}_${slot}`;
    const withTier = tier ? `${base}${tier}` : base;
    const webp = `${withTier}.webp`;
    const png = `${withTier}.png`;
    if (preferWebp && fs.existsSync(path.join(TEX, webp))) return webp;
    if (fs.existsSync(path.join(TEX, png))) return png;
    return null;
}

function main() {
    fs.rmSync(OUT, { recursive: true, force: true });
    fs.mkdirSync(path.join(OUT, 'bodies'), { recursive: true });
    fs.mkdirSync(path.join(OUT, 'hair'), { recursive: true });
    fs.mkdirSync(path.join(OUT, 'textures'), { recursive: true });
    fs.mkdirSync(path.join(OUT, 'config'), { recursive: true });

    let fileCount = 0;
    const copiedGlbs = [];
    const copiedTex = new Set();

    for (const f of CFG.bodyGlbs || []) {
        if (copyIfExists(path.join(IMPORT, f), path.join(OUT, 'bodies', f))) {
            copiedGlbs.push(f);
            fileCount += 1;
        }
    }
    for (const f of CFG.hairGlbs || []) {
        if (copyIfExists(path.join(IMPORT, f), path.join(OUT, 'hair', f))) {
            copiedGlbs.push(f);
            fileCount += 1;
        }
    }

    const tiers = CFG.includeTiers || ['', '_512'];
    const preferWebp = CFG.preferWebp !== false;
    const slots = CFG.textureSlots || ['albedo', 'roughness'];

    for (const slug of CFG.textureSlugs || []) {
        for (const slot of slots) {
            if (slug === 'hair_alpha' && slot === 'roughness') continue;
            for (const tier of tiers) {
                const file = resolveTextureFile(slug, slot, tier, preferWebp);
                if (!file || copiedTex.has(file)) continue;
                if (copyIfExists(path.join(TEX, file), path.join(OUT, 'textures', file))) {
                    copiedTex.add(file);
                    fileCount += 1;
                }
            }
        }
    }

    if (fs.existsSync(AVATAR_MAN)) {
        copyIfExists(AVATAR_MAN, path.join(OUT, 'config', 'avatar-manifest.json'));
        fileCount += 1;
    }
    for (const rel of CFG.includeConfigs || []) {
        if (copyIfExists(path.join(ROOT, rel), path.join(OUT, rel))) fileCount += 1;
    }

    let texEntries = [];
    if (fs.existsSync(TEX_MAN)) {
        const man = JSON.parse(fs.readFileSync(TEX_MAN, 'utf8'));
        const slugs = new Set(CFG.textureSlugs || []);
        texEntries = (man.textures || []).filter((t) => {
            const slug = (t.id || t.file || '').replace(/_(albedo|roughness|metalness|normal)$/, '');
            return slugs.has(slug) || [...slugs].some((s) => (t.file || '').startsWith(s));
        });
        const kitTexMan = {
            ...man,
            textures: texEntries.map((e) => ({
                ...e,
                variants: (e.variants || []).filter((v) => tiers.includes(v.suffix || '')),
            })),
        };
        fs.writeFileSync(path.join(OUT, 'textures', 'threshold_manifest.json'), JSON.stringify(kitTexMan, null, 2));
        fileCount += 1;
    }

    const presets = (CFG.appearancePresets || []).map((p) => ({
        ...p,
        profile: {
            format: 'threshold-appearance',
            version: 1,
            ...p.profile,
        },
    }));

    const meta = {
        format: CFG.format,
        version: CFG.version,
        exportedAt: new Date().toISOString(),
        description: CFG.description,
        glbFiles: copiedGlbs,
        textureFiles: [...copiedTex].sort(),
        appearancePresets: presets,
        fileCount,
        usage: [
            'Copy bodies/ + hair/ → your project import/',
            'Copy textures/ → textures/',
            'Copy config/avatar-manifest.json',
            'Register custom bodies: appearance.customBodyImport = "my.glb"',
            'Import presets from appearance-presets.json',
        ],
    };
    fs.writeFileSync(path.join(OUT, 'kit-manifest.json'), JSON.stringify(meta, null, 2));
    fs.writeFileSync(path.join(OUT, 'appearance-presets.json'), JSON.stringify(presets, null, 2));

    let bytes = 0;
    const walk = (dir) => {
        for (const f of fs.readdirSync(dir)) {
            const p = path.join(dir, f);
            if (fs.statSync(p).isDirectory()) walk(p);
            else bytes += fs.statSync(p).size;
        }
    };
    walk(OUT);
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    console.log(`[kit:export:chr] ${fileCount} files → exports/starter-character-kit/ (~${mb} MB)`);
    console.log(`[kit:export:chr] ${copiedGlbs.length} GLB · ${copiedTex.size} texture maps · ${presets.length} presets`);
    return { fileCount, mb };
}

if (require.main === module) {
    main();
}

module.exports = { main };