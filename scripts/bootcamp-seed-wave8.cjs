#!/usr/bin/env node
/**
 * Wave 8 — Threshold 10.21 art pipeline power pack for mini models.
 * Slug law · MaterialPresets · TextureBridge APIs · anti-CanvasTexture ·
 * name↔textureHint · HILOD · kit:export · GIMP/Blender paths · product sanitizer truth.
 *
 *   npm run bootcamp:seed:wave8
 *   npm run train:mini -- --wave8
 *   npm run train:mini -- --full
 *   npm run art:audit
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

// ── Intents ──────────────────────────────────────────────────────────────

const INTENTS = [
    intent('export starter texture kit for forks', 'texture', 'kit:export + kit:verify'),
    intent('export character kit glbs', 'spawn', 'kit:export:chr + starter-character-kit'),
    intent('generate hilod tiers from masters', 'texture', 'textures:hilod'),
    intent('compress textures to webp', 'texture', 'tex:compress'),
    intent('export pbr maps from gimp for stone block', 'texture', 'gimp:install Filters Threshold Export PBR Maps + textures:watch'),
    intent('apply material preset not canvas texture', 'style', 'MaterialPresets.applyMaterialPreset'),
    intent('texture bridge apply maps from userdata', 'texture', 'TextureBridge.applyFromUserData'),
    intent('apply albedo path to mesh', 'texture', 'TextureBridge.applyPathToObject'),
    intent('blender export mat wood crate glb', 'spawn', 'blender:export + gltfImport'),
    intent('art pipeline audit local minis', 'other', 'art:audit + art-pipeline-audit'),
    intent('pack starter assets for pages', 'other', 'assets:pack + bundle:assets'),
    intent('fix canvas texture slop on crate', 'style', 'MaterialPresets + sanitizeAgentSlop'),
    intent('name object for gimp slug contract', 'texture', 'ArtNaming slug + textureHint'),
    intent('run textures watch live sync', 'texture', 'textures:watch + TextureBridge hot reload'),
];

const COACHES = [
    npc('a GIMP mentor', 'What files for object named Mat Brick Wall?',
        'Export textures/mat_brick_wall_albedo.png (+ roughness/normal). Slug is lowercase: mat_brick_wall. Engine Name must be exactly Mat Brick Wall.'),
    npc('a GIMP mentor', 'What files for Stone Block?',
        'textures/stone_block_albedo.png · textures/stone_block_roughness.png · textures/stone_block_normal.png. Filters → Threshold → Export PBR Maps.'),
    npc('a Blender mentor', 'Export path for Mat Wood Crate?',
        'npm run blender:export -- --blend file.blend --object "Mat Wood Crate" → import/mat_wood_crate.glb'),
    npc('a Threshold coach', 'Can agents invent CanvasTexture noise?',
        'No — prefer MaterialPresets.applyMaterialPreset and GIMP maps. CanvasTexture is texture slop; runtime sanitizeAgentSlop strips it.'),
    npc('a Threshold coach', 'Why did my Stone Block become Mat Stone Crate?',
        'Mini models sometimes rename. Keep Engine Name as requested. textureHint must match Name slug: textures/stone_block_albedo.png. Product sanitizer realigns Name + hint from user text.'),
    npc('a Threshold product guide', 'How do I ship a fork-friendly texture kit?',
        'npm run kit:export then kit:verify. Pack is exports/starter-texture-kit with Mat* library + Starter Ground + AI Build Station.'),
    npc('a Threshold product guide', 'What is wave8 training?',
        'npm run train:mini -- --wave8 — art pipeline slug law, MaterialPresets, anti-canvas, HILOD, kit export, TextureBridge APIs.'),
    npc('a Threshold coach', 'TextureBridge.apply bare — is that ok?',
        'No. Use TextureBridge.applyFromUserData(mesh) or applyPathToObject(mesh, slot, path). Bare apply is not the shipped API.'),
];

const GUIDE = [
    pair('guide', 'Slug for Mat Brick Wall?', 'mat_brick_wall — lowercase, underscores only'),
    pair('guide', 'Albedo path for Mat Brick Wall?', 'textures/mat_brick_wall_albedo.png'),
    pair('guide', 'Albedo path for Stone Block?', 'textures/stone_block_albedo.png'),
    pair('guide', 'Albedo path for Mat Wood Crate?', 'textures/mat_wood_crate_albedo.png'),
    pair('guide', 'GLB path for Mat Wood Crate?', 'import/mat_wood_crate.glb'),
    pair('guide', 'GIMP export filter path?', 'Filters → Threshold → Export PBR Maps · then textures:watch'),
    pair('guide', 'TextureBridge apply API?', 'TextureBridge.applyFromUserData(mesh) or applyPathToObject(mesh, slot, path) — not bare apply()'),
    pair('guide', 'HILOD command?', 'npm run textures:hilod — masters → _1k/_2k WebP sidecars'),
    pair('guide', 'Kit export command?', 'npm run kit:export · verify with kit:verify'),
    pair('guide', 'Prefer materials how?', 'MaterialPresets.applyMaterialPreset first; GIMP maps later; never CanvasTexture slop'),
    pair('guide', 'textureHint for Stone Block?', "userData.textureHint = 'textures/stone_block_albedo.png' — must match Name slug"),
    pair('guide', 'Wrong: Mat_Brick_Wall path?', 'Never PascalCase or spaces in paths — use mat_brick_wall only'),
    pair('guide', 'Art audit?', 'npm run art:audit → dist-store/art-pipeline-audit.json'),
    pair('guide', 'Train wave8?', 'npm run train:mini -- --wave8'),
    pair('guide', 'Manifest engineVersion?', 'textures/threshold_manifest.json engineVersion tracks product VERSION (10.21.x)'),
];

const PLANS = [
    plan(
        'Write a short production plan for one GIMP-textured wood crate named Mat Wood Crate (Threshold 10.21).',
        `PLAN: Mat Wood Crate GIMP PBR (10.21)
1. Scope: one crate near spawn · extend-only · no clearWorld
2. Name contract: Engine "Mat Wood Crate" → textures/mat_wood_crate_albedo.png · import/mat_wood_crate.glb
3. Mesh: World.createObject('cube','Mat Wood Crate',hex,true) type-first
4. Materials: MaterialPresets pbr_wood_snow · surfaceType wood
5. textureHint: textures/mat_wood_crate_albedo.png (lowercase slug)
6. GIMP: Filters → Threshold → Export PBR Maps · npm run textures:watch
7. Optional Blender: blender:export --object "Mat Wood Crate"
8. Verify: PLAY walk · hot reload · art:audit AG6 · export preflight clean`,
    ),
    plan(
        'Write a short production plan for Mat Brick Wall with HILOD (Threshold 10.21).',
        `PLAN: Mat Brick Wall + HILOD (10.21)
1. Scope: locked wall prop · no clearWorld
2. Name: Mat Brick Wall → textures/mat_brick_wall_albedo.png (not Mat_Brick_Wall)
3. Mesh: cube scaled wall · locked · surfaceType concrete
4. Materials: MaterialPresets pbr_brick_aged first
5. GIMP master 2k maps · textures:watch live SYNC
6. HILOD: npm run textures:hilod for _1k/_2k WebP
7. Kit: optional kit:export for fork Mat* pack
8. Verify: inspector Art paths · PLAY albedo at distance · art:audit`,
    ),
    plan(
        'Production plan: ship starter texture kit for forks after GIMP masters (Threshold 10.21).',
        `PLAN: Starter texture kit ship (10.21)
1. Scope: config/starter-kit.json Mat* + Starter Ground + AI Build Station
2. Masters in textures/ · threshold_manifest engineVersion matches VERSION
3. HILOD: textures:hilod when masters lack _1k
4. Export: npm run kit:export → exports/starter-texture-kit
5. Character: kit:export:chr (bodies + skin maps)
6. Verify: kit:verify · art:audit S-kit PASS
7. Docs: ASSET_CAPABILITIES + ART_PIPELINE_TRAINING_PLAN
8. Do not commit multi-GB full HILOD into kit — WebP base + _1k only`,
    ),
    plan(
        'Production plan: fix mini CanvasTexture slop on hero props without retraining (Threshold 10.21).',
        `PLAN: Product-path anti-canvas (10.21)
1. Scope: AgentRouter codegen path only
2. Runtime: sanitizeAgentSlop strips CanvasTexture + MeshBasic map assigns
3. Inject MaterialPresets.applyMaterialPreset when createObject present
4. Align createObject Name to user art name (Stone Block, Mat Wood Crate, …)
5. Align textureHint to Name slug
6. LiveBuild: codeSanitizer same canvas strip
7. Train: keep art_pipeline + wave8 few-shots for vocabulary
8. Verify: art:audit O-dev-anti-canvas hard PASS; raw echo may WARN`,
    ),
];

const CODE = [
    patch(
        `const tex = new THREE.CanvasTexture(document.createElement('canvas'));
const m = World.createObject('box', 'Stone Block', 0xffffff, false);
m.material = new THREE.MeshBasicMaterial({ map: tex });`,
        IIFE(`    const m = World.createObject('cube', 'Stone Block', 0x9a958c, false);
    m.position.set(0, 0.5, -2);
    m.userData.surfaceType = 'concrete';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(m, 'pbr_concrete_weathered');
    }
    m.userData.textureHint = 'textures/stone_block_albedo.png';`),
    ),
    patch(
        `const tex = new THREE.CanvasTexture(document.createElement('canvas'));
const m = World.createObject('cube', 'Mat Stone Crate', 0xffffff, true);
m.material = new THREE.MeshBasicMaterial({ map: tex });`,
        IIFE(`    const m = World.createObject('cube', 'Mat Stone Crate', 0x8a8680, true);
    m.position.set(1, 0.5, -2);
    m.userData.surfaceType = 'concrete';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(m, 'pbr_concrete_weathered');
    }
    m.userData.textureHint = 'textures/mat_stone_crate_albedo.png';`),
    ),
    patch(
        `// wrong slug casing
const w = World.createObject('cube', 'Mat Brick Wall', 0x888, false);
w.userData.textureHint = 'textures/Mat_Brick_Wall_albedo.png';`,
        IIFE(`    const w = World.createObject('cube', 'Mat Brick Wall', 0x8c4838, false);
    w.position.set(2, 1, -3);
    w.userData.surfaceType = 'concrete';
    w.userData.textureHint = 'textures/mat_brick_wall_albedo.png';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(w, 'pbr_brick_aged');
    }`),
    ),
    patch(
        `const c = World.createObject('cube', 'Mat Wood Crate', 0x6b4a2e, true);
c.userData.textureHint = 'textures/Mat Wood Crate_albedo.png';`,
        IIFE(`    const c = World.createObject('cube', 'Mat Wood Crate', 0x6b4a2e, true);
    c.position.set(0, 0.5, -2);
    c.userData.surfaceType = 'wood';
    c.userData.textureHint = 'textures/mat_wood_crate_albedo.png';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(c, 'pbr_wood_snow');
    }`),
    ),
    patch(
        `// name drift — user asked Stone Block
const block = World.createObject('cube', 'Mat Stone Crate', 0x9a958c, true);
block.userData.textureHint = 'textures/mat_wood_crate_albedo.png';`,
        IIFE(`    const block = World.createObject('cube', 'Stone Block', 0x9a958c, true);
    block.position.set(0, 0.5, -2);
    block.userData.surfaceType = 'concrete';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(block, 'pbr_concrete_weathered');
    }
    block.userData.textureHint = 'textures/stone_block_albedo.png';`),
    ),
    suggest(
        '// create Stone Block · MaterialPresets · textureHint matches name slug · pause · no clearWorld',
        IIFE(`    const block = World.createObject('cube', 'Stone Block', 0x9a958c, true);
    block.position.set(0, 0.5, -2);
    block.userData.surfaceType = 'concrete';
    block.userData.materialPreset = 'pbr_concrete_weathered';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(block, 'pbr_concrete_weathered');
    }
    block.userData.textureHint = 'textures/stone_block_albedo.png';`),
    ),
    suggest(
        '// Mat Brick Wall named for GIMP · locked · MaterialPresets brick · textureHint',
        IIFE(`    const wall = World.createObject('cube', 'Mat Brick Wall', 0x8c4838, false);
    wall.scale.set(4, 2.4, 0.35);
    wall.position.set(3, 1.2, -4);
    wall.userData.locked = true;
    wall.userData.surfaceType = 'concrete';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(wall, 'pbr_brick_aged');
    }
    wall.userData.textureHint = 'textures/mat_brick_wall_albedo.png';`),
    ),
    suggest(
        '// Mat Wood Crate · type-first · MaterialPresets wood · textureHint mat_wood_crate',
        IIFE(`    const crate = World.createObject('cube', 'Mat Wood Crate', 0x6b4a2e, true);
    crate.position.set(-1.2, 0.5, -1.5);
    crate.userData.surfaceType = 'wood';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(crate, 'pbr_wood_snow');
    }
    crate.userData.textureHint = 'textures/mat_wood_crate_albedo.png';`),
    ),
    suggest(
        '// apply GIMP maps via TextureBridge after naming Mat Stone Crate',
        IIFE(`    const crate = World.createObject('cube', 'Mat Stone Crate', 0x8a8680, true);
    crate.position.set(1, 0.5, -2);
    crate.userData.surfaceType = 'concrete';
    crate.userData.textureHint = 'textures/mat_stone_crate_albedo.png';
    crate.userData.textures = crate.userData.textures || {};
    if (window.TextureBridge?.applyPathToObject) {
      TextureBridge.applyPathToObject(crate, 'albedo', 'textures/mat_stone_crate_albedo.png');
    } else if (window.TextureBridge?.applyFromUserData) {
      TextureBridge.applyFromUserData(crate);
    }
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(crate, 'pbr_concrete_weathered');
    }`),
    ),
    suggest(
        '// Mat Brick library prop for starter kit · surfaceType concrete',
        IIFE(`    const brick = World.createObject('cube', 'Mat Brick', 0x8c4838, false);
    brick.scale.set(2, 1.2, 0.4);
    brick.position.set(2, 0.6, -3);
    brick.userData.surfaceType = 'concrete';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(brick, 'pbr_brick_aged');
    }
    brick.userData.textureHint = 'textures/starter_brick_albedo.png';`),
    ),
];

const SAFETY = [
    patch(
        `const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(document.createElement('canvas')) });
const m = World.createObject('cube', 'slop', 0xffffff, false);
m.material = mat;`,
        IIFE(`    const m = World.createObject('cube', 'Stone Block', 0x9a958c, false);
    m.position.set(0, 0.5, -2);
    m.userData.surfaceType = 'concrete';
    m.userData.materialPreset = 'pbr_concrete_weathered';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(m, 'pbr_concrete_weathered');
    m.userData.textureHint = 'textures/stone_block_albedo.png';`),
    ),
    patch(
        `TextureBridge.apply(mesh); // bare API`,
        `// Prefer shipped APIs
if (window.TextureBridge?.applyFromUserData) TextureBridge.applyFromUserData(mesh);
else if (window.TextureBridge?.applyPathToObject) {
  TextureBridge.applyPathToObject(mesh, 'albedo', mesh.userData.textureHint);
}`,
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
    console.log('bootcamp:seed:wave8 — 10.21 art pipeline power pack\n');

    mergeFile('small/classify.jsonl', INTENTS);
    mergeFile('small/npc.jsonl', COACHES);
    mergeFile('small/guide.jsonl', GUIDE);
    mergeFile('small/critical.jsonl', [
        intent('kit export starter textures', 'texture', 'kit:export'),
        intent('textures hilod masters', 'texture', 'textures:hilod'),
        intent('material presets not canvas', 'style', 'MaterialPresets.applyMaterialPreset'),
        intent('texturebridge applyfromuserdata', 'texture', 'TextureBridge.applyFromUserData'),
        intent('art audit minis', 'other', 'art:audit'),
    ]);

    mergeFile('medium/compiler.jsonl', [...CODE, ...SAFETY]);
    mergeFile('medium/planning.jsonl', PLANS);
    mergeFile('medium/safety.jsonl', SAFETY);
    mergeFile('medium/critical.jsonl', [
        patch(
            `const t = new THREE.CanvasTexture(document.createElement('canvas'));
const m = World.createObject('box', 'Stone Block', 0xffffff, false);
m.material = new THREE.MeshBasicMaterial({ map: t });`,
            IIFE(`    const m = World.createObject('cube', 'Stone Block', 0x9a958c, false);
    m.position.set(0, 0.5, -2);
    m.userData.surfaceType = 'concrete';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(m, 'pbr_concrete_weathered');
    }
    m.userData.textureHint = 'textures/stone_block_albedo.png';`),
        ),
        patch(
            "w.userData.textureHint = 'textures/Mat_Brick_Wall_albedo.png';",
            "w.userData.textureHint = 'textures/mat_brick_wall_albedo.png';",
        ),
    ]);

    // Dedicated wave8 corpora (rewrite keeps wave8 pure)
    mergeFile('small/wave8_art.jsonl', [
        ...INTENTS,
        ...COACHES,
        ...GUIDE,
    ], { rewrite: true });

    mergeFile('medium/wave8_art.jsonl', [
        ...CODE,
        ...SAFETY,
        ...PLANS,
        ...INTENTS.filter((r) => /kit:export|hilod|MaterialPresets|TextureBridge|art:audit/i.test(
            JSON.stringify(r.messages),
        )),
    ], { rewrite: true });

    console.log('\nbootcamp:seed:wave8 — done');
    console.log('  next: npm run bootcamp:build && npm run models:mini');
    console.log('  or:  npm run train:mini -- --wave8');
    console.log('  verify: npm run art:audit');
}

main();
