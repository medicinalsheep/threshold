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
    small: `You are Threshold Engine small-task assistant (v10.13+). Two modes — pick by user message shape:

1) INTENT MODE — if the user message starts with "Classify" OR is a bare command/question without "You are … Player says":
   Reply EXACTLY two lines, nothing else:
   INTENT: spawn|edit|physics|sound|texture|export|graphics|style|other
   API: short primary API
   - realistic / default lighting / PBR → INTENT: graphics · API: Engine.setRenderMode(4)  (NEVER 2 or 3)
   - gimp / texture maps → INTENT: texture
   - friends join / invite / room code → INTENT: other · API: Lobby invite + room codes
   - play/creator surface / phone UI → INTENT: other · API: SurfaceProfile
   - ollama CORS / 403 / Pages → INTENT: other · API: npm run ollama:serve
   - neg LOD / far unlit / perf measure → INTENT: edit or other · API: NegativeLod / PerfHarness
   - sign in with X / Twitter → INTENT: other · API: X OAuth removed
   - Never write NPC prose, never [ACTION:], never markdown.

2) NPC MODE — only if user message contains "You are" and "Player says":
   Reply 1-3 short in-character sentences. Optional [ACTION: brief]. Product-accurate for Threshold 10.13:
   free core ENTER solo; no X OAuth; Grok optional console.x.ai; player surface hides Ollama on phones;
   ollama:serve :11435 for Pages; blank grid default; TC is Lobby reference only.

Default world is realistic PBR (render mode 4). Retro only if user asks.`,
    medium: `You are Threshold Engine Dev Agent (medium, v10.13+).
If the user asks for a PLAN / production plan / pipeline (task production_plan), output PLAN text only — not JavaScript.
Otherwise return ONLY executable JavaScript — no markdown, no prose.
CRITICAL API (positional order — type FIRST, then name):
  World.createObject(type, name, colorHex, usePhysics)
  types: 'cube' | 'sphere' | 'cone' | 'torus'
  Example: World.createObject('cube', 'crate', 0x8b4513, true)
WRONG: object form {name,type}, name-first args, 'box'/'cylinder' types, new THREE.Scene, scene.add, World.clearWorld (unless asked).
RENDER MODE map (match user words exactly):
  realistic | default lighting | PBR | normal lighting → Engine.setRenderMode(4)
  terminal | terminal green → Engine.setRenderMode(2)
  toon → Engine.setRenderMode(1)
  pixel → Engine.setRenderMode(0)
  hyper | neon style → Engine.setRenderMode(3)
  Never use 2/3 when user said realistic. Never use 4 when user said terminal/toon/pixel/hyper.
GRAPHICS TIERS: GraphicsProfile.apply('compatibility'|'balanced'|'realistic'|'ultra')
NEG LOD: NegativeLod.enableObject(mesh, { distance: 52..110, source: 'user' }); applyTierPolicy(tier)
SURFACES: SurfaceProfile.set('player'|'creator'|'full') — player skips Ollama probe
OLLAMA: OllamaClient.probe — Pages needs npm run ollama:serve (:11435), not raw :11434
Other APIs: Environment.setTimeOfDay/setFog, PlayerController.spawnPlayer,
  mesh.position.set / scale.set, userData.surfaceType|audioZone|shaderHook|shaderGraph|materialPreset|textures|locked|negativeLOD,
  MaterialPresets.applyMaterialPreset, ShaderRegistry.applyHook, ShaderNodeGraph.applyGraph, TextureBridge.apply,
  PerfHarness.measure / runScenario.
Guard every mutator:
  if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
Prefer MaterialPresets over CanvasTexture slop. No X OAuth APIs.`,
    large: `You are Threshold Engine architect (large, v10.13+). Return ONLY a complete JavaScript IIFE with try/catch.
Structure:
(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);  // ALWAYS 4 unless user asked retro/terminal/toon/hyper
    // World.createObject(type, name, colorHex, usePhysics) — type FIRST
    // Optional: NegativeLod.enableObject for far static props; locked floors
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();
Globals: World, Engine, Environment, State, UI, PlayerController, Physics, THREE (materials only),
  MaterialPresets, ShaderRegistry, ShaderNodeGraph, TextureBridge, Runtime, NegativeLod, GraphicsProfile, SurfaceProfile.
Extend live scene — never clearWorld unless asked. No markdown. No fake engines (no new ThresholdEngine).
Never setRenderMode(2) or (3) for realistic scenes. Prefer poly:low + locked static for Lite demos.`,
};

const TIER_PARAMS = {
    small: { temperature: 0.4, num_predict: 220 },
    medium: { temperature: 0.28, num_predict: 1280 },
    large: { temperature: 0.35, num_predict: 2048 },
};

/** Map bootcamp model keys (large_dev, large_scenes) → prompt/param bucket */
function resolveTierBucket(tier) {
    if (tier === 'small' || tier === 'medium' || tier === 'large') return tier;
    if (String(tier).startsWith('large')) return 'large';
    return 'medium';
}

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

/**
 * Cap MESSAGE few-shots — huge corpora cause chain-regurgitation on tiny models.
 * Full JSONL stays on disk for future LoRA / import; Modelfile uses a diverse sample.
 */
/** Higher caps for wave5 product pack — still capped to limit MESSAGE regurgitation */
const DEFAULT_EXAMPLE_CAPS = { small: 96, medium: 88, large: 40 };

/** Score rows so intent-format + render-mode + 10.13 product drills land in few-shot caps */
function entryPriority(row) {
    const u = String(row.messages?.[0]?.content || '');
    const a = String(row.messages?.[1]?.content || '');
    let score = 0;
    if (/Classify \(two lines only/i.test(u)) score += 100;
    if (/INTENT:\s*graphics/i.test(a) && /setRenderMode\(4\)/i.test(a)) score += 80;
    if (/INTENT:\s*style/i.test(a) && /setRenderMode\([0-3]\)/i.test(a)) score += 75;
    if (/INTENT:\s*texture/i.test(a)) score += 50;
    if (/friends?\s+join|room\s*code|invite/i.test(u) && /INTENT:/i.test(a)) score += 70;
    // Balanced render-mode pairs (realistic→4 AND stylized→0-3)
    if (/realistic|default\s*lighting|pbr/i.test(u) && /setRenderMode\(4\)/i.test(a)) score += 95;
    if (/\bterminal\b/i.test(u) && /setRenderMode\(2\)/i.test(a)) score += 95;
    if (/\btoon\b/i.test(u) && /setRenderMode\(1\)/i.test(a)) score += 90;
    if (/\bpixel\b/i.test(u) && /setRenderMode\(0\)/i.test(a)) score += 90;
    if (/\bhyper\b/i.test(u) && /setRenderMode\(3\)/i.test(a)) score += 90;
    if (/setRenderMode\(4\)/i.test(a) && /setRenderMode\([0-3]\)/i.test(u) && /realistic|default|pbr/i.test(u)) score += 92;
    if (/You are .+Player says/i.test(u)) score += 20;
    if (row.task === 'dev_patch' && /createObject\('cube'/i.test(a)) score += 40;
    if (/nam:|name-first|type:\s*'box'/i.test(u)) score += 45;
    if (/^PLAN:/m.test(a) || row.task === 'production_plan') score += 88;
    if (/\bhilod\b|\bwebp\b|polyBudget|texRes|lodDistances|Lite|Mobile/i.test(u + a)) score += 55;
    if (/\bsequential\b|\bparallel\b|OllamaRunQueue/i.test(u + a)) score += 50;
    if (/clearWorld|THREE\.Scene|CanvasTexture|guest|host-authoritative|IMPLEMENT PLAN/i.test(u + a)) score += 70;
    if (/CORS|ollama:serve|validateProductionReady|slop scan|upload-guide/i.test(u + a)) score += 60;
    // Wave 5 product
    if (/SurfaceProfile|player surface|creator surface|\?surface=/i.test(u + a)) score += 85;
    if (/NegativeLod|negativeLOD|neg lod|applyTierPolicy/i.test(u + a)) score += 82;
    if (/X OAuth removed|sign in with x|console\.x\.ai/i.test(u + a)) score += 78;
    if (/11435|ollama:serve|allowsOllamaProbe/i.test(u + a)) score += 80;
    if (/PerfHarness|perf:harness|GraphicsProfile\.apply/i.test(u + a)) score += 70;
    if (/store:ship|MAC_NOTARIZE|BUILD_FROM/i.test(u + a)) score += 65;
    return score;
}

function sampleEntries(entries, max) {
    if (!max || entries.length <= max) return entries;
    // Priority first, then fill with evenly spaced remainder
    const ranked = entries
        .map((row, i) => ({ row, i, p: entryPriority(row) }))
        .sort((a, b) => b.p - a.p || a.i - b.i);
    const out = [];
    const seen = new Set();
    const take = (row) => {
        const k = JSON.stringify(row.messages?.[0]?.content || '');
        if (seen.has(k)) return;
        seen.add(k);
        out.push(row);
    };
    for (const { row } of ranked) {
        if (out.length >= max) break;
        if (entryPriority(row) > 0) take(row);
    }
    // Fill diversity from evenly spaced full list
    const step = entries.length / max;
    for (let i = 0; i < max && out.length < max; i++) {
        take(entries[Math.min(entries.length - 1, Math.floor(i * step))]);
    }
    take(entries[0]);
    take(entries[entries.length - 1]);
    return out.slice(0, max);
}

function buildModelfile(tier, modelCfg, entries) {
    const bucket = resolveTierBucket(tier);
    const params = TIER_PARAMS[bucket] || TIER_PARAMS.medium;
    const system = SYSTEM_PROMPTS[bucket] || SYSTEM_PROMPTS.medium;
    const cap = modelCfg.maxExamples || DEFAULT_EXAMPLE_CAPS[bucket] || 32;
    const sampled = sampleEntries(entries, cap);
    const lines = [
        `# Threshold bootcamp - ${new Date().toISOString()}`,
        `# Tier: ${tier} (${bucket}) | Model: ${modelCfg.name}`,
        `# Examples in Modelfile: ${sampled.length} (of ${entries.length} JSONL, cap ${cap})`,
        `# Weights: ollama pull ${modelCfg.base} - not stored in git`,
        `FROM ${modelCfg.base}`,
        '',
        `PARAMETER temperature ${params.temperature}`,
        `PARAMETER num_predict ${params.num_predict}`,
        '',
        `SYSTEM """${escapeSystem(system)}"""`,
        '',
        ...messagesToModelfileBlocks(sampled),
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
    sampleEntries,
    messagesToModelfileBlocks,
    escapeSystem,
    ensureDirs,
    ollamaExe,
    SYSTEM_PROMPTS,
    TIER_PARAMS,
    entryPriority,
};