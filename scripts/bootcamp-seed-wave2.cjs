#!/usr/bin/env node
/**
 * Wave 2 — whole-product training expansion (merge into JSONL).
 * Covers lobby/MP, TC, export, creative pipeline, controls help, immersive systems,
 * hard API signature drills, anti-patterns, agent portal, survival opt-in.
 *
 * Usage: node scripts/bootcamp-seed-wave2.cjs
 *        npm run bootcamp:seed:wave2
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
function intent(u, i, a) { return pair('intent_classify', u, `INTENT: ${i}\nAPI: ${a}`); }
function npc(p, q, a) { return pair('npc_chat', `You are ${p}. Player says: ${q}`, a); }
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
// HARD API SIGNATURE DRILLS (type, name, color, physics) — critical quality
// ═══════════════════════════════════════════════════════════════════════════

const API_DRILLS = [
    patch(
        "World.createObject({ name: 'crate', type: 'box', color: 0xff0000 });",
        "const crate = World.createObject('cube', 'crate', 0xff0000, true);",
    ),
    patch(
        "World.createObject('crate', 'cube', 0xff0000, false);",
        "const crate = World.createObject('cube', 'crate', 0xff0000, false);",
    ),
    patch(
        "World.createObject(0xff0000, 'cube', 'crate', true);",
        "const crate = World.createObject('cube', 'crate', 0xff0000, true);",
    ),
    patch(
        "const m = World.createObject('box', 'wall', '#333', false);",
        "const m = World.createObject('cube', 'wall', 0x333333, false);",
    ),
    patch(
        "scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0xff0000})));",
        "const m = World.createObject('cube', 'box_red', 0xff0000, false);",
    ),
    patch(
        "const renderer = new THREE.WebGLRenderer(); const scene = new THREE.Scene();",
        "// Threshold owns renderer/scene — use World.createObject only\nconst m = World.createObject('cube', 'prop', 0x888888, false);",
    ),
    pair('dev_patch',
        'Convert object-form createObject to positional Threshold API:\n```js\nWorld.createObject({ type: "sphere", name: "orb", color: 0x00ffaa, hasPhysics: true });\n```',
        "const orb = World.createObject('sphere', 'orb', 0x00ffaa, true);",
    ),
    pair('dev_patch',
        'Reply with ONLY the correct signature line for a static concrete floor named floor_pad color 0x3a3a40',
        "const floor_pad = World.createObject('cube', 'floor_pad', 0x3a3a40, false);",
    ),
    pair('dev_patch',
        'Correct this call order mistake (name was first):\n```js\nWorld.createObject(\'door\', \'cube\', 0x445566, false);\n```',
        "const door = World.createObject('cube', 'door', 0x445566, false);",
    ),
    pair('dev_suggest',
        'Write one line: create a physics cube named crate color 0x8b4513',
        "const crate = World.createObject('cube', 'crate', 0x8b4513, true);",
    ),
    pair('dev_suggest',
        'Write one line: create a non-physics sphere named beacon color 0x00ffcc',
        "const beacon = World.createObject('sphere', 'beacon', 0x00ffcc, false);",
    ),
    pair('dev_suggest',
        'Write one line: create a cone marker named pin color 0xffaa00 with physics',
        "const pin = World.createObject('cone', 'pin', 0xffaa00, true);",
    ),
    pair('dev_suggest',
        'Write one line: create a torus named portal color 0xaa00ff no physics',
        "const portal = World.createObject('torus', 'portal', 0xaa00ff, false);",
    ),
];

// ═══════════════════════════════════════════════════════════════════════════
// INTENT — whole product surface
// ═══════════════════════════════════════════════════════════════════════════

const CLASSIFY = [
    // lobby / session / MP
    intent('create a multiplayer session', 'other', 'Lobby.CREATE SESSION'),
    intent('join with room code BRAV-XXXX-YYYY', 'other', 'Lobby.join'),
    intent('share invite link with friends', 'other', 'Lobby invite panel'),
    intent('set host passcode', 'other', 'Lobby passcode + PLAYERS'),
    intent('kick a guest', 'other', 'PLAYERS panel host'),
    intent('enable host migration', 'other', 'hostMigration'),
    intent('start spectating player 2', 'other', 'spectate'),
    intent('turn on proximity VOIP', 'other', 'voip'),
    intent('open session panel', 'other', 'Tab session panel'),
    // TC reference
    intent('open threshold child TC edition', 'other', 'Lobby TC'),
    intent('load TC vehicles showcase', 'other', 'Lobby TC + tcVeh'),
    intent('start circuit race checkpoints', 'other', 'tcCircuit'),
    intent('drive the haul truck', 'other', 'tcDrive + interact E'),
    intent('spawn TC character kit', 'spawn', 'tcChr + gltfImport'),
    // controls help
    intent('how do I sprint', 'other', 'CONTROLS Shift'),
    intent('how do I crouch', 'other', 'CONTROLS Ctrl'),
    intent('how do I stealth walk', 'other', 'CONTROLS U hold'),
    intent('how do I aim down sights', 'other', 'CONTROLS LMB ADS'),
    intent('how do I shoot', 'other', 'CONTROLS RMB fire'),
    intent('how do I reload', 'other', 'CONTROLS R'),
    intent('toggle FPS third person', 'other', 'CONTROLS V'),
    intent('enter vehicle key', 'other', 'CONTROLS E'),
    intent('open chat', 'other', 'CONTROLS T gameChat'),
    intent('flashlight toggle', 'other', 'CONTROLS L'),
    intent('rebind keys', 'other', 'KEYS menu + bindings'),
    intent('unlock touch button layout', 'other', 'hub UNLOCK touch'),
    intent('walk fly toggle', 'other', 'CONTROLS Y'),
    // agent portal / SETUP
    intent('open agent portal', 'other', 'AgentPortal'),
    intent('complete production plan before generate', 'other', 'assetProductionPlan + AgentPortal'),
    intent('set ollama small tier model', 'other', 'AgentRouter tier prefs'),
    intent('paste grok api key', 'other', 'SETUP + Auth'),
    intent('enable ai memory freeze', 'other', 'aiMemoryFreeze SETUP'),
    intent('set working folder for agents', 'other', 'workFolderScope SETUP'),
    intent('run smart dev suggest', 'other', 'Compiler SMART DEV'),
    intent('export training pair from compiler', 'other', 'SETUP EXPORT TRAINING PAIR'),
    intent('queue training on apply', 'other', 'trainingImport queue'),
    // creative pipeline
    intent('install gimp plugin', 'texture', 'npm run gimp:install'),
    intent('install blender addon', 'spawn', 'npm run blender:install'),
    intent('export avatar from blender', 'spawn', 'blender:avatar + gltfImport'),
    intent('generate hilod texture tiers', 'texture', 'textures:hilod'),
    intent('compress textures to webp', 'texture', 'tex:compress'),
    intent('pack starter kit assets', 'other', 'kit:export'),
    intent('verify starter sounds', 'sound', 'sounds:verify'),
    intent('fetch real ambient loops', 'sound', 'sounds:fetch:ambient'),
    // export / store
    intent('export web only build', 'export', 'ExportWizard web'),
    intent('export android apk', 'export', 'ExportWizard + package:android'),
    intent('export windows electron', 'export', 'ExportWizard + package:win'),
    intent('export ios capacitor', 'export', 'ExportWizard + package:ios'),
    intent('steam depot package', 'export', 'package:steam + steam:depot'),
    intent('run store verify smoke', 'export', 'store:verify'),
    intent('generate store upload guide', 'export', 'store:upload'),
    intent('quick export and play', 'export', 'quickExportPlay'),
    intent('include immersive weather in export', 'export', 'ExportWizard immersive step'),
    intent('slop scan before ship', 'export', 'assessSceneSlop + ExportWizard'),
    // immersive / weather / shaders
    intent('set dusty exterior wear', 'edit', 'userData.dustExposure + weatherSystem'),
    intent('enable heat shimmer shader', 'style', 'ShaderRegistry heat_shimmer'),
    intent('apply pbr metal brushed preset', 'style', 'MaterialPresets pbr_metal_brushed'),
    intent('apply pbr glass wet preset', 'style', 'MaterialPresets pbr_glass_wet'),
    intent('apply pbr wood snow preset', 'style', 'MaterialPresets pbr_wood_snow'),
    intent('apply pbr asphalt wet', 'style', 'MaterialPresets pbr_asphalt_wet'),
    intent('apply neon rim graph', 'style', 'ShaderNodeGraph neon_rim'),
    intent('apply storm exterior graph', 'style', 'ShaderNodeGraph storm_exterior'),
    intent('apply wind foliage graph', 'style', 'ShaderNodeGraph wind_foliage'),
    intent('set interior warm audio zone', 'sound', 'userData.audioZone interior_warm'),
    intent('set highway edge ambient', 'sound', 'userData.audioZone highway_edge'),
    // survival opt-in
    intent('enable survival hunger thirst', 'other', 'dev/survival npm run dev:survival'),
    intent('add survival food prop', 'spawn', 'dev/survival interact food'),
    // relay / self-host
    intent('self host peer relay', 'other', 'relay/ Docker PM2'),
    intent('verify relay health', 'other', 'relay:verify'),
    // graphics quality
    intent('set graphics ultra', 'graphics', 'graphicsProfile Ultra'),
    intent('set graphics mobile lite', 'graphics', 'graphicsProfile Lite'),
    intent('disable water reflections', 'graphics', 'graphicsProfile + Environment'),
    // persistence
    intent('save world code', 'other', 'Persistence.saveWorld'),
    intent('load world from share link', 'other', 'Persistence + ?world='),
    intent('undo scene edit', 'edit', 'sceneHistory undo'),
    intent('redo scene edit', 'edit', 'sceneHistory redo'),
    // chat intent paraphrases
    intent('gimme crates with physics', 'spawn', 'World.createObject'),
    intent('make it rain at dusk', 'edit', 'Environment + State.env'),
    intent('ship web build now', 'export', 'ExportWizard'),
    intent('gimp maps on the floor please', 'texture', 'userData.textures + textures:watch'),
    intent('terminal green mode', 'style', 'Engine.setRenderMode(2)'),
    intent('realistic pbr please', 'graphics', 'Engine.setRenderMode(4)'),
    intent('clang when door hits', 'sound', 'userData.soundClipId collision'),
    intent('freeze the ai build', 'other', 'aiMemoryFreeze'),
    intent('who can edit multiplayer', 'other', 'host-authoritative sync'),
    intent('train mini models', 'other', 'npm run train:mini'),
];

// ═══════════════════════════════════════════════════════════════════════════
// NPC — product coaches + world flavor
// ═══════════════════════════════════════════════════════════════════════════

const NPC = [
    npc('a lobby host coach', 'What do I pick at CREATE?',
        'Name yourself, choose BUILD or PLAY, then CREATE SESSION. Solo ENTER → starts EDIT on the blank grid.'),
    npc('a lobby host coach', 'Passcode?',
        'Optional at CREATE — change later in PLAYERS. Share room code or invite link so friends join.'),
    npc('a multiplayer rules coach', 'Can guests spawn crates?',
        'No — host-authoritative. Guests play and chat; only the host pauses to EDIT and run Compiler.'),
    npc('a multiplayer rules coach', 'What do guests get on join?',
        'FULL_STATE sync plus immersive replay — weather, audio zones, shader hooks from the host manifest.'),
    npc('a TC lobby guide', 'Should I use TC or blank grid?',
        'Blank grid is your game. Lobby TC is reference editions — vehicles, characters, circuit — for demos and export practice.'),
    npc('a TC driver', 'Controls in the haul truck?',
        'Press E near the cab to enter, then drive binds. Checkpoints on the circuit mark splits — hit tc_cp gates.'),
    npc('a controls coach', 'ADS and fire?',
        'Hold LMB to aim down sights, RMB to fire. R reloads, V toggles FPS/TPS, F interacts, E enters vehicles.'),
    npc('a controls coach', 'Stealth and crouch?',
        'Hold Ctrl to crouch, hold U for stealth walk — quieter footsteps on soft surfaceTypes.'),
    npc('a controls coach', 'Third Eye?',
        'F toggles Third Eye highlights; Alt-hold peeks with free mouse for UI. SETUP can request fullscreen while peeking.'),
    npc('a touch coach', 'Custom touch buttons?',
        'Tap TOUCH, then UNLOCK to drag pads. + BTN adds actions from the in-app picker — no browser prompts.'),
    npc('an Agent Portal coach', 'What blocks GENERATE?',
        'Production plan incomplete — placement, weather, collision, atmosphere. Portal gates until validateProductionReady passes.'),
    npc('an Agent Portal coach', 'Grok or Ollama?',
        'Portal auto-detects both. Large scenes prefer Grok when keyed; local Ollama for NPC and patches on this PC.'),
    npc('a SETUP coach', 'Tier models on a 2060?',
        'Small/medium: llama3.2:3B or threshold-mini-*. Large: qwen2.5 or Grok. Avoid qwen3 thinking for code.'),
    npc('a SETUP coach', 'Memory freeze?',
        'Turn on AI memory freeze after a good build — restores GLTF paths and placeholders if assets fail next load.'),
    npc('a Compiler coach', 'SMART DEV vs RUN?',
        'SUGGEST proposes a patch; review then APPLY/RUN while EDIT paused. Export training pairs from SETUP to grow bootcamp.'),
    npc('a PromptGen coach', 'Will it wipe my scene?',
        'No — PromptGen extends the live scene. clearWorld only if you explicitly ask to wipe.'),
    npc('a GIMP coach', 'Manifest name mismatch?',
        'Mesh name must match threshold_manifest object name. Save maps under textures/ and run textures:watch for live SYNC.'),
    npc('a Blender coach', 'LOD exports?',
        'Use Threshold Blender lod_export / blender:export — drop GLB in import/, INSERT or script gltfImport.'),
    npc('an export coach', 'Web first?',
        'Yes — Export wizard defaults Web. Android, Windows, iOS, Steam stay optional under details until you need them.'),
    npc('an export coach', 'Immersive step?',
        'Step IMMERSIVE previews weather, audio zones, shader graphs, and slop scan before bundling guest replay prefs.'),
    npc('a store coach', 'Will upload ship keys?',
        'No — signing stays local. store:upload only writes per-platform upload-guide.md.'),
    npc('a weather coach', 'Rain not wetting props?',
        'Set userData.surfaceType — concrete, wood, metal, glass, gravel, grass, asphalt. WeatherSystem needs those tags.'),
    npc('a shader coach', 'MaterialPresets vs CanvasTexture?',
        'Always prefer MaterialPresets ids and surfaceType. CanvasTexture noise is slop — export preflight flags it.'),
    npc('an audio coach', 'Zone types?',
        'interior_warm, exterior_open, industrial_hum, creek_near, highway_edge — set userData.audioZone on a volume mesh.'),
    npc('a physics coach', 'Floor falls apart?',
        'Lock static floors: userData.locked = true and usePhysics false. Dynamics use usePhysics true with mass/friction.'),
    npc('a survival coach', 'Hunger HUD missing?',
        'Survival is opt-in: npm run dev:survival. Default Pages builds intentionally omit vitals.'),
    npc('a relay coach', 'Self-host friends cross-network?',
        'Run relay/ with Docker or PM2, open ports, point PeerJS config at your host — relay:verify checks health.'),
    npc('a performance coach', 'Scene too heavy for Ollama?',
        'Parallel Ollama guard blocks huge GLB batches. Prefer sequential queue and freeze memory after big imports.'),
    npc('a realism coach', 'Footsteps wrong surface?',
        'Match floor userData.surfaceType to the material — wood indoor, concrete pad, metal walkway, gravel path.'),
    npc('Nikola, inventor', 'What is mode 4?',
        'Render mode 4 is realistic PBR — Threshold default. Retro terminal or toon only when you ask for style.'),
    npc('Nikola, inventor', 'AI Build Station F?',
        'Approach the station, press F — Portal intake. Describe placement and weather, then GENERATE a script.'),
    npc('a merchant', 'Where are the brass fittings?',
        'Courtyard crates restock after rain — fair prices, no coin, just haul and trade. [ACTION: points past the station]'),
    npc('a lab guard', 'Guest trying to edit',
        'Only the host builds. Guests explore. If you need a prop moved, ask the host to pause and EDIT.'),
    npc('a guide', 'Corner hubs again?',
        'Top-left PLAY/EDIT, top-right TOOLS in EDIT, bottom-left walk/fly/touch, bottom-right SCENE or SKIN.'),
    npc('a guide', 'How do I open Compiler?',
        'EDIT mode → TOOLS top-right → Compiler. Stay paused when running world-mutating scripts.'),
    npc('a training mentor', 'How do mini models improve?',
        'Export SMART DEV pairs, drop into datasets/raw, bootcamp:import, then npm run train:mini -- --no-seed.'),
    npc('a graphics coach', 'Lite vs Ultra?',
        'graphicsProfile picks HILOD tiers and effects. Mobile lite uses smaller WebP; Ultra allows richer water/reflectors.'),
    npc('a VOIP coach', 'Nobody hears me',
        'Allow mic permission, enable VOIP, stay in proximity range — it is spatial, not global shout chat.'),
    npc('a persistence coach', 'Share my world?',
        'SAVE WORLD for a code, then share Persistence share URL with ?world= — guests load the map read-only in PLAY.'),
    npc('a stealth coach', 'Hide from NPCs?',
        'Hold U stealth, crouch, prefer soft surfaceTypes — louder on metal and concrete.'),
    npc('an immersive coach', 'Guest missing rain wetness?',
        'Export with immersive prefs on — guests re-apply weather, audio zones, and shader hooks via immersiveReplay.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// MEDIUM — patches / suggests across systems
// ═══════════════════════════════════════════════════════════════════════════

const COMPILER = [
    ...API_DRILLS,
    // material presets catalog
    ...['pbr_default', 'pbr_concrete_weathered', 'pbr_asphalt_wet', 'pbr_wood_snow', 'pbr_metal_brushed', 'pbr_glass_wet', 'pbr_emissive_marquee', 'pbr_fabric_muted'].map((id, i) =>
        suggest(`// apply MaterialPreset ${id}`, IIFE(`    const m = World.createObject('cube', 'preset_${id}', 0x888888, false);
    m.position.set(${(i % 4) - 1.5}, 0.5, ${-2 - Math.floor(i / 4)});
    m.userData.materialPreset = '${id}';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(m, '${id}');`)),
    ),
    // anti-patterns
    patch(
        "World.clearWorld();\nWorld.createObject('cube', 'a', 0xffffff, false);",
        "// extend only — clearWorld removed\nconst a = World.createObject('cube', 'a', 0xffffff, false);",
    ),
    patch(
        "Engine.setRenderMode(2);\n// user asked for realistic lighting",
        "Engine.setRenderMode(4);\n// realistic PBR default when user wants realistic",
    ),
    patch(
        "mesh.userData.surfaceType = 'stone';",
        "mesh.userData.surfaceType = 'concrete'; // valid: concrete|asphalt|wood|metal|gravel|grass|glass",
    ),
    patch(
        "mesh.userData.audioZone = 'rain';",
        "mesh.userData.audioZone = 'exterior_open'; // interior_warm|exterior_open|industrial_hum|creek_near|highway_edge",
    ),
    // interact props
    suggest('// F-interact plaque pedestal', IIFE(`    const ped = World.createObject('cube', 'plaque_pedestal', 0x555566, false);
    ped.scale.set(0.55, 1.0, 0.55);
    ped.position.set(1.5, 0.5, 2);
    ped.userData.surfaceType = 'metal';
    Object.assign(ped.userData, { interactHint: 'Read plaque', interactRadius: 2.2 });`)),
    suggest('// vehicle enter hint prop (E)', IIFE(`    const cab = World.createObject('cube', 'vehicle_cab', 0x334455, false);
    cab.scale.set(2.2, 1.4, 1.2);
    cab.position.set(6, 0.7, 0);
    cab.userData.surfaceType = 'metal';
    Object.assign(cab.userData, { interactHint: 'Enter vehicle (E)', interactRadius: 2.8 });`)),
    // env
    suggest('// noon clear atmosphere', IIFE(`    if (window.Environment?.setTimeOfDay) Environment.setTimeOfDay(12);
    if (window.Environment?.setFog) Environment.setFog(0.008);
    if (State.env) { State.env.atmosphereEnabled = true; State.env.fogDensity = 0.008; }`)),
    suggest('// midnight heavy fog', IIFE(`    if (window.Environment?.setTimeOfDay) Environment.setTimeOfDay(0.5);
    if (window.Environment?.setFog) Environment.setFog(0.035);
    if (State.env) { State.env.atmosphereEnabled = true; State.env.fogDensity = 0.035; }`)),
    // textures
    suggest('// GIMP PBR maps matching mesh name Starter Ground', IIFE(`    const pad = World.createObject('cube', 'Starter Ground', 0xffffff, false);
    pad.scale.set(12, 0.15, 12);
    pad.position.set(0, 0.08, 0);
    pad.userData.locked = true;
    pad.userData.surfaceType = 'concrete';
    pad.userData.textures = {
      albedo: 'textures/starter_ground_albedo.png',
      roughness: 'textures/starter_ground_roughness.png',
      normal: 'textures/starter_ground_normal.png'
    };
    if (window.TextureBridge) TextureBridge.apply(pad);`)),
    // multiplayer-safe extend
    suggest('// host-only world mutate with pause guard', IIFE(`    const flag = World.createObject('cone', 'host_flag', 0xffcc00, false);
    flag.position.set(0, 1.2, 0);
    flag.userData.surfaceType = 'metal';
    UI.status('Host placed flag');`)),
    // survival opt-in patterns (document as optional)
    suggest('// optional survival food prop — only if SurvivalNeeds loaded', IIFE(`    const food = World.createObject('cube', 'rations', 0xaa6644, false);
    food.position.set(2, 0.4, 2);
    food.scale.set(0.4, 0.3, 0.4);
    Object.assign(food.userData, {
      interactAction: 'survival',
      survivalKind: 'food',
      interactHint: 'Grab rations',
      interactRadius: 2.2
    });
    if (typeof applySurvivalWorldHooks === 'function') applySurvivalWorldHooks();`)),
    suggest('// optional survival water well', IIFE(`    const well = World.createObject('cube', 'water_well', 0x3a5a6b, false);
    well.position.set(-4, 0.5, 4);
    Object.assign(well.userData, {
      interactAction: 'survival',
      survivalKind: 'water',
      interactHint: 'Fill canteen',
      interactRadius: 2.5
    });
    if (typeof applySurvivalWorldHooks === 'function') applySurvivalWorldHooks();`)),
    // physics stacks
    suggest('// pyramid of 6 physics cubes', IIFE(`    let n = 0;
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 3 - row; i++) {
        const c = World.createObject('cube', 'pyr_' + (n++), 0xc4a574, true);
        c.position.set(i * 1.05 - (2 - row) * 0.5, 0.5 + row * 1.05, -3);
        c.userData.surfaceType = 'wood';
        c.userData.mass = 10;
      }
    }`)),
    // lighting props
    suggest('// dual lanterns flanking doorway', IIFE(`    for (const x of [-1.4, 1.4]) {
      const lamp = World.createObject('cube', 'lantern_' + x, 0x4a3728, false);
      lamp.scale.set(0.25, 0.9, 0.25);
      lamp.position.set(x, 1.6, -5);
      if (lamp.material) {
        lamp.material.emissive = new THREE.Color(0xffaa44);
        lamp.material.emissiveIntensity = 0.55;
        lamp.material.metalness = 0.4;
        lamp.material.roughness = 0.45;
      }
      lamp.userData.surfaceType = 'metal';
      lamp.userData.shaderHook = 'emissive_pulse';
    }`)),
    // common syntax fixes
    patch(
        "const a = World.createObject('cube', 'a', 0xff0000, false)\nconst b = World.createObject('cube', 'b', 0x00ff00, false)",
        "const a = World.createObject('cube', 'a', 0xff0000, false);\nconst b = World.createObject('cube', 'b', 0x00ff00, false);",
    ),
    patch(
        "m.rotation.y = 45;",
        'm.rotation.y = Math.PI / 4; // radians',
    ),
    patch(
        "m.scale = 2;",
        'm.scale.set(2, 2, 2);',
    ),
    patch(
        "PlayerController.spawnPlayer(0, 1, 0);",
        'if (!PlayerController.getLocalPlayer()) PlayerController.spawnPlayer({ x: 0, y: 1, z: 0 });',
    ),
    // render mode explicit user requests
    suggest('// USER ASKED terminal green only', `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(2);
    const m = World.createObject('cube', 'term_block', 0x00ff66, false);
    m.position.set(0, 1, -2);
    if (m.material) {
      m.material.emissive = new THREE.Color(0x00ff66);
      m.material.emissiveIntensity = 0.25;
    }
    UI.status('Terminal mode');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`),
    suggest('// USER ASKED toon style only', `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(1);
    const m = World.createObject('sphere', 'toon_ball', 0xff9944, false);
    m.position.set(0, 1.2, -2);
    UI.status('Toon mode');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`),
    // guided session style props
    suggest('// AI Build Station simple marker prop', IIFE(`    const station = World.createObject('cube', 'AI Build Station', 0x2a4a6a, false);
    station.scale.set(1.6, 1.2, 1.0);
    station.position.set(0, 0.6, -8);
    station.userData.surfaceType = 'metal';
    station.userData.locked = true;
    Object.assign(station.userData, { interactHint: 'AI Build (F)', interactRadius: 2.5 });
    if (station.material) {
      station.material.emissive = new THREE.Color(0x2266aa);
      station.material.emissiveIntensity = 0.35;
    }`)),
];

// ═══════════════════════════════════════════════════════════════════════════
// LARGE — whole scenes for product verticals
// ═══════════════════════════════════════════════════════════════════════════

const SCENES = [
    scene('blank-grid starter: locked concrete pad + AI station marker + player', IIFE(`    const floor = World.createObject('cube', 'grid_pad', 0x3a3a42, false);
    floor.scale.set(24, 0.2, 24);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    const station = World.createObject('cube', 'AI Build Station', 0x2a4a6a, false);
    station.scale.set(1.6, 1.2, 1.0);
    station.position.set(0, 0.6, -8);
    station.userData.locked = true;
    station.userData.surfaceType = 'metal';
    Object.assign(station.userData, { interactHint: 'AI Build (F)', interactRadius: 2.5 });
    if (window.PlayerController?.getLocalPlayer && !PlayerController.getLocalPlayer()) {
      PlayerController.spawnPlayer({ x: 0, y: 1, z: 4 });
    }`)),
    scene('multiplayer stage props: host flag, spectator cone, locked floor', IIFE(`    const floor = World.createObject('cube', 'mp_floor', 0x2a2a33, false);
    floor.scale.set(18, 0.2, 18);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    const flag = World.createObject('cone', 'host_flag', 0xffcc00, false);
    flag.position.set(0, 1.2, 0);
    const seat = World.createObject('cube', 'spec_seat', 0x444455, false);
    seat.scale.set(1.2, 0.4, 1.2);
    seat.position.set(5, 0.2, 5);
    seat.userData.surfaceType = 'metal';`)),
    scene('export-demo courtyard: bench, lamp, wood crates, exterior audio', IIFE(`    const floor = World.createObject('cube', 'yard', 0x4a5a3a, false);
    floor.scale.set(16, 0.15, 16);
    floor.position.set(0, 0.08, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'grass';
    const bench = World.createObject('cube', 'bench', 0x6b4f3a, false);
    bench.scale.set(2.2, 0.35, 0.8);
    bench.position.set(-2, 0.2, -3);
    bench.userData.surfaceType = 'wood';
    const lamp = World.createObject('cube', 'lamp', 0x4a3728, false);
    lamp.scale.set(0.3, 1.3, 0.3);
    lamp.position.set(-1, 0.85, -3);
    if (lamp.material) {
      lamp.material.emissive = new THREE.Color(0xffaa44);
      lamp.material.emissiveIntensity = 0.5;
    }
    for (let i = 0; i < 2; i++) {
      const c = World.createObject('cube', 'crate_' + i, 0x8b4513, true);
      c.position.set(2 + i, 0.5, -2);
      c.userData.surfaceType = 'wood';
    }
    const zone = World.createObject('cube', 'yard_zone', 0x888888, false);
    zone.scale.set(14, 4, 14);
    zone.position.set(0, 2, 0);
    zone.visible = false;
    zone.userData.audioZone = 'exterior_open';`)),
    scene('lab corridor: metal walls, industrial hum, glass window wet', IIFE(`    const floor = World.createObject('cube', 'lab_floor', 0x3a3a40, false);
    floor.scale.set(14, 0.2, 20);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    for (const x of [-5, 5]) {
      const wall = World.createObject('cube', 'lab_wall_' + x, 0x555566, false);
      wall.scale.set(0.3, 3, 18);
      wall.position.set(x, 1.5, 0);
      wall.userData.surfaceType = 'metal';
      wall.userData.locked = true;
    }
    const glass = World.createObject('cube', 'lab_window', 0xaaccff, false);
    glass.scale.set(3, 1.8, 0.06);
    glass.position.set(0, 1.6, -8);
    if (glass.material) {
      glass.material.transparent = true;
      glass.material.opacity = 0.3;
      glass.material.roughness = 0.06;
    }
    glass.userData.surfaceType = 'glass';
    glass.userData.wetGlass = true;
    glass.userData.materialPreset = 'pbr_glass_wet';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(glass, 'pbr_glass_wet');
    const hum = World.createObject('cube', 'hum', 0x444444, false);
    hum.scale.set(12, 3, 16);
    hum.position.set(0, 1.5, 0);
    hum.visible = false;
    hum.userData.audioZone = 'industrial_hum';
    hum.userData.zoneSheltered = true;`)),
    scene('rain-ready street: asphalt, wet metal rail, highway audio, dusk fog', IIFE(`    if (window.Environment?.setTimeOfDay) Environment.setTimeOfDay(18);
    if (window.Environment?.setFog) Environment.setFog(0.02);
    const road = World.createObject('cube', 'road', 0x2a2a2a, false);
    road.scale.set(22, 0.12, 6);
    road.position.set(0, 0.06, 0);
    road.userData.locked = true;
    road.userData.surfaceType = 'asphalt';
    road.userData.materialPreset = 'pbr_asphalt_wet';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(road, 'pbr_asphalt_wet');
    const rail = World.createObject('cube', 'rail', 0x777788, false);
    rail.scale.set(22, 0.1, 0.12);
    rail.position.set(0, 0.5, 3);
    rail.userData.surfaceType = 'metal';
    rail.userData.shaderGraph = 'wet_hero';
    if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(rail, 'wet_hero');
    road.userData.audioZone = 'highway_edge';`)),
    scene('snow path: wood crates snowCap, wood snow preset, cold fog', IIFE(`    if (window.Environment?.setTimeOfDay) Environment.setTimeOfDay(10);
    if (window.Environment?.setFog) Environment.setFog(0.018);
    const path = World.createObject('cube', 'snow_path', 0x9a9a9a, false);
    path.scale.set(10, 0.12, 3);
    path.position.set(0, 0.06, 0);
    path.userData.locked = true;
    path.userData.surfaceType = 'gravel';
    for (let i = 0; i < 3; i++) {
      const c = World.createObject('cube', 'snow_crate_' + i, 0x8b6914, true);
      c.position.set(i * 2 - 2, 0.5, -2);
      c.userData.surfaceType = 'wood';
      c.userData.snowCap = 0.85;
      c.userData.materialPreset = 'pbr_wood_snow';
      if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(c, 'pbr_wood_snow');
    }`)),
    scene('neon night market: marquee, neon crates, night fog, emissive pulse', IIFE(`    if (window.Environment?.setTimeOfDay) Environment.setTimeOfDay(22);
    if (window.Environment?.setFog) Environment.setFog(0.016);
    const floor = World.createObject('cube', 'market_floor', 0x1a1a22, false);
    floor.scale.set(16, 0.2, 16);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    const sign = World.createObject('cube', 'marquee', 0xff2266, false);
    sign.scale.set(4, 0.7, 0.15);
    sign.position.set(0, 3.2, -6);
    sign.userData.weatherMarquee = true;
    sign.userData.materialPreset = 'pbr_emissive_marquee';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(sign, 'pbr_emissive_marquee');
    for (let i = 0; i < 3; i++) {
      const c = World.createObject('cube', 'neon_crate_' + i, 0x223344, false);
      c.position.set(i * 2 - 2, 0.5, -3);
      c.userData.surfaceType = 'metal';
      c.userData.shaderGraph = 'neon_rim';
      if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(c, 'neon_rim');
    }`)),
    scene('nature edge: grass, wind foliage bushes, creek audio', IIFE(`    const ground = World.createObject('cube', 'nature_ground', 0x3a5a32, false);
    ground.scale.set(18, 0.15, 18);
    ground.position.set(0, 0.08, 0);
    ground.userData.locked = true;
    ground.userData.surfaceType = 'grass';
    for (let i = 0; i < 5; i++) {
      const bush = World.createObject('sphere', 'bush_' + i, 0x2f6b3a, false);
      bush.scale.set(1.0, 0.8, 1.0);
      bush.position.set(i * 2.2 - 4, 0.5, -3);
      bush.userData.surfaceType = 'grass';
      bush.userData.shaderGraph = 'wind_foliage';
      if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(bush, 'wind_foliage');
    }
    const creek = World.createObject('cube', 'creek', 0x3a6a8b, false);
    creek.scale.set(10, 1, 3);
    creek.position.set(0, 0.4, 5);
    creek.visible = false;
    creek.userData.audioZone = 'creek_near';`)),
    scene('physics playground: locked floor + falling spheres and crates', IIFE(`    const floor = World.createObject('cube', 'phys_floor', 0x333340, false);
    floor.scale.set(16, 0.25, 16);
    floor.position.set(0, 0.12, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    for (let i = 0; i < 5; i++) {
      const s = World.createObject('sphere', 'ball_' + i, 0x00ffaa, true);
      s.position.set((i - 2) * 1.5, 4 + i * 0.3, 0);
      s.userData.surfaceType = 'metal';
      s.userData.mass = 8;
    }
    for (let i = 0; i < 3; i++) {
      const c = World.createObject('cube', 'box_' + i, 0x8b4513, true);
      c.position.set(i - 1, 2, -2);
      c.userData.surfaceType = 'wood';
    }`)),
    scene('doorway set piece with collision door and interact plaque', IIFE(`    const left = World.createObject('cube', 'frame_l', 0x555555, false);
    left.scale.set(0.25, 2.5, 0.25);
    left.position.set(-1.1, 1.25, -4);
    left.userData.locked = true;
    const right = World.createObject('cube', 'frame_r', 0x555555, false);
    right.scale.set(0.25, 2.5, 0.25);
    right.position.set(1.1, 1.25, -4);
    right.userData.locked = true;
    const top = World.createObject('cube', 'frame_t', 0x555555, false);
    top.scale.set(2.6, 0.25, 0.25);
    top.position.set(0, 2.6, -4);
    top.userData.locked = true;
    const door = World.createObject('cube', 'door', 0x445566, true);
    door.scale.set(0.12, 2.2, 1.0);
    door.position.set(0, 1.1, -4);
    door.userData.surfaceType = 'metal';
    Object.assign(door.userData, { soundMode: 'clip', soundClipId: 'sfx_metal_clang', soundTrigger: 'collision' });
    const plaque = World.createObject('cube', 'plaque', 0x888899, false);
    plaque.scale.set(0.4, 0.3, 0.05);
    plaque.position.set(1.5, 1.4, -3.8);
    Object.assign(plaque.userData, { interactHint: 'Read', interactRadius: 2 });`)),
    scene('TC-adjacent practice: checkpoint cone line and asphalt strip', IIFE(`    const road = World.createObject('cube', 'track', 0x2a2a2a, false);
    road.scale.set(30, 0.1, 4);
    road.position.set(0, 0.05, 0);
    road.userData.locked = true;
    road.userData.surfaceType = 'asphalt';
    for (let i = 0; i < 6; i++) {
      const cp = World.createObject('cone', 'tc_cp_' + i, 0xff6600, false);
      cp.position.set(i * 4 - 10, 0.5, 2.2);
      cp.userData.locked = true;
    }`)),
    scene('interior lounge: wood floor, warm audio, fabric seats, sheltered', IIFE(`    const floor = World.createObject('cube', 'lounge_floor', 0x5a4030, false);
    floor.scale.set(12, 0.15, 12);
    floor.position.set(0, 0.08, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'wood';
    for (let i = 0; i < 2; i++) {
      const seat = World.createObject('cube', 'seat_' + i, 0x4a3a50, false);
      seat.scale.set(1.4, 0.5, 0.8);
      seat.position.set(i * 2.5 - 1.2, 0.3, -2);
      seat.userData.surfaceType = 'wood';
      seat.userData.materialPreset = 'pbr_fabric_muted';
      if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(seat, 'pbr_fabric_muted');
    }
    const zone = World.createObject('cube', 'lounge_zone', 0x666666, false);
    zone.scale.set(10, 3, 10);
    zone.position.set(0, 1.5, 0);
    zone.visible = false;
    zone.userData.zoneSheltered = true;
    zone.userData.audioZone = 'interior_warm';`)),
    scene('heat shimmer coil plaza with metal pad and beacon', IIFE(`    const pad = World.createObject('cube', 'coil_pad', 0x444450, false);
    pad.scale.set(10, 0.2, 10);
    pad.position.set(0, 0.1, 0);
    pad.userData.locked = true;
    pad.userData.surfaceType = 'metal';
    pad.userData.materialPreset = 'pbr_metal_brushed';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(pad, 'pbr_metal_brushed');
    const coil = World.createObject('cone', 'coil', 0x8899aa, false);
    coil.scale.set(1.0, 2.8, 1.0);
    coil.position.set(0, 1.4, -2);
    coil.userData.surfaceType = 'metal';
    coil.userData.shaderHook = 'heat_shimmer';
    coil.userData.shaderIntensity = 1.15;
    if (window.ShaderRegistry?.applyHook) ShaderRegistry.applyHook(coil, 'heat_shimmer');
    const beacon = World.createObject('sphere', 'beacon', 0x00ffcc, false);
    beacon.position.set(0, 3.4, -2);
    if (beacon.material) {
      beacon.material.emissive = new THREE.Color(0x00ffcc);
      beacon.material.emissiveIntensity = 0.4;
    }`)),
    scene('minimal safe extend: single torus portal rotating', IIFE(`    const portal = World.createObject('torus', 'portal', 0xaa00ff, false);
    portal.position.set(0, 2, -3);
    portal.userData.surfaceType = 'metal';
    if (window.Runtime?.onTick) Runtime.onTick((dt) => { portal.rotation.y += dt * 0.55; });`)),
    scene('cursor-relative props using getCursorPos', IIFE(`    const p = World.getCursorPos ? World.getCursorPos() : { x: 0, y: 0, z: -2 };
    const marker = World.createObject('cone', 'cursor_pin', 0xffaa00, true);
    marker.position.set(p.x, (p.y || 0) + 1.1, p.z);
    const box = World.createObject('cube', 'cursor_box', 0x4488ff, false);
    box.position.set(p.x + 1.2, (p.y || 0) + 0.5, p.z);
    box.userData.surfaceType = 'metal';`)),
];

const GUIDE = [
    pair('npc_chat',
        'You are a Threshold coach. Player says: Exact World.createObject signature?',
        "World.createObject(type, name, colorHex, usePhysics) — type first: 'cube'|'sphere'|'cone'|'torus'. Example: World.createObject('cube', 'crate', 0x8b4513, true)."),
    pair('npc_chat',
        'You are a Threshold coach. Player says: Valid surfaceType values?',
        'concrete, asphalt, wood, metal, gravel, grass, glass — used for footsteps and weather wetness.'),
    pair('npc_chat',
        'You are a Threshold coach. Player says: Valid audioZone values?',
        'interior_warm, exterior_open, industrial_hum, creek_near, highway_edge.'),
    pair('npc_chat',
        'You are a Threshold coach. Player says: Shader hook ids?',
        'wet_surface_boost, emissive_pulse, dust_overlay, snow_freshen, heat_shimmer — ShaderRegistry.applyHook(mesh, id).'),
    pair('npc_chat',
        'You are a Threshold coach. Player says: Shader graph presets?',
        'wet_hero, storm_exterior, neon_rim, wind_foliage, glass_rim — ShaderNodeGraph.applyGraph(mesh, id).'),
    pair('npc_chat',
        'You are a Threshold coach. Player says: MaterialPresets ids?',
        'pbr_default, pbr_concrete_weathered, pbr_asphalt_wet, pbr_wood_snow, pbr_metal_brushed, pbr_glass_wet, pbr_emissive_marquee, pbr_fabric_muted, pbr_stylized_toon.'),
    pair('npc_chat',
        'You are a Threshold coach. Player says: When is EDIT required?',
        'World mutations need State.isPaused true (EDIT). Scripts should early-return with UI.status if playing.'),
    pair('npc_chat',
        'You are a Threshold coach. Player says: Default render mode?',
        'Engine.setRenderMode(4) realistic PBR. Modes 0-3 are retro/toon/terminal only when the user asks.'),
    pair('intent_classify', 'open keys rebind menu', 'INTENT: other\nAPI: KEYS menu + bindings'),
    pair('intent_classify', 'pause host to build', 'INTENT: edit\nAPI: UI.togglePause'),
    pair('intent_classify', 'apply pbr_metal_brushed', 'INTENT: style\nAPI: MaterialPresets pbr_metal_brushed'),
    pair('intent_classify', 'package steam build', 'INTENT: export\nAPI: package:steam'),
    pair('intent_classify', 'run textures watch for gimp', 'INTENT: texture\nAPI: textures:watch'),
    pair('intent_classify', 'spawn physics pyramid', 'INTENT: spawn\nAPI: World.createObject'),
];

function mergeJsonl(rel, rows) {
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
    fs.writeFileSync(file, existing.map((r) => JSON.stringify(r)).join('\n') + '\n');
    console.log(`  ${rel}: +${added} → ${existing.length} total`);
    return { added, total: existing.length };
}

function main() {
    console.log('bootcamp:seed:wave2 — whole-product merge\n');
    const compilerAll = [...COMPILER];
    const results = {
        classify: mergeJsonl(path.join('small', 'classify.jsonl'), CLASSIFY),
        npc: mergeJsonl(path.join('small', 'npc.jsonl'), NPC),
        guide: mergeJsonl(path.join('small', 'guide.jsonl'), GUIDE),
        compiler: mergeJsonl(path.join('medium', 'compiler.jsonl'), compilerAll),
        scenes: mergeJsonl(path.join('large', 'scenes.jsonl'), SCENES),
    };
    const patches = compilerAll.filter((r) => r.task === 'dev_patch');
    const suggests = compilerAll.filter((r) => r.task === 'dev_suggest' || r.task === 'dev_patch');
    // rebuild split views from full compiler file after merge
    const fullCompiler = fs.readFileSync(path.join(DS, 'medium', 'compiler.jsonl'), 'utf8')
        .trim().split(/\n+/).filter(Boolean).map((l) => JSON.parse(l));
    const pOnly = fullCompiler.filter((r) => r.task === 'dev_patch');
    const sOnly = fullCompiler.filter((r) => r.task === 'dev_suggest');
    fs.writeFileSync(path.join(DS, 'medium', 'patches.jsonl'), pOnly.map((r) => JSON.stringify(r)).join('\n') + '\n');
    fs.writeFileSync(path.join(DS, 'medium', 'suggests.jsonl'), sOnly.map((r) => JSON.stringify(r)).join('\n') + '\n');
    console.log(`  patches.jsonl rebuild: ${pOnly.length}`);
    console.log(`  suggests.jsonl rebuild: ${sOnly.length}`);
    console.log('\nWave2 results:', results);
    console.log('\nNext: npm run bootcamp:build && npm run models:mini');
}

main();
