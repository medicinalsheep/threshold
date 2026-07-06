#!/usr/bin/env node
/**
 * Import raw compiler pair into bootcamp JSONL.
 * npm run bootcamp:import -- --file datasets/raw/pair.json --tier medium
 */
const fs = require('fs');
const path = require('path');
const { loadBootcampConfig, bootcampPath } = require('./bootcamp-lib.cjs');

function arg(name) {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : null;
}

const file = arg('--file');
const tier = arg('--tier') || 'medium';
const task = arg('--task') || (tier === 'small' ? 'npc_chat' : tier === 'large' ? 'scene_script' : 'dev_suggest');

if (!file) {
    console.log(`Usage: npm run bootcamp:import -- --file <path> [--tier small|medium|large] [--task dev_suggest]`);
    process.exit(1);
}

const cfg = loadBootcampConfig();
const abs = path.isAbsolute(file) ? file : bootcampPath(cfg, file);
const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));

const row = {
    task,
    messages: [
        { role: 'user', content: raw.input || raw.prompt || raw.user },
        { role: 'assistant', content: raw.output || raw.code || raw.assistant },
    ],
};

const destMap = {
    small: 'datasets/small/npc.jsonl',
    medium: 'datasets/medium/compiler.jsonl',
    large: 'datasets/large/scenes.jsonl',
};
const dest = bootcampPath(cfg, destMap[tier] || destMap.medium);
fs.appendFileSync(dest, JSON.stringify(row) + '\n');
console.log(`bootcamp:import — appended 1 example → ${dest}`);
console.log('  Next: npm run bootcamp:build && npm run bootcamp:create');