#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const KIT = path.join(ROOT, 'exports', 'starter-texture-kit');
const META = path.join(KIT, 'kit-manifest.json');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'starter-kit.json'), 'utf8'));

let fail = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function bad(m) { console.log(`  ✗ ${m}`); fail += 1; }

console.log('[kit-verify] starter texture kit');
if (!fs.existsSync(META)) bad('missing exports/starter-texture-kit — run npm run kit:export');
else {
    ok('kit-manifest.json');
    const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
    if (meta.textureFiles?.length >= 20) ok(`${meta.textureFiles.length} texture files`);
    else bad(`only ${meta.textureFiles?.length || 0} texture files`);
}

const man = path.join(KIT, 'textures', 'threshold_manifest.json');
if (fs.existsSync(man)) {
    const m = JSON.parse(fs.readFileSync(man, 'utf8'));
    const names = new Set((m.textures || []).map((t) => t.objectName));
    (CFG.objectNames || []).forEach((n) => {
        if (names.has(n)) ok(`preset ${n}`);
        else bad(`missing preset ${n}`);
    });
} else bad('kit threshold_manifest.json');

if (fs.existsSync(path.join(KIT, 'config', 'starter-textures.json'))) ok('starter-textures.json');

const CHR = path.join(ROOT, 'exports', 'starter-character-kit');
const CHR_META = path.join(CHR, 'kit-manifest.json');
const CHR_CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'character-kit.json'), 'utf8'));

console.log('[kit-verify] character kit');
if (!fs.existsSync(CHR_META)) bad('missing exports/starter-character-kit — run npm run kit:export:chr');
else {
    ok('character kit-manifest.json');
    const cmeta = JSON.parse(fs.readFileSync(CHR_META, 'utf8'));
    if ((cmeta.glbFiles || []).length >= 5) ok(`${cmeta.glbFiles.length} character GLBs`);
    else bad(`only ${cmeta.glbFiles?.length || 0} character GLBs`);
    if (fs.existsSync(path.join(CHR, 'config', 'avatar-manifest.json'))) ok('avatar-manifest.json');
    else bad('missing character kit avatar-manifest.json');
    if (fs.existsSync(path.join(CHR, 'appearance-presets.json'))) ok('appearance-presets.json');
    (CHR_CFG.bodyGlbs || []).slice(0, 2).forEach((f) => {
        if (fs.existsSync(path.join(CHR, 'bodies', f))) ok(`body ${f}`);
        else bad(`missing bodies/${f}`);
    });
}

console.log(fail ? `\n[kit-verify] FAILED (${fail})` : '\n[kit-verify] PASS');
process.exit(fail ? 1 : 0);