/** Code reference library — Compiler sidebar + PromptGen context */

export const REFERENCE_SECTIONS = ['workflows', 'players', 'worlds', 'techniques'];

export const REFERENCE_LIBRARY = {
    workflows: [
        {
            id: 'quick_start',
            title: 'Quick Start — Solo Game in 10 Steps',
            summary: 'Lobby → in-engine tutorial → build (EDIT) → AI → PLAY → export. Full loop for first playable scene.',
            checklist: ['Start SOLO or HOST', 'First visit: engine TUTORIAL (MORE → TUTORIAL to replay)', 'Stay in EDIT while building', 'MORE → EXPORT when ready to ship'],
            code: `// WORKFLOW (not runnable — follow in UI):
// 1. Lobby → SOLO PLAY (or CREATE SESSION + copy link)
// 2. ENGINE → tutorial (9 steps) — MORE → TUTORIAL to replay
// 3. EDIT (paused) — fly WASD, + insert, right-click INSERT
// 4. INSERT → SPAWN AS PLAYER for walkable avatar
// 5. Optional art: GIMP → textures/ → Texture GIMP SYNC — OR Blender → INSERT GLTF
// 6. PromptGen → Compiler OR SCENE → AI agents (optional)
// 7. SAVE WORLD (MORE) — ?world=CODE link
// 8. CHECK CODE READY → RUN IN ENGINE
// 9. PLAY — test walk + physics + Hyper for PBR
// 10. MORE → EXPORT — 9 steps (INFO→SHIP) → store:prep → package:*
// Optional: Lobby THRESHOLD CHILD (original vehicles) — docs/THRESHOLD_CHILD_ASSETS.md
// See docs/GETTING_STARTED.md · docs/EXPORT_WALKTHROUGH.md`
        },
        {
            id: 'render_modes_3d',
            title: 'Render Modes — 3D Readable Across All Styles',
            summary: 'Threshold/1-Bit/Terminal/SMPTE use depth+grid bands; Hyper is full PBR. Space props on Z for layers.',
            checklist: ['0 Threshold = lightweight 5-band', '1 1-Bit = B&W only — spacing matters', '2 Terminal = green cross-hatch layers', '4 Hyper = water+physics+IBL default'],
            code: `// RENDER MODES (Engine → ENV → Render):
// 0 THRESHOLD — ultimate compatibility, 5 luminance+depth bands + crossed grid
// 1 1-BIT — binary B&W; mid-tones lost — separate objects in Z/fog
// 2 TERMINAL — phosphor green parallel+crossed hatch per depth band
// 3 SMPTE — 4-level quantized color + depth tint
// 4 HYPER — full lighting, bloom, water, IBL reflections, physics showcase
//
// AI layout rule: stagger Z every 2–3 units for retro modes
// Engine.setRenderMode(4); // realism default`
        },
        {
            id: 'env_physics_atmosphere',
            title: 'Fog + Atmosphere → Physics',
            summary: 'ENV fog density and atmosphere add air drag and light wind on dynamic bodies.',
            checklist: ['Fog slider increases linearDamping', 'Atmosphere ON enables wind force', 'Heavier mass = less drift'],
            code: `// Tuned automatically in Physics.applyEnvironmentEffects():
// - fogDensity → body.linearDamping (air resistance)
// - atmosphereEnabled → subtle wind from time-of-day
// Inspector Collision: mass/friction/restitution still per-object`
        },
        {
            id: 'creative_cli_watch',
            title: 'Creative CLI — textures:watch + blender:export',
            summary: 'Dev hot-reload loop: watch folder saves GIMP/Blender output into live Engine.',
            checklist: ['npm run textures:watch', 'npm run dev in second terminal', 'Save PNG to textures/ or GLB to import/', 'Object name must match filename slug'],
            code: `// CREATIVE CLI (terminal — not Compiler JS):
// Terminal A:
npm run textures:watch
// Terminal B:
npm run dev
//
// GIMP export → textures/stone_block_albedo.png
// Engine hot-reloads meshes named "Stone Block" (slug stone_block)
//
// Headless Blender (CI / batch):
npm run blender:export -- --blend scene.blend --object "Stone Block"
// → import/stone_block.glb + threshold_blender_manifest.json
// Watch relay also hot-reloads GLTF in import/`
        },
        {
            id: 'blender_gltf_export',
            title: 'Blender GLTF → Engine INSERT',
            summary: 'Export textured GLB from Blender addon; insert at cursor with physics bbox collision.',
            checklist: ['npm run blender:install', 'File → Export → Threshold GLTF', 'INSERT → GLTF tab', 'Collision panel for mass/friction'],
            code: `// BLENDER + ENGINE WORKFLOW (not runnable in Compiler):
// 1. npm run blender:install — enable "Threshold Export" in Blender Preferences
// 2. Model with PBR materials — select mesh
// 3. File → Export → Threshold GLTF (.glb)
//    Object name: "Stone Block" · export to <project>/import/
// 4. Compiler snap + physics metadata:
const m = World.createObject('cube', 'Stone Block', 0xffffff, true);
m.userData.mass = 1.5;
m.userData.friction = 0.42;
// (Replace with INSERT → GLTF after Blender export for real mesh)
// 5. Engine EDIT → INSERT → GLTF — pick .glb or BLENDER MANIFEST
// 6. SAVE WORLD persists gltfUrl / gltfPath + transform`
        },
        {
            id: 'gimp_texture_export',
            title: 'GIMP Export → Engine GIMP SYNC',
            summary: 'Paint PBR maps in GIMP, export via Threshold plugin, sync to mesh by object name.',
            checklist: ['npm run gimp:install', 'GIMP: Filters → Threshold → Export PBR Maps', 'Object name = mesh name in Engine', 'Texture tab → GIMP SYNC'],
            code: `// GIMP + ENGINE WORKFLOW (not runnable in Compiler):
// 1. npm run gimp:install — restart GIMP
// 2. Paint albedo on active layer; optional layers: roughness, metalness, normal
// 3. Filters → Threshold → Export PBR Maps…
//    Object name: "Stone Block" (must match Engine inspector Name)
//    Export folder: <your-project>/textures
// 4. Compiler / PromptGen snap mesh:
const m = World.createObject('cube', 'Stone Block', 0xffffff, true);
m.userData.textureHint = 'textures/stone_block_albedo.png';
// 5. Engine EDIT → select Stone Block → Texture → GIMP SYNC
//    Electron: auto-loads from threshold_manifest.json + PNG paths
//    Web: manifest lists files — import via ALBEDO / ROUGH / METAL buttons`
        },
        {
            id: 'texture_local_import',
            title: 'Local Texture Import — Inspector Texture Tab',
            summary: 'Import PNG/JPG albedo, roughness, and metalness maps onto selected meshes. Stored in IndexedDB; included in EXPORT manifest.',
            checklist: ['EDIT mode — select mesh', 'SCENE → Inspect → Texture tab', 'ALBEDO / ROUGH / METAL buttons', 'SAVE WORLD + EXPORT manifest'],
            code: `// TEXTURE WORKFLOW (Engine UI — not runnable):
// 1. Pause (EDIT) → select cube/sphere/cone/torus
// 2. SCENE panel → Inspect → Texture tab
// 3. ALBEDO — import PNG/JPG (web file picker or Electron dialog)
// 4. Optional ROUGH + METAL grayscale maps for PBR (Hyper mode)
// 5. Maps persist in userData.textures { albedo, roughness, metalness }
// 6. SAVE WORLD / sync restores maps from local library
// 7. MORE → EXPORT — manifest.textures lists { id, path, objectId, slot }
//
// Code hint for PromptGen / GIMP export path:
const m = World.createObject('cube', 'Stone Block', 0xffffff, true);
m.userData.textureHint = 'textures/stone_albedo.png';
// User imports the file in Texture tab — no cloud upload required`
        },
        {
            id: 'lego_fit_anything',
            title: 'LEGO Fit — Snap Anything Into the Live Scene',
            summary: 'PromptGen + Compiler pattern: read scene context, extend without clearWorld, physics+collision ready.',
            checklist: ['No World.clearWorld()', 'World.getCursorPos() or fixed coords', 'usePhysics: true for interactives', 'userData for inspector panels'],
            code: `// LEGO FIT TEMPLATE — paste from PromptGen into Compiler:
(function() {
  const p = World.getCursorPos();
  const snap = (type, name, color, physics, x, y, z) => {
    const m = World.createObject(type, name, color, physics);
    if (!m) return null;
    m.position.set(p.x + x, p.y + y, p.z + z);
    m.userData.friction = 0.42;
    m.userData.restitution = 0.25;
    if (physics) m.userData.mass = 1.5;
    return m;
  };
  snap('cube', 'Lego_A', 0x39ff14, true, 0, 1.2, 0);
  snap('sphere', 'Lego_B', 0xffffff, true, 1.5, 1.5, -1);
  snap('torus', 'Lego_C', 0x4488ff, false, -1.5, 1.8, 1);
  UI.status('LEGO blocks snapped — pause to inspect Collision/Audio');
})();`
        },
        {
            id: 'first_session_walkthrough',
            title: 'First Session Walkthrough (in-engine)',
            summary: '9-step tutorial: panels, EDIT/PLAY, build, textures, optional AI, export.',
            checklist: ['Auto-starts once per browser', 'MORE → TUTORIAL to replay', 'Textures step: GIMP SYNC / GLTF', 'EXPORT lists all asset refs'],
            code: `// Tutorial steps (engine overlay):
// 1. Welcome + starter scene (Guide NPC, platform)
// 2. Drag TOOLS / SCENE panels · LOCK headers
// 3. EDIT vs PLAY badge
// 4. Optional: "Add tutorial block" action
// 5. "Guide + AI tab" OR "Open PromptGen"
// 6. PLAY to playtest · WASD / FLY toggle
// 7. MORE → SAVE WORLD · MORE → EXPORT (.threshold-game.json)
// 8. Done — Compiler WORKFLOWS for deeper patterns`
        },
        {
            id: 'save_and_resume',
            title: 'Save & Build Later — Worlds + Projects',
            summary: 'Worlds = scene state. Projects = scene + scripts together in Compiler vault.',
            checklist: ['SAVE WORLD for map only', 'SAVE PROJECT for map + compiler scripts', 'Export JSON for backup', '?world=CODE for share links'],
            code: `// Worlds (toolbar SAVE WORLD / WORLDS):
// - IndexedDB on this device + optional Supabase cloud
// - Share: Persistence.getShareUrl(code) → ?world=CODE

// Projects (Compiler sidebar PROJECT VAULT):
// - Saves comp-input, comp-output, running code, AND live world snapshot
// - Load project → restores scripts; optionally apply world in Engine

// Disk export still available: EXPORT scene JSON, SAVE TO DISK script`
        },
        {
            id: 'multiplayer_host',
            title: 'Multiplayer Host Flow',
            summary: 'Host pauses to edit; guests play locked map. Admins can code. Controls sync from host.',
            checklist: ['CREATE SESSION → COPY LINK', 'PAUSE = EDIT for world edits', 'PLAYERS panel for admin flags', 'PUSH CONTROLS TO ALL after rebinding'],
            code: `// Host checklist:
// 1. CREATE SESSION → share invite link
// 2. PAUSE (EDIT) — build world, run Compiler code
// 3. PLAYERS panel — grant Admin to trusted guests
// 4. KEYS → Host profile → PUSH CONTROLS TO ALL
// 5. RESUME (PLAY) — guests explore; map locked
// 6. Guests: KEYS → Guest profile for personal overrides
// Auto-pause when host opens Compiler/PromptGen (toggle in PLAYERS panel)`
        },
        {
            id: 'ai_prompt_loop',
            title: 'AI-Assisted Build Loop',
            summary: 'PromptGen → Compiler → Engine. Live scene includes ASSET MANIFEST for textures/GLTF.',
            checklist: ['Include live scene in PromptGen', 'Pick task type (extend/player/world)', 'CHECK CODE READY before RUN', 'Pause stays on during EDIT runs'],
            code: `// Loop:
// 1. PromptGen — "Include live scene" + TASK → prompt includes ASSET MANIFEST
// 2. COPY PROMPT → your AI (or RUN WITH GROK)
// 3. Paste JS into Compiler INPUT → CONVERT → CHECK CODE READY
// 4. Generated code should include // ASSETS: block with textureHint + gltf paths
// 5. RUN IN ENGINE → GIMP SYNC / INSERT GLTF for local files
// 6. Inspect EDIT → Texture / Collision / Audio panels
// Reference: WORKFLOWS → gimp_texture_export, blender_gltf_export`
        },
        {
            id: 'export_game_package',
            title: 'Export Game Package (APK / Windows / iOS planned)',
            summary: 'Manifest lists world, scripts, sounds, textures, GIMP/Blender paths → native CLI wrap.',
            checklist: ['MORE → EXPORT wizard (4 steps)', 'Review texture + GLTF counts', 'package:android / package:win', 'iOS: docs/NEXT_PHASES.md Phase F'],
            code: `// After designing your game:
// 1. MORE → EXPORT — name, review (objects, textures, GLTF, sounds), targets, download
// 2. Manifest includes textures[], gimp{}, blender{}, creativeCli{}
// 3. npm run init:native (first time Android)
// 4. npm run package:android — Android Studio → APK
// 5. npm run package:win — portable .exe
// 6. iOS App Store — Phase F (not yet — see NEXT_PHASES.md)
// 7. relay/README.md — optional owned signaling`
        },
        {
            id: 'relay_aws_host',
            title: 'Self-Host Relay (local or AWS)',
            summary: 'PeerJS signaling on your machine or free-tier VPS for reliable multiplayer.',
            checklist: ['cd relay && npm start', 'Set VITE_PEER_HOST in build env', 'Rebuild web app', 'HTTPS + nginx on AWS'],
            code: `// Local relay:
// cd relay && npm install && npm start
// .env: VITE_PEER_HOST=localhost VITE_PEER_PORT=9000 VITE_PEER_SECURE=false
// npm run build
// AWS: see relay/README.md`
        },
        {
            id: 'agents_grok_npc_dev',
            title: 'AI Agents — Grok NPC + Dev + Local',
            summary: 'SCENE dock → AI tab. Attach Grok to NPCs; Dev agent suggests Compiler code.',
            checklist: ['Grok API key (auth overlay)', 'Select NPC → ATTACH TO NPC', 'NPC TALK for dialogue', 'GROK DEV for Compiler'],
            code: `// NPC: select human NPC → SCENE → AI → ATTACH TO NPC
// Dev: write draft in Compiler → SCENE → AI → GROK DEV: APPLY
// Local: interval script in AI tab — no API key
// userData.agentType / agentPersona on NPCs persist in world export`
        },
        {
            id: 'sound_prompt_loop',
            title: 'Sounds in AI Prompts',
            summary: 'Record in SFX tab → check clips in PromptGen → AI wires soundClipId on objects.',
            checklist: ['Record sounds in ENGINE → SFX', 'PromptGen: Include sound library', 'Select which clips to reference', 'EDIT → Audio to tweak triggers'],
            code: `// Example — assign library clip to new object:
const m = World.createObject('cube', 'Chime Block', 0xffaa00, true);
m.userData.soundMode = 'clip';
m.userData.soundClipId = 'sfx_xxx'; // from PromptGen sound list
m.userData.soundTrigger = 'collision';

// Triggers: collision | interact | emote | ambient
// User records after AI runs if clip ID not set — SFX tab + prompt modal`
        }
    ],
    players: [
        {
            id: 'walker_capsule',
            title: 'Walker — Detailed Human + Physics',
            summary: 'Playable HumanMesh avatar with walk animation, Cannon body, third-person camera.',
            checklist: ['Uses PlayerController.spawn', 'No World.clearWorld unless intended', 'Skins use MeshStandardMaterial'],
            code: `// Spawn playable walker at world center — pause (EDIT) before placing props
PlayerController.spawn(0, 2, 0);
State.controlMode = 'walk';`
        },
        {
            id: 'npc_human',
            title: 'NPC Human — Static Character',
            summary: 'Scene dressing human. Editable in EDIT mode: texture, collision off, audio cue.',
            checklist: ['Sets userData.isHuman', 'No physics unless NPC should be pushable', 'Named for inspector'],
            code: `// Static NPC at cursor — run while paused
const p = World.getCursorPos();
State.ctxTargetPos.set(p.x, p.y, p.z);
World.spawnCharacter();
// In EDIT mode select body → Texture / Audio panels`
        },
        {
            id: 'custom_avatar_group',
            title: 'Custom Avatar — Limb Group + Skin',
            summary: 'Build a THREE.Group avatar. In PLAY mode players edit skin only; host edits in EDIT.',
            checklist: ['Group userData.isPlayer or isHuman', 'Materials on each limb', 'locked: true on player parts'],
            code: `(function() {
  const g = new THREE.Group();
  g.userData = { name: 'Avatar', type: 'human', isHuman: true, locked: true };
  const mat = new THREE.MeshStandardMaterial({ color: 0x44aa88, roughness: 0.6 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), mat);
  torso.position.y = 1.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), mat.clone());
  head.position.y = 1.65;
  g.add(torso, head);
  g.position.set(0, 1, 0);
  Engine.scene.add(g);
  State.objects.push(g);
})();`
        },
        {
            id: 'player_skin_reload',
            title: 'Player Skin — Reload Textures (PLAY safe)',
            summary: 'Only mutates player materials. Safe during PLAY; does not edit world map.',
            checklist: ['Targets PlayerController.mesh only', 'No World.createObject for world', 'Uses .material.color or map'],
            code: `// PLAY mode: players can run this to recolor their avatar
if (!PlayerController.spawned) { UI.status('Spawn player first'); return; }
PlayerController.group.traverse((c) => {
  if (c.isMesh && c.material) {
    c.material.color.setHex(0xff6699);
    c.material.roughness = 0.4;
    c.material.needsUpdate = true;
  }
});
UI.status('Skin reloaded');`
        }
    ],
    worlds: [
        {
            id: 'arena_platform',
            title: 'Arena — Platform + Physics Props',
            summary: 'Small competitive space. Hyper mode + physics. Pause to edit collisions/textures.',
            checklist: ['Floor implied by grid', 'usePhysics: true only for interactive props', 'High contrast for retro modes'],
            code: `(function() {
  const floor = World.createObject('cube', 'arena_floor', 0x222233, false);
  floor.scale.set(20, 0.2, 20);
  floor.position.set(0, 0.1, 0);
  floor.userData.locked = true;
  for (let i = 0; i < 6; i++) {
    const b = World.createObject('sphere', 'orb_' + i, 0x00ffaa, true);
    b.position.set((i - 2.5) * 2.5, 3, 0);
  }
  Engine.setRenderMode(4);
})();`
        },
        {
            id: 'terminal_gallery',
            title: 'Terminal Gallery — Layered Grid Readability',
            summary: 'Objects spaced on Z-axis for depth bands in Terminal / Threshold modes.',
            checklist: ['Objects at different Z for depth layers', 'Neon emissive for Hyper fallback', 'Pause before edit'],
            code: `(function() {
  const colors = [0xffffff, 0xaaaaaa, 0x666666, 0x333333, 0x111111];
  colors.forEach((col, i) => {
    const m = World.createObject('cube', 'layer_' + i, col, false);
    m.position.set(i * 2 - 4, 1.5, -i * 3);
    m.material.emissive = new THREE.Color(col);
    m.material.emissiveIntensity = 0.15;
  });
  Engine.setRenderMode(2);
})();`
        },
        {
            id: 'persisted_world',
            title: 'Persisted World — Save / Share',
            summary: 'Build then SAVE WORLD. Share ?world=CODE link. Edit only in EDIT (paused).',
            checklist: ['No clearWorld after build', 'Host saves via Persistence.saveWorld', 'Guests join read-only map in PLAY'],
            code: `// After building while paused:
// UI → SAVE WORLD (or Persistence.saveWorld('My Arena'))
// Share: Persistence.getShareUrl(code)`
        },
        {
            id: 'multiplayer_stage',
            title: 'Multiplayer Stage — Host Edit / Guest Play',
            summary: 'Host pauses to edit world + code. Guests play with locked map; admins can code.',
            checklist: ['Host uses PAUSE for EDIT', 'RUN_CODE only when paused (host/admin)', 'Players use skin reload in PLAY'],
            code: `// Host workflow:
// 1. PAUSE (EDIT mode) → insert objects → Texture/Collision panels
// 2. Compiler → paste technique → RUN IN ENGINE (stays paused)
// 3. RESUME (PLAY) → guests explore; map locked`
        }
    ],
    techniques: [
        {
            id: 'extend_not_clear',
            title: 'Extend Scene (do not clear)',
            summary: 'Default technique — add to live scene from PromptGen context.',
            checklist: ['No World.clearWorld()', 'Uses existing State.objects', 'IIFE wrapped'],
            code: `(function() {
  const m = World.createObject('torus', 'portal', 0xaa00ff, false);
  m.position.set(0, 2, -3);
  m.userData.isRotating = true;
})();`
        },
        {
            id: 'cursor_spawn',
            title: 'Spawn at Cursor',
            summary: 'Place content where you right-clicked / double-tapped.',
            checklist: ['Reads World.getCursorPos()', 'Run while paused for precision'],
            code: `(function() {
  const p = World.getCursorPos();
  const o = World.createObject('cone', 'marker', 0xffaa00, true);
  o.position.set(p.x, p.y + 2, p.z);
})();`
        },
        {
            id: 'physics_prop',
            title: 'Physics Prop — Collision Panel Ready',
            summary: 'Dynamic object; edit mass/friction in EDIT → Collision panel.',
            checklist: ['usePhysics: true', 'Hyper mode (4) recommended', 'userData.hasPhysics set automatically'],
            code: `(function() {
  const box = World.createObject('cube', 'crate', 0x8b4513, true);
  box.position.set(0, 6, 0);
  box.userData.soundFreq = 220;
  box.userData.soundType = 'square';
})();`
        },
        {
            id: 'material_audio',
            title: 'Texture + Audio Metadata',
            summary: 'Sets material + userData for inspector Audio panel (test tone on select).',
            checklist: ['MeshStandardMaterial', 'userData.soundFreq', 'Editable in EDIT mode'],
            code: `(function() {
  const s = World.createObject('sphere', 'beacon', 0x00ffcc, false);
  s.position.set(2, 1.5, 0);
  s.material.metalness = 0.8;
  s.material.roughness = 0.2;
  s.material.emissive.setHex(0x003322);
  s.material.emissiveIntensity = 0.5;
  s.userData.soundFreq = 440;
  s.userData.soundType = 'sine';
})();`
        },
        {
            id: 'readiness_template',
            title: 'Code Readiness Template',
            summary: 'Copy this skeleton before RUN IN ENGINE. Check sidebar checklist.',
            checklist: ['IIFE wrapper', 'try/catch inside', 'Uses World API', 'PLAY-safe or EDIT-only noted'],
            code: `(function() {
  try {
    // EDIT mode only — world changes while paused
    // PLAY safe — player skin only (see Player Skin reference)
    const EDIT_ONLY = State.isPaused;
    if (!EDIT_ONLY) { UI.status('Pause (EDIT) to modify world'); return; }

    // your logic here
    World.createObject('sphere', 'ready_check', 0x00ffaa, false);
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`
        }
    ]
};

export function getReferenceItem(section, id) {
    return REFERENCE_LIBRARY[section]?.find((item) => item.id === id) || null;
}

export function checkCodeReadiness(code) {
    const c = code || '';
    return [
        { id: 'length', label: 'Has code', ok: c.trim().length > 8 },
        { id: 'iife', label: 'Scoped (IIFE / arrow)', ok: /\(function|=\s*\(|\=\>\s*\{/.test(c) },
        { id: 'api', label: 'Uses World / PlayerController API', ok: /World\.|PlayerController\.|State\.|Engine\./.test(c) },
        { id: 'no_raw_scene', label: 'Avoids raw scene.add', ok: !/scene\.add\s*\(/.test(c) },
        { id: 'try_catch', label: 'Error handling (try/catch)', ok: /try\s*\{/.test(c) },
        { id: 'play_safe', label: 'PLAY-safe OR EDIT guard', ok: /State\.isPaused|EDIT_ONLY|PlayerController\.|skin/i.test(c) || !/World\.createObject|World\.clearWorld/.test(c) }
    ];
}

export function getWorkflowPromptBlock() {
    const lines = ['WORKFLOWS (OOTB paths):'];
    REFERENCE_LIBRARY.workflows.forEach((item) => {
        lines.push(`- ${item.title}: ${item.summary}`);
    });
    lines.push('\nPERSISTENCE:');
    lines.push('- SAVE WORLD → IndexedDB + ?world=CODE (scene snapshot via Persistence)');
    lines.push('- SAVE PROJECT → Compiler vault (world + scripts together via ProjectVault)');
    lines.push('- EXPORT/IMPORT JSON for portable scene files');
    lines.push('- Player files: INSERT → SAVE MY PLAYER (share .json)');
    lines.push('\nCREATIVE ASSETS (v3.6+):');
    lines.push('- GIMP → textures/ + GIMP SYNC · Blender → import/ + INSERT GLTF');
    lines.push('- Dev: npm run textures:watch + npm run dev · docs/CREATIVE_WORKFLOW.md');
    lines.push('- Bundled: Threshold Child originals (lobby THRESHOLD CHILD) — docs/THRESHOLD_CHILD_ASSETS.md');
    lines.push('- PromptGen includes ASSET MANIFEST when live scene is checked');
    return lines.join('\n');
}

export function getReferencePromptBlock() {
    const lines = ['REFERENCE LIBRARY (Compiler tab):'];
    REFERENCE_SECTIONS.forEach((sec) => {
        lines.push(`\n${sec.toUpperCase()}:`);
        REFERENCE_LIBRARY[sec].forEach((item) => {
            lines.push(`- ${item.title}: ${item.summary}`);
        });
    });
    lines.push('\nEDIT vs PLAY: Paused = EDIT (world/objects editable). Running = PLAY (map locked; player skin/code only).');
    lines.push('\n' + getWorkflowPromptBlock());
    return lines.join('\n');
}