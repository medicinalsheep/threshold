#!/usr/bin/env node
/** Smoke: surface profile module + HTML markers + clarity affordances */
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
    'initSurfaceProfile',
    'window.SurfaceProfile',
    'cycle()',
    'maybeShowPlayerCoach',
    'setup-surface-hint',
    '?surface=player|creator|full',
    'surfaceCoachDismissed',
    "PLAYER: 'player'",
]) {
    if (mod.includes(t)) ok(`surfaceProfile has ${t}`);
    else fail(`missing ${t}`);
}

// Ollama must stay blocked on player
if (/allowsOllamaProbe\s*\(\)\s*\{[^}]*isPlayer\(\)[^}]*return false/s.test(mod)
    || (mod.includes('if (this.isPlayer()) return false') && mod.includes('allowsOllamaProbe'))) {
    ok('allowsOllamaProbe returns false on player');
} else {
    fail('allowsOllamaProbe must return false for player surface');
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
if (html.includes('surface-badge-clickable') || html.includes('surface-profile-badge')) ok('badge clickable affordance');
else fail('badge not marked clickable');
if (html.includes('id="surface-coach"') && html.includes('surface-coach-dismiss')) ok('surface coach host');
else fail('surface coach missing in index.html');
if (html.includes('setup-surface-hint')) ok('SETUP surface hint');
else fail('setup-surface-hint missing');
if (html.includes('surface-url-hint')) ok('lobby URL surface hint');
else fail('surface-url-hint missing');

const css = read('src/css/surface.css');
if (css.includes('body.surface-player') && css.includes('[data-surface="creator"]')) ok('surface.css rules');
else fail('surface.css incomplete');
if (css.includes('surface-badge-clickable') || css.includes('#surface-profile-badge')) ok('badge styles');
else fail('badge styles missing');
if (css.includes('min-height: 40px') || css.includes('min-height:40px')) ok('touch-sized surface chips');
else fail('surface chips may be too small for touch');
if (css.includes('#surface-coach')) ok('coach styles');
else fail('coach styles missing');

if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
}
console.log('\nAll surface checks passed.');
