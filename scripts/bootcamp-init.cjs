#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { loadBootcampConfig, ensureDirs, bootcampPath, ENGINE_ROOT } = require('./bootcamp-lib.cjs');

const cfg = loadBootcampConfig();
ensureDirs(cfg);

const engineCfgDest = bootcampPath(cfg, 'config/bootcamp.json');
const engineCfgSrc = path.join(ENGINE_ROOT, 'config', 'bootcamp.json');
if (fs.existsSync(engineCfgSrc) && fs.existsSync(engineCfgDest)) {
    const z = JSON.parse(fs.readFileSync(engineCfgDest, 'utf8'));
    if (z.models) {
        console.log(`bootcamp:init — using existing ${engineCfgDest}`);
    }
}
if (!fs.existsSync(engineCfgDest)) {
    fs.writeFileSync(engineCfgDest, JSON.stringify({
        format: 'threshold-bootcamp',
        version: 1,
        root: cfg.root.replace(/\\/g, '/'),
        engineRepo: ENGINE_ROOT.replace(/\\/g, '/'),
        ollamaHost: 'http://127.0.0.1:11434',
        models: {
            small: { name: 'threshold-small', base: 'llama3.2:3b', datasets: ['datasets/small/npc.jsonl', 'datasets/small/classify.jsonl'], modelfile: 'modelfiles/threshold-small.Modelfile' },
            medium: { name: 'threshold-medium', base: 'qwen2.5-coder:7b', datasets: ['datasets/medium/compiler.jsonl'], modelfile: 'modelfiles/threshold-medium.Modelfile' },
            large: { name: 'threshold-large', base: 'llama3.1:8b', datasets: ['datasets/large/scenes.jsonl'], modelfile: 'modelfiles/threshold-large.Modelfile' },
        },
    }, null, 2));
}

const engineLink = path.join(ENGINE_ROOT, 'config', 'bootcamp.json');
fs.writeFileSync(engineLink, JSON.stringify({
    format: 'threshold-bootcamp-link',
    version: 1,
    root: cfg.root.replace(/\\/g, '/'),
    note: 'Training data on ramdisk Z:. Run bootcamp:build and bootcamp:create from engine repo.',
}, null, 2));

console.log(`bootcamp:init — OK`);
console.log(`  Root: ${cfg.root}`);
console.log(`  Engine link: ${engineLink}`);
console.log('  Next: npm run bootcamp:build → bootcamp:create');