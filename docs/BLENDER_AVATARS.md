# Blender Avatars — Export Guide

Use this when replacing procedural starter avatars with Blender-rigged characters.

---

## Quick export

1. Model humanoid ~1.7–1.9 m tall (any scale — engine normalizes to **1.75 m**)
2. Armature + skin OR named limb groups (`legL`, `legR`, `armL`, `armR`)
3. Bake a **walk** animation (0.8–1.2 s loop)
4. Export **glTF Binary (.glb)**:
   - +Y Up
   - Apply transforms
   - Include animations
5. Save to `import/your_avatar.glb`
6. `npm run bundle:assets`
7. Map role in `src/shared/avatarLoader.js` or `config/avatar-manifest.json`

---

## Animation contract

| Priority | Method |
|----------|--------|
| 1 | Clips named **`idle`**, **`walk`** / `locomotion`, **`run`** / `sprint` |
| 2 | First clip used as walk if no named walk |
| 3 | Procedural limb walk on named nodes (no clip) |

Runtime picks **idle** when stopped, **walk** when moving, **run** when sprinting (or speed &gt; ~5.2 m/s).

**GLTF export:** use **quaternion** rotation tracks (not Euler `rotation[x]`).

### Starter pack (`npm run avatar:gen`)

Generated bodies ship `idle` + `walk` + `run` on named limbs (`legL`/`legR`/`armL`/`armR`).  
These are improved procedural mannequins (not skinned Blender heroes) — replace with rigged GLBs when ready.

---

## Skinned mesh

- Export with armature rest pose at T-pose or A-pose
- `HumanMesh.loadGltf` auto-detects first `SkinnedMesh` and binds `AnimationMixer` to it
- Walk `timeScale` scales with move speed and sprint

---

## FPS visibility

- First person hides the full GLB body (viewmodel arms shown instead)
- Optional: name head mesh `head` for per-part hiding later

---

## Headless avatar export (rigged + animations)

```bash
npm run blender:avatar -- --blend characters.blend --object Armature --file my_avatar.glb
```

Uses `plugins/threshold-blender/export_avatar.py` — exports GLB with skins + all actions.

## Props / LOD export

```bash
npm run blender:export -- --blend scene.blend --object "Stone Block" --output import --lod
```

---

## NPC roles

| Role ID | Default GLB | Notes |
|---------|-------------|--------|
| `player` | `starter_avatar.glb` | + LOD1/2 · idle/walk/run |
| `guide_npc` | `starter_avatar.glb` | same body |
| `guard_npc` | `starter_npc_guard.glb` | bulkier `StarterGuard` form |
| `mechanic_npc` | `starter_npc_mech.glb` | stockier `StarterMech` form |

Spawn: `spawnHumanWithAvatar({ id: 'guard_npc', glb: 'my_guard.glb' })`

---

## Verify walk (offline + in-engine)

```bash
npm run walk:verify          # GLB clips + mixer binds legL
npm run walk:smoke           # Puppeteer TPS ENTER solo → idle/walk/run motion
npm run walk:smoke:build     # rebuild dist-pages first
```

`walk:smoke` writes `dist-store/tps-walk-smoke.json` (W1–W7).