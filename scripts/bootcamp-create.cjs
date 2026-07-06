#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadBootcampConfig, bootcampPath } = require('./bootcamp-lib.cjs');

const args = process.argv.slice(2);
const only = args.includes('--small') ? ['small']
    : args.includes('--medium') ? ['medium']
        : args.includes('--large') ? ['large']
            : ['small', 'medium', 'large'];

const cfg = loadBootcampConfig();
const models = cfg.models || {};
const logDir = bootcampPath(cfg, 'logs');
fs.mkdirSync(logDir, { recursive: true });

function ollamaExe() {
    const local = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe');
    if (fs.existsSync(local)) return local;
    return 'ollama';
}

const ollama = ollamaExe();
console.log(`bootcamp:create — ${ollama}\n`);

let failed = 0;
only.forEach((tier) => {
    const m = models[tier];
    if (!m) return;
    const modelfile = bootcampPath(cfg, m.modelfile);
    if (!fs.existsSync(modelfile)) {
        console.error(`  ✗ ${tier}: missing ${m.modelfile} — run bootcamp:build first`);
        failed += 1;
        return;
    }
    console.log(`  Creating ${m.name} from ${m.modelfile}…`);
    const quoted = `"${modelfile}"`;
    const cmd = process.platform === 'win32'
        ? `"${ollama}" create ${m.name} -f ${quoted}`
        : `${ollama} create ${m.name} -f ${quoted}`;
    const r = spawnSync(cmd, {
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true,
    });
    const logPath = path.join(logDir, `create-${m.name}-${Date.now()}.log`);
    fs.writeFileSync(logPath, (r.stdout || '') + (r.stderr || ''));
    if (r.status !== 0) {
        console.error(`  ✗ ${m.name} failed (see ${logPath})`);
        console.error((r.stderr || '').slice(0, 300));
        failed += 1;
    } else {
        console.log(`  ✓ ${m.name} ready — set AGENTS tier "${tier}" to ${m.name}`);
    }
});

console.log(failed ? '\nbootcamp:create — FAIL' : '\nbootcamp:create — PASS');
console.log('  AGENTS panel → SAVE TIERS → threshold-small / threshold-medium / threshold-large');
process.exit(failed ? 1 : 0);