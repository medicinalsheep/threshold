#!/usr/bin/env node
/** Starter SFX smoke (engines, guns, brakes, locks, glass, impacts) */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const STARTER = path.join(ROOT, 'sounds', 'starter');
const MANIFEST = path.join(ROOT, 'config', 'starter-sounds.json');

const REQUIRED_IDS = [
    'starter_eng_two_stroke',
    'starter_eng_v8',
    'starter_terminal_chirp',
    'starter_gun_pistol',
    'starter_gun_rifle',
    'starter_brake_squeal',
    'starter_door_lock',
    'starter_door_unlock',
    'starter_glass_break',
    'starter_tire_skid',
    'starter_metal_hit',
];

let fail = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function bad(m) { console.log(`  ✗ ${m}`); fail += 1; }

console.log('[sounds-verify] manifest + clips');
if (!fs.existsSync(MANIFEST)) bad('missing config/starter-sounds.json');
else ok('config/starter-sounds.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
if (manifest.version >= 2) ok(`manifest v${manifest.version}`);
else bad(`manifest version ${manifest.version} — expected >= 2`);

const ids = new Set((manifest.clips || []).map((c) => c.id));
REQUIRED_IDS.forEach((id) => {
    if (!ids.has(id)) bad(`manifest missing clip id ${id}`);
    else ok(`clip id ${id}`);
});

(manifest.clips || []).forEach((clip) => {
    const ogg = clip.ogg && path.join(STARTER, path.basename(clip.ogg));
    const wav = clip.wav && path.join(STARTER, path.basename(clip.wav));
    if (ogg && fs.existsSync(ogg)) ok(`${clip.id} ogg (${(fs.statSync(ogg).size / 1024).toFixed(1)} KB)`);
    else if (wav && fs.existsSync(wav)) ok(`${clip.id} wav fallback`);
    else bad(`missing audio for ${clip.id}`);
});

console.log('[sounds-verify] wiring modules');
['src/shared/starterSfx.js', 'src/shared/engineAudio.js'].forEach((f) => {
    if (fs.existsSync(path.join(ROOT, f))) ok(f);
    else bad(`missing ${f}`);
});

const sfx = fs.readFileSync(path.join(ROOT, 'src/shared/starterSfx.js'), 'utf8');
if (sfx.includes('wireStarterSounds')) ok('starterSfx wireStarterSounds');
else bad('starterSfx missing wireStarterSounds');
if (sfx.includes('fireStarterGun')) ok('starterSfx fireStarterGun');
else bad('starterSfx missing fireStarterGun');
if (sfx.includes('starter_glass_break')) ok('starterSfx glass break');
else bad('starterSfx missing glass break');

const drive = fs.readFileSync(path.join(ROOT, 'src/shared/tcDrive.js'), 'utf8');
if (drive.includes('EngineAudio')) ok('tcDrive EngineAudio');
else bad('tcDrive missing EngineAudio');
if (drive.includes('starter_brake_squeal')) ok('tcDrive brake squeal');
else bad('tcDrive missing brake squeal');

try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    ok('ffmpeg available');
} catch {
    console.log('  ⚠ ffmpeg not on PATH — WAV fallback OK (winget install Gyan.FFmpeg for OGG)');
}

console.log(fail ? `\n[sounds-verify] FAILED (${fail})` : '\n[sounds-verify] PASS');
process.exit(fail ? 1 : 0);