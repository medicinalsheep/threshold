# Default Assets Roadmap — Characters, Creatures, LOD & HILOD

**Current:** v7.3.0 · Starter uses procedural GLB avatars (3 NPC roles), 25+ PBR texture slugs, mesh LOD + texture HILOD pipelines, Tesla lab props scaffold.

**North star:** A complete **default content kit** — male/female humans, creatures, animals, hair, props — all manifest-driven, LOD0/1/2 + HILOD `_512`/`_1k`/`_2k`/`_4k`, WebP-shipped, guest-sync safe.

---

## Asset taxonomy

| Category | ID prefix | LOD | HILOD | Notes |
|----------|-----------|-----|-------|-------|
| **Human male** | `avatar_male_*` | GLB chain | skin/cloth maps | Default player + NPC variant |
| **Human female** | `avatar_female_*` | GLB chain | skin/cloth maps | Body proportions + walk clip |
| **Hair (male/female)** | `hair_*` | Attached mesh | alpha + normal | Swap slot on avatar; FPS hides cap |
| **Creature** | `creature_*` | GLB LOD | PBR or vertex color | Non-humanoid biped / fantasy |
| **Animal male** | `animal_m_*` | GLB LOD | fur/feather maps | Larger silhouette, patrol AI |
| **Animal female** | `animal_f_*` | GLB LOD | fur/feather maps | Scale / palette variant |
| **Prop / lab** | `prop_*` | Optional LOD1 | PBR slugs | Tesla lab, doors, coils |
| **Texture** | `starter_*` / `tesla_*` | — | 512–4k tiers | `tc-textures.json` + WebP |
| **Sound** | `starter_*` | — | OGG preferred | `gen-starter-sfx` or recorded |

Registry: `config/default-assets-registry.json`

---

## Phase R8 — Default character kit

### R8.1 — Registry + manifest scaffold (v7.3) ✅

| Deliverable | Notes |
|-------------|-------|
| `default-assets-registry.json` | Slots for all categories above |
| `avatar-manifest.json` v2 | `male_default`, `female_default`, hair slots |
| `gen-starter-avatar.cjs` | Male + female GLB outputs |
| Docs | This file + BLENDER_AVATARS hair section |

### R8.2 — Character kit: female + hair + composition (v7.8)

**Full outline:** [R8_2_CHARACTER_KIT.md](R8_2_CHARACTER_KIT.md) — manifest v2, `AppearanceProfile`, slot composition, user override path.

| Deliverable | Notes |
|-------------|-------|
| `avatar-manifest.json` v2 | `bodies`, `hair`, `textures`, `attachPoints` |
| `AppearanceProfile` | Serializable body + hair + colors + textures + props |
| `starter_avatar_female.glb` | Walk clip, 1.65 m normalize |
| `hair_short_m`, `hair_long_f`, `hair_bun_f` | Separate GLB per style · `HairSlot` attach |
| `AvatarComposer` | Manifest-driven assembly · fallback to procedural |
| Skin panel | Body + hair presets · texture variants · custom GLB |
| HILOD | `starter_skin`, `starter_fabric`, `hair_alpha` |
| Multiplayer | `appearance` in `LIVE_STATE` · remote compose |

### R8.3 — Creature + animals (v7.5–7.6)

| Deliverable | Notes |
|-------------|-------|
| `creature_stalker.glb` | Low-poly quadruped/biped, LOD1/2 |
| `animal_dog_m`, `animal_dog_f` | Tie to Phase 15 bowl / bark zone |
| `animal_cat_m`, `animal_cat_f` | Alley cat mesh upgrade from boxes |
| NpcPatrol | Optional creature waypoints |
| Sounds | Existing wildlife SFX reused |

### R8.4 — Blender parity (v7.7)

| Deliverable | Notes |
|-------------|-------|
| `build_starter_chr.py` | Male + female + hair export |
| LOD export | `{name}_LOD1` / `_LOD2` → `MeshLod` |
| GIMP hair alpha | `hair_*_alpha` in manifest |

---

## LOD contract (meshes)

From `config/lod-distances.json` — **0 / 12 / 28 m** switch.

| Tier | Tris budget (starter) | Use |
|------|----------------------|-----|
| LOD0 | ≤ 8k per character | Full detail, physics collider |
| LOD1 | ≤ 3k | Mid distance |
| LOD2 | ≤ 800 | Silhouette / crowds |

CLI: `npm run blender:export -- --lod` · Runtime: `MeshLod.update()`

---

## HILOD contract (textures)

From `config/tc-textures.json` — per slug:

| Suffix | Max dim | Ship tier |
|--------|---------|-----------|
| `_512` | 512 | Mobile / kit |
| `_1k` | 1024 | Balanced |
| `_2k` | 2048 | Realistic default |
| `_4k` | 4096 | Ultra desktop |

Runtime: `TextureHilod.update()` · Pack: `npm run tex:compress` (WebP) · Optional: `tex:ktx2`

---

## Pipeline (per asset)

```bash
# Textures
npm run tex:gen
npm run tex:compress

# Avatars / props
npm run avatar:gen          # Node procedural GLB
npm run blender:export -- --lod   # Blender GLB + LOD

# Sounds
npm run sounds:gen

# Ship
npm run assets:pack
npm run assets:verify
```

---

## Guest sync rule

Props use marker `userData.id` (e.g. `starter_tesla_coil`). Guests rebuild missing chunks in `sync.js` after `FULL_STATE` — same pattern as Phases 14–18.

---

## Version map (planned)

| Version | Focus |
|---------|--------|
| **7.3** | Tesla lab intro shell + registry scaffold |
| **7.8** | R8.2 character kit — female + hair + composition |
| **7.9** | R8.3 creature + dog GLB |
| **8.0** | R8.3 cat + animal female variants |
| **8.1** | R8.4 Blender LOD batch for bodies + hair |

See [PHASE_18_TESLA_LAB.md](PHASE_18_TESLA_LAB.md) for intro scene makeover.