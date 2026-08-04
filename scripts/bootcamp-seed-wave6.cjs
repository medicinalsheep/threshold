#!/usr/bin/env node
/**
 * Wave 6 — Threshold 10.15–10.16 power pack for mini models.
 * Terminal void + quality ladder · Arrange · Play as · Live build ·
 * hand-painted PBR · material library · GIMP watch texture pulse.
 *
 *   npm run bootcamp:seed:wave6
 *   npm run train:mini -- --wave6
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
function scene(idea, code) {
    return pair('scene_script', `Generate realistic Threshold IIFE: ${idea}`, code);
}

const IIFE = (body) => `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);
${body}
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`;

// ── Modes: terminal / arrange / play-as / quality ladder ─────────────────

const MODES = [
    intent('switch to arrange mode', 'edit', 'SimMode arrange + hub cycle'),
    intent('cycle play arrange edit', 'edit', 'hub mode PLAY ARRANGE EDIT'),
    intent('play as this npc', 'other', 'PlayAs.possess'),
    intent('possess the selected prop', 'other', 'PlayAs.possess'),
    intent('release play as', 'other', 'PlayAs.release'),
    intent('terminal void default', 'other', 'StarterGrid terminal void'),
    intent('quality ladder lighting day', 'graphics', 'QualityLadder lighting'),
    intent('insert quality materials', 'texture', 'QualityLadder materials + MaterialLibrary'),
    intent('opt in physics kit', 'physics', 'QualityLadder kit + StarterKit'),
    intent('workspace pad template', 'spawn', 'QualityLadder pad + starterTemplates'),
    intent('grid snap one meter', 'edit', 'GridSystem snap 1u=1m'),
    intent('live apply agent build', 'other', 'LiveBuild + BuildJob liveApply'),
    intent('watch agents build in scene', 'other', 'LiveBuild HUD + portal live apply'),
    intent('multi step live scene generate', 'spawn', 'BuildJob multiStep LiveBuild'),
    intent('gimp texture hot reload', 'texture', 'CreativeWatch + TextureBridge.hotReload'),
    intent('hand painted brick material', 'texture', 'MaterialLibrary Mat Brick'),
    intent('apply material preset brick', 'texture', 'MaterialPresets.applyMaterialPreset pbr_brick_aged'),
];

const COACHES = [
    npc('a Threshold lobby guide', 'What do I see on ENTER now?',
        'Terminal void grid — PLAY walk-ready. Quality is opt-in via INSERT → QUALITY. CREATE only for multiplayer.'),
    npc('a Threshold build coach', 'How do I watch my agents build?',
        'Agent Portal → Build options → Live apply in scene (default on). GENERATE docks the portal; Live Build HUD shows each step while you walk.'),
    npc('a Threshold build coach', 'Why did live build pause briefly?',
        'World code needs EDIT pause for one tick, then Resume PLAY puts you back walking so you can inspect while the next agent step runs.'),
    npc('a Threshold build coach', 'Textures not updating live?',
        'Run npm run textures:watch, name objects to match GIMP slugs, and save maps. Creative watch hot-reloads and pulses meshes.'),
    npc('a Threshold modes coach', 'What is ARRANGE?',
        'Hub cycle PLAY → ARRANGE → EDIT. Arrange: click/drag props, WASD nudge, Q/E height, R rotate 90°, snap from SCENE GridSystem.'),
    npc('a Threshold modes coach', 'How do I possess an NPC?',
        'Select NPC or prop → K or inspector PLAY AS. Solo only. Esc or K releases at drop position.'),
    npc('a product guide', 'What is LiveBuild?',
        'src/shared/liveBuild.js — applies each BuildJob step chunk into the Engine, HUD progress, mesh pulse, no clearWorld mid-job.'),
    npc('a Threshold ship coach', 'How do I train local minis on this PC?',
        'From Threshold: npm run train:mini -- --wave6 or --full. Or open GROKS playground threshold-training-kit and run session-train.ps1.'),
];

const GUIDE = [
    pair('guide', 'ENTER default scene?', 'Terminal void grid · PLAY · kit/AI/pad opt-in only (Quality ladder)'),
    pair('guide', 'Mode cycle?', 'PLAY → ARRANGE → EDIT → PLAY via top-left hub badge'),
    pair('guide', 'Play as key?', 'K possess / release · solo · PlayAs module'),
    pair('guide', 'Live apply default?', 'BuildJob prefs liveApply true — GENERATE → LIVE SCENE'),
    pair('guide', 'Live build module?', 'src/shared/liveBuild.js + BuildJob step chunks'),
    pair('guide', 'Grid unit?', '1 unit = 1 meter · GridSystem cell size + snap'),
    pair('guide', 'Hand-painted materials?', '12 starter mats · MaterialLibrary · textures:handpaint'),
    pair('guide', 'Train minis wave6?', 'npm run train:mini -- --wave6  or  --full'),
    pair('guide', 'GIMP live SYNC?', 'npm run textures:watch → CreativeWatch → TextureBridge.hotReloadFromWatch'),
    pair('guide', 'Block clearWorld live?', 'LiveBuild strips World.clearWorld from step chunks'),
];

const PLANS = [
    plan(
        'Write a short production plan for a live multi-step courtyard prop build (Threshold 10.16).',
        `PLAN: Live courtyard crate (10.16)
1. Scope: exterior prop near origin · no clearWorld
2. Collision: dynamic mass ~8 · surfaceType wood
3. Mesh: World.createObject cube named Mat Brick Crate (slug match)
4. Materials: MaterialPresets pbr_brick_aged then MaterialLibrary maps if present
5. Live: BuildJob multi-step · LiveBuild apply per step · user walks PLAY
6. Textures: GIMP watch textures/mat_brick_crate_albedo.png when art lands
7. Weather: surfaceType for wet · optional dustExposure 0.3
8. Verify: walk inspect · Live HUD complete · export later`,
    ),
    plan(
        'Production plan: agent live-build a terminal pad with quality lighting only.',
        `PLAN: Terminal pad + day light
1. Scope: interior-feel pad on terminal grid
2. Collision: locked static floor
3. Mesh: one cube pad scaled flat · name Terminal Pad
4. Lighting: QualityLadder / Environment day · Engine.setRenderMode(4)
5. Live: layout step first so user sees floor appear · then atmosphere step
6. No kit spam · materials optional MaterialLibrary Starter Ground
7. Verify PLAY walk on pad`,
    ),
];

const CODE = [
    patch(
        "World.clearWorld();\nWorld.createObject('box', 'floor', 0x444, false);",
        IIFE(`    // live-build safe: never clearWorld mid job
    const floor = World.createObject('cube', 'Terminal Pad', 0x3a3a42, false);
    floor.scale.set(12, 0.12, 12);
    floor.position.set(0, 0.06, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';`),
    ),
    patch(
        "const c = World.createObject({ type: 'cube', name: 'crate' });\nMaterialPresets.apply(c, 'brick');",
        IIFE(`    const c = World.createObject('cube', 'Mat Brick Crate', 0x8c4838, true);
    c.position.set(1.2, 0.5, -1.5);
    c.userData.surfaceType = 'concrete';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(c, 'pbr_brick_aged');
    }
    c.userData.materialPreset = 'pbr_brick_aged';`),
    ),
    suggest(
        '// live layout step only: locked ground pad, no props yet',
        IIFE(`    const pad = World.createObject('cube', 'Live Layout Pad', 0x4a4a52, false);
    pad.scale.set(10, 0.14, 10);
    pad.position.set(0, 0.07, 0);
    pad.userData.locked = true;
    pad.userData.surfaceType = 'concrete';
    pad.userData.liveBuildStep = 'layout';`),
    ),
    suggest(
        '// live materials step: apply aged brick preset to named crate if present',
        IIFE(`    const crate = (State.objects || []).find((o) => /crate/i.test(o.userData?.name || o.name || ''));
    if (crate && window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(crate, 'pbr_brick_aged');
      crate.userData.materialPreset = 'pbr_brick_aged';
      crate.userData.surfaceType = crate.userData.surfaceType || 'concrete';
    }
    if (window.LiveBuild?.pulseObjects && crate) LiveBuild.pulseObjects([crate], { color: 0x00ffaa });`),
    ),
    suggest(
        '// quality PBR prop near origin — name matches GIMP slug contract',
        IIFE(`    const prop = World.createObject('cube', 'Mat Wood Crate', 0x6b4a2e, true);
    prop.position.set(-1.4, 0.5, -1.2);
    prop.userData.surfaceType = 'wood';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(prop, 'pbr_wood_snow');
    }
    // TEXTURE: Mat Wood Crate → textures/mat_wood_crate_albedo.png
    prop.userData.textureHint = 'textures/mat_wood_crate_albedo.png';`),
    ),
    scene(
        'live-build safe courtyard: locked pad + two physics crates with material presets, no clearWorld',
        IIFE(`    const pad = World.createObject('cube', 'Courtyard Pad', 0x55555e, false);
    pad.scale.set(14, 0.12, 14);
    pad.position.set(0, 0.06, 0);
    pad.userData.locked = true;
    pad.userData.surfaceType = 'concrete';
    for (let i = 0; i < 2; i++) {
      const c = World.createObject('cube', i ? 'Mat Brick Crate' : 'Mat Wood Crate', i ? 0x8c4838 : 0x6b4a2e, true);
      c.position.set(i ? 1.5 : -1.5, 0.5, -2);
      c.userData.surfaceType = i ? 'concrete' : 'wood';
      if (window.MaterialPresets?.applyMaterialPreset) {
        MaterialPresets.applyMaterialPreset(c, i ? 'pbr_brick_aged' : 'pbr_wood_snow');
      }
    }
    Environment.setTimeOfDay?.(14);
    Environment.setFog?.(0.012);`),
    ),
];

const SAFETY = [
    patch(
        "LiveBuild.applyChunk(code); // while PLAY, no pause",
        "// LiveBuild.ensureEditable pauses first; Runtime blocks world mutators in PLAY\nif (!State.isPaused) UI.togglePause('Live build');\nLiveBuild.applyChunk(code);",
    ),
    patch(
        "BuildJob.run(ctx); // apply only final accumulated IIFE once",
        "// Prefer liveApply: each step emits chunk → LiveBuild.applyChunk (no re-create)\nBuildJob.setPrefs({ multiStep: true, liveApply: true, resumePlay: true });\nawait BuildJob.run(ctx);",
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
    console.log('bootcamp:seed:wave6 — 10.15–10.16 live build + modes pack\n');

    const smallIntent = MODES.filter((r) => r.task === 'intent_classify');
    const smallNpc = COACHES;
    const smallGuide = GUIDE;
    const smallCritical = [
        intent('live apply in scene', 'other', 'LiveBuild + BuildJob liveApply'),
        intent('arrange mode drag props', 'edit', 'ArrangeMode + SimMode arrange'),
        intent('play as possess npc', 'other', 'PlayAs.possess'),
        intent('terminal void enter', 'other', 'StarterGrid terminal void'),
        intent('hand painted materials', 'texture', 'MaterialLibrary + MaterialPresets'),
    ];

    const medPatch = [
        ...CODE.filter((r) => r.task === 'dev_patch' || r.task === 'dev_suggest'),
        ...SAFETY,
    ];
    const medPlan = PLANS;
    const largeScenes = CODE.filter((r) => r.task === 'scene_script');

    mergeFile('small/classify.jsonl', smallIntent);
    mergeFile('small/npc.jsonl', smallNpc);
    mergeFile('small/guide.jsonl', smallGuide);
    mergeFile('small/critical.jsonl', smallCritical);

    mergeFile('medium/compiler.jsonl', medPatch);
    mergeFile('medium/planning.jsonl', medPlan);
    mergeFile('medium/safety.jsonl', SAFETY);
    mergeFile('medium/critical.jsonl', [
        patch("World.createObject('box', 'x', 0xff0000, true);", "World.createObject('cube', 'x', 0xff0000, true);"),
        patch("World.clearWorld(); // live step", "/* live-build: clearWorld blocked */"),
    ]);
    mergeFile('large/scenes.jsonl', largeScenes);

    // Dedicated wave6 corpora (rebuild visibility + bootcamp.json datasets)
    mergeFile('small/wave6_live.jsonl', [
        ...smallIntent,
        ...smallNpc,
        ...smallGuide,
        ...smallCritical,
    ], { rewrite: true });
    mergeFile('medium/wave6_live.jsonl', [
        ...medPatch,
        ...medPlan,
        ...SAFETY,
        ...largeScenes.map((r) => ({
            task: 'dev_suggest',
            messages: [
                { role: 'user', content: `Improve live scene:\n\`\`\`js\n// ${r.messages[0].content}\n\`\`\`` },
                { role: 'assistant', content: r.messages[1].content },
            ],
        })),
    ], { rewrite: true });

    console.log('\nbootcamp:seed:wave6 — done');
    console.log('Next: npm run bootcamp:build && npm run models:mini');
    console.log('  or:  npm run train:mini -- --wave6');
}

main();
