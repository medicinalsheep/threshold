# Changelog

## 5.15.0 — G2 drivable TC vehicles + live sync

- `tcDrive.js` — claim `tc_run` / `tc_haul`, WASD arcade drive, chase camera
- `LIVE_STATE` ~80ms sync — `playerAvatars` + `vehicleClaims` (no full world rebuild)
- `World.enterTcRace()` — circuit + default vehicle · extra `tc_run` spawn for 3+ players
- Guests see remote vehicles move; walk/fly still uses ghost markers

## 5.14.0 — G1 TC Circuit multiplayer lap sync

- `tcCircuit.js` — host-synced lap timer, `tc_cp` proximity, live leaderboard HUD
- `LAP_CROSS` / `CIRCUIT_START` actions · circuit state in `FULL_STATE` sync
- `remotePlayers.js` — ghost markers at synced `playerPositions` (multiplayer)
- `World.startTcCircuit()` / `World.stopTcCircuit()` · `npm run tc:circuit:verify`

## 5.13.0 — Proximity VOIP + Discord parallel

- Lobby voice settings (host before CREATE): WebRTC proximity, PTT/open mic, Discord link
- `voip.js` — PeerJS audio mesh, distance falloff, PTT (V + on-screen), mute/deafen
- `PLAYER_POS` sync for proximity · default: WebRTC + PTT + 24m falloff
- Discord opens external invite (true embed not available in web SPA)

## 5.12.0 — S1 TC export E2E ship path

- `tc-export-lib.cjs` + `tc:export:manifest` — synthesize `exports/tc-show.threshold-game.json` from disk
- `npm run tc:ship` — `tc:build` → `tc:verify` → `build` → `bundle:assets` → manifest → `store:prep`
- `npm run tc:ship:verify` — dist-store + bundle-index checks; `--preview-smoke` against `:4173`
- Mirrors MORE → EXPORT credits/registry for TC Show (`com.threshold.tc`, mapped store SKUs)

## 5.11.0 — R7 TC intro cutscene

- `video/tc_intro.webm` — TC showcase intro (3.6s, skippable)
- `build_tc_intro.py` + `npm run tc:gen:vid` (Python imageio)
- `tcIntro.js` — auto-play after Lobby **TC →** (once per browser via ViewPrefs)
- `World.playCutscene('video/tc_intro.webm')` · video manifest `tcRealism: r7`
- EXPORT CREDITS + PromptGen `// ASSETS:` video entry

## 5.10.0 — R6 TC GIMP textures + HILOD

- `tc-gen-tex.cjs` — procedural PBR maps + `_512`/`_1k`/`_2k` HILOD per TC asset
- `config/tc-textures.json` — Runner, Hauler, Marshal, Mechanic, Span slot specs
- `tcTex.js` — auto-wire bundled textures + HILOD on Lobby **TC →** spawn
- GIMP: `build_tc_tex.py` — Filters → Threshold → Build TC Textures (R6)
- `threshold_manifest.json` merged with `tcRealism: r6` entries
- `npm run tc:gen:tex` · included in `npm run tc:build`

## 5.9.0 — R5 Blender TC mesh realism

- `tc_mesh_lib.py` — shared R5 veh+chr builders (wheels, silhouette, LOD)
- `build_tc_chr.py` → `tc_chr.blend` — Marshal + Mechanic humanoids
- `build_tc_veh.py` refined — nose/spoiler/tailgate/grille, `_LOD1`/`_LOD2` naming
- `headless_export.py` — `--slug`, `--tc-ed`, `--license`, `--realism`
- `tc-build.cjs` — Blender chr pipeline; Node fallback upgraded to R5
- Manifest `realism: r5` on all TC GLB models

## 5.8.1 — R4 walkthrough QA + doc truth

- `npm run tc:verify` — modules, GLBs, manifest, alias map, ASSETS block
- Doc/manifest truth pass: `tc-*` editions, lobby **TC →**, `npm run tc:build`
- Manifest: removed `childEdition`; root `tcEd=tc-show`
- Edition manifests + `reference/ATTRIBUTION.md` updated to TC ids
- Compiler WORKFLOWS: **TC Circuit** timer + checkpoint (G1)
- R4 QA checklist in [GETTING_STARTED.md](GETTING_STARTED.md)

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