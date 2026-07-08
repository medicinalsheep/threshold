/** Compact World API reference injected into large-tier scene prompts. */

export function getSceneApiPrompt() {
    return `
THRESHOLD WORLD API — use ONLY these globals (never raw scene.add, new THREE.Scene, or renderer setup):

World.createObject(type, name, colorHex, usePhysics)
  types: 'cube' | 'sphere' | 'cone' | 'torus'
  returns mesh — set .position, .scale, .rotation; mesh.userData.locked = true for static floors
World.addCustom(geometry, material, name, usePhysics)
World.getCursorPos() → { x, y, z }
World.spawnPlayablePlayer() / World.spawnCharacter()
World.clearWorld() — NEVER unless user explicitly asked

Engine.setRenderMode(4) — realistic PBR default (always call once)
Environment.setTimeOfDay(hours) — 0–24 float
Environment.setFog(density) — e.g. 0.015

State.isPaused — true = EDIT (world editable), false = PLAY (world locked)
UI.status('message') — feedback to user

userData hooks (set on meshes):
  surfaceType — 'concrete'|'asphalt'|'wood'|'metal'|'gravel'|'grass'|'glass' (footsteps + rain wetness)
  wetGlass — true on glass panes (rain transmission/roughness lerp)
  dustExposure — 0–1 dry wear when rain low (roughness + albedo mute)
  snowCap — 0–1 snow accumulation on exterior wood/metal/concrete
  weatherMarquee — true on emissive signs (rain dampens glow)
  zoneSheltered — true for interior volumes (rain stress reduction)
  materialPreset — preset id from MaterialPresets registry (export + re-apply)
  audioZone — 'interior_warm'|'exterior_open' for ambient audio routing
  locked — true for static floors; hasPhysics + mass/friction for dynamics
  interactHint, interactRadius — F-key interact label and range
  name — MUST match GIMP texture manifest object name for PBR sync

MaterialPresets.applyMaterialPreset(mesh, 'pbr_concrete_weathered') — tuned PBR, no CanvasTexture slop
Environment.setTimeOfDay(14) · Environment.setFog(0.012) — atmosphere before PLAY verify

WORKING TEMPLATE (copy structure exactly):
(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);
    const floor = World.createObject('cube', 'floor', 0x222233, false);
    floor.scale.set(20, 0.2, 20);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete'; // WeatherSystem rain wetness + Footsteps
    const prop = World.createObject('sphere', 'beacon', 0x00ffaa, false);
    prop.position.set(0, 2, -3);
    prop.material.metalness = 0.3;
    prop.material.roughness = 0.4;
    prop.userData.surfaceType = 'metal';
    prop.userData.hasPhysics = true;
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();
`.trim();
}