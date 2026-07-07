#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { loadBootcampConfig, ensureDirs, bootcampPath, ENGINE_ROOT } = require('./bootcamp-lib.cjs');

const cfg = loadBootcampConfig();
ensureDirs(cfg);

const engineCfgDest = bootcampPath(cfg, 'config/bootcamp.json');
const templatePath = path.join(ENGINE_ROOT, 'training', 'bootcamp', 'config', 'bootcamp.json');

if (fs.existsSync(engineCfgDest)) {
    const existing = JSON.parse(fs.readFileSync(engineCfgDest, 'utf8'));
    if (existing.models) {
        console.log(`bootcamp:init — using existing ${engineCfgDest}`);
    }
} else if (fs.existsSync(templatePath)) {
    fs.mkdirSync(path.dirname(engineCfgDest), { recursive: true });
    fs.copyFileSync(templatePath, engineCfgDest);
    console.log(`bootcamp:init — copied template → ${engineCfgDest}`);
} else {
    fs.mkdirSync(path.dirname(engineCfgDest), { recursive: true });
    fs.writeFileSync(engineCfgDest, JSON.stringify({
        format: 'threshold-bootcamp',
        version: 2,
        root: cfg.root.replace(/\\/g, '/'),
        ollamaHost: 'http://127.0.0.1:11434',
        models: {
            small: {
                name: 'threshold-mini-npc',
                base: 'llama3.2:3b',
                datasets: ['datasets/small/npc.jsonl', 'datasets/small/classify.jsonl'],
                modelfile: 'modelfiles/threshold-mini-npc.Modelfile',
            },
            medium: {
                name: 'threshold-mini-dev',
                base: 'qwen2.5-coder:1.5b-base',
                datasets: ['datasets/medium/compiler.jsonl'],
                modelfile: 'modelfiles/threshold-mini-dev.Modelfile',
            },
            large_dev: {
                name: 'threshold-dev',
                base: 'qwen2.5-coder:7b',
                datasets: ['datasets/large/scenes.jsonl'],
                modelfile: 'modelfiles/threshold-dev.Modelfile',
                downloadRequired: true,
                sizeGb: 4.7,
            },
            large_scenes: {
                name: 'threshold-large-scenes',
                base: 'llama3.1:8b',
                datasets: ['datasets/large/scenes.jsonl'],
                modelfile: 'modelfiles/threshold-large.Modelfile',
                downloadRequired: true,
                sizeGb: 4.9,
            },
        },
    }, null, 2));
}

const engineLink = path.join(ENGINE_ROOT, 'config', 'bootcamp.json');
fs.writeFileSync(engineLink, JSON.stringify({
    format: 'threshold-bootcamp-link',
    version: 2,
    root: cfg.root.replace(/\\/g, '/'),
    note: 'Training data in repo (JSONL + Modelfiles only). Weights stay local via ollama pull. Optional: config/bootcamp.local.json for ramdisk override.',
}, null, 2));

console.log('bootcamp:init — OK');
console.log(`  Root: ${cfg.root}`);
console.log(`  Engine link: ${engineLink}`);
console.log('  Next: npm run bootcamp:build → npm run models:mini');