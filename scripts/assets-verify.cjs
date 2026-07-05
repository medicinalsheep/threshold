#!/usr/bin/env node
/** Default asset smoke — textures, sounds, modules, bundle budget */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEX = path.join(ROOT, 'textures');
const SOUNDS = path.join(ROOT, 'sounds', 'starter');
const BUNDLE = path.join(ROOT, 'dist-pages', 'bundle');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const REQUIRED_MODULES = [
    'src/shared/thirdEye.js',
    'src/shared/npcPatrol.js',
    'src/engine/player.js',
    'src/shared/starterScene.js',
];

const REQUIRED_SFX = [
    'starter_gun_pistol',
    'starter_brake_squeal',
    'starter_glass_break',
    'starter_door_lock',
];

let fail = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function bad(m) { console.log(`  ✗ ${m}`); fail += 1; }

console.log(`[assets-verify] v${PKG.version}`);

REQUIRED_MODULES.forEach((f) => {
    if (fs.existsSync(path.join(ROOT, f))) ok(f);
    else bad(`missing ${f}`);
});

const sfxMan = path.join(ROOT, 'config', 'starter-sounds.json');
if (fs.existsSync(sfxMan)) {
    const sfx = JSON.parse(fs.readFileSync(sfxMan, 'utf8'));
    const ids = new Set((sfx.clips || []).map((c) => c.id));
    REQUIRED_SFX.forEach((id) => {
        if (ids.has(id)) ok(`sfx ${id}`);
        else bad(`sfx missing ${id}`);
    });
} else bad('starter-sounds.json');

const pngCount = fs.existsSync(TEX) ? fs.readdirSync(TEX).filter((f) => f.endsWith('.png')).length : 0;
const webpCount = fs.existsSync(TEX) ? fs.readdirSync(TEX).filter((f) => f.endsWith('.webp')).length : 0;
if (pngCount >= 20) ok(`${pngCount} PNG textures`);
else bad(`only ${pngCount} PNG textures`);
if (webpCount >= 10) ok(`${webpCount} WebP sidecars`);
else console.log(`  ⚠ ${webpCount} WebP (run npm run tex:compress with ffmpeg)`);

let texBytes = 0;
if (fs.existsSync(TEX)) {
    fs.readdirSync(TEX).forEach((f) => {
        if (f.endsWith('.webp') || f.endsWith('.png')) {
            texBytes += fs.statSync(path.join(TEX, f)).size;
        }
    });
}
const texMb = texBytes / (1024 * 1024);
if (texMb < 12) ok(`texture disk ~${texMb.toFixed(1)} MB`);
else bad(`texture disk ${texMb.toFixed(1)} MB — over 12 MB budget`);

const player = fs.readFileSync(path.join(ROOT, 'src/engine/player.js'), 'utf8');
if (player.includes('_probeGround')) ok('ground raycast');
else bad('player missing ground raycast');
if (player.includes('toggleViewMode')) ok('FPS/TPS toggle');

const scene = fs.readFileSync(path.join(ROOT, 'src/shared/starterScene.js'), 'utf8');
['Alex', 'Jordan', 'Sam', 'starter_ground', 'starter_wall'].forEach((token) => {
    if (scene.includes(token)) ok(`starter ${token}`);
    else bad(`starter missing ${token}`);
});

if (fs.existsSync(path.join(ROOT, 'docs', 'REALISTIC_GAMEPLAY.md'))) ok('REALISTIC_GAMEPLAY.md');
else bad('missing docs/REALISTIC_GAMEPLAY.md');

['starter_avatar.glb', 'starter_npc_guard.glb', 'starter_npc_mech.glb'].forEach((f) => {
    const p = path.join(ROOT, 'import', f);
    if (fs.existsSync(p)) ok(`avatar ${f}`);
    else bad(`missing import/${f}`);
});

if (fs.existsSync(path.join(ROOT, 'src/shared/footsteps.js'))) ok('footsteps.js');
if (fs.existsSync(path.join(ROOT, 'src/shared/fpsViewmodel.js'))) ok('fpsViewmodel.js');
if (fs.existsSync(path.join(ROOT, 'docs/ASSET_CAPABILITIES.md'))) ok('ASSET_CAPABILITIES.md');
if (fs.existsSync(path.join(ROOT, 'config/starter-textures.json'))) ok('starter-textures.json');
const gimpPy = fs.readFileSync(path.join(ROOT, 'plugins/threshold-gimp/build_tc_tex.py'), 'utf8');
if (gimpPy.includes('metal_grate') && gimpPy.includes('r8')) ok('GIMP texture parity (r8)');
if (fs.existsSync(path.join(ROOT, 'docs/BLENDER_AVATARS.md'))) ok('BLENDER_AVATARS.md');
if (fs.existsSync(path.join(ROOT, 'public/basis/basis_transcoder.wasm'))) ok('basis transcoder');
const ktx2Count = fs.existsSync(TEX) ? fs.readdirSync(TEX).filter((f) => f.endsWith('.ktx2')).length : 0;
if (ktx2Count > 0) ok(`${ktx2Count} KTX2 sidecars`);
else console.log('  ⚠ 0 KTX2 (optional — npm run tex:ktx2 with toktx/basisu)');
if (pngCount >= 140) ok(`texture preset coverage (${pngCount} PNG)`);

if (fs.existsSync(path.join(BUNDLE, 'bundle-index.json'))) ok('dist-pages/bundle');
else console.log('  ⚠ bundle missing — run npm run assets:pack');

console.log(fail ? `\n[assets-verify] FAILED (${fail})` : '\n[assets-verify] PASS');
process.exit(fail ? 1 : 0);