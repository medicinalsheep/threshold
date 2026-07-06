#!/usr/bin/env node
/**
 * Optional large models — requires explicit download (multi-GB).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ENGINE_ROOT, ollamaExe } = require('./bootcamp-lib.cjs');

const skip = process.argv.includes('--yes');
const registry = JSON.parse(fs.readFileSync(path.join(ENGINE_ROOT, 'config', 'models-registry.json'), 'utf8'));
const ollama = ollamaExe();

console.log('models:large — optional large bases (download required)\n');

let failed = 0;
(registry.large || []).forEach((m) => {
    const modelfile = path.join(ENGINE_ROOT, m.modelfile.replace(/\//g, path.sep));
    if (!fs.existsSync(modelfile)) {
        console.error(`  ✗ ${m.id}: run npm run bootcamp:build first`);
        failed += 1;
        return;
    }
    console.log(`  ${m.id}: ${m.basePull} (~${m.baseSizeGb} GB)`);
    if (!skip) {
        console.log('    Pass --yes to download and create');
        return;
    }
    const pull = spawnSync(`"${ollama}" pull ${m.basePull}`, { shell: true, encoding: 'utf8', stdio: 'pipe' });
    if (pull.status !== 0) {
        failed += 1;
        return;
    }
    const create = spawnSync(`"${ollama}" create ${m.id} -f "${modelfile}"`, { shell: true, encoding: 'utf8', stdio: 'pipe' });
    if (create.status !== 0) failed += 1;
    else console.log(`  ✓ ${m.id}`);
});

if (!skip) {
    console.log('\nmodels:large — skipped (use --yes to install)');
    process.exit(0);
}
process.exit(failed ? 1 : 0);