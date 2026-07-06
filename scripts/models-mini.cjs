#!/usr/bin/env node
/**
 * Install GitHub-shipped mini models (Modelfile + ollama pull base weights).
 * No large weights committed — bases download from Ollama registry.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ENGINE_ROOT, loadBootcampConfig, bootcampPath, ollamaExe } = require('./bootcamp-lib.cjs');

const registryPath = path.join(ENGINE_ROOT, 'config', 'models-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const cfg = loadBootcampConfig();
const ollama = ollamaExe();

console.log('models:mini — Threshold mini agents (GitHub Modelfiles + local ollama pull)\n');

let failed = 0;
(registry.mini || []).forEach((m) => {
    const modelfile = path.join(ENGINE_ROOT, m.modelfile.replace(/\//g, path.sep));
    if (!fs.existsSync(modelfile)) {
        console.error(`  ✗ ${m.id}: missing ${m.modelfile} — run bootcamp:build`);
        failed += 1;
        return;
    }
    console.log(`  Pull base ${m.basePull} (~${m.baseSizeGb} GB)…`);
    const pull = spawnSync(`"${ollama}" pull ${m.basePull}`, { shell: true, encoding: 'utf8', stdio: 'pipe' });
    if (pull.status !== 0) {
        console.error(`  ✗ pull ${m.basePull}: ${(pull.stderr || '').slice(0, 200)}`);
        failed += 1;
        return;
    }
    console.log(`  Create ${m.id}…`);
    const create = spawnSync(`"${ollama}" create ${m.id} -f "${modelfile}"`, { shell: true, encoding: 'utf8', stdio: 'pipe' });
    if (create.status !== 0) {
        console.error(`  ✗ create ${m.id}: ${(create.stderr || '').slice(0, 200)}`);
        failed += 1;
    } else {
        console.log(`  ✓ ${m.id} ready (${m.label})\n`);
    }
});

console.log(failed ? 'models:mini — FAIL' : 'models:mini — PASS');
console.log('  AGENTS → Small: threshold-mini-npc · Medium: threshold-mini-dev');
process.exit(failed ? 1 : 0);