#!/usr/bin/env node
/**
 * Create Threshold mobile mini — quality-first at phone-friendly size.
 *
 * Base: llama3.2:1b (~1.3 GB Q4)
 *   · Flagship phones (8GB+ RAM): comfortable for short intent + NPC
 *   · Mid phones: still usable; keep replies short (num_predict 128, num_ctx 2048)
 *   · Not a Compiler substitute — use cloud Grok for large/codegen on mobile
 *
 * Usage: npm run models:mobile
 * Publish: npm run models:publish -- --mobile
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
    ENGINE_ROOT,
    loadBootcampConfig,
    bootcampPath,
    ollamaExe,
    readJsonl,
    sampleEntries,
    messagesToModelfileBlocks,
    escapeSystem,
} = require('./bootcamp-lib.cjs');

const MOBILE = {
    id: 'threshold-mini-mobile',
    base: 'llama3.2:1b',
    baseSizeGb: 1.3,
    // 1B: fewer, higher-signal shots beat huge dumps
    maxExamples: 28,
    datasets: [
        'datasets/small/critical.jsonl',
        'datasets/small/safety_npc.jsonl',
        'datasets/small/guide.jsonl',
        'datasets/small/classify.jsonl',
    ],
    modelfile: 'training/bootcamp/modelfiles/threshold-mini-mobile.Modelfile',
};

const MOBILE_SYSTEM = `You are Threshold mobile mini (1B). VERY short answers.
MODE A — Intent (default for commands / "Classify..."):
  Output EXACTLY two lines and STOP:
  INTENT: spawn|edit|physics|sound|texture|export|graphics|style|other
  API: one short name
  Examples:
  - spawn/add/create box/crate/sphere → INTENT: spawn / API: World.createObject
  - realistic lighting → INTENT: graphics / API: Engine.setRenderMode(4)
  - gimp/texture → INTENT: texture / API: textures:watch
  - export/ship → INTENT: export / API: ExportWizard
  - friends join / guest edit → INTENT: other / API: Lobby host
  NO third line. NO explanation.
MODE B — NPC only if text has "You are" AND "Player says": max 2 short sentences.
Default PBR mode 4.`;

function buildMobileModelfile(entries) {
    const sampled = sampleEntries(entries, MOBILE.maxExamples);
    return [
        `# Threshold mobile mini - ${new Date().toISOString()}`,
        `# Model: ${MOBILE.id} | Base: ${MOBILE.base} | Few-shot: ${sampled.length}/${entries.length}`,
        `# Phone: short context + short replies; flagship can run 1B well`,
        `FROM ${MOBILE.base}`,
        '',
        'PARAMETER temperature 0.4',
        'PARAMETER num_predict 128',
        'PARAMETER num_ctx 2048',
        '',
        `SYSTEM """${escapeSystem(MOBILE_SYSTEM)}"""`,
        '',
        ...messagesToModelfileBlocks(sampled),
        '',
    ].join('\n');
}

function main() {
    const ollama = ollamaExe();
    const cfg = loadBootcampConfig();
    console.log('models:mobile — quality-first llama3.2:1b Threshold agent\n');

    const entries = [];
    for (const rel of MOBILE.datasets) {
        const p = bootcampPath(cfg, rel);
        const rows = readJsonl(p);
        console.log(`  ${rel} → ${rows.length}`);
        entries.push(...rows);
    }

    const out = path.join(ENGINE_ROOT, MOBILE.modelfile.replace(/\//g, path.sep));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buildMobileModelfile(entries));
    console.log(`  → ${MOBILE.modelfile}\n`);

    console.log(`  Pull ${MOBILE.base} (~${MOBILE.baseSizeGb} GB)…`);
    let r = spawnSync(`"${ollama}" pull ${MOBILE.base}`, { shell: true, encoding: 'utf8', stdio: 'inherit' });
    if (r.status !== 0) process.exit(1);

    console.log(`  Create ${MOBILE.id}…`);
    r = spawnSync(`"${ollama}" create ${MOBILE.id} -f "${out}"`, { shell: true, encoding: 'utf8', stdio: 'inherit' });
    if (r.status !== 0) process.exit(1);

    console.log(`
models:mobile — PASS
  ollama run ${MOBILE.id}
  Flagship phones: 1B is a good quality/size tradeoff today
  Mid phones: short NPC/intent only; codegen → cloud Grok
`);
}

main();
