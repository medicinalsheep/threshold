/** Code reference library — Compiler sidebar + PromptGen context */

export const REFERENCE_SECTIONS = ['players', 'worlds', 'techniques'];

export const REFERENCE_LIBRARY = {
    players: [
        {
            id: 'walker_capsule',
            title: 'Walker — Capsule Physics',
            summary: 'Playable human with Cannon body, third-person camera. Baseline for all player types.',
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

export function getReferencePromptBlock() {
    const lines = ['REFERENCE LIBRARY (Compiler tab):'];
    REFERENCE_SECTIONS.forEach((sec) => {
        lines.push(`\n${sec.toUpperCase()}:`);
        REFERENCE_LIBRARY[sec].forEach((item) => {
            lines.push(`- ${item.title}: ${item.summary}`);
        });
    });
    lines.push('\nEDIT vs PLAY: Paused = EDIT (world/objects editable). Running = PLAY (map locked; player skin/code only).');
    return lines.join('\n');
}