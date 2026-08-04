#!/usr/bin/env node
/**
 * One-shot mini-agent train path:
 *   seed (optional) → wave2 (optional) → bootcamp:build → models:mini
 *
 * Usage:
 *   npm run train:mini
 *   npm run train:mini -- --no-seed     # rebuild from existing JSONL only
 *   npm run train:mini -- --merge-seed  # append seed without full rewrite
 *   npm run train:mini -- --wave2       # also merge whole-product wave2 corpus
 *   npm run train:mini -- --critical    # intent/render-mode hard fixes
 *   npm run train:mini -- --wave3       # planning + hilod/compress + performance
 *   npm run train:mini -- --wave4       # safety + plan/code + recovery + export
 *   npm run train:mini -- --wave5       # 10.13 product: surfaces, NegLOD, Ollama CORS, store
 *   npm run train:mini -- --wave6       # 10.15–10.16: live build, arrange, play-as, PBR
 *   npm run train:mini -- --wave7       # 10.17–10.19: entry, shape, wardrobe, quick live
 *   npm run train:mini -- --full        # all waves + critical + build + create
 *   npm run train:mini -- --full --golden  # full + ollama:golden
 */
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const noSeed = process.argv.includes('--no-seed');
const mergeSeed = process.argv.includes('--merge-seed');
const wave2 = process.argv.includes('--wave2') || process.argv.includes('--full');
const wave3 = process.argv.includes('--wave3') || process.argv.includes('--full');
const wave4 = process.argv.includes('--wave4') || process.argv.includes('--full');
const wave5 = process.argv.includes('--wave5') || process.argv.includes('--full');
const wave6 = process.argv.includes('--wave6') || process.argv.includes('--full');
const wave7 = process.argv.includes('--wave7') || process.argv.includes('--full');
const critical = process.argv.includes('--critical') || process.argv.includes('--full');
const full = process.argv.includes('--full');
const golden = process.argv.includes('--golden');

function run(label, args) {
    console.log(`\n=== ${label} ===\n`);
    const r = spawnSync(process.execPath, args, {
        cwd: ROOT,
        stdio: 'inherit',
        shell: false,
    });
    if (r.status !== 0) {
        console.error(`\ntrain:mini — failed at ${label} (exit ${r.status})`);
        process.exit(r.status || 1);
    }
}

console.log('train:mini — Threshold mini agents (JSONL -> Modelfile -> ollama create)');
console.log('  Requires: ollama serve, network for base pulls if missing\n');

// Base seed rewrites core JSONL — only for full retrain or default (no wave flags).
// Wave-only runs (e.g. --wave6) merge into existing corpora without wiping wave5/critical.
const hasWaveFlag = wave2 || wave3 || wave4 || wave5 || wave6 || wave7 || critical;
const runBaseSeed = !noSeed && (full || !hasWaveFlag || mergeSeed);

if (runBaseSeed) {
    const seedArgs = [path.join('scripts', 'bootcamp-seed.cjs')];
    if (mergeSeed && !full) seedArgs.push('--merge');
    run('bootcamp:seed', seedArgs);
} else if (noSeed) {
    console.log('Skipping base seed (--no-seed)\n');
} else {
    console.log('Skipping base seed (wave-only merge — use --full to rewrite core JSONL)\n');
}

if (wave2 || full) {
    run('bootcamp:seed:wave2', [path.join('scripts', 'bootcamp-seed-wave2.cjs')]);
}

if (wave3 || full) {
    run('bootcamp:seed:wave3', [path.join('scripts', 'bootcamp-seed-wave3.cjs')]);
}

if (wave4 || full) {
    run('bootcamp:seed:wave4', [path.join('scripts', 'bootcamp-seed-wave4.cjs')]);
}

if (wave5 || full) {
    run('bootcamp:seed:wave5', [path.join('scripts', 'bootcamp-seed-wave5.cjs')]);
}

if (wave6 || full) {
    run('bootcamp:seed:wave6', [path.join('scripts', 'bootcamp-seed-wave6.cjs')]);
}

if (wave7 || full) {
    run('bootcamp:seed:wave7', [path.join('scripts', 'bootcamp-seed-wave7.cjs')]);
}

if (critical || full) {
    run('bootcamp:seed:critical', [path.join('scripts', 'bootcamp-seed-critical.cjs')]);
}

run('bootcamp:build', [path.join('scripts', 'bootcamp-build.cjs')]);
run('models:mini', [path.join('scripts', 'models-mini.cjs')]);

if (golden) {
    run('ollama:golden', [path.join('scripts', 'ollama-golden.cjs')]);
}

console.log(`
train:mini — PASS

In Engine:
  SETUP / AGENTS → Small:  threshold-mini-npc
                  Medium: threshold-mini-dev
  SAVE TIERS

Optional checks:
  npm run ollama:verify
  npm run ollama:golden
  npm run ollama:stress -- --models threshold-mini-npc,threshold-mini-dev,llama3.2:3B
  npm run models:mobile   # rebuild 1B phone pack after wave5
  npm run models:publish -- --all   # maintainers only
`);
