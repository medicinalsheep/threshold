# Threshold Child assets — policy & gameplay outline

**Threshold Child** editions are **original, in-repo content** — procedurally or GIMP/Blender–authored for Threshold. They teach export, credits, and store workflows without shipping someone else's art.

---

## Core rule

| Shipped in Threshold | User's own game |
|----------------------|-----------------|
| **Threshold Child** only — altered, unique, ours | **Any legal source** the user licenses and credits |
| No raw drops from other games, mods, or unmodified packs | Fallout mods, BF assets, FiveM packs, etc. are **user responsibility** |
| No suggestion to rip or redistribute copyrighted work | Export walkthrough **CREDITS** step documents **their** rights |

### Child enough = honest realism review

A Child asset passes when it survives a **realism and compatibility review** — not when it merely looks different on paper.

| Review lane | What we check |
|-------------|---------------|
| **Silhouette** | Readable proportions at gameplay distance; distinct from source inspiration |
| **Materials** | PBR tuned for Hyper; emissive accents survive Threshold / Terminal / 1-Bit |
| **Physics** | `addBodyFromObject` bbox; mass/friction/restitution match role (vehicle vs static span) |
| **Audio** | Collision `soundFreq` / trigger wired for sandbox testing |
| **Export** | `isTC`, `tcEd`, license, `storeSku`, `registryUri` pre-filled in CREDITS + PACKS |
| **PromptGen** | Scene context lists Child tags so AI extends without clearing the scene |

**Child version** means at least one of:

- Original mesh/texture/audio authored in Threshold tools
- Procedural in-engine asset with documented realism pass (Child Lite v1.1+)
- GIMP/Blender derivative with **documented transformation** (rescale, palette, kit-bash, new LODs, new collision) — not a byte-for-byte copy marketed as ours

Developers may use `reference/_dev-seeds/` locally to **compare** workflows; those files are **gitignored** and **never** default lobby content.

---

## Editions (registry)

| Edition | Status | Contents |
|---------|--------|----------|
| `threshold` | Active | Core starter scene only |
| `tc-show` | **Active (default lobby)** | Full export demo — vehicles, NPCs, SFX, checkpoint |
| `tc-veh` | **Active** | Runner, Hauler — GLB + LOD @ 12m/28m; TC Span companion |
| `tc-chr` | **Active** | Marshal + Mechanic HumanMesh NPCs (GLB+LOD) |
| `tc-sfx` | **Active** | 5 synthesized original SFX seeds |
| `tc-lite` | **Active (fallback)** | Procedural Runner, Hauler, TC Span v1.1 |

Legacy ids `threshold-child-*` → `tc-*` (v5.8). Lobby button: **TC →**

Config: `config/reference-editions.json`

---

## Gameplay & development potential (outline)

Use Child assets as **design seeds** — same objects can anchor many game types:

### Vehicles (`TC Runner`, `TC Hauler`)

| Gameplay idea | Dev hook |
|---------------|----------|
| Physics sandbox / crash test | `hasPhysics`, mass, friction in inspector |
| Time trial / circuit | TC Span + Compiler timer + `tc_cp` checkpoint (see WORKFLOWS → TC Circuit) |
| Multiplayer race | Host sync + guest spectate; future: lap `Actions` |
| Delivery / fetch quest | NPC agent + trigger volume on Hauler |
| Store SKU demo | PACKS step: `game.vehicle.runner` SKU |

### Scene props (`TC Span`)

| Gameplay idea | Dev hook |
|---------------|----------|
| Platformer lanes | Align spans, EDIT snap |
| Cinematic establishing shot | `World.playCutscene` + camera path |
| HILOD / LOD teaching | Duplicate in Blender as Child GLB with LOD1/2 |

### Characters (R3 Child)

| Gameplay idea | Dev hook |
|---------------|----------|
| NPC patrol | `HumanMesh` + local Script agent |
| Avatar skin swap | Player insert + GLTF URL |
| Dialogue | Grok NPC + persona |

### Audio (R3 Child)

| Gameplay idea | Dev hook |
|---------------|----------|
| Surface footsteps | `userData.soundClipId` per material zone |
| Vehicle engine loop | Ambient sound on vehicle root |
| UI confirm | SFX tab record → PromptGen ASSETS block |

### Textures (R6 TC)

| Gameplay idea | Dev hook |
|---------------|----------|
| Zone theming | `npm run tc:gen:tex` or GIMP **Build TC Textures (R6)** |
| Graphics tier demo | HILOD `_512`/`_1k`/`_2k` — `TextureHilod` distance + tier pick |
| Store asset pack | EXPORT **CREDITS** lists `tc_tex_*` · PACKS texture SKU |
| Auto apply | Lobby **TC →** → `wireTcTextures()` on spawn |

### Export & store (all editions)

| Step | Child asset appears as |
|------|------------------------|
| SCENE | Live object + kind `vehicle` / `scene` |
| CREDITS | `Original — TC` |
| PACKS | Example SKU / `threshold://` registry URI |
| `store:prep` | `credits.md` lists Threshold as rights holder |

---

## R6 — TC GIMP textures + HILOD (v5.10)

| Step | Command / path |
|------|----------------|
| Generate maps | `npm run tc:gen:tex` (Node) or GIMP **Build TC Textures (R6)** |
| Config | `config/tc-textures.json` |
| Manifest | `textures/threshold_manifest.json` (`tcRealism: r6`) |
| HILOD files | `textures/tc_run_albedo_512.png`, `_1k`, `_2k`, etc. |
| Runtime | `src/shared/tcTex.js` — bundled apply + `TextureHilod` |
| Verify | `npm run tc:verify` — texture + manifest smoke |

## R5 — Blender TC mesh realism (v5.9)

| Step | Command / path |
|------|----------------|
| Shared mesh lib | `plugins/threshold-blender/tc_mesh_lib.py` |
| Build veh blend | `build_tc_veh.py` → `tc_veh.blend` (wheels, nose, spoiler, LOD) |
| Build chr blend | `build_tc_chr.py` → `tc_chr.blend` (Marshal cap, Mechanic badge) |
| Headless export | `--slug tc_run --tc-ed tc-veh --realism r5` |
| Manifest tag | `realism: r5` on each model |

## R2 — Blender TC GLB + LOD (vehicles)

| Step | Command / path |
|------|----------------|
| Build GLBs | `npm run tc:build` (Blender R5 if installed, else Node R5 generator) |
| Blender refine | `plugins/threshold-blender/build_tc_veh.py` → `tc_veh.blend` |
| Export + LOD | `npm run blender:export -- --blend plugins/threshold-blender/tc_veh.blend --object "TC Runner" --slug tc_run --lod --mass 3.4 --realism r5` |
| Manifest | `import/threshold_blender_manifest.json` |
| Web bundle | `public/bundle/import/tc_*.glb` (dev) · `npm run bundle:assets` (ship) |
| Loader | `src/shared/tcVeh.js` — `MeshLod` @ `[0, 12, 28]` |
| Verify | `npm run tc:verify` |

Lobby **TC →** loads the **Showcase** (vehicles + NPCs + SFX); falls back to vehicles-only or TC Lite procedural.

---

## R3 — Characters, audio, showcase

| Module | Loader | Contents |
|--------|--------|----------|
| Characters | `tcChr.js` | Marshal (circuit), Mechanic (garage) — GLB+LOD |
| Audio | `tcSfx.js` | 5 synthesized clips → SoundLibrary |
| Showcase | `tcShow.js` | Orchestrates R2+R3 + checkpoint beacon |
| PromptGen | `tcPrompt.js` | `// ASSETS:` block in scene context |

Audio clips wire automatically: `tc_sfx_imp` → vehicles, `tc_sfx_ft` → NPCs, etc.

---

## Workflow: authoring a new Child asset

1. **Design** — sketch gameplay role (vehicle, prop, character, sound)
2. **Author** — Engine procedural **or** Blender/GIMP with **new silhouette/material** + realism review
3. **Name** — `TC <Role>` (e.g. `TC Runner`); export paths `tc_<role>`
4. **Register** — `config/reference-editions.json` + manifest under `reference/editions/<edition>/`
5. **Credit** — `reference/ATTRIBUTION.md` — license: `Original — TC`
6. **Test** — Lobby TC → → EXPORT walkthrough · `npm run tc:verify`
7. **Never** commit unmodified third-party files to `reference/editions/` (dev seeds only)

---

## What users do with external assets

When **users** build **their** games:

- They may import legally obtained GLTF, textures, audio
- They must complete EXPORT **CREDITS** and **PACKS** with real licenses
- Threshold docs show **workflows** inspired by mod communities (folder layout, vehicle lists) — **not** asset sources

We do not document or encourage ripping commercial game files.

---

## Related

- [REFERENCE_EDITIONS.md](REFERENCE_EDITIONS.md)
- [GETTING_STARTED.md](GETTING_STARTED.md)
- [reference/ATTRIBUTION.md](../reference/ATTRIBUTION.md)
- [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md)