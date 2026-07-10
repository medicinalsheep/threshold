#!/usr/bin/env node
/**
 * Wave 4 — safety, anti-slop, host/guest MP, failure recovery, export literacy, plan↔code pairs.
 *
 * Usage: node scripts/bootcamp-seed-wave4.cjs
 *        npm run bootcamp:seed:wave4
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

// ═══════════════════════════════════════════════════════════════════════════
// ANTI-SLOP patches (wrong → right)
// ═══════════════════════════════════════════════════════════════════════════

const ANTI_SLOP = [
    patch(
        "const scene = new THREE.Scene();\nconst renderer = new THREE.WebGLRenderer();\nscene.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xff0000})));",
        "const m = World.createObject('cube', 'box_red', 0xff0000, false);\nm.position.set(0, 0.5, -2);",
    ),
    patch(
        "World.clearWorld();\nWorld.createObject('cube', 'a', 0xffffff, false);",
        "// extend only — clearWorld removed (user did not ask to wipe)\nconst a = World.createObject('cube', 'a', 0xffffff, false);",
    ),
    patch(
        "World.createObject({ name: 'crate', type: 'box', color: 0xff0000, hasPhysics: true });",
        "const crate = World.createObject('cube', 'crate', 0xff0000, true);",
    ),
    patch(
        "World.createObject('crate', 'cube', 0x8b4513, true);",
        "const crate = World.createObject('cube', 'crate', 0x8b4513, true);",
    ),
    patch(
        "const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(document.createElement('canvas')) });\nconst m = World.createObject('cube', 'slop', 0xffffff, false);\nm.material = mat;",
        IIFE(`    const m = World.createObject('cube', 'stone_block', 0x9a958c, false);
    m.position.set(0, 0.5, -2);
    m.userData.surfaceType = 'concrete';
    m.userData.materialPreset = 'pbr_concrete_weathered';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(m, 'pbr_concrete_weathered');`),
    ),
    patch(
        "for (let i = 0; i < 50; i++) World.createObject('cube', 'spam_'+i, 0xff0000, true);",
        IIFE(`    // PERF: cap dynamics for Lite/2060 — was 50
    for (let i = 0; i < 6; i++) {
      const c = World.createObject('cube', 'box_' + i, 0x8b4513, true);
      c.position.set((i % 3) - 1, 0.5 + Math.floor(i / 3), -2);
      c.userData.surfaceType = 'wood';
      c.userData.polyBudget = 'low';
    }`),
    ),
    patch(
        "Engine.setRenderMode(2);\n// user: default realistic lighting",
        'Engine.setRenderMode(4);',
    ),
    patch(
        "applySurvivalWorldHooks();\n// default Pages build — survival not loaded",
        "// survival is opt-in (npm run dev:survival) — skip hooks on default build\nconst prop = World.createObject('cube', 'prop', 0xaa6644, false);\nprop.position.set(1, 0.4, 1);",
    ),
    patch(
        "const eng = new ThresholdEngine();\neng.setRenderMode(4);",
        'Engine.setRenderMode(4); // use global Engine — no ThresholdEngine constructor',
    ),
    patch(
        "PlayerController.spawnPlayer();\nPlayerController.spawnPlayer();\nPlayerController.spawnPlayer();",
        'if (!PlayerController.getLocalPlayer()) PlayerController.spawnPlayer();',
    ),
    suggest('// DO NOT use scene.add — place a torus with World API', IIFE(`    const portal = World.createObject('torus', 'portal', 0xaa00ff, false);
    portal.position.set(0, 2, -3);
    portal.userData.surfaceType = 'metal';`)),
    suggest('// DO NOT clearWorld — only add one locked floor pad', IIFE(`    const floor = World.createObject('cube', 'safe_pad', 0x333340, false);
    floor.scale.set(10, 0.2, 10);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';`)),
];

// ═══════════════════════════════════════════════════════════════════════════
// MP host / guest
// ═══════════════════════════════════════════════════════════════════════════

const MP_INTENT = [
    intent('can guests edit the world', 'other', 'host-authoritative sync — guests no edit'),
    intent('can I run compiler as guest', 'other', 'host-only Compiler'),
    intent('spawn a box as guest', 'other', 'host-authoritative — ask host to EDIT'),
    intent('who is session authority', 'other', 'host PeerJS authority'),
    intent('what do guests get on join', 'other', 'FULL_STATE sync + immersiveReplay'),
    intent('save world as guest', 'other', 'host-only Persistence.saveWorld'),
];

const MP_NPC = [
    npc('a multiplayer rules coach', 'Can I spawn crates as a guest?',
        'No — only the host edits. Ask the host to pause (EDIT) and place props. You can play, chat, and spectate.'),
    npc('a multiplayer rules coach', 'Why is Compiler greyed out for me?',
        'Guests cannot run world-mutating code. Host authority keeps the map consistent for everyone.'),
    npc('a multiplayer rules coach', 'What happens when I join mid-session?',
        'You receive FULL_STATE plus immersive replay — weather, audio zones, and shader hooks from the host.'),
    npc('a multiplayer rules coach', 'Can guests open Export wizard?',
        'Export is a host/builder workflow. Guests play the shared map; the host ships builds from their machine.'),
    npc('a host coach', 'Friend wants to build too',
        'Only one host edits at a time. Hand off host or take turns — PeerJS stays host-authoritative.'),
    npc('a guest player', 'I pressed EDIT and nothing happened',
        'Guests stay in PLAY. Editing is host-only so the room does not desync.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// Failure / recovery
// ═══════════════════════════════════════════════════════════════════════════

const RECOVERY_INTENT = [
    intent('ollama cors 403', 'other', 'npm run ollama:serve'),
    intent('ollama offline', 'other', 'ollama serve + OllamaClient'),
    intent('generate button blocked', 'other', 'validateProductionReady'),
    intent('production plan incomplete', 'other', 'AgentPortal Step 3 placement weather'),
    intent('gltf failed to load pink box', 'other', 'aiMemoryFreeze restore + path check'),
    intent('too many glbs parallel error', 'other', 'OllamaRunQueue sequential + park GLBs'),
    intent('texture not applying to mesh', 'texture', 'manifest name match + textures:watch'),
    intent('export slop scan failed', 'export', 'assessSceneSlop surfaceType MaterialPresets'),
    intent('how do I retrain mini models', 'other', 'npm run train:mini'),
];

const RECOVERY_NPC = [
    npc('an Ollama coach', 'I get CORS 403 on GitHub Pages',
        'Stop plain ollama serve and run npm run ollama:serve so OLLAMA_ORIGINS allows your page. Or use local vite dev proxy.'),
    npc('an Ollama coach', 'Portal says Ollama offline',
        'Start ollama on this PC, pull a model, then refresh Agent Portal. Phones cannot reach your laptop Ollama.'),
    npc('an Agent Portal coach', 'GENERATE is locked',
        'Finish production plan — type, title, placement, weather, collision. validateProductionReady blocks incomplete briefs on purpose.'),
    npc('a freeze coach', 'My GLB became a pink placeholder',
        'Enable AI memory freeze after a good build. Check gltfPath still exists under import/ and re-import if the file moved.'),
    npc('a parallel coach', 'Error: too many GLB models for parallel',
        'Turn off parallel local models. Use sequential queue, park unused GLBs in working folder, or freezes after import.'),
    npc('a GIMP coach', 'Textures never show up',
        'Mesh name must match the manifest slot. Save under textures/ and run textures:watch — then TextureBridge apply.'),
    npc('an export coach', 'Slop scan warns on my scene',
        'Add surfaceType, replace CanvasTexture with MaterialPresets, name meshes for GIMP, then re-run export preflight.'),
    npc('a training mentor', 'How do I improve mini models from my session?',
        'SMART DEV → EXPORT TRAINING PAIR → datasets/raw → bootcamp:import → npm run train:mini -- --no-seed.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// Export / immersive literacy
// ═══════════════════════════════════════════════════════════════════════════

const EXPORT_INTENT = [
    intent('export web first only', 'export', 'ExportWizard web'),
    intent('immersive export step weather audio shaders', 'export', 'ExportWizard immersive prefs'),
    intent('bundle audio zones for guests', 'export', 'ExportWizard immersive bundleAudioZones'),
    intent('slop scan before ship', 'export', 'assessSceneSlop + ExportWizard'),
    intent('store prep and verify', 'export', 'store:prep + store:verify'),
    intent('upload guide without signing keys', 'export', 'store:upload upload-guide only'),
    intent('steam package not one click', 'export', 'package:steam + STEAM_RELEASE docs'),
];

const EXPORT_NPC = [
    npc('an export coach', 'Do I need Android for first ship?',
        'No — web-first. Export wizard defaults Web. Native targets stay optional under details until you are ready.'),
    npc('an export coach', 'What is the immersive export step?',
        'It previews weather, audio zones, and shader graphs, runs slop scan, and sets guest replay bundle prefs.'),
    npc('an export coach', 'Will store:upload publish my game?',
        'No — it writes per-platform upload-guide.md. Signing keys and console uploads stay local on your machine.'),
    npc('an export coach', 'Steam from the browser?',
        'Browser export is web. Steam needs package:steam and partner setup — see STEAM_RELEASE docs, not one-click Pages.'),
    npc('a multiplayer export coach', 'Will guests see my rain shaders after export?',
        'If immersive prefs bundle weather and shader graphs, guests re-apply via immersiveReplay on join/load.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// Controls thin pack
// ═══════════════════════════════════════════════════════════════════════════

const CONTROLS = [
    intent('how do I aim ads', 'other', 'CONTROLS LMB ADS'),
    intent('how do I fire shoot', 'other', 'CONTROLS RMB fire'),
    intent('interact key', 'other', 'CONTROLS F'),
    intent('enter vehicle key', 'other', 'CONTROLS E'),
    intent('open game chat', 'other', 'CONTROLS T gameChat'),
    intent('stealth walk key', 'other', 'CONTROLS U hold'),
    npc('a controls coach', 'How do I ADS and shoot?',
        'Hold LMB to aim down sights, RMB to fire. R reloads, V toggles FPS/TPS.'),
    npc('a controls coach', 'Touch layout edit?',
        'Tap TOUCH then UNLOCK to drag pads. + BTN adds actions from the in-app picker.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// TC thin pack (do not mix into blank grid)
// ═══════════════════════════════════════════════════════════════════════════

const TC = [
    intent('open tc reference edition', 'other', 'Lobby TC — not blank grid'),
    intent('tc is not my default game', 'other', 'Lobby TC reference only'),
    npc('a TC lobby guide', 'Is TC my main game?',
        'No — blank grid is your game. Lobby TC is reference editions for vehicles, characters, and circuit demos.'),
    npc('a TC driver', 'How do I enter a vehicle?',
        'In a TC vehicle kit, press E near the cab. Blank-grid sessions do not auto-load TC vehicles.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// PLAN ↔ CODE pairs (same asset id in user text)
// ═══════════════════════════════════════════════════════════════════════════

const PLAN_CODE_PAIRS = [
    {
        id: 'wet_metal_walkway',
        planUser: 'Write a Threshold production plan for: exterior metal walkway, wet rain, static, 2k GIMP, poly low, sequential ollama.',
        planOut: `PLAN: wet metal walkway
1. scope — placement:exterior · hero walkway
2. collision — static locked · surfaceType:metal
3. mesh — cube scaled slab · poly:low
4. textures — gimp master @ 2k · name metal_walkway
5. hilod — textures:watch → _1k/_2k + WebP
6. weather — wet · shaderGraph wet_hero
7. atmosphere — dusk optional · audioZone exterior_open
8. shaders — MaterialPresets / wet_hero graph
9. interact — none
10. codegen — pause-guard IIFE · createObject cube
11. verify — PLAY rain ON · Lite + mode 4
PERF: graphicsTier=Ultra test Lite · ollamaQueue=sequential
GATES: placement=ok surface=metal weather=wet
ACCEPT: walk on metal footsteps · rain wet look · no clearWorld`,
        codeIdea: 'IMPLEMENT PLAN wet_metal_walkway: exterior locked metal walkway slab with wet_hero, poly low',
        code: IIFE(`    // PLAN wet_metal_walkway
    const walk = World.createObject('cube', 'metal_walkway', 0x666677, false);
    walk.scale.set(8, 0.12, 2.2);
    walk.position.set(0, 0.15, -5);
    walk.userData.locked = true;
    walk.userData.surfaceType = 'metal';
    walk.userData.texRes = '2k';
    walk.userData.hilod = true;
    walk.userData.polyBudget = 'low';
    walk.userData.shaderGraph = 'wet_hero';
    if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(walk, 'wet_hero');`),
    },
    {
        id: 'wood_crate_physics',
        planUser: 'Write a Threshold production plan for: exterior wood crate physics, rain wet, 2k, poly low.',
        planOut: `PLAN: exterior wood crate
1. scope — exterior dressing prop
2. collision — dynamic mass~12 · surfaceType:wood
3. mesh — cube · poly:low
4. textures — gimp @ 2k · name wood_crate
5. hilod — _1k/_2k + WebP
6. weather — wet
7. atmosphere — exterior_open optional
8. shaders — PBR wood roughness
9. interact — optional
10. codegen — createObject cube physics true
11. verify — push crate · rain · mode 4
PERF: sequential · Lite ok
ACCEPT: physics moves · wood footsteps nearby`,
        codeIdea: 'IMPLEMENT PLAN wood_crate_physics: single dynamic wood crate',
        code: IIFE(`    // PLAN wood_crate_physics
    const crate = World.createObject('cube', 'wood_crate', 0x8b4513, true);
    crate.position.set(0, 0.5, -2);
    crate.userData.surfaceType = 'wood';
    crate.userData.mass = 12;
    crate.userData.friction = 0.5;
    crate.userData.texRes = '2k';
    crate.userData.polyBudget = 'low';
    crate.userData.hilod = true;`),
    },
    {
        id: 'glass_window',
        planUser: 'Write a Threshold production plan for: transitional glass window, wetGlass, 2k, poly low.',
        planOut: `PLAN: wet glass window
1. scope — transitional window pane
2. collision — static thin · surfaceType:glass
3. mesh — thin cube · poly:low
4. textures — gimp @ 2k optional
5. hilod — yes
6. weather — wet_glass
7. atmosphere — interior_warm behind pane
8. shaders — pbr_glass_wet + glass_rim
9. interact — none
10. codegen — transparent material + wetGlass
11. verify — rain wet glass · mode 4
PERF: Lite ok · sequential
ACCEPT: see-through · wetGlass true`,
        codeIdea: 'IMPLEMENT PLAN glass_window: wet glass pane with glass_rim',
        code: IIFE(`    // PLAN glass_window
    const glass = World.createObject('cube', 'window_pane', 0xaaccff, false);
    glass.scale.set(2.4, 1.6, 0.05);
    glass.position.set(0, 1.4, -6);
    if (glass.material) {
      glass.material.transparent = true;
      glass.material.opacity = 0.32;
      glass.material.roughness = 0.06;
    }
    glass.userData.surfaceType = 'glass';
    glass.userData.wetGlass = true;
    glass.userData.texRes = '2k';
    glass.userData.polyBudget = 'low';
    glass.userData.materialPreset = 'pbr_glass_wet';
    glass.userData.shaderGraph = 'glass_rim';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(glass, 'pbr_glass_wet');
    if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(glass, 'glass_rim');`),
    },
    {
        id: 'lite_yard',
        planUser: 'Write a Threshold production plan for: mobile-lite courtyard grass pad + one bench, poly low, tex 1k ok, sequential.',
        planOut: `PLAN: mobile lite courtyard
1. scope — exterior simple yard
2. collision — floor static locked · bench static
3. mesh — 2 cubes only · poly:low
4. textures — 1k masters ok · hilod webp
5. hilod — WebP for Lite
6. weather — light wet optional
7. atmosphere — exterior_open zone
8. shaders — simple PBR
9. interact — none
10. codegen — few meshes only
11. verify — graphics Lite · mode 4
PERF: graphicsTier=Lite · ollamaQueue=sequential · glbMax=0
ACCEPT: <5 meshes · walk pad`,
        codeIdea: 'IMPLEMENT PLAN lite_yard: grass pad + one wood bench only',
        code: IIFE(`    // PLAN lite_yard — Lite/Mobile few meshes
    const ground = World.createObject('cube', 'yard', 0x3a5a32, false);
    ground.scale.set(12, 0.15, 12);
    ground.position.set(0, 0.08, 0);
    ground.userData.locked = true;
    ground.userData.surfaceType = 'grass';
    ground.userData.polyBudget = 'low';
    ground.userData.texRes = '1k';
    const bench = World.createObject('cube', 'bench', 0x6b4f3a, false);
    bench.scale.set(2.0, 0.35, 0.7);
    bench.position.set(0, 0.2, -3);
    bench.userData.surfaceType = 'wood';
    bench.userData.polyBudget = 'low';`),
    },
    {
        id: 'lab_interior',
        planUser: 'Write a Threshold production plan for: interior lab floor + industrial hum, sheltered, metal accents, 2k.',
        planOut: `PLAN: lab interior volume
1. scope — interior sheltered
2. collision — floor locked · surfaceType:concrete
3. mesh — floor + optional door · poly:medium
4. textures — 2k gimp
5. hilod — yes
6. weather — sheltered zoneSheltered
7. atmosphere — industrial_hum audioZone
8. shaders — metal accents brushed
9. interact — door optional
10. codegen — pause guard
11. verify — walk interior · no rain wet on floor
PERF: sequential · freeze after any GLB
ACCEPT: zoneSheltered · industrial_hum`,
        codeIdea: 'IMPLEMENT PLAN lab_interior: locked concrete floor + industrial hum zone',
        code: IIFE(`    // PLAN lab_interior
    const floor = World.createObject('cube', 'lab_floor', 0x3a3a42, false);
    floor.scale.set(14, 0.2, 14);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    floor.userData.texRes = '2k';
    const hum = World.createObject('cube', 'lab_hum', 0x444444, false);
    hum.scale.set(12, 3, 12);
    hum.position.set(0, 1.5, 0);
    hum.visible = false;
    hum.userData.zoneSheltered = true;
    hum.userData.audioZone = 'industrial_hum';`),
    },
    {
        id: 'neon_sign',
        planUser: 'Write a Threshold production plan for: night neon marquee sign exterior, emissive, poly low.',
        planOut: `PLAN: neon marquee
1. scope — exterior sign
2. collision — static locked
3. mesh — flat cube · poly:low
4. textures — optional 2k
5. hilod — webp ok
6. weather — weatherMarquee
7. atmosphere — night fog · highway_edge optional
8. shaders — pbr_emissive_marquee · emissive_pulse
9. interact — none
10. codegen — emissive material
11. verify — night look mode 4
PERF: Lite ok
ACCEPT: emissive visible · weatherMarquee true`,
        codeIdea: 'IMPLEMENT PLAN neon_sign: emissive marquee with pulse hook',
        code: IIFE(`    // PLAN neon_sign
    if (window.Environment?.setTimeOfDay) Environment.setTimeOfDay(22);
    const sign = World.createObject('cube', 'marquee', 0xff2266, false);
    sign.scale.set(3.5, 0.7, 0.12);
    sign.position.set(0, 3.2, -8);
    sign.userData.locked = true;
    sign.userData.surfaceType = 'metal';
    sign.userData.weatherMarquee = true;
    sign.userData.polyBudget = 'low';
    sign.userData.materialPreset = 'pbr_emissive_marquee';
    sign.userData.shaderHook = 'emissive_pulse';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(sign, 'pbr_emissive_marquee');
    if (window.ShaderRegistry?.applyHook) ShaderRegistry.applyHook(sign, 'emissive_pulse');`),
    },
    {
        id: 'snow_crate',
        planUser: 'Write a Threshold production plan for: snow exterior crate with snowCap, wood, 2k.',
        planOut: `PLAN: snow crate
1. scope — exterior
2. collision — dynamic · wood
3. mesh — cube poly low
4. textures — 2k
5. hilod — yes
6. weather — snow · snowCap
7. atmosphere — cold fog optional
8. shaders — pbr_wood_snow · snow_freshen
9. interact — none
10. codegen — physics crate
11. verify — snow look
PERF: sequential
ACCEPT: snowCap set · wood surface`,
        codeIdea: 'IMPLEMENT PLAN snow_crate: dynamic wood crate with snowCap',
        code: IIFE(`    // PLAN snow_crate
    const c = World.createObject('cube', 'snow_crate', 0x8b6914, true);
    c.position.set(0, 0.5, -3);
    c.userData.surfaceType = 'wood';
    c.userData.snowCap = 0.85;
    c.userData.mass = 12;
    c.userData.texRes = '2k';
    c.userData.polyBudget = 'low';
    c.userData.materialPreset = 'pbr_wood_snow';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(c, 'pbr_wood_snow');`),
    },
    {
        id: 'ai_station_marker',
        planUser: 'Write a Threshold production plan for: AI Build Station marker prop on grid, static metal, interact F, 2k.',
        planOut: `PLAN: AI Build Station marker
1. scope — grid hero station
2. collision — static locked · metal
3. mesh — cube poly medium
4. textures — 2k · name AI Build Station
5. hilod — yes
6. weather — partial ok
7. atmosphere — none required
8. shaders — metal emissive accent
9. interact — F AI Build
10. codegen — interactHint
11. verify — F opens portal flow
PERF: sequential
ACCEPT: interactHint set · locked`,
        codeIdea: 'IMPLEMENT PLAN ai_station_marker: locked metal station with F interact',
        code: IIFE(`    // PLAN ai_station_marker
    const station = World.createObject('cube', 'AI Build Station', 0x2a4a6a, false);
    station.scale.set(1.6, 1.2, 1.0);
    station.position.set(0, 0.6, -8);
    station.userData.locked = true;
    station.userData.surfaceType = 'metal';
    station.userData.texRes = '2k';
    station.userData.hilod = true;
    Object.assign(station.userData, { interactHint: 'AI Build (F)', interactRadius: 2.5 });
    if (station.material) {
      station.material.emissive = new THREE.Color(0x2266aa);
      station.material.emissiveIntensity = 0.35;
    }`),
    },
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
    console.log(`  ${rel}: +${added} → ${existing.length}`);
    return { added, total: existing.length };
}

function writeFile(rel, rows) {
    const file = path.join(DS, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const seen = new Set();
    const out = [];
    for (const r of rows) {
        const k = JSON.stringify(r.messages?.[0]?.content || '');
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(r);
    }
    fs.writeFileSync(file, `${out.map((r) => JSON.stringify(r)).join('\n')}\n`);
    console.log(`  ${rel}: write ${out.length}`);
    return out.length;
}

function main() {
    console.log('bootcamp:seed:wave4 — safety + plan/code pairs + recovery + export\n');

    const plans = [];
    const codes = [];
    const scenes = [];
    for (const p of PLAN_CODE_PAIRS) {
        plans.push(plan(p.planUser, p.planOut));
        codes.push(scene(p.codeIdea, p.code));
        codes.push(suggest(`// IMPLEMENT PLAN ${p.id}`, p.code));
    }

    writeFile(path.join('medium', 'safety.jsonl'), ANTI_SLOP);
    writeFile(path.join('medium', 'plan_code.jsonl'), [
        ...plans,
        ...codes.filter((r) => r.task === 'dev_suggest'),
    ]);
    writeFile(path.join('small', 'safety_npc.jsonl'), [
        ...MP_NPC,
        ...RECOVERY_NPC,
        ...EXPORT_NPC,
        ...CONTROLS.filter((r) => r.task === 'npc_chat'),
        ...TC.filter((r) => r.task === 'npc_chat'),
    ]);

    mergeFile(path.join('small', 'classify.jsonl'), [
        ...MP_INTENT,
        ...RECOVERY_INTENT,
        ...EXPORT_INTENT,
        ...CONTROLS.filter((r) => r.task === 'intent_classify'),
        ...TC.filter((r) => r.task === 'intent_classify'),
    ]);
    mergeFile(path.join('small', 'npc.jsonl'), [
        ...MP_NPC,
        ...RECOVERY_NPC,
        ...EXPORT_NPC,
        ...CONTROLS.filter((r) => r.task === 'npc_chat'),
        ...TC.filter((r) => r.task === 'npc_chat'),
    ]);
    mergeFile(path.join('medium', 'compiler.jsonl'), ANTI_SLOP);
    mergeFile(path.join('medium', 'planning.jsonl'), plans);
    mergeFile(path.join('large', 'scenes.jsonl'), codes.filter((r) => r.task === 'scene_script'));

    // rebuild compiler splits
    const full = fs.readFileSync(path.join(DS, 'medium', 'compiler.jsonl'), 'utf8')
        .trim().split(/\n+/).filter(Boolean).map((l) => JSON.parse(l));
    fs.writeFileSync(
        path.join(DS, 'medium', 'patches.jsonl'),
        `${full.filter((r) => r.task === 'dev_patch').map((r) => JSON.stringify(r)).join('\n')}\n`,
    );
    fs.writeFileSync(
        path.join(DS, 'medium', 'suggests.jsonl'),
        `${full.filter((r) => r.task === 'dev_suggest').map((r) => JSON.stringify(r)).join('\n')}\n`,
    );

    console.log(`\nPlan↔code pairs: ${PLAN_CODE_PAIRS.length}`);
    console.log('Next: npm run bootcamp:build && npm run models:mini && npm run ollama:golden');
}

main();
