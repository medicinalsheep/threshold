#!/usr/bin/env node
/**
 * Comprehensive training seed for Threshold mini models.
 * Writes JSONL under training/bootcamp/datasets/** then ready for bootcamp:build.
 *
 * Usage:
 *   node scripts/bootcamp-seed.cjs           # write full curated sets
 *   node scripts/bootcamp-seed.cjs --merge   # append only missing user messages
 *   npm run bootcamp:seed
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DS = path.join(ROOT, 'training', 'bootcamp', 'datasets');
const MERGE = process.argv.includes('--merge');

function pair(task, user, assistant) {
    return {
        task,
        messages: [
            { role: 'user', content: user },
            { role: 'assistant', content: assistant },
        ],
    };
}

function intent(user, intentName, api) {
    return pair('intent_classify', user, `INTENT: ${intentName}\nAPI: ${api}`);
}

function npc(personaLine, playerLine, reply) {
    return pair('npc_chat', `You are ${personaLine}. Player says: ${playerLine}`, reply);
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

// ─── IIFE template helpers (correct World.createObject positional API) ───

const IIFE = (body) => `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);
${body}
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`;

// ═══════════════════════════════════════════════════════════════════════════
// SMALL — intent classify
// ═══════════════════════════════════════════════════════════════════════════

const CLASSIFY = [
    // spawn
    intent('spawn a red box in the scene', 'spawn', 'World.createObject'),
    intent('place a wooden crate near spawn', 'spawn', 'World.createObject'),
    intent('add a green sphere at y=2', 'spawn', 'World.createObject'),
    intent('create three physics barrels', 'spawn', 'World.createObject'),
    intent('put a metal door on the grid', 'spawn', 'World.createObject'),
    intent('drop a cone marker at the cursor', 'spawn', 'World.createObject'),
    intent('make a torus portal prop', 'spawn', 'World.createObject'),
    intent('add an AI build station prop', 'spawn', 'World.createObject'),
    intent('import my blender glb avatar', 'spawn', 'gltfImport'),
    intent('load a starter npc guard mesh', 'spawn', 'gltfImport'),
    intent('generate a full lab scene with AI', 'spawn', 'AgentPortal + World.createObject'),
    intent('build a courtyard with benches', 'spawn', 'AgentPortal + World.createObject'),
    // edit / environment
    intent('add rain and fog', 'edit', 'State.env + Environment'),
    intent('turn on sunset atmosphere', 'edit', 'State.env + Environment'),
    intent('make it dusk with denser fog', 'edit', 'Environment.setTimeOfDay + setFog'),
    intent('clear the weather effects', 'edit', 'State.env + weatherSystem'),
    intent('set time of day to noon', 'edit', 'Environment.setTimeOfDay'),
    intent('enable snow accumulation on props', 'edit', 'userData.snowCap + weatherSystem'),
    intent('mark this room as sheltered interior', 'edit', 'userData.zoneSheltered'),
    intent('delete the red crate', 'edit', 'World.deleteObject'),
    intent('move the barrel to the left', 'edit', 'Inspector + mesh.position'),
    intent('scale the floor pad larger', 'edit', 'Inspector + mesh.scale'),
    intent('lock the floor so physics cannot move it', 'edit', 'userData.locked'),
    intent('pause so I can edit', 'edit', 'UI.togglePause'),
    // graphics / style
    intent('default realistic lighting', 'graphics', 'Engine.setRenderMode(4)'),
    intent('switch to PBR realistic mode', 'graphics', 'Engine.setRenderMode(4)'),
    intent('use graphics tier mobile lite', 'graphics', 'graphicsProfile'),
    intent('make the scene look retro terminal green', 'style', 'Engine.setRenderMode(2)'),
    intent('switch to toon shading', 'style', 'Engine.setRenderMode(1)'),
    intent('enable hyper neon style', 'style', 'Engine.setRenderMode(3)'),
    intent('pixel art render mode', 'style', 'Engine.setRenderMode(0)'),
    intent('add wet glass shader on the window', 'style', 'shaderRegistry + userData.shaderHook'),
    intent('apply wet_hero material preset', 'style', 'MaterialPresets + userData.materialPreset'),
    intent('add neon rim shader graph', 'style', 'ShaderNodeGraph.applyGraph'),
    intent('heat shimmer on the coil', 'style', 'ShaderRegistry.applyHook'),
    // texture
    intent('add gimp texture to the crate', 'texture', 'userData.textures + textures:watch'),
    intent('watch folder for new PBR maps', 'texture', 'textures:watch'),
    intent('apply stone_block albedo and normal', 'texture', 'userData.textures + TextureBridge'),
    intent('export hilod tiers for starter ground', 'texture', 'textures:hilod'),
    intent('sync blender material names to manifest', 'texture', 'threshold_manifest + TextureBridge'),
    intent('hand paint 2k master in gimp', 'texture', 'GIMP + textures:watch'),
    // sound
    intent('add footstep sounds on concrete', 'sound', 'AudioSys + userData.surfaceType'),
    intent('attach ambient rain loop to courtyard', 'sound', 'audioZoneSystem'),
    intent('collision clang on metal door', 'sound', 'userData.soundClipId + soundTrigger'),
    intent('play industrial hum audio zone', 'sound', 'userData.audioZone'),
    intent('tag a recorded clip as footstep wood', 'sound', 'sounds:tag:recording'),
    intent('mute ambient layers', 'sound', 'AudioSys'),
    // physics
    intent('enable physics on the barrel', 'physics', 'Physics + usePhysics true'),
    intent('make the crate dynamic with mass', 'physics', 'userData.mass + hasPhysics'),
    intent('add rigid body friction to the bench', 'physics', 'userData.friction'),
    intent('stack physics boxes that fall', 'physics', 'World.createObject with usePhysics'),
    intent('disable gravity on the orb', 'physics', 'Physics body settings'),
    // export
    intent('export to web and github pages', 'export', 'ExportWizard'),
    intent('ship this to steam', 'export', 'ExportWizard'),
    intent('publish android build to play store', 'export', 'ExportWizard'),
    intent('package windows electron build', 'export', 'ExportWizard'),
    intent('run store prep and verify', 'export', 'store:prep + store:verify'),
    intent('export immersive weather prefs', 'export', 'ExportWizard immersive step'),
    // other / help / multiplayer / agents
    intent('what keys do I use to fly', 'other', 'HelpMenu + CONTROLS'),
    intent('how do friends join my session', 'other', 'Lobby + room codes'),
    intent('connect ollama for NPC chat', 'other', 'AgentPortal + OllamaClient'),
    intent('open the compiler and fix my script', 'other', 'Compiler'),
    intent('record a gameplay clip', 'other', 'Recorder'),
    intent('join room ALPHA with passcode', 'other', 'Lobby.join'),
    intent('show the agent portal', 'other', 'AgentPortal'),
    intent('freeze AI memory for this build', 'other', 'aiMemoryFreeze + SETUP'),
    intent('set working folder for ollama', 'other', 'workFolderScope + SETUP'),
    intent('switch small tier to llama3.2', 'other', 'AgentRouter tier prefs'),
    intent('enable third eye peek', 'other', 'thirdEye + SETUP'),
    intent('how do I use touch controls', 'other', 'touchControls + HelpMenu'),
    intent('host migration when I disconnect', 'other', 'hostMigration'),
    intent('spectate another player', 'other', 'spectate'),
    intent('open voip settings', 'other', 'voip'),
    intent('run bootcamp training', 'other', 'npm run train:mini'),
    intent('what is the F key for', 'other', 'worldInteract + HelpMenu'),
    intent('undo last scene change', 'other', 'sceneHistory'),
    intent('save the world', 'other', 'Persistence.saveWorld'),
    // paraphrases / noisy chat
    intent('gimme a box pls', 'spawn', 'World.createObject'),
    intent('can we go realistic lighting?', 'graphics', 'Engine.setRenderMode(4)'),
    intent('android apk please', 'export', 'ExportWizard'),
    intent('rain harder', 'edit', 'State.env + weatherSystem'),
    intent('texture that thing with gimp', 'texture', 'userData.textures + textures:watch'),
    intent('physics on', 'physics', 'Physics + usePhysics true'),
    intent('terminal green vibe', 'style', 'Engine.setRenderMode(2)'),
    intent('where is multiplayer invite', 'other', 'Lobby invite panel'),
];

// ═══════════════════════════════════════════════════════════════════════════
// SMALL — NPC dialogue
// ═══════════════════════════════════════════════════════════════════════════

const NPC = [
    npc('Nikola, eccentric inventor at Wardenclyffe', 'Hello, who are you?',
        'I am Nikola — welcome to my laboratory! The coils hum with possibilities. [ACTION: gestures toward the tower]'),
    npc('Nikola at the coil', 'What does the F key do?',
        'F interacts — doors, stations, and props with a prompt. Try it on the AI Build Station behind you.'),
    npc('Nikola, inventor', 'Why is my AI not generating?',
        'Finish the design brief — placement, weather, collision — then GENERATE. Incomplete plans are blocked on purpose.'),
    npc('a friendly merchant', 'Got anything for sale?',
        'Crates by the courtyard — wood, brass fittings, all fair prices. Take a look before the rain returns.'),
    npc('a quest giver near tc_cp', 'How do I start the lap?',
        'Drive through the checkpoint gate when the timer arms — tc_cp marks your split. [ACTION: points at the gate]'),
    npc('a grid guide', 'How do I pause to build?',
        'Tap EDIT top-left or pause the world — physics freezes so you can place objects safely.'),
    npc('a creative assistant', 'Can AI help me build?',
        'Walk to the AI Build Station and press F, or tap the AI chip — describe what you want and generate a script.'),
    npc('a lab security guard', 'Can I go upstairs?',
        'Badge check first — upstairs is restricted until the coil cools. Stay on the main floor for now.'),
    npc('an AI Build Station voice', 'I am stuck, nothing generates.',
        'Complete production plan steps in Portal or SETUP, then hit GENERATE. Grok or Ollama must be online.'),
    npc('a multiplayer host buddy', 'How do friends join?',
        'Share the room code or invite link from the lobby. Guests join live; only the host edits the world.'),
    npc('a touch-controls coach', 'I am on a phone, how do I look around?',
        'Drag the right look pad to aim, left stick to move. Tap TOUCH bottom-left if pads are hidden.'),
    npc('a realism coach', 'How do I aim and shoot?',
        'Hold LMB to ADS, RMB to fire in FPS mode. Toggle walk/fly bottom-left. Stealth holds U.'),
    npc('a texture artist mentor', 'How do GIMP textures load?',
        'Name maps to match the mesh, save under textures/, run textures:watch — live SYNC applies PBR maps.'),
    npc('a Blender pipeline mentor', 'How do I bring a GLB in?',
        'Export with the Threshold Blender addon or blender:export, drop under import/, then INSERT or gltfImport.'),
    npc('an export coach', 'How do I ship to the web?',
        'TOOLS → Export, keep Web selected, run through the wizard. Native targets are optional under details.'),
    npc('a TC circuit guide', 'What is Lobby TC?',
        'TC opens reference editions — vehicles, characters, circuit demos. Separate from your blank-grid game.'),
    npc('a TC driver coach', 'How do I drive the haul truck?',
        'Enter the vehicle interact zone, press F, then use drive binds. Checkpoints mark lap splits.'),
    npc('an Ollama coach', 'Which model should I use on a 2060?',
        'llama3.2:3B for chat and patches; qwen2.5 for full scenes. Or install threshold-mini-npc and threshold-mini-dev.'),
    npc('a SETUP coach', 'Where do I paste my xAI key?',
        'SCENE → SETUP or Agent Portal — paste the Grok key for this browser tab only. Never synced to guests.'),
    npc('a weather guide', 'Why is rain not wetting my props?',
        'Set userData.surfaceType on meshes — concrete, wood, metal. WeatherSystem needs surface types to wet them.'),
    npc('a physics tutor', 'My crate falls through the floor',
        'Use a locked floor mesh with physics collider, or the starter ground. Dynamic props need usePhysics true.'),
    npc('a corner-hub guide', 'Where is the Compiler?',
        'Switch to EDIT, open TOOLS top-right — Compiler, PromptGen, insert, and Export live there.'),
    npc('a PromptGen guide', 'What does PromptGen do?',
        'It turns a short idea into a JS snippet for the live scene. Review, then RUN in Compiler while paused.'),
    npc('a guest player', 'Why can I not edit objects?',
        'Only the host edits. You can play, chat, and spectate — ask the host to pause and build.'),
    npc('a VOIP helper', 'Can people hear me?',
        'VOIP is proximity-based when enabled. Check lobby audio permissions and the VOIP toggle.'),
    npc('a survival pack narrator', 'Where is hunger and thirst?',
        'Survival is optional — run npm run dev:survival. Default Pages builds skip vitals on purpose.'),
    npc('a store release coach', 'How do I make an APK?',
        'Export wizard → Android, then package:android with local signing. store:upload writes a guide only.'),
    npc('a room-code greeter', 'What format is the room code?',
        'NAME4-KEY6-RAND4 style codes. Paste the full code or open the invite link from the host.'),
    npc('an immersive coach', 'What is Third Eye?',
        'Alt-hold peek in immersive play. SETUP can request native fullscreen while peeking.'),
    npc('a stealth coach', 'How do I crouch and sneak?',
        'Hold U for stealth, crouch bind for low profile. Footsteps quiet on soft surfaceTypes.'),
    npc('a material presets guide', 'How do I avoid texture slop?',
        'Pick MaterialPresets ids and surfaceType — agents should not invent CanvasTexture noise maps.'),
    npc('an audio zone guide', 'How do ambient zones work?',
        'Set userData.audioZone on a mesh — interior_warm, exterior_open, industrial_hum, creek_near, highway_edge.'),
    npc('a host migration buddy', 'What if the host leaves?',
        'Host migration can hand authority to another peer when available — stay in the room during handoff.'),
    npc('a spectate guide', 'How do I watch others?',
        'Open spectate mode from the session UI to follow another player camera without editing.'),
    npc('a training bootcamp mentor', 'How do I retrain mini models?',
        'Edit datasets JSONL, then npm run train:mini — rebuilds Modelfiles and ollama create for mini agents.'),
    npc('a walkthrough guide', 'I skipped the tour, how do I learn UI?',
        'Corner hubs: top-left PLAY/EDIT, top-right TOOLS in EDIT, bottom-left move modes, bottom-right SCENE/SKIN.'),
    npc('a compiler mentor', 'SMART DEV failed my patch',
        'Stay in EDIT, paste a small fix, RUN IN ENGINE. Prefer World.createObject — never new THREE.Scene.'),
    npc('a quality gate coach', 'Portal says production plan incomplete',
        'Answer placement, weather, and collision steps first. GENERATE stays locked until validateProductionReady.'),
    npc('Nikola, inventor', 'What is render mode 4?',
        'Mode 4 is realistic PBR — default for Threshold. Retro modes are opt-in when you ask for terminal or toon.'),
    npc('a friendly merchant', 'Do you take coin?',
        'Trade goods, not coin — haul crates and brass. The courtyard stalls restock after rain.'),
    npc('a lab guard', 'Is the coil safe?',
        'Stay behind the painted line. When the arc sings, step back — metal tools stay holstered.'),
    npc('a creative assistant', 'Can I use local Ollama offline?',
        'Yes — ollama serve on this machine, pick a local model in SETUP. Phone browsers cannot reach your PC Ollama.'),
    npc('a grid guide', 'How do I delete objects?',
        'EDIT mode, select the mesh, delete — recursive dispose cleans GLTF groups. PLAY blocks destructive edits.'),
    npc('an export coach', 'Steam upload failed',
        'Signing and partner keys stay local. Run package:steam and follow the upload-guide from store:upload.'),
    npc('a TC guide', 'Where are the vehicles?',
        'Lobby → TC → load vehicle kits. Drive scripts bind after the mesh spawns near the track.'),
    npc('a realism coach', 'Footsteps sound wrong',
        'Set userData.surfaceType to match the floor — wood, concrete, metal, gravel, grass, asphalt, glass.'),
    npc('an Agent Portal greeter', 'Should I open the portal every time?',
        'No — explore first. Pulse the AI chip when ready; Portal no longer auto-opens on ENTER.'),
    npc('a multiplayer buddy', 'Can guests run Compiler?',
        'No — host authority. Guests receive sync and immersive replay; code runs on the host when paused.'),
    npc('a shader coach', 'What is wet_hero?',
        'A shader graph preset — rain specular and fresnel rim for hero metals. Apply via ShaderNodeGraph or materialPreset.'),
    npc('a SETUP coach', 'What is AI memory freeze?',
        'It snapshots agent-built GLTF and scripts so reloads restore placeholders if assets fail to load.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// MEDIUM — compiler patches & suggests
// ═══════════════════════════════════════════════════════════════════════════

const COMPILER = [
    // patches — typos / API mistakes
    patch(
        "World.createObject({ nam: 'crate', type: 'box', color: 0xff0000 });",
        "const crate = World.createObject('cube', 'crate', 0xff0000, true);",
    ),
    patch(
        "World.createObject({ name: 'sphere_a', tipe: 'sphere', color: 0x00ff88 });",
        "const sphere_a = World.createObject('sphere', 'sphere_a', 0x00ff88, false);",
    ),
    patch(
        "World.createObject({ name: 'barrel', type: 'cylinder', color: 0x553311, hasPhysic: true });",
        "const barrel = World.createObject('cube', 'barrel', 0x553311, true);\nbarrel.scale.set(0.8, 1.2, 0.8);",
    ),
    patch(
        'PlayerController.spawnPlayr();',
        'if (!PlayerController.getLocalPlayer()) PlayerController.spawnPlayer();',
    ),
    patch(
        "Engine.setRenderMode(99);\nWorld.clearWorld();",
        "Engine.setRenderMode(4);\n// do not clearWorld unless user asked",
    ),
    patch(
        "const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xff0000}));\nscene.add(m);",
        "const m = World.createObject('cube', 'box_red', 0xff0000, false);",
    ),
    patch(
        "World.createObject('box', 'floor', 0x333333, false);",
        "const floor = World.createObject('cube', 'floor', 0x333333, false);\nfloor.scale.set(20, 0.2, 20);\nfloor.userData.locked = true;\nfloor.userData.surfaceType = 'concrete';",
    ),
    patch(
        "mesh.userData.surface = 'wood';",
        "mesh.userData.surfaceType = 'wood';",
    ),
    patch(
        "World.createObject('sphere', 'orb', '#00ffaa', true);",
        "const orb = World.createObject('sphere', 'orb', 0x00ffaa, true);",
    ),
    patch(
        "if (State.isPaused === false) World.createObject('cube', 'x', 0xffffff, false);",
        "if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); }\nelse { World.createObject('cube', 'x', 0xffffff, false); }",
    ),
    // suggests — props
    suggest('// brass lamp with emissive bulb, render mode 4 default', IIFE(`    const lamp = World.createObject('cube', 'gas_lamp', 0x4a3728, false);
    lamp.position.set(0, 1.5, -2);
    lamp.scale.set(0.35, 1.2, 0.35);
    if (lamp.material) {
      lamp.material.roughness = 0.42;
      lamp.material.metalness = 0.55;
      lamp.material.emissive = new THREE.Color(0xffaa44);
      lamp.material.emissiveIntensity = 0.5;
    }
    lamp.userData.surfaceType = 'metal';`)),
    suggest('// wooden bench with PBR roughness for courtyard', IIFE(`    const bench = World.createObject('cube', 'wood_bench', 0x6b4f3a, false);
    bench.scale.set(2.2, 0.35, 0.8);
    bench.position.set(2, 0.2, -4);
    if (bench.material) {
      bench.material.roughness = 0.78;
      bench.material.metalness = 0.04;
    }
    bench.userData.surfaceType = 'wood';
    bench.userData.locked = true;`)),
    suggest('// spinning green sphere at y=2', IIFE(`    const s = World.createObject('sphere', 'spin_orb', 0x33cc66, false);
    s.position.set(0, 2, 0);
    if (window.Runtime?.onTick) Runtime.onTick((dt) => { s.rotation.y += dt * 0.8; });`)),
    suggest('// physics crate stack of three', IIFE(`    for (let i = 0; i < 3; i++) {
      const c = World.createObject('cube', 'crate_' + i, 0x8b4513, true);
      c.position.set(0, 0.6 + i * 1.05, -3);
      c.userData.surfaceType = 'wood';
      c.userData.mass = 12;
    }`)),
    suggest('// metal door with collision sound', IIFE(`    const door = World.createObject('cube', 'metal_door', 0x444455, true);
    door.scale.set(0.15, 2.4, 1.1);
    door.position.set(3, 1.2, -2);
    if (door.material) { door.material.metalness = 0.85; door.material.roughness = 0.28; }
    door.userData.surfaceType = 'metal';
    Object.assign(door.userData, { soundMode: 'clip', soundClipId: 'sfx_metal_clang', soundTrigger: 'collision' });`)),
    suggest('// audio zone mesh for windy rooftop ambient', IIFE(`    const zone = World.createObject('cube', 'roof_wind_zone', 0x88aacc, false);
    zone.scale.set(8, 3, 8);
    zone.position.set(0, 6, -12);
    zone.visible = false;
    zone.userData.audioZone = 'exterior_open';
    zone.userData.audioZoneRadius = 14;`)),
    suggest('// wet_hero material preset on metal walkway', IIFE(`    const walk = World.createObject('cube', 'metal_walkway', 0x666677, false);
    walk.scale.set(6, 0.15, 2);
    walk.position.set(0, 0.1, -5);
    walk.userData.surfaceType = 'metal';
    walk.userData.materialPreset = 'wet_hero';
    walk.userData.shaderGraph = 'wet_hero';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(walk, 'wet_hero');
    if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(walk, 'wet_hero');`)),
    suggest('// apply GIMP stone_block textures to crate mesh', IIFE(`    const crate = World.createObject('cube', 'stone_block', 0xffffff, false);
    crate.position.set(1, 0.5, 0);
    crate.userData.textures = {
      albedo: 'textures/stone_block_albedo.png',
      roughness: 'textures/stone_block_roughness.png',
      metalness: 'textures/stone_block_metalness.png'
    };
    crate.userData.surfaceType = 'concrete';
    if (window.TextureBridge) TextureBridge.apply(crate);`)),
    suggest('// foggy atmosphere tweak — keep render mode 4 realistic', IIFE(`    if (window.Environment?.setFog) Environment.setFog(0.022);
    if (window.Environment?.setTimeOfDay) Environment.setTimeOfDay(18.5);
    if (State.env) {
      State.env.fogDensity = 0.022;
      State.env.atmosphereEnabled = true;
    }`)),
    suggest('// spawn at cursor cone marker', IIFE(`    const p = World.getCursorPos ? World.getCursorPos() : { x: 0, y: 0, z: 0 };
    const o = World.createObject('cone', 'cursor_marker', 0xffaa00, true);
    o.position.set(p.x, (p.y || 0) + 1.2, p.z);`)),
    suggest('// glass pane with wetGlass and shader hook', IIFE(`    const glass = World.createObject('cube', 'window_pane', 0xaaccff, false);
    glass.scale.set(2.4, 1.6, 0.05);
    glass.position.set(-2, 1.4, -6);
    if (glass.material) {
      glass.material.transparent = true;
      glass.material.opacity = 0.35;
      glass.material.roughness = 0.08;
      glass.material.metalness = 0.1;
    }
    glass.userData.surfaceType = 'glass';
    glass.userData.wetGlass = true;
    glass.userData.shaderHook = 'wet_surface_boost';
    if (window.ShaderRegistry?.applyHook) ShaderRegistry.applyHook(glass, 'wet_surface_boost');`)),
    suggest('// dust_overlay exterior concrete wall', IIFE(`    const wall = World.createObject('cube', 'dusty_wall', 0x9a958c, false);
    wall.scale.set(6, 3, 0.3);
    wall.position.set(-6, 1.5, 0);
    wall.userData.surfaceType = 'concrete';
    wall.userData.dustExposure = 0.7;
    wall.userData.shaderHook = 'dust_overlay';
    wall.userData.locked = true;
    if (window.ShaderRegistry?.applyHook) ShaderRegistry.applyHook(wall, 'dust_overlay');`)),
    suggest('// snowCap metal railing exterior', IIFE(`    const rail = World.createObject('cube', 'snow_rail', 0x777788, false);
    rail.scale.set(4, 0.12, 0.12);
    rail.position.set(0, 1.0, -8);
    rail.userData.surfaceType = 'metal';
    rail.userData.snowCap = 0.85;
    rail.userData.shaderHook = 'snow_freshen';
    if (window.ShaderRegistry?.applyHook) ShaderRegistry.applyHook(rail, 'snow_freshen');`)),
    suggest('// interior warm audio zone volume', IIFE(`    const room = World.createObject('cube', 'lab_interior_zone', 0x445566, false);
    room.scale.set(10, 4, 10);
    room.position.set(0, 2, 0);
    room.visible = false;
    room.userData.zoneSheltered = true;
    room.userData.audioZone = 'interior_warm';`)),
    suggest('// industrial hum around generator prop', IIFE(`    const gen = World.createObject('cube', 'generator', 0x556655, false);
    gen.scale.set(1.4, 1.1, 0.9);
    gen.position.set(4, 0.55, 3);
    gen.userData.surfaceType = 'metal';
    gen.userData.audioZone = 'industrial_hum';
    gen.userData.audioZoneRadius = 8;
    if (gen.material) { gen.material.metalness = 0.7; gen.material.roughness = 0.4; }`)),
    suggest('// emissive pulse sign marquee', IIFE(`    const sign = World.createObject('cube', 'neon_sign', 0xff2266, false);
    sign.scale.set(2.5, 0.6, 0.1);
    sign.position.set(0, 3.2, -10);
    if (sign.material) {
      sign.material.emissive = new THREE.Color(0xff2266);
      sign.material.emissiveIntensity = 0.9;
    }
    sign.userData.weatherMarquee = true;
    sign.userData.shaderHook = 'emissive_pulse';
    if (window.ShaderRegistry?.applyHook) ShaderRegistry.applyHook(sign, 'emissive_pulse');`)),
    suggest('// heat shimmer above tesla coil base', IIFE(`    const coil = World.createObject('cone', 'tesla_coil_base', 0x8899aa, false);
    coil.scale.set(0.8, 2.2, 0.8);
    coil.position.set(0, 1.1, -4);
    coil.userData.surfaceType = 'metal';
    coil.userData.shaderHook = 'heat_shimmer';
    coil.userData.shaderIntensity = 1.1;
    if (window.ShaderRegistry?.applyHook) ShaderRegistry.applyHook(coil, 'heat_shimmer');`)),
    suggest('// spawn player at lab entrance if none exists', IIFE(`    if (window.PlayerController?.getLocalPlayer && !PlayerController.getLocalPlayer()) {
      PlayerController.spawnPlayer({ x: 0, y: 1, z: 8 });
    } else if (window.World?.spawnPlayablePlayer) {
      World.spawnPlayablePlayer();
    }`)),
    suggest('// row of three wooden crates with physics and wood surfaceType', IIFE(`    for (let i = 0; i < 3; i++) {
      const c = World.createObject('cube', 'crate_' + i, 0x8b4513, true);
      c.position.set(-8, 0.5, i * 2 - 2);
      c.userData.mass = 12;
      c.userData.friction = 0.5;
      c.userData.surfaceType = 'wood';
    }`)),
    suggest('// F-interact rest bench prop', IIFE(`    const bench = World.createObject('cube', 'rest_bench', 0x4a4035, false);
    bench.scale.set(1.8, 0.4, 0.7);
    bench.position.set(-2, 0.2, 5);
    bench.userData.surfaceType = 'wood';
    Object.assign(bench.userData, {
      interactHint: 'Sit and rest',
      interactRadius: 2,
      interactAction: 'custom'
    });`)),
    suggest('// user explicitly asked for terminal green gallery — NOT default PBR', `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(2);
    const colors = [0x00ff66, 0x00cc55, 0x009944];
    colors.forEach((col, i) => {
      const m = World.createObject('cube', 'term_block_' + i, col, false);
      m.position.set(i * 2 - 2, 1.2, -i * 2);
      if (m.material) {
        m.material.emissive = new THREE.Color(col);
        m.material.emissiveIntensity = 0.2;
      }
    });
    UI.status('Terminal gallery');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`),
    suggest('// toon shading accent props — user asked retro toon', `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(1);
    const m = World.createObject('sphere', 'toon_orb', 0xffaa00, false);
    m.position.set(0, 1.5, -3);
    UI.status('Toon accent');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`),
    suggest('// creek near audio zone + grass surface stepping stones', IIFE(`    for (let i = 0; i < 4; i++) {
      const stone = World.createObject('cube', 'step_stone_' + i, 0x6a6a5a, false);
      stone.scale.set(0.9, 0.2, 0.7);
      stone.position.set(i * 1.1 - 1.5, 0.1, 6);
      stone.userData.surfaceType = 'gravel';
      stone.userData.locked = true;
    }
    const creek = World.createObject('cube', 'creek_zone', 0x3a6a8b, false);
    creek.scale.set(6, 1, 3);
    creek.position.set(0, 0.5, 8);
    creek.visible = false;
    creek.userData.audioZone = 'creek_near';`)),
    suggest('// highway edge audio + asphalt strip', IIFE(`    const road = World.createObject('cube', 'asphalt_strip', 0x2a2a2a, false);
    road.scale.set(16, 0.12, 4);
    road.position.set(0, 0.06, 12);
    road.userData.surfaceType = 'asphalt';
    road.userData.locked = true;
    road.userData.audioZone = 'highway_edge';`)),
    suggest('// wind_foliage shader on bush prop', IIFE(`    const bush = World.createObject('sphere', 'bush_a', 0x2f6b3a, false);
    bush.scale.set(1.2, 0.9, 1.2);
    bush.position.set(-3, 0.6, -2);
    bush.userData.surfaceType = 'grass';
    bush.userData.shaderGraph = 'wind_foliage';
    if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(bush, 'wind_foliage');`)),
    suggest('// neon_rim on sci-fi crate', IIFE(`    const crate = World.createObject('cube', 'sci_crate', 0x223344, false);
    crate.position.set(2, 0.5, -1);
    crate.userData.surfaceType = 'metal';
    crate.userData.shaderGraph = 'neon_rim';
    if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(crate, 'neon_rim');`)),
    suggest('// collision sound on metal door', IIFE(`    const door = World.createObject('cube', 'metal_door', 0x444455, true);
    door.scale.set(0.2, 2.2, 1.2);
    door.position.set(4, 1.1, 0);
    if (door.material) { door.material.metalness = 0.85; door.material.roughness = 0.28; }
    door.userData.surfaceType = 'metal';
    Object.assign(door.userData, { soundMode: 'clip', soundClipId: 'sfx_metal_clang', soundTrigger: 'collision' });`)),
    suggest('// spinning metal fan prop, realistic PBR', IIFE(`    const fan = World.createObject('cube', 'lab_fan', 0x888899, false);
    fan.scale.set(1.2, 0.15, 1.2);
    fan.position.set(0, 2.4, -3);
    if (fan.material) {
      fan.material.roughness = 0.35;
      fan.material.metalness = 0.72;
    }
    fan.userData.surfaceType = 'metal';
    if (window.Runtime?.onTick) Runtime.onTick((dt) => { fan.rotation.y += dt * 2.5; });`)),
    suggest('// locked concrete floor pad 20x20', IIFE(`    const floor = World.createObject('cube', 'floor_pad', 0x3a3a40, false);
    floor.scale.set(20, 0.2, 20);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    if (floor.material) {
      floor.material.roughness = 0.85;
      floor.material.metalness = 0.05;
    }`)),
    suggest('// torus portal that slowly rotates', IIFE(`    const portal = World.createObject('torus', 'portal', 0xaa00ff, false);
    portal.position.set(0, 2, -3);
    portal.userData.surfaceType = 'metal';
    if (window.Runtime?.onTick) Runtime.onTick((dt) => { portal.rotation.y += dt * 0.6; });`)),
    suggest('// fix only: nam typo keep physics off', "const crate = World.createObject('cube', 'crate', 0xff0000, false);"),
    // more patches
    patch(
        "mesh.userData.audio = 'interior';",
        "mesh.userData.audioZone = 'interior_warm';",
    ),
    patch(
        "Engine.setRenderMode(4)\nWorld.createObject('cube' 'a' 0xffffff false)",
        "Engine.setRenderMode(4);\nconst a = World.createObject('cube', 'a', 0xffffff, false);",
    ),
    patch(
        "const x = World.createObject('cube', 'x', 0xff0000, false)\nx.position = {x:1,y:0,z:0}",
        "const x = World.createObject('cube', 'x', 0xff0000, false);\nx.position.set(1, 0, 0);",
    ),
    patch(
        "World.createObject('sphere', 's', 0x00ff00, false); PlayerController.spawnPlayer(); World.clearWorld();",
        "const s = World.createObject('sphere', 's', 0x00ff00, false);\nif (!PlayerController.getLocalPlayer()) PlayerController.spawnPlayer();\n// removed clearWorld — would wipe the scene",
    ),
    suggest('// pbr_concrete_weathered preset wall', IIFE(`    const wall = World.createObject('cube', 'weathered_wall', 0x8a8680, false);
    wall.scale.set(5, 2.5, 0.35);
    wall.position.set(5, 1.25, -4);
    wall.userData.surfaceType = 'concrete';
    wall.userData.materialPreset = 'pbr_concrete_weathered';
    wall.userData.dustExposure = 0.4;
    wall.userData.locked = true;
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(wall, 'pbr_concrete_weathered');`)),
    suggest('// storm_exterior shader graph on shed', IIFE(`    const shed = World.createObject('cube', 'shed', 0x5a5048, false);
    shed.scale.set(3, 2.2, 2.5);
    shed.position.set(-5, 1.1, -7);
    shed.userData.surfaceType = 'wood';
    shed.userData.shaderGraph = 'storm_exterior';
    shed.userData.locked = true;
    if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(shed, 'storm_exterior');`)),
    suggest('// glass_rim on display case', IIFE(`    const caseBox = World.createObject('cube', 'display_case', 0xccddff, false);
    caseBox.scale.set(1.2, 1.2, 1.2);
    caseBox.position.set(0, 1.4, -3);
    if (caseBox.material) {
      caseBox.material.transparent = true;
      caseBox.material.opacity = 0.3;
    }
    caseBox.userData.surfaceType = 'glass';
    caseBox.userData.shaderGraph = 'glass_rim';
    if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(caseBox, 'glass_rim');`)),
];

// ═══════════════════════════════════════════════════════════════════════════
// LARGE — full scenes
// ═══════════════════════════════════════════════════════════════════════════

const SCENES = [
    scene('two PBR boxes, spawn player, default render mode 4', IIFE(`    const a = World.createObject('cube', 'box_a', 0x3d5a80, true);
    const b = World.createObject('cube', 'box_b', 0xe07a5f, true);
    b.position.set(3, 0.5, 0);
    a.position.set(0, 0.5, 0);
    [a, b].forEach((m) => {
      if (m.material) { m.material.roughness = 0.55; m.material.metalness = 0.15; }
      m.userData.surfaceType = 'metal';
    });
    if (window.PlayerController?.getLocalPlayer && !PlayerController.getLocalPlayer()) {
      PlayerController.spawnPlayer();
    }`)),
    scene('row of three wooden crates with physics and wood surfaceType', IIFE(`    for (let i = 0; i < 3; i++) {
      const c = World.createObject('cube', 'crate_' + i, 0x8b4513, true);
      c.position.set(-4 + i * 2, 0.5, -2);
      c.userData.mass = 12;
      c.userData.friction = 0.5;
      c.userData.surfaceType = 'wood';
    }`)),
    scene('green sphere at y=2 that slowly rotates', IIFE(`    const s = World.createObject('sphere', 'spin_orb', 0x33cc66, false);
    s.position.set(0, 2, 0);
    if (window.Runtime?.onTick) Runtime.onTick((dt) => { s.rotation.y += dt * 0.8; });`)),
    scene('doorway prop with metal surfaceType and collision sound', IIFE(`    const door = World.createObject('cube', 'lab_door', 0x445566, true);
    door.scale.set(0.15, 2.4, 1.1);
    door.position.set(3, 1.2, -2);
    door.userData.surfaceType = 'metal';
    Object.assign(door.userData, { soundMode: 'clip', soundClipId: 'sfx_metal_clang', soundTrigger: 'collision' });`)),
    scene('spawn two crates and a player if missing', IIFE(`    for (let i = 0; i < 2; i++) {
      const c = World.createObject('cube', 'crate_' + i, 0x8b5a2b, true);
      c.position.set(i * 2 - 1, 0.5, 0);
      c.userData.surfaceType = 'wood';
    }
    if (window.PlayerController?.getLocalPlayer && !PlayerController.getLocalPlayer()) {
      PlayerController.spawnPlayer();
    }`)),
    scene('arena floor plus six physics orbs', IIFE(`    const floor = World.createObject('cube', 'arena_floor', 0x222233, false);
    floor.scale.set(20, 0.2, 20);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    for (let i = 0; i < 6; i++) {
      const b = World.createObject('sphere', 'orb_' + i, 0x00ffaa, true);
      b.position.set((i - 2.5) * 2.5, 3, 0);
      b.userData.surfaceType = 'metal';
    }`)),
    scene('courtyard bench lamp and interior audio zone', IIFE(`    const bench = World.createObject('cube', 'courtyard_bench', 0x6b4f3a, false);
    bench.scale.set(2.2, 0.35, 0.8);
    bench.position.set(2, 0.2, -4);
    bench.userData.surfaceType = 'wood';
    bench.userData.locked = true;
    const lamp = World.createObject('cube', 'yard_lamp', 0x4a3728, false);
    lamp.scale.set(0.3, 1.4, 0.3);
    lamp.position.set(3.2, 0.9, -4);
    if (lamp.material) {
      lamp.material.emissive = new THREE.Color(0xffaa44);
      lamp.material.emissiveIntensity = 0.45;
    }
    const zone = World.createObject('cube', 'yard_zone', 0x888888, false);
    zone.scale.set(12, 4, 12);
    zone.position.set(0, 2, -4);
    zone.visible = false;
    zone.userData.audioZone = 'exterior_open';`)),
    scene('dusk fog atmosphere with concrete pad and beacon', IIFE(`    if (window.Environment?.setTimeOfDay) Environment.setTimeOfDay(19);
    if (window.Environment?.setFog) Environment.setFog(0.02);
    const pad = World.createObject('cube', 'pad', 0x3a3a40, false);
    pad.scale.set(12, 0.2, 12);
    pad.position.set(0, 0.1, 0);
    pad.userData.locked = true;
    pad.userData.surfaceType = 'concrete';
    const beacon = World.createObject('sphere', 'beacon', 0x00ffcc, false);
    beacon.position.set(0, 2.2, -2);
    if (beacon.material) {
      beacon.material.metalness = 0.7;
      beacon.material.roughness = 0.25;
      beacon.material.emissive = new THREE.Color(0x00ffcc);
      beacon.material.emissiveIntensity = 0.35;
    }
    beacon.userData.surfaceType = 'metal';
    beacon.userData.shaderHook = 'emissive_pulse';`)),
    scene('glass window wall with wetGlass and sheltered interior zone', IIFE(`    const glass = World.createObject('cube', 'glass_wall', 0xaaccff, false);
    glass.scale.set(6, 2.5, 0.08);
    glass.position.set(0, 1.4, -5);
    if (glass.material) {
      glass.material.transparent = true;
      glass.material.opacity = 0.32;
      glass.material.roughness = 0.06;
    }
    glass.userData.surfaceType = 'glass';
    glass.userData.wetGlass = true;
    glass.userData.shaderGraph = 'glass_rim';
    const interior = World.createObject('cube', 'interior_vol', 0x444444, false);
    interior.scale.set(8, 3, 6);
    interior.position.set(0, 1.5, -1);
    interior.visible = false;
    interior.userData.zoneSheltered = true;
    interior.userData.audioZone = 'interior_warm';`)),
    scene('metal walkway with wet_hero graph and railings', IIFE(`    const walk = World.createObject('cube', 'walkway', 0x666677, false);
    walk.scale.set(8, 0.12, 2.2);
    walk.position.set(0, 0.2, -6);
    walk.userData.surfaceType = 'metal';
    walk.userData.shaderGraph = 'wet_hero';
    walk.userData.locked = true;
    if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(walk, 'wet_hero');
    for (const side of [-1, 1]) {
      const rail = World.createObject('cube', 'rail_' + side, 0x888899, false);
      rail.scale.set(8, 0.08, 0.08);
      rail.position.set(0, 0.9, -6 + side * 1.0);
      rail.userData.surfaceType = 'metal';
      rail.userData.locked = true;
    }`)),
    scene('cursor-spawned cone and torus portal', IIFE(`    const p = World.getCursorPos ? World.getCursorPos() : { x: 0, y: 0, z: -2 };
    const marker = World.createObject('cone', 'cursor_cone', 0xffaa00, true);
    marker.position.set(p.x, (p.y || 0) + 1.2, p.z);
    const portal = World.createObject('torus', 'portal', 0xaa00ff, false);
    portal.position.set(p.x, (p.y || 0) + 2, p.z - 2);
    if (window.Runtime?.onTick) Runtime.onTick((dt) => { portal.rotation.y += dt * 0.5; });`)),
    scene('industrial generator with hum zone and heat shimmer', IIFE(`    const gen = World.createObject('cube', 'generator', 0x4a554a, false);
    gen.scale.set(1.6, 1.2, 1.0);
    gen.position.set(4, 0.6, 2);
    gen.userData.surfaceType = 'metal';
    gen.userData.audioZone = 'industrial_hum';
    gen.userData.shaderHook = 'heat_shimmer';
    if (gen.material) { gen.material.metalness = 0.75; gen.material.roughness = 0.35; }
    if (window.ShaderRegistry?.applyHook) ShaderRegistry.applyHook(gen, 'heat_shimmer');`)),
    scene('snowy exterior props with snowCap', IIFE(`    if (window.Environment?.setTimeOfDay) Environment.setTimeOfDay(9);
    const box = World.createObject('cube', 'snow_crate', 0x8b6914, true);
    box.position.set(0, 0.5, -3);
    box.userData.surfaceType = 'wood';
    box.userData.snowCap = 0.9;
    const rail = World.createObject('cube', 'snow_rail', 0x777788, false);
    rail.scale.set(3, 0.1, 0.1);
    rail.position.set(0, 1, -3.5);
    rail.userData.surfaceType = 'metal';
    rail.userData.snowCap = 0.8;
    rail.userData.shaderHook = 'snow_freshen';`)),
    scene('dusty concrete ruins with dust_overlay', IIFE(`    const wall = World.createObject('cube', 'ruin_wall', 0x9a958c, false);
    wall.scale.set(6, 2.8, 0.4);
    wall.position.set(-4, 1.4, -5);
    wall.userData.surfaceType = 'concrete';
    wall.userData.dustExposure = 0.8;
    wall.userData.shaderHook = 'dust_overlay';
    wall.userData.locked = true;
    const rubble = World.createObject('cube', 'rubble', 0x7a756e, true);
    rubble.position.set(-3, 0.4, -3);
    rubble.userData.surfaceType = 'gravel';`)),
    scene('asphalt road strip with highway audio', IIFE(`    const road = World.createObject('cube', 'road', 0x2a2a2a, false);
    road.scale.set(20, 0.1, 5);
    road.position.set(0, 0.05, 10);
    road.userData.surfaceType = 'asphalt';
    road.userData.locked = true;
    road.userData.audioZone = 'highway_edge';
    const cone = World.createObject('cone', 'traffic_cone', 0xff6600, true);
    cone.position.set(2, 0.5, 8);`)),
    scene('neon sign marquee and night fog', IIFE(`    if (window.Environment?.setTimeOfDay) Environment.setTimeOfDay(22);
    if (window.Environment?.setFog) Environment.setFog(0.018);
    const sign = World.createObject('cube', 'marquee', 0xff2266, false);
    sign.scale.set(3, 0.7, 0.12);
    sign.position.set(0, 3.5, -8);
    if (sign.material) {
      sign.material.emissive = new THREE.Color(0xff2266);
      sign.material.emissiveIntensity = 1.0;
    }
    sign.userData.weatherMarquee = true;
    sign.userData.shaderHook = 'emissive_pulse';`)),
    scene('grass path stepping stones and creek audio', IIFE(`    for (let i = 0; i < 5; i++) {
      const s = World.createObject('cube', 'stone_' + i, 0x6a6a5a, false);
      s.scale.set(0.85, 0.18, 0.65);
      s.position.set(i * 1.05 - 2, 0.1, 5);
      s.userData.surfaceType = 'gravel';
      s.userData.locked = true;
    }
    const creek = World.createObject('cube', 'creek', 0x3a6a8b, false);
    creek.scale.set(7, 0.8, 2.5);
    creek.position.set(0, 0.3, 7.5);
    creek.visible = false;
    creek.userData.audioZone = 'creek_near';`)),
    scene('wind foliage bushes along a path', IIFE(`    for (let i = 0; i < 4; i++) {
      const bush = World.createObject('sphere', 'bush_' + i, 0x2f6b3a, false);
      bush.scale.set(1.1, 0.85, 1.1);
      bush.position.set(-4 + i * 2.2, 0.55, -1);
      bush.userData.surfaceType = 'grass';
      bush.userData.shaderGraph = 'wind_foliage';
      if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(bush, 'wind_foliage');
    }`)),
    scene('sci-fi crates with neon_rim and locked floor', IIFE(`    const floor = World.createObject('cube', 'sci_floor', 0x1a1a22, false);
    floor.scale.set(14, 0.2, 14);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'metal';
    for (let i = 0; i < 3; i++) {
      const c = World.createObject('cube', 'sci_crate_' + i, 0x223344, false);
      c.position.set(i * 2 - 2, 0.5, -3);
      c.userData.surfaceType = 'metal';
      c.userData.shaderGraph = 'neon_rim';
      if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(c, 'neon_rim');
    }`)),
    scene('F-interact props: rest bench and info pedestal', IIFE(`    const bench = World.createObject('cube', 'rest_bench', 0x4a4035, false);
    bench.scale.set(1.8, 0.4, 0.7);
    bench.position.set(-2, 0.2, 4);
    bench.userData.surfaceType = 'wood';
    Object.assign(bench.userData, { interactHint: 'Sit', interactRadius: 2 });
    const ped = World.createObject('cube', 'info_pedestal', 0x555566, false);
    ped.scale.set(0.6, 1.0, 0.6);
    ped.position.set(2, 0.5, 4);
    ped.userData.surfaceType = 'metal';
    Object.assign(ped.userData, { interactHint: 'Read plaque', interactRadius: 2.2 });`)),
    scene('two colored boxes and log when player spawns', IIFE(`    const a = World.createObject('cube', 'box_a', 0xff4444, true);
    const b = World.createObject('cube', 'box_b', 0x4488ff, true);
    a.position.set(-1.5, 0.5, 0);
    b.position.set(1.5, 0.5, 0);
    if (window.PlayerController?.getLocalPlayer && !PlayerController.getLocalPlayer()) {
      PlayerController.spawnPlayer();
      console.log('player spawned');
    }`)),
    scene('minimal empty-safe extend: single locked pad only', IIFE(`    const floor = World.createObject('cube', 'safe_pad', 0x333340, false);
    floor.scale.set(10, 0.2, 10);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';`)),
    scene('physics barrel line with friction', IIFE(`    for (let i = 0; i < 4; i++) {
      const barrel = World.createObject('cube', 'barrel_' + i, 0x553311, true);
      barrel.scale.set(0.7, 1.1, 0.7);
      barrel.position.set(i * 1.4 - 2, 0.6, -4);
      barrel.userData.mass = 18;
      barrel.userData.friction = 0.65;
      barrel.userData.surfaceType = 'wood';
    }`)),
    scene('storm exterior shed with dusk env', IIFE(`    if (window.Environment?.setTimeOfDay) Environment.setTimeOfDay(17.5);
    if (window.Environment?.setFog) Environment.setFog(0.025);
    const shed = World.createObject('cube', 'shed', 0x5a5048, false);
    shed.scale.set(3.2, 2.4, 2.8);
    shed.position.set(-5, 1.2, -6);
    shed.userData.surfaceType = 'wood';
    shed.userData.shaderGraph = 'storm_exterior';
    shed.userData.locked = true;
    if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(shed, 'storm_exterior');`)),
    scene('display case glass_rim and pedestal', IIFE(`    const ped = World.createObject('cube', 'case_pedestal', 0x444450, false);
    ped.scale.set(1.2, 0.9, 1.2);
    ped.position.set(0, 0.45, -3);
    ped.userData.surfaceType = 'metal';
    ped.userData.locked = true;
    const glass = World.createObject('cube', 'case_glass', 0xccddff, false);
    glass.scale.set(1.3, 1.3, 1.3);
    glass.position.set(0, 1.5, -3);
    if (glass.material) {
      glass.material.transparent = true;
      glass.material.opacity = 0.28;
      glass.material.roughness = 0.05;
    }
    glass.userData.surfaceType = 'glass';
    glass.userData.wetGlass = true;
    glass.userData.shaderGraph = 'glass_rim';
    if (window.ShaderNodeGraph?.applyGraph) ShaderNodeGraph.applyGraph(glass, 'glass_rim');`)),
    scene('lab entrance: door, floor, player spawn, industrial hum', IIFE(`    const floor = World.createObject('cube', 'lab_floor', 0x3a3a42, false);
    floor.scale.set(16, 0.2, 16);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    const door = World.createObject('cube', 'lab_entry', 0x445566, false);
    door.scale.set(0.2, 2.6, 1.4);
    door.position.set(0, 1.3, -7);
    door.userData.surfaceType = 'metal';
    const hum = World.createObject('cube', 'lab_hum', 0x555555, false);
    hum.scale.set(10, 3, 10);
    hum.position.set(0, 1.5, 0);
    hum.visible = false;
    hum.userData.audioZone = 'industrial_hum';
    if (window.PlayerController?.getLocalPlayer && !PlayerController.getLocalPlayer()) {
      PlayerController.spawnPlayer({ x: 0, y: 1, z: 6 });
    }`)),
];

// Clean COMPILER: drop broken trailing entries
const COMPILER_CLEAN = COMPILER.filter((row) => {
    const a = row.messages?.[1]?.content || '';
    return a.length > 10 && !a.includes('0x//') && !a.includes('invalid');
});

// Extra medium examples generated from patterns
function expandCompiler() {
    const extra = [];
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffaa00, 0xaa00ff, 0x00ffcc, 0x8b4513, 0xcccccc];
    const types = ['cube', 'sphere', 'cone', 'torus'];
    const surfaces = ['wood', 'metal', 'concrete', 'glass', 'gravel', 'grass', 'asphalt'];
    types.forEach((type, i) => {
        const col = colors[i % colors.length];
        const surf = surfaces[i % surfaces.length];
        extra.push(suggest(
            `// simple ${type} prop with ${surf} surface`,
            IIFE(`    const m = World.createObject('${type}', '${type}_prop_${i}', ${col}, ${type === 'cube' ? 'true' : 'false'});
    m.position.set(${i - 2}, ${type === 'sphere' || type === 'torus' ? 1.2 : 0.5}, -2);
    m.userData.surfaceType = '${surf}';`),
        ));
    });
    surfaces.forEach((surf, i) => {
        extra.push(suggest(
            `// footstep surface sample ${surf}`,
            IIFE(`    const m = World.createObject('cube', 'surf_${surf}', 0x888888, false);
    m.scale.set(2, 0.15, 2);
    m.position.set(${(i - 3) * 2.2}, 0.08, 3);
    m.userData.surfaceType = '${surf}';
    m.userData.locked = true;`),
        ));
    });
    // common typo patches
    extra.push(patch(
        "World.createObject('cube', crate, 0xff0000, false);",
        "const crate = World.createObject('cube', 'crate', 0xff0000, false);",
    ));
    extra.push(patch(
        "m.position.set(0 1 0);",
        'm.position.set(0, 1, 0);',
    ));
    extra.push(patch(
        "if (lamp.material) lamp.material.metalness = 'high';",
        'if (lamp.material) lamp.material.metalness = 0.7;',
    ));
    extra.push(suggest(
        '// do not clear world — only add a torus',
        IIFE(`    const t = World.createObject('torus', 'ring', 0x00aaff, false);
    t.position.set(0, 1.5, -2);`),
    ));
    extra.push(suggest(
        '// pause guard only message when playing',
        `(function() {
  if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
  Engine.setRenderMode(4);
  UI.status('Ready to edit');
})();`,
    ));
    // shader hooks catalog
    ['wet_surface_boost', 'emissive_pulse', 'dust_overlay', 'snow_freshen', 'heat_shimmer'].forEach((hook, i) => {
        extra.push(suggest(
            `// apply shader hook ${hook}`,
            IIFE(`    const m = World.createObject('cube', 'hook_${hook}', 0x667788, false);
    m.position.set(${i - 2}, 0.5, -4);
    m.userData.surfaceType = 'metal';
    m.userData.shaderHook = '${hook}';
    if (window.ShaderRegistry?.applyHook) ShaderRegistry.applyHook(m, '${hook}');`),
        ));
    });
    // audio zones catalog
    ['interior_warm', 'exterior_open', 'industrial_hum', 'creek_near', 'highway_edge'].forEach((zone, i) => {
        extra.push(suggest(
            `// audio zone ${zone}`,
            IIFE(`    const z = World.createObject('cube', 'azone_${zone}', 0x888888, false);
    z.scale.set(6, 3, 6);
    z.position.set(${(i - 2) * 3}, 1.5, 0);
    z.visible = false;
    z.userData.audioZone = '${zone}';`),
        ));
    });
    return extra;
}

function expandClassify() {
    const extra = [];
    const spawnNouns = ['wall', 'floor', 'platform', 'ramp', 'pillar', 'beam', 'sign', 'chair', 'table', 'fence'];
    spawnNouns.forEach((n) => {
        extra.push(intent(`add a ${n} to the scene`, 'spawn', 'World.createObject'));
    });
    const helpQs = [
        ['how do I sprint', 'other', 'CONTROLS'],
        ['open help menu', 'other', 'HelpMenu'],
        ['what is ADS', 'other', 'CONTROLS + fpsViewmodel'],
        ['reload my avatar skin', 'other', 'SKIN panel'],
        ['link multiplayer friends', 'other', 'Lobby + LINK'],
        ['freeze memory after build', 'other', 'aiMemoryFreeze'],
        ['run portal generate', 'spawn', 'AgentPortal'],
        ['open scene inspector', 'edit', 'Inspector'],
        ['toggle fly mode', 'other', 'touchControls + walk/fly'],
        ['enable VOIP', 'other', 'voip'],
    ];
    helpQs.forEach(([u, i, a]) => extra.push(intent(u, i, a)));
    return extra;
}

function expandNpc() {
    const extra = [];
    const lines = [
        ['a lost tourist', 'Where am I?', 'You are on the Threshold blank grid — host session, AI station, and export path. Walk the pad and press F on glowing stations.'],
        ['a veteran builder', 'Any tips for clean scenes?', 'Name meshes for GIMP, set surfaceType, prefer MaterialPresets, and never clearWorld unless asked.'],
        ['a junior scripter', 'World.createObject signature?', 'Positional: World.createObject(type, name, colorHex, usePhysics). Types: cube sphere cone torus.'],
        ['a playtester', 'Controls feel wrong', 'EDIT unlocks TOOLS; PLAY uses bottom-left walk/fly and touch pads. Rebind in SCENE bindings if needed.'],
        ['a streamer', 'How do I record?', 'Use the in-engine Recorder for WebM clips while playing — great for trailers and bug reports.'],
        ['an asset artist', 'HILOD?', 'Author 2K masters, run textures:hilod for _1k/_2k tiers and WebP sidecars for lite devices.'],
        ['a relay operator', 'Self-host multiplayer?', 'Run relay/ with Docker or PM2, point clients at your host — see relay README and relay:verify.'],
        ['a Steam coach', 'Steamworks ready?', 'package:steam uses the stub shim until you plug real Steamworks; follow STEAM_RELEASE docs.'],
        ['a mobile coach', 'Capacitor tips?', 'Web-first first. Android/iOS packaging needs local SDKs; export wizard lists optional native targets.'],
        ['a narrative NPC', 'Tell me a short lab rumor', 'They say the coil still dreams of wireless power — if the pad lights twice, do not stand on the iron grate. [ACTION: lowers voice]'],
        ['a merchant', 'Where is the courtyard?', 'Past the AI station, left of the copper racks — crates stack themselves when the rain starts.'],
        ['a guard', 'Stop right there', 'Easy — hands visible. Builders pause the world before moving gear. You paused? Good. Pass.'],
        ['Nikola', 'Show me something wondrous', 'Watch the coil when dusk hits mode 4 — PBR metal drinks the sky. [ACTION: points at the tower]'],
        ['a guide', 'Difference between Portal and Compiler?', 'Portal plans and generates larger builds; Compiler runs and patches JS. Use both while EDIT is active.'],
        ['a guide', 'What is PromptGen?', 'Short idea → JS snippet for the live scene. Review output, then run it from Compiler in EDIT.'],
    ];
    lines.forEach(([p, q, a]) => extra.push(npc(p, q, a)));
    return extra;
}

function expandScenes() {
    const extra = [];
    const ideas = [
        ['checker of four colored cubes', IIFE(`    const cols = [0xff5555, 0x55ff55, 0x5555ff, 0xffaa00];
    cols.forEach((c, i) => {
      const m = World.createObject('cube', 'chk_' + i, c, false);
      m.position.set((i % 2) * 2 - 1, 0.5, Math.floor(i / 2) * 2 - 1);
      m.userData.surfaceType = 'metal';
    });`)],
        ['line of cones as traffic markers', IIFE(`    for (let i = 0; i < 5; i++) {
      const c = World.createObject('cone', 'cone_' + i, 0xff6600, true);
      c.position.set(i * 1.5 - 3, 0.5, -5);
    }`)],
        ['ring of spheres around origin', IIFE(`    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = World.createObject('sphere', 'ring_' + i, 0x00ccff, false);
      s.position.set(Math.cos(a) * 4, 1.2, Math.sin(a) * 4);
      s.userData.surfaceType = 'metal';
    }`)],
        ['simple doorway frame without clearWorld', IIFE(`    const left = World.createObject('cube', 'door_l', 0x555555, false);
    left.scale.set(0.25, 2.4, 0.25);
    left.position.set(-1, 1.2, -4);
    left.userData.locked = true;
    const right = World.createObject('cube', 'door_r', 0x555555, false);
    right.scale.set(0.25, 2.4, 0.25);
    right.position.set(1, 1.2, -4);
    right.userData.locked = true;
    const top = World.createObject('cube', 'door_t', 0x555555, false);
    top.scale.set(2.5, 0.25, 0.25);
    top.position.set(0, 2.5, -4);
    top.userData.locked = true;`)],
        ['PBR metal sphere beacon only', IIFE(`    const s = World.createObject('sphere', 'beacon', 0x00ffcc, false);
    s.position.set(0, 1.8, -2);
    if (s.material) {
      s.material.metalness = 0.8;
      s.material.roughness = 0.2;
      s.material.emissive = new THREE.Color(0x00ffcc);
      s.material.emissiveIntensity = 0.3;
    }
    s.userData.surfaceType = 'metal';`)],
    ];
    ideas.forEach(([idea, code]) => extra.push(scene(idea, code)));
    return extra;
}

function writeJsonl(rel, rows) {
    const file = path.join(DS, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let finalRows = rows;
    if (MERGE && fs.existsSync(file)) {
        const existing = fs.readFileSync(file, 'utf8').trim().split(/\n+/).filter(Boolean).map((l) => JSON.parse(l));
        const keys = new Set(existing.map((r) => JSON.stringify(r.messages?.[0]?.content || '')));
        const added = rows.filter((r) => !keys.has(JSON.stringify(r.messages?.[0]?.content || '')));
        finalRows = existing.concat(added);
        console.log(`  ${rel}: merge +${added.length} → ${finalRows.length} total`);
    } else {
        console.log(`  ${rel}: write ${finalRows.length} examples`);
    }
    // de-dupe by user content
    const seen = new Set();
    const deduped = [];
    for (const r of finalRows) {
        const k = JSON.stringify(r.messages?.[0]?.content || '');
        if (seen.has(k)) continue;
        seen.add(k);
        deduped.push(r);
    }
    fs.writeFileSync(file, deduped.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
    return deduped.length;
}

function main() {
    console.log(`bootcamp:seed — ${MERGE ? 'merge' : 'full rewrite'}\n`);

    const classify = [...CLASSIFY, ...expandClassify()];
    const npcRows = [...NPC, ...expandNpc()];
    const compiler = [...COMPILER_CLEAN, ...expandCompiler()];
    const scenes = [...SCENES, ...expandScenes()];

    // Additional medium file: intent-adjacent guide snippets as code comments? skip

    const counts = {
        classify: writeJsonl(path.join('small', 'classify.jsonl'), classify),
        npc: writeJsonl(path.join('small', 'npc.jsonl'), npcRows),
        compiler: writeJsonl(path.join('medium', 'compiler.jsonl'), compiler),
        scenes: writeJsonl(path.join('large', 'scenes.jsonl'), scenes),
    };

    // Secondary medium file for patch-only variety (also wired in bootcamp.json)
    const patchesOnly = compiler.filter((r) => r.task === 'dev_patch');
    const suggestsOnly = compiler.filter((r) => r.task === 'dev_suggest');
    counts.patches = writeJsonl(path.join('medium', 'patches.jsonl'), patchesOnly);
    counts.suggests = writeJsonl(path.join('medium', 'suggests.jsonl'), suggestsOnly);

    // Guide Q&A for small tier (helps "other" intents feel natural in NPC model)
    const guides = [
        pair('npc_chat',
            'You are a Threshold coach. Player says: What globals can scripts use?',
            'Use World, Engine, Environment, State, UI, PlayerController, Physics, THREE for materials only — never scene.add or new THREE.Scene.'),
        pair('npc_chat',
            'You are a Threshold coach. Player says: List createObject types',
            'cube, sphere, cone, and torus — World.createObject(type, name, colorHex, usePhysics).'),
        pair('npc_chat',
            'You are a Threshold coach. Player says: When is clearWorld OK?',
            'Only when the user explicitly asks to wipe the scene. Default is extend-only builds.'),
        pair('intent_classify', 'slop scan my export', 'INTENT: export\nAPI: ExportWizard + assessSceneSlop'),
        pair('intent_classify', 'bundle audio zones for guests', 'INTENT: export\nAPI: ExportWizard immersive prefs'),
        pair('intent_classify', 'apply material preset wet_hero', 'INTENT: style\nAPI: MaterialPresets'),
    ];
    counts.guide = writeJsonl(path.join('small', 'guide.jsonl'), guides);

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log('\nCounts:', counts);
    console.log(`Unique file totals (sum of files): ${total}`);
    console.log(`
Next:
  npm run bootcamp:build
  npm run models:mini
  # or one shot:
  npm run train:mini
`);
}

main();
