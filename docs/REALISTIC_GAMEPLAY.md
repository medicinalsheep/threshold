# Realistic Gameplay — Default Starter Guide

Threshold ships a **walk/drive action control** template in the SOLO lobby. Use it as the baseline for shooters, RPGs, and vehicle scenes.

**Current default version:** v6.1.0 realism defaults (Phase 7)

---

## Action controls (TPS / FPS)

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Move | WASD | L-stick |
| Sprint | Shift (hold) | L3 (hold) |
| Jump | Space | A |
| Interact | E | X / Square |
| Fire | G | RT |
| Toggle FPS / TPS | V | D-pad Down |
| Third Eye | T | D-pad Up |
| Toggle fly (editor) | F | Y |

- **TPS** is the default after intro spawn.
- **FPS** hides the head mesh and shows a crosshair; aim and fire use the active camera.
- **Third Eye** shows a green circle HUD and highlights interactables / NPCs within ~18m.

---

## Movement recipe

Default player tuning (`src/engine/player.js`):

- Walk **3.2 m/s**, sprint **6.0 m/s** (1.875×)
- Camera-relative accel/decel (not velocity snap)
- Capsule collider + ground raycast for jump
- OrbitControls **disabled** in walk mode — mouse / R-stick look

To tune for your game, adjust `WALK_SPEED`, `SPRINT_MULT`, `ACCEL`, `DECEL` in `player.js`.

---

## NPC recipe

1. Build with `HumanMesh.build({ bodyColor, pantsColor, skinColor })`
2. Set `userData`: `isCharacter: true`, `thirdEyeTarget: true`, `interactAction`, `interactRadius`
3. Optional patrol: `NpcPatrol.register(npc, waypoints, speed)`
4. Wire sounds: `userData.soundClipId` + `soundTrigger` via `wireStarterSounds()` pattern

Starter roster: **Alex** (guide), **Jordan** (range), **Sam** (mechanic).

---

## Texture recipe

```bash
npm run tex:gen        # procedural PBR PNG (512px r7)
npm run tex:compress   # PNG → WebP sidecars (ffmpeg)
npm run bundle:assets  # copy to dist-pages/bundle/
```

- Manifest: `textures/threshold_manifest.json` — `objectName` must match `userData.name` on scene objects.
- Runtime prefers **WebP** when a `.webp` sibling exists; PNG is the fallback.
- Override in GIMP: export slots (albedo / roughness / metalness / normal) and SYNC via TextureBridge.

---

## Audio recipe

```bash
npm run sounds:gen       # procedural starter clips
npm run sounds:compress  # drop WAV in sounds/import/
```

Wire on objects: `soundClipId`, `soundMode: 'clip'`, `soundTrigger: collision|interact|ambient`.

---

## Physics checklist

- Static colliders for floors/platforms (`Physics.addStaticBox`)
- Player material: higher friction, low restitution
- Props: realistic mass (crate ~8 kg, glass ~0.5 kg)
- Default contact: friction **0.48**, restitution **0.12**

---

## Default asset budget (target)

| Type | Count | Budget |
|------|-------|--------|
| Textures (WebP preferred) | ~30 base maps | < 4 MB WebP in bundle |
| Sounds (OGG) | 11 starter | < 200 KB |
| GLB (optional) | 0–3 hero | < 1.5 MB each |

```bash
npm run assets:pack    # tex + sounds + webp + build + bundle
npm run assets:verify  # smoke test
```

---

## Export / playtest loop

1. `npm run preview` — lobby smoke test
2. Spawn → sprint → **V** FPS → **T** Third Eye → **E** terminal → **G** shoot glass
3. PAUSE → edit collisions / textures / audio
4. Export via wizard when ready

---

## Scene objects in default lobby

| Object | Purpose |
|--------|---------|
| Welcome Platform | Spawn + physics collider |
| Starter Ground / Wall | PBR dressing |
| Parking stripes + barrier | Lane dressing |
| Glass pane + target | Gun range |
| AI Build Station / Model Kiosk | Interact terminals |
| Alex / Jordan / Sam | NPC examples |

Build your game by replacing props, keeping the control + physics + asset pipeline.

---

## Phase 7 additions (v6.1)

| Feature | Command / file |
|---------|----------------|
| Avatar GLBs | `npm run avatar:gen` → `import/starter_avatar.glb` |
| Footsteps | Auto while walking; concrete vs metal surfaces |
| FPS arms | Visible in FPS mode (`V`); body hidden, viewmodel on camera |
| Remote players | Full avatar mesh in multiplayer (not capsule) |
| Normal maps | `starter_ground` / `starter_wall` in `tex:gen` |
| Full HILOD WebP | `npm run tex:compress` (all `_512`/`_1k`/`_2k` tiers) |