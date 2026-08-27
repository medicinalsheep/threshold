# Hero avatar pipeline (10.22)

**Date:** 2026-08-17 · **Product:** 10.21.5  
**Status:** H0–H3 shipped in 10.22.0 — H4 skinned drop-in when a .blend exists  
**Related:** [BLENDER_AVATARS.md](BLENDER_AVATARS.md) · [R8_2_CHARACTER_KIT.md](R8_2_CHARACTER_KIT.md) · [GIMP_TEXTURES.md](GIMP_TEXTURES.md) · `config/avatar-manifest.json`

North star: **readable human bodies that take real PBR maps**, still composed from the existing slots (body · hair · skin · cloth · props). Minis stay coaches. Grok stays large-layout. Art is files.

---

## Reality (why this is the work)

| What ships | Truth |
|------------|--------|
| `starter_avatar*.glb` | ~3.5k tris, **~23 cylinder/sphere/box parts**, **no skeleton** |
| Skin / fabric maps | 1k–2k PBR, 9 tones — **stretched onto primitives** |
| Shape sliders | Soft-scale named parts (`hips`, `torso`, `armL`…) |
| Wardrobe | Attach to named slots, not a clothed sculpt |
| Walk | Mixer on `legL`/`armL` clips `idle`/`walk`/`run` |
| Blender path | Documented; **not on this machine** — cannot block the ship |

The embarrassment is **AAA-ish maps on stick figures**. More tones or more wardrobe on this mesh makes it worse.

Honest ceiling: a procedural generator will never match a sculpted Blender hero. This plan gets us from mannequin → **readable humanoid with laid-out UVs**. A later drop-in skinned GLB is the true hero.

---

## Do not break (contracts)

Keep these or `avatar:audit` / SKIN / wardrobe / walk die:

| Contract | Value |
|----------|--------|
| Height | Engine normalizes to **1.75 m** |
| Named parts | `legL` `legR` `armL` `armR` `torso` `hips` `head` `neck` `hair_anchor` |
| Clips | `idle` · `walk` · `run` (quaternion tracks) |
| Materials / mesh names | `avatarTex` regions: skin (`head`/`neck`/`arm`), shirt (`torso`/`shoulder`), pants (`hip`/`leg`), hair |
| Shape | `HumanMesh.applyShape` soft-scale or morphs |
| Attach | `hair_anchor`, `hand_L`/`hand_R`, torso/head prop points |
| LOD | male/female lod1/lod2 still exist |
| Manifest | `avatar-manifest.json` bodies + roles |
| Fallback | Missing GLB → procedural `HumanMesh.build()` |

---

## Two layers (both planned)

```text
Layer A — Procedural hero (this machine, no Blender)
  avatar:gen v2 → lathe/capsule anatomy + UV atlas + idle/walk/run
  GIMP templates painted to those UVs

Layer B — Drop-in skinned GLB (when a .blend exists)
  blender:avatar → same names/clips → swap manifest body
  Same GIMP maps if UVs follow the atlas; else author new islands
```

Ship **A** now. Keep **B** as the escape hatch. Do not wait on Blender.

---

## UV atlas (the GIMP contract)

One 2K body atlas, islands labeled. This is what “meshes laid out” means.

```
+---------------------------+------------------+
| HEAD (front / side / back)|  ARMS (U / L)    |
| neck                      |                  |
+---------------------------+------------------+
| TORSO / SHIRT             |  HANDS           |
| chest · waist · back      |                  |
+---------------------------+------------------+
| HIPS / PANTS              |  LEGS (U / L)    |
|                           |  FEET / SHOES    |
+---------------------------+------------------+
```

Rules:

- **No overlapping islands** on the hero LOD0.
- Skin maps (`starter_skin_*`) only sample **head / neck / arms / hands**.
- Fabric (`starter_fabric_*`) samples **torso / hips / legs** (or a second garment atlas later).
- Repeat (`uvRepeat > 1`) is a **fallback for old primitives**, not the hero.
- GIMP: `textures/_templates/hero_uv_guide.png` (islands + labels) + `hero_body_albedo.png` master.

LOD1/2 may share the same atlas with fewer verts.

---

## Mesh quality floor (Layer A)

Replace `BoxGeometry` pelvis + stacked cylinders with **profiled parts**:

| Part | Construction | Why |
|------|----------------|-----|
| Hips / pelvis | Lathe or rounded box, not a brick | Kills the “crate pelvis” |
| Torso | Lathe waist→chest→shoulder, slight Z squash | One shirt volume, one UV island |
| Shoulders / deltoid | Sphere or lathe cap on arm root | Reads as a person from TPS |
| Neck | Short tapered cylinder | Shape slider already keys `neck` |
| Head | Sphere + jaw squash + ears/nose/eyes | Keep face at high SEG |
| Thigh / calf | Two tapered capsules under `legL`/`legR` | Walk still rotates the **group** |
| Upper / forearm | Two tapered capsules under `armL`/`armR` | Same mixer contract |
| Hands | Palm box + 3 finger slabs | Named `hand_L` / `hand_R` |
| Feet | Wedge + sole, not a shoe brick | Ground contact |

**LOD0 target:** ~8–14k tris (readable at 2 m).  
**LOD1:** ~4–6k. **LOD2:** ~1.5–2.5k.  
Still **no full skeleton required** for A (keep group pivots). Optional later: 1 root + 8 limb bones if we want SkinnedMesh parity.

Male / female stay **same topology, different `FORMS` scales** (already the pattern). Guard/mech stay form biases on the same generator.

---

## GIMP / map plan

| Map | Who | Notes |
|-----|-----|--------|
| `hero_uv_guide.png` | Generator dumps UV wire | Painters see islands |
| `starter_skin_*` | Retarget to head/neck/arm islands (keep 9 tones) | Stop wrapping a full-body photo on a cylinder |
| `starter_fabric_*` | Shirt + pants islands | Less tiling slop |
| Optional hero albedo | Imagine or hand-paint one **neutral** body | Then tint via existing tone slugs |

Do **not** invent 9 full hero resculpts. One good layout × existing tone ladder.

Pipeline: `avatar:gen` writes the UV guide → `textures:hilod` on masters → `AvatarTex` prefers 1k on hero (no `PRIMITIVE_*` soften once UVs are real).

---

## Tracks (execute in order)

### H0 — UV guide + region materials (unblocks maps)

- Name materials/meshes so `avatarTex` regions stay correct.
- Dump `textures/_templates/hero_uv_guide.png` from the generator.
- Stop applying 2K full-body wrap on primitives (`PRIMITIVE_*` only if `userData.heroUv !== true`).
- Extend `avatar:audit`: every body mesh has UVs; skin/shirt/pants names present.

**Done when:** a checker texture on the GLB shows distinct head / torso / limb islands. ✅ `hero_uv_guide.png`

### H1 — Procedural hero mesh (`avatar:gen` v2)

- Rebuild `gen-starter-avatar.cjs` with the part table above.
- Keep named limb **groups** so existing clips still drive `legL`.
- Regen male/female + LOD1/2 + guard/mech.
- `HumanMesh.applyShape` still finds `humanParts`.
- `npm run walk:verify` + `avatar:audit` + `walk:smoke` stay green.

**Done when:** TPS at 2 m reads as a person, not a crate stack. Tris in the 8–14k band. ✅ male 8276 · female 9068 · walk:verify + avatar:audit PASS

### H2 — Retarget GIMP maps to the atlas

- Paint or generate albedo/normal/roughness that **match H0 islands**.
- Bind via existing slugs (`starter_skin_medium`, `starter_fabric`).
- One Imagine pass is OK for a neutral hero albedo **if** it follows the UV guide (edit, don’t freehand).
- `textures:hilod` + kit:export:chr.

**Done when:** SKIN tone change updates face/arms without smearing across the shirt. ✅ `npm run avatar:atlas` · islands match `hero_uv_guide.png`

### H3 — Layout in product ✅

- Manifest still `male_default` / `female_default` — new files + honest labels.
- SKIN: “Starter hero (procedural)” · hint not a Blender rig · dropdown from manifest.
- Docs: BLENDER_AVATARS + CAPABILITIES one-liner.
- Skipped optional INSERT side-by-side preview (SKIN dropdown is the product path).

### H4 — Skinned drop-in (when a .blend exists)

- Same names + clips + ~1.75 m.
- Morphs optional (shape sliders prefer morphs if present — already coded).
- Do not start H4 until someone has Blender or a bought/rigged GLB.

### H5 — Gate

- `avatar:audit` adds: min tris LOD0 ≥ 6k, `heroUv`, UV attribute, no missing islands.
- Walk smoke unchanged.

---

## Out of scope

- New wardrobe topology (clothes stay attach meshes).
- Face blendshapes / speech.
- Foot IK.
- Mini retrain (wave 9 is enough; add pairs after H3 if coaches must name “hero UV”).
- Waiting on Trellis/Veo.

---

## Suggested first session

**H0 + H1 together** (one generator rewrite + UV dump + regen GLBs + audit).  
H2 maps next (otherwise we still stretch old skins).  
H3 is copy + manifest. H4 only if you have a rig.

---

## Success

| Check | Today | After H1+H2 |
|-------|--------|-------------|
| TPS silhouette | Cylinders + box pelvis | Shoulders, waist, thigh/calf |
| Skin maps | Stretched wrap | Face/arms on skin islands |
| Walk | idle/walk/run mixer | Same, no hop |
| Shape sliders | Soft-scale parts | Still works |
| `avatar:audit` | 37/37 clips/limbs | + UV / tris floor |
| Honest label | Mannequin | Procedural hero, not Blender |

---

## Key decisions

1. **Procedural first, Blender later** — this machine has no Blender; do not block.
2. **Keep group-pivot walk** — do not require a skeleton for H1.
3. **One UV atlas** — one GIMP template, not per-part wrap.
4. **Same topology male/female** — form scales only.
5. **Minis do not author this** — files + generator only.
