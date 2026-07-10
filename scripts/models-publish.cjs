#!/usr/bin/env node
/**
 * Tag + push Threshold mini models to the signed-in ollama.com namespace.
 *
 * Usage:
 *   npm run models:publish              # npc + dev
 *   npm run models:publish -- --mobile  # + mobile 1B
 *   npm run models:publish -- --all
 *   npm run models:publish -- --namespace medicinalsheep
 */
const { spawnSync } = require('child_process');
const { ollamaExe } = require('./bootcamp-lib.cjs');

const args = process.argv.slice(2);
const nsFlag = args.indexOf('--namespace');
const namespace = (nsFlag >= 0 && args[nsFlag + 1]) || process.env.OLLAMA_NAMESPACE || 'medicinalsheep';
const wantMobile = args.includes('--mobile') || args.includes('--all');
const wantAll = args.includes('--all');
const only = args.includes('--npc') ? 'npc' : args.includes('--dev') ? 'dev' : args.includes('--mobile-only') ? 'mobile' : null;

const MODELS = [
    { local: 'threshold-mini-npc', remote: `${namespace}/threshold-mini-npc`, group: 'npc' },
    { local: 'threshold-mini-dev', remote: `${namespace}/threshold-mini-dev`, group: 'dev' },
    { local: 'threshold-mini-mobile', remote: `${namespace}/threshold-mini-mobile`, group: 'mobile' },
];

function run(cmd) {
    console.log(`> ${cmd}`);
    const r = spawnSync(cmd, { shell: true, encoding: 'utf8', stdio: 'inherit' });
    return r.status === 0;
}

function main() {
    const ollama = ollamaExe();
    console.log(`models:publish — namespace: ${namespace}\n`);
    console.log('Requires: ollama signin (already signed in shows no prompt)\n');

    let list = MODELS;
    if (only) list = MODELS.filter((m) => m.group === only);
    else if (!wantMobile && !wantAll) list = MODELS.filter((m) => m.group !== 'mobile');
    else if (wantMobile && !wantAll) list = MODELS; // npc+dev+mobile when --mobile

    if (wantMobile || wantAll || only === 'mobile') {
        // ensure mobile exists locally if publishing it
        const hasMobile = list.some((m) => m.group === 'mobile');
        if (hasMobile) {
            const check = spawnSync(`"${ollama}" list`, { shell: true, encoding: 'utf8' });
            if (!String(check.stdout || '').includes('threshold-mini-mobile')) {
                console.log('threshold-mini-mobile missing locally — run: npm run models:mobile\n');
            }
        }
    }

    let failed = 0;
    for (const m of list) {
        console.log(`\n── ${m.local} → ${m.remote} ──`);
        if (!run(`"${ollama}" cp ${m.local} ${m.remote}`)) {
            console.error(`  ✗ cp failed (create local model first)`);
            failed += 1;
            continue;
        }
        if (!run(`"${ollama}" push ${m.remote}`)) {
            console.error(`  ✗ push failed`);
            failed += 1;
            continue;
        }
        console.log(`  ✓ https://ollama.com/${m.remote}`);
    }

    console.log(failed ? `\nmodels:publish — FAIL (${failed})` : '\nmodels:publish — PASS');
    console.log(`
Users pull with:
  ollama pull ${namespace}/threshold-mini-npc
  ollama pull ${namespace}/threshold-mini-dev
  ollama pull ${namespace}/threshold-mini-mobile
`);
    process.exit(failed ? 1 : 0);
}

main();
