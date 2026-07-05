# Changelog

## 5.8.0 — TC abbreviation + chr GLB+LOD

- Renamed editions/ids: `tc-show`, `tc-veh`, `tc-chr`, `tc-sfx`, `tc-lite`
- Modules: `tcMeta`, `tcVeh`, `tcChr`, `tcSfx`, `tcShow`, `tcLite`, `tcPrompt`
- GLB files: `tc_run.glb`, `tc_msh.glb`, etc. · `npm run tc:build`
- userData: `isTC`, `tcEd`, `tcVer` (legacy `isThresholdChild` still read)
- Lobby button: **TC →** · Blender: `build_tc_veh.py`

## 5.7.0 — Phase R3: Characters, audio, showcase

- `threshold-child-showcase` — full EXPORT demo (vehicles + NPCs + SFX + checkpoint)
- Marshal + Mechanic HumanMesh NPCs; 5 synthesized Child SFX seeds
- PromptGen `// ASSETS:` block via `childAssetsPrompt.js`
- Lobby THRESHOLD CHILD loads showcase by default

## 5.6.0 — Phase R2: Child vehicles GLB + LOD

- `threshold-child-vehicles` edition — Runner/Hauler GLB + LOD1/LOD2, procedural Circuit Span
- `npm run child:vehicles:build` / `child:vehicles:generate` · Blender `build_child_vehicles.py`
- Lobby THRESHOLD CHILD loads GLB via `thresholdChildVehicles.js`; Lite procedural fallback
- Shipped originals in `import/threshold_child_*.glb` + `public/bundle/import/`

## 5.5.1 — Child Lite realism pass + export compatibility

- Child Lite v1.1 — Runner/Hauler/Circuit Span geometry + PBR + physics bbox improvements
- CREDITS/PACKS pre-fill from `getChildCreditEntries()` and live `isThresholdChild` scene objects
- Scene/PromptGen context tags Child assets; `vehicle` + `scene` store pack kinds
- Policy: **Child enough** = honest realism review (docs/THRESHOLD_CHILD_ASSETS.md)

## 5.5.0 — Tier 2 docs + Threshold Child policy

- **Threshold Child** editions — original procedural vehicles (Runner, Hauler, Circuit Span); lobby **THRESHOLD CHILD**
- Policy: no unmodified external assets in shipped Child editions; external seeds dev-only (`reference/_dev-seeds/`)
- [GETTING_STARTED.md](GETTING_STARTED.md), [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md), [CHANGELOG.md](CHANGELOG.md)
- Deprecated raw CC0 Kenney drop as default reference path

## 5.4.0 — Tier 1 truth pass + R1 scaffold

- Doc alignment: 9-step export, iOS scaffold, AGENTS.md v5.4
- Reference edition framework (`reference:fetch`, `reference:sync`) — superseded by Child policy in 5.5

## 5.3.0 — Phase M (Steam)

- Steamworks shim, `package:steam`, `steam:depot`, achievements hooks
- [STEAM_RELEASE.md](STEAM_RELEASE.md)

## 5.2.0 — Phase M+ (store asset maps)

- PACKS wizard step, `store:assets`, Play/Steam/itch/registry JSON

## 5.1.0 — Phase L2 (export walkthrough)

- 9-step export wizard, credits, asset registry

## 5.0.0 — Phase L (store prep)

- `store:prep`, release packaging, signing guides

## 4.9.0 — Phase K (cinematic)

- `World.playCutscene`, `video/` folder

## 4.8.0 — Phase N (LOD+HILOD unify)

## 4.7.0 — Phase I (HILOD textures)

## 4.6.0 — Phase H (mesh LOD)

## 4.1.0 — Phase G (graphics tiers)

## 4.0.0 — Phase F (iOS scaffold)

## 3.8.0 — Phase E (creative pipeline)

- GIMP/Blender, `bundle:assets`, sound embed