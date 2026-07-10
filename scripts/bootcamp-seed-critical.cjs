#!/usr/bin/env node
/**
 * Critical few-shot corrections: intent format discipline + render mode 4 defaults.
 * Merges into datasets and writes datasets/small/critical.jsonl (always prioritized in Modelfile).
 *
 * Usage: node scripts/bootcamp-seed-critical.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DS = path.join(ROOT, 'training', 'bootcamp', 'datasets');

function pair(task, user, assistant) {
    return {
        task,
        messages: [
            { role: 'user', content: user },
            { role: 'assistant', content: assistant },
        ],
    };
}

/** Runtime-matching intent user wrapper (must match agentPrompts.js) */
function classifyUser(msg) {
    return `Classify (two lines only — INTENT then API):\n${msg}`;
}

function intent(msg, name, api) {
    return pair('intent_classify', classifyUser(msg), `INTENT: ${name}\nAPI: ${api}`);
}

function npc(persona, player, reply) {
    return pair('npc_chat', `You are ${persona}. Player says: ${player}`, reply);
}

function patch(broken, fixed) {
    return pair('dev_patch', `Fix this Threshold script:\n\`\`\`js\n${broken}\n\`\`\``, fixed);
}

function suggest(comment, code) {
    return pair('dev_suggest', `Improve or complete:\n\`\`\`js\n${comment}\n\`\`\``, code);
}

// ── Intent format: always INTENT/API, never prose/NPC ─────────────────────

const INTENT_FORMAT = [
    intent('spawn a red box', 'spawn', 'World.createObject'),
    intent('how do friends join', 'other', 'Lobby invite + room codes'),
    intent('how do friends join my session', 'other', 'Lobby invite + room codes'),
    intent('where is multiplayer invite', 'other', 'Lobby invite panel'),
    intent('can guests edit the world', 'other', 'host-authoritative sync'),
    intent('add gimp texture to the crate', 'texture', 'userData.textures + textures:watch'),
    intent('gimp maps on the floor please', 'texture', 'userData.textures + textures:watch'),
    intent('texture that thing with gimp', 'texture', 'userData.textures + textures:watch'),
    intent('watch folder for new PBR maps', 'texture', 'textures:watch'),
    intent('default realistic lighting', 'graphics', 'Engine.setRenderMode(4)'),
    intent('realistic pbr please', 'graphics', 'Engine.setRenderMode(4)'),
    intent('switch to PBR realistic mode', 'graphics', 'Engine.setRenderMode(4)'),
    intent('use realistic lighting', 'graphics', 'Engine.setRenderMode(4)'),
    intent('default lighting', 'graphics', 'Engine.setRenderMode(4)'),
    intent('make it look realistic', 'graphics', 'Engine.setRenderMode(4)'),
    intent('normal lighting not retro', 'graphics', 'Engine.setRenderMode(4)'),
    intent('make it look retro terminal green', 'style', 'Engine.setRenderMode(2)'),
    intent('terminal green mode', 'style', 'Engine.setRenderMode(2)'),
    intent('switch to toon shading', 'style', 'Engine.setRenderMode(1)'),
    intent('pixel art render mode', 'style', 'Engine.setRenderMode(0)'),
    intent('enable hyper neon style', 'style', 'Engine.setRenderMode(3)'),
    intent('export my game to android', 'export', 'ExportWizard'),
    intent('what keys do I use to fly', 'other', 'HelpMenu + CONTROLS'),
    intent('open the compiler and fix my script', 'other', 'Compiler'),
    intent('connect ollama for NPC chat', 'other', 'AgentPortal + OllamaClient'),
    intent('apply wet_hero material', 'style', 'MaterialPresets + userData.materialPreset'),
    intent('add rain and fog', 'edit', 'State.env + Environment'),
    intent('enable physics on the barrel', 'physics', 'Physics + usePhysics true'),
    // Ambiguous questions that must stay INTENT format (not NPC prose)
    intent('how do I pause to build', 'other', 'UI.togglePause EDIT'),
    intent('how do I start building with AI', 'other', 'AgentPortal + AI Build Station'),
    intent('where is the compiler', 'other', 'TOOLS Compiler'),
    intent('what is render mode 4', 'other', 'Engine.setRenderMode(4)'),
    intent('who can edit multiplayer', 'other', 'host-authoritative sync'),
];

// Bare messages too (legacy / chat without prefix) — same answers
const INTENT_BARE = [
    pair('intent_classify', 'default realistic lighting', 'INTENT: graphics\nAPI: Engine.setRenderMode(4)'),
    pair('intent_classify', 'realistic pbr please', 'INTENT: graphics\nAPI: Engine.setRenderMode(4)'),
    pair('intent_classify', 'how do friends join', 'INTENT: other\nAPI: Lobby invite + room codes'),
    pair('intent_classify', 'add gimp texture to the crate', 'INTENT: texture\nAPI: userData.textures + textures:watch'),
    pair('intent_classify', 'texture that thing with gimp', 'INTENT: texture\nAPI: userData.textures + textures:watch'),
    pair('intent_classify', 'make it look realistic', 'INTENT: graphics\nAPI: Engine.setRenderMode(4)'),
    pair('intent_classify', 'can guests edit', 'INTENT: other\nAPI: host-authoritative sync'),
];

// ── NPC: only when "You are … Player says" ─────────────────────────────────

const NPC_FORMAT = [
    npc('a multiplayer host buddy', 'How do friends join?',
        'Share the room code or invite link from the lobby. Guests join live; only the host edits the world.'),
    npc('a creative assistant', 'Can AI help me build?',
        'Walk to the AI Build Station and press F, or tap the AI chip — describe what you want and generate a script.'),
    npc('a grid guide', 'How do I pause to build?',
        'Tap EDIT top-left or pause the world — physics freezes so you can place objects safely.'),
    npc('Nikola, inventor', 'What is render mode 4?',
        'Mode 4 is realistic PBR — Threshold default. Retro modes only when you ask for terminal or toon.'),
    npc('a realism coach', 'Make lighting realistic',
        'Stay on render mode 4 for PBR. Avoid terminal or hyper modes unless you want a stylized look.'),
    npc('a GIMP coach', 'How do textures load?',
        'Name the mesh to match the manifest, save maps under textures/, run textures:watch for live SYNC.'),
];

// ── Render mode 4 hard fixes (medium) ─────────────────────────────────────

const RENDER_FIXES = [
    patch(
        "Engine.setRenderMode(3);\n// user asked for realistic / default lighting",
        'Engine.setRenderMode(4); // realistic PBR default',
    ),
    patch(
        "Engine.setRenderMode(2);\n// user asked for realistic PBR",
        'Engine.setRenderMode(4); // realistic PBR — terminal only if user asked retro',
    ),
    patch(
        "Engine.setRenderMode(1);\n// default lighting",
        'Engine.setRenderMode(4);',
    ),
    patch(
        "Engine.setRenderMode(0);\n// normal lighting please",
        'Engine.setRenderMode(4);',
    ),
    patch(
        "Engine.setRenderMode(99);",
        'Engine.setRenderMode(4);',
    ),
    pair('dev_patch',
        'User asked: "default realistic lighting". Fix:\n```js\nEngine.setRenderMode(3);\n```',
        'Engine.setRenderMode(4);',
    ),
    pair('dev_patch',
        'User asked: "realistic pbr please". Fix:\n```js\nEngine.setRenderMode(2);\n```',
        'Engine.setRenderMode(4);',
    ),
    pair('dev_suggest',
        'Complete — user wants DEFAULT realistic scene lighting only:\n```js\n// set correct render mode\n```',
        'Engine.setRenderMode(4);',
    ),
    pair('dev_suggest',
        'Complete — user explicitly asked RETRO terminal green (not realistic):\n```js\n// set render mode for terminal\n```',
        'Engine.setRenderMode(2);',
    ),
    pair('dev_suggest',
        'Complete — user explicitly asked toon (not realistic):\n```js\n// set render mode for toon\n```',
        'Engine.setRenderMode(1);',
    ),
    pair('dev_suggest',
        'Complete — user explicitly asked hyper neon (not realistic):\n```js\n// set render mode for hyper\n```',
        'Engine.setRenderMode(3);',
    ),
    pair('scene_script',
        'Generate realistic Threshold IIFE: one cube — default realistic lighting only',
        `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);
    const m = World.createObject('cube', 'box', 0x888888, false);
    m.position.set(0, 0.5, -2);
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`,
    ),
    pair('scene_script',
        'Generate realistic Threshold IIFE: locked floor — MUST use setRenderMode(4) not 2 or 3',
        `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);
    const floor = World.createObject('cube', 'floor', 0x3a3a40, false);
    floor.scale.set(12, 0.2, 12);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`,
    ),
];

function mergeFile(rel, rows) {
    const file = path.join(DS, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const existing = fs.existsSync(file)
        ? fs.readFileSync(file, 'utf8').trim().split(/\n+/).filter(Boolean).map((l) => {
            try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean)
        : [];
    const keys = new Set(existing.map((r) => JSON.stringify(r.messages?.[0]?.content || '')));
    let added = 0;
    for (const r of rows) {
        const k = JSON.stringify(r.messages?.[0]?.content || '');
        if (keys.has(k)) continue;
        existing.push(r);
        keys.add(k);
        added++;
    }
    fs.writeFileSync(file, `${existing.map((r) => JSON.stringify(r)).join('\n')}\n`);
    return { rel, added, total: existing.length };
}

function writeCritical(rows) {
    const file = path.join(DS, 'small', 'critical.jsonl');
    // de-dupe
    const seen = new Set();
    const out = [];
    for (const r of rows) {
        const k = JSON.stringify(r.messages?.[0]?.content || '');
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(r);
    }
    fs.writeFileSync(file, `${out.map((r) => JSON.stringify(r)).join('\n')}\n`);
    console.log(`  small/critical.jsonl: ${out.length} priority few-shots`);
    return out.length;
}

function main() {
    console.log('bootcamp:seed:critical — intent format + render mode 4\n');

    const criticalSmall = [...INTENT_FORMAT, ...INTENT_BARE, ...NPC_FORMAT];
    writeCritical(criticalSmall);

    console.log(mergeFile(path.join('small', 'classify.jsonl'), [...INTENT_FORMAT, ...INTENT_BARE]));
    console.log(mergeFile(path.join('small', 'npc.jsonl'), NPC_FORMAT));
    console.log(mergeFile(path.join('medium', 'compiler.jsonl'), RENDER_FIXES.filter((r) => r.task !== 'scene_script')));
    console.log(mergeFile(path.join('large', 'scenes.jsonl'), RENDER_FIXES.filter((r) => r.task === 'scene_script')));

    // Rebuild patch/suggest splits
    const full = fs.readFileSync(path.join(DS, 'medium', 'compiler.jsonl'), 'utf8')
        .trim().split(/\n+/).filter(Boolean).map((l) => JSON.parse(l));
    const patches = full.filter((r) => r.task === 'dev_patch');
    const suggests = full.filter((r) => r.task === 'dev_suggest');
    fs.writeFileSync(path.join(DS, 'medium', 'patches.jsonl'), `${patches.map((r) => JSON.stringify(r)).join('\n')}\n`);
    fs.writeFileSync(path.join(DS, 'medium', 'suggests.jsonl'), `${suggests.map((r) => JSON.stringify(r)).join('\n')}\n`);
    console.log(`  patches/suggests rebuilt: ${patches.length}/${suggests.length}`);
    console.log('\nNext: npm run bootcamp:build && npm run models:mini');
}

main();
