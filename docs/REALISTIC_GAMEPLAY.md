# Realistic Gameplay — Default Starter Guide

Threshold ships a **walk/drive action control** template in the SOLO lobby. Use it as the baseline for shooters, RPGs, and vehicle scenes.

**Current default version:** v6.4.1 realism defaults (Phase 10)

---

## Action controls (TPS / FPS)

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Move | WASD | L-stick |
| Sprint | Shift (hold) | L3 (hold) |
| Jump | Space | A |
| Interact | E | X / Square |
| Fire | G | RT |
| Aim (ADS) | R (hold) | LT (hold) |
| Toggle FPS / TPS | V | D-pad Down |
| Third Eye | T | D-pad Up |
| Toggle fly (editor) | F | Y |

- **TPS** is the default after intro spawn.
- **Mouse look** — in PLAY mode, **click the canvas** to capture the cursor (pointer lock); move mouse to orbit/aim like standard FPS/TPS. **Esc** releases. In EDIT (paused), orbit controls work around your character.
- **FPS** hides the body mesh and shows arms viewmodel + crosshair; **ADS** (`R` / LT) zooms FOV and tightens aim.
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
npm run tex:gen        # procedural PBR PNG (512px r8) + HILOD tiers
npm run tex:compress   # PNG → WebP sidecars (ffmpeg)
npm run tex:ktx2       # PNG → KTX2 (optional; toktx/basisu on PATH)
npm run basis:copy     # Basis transcoder for KTX2Loader
npm run bundle:assets  # copy to dist-pages/bundle/
```

Full capability map: [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md)

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
| Starter Ground / Wall | PBR dressing (UV-tiled) |
| Surface pads | grass / wood / gravel / asphalt footstep demo |
| Bench + fabric banner | wood + fabric presets |
| Parking stripes + barrier | Lane dressing |
| Glass pane + target | Gun range |
| AI Build Station / Model Kiosk | Interact terminals |
| Alex / Jordan / Sam | NPC examples (GLB + procedural fallback) |

Build your game by replacing props, keeping the control + physics + asset pipeline.

**First clone?** Run `npm run quickstart -- --pack` then `assets:verify` before `preview`.

---

## Phase 10 additions (v6.4)

| Feature | Notes |
|---------|-------|
| GIMP live SYNC | `textures:watch` + `dev` — export → instant reload |
| Starter kit | `npm run kit:export` — ~1.4 MB WebP fork pack |
| Doc index | `docs/README.md` — full scope map |
| Quickstart | `npm run quickstart` — onboarding + optional `--pack` |

## Phase 9 additions (v6.3)

| Feature | Notes |
|---------|-------|
| GIMP R8 parity | All surface styles + HILOD — `docs/GIMP_TEXTURES.md` |
| Blender avatar CLI | `npm run blender:avatar` |
| Starter UV tiling | `config/starter-textures.json` — immersive defaults, lightweight files |
| Fabric banner | Starter scene decor with fabric preset |

## Phase 8 additions (v6.2)

| Feature | Notes |
|---------|-------|
| Texture styles | grass, wood, gravel, asphalt, fabric, metal_grate |
| HILOD `_4k` | Ultra tier up to 1024px variants |
| KTX2 | Native/web when transcoder bundled |
| ADS | Hold R / LT in FPS |
| Footsteps | 6 surfaces; demo pads in starter scene |
| Blender avatars | [BLENDER_AVATARS.md](BLENDER_AVATARS.md) |

## Phase 7 additions (v6.1)

| Feature | Command / file |
|---------|----------------|
| Avatar GLBs | `npm run avatar:gen` → `import/starter_avatar.glb` |
| Footsteps | Auto while walking; concrete vs metal surfaces |
| FPS arms | Visible in FPS mode (`V`); body hidden, viewmodel on camera |
| Remote players | Full avatar mesh in multiplayer (not capsule) |
| Normal maps | `starter_ground` / `starter_wall` in `tex:gen` |
| Full HILOD WebP | `npm run tex:compress` (all `_512`/`_1k`/`_2k` tiers) |