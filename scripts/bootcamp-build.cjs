#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { loadBootcampConfig, bootcampPath, readJsonl, buildModelfile } = require('./bootcamp-lib.cjs');

const cfg = loadBootcampConfig();
const models = cfg.models || {};
let built = 0;

console.log(`bootcamp:build — ${cfg.root}\n`);

Object.entries(models).forEach(([tier, modelCfg]) => {
    const datasets = modelCfg.datasets || [];
    const entries = [];
    datasets.forEach((rel) => {
        const p = bootcampPath(cfg, rel);
        const rows = readJsonl(p);
        console.log(`  ${tier}: ${rel} → ${rows.length} examples`);
        entries.push(...rows);
    });
    const out = bootcampPath(cfg, modelCfg.modelfile);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buildModelfile(tier, modelCfg, entries));
    const capNote = modelCfg.maxExamples ? ` cap=${modelCfg.maxExamples}` : '';
    console.log(`  → ${modelCfg.modelfile} (${entries.length} JSONL${capNote}; see Modelfile header for few-shot count)\n`);
    built += 1;
});

console.log(`bootcamp:build — ${built} modelfile(s) written`);