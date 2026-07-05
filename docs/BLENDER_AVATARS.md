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
| 1 | Clip named `walk`, `Walk`, or `locomotion` |
| 2 | First clip in `gltf.animations` |
| 3 | Procedural walk on named nodes (no clip) |

**GLTF export:** use **quaternion** rotation tracks (not Euler `rotation[x]`).

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

## Headless batch export

```bash
npm run blender:export -- --blend characters.blend --object "PlayerRig" --output import
```

---

## NPC roles

| Role ID | Default GLB |
|---------|-------------|
| `player` | `starter_avatar.glb` |
| `guide_npc` | `starter_avatar.glb` |
| `guard_npc` | `starter_npc_guard.glb` |
| `mechanic_npc` | `starter_npc_mech.glb` |

Spawn: `spawnHumanWithAvatar({ id: 'guard_npc', glb: 'my_guard.glb' })`