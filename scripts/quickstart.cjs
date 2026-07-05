#!/usr/bin/env node
/** Print onboarding steps and optionally verify starter assets. */
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const verify = process.argv.includes('--verify');
const pack = process.argv.includes('--pack');

function runNode(script, label) {
    const p = path.join(__dirname, script);
    console.log(`[quickstart] ${label}…\n`);
    const r = spawnSync(process.execPath, [p], { cwd: ROOT, stdio: 'inherit', shell: false });
    if (r.status !== 0) process.exit(r.status || 1);
}

const steps = `
╔══════════════════════════════════════════════════════════════╗
║  THRESHOLD SUITE — Quick start (v6.4)                        ║
╚══════════════════════════════════════════════════════════════╝

1. Install & dev
   npm install
   npm run dev              → http://localhost:5173

2. First play (no build required for live site; local needs assets)
   Lobby → SOLO PLAY
   Walk pads (grass/wood/gravel/asphalt) · V = FPS · R = ADS · T = Third Eye
   E = interact terminals · G = shoot glass target

3. Regenerate starter assets (first clone or after texture/sound changes)
   npm run assets:pack      → tex + avatars + sounds + webp + build + bundle + kit
   npm run assets:verify    → smoke test
   npm run preview          → http://localhost:4173

4. GIMP live art loop (optional)
   npm run gimp:install
   npm run textures:watch   # terminal 1
   npm run dev              # terminal 2
   GIMP → Export PBR Maps → instant hot-reload

5. Fork-friendly texture pack (~1.4 MB WebP)
   npm run kit:export
   npm run kit:verify

6. TC showcase (export practice)
   Lobby → TC →
   npm run tc:build && npm run tc:verify

Docs: docs/README.md · docs/GETTING_STARTED.md · docs/REALISTIC_GAMEPLAY.md
`;

console.log(steps);

if (pack) runNode('assets-pack.cjs', 'Running assets:pack (may take ~1 min)');
if (verify || pack) {
    runNode('assets-verify.cjs', 'Running assets:verify');
    console.log('\n[quickstart] PASS — open npm run preview or npm run dev');
}