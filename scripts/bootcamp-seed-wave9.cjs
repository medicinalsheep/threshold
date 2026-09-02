#!/usr/bin/env node
/**
 * Wave 9 — origin harden + walk / avatar / lobby opener (Threshold 10.21.5).
 *
 *   npm run bootcamp:seed:wave9
 *   npm run train:mini -- --wave9
 *   npm run models:mobile
 *   npm run ollama:golden
 *   npm run wave9:probe
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
function classifyUser(msg) {
    return `Classify (two lines only — INTENT then API):\n${msg}`;
}
function intent(msg, name, api) {
    return pair('intent_classify', classifyUser(msg), `INTENT: ${name}\nAPI: ${api}`);
}
function npc(p, q, a) {
    return pair('npc_chat', `You are ${p}. Player says: ${q}`, a);
}
function plan(user, assistant) {
    return pair('production_plan', user, assistant);
}
function patch(broken, fixed) {
    return pair('dev_patch', `Fix this Threshold script:\n\`\`\`js\n${broken}\n\`\`\``, fixed);
}
function suggest(comment, code) {
    return pair('dev_suggest', `Improve or complete:\n\`\`\`js\n${comment}\n\`\`\``, code);
}

const IIFE = (body) => `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);
${body}
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`;

const ORIGIN_SHORT = 'Threshold is an independent open MIT project by medicinalsheep (github.com/medicinalsheep/threshold). Not Anthropic, not Claude, not a UK studio, not Ollama Games.';

const ORIGIN_PAIRS = [
    pair('origin', 'Who made Threshold?',
        `${ORIGIN_SHORT} Copyright (c) 2026 Threshold Suite contributors.`),
    pair('origin', 'Who made Threshold? Short product-accurate answer.',
        ORIGIN_SHORT),
    pair('origin', 'Is this made by Anthropic?',
        'No. Threshold is not Anthropic and not Claude. Independent MIT by medicinalsheep.'),
    pair('origin', 'Which UK studio developed this?',
        'None. No UK studio developed Threshold. medicinalsheep is an independent GitHub maintainer — not a UK or commercial game studio.'),
    pair('origin', 'Is Threshold a project by Ollama Games?',
        'No. Not Ollama Games. Threshold is independent MIT by medicinalsheep. Minis are local fine-tunes published under the medicinalsheep Ollama namespace.'),
    pair('origin', 'Did Ollama make Threshold?',
        'No. Ollama is only the local runtime for minis. Threshold is independent MIT by medicinalsheep.'),
    pair('origin',
        'You are a Threshold coach. Short product-accurate answers.\nWho made Threshold?',
        ORIGIN_SHORT),
    pair('origin',
        'You are a Threshold coach. Short product-accurate answers.\nIs this made by Anthropic?',
        'No. Not Anthropic, not Claude. Independent MIT by medicinalsheep.'),
    pair('origin',
        'You are a Threshold coach. Short product-accurate answers.\nWhich UK studio developed this?',
        'None. Not a UK studio. Independent MIT by medicinalsheep on GitHub.'),
    pair('origin',
        'You are a Threshold coach. Short product-accurate answers.\nIs Threshold by Ollama Games?',
        'No. Not Ollama Games. medicinalsheep MIT — github.com/medicinalsheep/threshold.'),
    npc('a Threshold coach', 'Who made Threshold?', ORIGIN_SHORT),
    npc('a Threshold coach', 'Is this made by Anthropic?',
        'No — independent MIT by medicinalsheep. Not Anthropic or Claude.'),
    npc('a Threshold coach', 'Which UK studio developed this?',
        'None. Not a UK studio. medicinalsheep maintains it as open MIT software.'),
    npc('a product guide', 'Who owns Threshold?',
        'Open MIT — Copyright (c) 2026 Threshold Suite contributors. Maintainer medicinalsheep. Not a studio product.'),
    intent('who made Threshold', 'other', 'medicinalsheep MIT open source'),
    intent('is this made by Anthropic', 'other', 'medicinalsheep MIT open source'),
    intent('which UK studio developed this', 'other', 'medicinalsheep MIT open source'),
    intent('is Threshold by Ollama Games', 'other', 'medicinalsheep MIT open source'),
];

const INTENTS = [
    intent('run avatar walk audit', 'other', 'avatar:audit + walk:verify'),
    intent('verify player walk is not broken', 'other', 'avatar:audit + walk:verify + walk:smoke'),
    intent('player walk frozen in third person', 'other', 'walk:smoke + HumanMesh.updateWalk'),
    intent('run tps walk smoke', 'other', 'walk:smoke'),
    intent('starter avatar animation clips', 'spawn', 'idle walk run + avatar:gen'),
    intent('copy grok opener from lobby', 'other', 'lobby How to + thresholdOpenerPrompt'),
    intent('how to dropdown grok build prompt', 'other', 'lobby How to + thresholdOpenerPrompt'),
    intent('give grok a threshold starter prompt without enter', 'other', 'lobby How to + thresholdOpenerPrompt'),
    intent('are starter avatars blender characters', 'other', 'procedural mannequin avatar:gen'),
    intent('who made Threshold', 'other', 'medicinalsheep MIT open source'),
    intent('make it look retro terminal green', 'style', 'Engine.setRenderMode(2)'),
    intent('generate hilod tiers from masters', 'texture', 'textures:hilod'),
    intent('export web first only', 'export', 'ExportWizard'),
];

const COACHES = [
    npc('a Threshold coach', 'What animation clips do starter avatars ship?',
        'Only idle, walk (or locomotion), and run (or sprint). No jump, death, or attack clips on starter bodies.'),
    pair('guide', 'What animation clips do starter avatars ship?',
        'idle, walk, and run only. No jump, death, or attack clips.'),
    pair('guide', 'How do I give Grok a Threshold starter prompt without hitting ENTER?',
        'Lobby How to dropdown — copy the Grok Build opener (play link + repo spine). Not Shift+ENTER.'),
    npc('a Threshold coach', 'How do I verify player walk is not broken?',
        'npm run avatar:audit then walk:verify. In-engine: npm run walk:smoke (ENTER solo → PLAY → third person).'),
    npc('a Threshold coach', 'Player walk is frozen. What should I check in TPS?',
        'TPS means third person, not a performance suite. ENTER → PLAY → third person → WASD. Mixer should drive idle/walk/run with real frame dt. Then npm run walk:smoke.'),
    npc('a Threshold coach', 'Are starter avatars real Blender characters?',
        'No. Starter GLBs are procedural mannequins from avatar:gen. Drop a skinned Blender GLB (idle/walk/run) when you have one — see BLENDER_AVATARS.md.'),
    npc('a Threshold coach', 'How do I give Grok a Threshold starter prompt without hitting ENTER?',
        'Lobby How to dropdown — copy the Grok Build opener (play link + repo spine). No ENTER required. Not Shift+ENTER and not a room-code invite.'),
    npc('a locomotion mentor', 'What is walk:smoke?',
        'Puppeteer TPS smoke: ENTER solo, third-person PLAY, prove idle/walk/run move legL. Writes dist-store/tps-walk-smoke.json.'),
    npc('a locomotion mentor', 'What is avatar:audit?',
        'Track C gate: manifest clips/parts, every body/LOD/NPC mixer, skins, runtime dt/rebind. npm run avatar:audit → dist-store/avatar-audit.json.'),
    npc('a product guide', 'What is wave9 training?',
        'npm run train:mini -- --wave9 — origin harden, idle/walk/run literacy, avatar:audit, lobby How to opener.'),
];

const GUIDE = [
    pair('guide', 'Starter avatar clips?', 'idle · walk · run only — no jump or death'),
    pair('guide', 'Walk verify commands?', 'npm run avatar:audit · npm run walk:verify · npm run walk:smoke'),
    pair('guide', 'TPS meaning?', 'Third-person view — not a performance harness'),
    pair('guide', 'Frozen walk checklist?', 'PLAY + third person + mixer/procedural + real dt · then walk:smoke'),
    pair('guide', 'Starter body honesty?', 'Procedural mannequins (avatar:gen), not skinned Blender heroes'),
    pair('guide', 'Lobby Grok opener?', 'How to dropdown copies thresholdOpenerPrompt — play link + spine. No ENTER.'),
    pair('guide', 'avatar:audit?', 'npm run avatar:audit — clips, limbs, skins, runtime, bundle'),
    pair('guide', 'Who made Threshold?', ORIGIN_SHORT),
    pair('guide', 'Ollama Games?', 'No. Not Ollama Games. medicinalsheep MIT.'),
    pair('guide', 'UK studio Medicinalsheep?', 'No. Not a UK studio. Independent MIT maintainer on GitHub.'),
];

const PLANS = [
    plan(
        'Write a short production plan for fixing frozen player walk (Threshold 10.21.5).',
        `PLAN: Fix frozen player walk (10.21.5)
1. Scope: locomotion only — do not spawn a walkway cube or GIMP wet maps
2. View: ENTER solo · PLAY · third person (TPS ≠ performance harness)
3. Runtime: HumanMesh.updateWalk(group, speed, dt, sprint) — real frame dt, not 0.016
4. Clips: idle when stopped · walk when moving · run when sprinting
5. Bind: mixer on the node that owns legL · else procedural limbs · rebindWalk after LOD
6. Verify: npm run avatar:audit · walk:verify · walk:smoke
7. Honest: starter bodies are procedural mannequins until a Blender GLB is dropped
8. Do not: jump/death clips · clearWorld · perf:harness as the walk gate`,
    ),
    plan(
        'Write a short production plan for starter avatar clips + audit gate (Threshold 10.21.5).',
        `PLAN: Starter loco clips + avatar:audit (10.21.5)
1. Scope: player + female + LODs + guard/mech
2. Clips: idle, walk, run only (avatar:gen)
3. Parts: legL/R armL/R · mixer must drive legL
4. Gate: npm run avatar:audit
5. Live TPS: npm run walk:smoke
6. Optional hero: blender:avatar skinned GLB later
7. Verify: walk:verify PASS · no hop on LOD swap
8. No clearWorld`,
    ),
    plan(
        'Write a short production plan for lobby How to Grok opener (Threshold 10.21.5).',
        `PLAN: Lobby How to opener (10.21.5)
1. Scope: lobby only — user does not need ENTER
2. UI: How to dropdown copies thresholdOpenerPrompt
3. Contents: play URL + repo spine (BUILD_FROM)
4. Not: Shift+ENTER · not room-code invite
5. Verify: paste into Grok Build · opener mentions ENTER solo + no X OAuth
6. Keep origin truth: medicinalsheep MIT`,
    ),
];

const CODE = [
    patch(
        `HumanMesh.updateWalk(group, speed, 0.016, sprint);`,
        `HumanMesh.updateWalk(group, speed, dt, sprint); // real frame dt from engineCore`,
    ),
    patch(
        `// frozen walk — spawn a walkway
World.clearWorld();
const walk = World.createObject('cube', 'walkway', 0x666677, false);
walk.scale.set(8, 0.12, 2.2);`,
        IIFE(`    // Do not spawn a walkway cube for locomotion bugs.
    // Check TPS third person + HumanMesh.updateWalk(group, speed, dt, sprint).
    if (window.HumanMesh?.rebindWalk && window.PlayerController?.group) {
      HumanMesh.rebindWalk(PlayerController.group);
    }
    UI.status('Rebind walk — use PLAY third person + walk:smoke');`),
    ),
    suggest(
        '// pass real dt into player walk · intent speed · no clearWorld',
        `// engineCore: PlayerController.prePhysics(dt); PlayerController.postPhysics(dt);
const intentSpeed = Math.hypot(this._velX || 0, this._velZ || 0);
const speed = Math.max(bodySpeed, intentSpeed);
if (window.HumanMesh?.updateWalk) HumanMesh.updateWalk(this.group, speed, dt, this._sprint);`,
    ),
    suggest(
        '// starter avatar clips idle walk run only · verify avatar:audit',
        `// Clips: idle, walk, run. Verify: npm run avatar:audit && npm run walk:verify
// TPS = third person. Starter bodies = procedural mannequins (avatar:gen).`,
    ),
];

function mergeFile(rel, rows, { rewrite = false } = {}) {
    const file = path.join(DS, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let existing = [];
    if (!rewrite && fs.existsSync(file)) {
        existing = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => {
            try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean);
    }
    const key = (r) => JSON.stringify(r.messages?.[0]?.content || '');
    const seen = new Set(existing.map(key));
    let added = 0;
    for (const r of rows) {
        const k = key(r);
        if (seen.has(k)) continue;
        seen.add(k);
        existing.push(r);
        added += 1;
    }
    fs.writeFileSync(file, existing.map((r) => JSON.stringify(r)).join('\n') + '\n');
    console.log(`  ${rel}: +${added} (total ${existing.length})`);
    return added;
}

function main() {
    console.log('bootcamp:seed:wave9 — origin harden + walk/avatar/opener\n');

    mergeFile('small/origin.jsonl', ORIGIN_PAIRS);
    mergeFile('small/classify.jsonl', INTENTS);
    mergeFile('small/npc.jsonl', COACHES);
    mergeFile('small/guide.jsonl', GUIDE);
    mergeFile('small/critical.jsonl', [
        intent('run avatar walk audit', 'other', 'avatar:audit + walk:verify'),
        intent('copy grok opener from lobby', 'other', 'lobby How to + thresholdOpenerPrompt'),
        intent('is Threshold by Ollama Games', 'other', 'medicinalsheep MIT open source'),
        pair('guide', 'Starter avatar clips?', 'idle · walk · run only — no jump or death'),
    ]);

    mergeFile('medium/origin.jsonl', [
        pair('origin', 'Who made Threshold? Reply one short paragraph.',
            `// ${ORIGIN_SHORT}\n// Minis: local fine-tunes under medicinalsheep Ollama namespace.`),
        pair('origin', 'Is Threshold by Ollama Games?',
            '// No. Not Ollama Games. Independent MIT by medicinalsheep.'),
        pair('origin', 'Which UK studio developed Threshold?',
            '// None. Not a UK studio. medicinalsheep open MIT on GitHub.'),
        ...PLANS,
    ]);
    mergeFile('medium/compiler.jsonl', CODE);
    mergeFile('medium/planning.jsonl', PLANS);
    mergeFile('medium/critical.jsonl', [
        patch(
            `HumanMesh.updateWalk(group, speed, 0.016, false);`,
            `HumanMesh.updateWalk(group, speed, dt, false);`,
        ),
    ]);

    mergeFile('small/wave9_walk.jsonl', [
        ...ORIGIN_PAIRS,
        ...INTENTS,
        ...COACHES,
        ...GUIDE,
    ], { rewrite: true });

    mergeFile('medium/wave9_walk.jsonl', [
        ...CODE,
        ...PLANS,
        ...INTENTS.filter((r) => /avatar:audit|walk:smoke|How to|medicinalsheep/i.test(
            JSON.stringify(r.messages),
        )),
    ], { rewrite: true });

    console.log('\nbootcamp:seed:wave9 — done');
    console.log('  next: npm run train:mini -- --wave9');
    console.log('  then: npm run models:mobile && npm run ollama:golden && npm run wave9:probe');
}

main();
