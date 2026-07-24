#!/usr/bin/env node
/** Smoke: surface profile module + HTML markers */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let failed = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function fail(m) { console.error(`  ✗ ${m}`); failed += 1; }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

console.log('surface-verify\n');

const mod = read('src/shared/surfaceProfile.js');
for (const t of [
    'export const SurfaceProfile',
    'allowsOllamaProbe',
    'allowsDevChrome',
    'surface-player',
    'initSurfaceProfile',
    'window.SurfaceProfile',
]) {
    if (mod.includes(t.replace('surface-player', 'surface-'))) ok(`surfaceProfile has ${t}`);
    else if (t === 'surface-player' && mod.includes("PLAYER: 'player'")) ok('surfaceProfile has player profile');
    else if (mod.includes(t)) ok(`surfaceProfile has ${t}`);
    else fail(`missing ${t}`);
}

const main = read('src/main.js');
if (main.includes('initSurfaceProfile') && main.includes('surface.css')) ok('main wires surface');
else fail('main missing surface init/css');

const ollama = read('src/shared/ollamaClient.js');
if (ollama.includes('allowsOllamaProbe')) ok('ollamaClient respects surface');
else fail('ollamaClient missing surface gate');

const portal = read('src/shared/agentPortal.js');
if (portal.includes('allowsOllamaProbe') && portal.includes('allowsAgentAuto')) ok('agentPortal surface gates');
else fail('agentPortal missing surface gates');

const html = read('index.html');
if (html.includes('data-surface-set') && html.includes('data-surface="creator"')) ok('index surface markers');
else fail('index.html missing surface markers');
if (html.includes('surface-profile-badge')) ok('nav surface badge');
else fail('nav badge missing');

const css = read('src/css/surface.css');
if (css.includes('body.surface-player') && css.includes('[data-surface="creator"]')) ok('surface.css rules');
else fail('surface.css incomplete');

if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
}
console.log('\nAll surface checks passed.');
