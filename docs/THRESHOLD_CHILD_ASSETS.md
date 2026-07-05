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
| **Export** | `isThresholdChild`, license, `storeSku`, `registryUri` pre-filled in CREDITS + PACKS |
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
| `threshold-child-showcase` | **Active (default lobby)** | Full export demo — vehicles, NPCs, SFX, checkpoint |
| `threshold-child-vehicles` | **Active** | Runner, Hauler — GLB + LOD @ 12m/28m; Circuit Span companion |
| `threshold-child-characters` | **Active** | Marshal + Mechanic HumanMesh NPCs |
| `threshold-child-audio` | **Active** | 5 synthesized original SFX seeds |
| `threshold-child-lite` | **Active (fallback)** | Procedural Runner, Hauler, Circuit Span v1.1 |

Config: `config/reference-editions.json`

---

## Gameplay & development potential (outline)

Use Child assets as **design seeds** — same objects can anchor many game types:

### Vehicles (`Threshold Runner`, `Threshold Hauler`)

| Gameplay idea | Dev hook |
|---------------|----------|
| Physics sandbox / crash test | `hasPhysics`, mass, friction in inspector |
| Time trial / circuit | Circuit Span + Compiler timer + `World` checkpoints |
| Multiplayer race | Host sync + guest spectate; future: lap `Actions` |
| Delivery / fetch quest | NPC agent + trigger volume on Hauler |
| Store SKU demo | PACKS step: `game.vehicle.runner` SKU |

### Scene props (`Circuit Span`)

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

### Textures (planned Child)

| Gameplay idea | Dev hook |
|---------------|----------|
| Zone theming | GIMP Child export → `textures/threshold_child_*` |
| Graphics tier demo | HILOD `_512`/`_1k`/`_2k` variants |
| Store asset pack | `assetRegistry` texture kind + PACKS SKU |

### Export & store (all editions)

| Step | Child asset appears as |
|------|------------------------|
| SCENE | Live object + kind `vehicle` / `scene` |
| CREDITS | `Original — Threshold Child edition` |
| PACKS | Example SKU / `threshold://` registry URI |
| `store:prep` | `credits.md` lists Threshold as rights holder |

---

## R2 — Blender Child GLB + LOD (vehicles)

| Step | Command / path |
|------|----------------|
| Build GLBs | `npm run child:vehicles:build` (Blender if installed, else Node generator) |
| Blender refine | `plugins/threshold-blender/build_child_vehicles.py` → `child_vehicles.blend` |
| Export + LOD | `npm run blender:export -- --blend plugins/threshold-blender/child_vehicles.blend --object "Threshold Runner" --lod --mass 3.4` |
| Manifest | `import/threshold_blender_manifest.json` |
| Web bundle | `public/bundle/import/*.glb` (dev) · `npm run bundle:assets` (ship) |
| Loader | `src/shared/thresholdChildVehicles.js` — `MeshLod` @ `[0, 12, 28]` |

Lobby **THRESHOLD CHILD** loads the **Showcase** (vehicles + NPCs + SFX); falls back to vehicles-only or Child Lite procedural.

---

## R3 — Characters, audio, showcase

| Module | Loader | Contents |
|--------|--------|----------|
| Characters | `thresholdChildCharacters.js` | Marshal (circuit), Mechanic (garage) |
| Audio | `thresholdChildAudio.js` | 5 synthesized WAV clips → SoundLibrary |
| Showcase | `thresholdChildShowcase.js` | Orchestrates R2+R3 + checkpoint beacon |
| PromptGen | `childAssetsPrompt.js` | `// ASSETS:` block in scene context |

Audio clips wire automatically: `child_sfx_vehicle_impact` → vehicles, `child_sfx_footstep` → NPCs, etc.

---

## Workflow: authoring a new Child asset

1. **Design** — sketch gameplay role (vehicle, prop, character, sound)
2. **Author** — Engine procedural **or** Blender/GIMP with **new silhouette/material** + realism review
3. **Name** — `Threshold <Role>` (e.g. `Threshold Runner`); export paths `threshold_child_<role>`
4. **Register** — `config/reference-editions.json` + manifest under `reference/editions/<edition>/`
5. **Credit** — `reference/ATTRIBUTION.md` — license: `Original — Threshold Child edition`
6. **Test** — Lobby Child load → EXPORT walkthrough
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