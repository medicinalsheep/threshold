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

WORKING TEMPLATE (copy structure exactly):
(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);
    const floor = World.createObject('cube', 'floor', 0x222233, false);
    floor.scale.set(20, 0.2, 20);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    const prop = World.createObject('sphere', 'beacon', 0x00ffaa, false);
    prop.position.set(0, 2, -3);
    prop.material.metalness = 0.3;
    prop.material.roughness = 0.4;
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();
`.trim();
}