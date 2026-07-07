#!/usr/bin/env node
/**
 * Deprecated alias — canonical: npm run models:mini (+ models:large -- --yes).
 */
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const scripts = __dirname;

console.log('bootcamp:create — deprecated; running models:mini (canonical)\n');
if (args.includes('--small') || args.includes('--medium')) {
    console.log('  Note: models:mini installs both mini agents (small + medium).\n');
}

let failed = 0;
const mini = spawnSync(process.execPath, [path.join(scripts, 'models-mini.cjs')], { stdio: 'inherit' });
if (mini.status) failed += 1;

if (args.includes('--large')) {
    const large = spawnSync(process.execPath, [path.join(scripts, 'models-large.cjs'), '--yes'], { stdio: 'inherit' });
    if (large.status) failed += 1;
}

console.log(failed ? '\nbootcamp:create — FAIL' : '\nbootcamp:create — PASS');
console.log('  SCENE → AI tab → SAVE TIERS → threshold-mini-npc (small) · threshold-mini-dev (medium)');
console.log('  Prefer: npm run bootcamp:build && npm run models:mini');
process.exit(failed ? 1 : 0);