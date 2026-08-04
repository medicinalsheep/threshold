#!/usr/bin/env node
/**
 * Wave 7 — Threshold 10.17–10.19 product pack for mini models.
 * Entry → build (BUILD SOMETHING / openBuildFast / fast brief) ·
 * Body shape (profile.shape) · Wardrobe (ClothingLayout + MOD ids) ·
 * Live build quick 3-step · no TC DEMO / no clearWorld.
 *
 *   npm run bootcamp:seed:wave7
 *   npm run train:mini -- --wave7
 *   npm run train:mini -- --full
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

// ── Intents: entry, shape, wardrobe, live ────────────────────────────────

const INTENTS = [
    intent('build something button', 'other', 'AgentPortal.openBuildFast + BUILD SOMETHING CTA'),
    intent('start building with grok key', 'other', 'AgentPortal.openBuildFast auto-connect'),
    intent('generate live scene from one message', 'spawn', 'looksLikeBuildBrief + GENERATE LIVE SCENE'),
    intent('quick live build three steps', 'spawn', 'BuildJob intensity focused layout props atmosphere'),
    intent('full production pipeline seven steps', 'spawn', 'BuildJob intensity full STEP_PLANS'),
    intent('body shape shoulders wider', 'other', 'AppearanceProfile shape shoulders'),
    intent('make me taller body height', 'other', 'AppearanceProfile shape heightM'),
    intent('skin body shape sliders', 'other', 'SKIN panel shape + HumanMesh.applyShape'),
    intent('equip tactical operator outfit', 'other', 'ClothingLayout + avatar-mods operator preset'),
    intent('wardrobe slot rail unequip hat', 'other', 'ClothingLayout unequip + AvatarMod'),
    intent('dress as scientist lab coat', 'other', 'AvatarMod coat_lab + generationPolicy archetype'),
    intent('open skin wardrobe catalog', 'other', 'ClothingLayout mount SKIN dock'),
    intent('live build undo last step', 'other', 'LiveBuild undoLastStep SceneHistory'),
    intent('no tc demo lobby', 'other', 'TC DEMO removed terminal grid default'),
    intent('enter lobby build mode skip tour', 'other', 'GuidedSession preferBuild skip walkthrough'),
];

const COACHES = [
    npc('a Threshold lobby guide', 'How do I start building fast?',
        'ENTER → tap BUILD SOMETHING (or hub AI). If Grok or Ollama is ready you auto-connect. Describe one scene brief, then GENERATE → LIVE SCENE.'),
    npc('a Threshold lobby guide', 'Where did TC DEMO go?',
        'TC DEMO was removed. Default is the terminal void grid. Build with agents or INSERT QUALITY layers — no circuit demo required.'),
    npc('a Threshold build coach', 'What is a fast-path brief?',
        'One clear message like “small courtyard with crates” unlocks GENERATE immediately (inferred placement/type). You can still chat to refine.'),
    npc('a Threshold build coach', 'Quick vs full pipeline?',
        'Default Quick live is 3 steps: layout → props → atmosphere. Portal Build options → Full production runs the 7-step plan.'),
    npc('a Threshold appearance coach', 'How do I change body shape?',
        'SCENE → SKIN → Body shape. Sliders: shoulders, chest, waist, hips, muscle, weight; optional height in meters. Live apply when spawned. RESET SHAPE for neutral.'),
    npc('a Threshold appearance coach', 'How do I dress as an operator?',
        'SKIN → wardrobe presets → Operator, or equip vest_tactical, helmet_tactical, belt_tactical from the catalog. Slot rail shows exclusive gear; × unequips.'),
    npc('a Threshold appearance coach', 'What MOD ids are valid?',
        'Use ids from config/avatar-mods.json — e.g. hoodie_urban, coat_lab, vest_tactical, shoes_casual, belt_utility, glasses_round. Never invent gear names.'),
    npc('a Threshold product guide', 'Train minis on appearance and entry?',
        'npm run train:mini -- --wave7 or --full. Wave7 covers BUILD SOMETHING, shape, wardrobe, quick live build.'),
];

const GUIDE = [
    pair('guide', 'BUILD SOMETHING?', 'Floating CTA after ENTER · AgentPortal.openBuildFast'),
    pair('guide', 'Fast path GENERATE?', 'looksLikeBuildBrief → inferBuildContext → GENERATE LIVE SCENE'),
    pair('guide', 'Quick live steps?', 'layout → props → atmosphere (BuildJob intensity focused)'),
    pair('guide', 'Body shape fields?', 'shape.shoulders chest waist hips muscle weight heightM (0–1 · null height)'),
    pair('guide', 'Wardrobe module?', 'src/shared/clothingLayout.js · AvatarMod catalog'),
    pair('guide', 'Operator mods?', 'vest_tactical helmet_tactical belt_tactical shoes_boots (preset operator)'),
    pair('guide', 'Scientist mods?', 'coat_lab hardhat_lab goggles_welding id_lanyard'),
    pair('guide', 'TC DEMO?', 'Removed — terminal grid default · no lobby TC button'),
    pair('guide', 'Train wave7?', 'npm run train:mini -- --wave7'),
    pair('guide', 'Live undo?', 'LiveBuild HUD ↩ · SceneHistory per step'),
];

const PLANS = [
    plan(
        'Production plan: character loadout tactical operator with custom body shape (Threshold 10.19).',
        `PLAN: Operator character (10.19)
1. Scope: character · appearance only (or NPC placeholder)
2. Appearance bodyId male_default · hair hair_short_m
3. Shape: shoulders 0.72 · chest 0.65 · muscle 0.7 · heightM 1.82
4. Mods (catalog only): helmet_tactical, vest_tactical, belt_tactical, shoes_boots
5. Skin tone: starter_skin_medium · colors shirt/pants from profile
6. Apply: AppearanceStore + AvatarComposer.apply · ClothingLayout selection
7. No World.clearWorld · no invented mod ids
8. Verify: SKIN rail shows headwear/torso/belt/feet filled`,
    ),
    plan(
        'Production plan: quick live build small plaza after BUILD SOMETHING (focused intensity).',
        `PLAN: Live plaza (quick 3-step)
1. Entry: openBuildFast · user brief "small plaza with crates"
2. Intensity: focused · steps layout → props → atmosphere
3. Layout: locked pad surfaceType concrete · no clearWorld
4. Props: 2–3 crates named for GIMP slugs · MaterialPresets
5. Atmosphere: day light · light fog · Engine.setRenderMode(4)
6. LiveBuild apply each chunk · Resume PLAY between steps
7. Verify: walk plaza · HUD complete · code in Compiler`,
    ),
    plan(
        'Ready JSON for portal: dress player as lab scientist (valid mod ids only).',
        `{"ready":true,"taskType":"character","title":"Lab scientist","summary":"Player appearance scientist loadout","intensity":"focused","placement":"interior","weatherExposure":"sheltered","surfaceType":"concrete","collision":"dynamic","appearance":{"bodyId":"female_default","hairId":"hair_bun_f","mods":["coat_lab","hardhat_lab","id_lanyard","shoes_casual"],"archetype":"scientist"},"shape":{"shoulders":0.45,"chest":0.5,"waist":0.48,"hips":0.55,"muscle":0.4,"weight":0.48,"heightM":null}}`,
    ),
];

const CODE = [
    patch(
        "profile.mods = ['magic_sword', 'jetpack_xl']; // invent gear",
        `// Only catalog ids from avatar-mods.json
profile.mods = resolveMods(['vest_tactical', 'helmet_tactical', 'belt_tactical', 'shoes_boots']);
// or ClothingLayout.setSelected([...]); AvatarComposer.apply(group, profile);`,
    ),
    patch(
        "profile.shape = { height: 2, muscle: 5 }; // wrong schema",
        `profile.shape = {
  heightM: 1.82, // meters or null
  shoulders: 0.7, chest: 0.65, waist: 0.5, hips: 0.55, muscle: 0.7, weight: 0.55
}; // each 0–1, 0.5 neutral`,
    ),
    suggest(
        '// apply operator loadout + broader shoulders to player group',
        `const profile = AppearanceStore.getPlayerProfile();
profile.mods = ['helmet_tactical', 'vest_tactical', 'belt_tactical', 'shoes_boots'];
profile.shape = { ...(profile.shape || {}), shoulders: 0.72, muscle: 0.68, heightM: 1.8 };
AppearanceStore.setPlayerProfile(profile);
await AvatarComposer.apply(PlayerController.group, profile);
if (window.ClothingLayout) ClothingLayout.setSelected(profile.mods, { silent: true });
UI.status('Operator loadout + shape applied');`,
    ),
    suggest(
        '// ready context for portal character without multi-turn',
        `const ready = {
  ready: true,
  taskType: 'character',
  title: 'Street explorer',
  summary: 'Urban casual with daypack',
  placement: 'exterior',
  weatherExposure: 'full',
  surfaceType: 'asphalt',
  collision: 'dynamic',
  intensity: 'focused',
  appearance: {
    bodyId: 'male_default',
    hairId: 'hair_short_m',
    mods: ['hoodie_urban', 'pack_day', 'shoes_casual', 'belt_utility'],
    archetype: 'explorer',
  },
  shape: { shoulders: 0.55, chest: 0.52, waist: 0.5, hips: 0.5, muscle: 0.5, weight: 0.5, heightM: null },
};
// Portal: set buildContext ready → GENERATE or applyAppearancePlan`,
    ),
    suggest(
        '// quick live layout step only — pad, no clearWorld',
        IIFE(`    const pad = World.createObject('cube', 'Quick Live Pad', 0x4a4a52, false);
    pad.scale.set(10, 0.14, 10);
    pad.position.set(0, 0.07, 0);
    pad.userData.locked = true;
    pad.userData.surfaceType = 'concrete';
    pad.userData.liveBuildStep = 'layout';`),
    ),
];

const SAFETY = [
    patch(
        "World.clearWorld(); // after BUILD SOMETHING generate",
        "/* never clearWorld on live generate — extend terminal grid */\n// LiveBuild strips clearWorld from step chunks",
    ),
    patch(
        "document.getElementById('lobby-tc').click(); // start demo",
        "// TC DEMO removed — use ENTER terminal grid + BUILD SOMETHING\n// Network.startSolo(); bootstrapSelectedTemplate(); // grid default",
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
    console.log('bootcamp:seed:wave7 — 10.17–10.19 entry + shape + wardrobe pack\n');

    const smallIntent = INTENTS;
    const smallNpc = COACHES;
    const smallGuide = GUIDE;
    const smallCritical = [
        intent('build something cta', 'other', 'AgentPortal.openBuildFast'),
        intent('body shape profile', 'other', 'AppearanceProfile shape'),
        intent('wardrobe clothing layout', 'other', 'ClothingLayout + AvatarMod'),
        intent('valid mod ids only', 'other', 'avatar-mods.json catalog'),
        intent('no clearWorld live', 'other', 'LiveBuild block clearWorld'),
    ];

    const medPatch = [...CODE, ...SAFETY];
    const medPlan = PLANS;

    mergeFile('small/classify.jsonl', smallIntent);
    mergeFile('small/npc.jsonl', smallNpc);
    mergeFile('small/guide.jsonl', smallGuide);
    mergeFile('small/critical.jsonl', smallCritical);

    mergeFile('medium/compiler.jsonl', medPatch);
    mergeFile('medium/planning.jsonl', medPlan);
    mergeFile('medium/safety.jsonl', SAFETY);
    mergeFile('medium/critical.jsonl', [
        patch(
            "profile.mods = ['super_armor_v9'];",
            "profile.mods = resolveMods(['vest_tactical', 'helmet_tactical']); // catalog ids only",
        ),
        patch(
            "BuildJob.setPrefs({ intensity: 'lottery' });",
            "BuildJob.setPrefs({ intensity: 'focused' }); // focused | full",
        ),
    ]);

    // Dedicated wave7 corpora
    mergeFile('small/wave7_appearance.jsonl', [
        ...smallIntent,
        ...smallNpc,
        ...smallGuide,
        ...smallCritical,
    ], { rewrite: true });

    mergeFile('medium/wave7_appearance.jsonl', [
        ...medPatch,
        ...medPlan,
        ...SAFETY,
    ], { rewrite: true });

    mergeFile('medium/wave7_entry_live.jsonl', [
        ...INTENTS.filter((r) => /live|build something|generate|pipeline|brief|BUILD/i.test(r.messages[0].content)),
        ...COACHES.filter((r) => /build|live|brief|TC|pipeline|BUILD/i.test(r.messages[0].content + r.messages[1].content)),
        ...GUIDE.filter((r) => /BUILD|live|GENERATE|Quick|TC|wave7|openBuild/i.test(r.messages[0].content + r.messages[1].content)),
        ...PLANS.slice(1, 2),
        ...CODE.filter((r) => /live|pad|clearWorld|BUILD/i.test(JSON.stringify(r.messages))),
        ...SAFETY,
    ], { rewrite: true });

    console.log('\nbootcamp:seed:wave7 — done');
    console.log('Next: npm run bootcamp:build && npm run models:mini');
    console.log('  or:  npm run train:mini -- --wave7');
}

main();
