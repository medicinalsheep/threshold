#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ENGINE_ROOT = path.join(__dirname, '..');
const DEFAULT_BOOTCAMP = path.join(ENGINE_ROOT, 'training', 'bootcamp');

function loadBootcampConfig() {
    let cfg = { root: DEFAULT_BOOTCAMP, engineRepo: ENGINE_ROOT };
    const engineLink = path.join(ENGINE_ROOT, 'config', 'bootcamp.json');
    const localOverride = path.join(ENGINE_ROOT, 'config', 'bootcamp.local.json');
    const nestedCfg = path.join(DEFAULT_BOOTCAMP, 'config', 'bootcamp.json');

    if (fs.existsSync(engineLink)) {
        cfg = { ...cfg, ...JSON.parse(fs.readFileSync(engineLink, 'utf8')) };
    }
    if (fs.existsSync(nestedCfg)) {
        const nested = JSON.parse(fs.readFileSync(nestedCfg, 'utf8'));
        cfg = { ...cfg, ...nested, models: nested.models || cfg.models };
    }
    if (process.env.BOOTCAMP_ROOT) {
        cfg.root = process.env.BOOTCAMP_ROOT;
    }
    if (fs.existsSync(localOverride)) {
        const local = JSON.parse(fs.readFileSync(localOverride, 'utf8'));
        cfg = { ...cfg, ...local, root: local.root || cfg.root };
    }
    return normalizeCfg(cfg);
}

function normalizeCfg(cfg) {
    const raw = cfg.root || DEFAULT_BOOTCAMP;
    const root = path.isAbsolute(raw) || /^[A-Za-z]:/.test(raw)
        ? path.resolve(raw.replace(/\//g, path.sep))
        : path.resolve(ENGINE_ROOT, raw.replace(/^\.\//, ''));
    return { ...cfg, root, engineRepo: ENGINE_ROOT };
}

function bootcampPath(cfg, rel) {
    return path.join(cfg.root, rel.replace(/\//g, path.sep));
}

function readJsonl(filePath) {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => JSON.parse(l));
}

const SYSTEM_PROMPTS = {
    small: `You are Threshold Engine — small-task assistant (NPC dialogue, intent routing).
Reply briefly. Default world is realistic PBR (render mode 4). Retro only if user asks.
NPC: 1-3 sentences, optional [ACTION: ...]. Classify: INTENT + API one line.`,
    medium: `You are Threshold Engine Dev Agent (medium). Return ONLY executable JavaScript.
Default realistic PBR: MeshStandardMaterial, roughness/metalness, userData.textures from GIMP.
Retro Engine.setRenderMode(0-3) ONLY when user explicitly asked. Never World.clearWorld() unless asked.`,
    large: `You are Threshold Engine architect (large). Return ONLY a complete JavaScript IIFE.
Realistic PBR default (mode 4). World.createObject, PlayerController, Physics. GIMP for textures.`,
};

const TIER_PARAMS = {
    small: { temperature: 0.5, num_predict: 128 },
    medium: { temperature: 0.35, num_predict: 1024 },
    large: { temperature: 0.4, num_predict: 2048 },
};

function escapeSystem(text) {
    return String(text).replace(/"""/g, '\\"\\"\\"');
}

function messagesToModelfileBlocks(entries) {
    const lines = [];
    entries.forEach((row) => {
        const msgs = row.messages || [];
        msgs.forEach((m) => {
            const role = m.role === 'assistant' ? 'assistant' : 'user';
            const content = String(m.content || '').trim();
            if (!content.includes('\n') && content.length < 120 && !content.includes('"""')) {
                lines.push(`MESSAGE ${role} ${content}`);
            } else {
                lines.push(`MESSAGE ${role} """`);
                lines.push(content);
                lines.push('"""');
            }
        });
    });
    return lines;
}

function buildModelfile(tier, modelCfg, entries) {
    const params = TIER_PARAMS[tier] || TIER_PARAMS.medium;
    const lines = [
        `# Threshold bootcamp — ${new Date().toISOString()}`,
        `# Tier: ${tier} · Model: ${modelCfg.name} · Examples: ${entries.length}`,
        `# Weights: ollama pull ${modelCfg.base} — not stored in git`,
        `FROM ${modelCfg.base}`,
        '',
        `PARAMETER temperature ${params.temperature}`,
        `PARAMETER num_predict ${params.num_predict}`,
        '',
        `SYSTEM """${escapeSystem(SYSTEM_PROMPTS[tier])}"""`,
        '',
        ...messagesToModelfileBlocks(entries),
        '',
    ];
    return lines.join('\n');
}

function ensureDirs(cfg) {
    const dirs = [
        'config', 'datasets/small', 'datasets/medium', 'datasets/large', 'datasets/raw',
        'modelfiles', 'builds', 'logs',
    ];
    dirs.forEach((d) => fs.mkdirSync(bootcampPath(cfg, d), { recursive: true }));
}

function ollamaExe() {
    const local = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe');
    if (fs.existsSync(local)) return local;
    return 'ollama';
}

module.exports = {
    ENGINE_ROOT,
    DEFAULT_BOOTCAMP,
    loadBootcampConfig,
    bootcampPath,
    readJsonl,
    buildModelfile,
    ensureDirs,
    ollamaExe,
    SYSTEM_PROMPTS,
};