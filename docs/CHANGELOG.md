# Changelog

## 6.2.0 — Phase 8: texture expansion, KTX2, ADS, Blender avatars, surfaces

- **Texture presets** — grass, wood, gravel, asphalt, fabric, metal_grate (+ `_4k` HILOD tier, r8)
- **KTX2 pipeline** — `tex:ktx2`, Basis transcoder in bundle, runtime KTX2Loader probe
- **ADS** — hold `R` / LT to aim; FOV zoom, viewmodel pose, tighter shot spread
- **Footsteps** — grass, wood, gravel, asphalt surfaces + starter scene demo pads
- **Blender avatars** — skinned mesh + walk clip by name; `docs/BLENDER_AVATARS.md`
- **Capabilities guide** — `docs/ASSET_CAPABILITIES.md` (full dev head-start outline)

## 6.1.0 — Phase 7: avatars, footsteps, FPS arms, remote meshes

- `avatar:gen` — starter_avatar + NPC guard/mech GLBs with walk animation clip
- Player + NPCs load GLB first, procedural human fallback
- Footstep SFX (concrete/metal) with surface detection from physics raycast
- FPS viewmodel — arms + pistol on camera in first-person mode
- Remote players use avatar mesh instead of capsule ghosts
- HILOD WebP compress (all PNG tiers); normal maps on starter ground/wall

## 6.0.0 — Realism defaults (asset pack + creator guide)

- `tex:compress` — PNG → WebP sidecars; runtime prefers WebP when bundled
- `assets:pack` — one-shot tex + sounds + webp + build + bundle
- `assets:verify` — smoke test modules, NPCs, SFX, texture budget
- Parking stripes, barrier posts, `starter_stripe` r7 texture
- [REALISTIC_GAMEPLAY.md](REALISTIC_GAMEPLAY.md) — action controls, NPC/texture/audio/physics recipes

## 5.22.0 — Physics pass · NPC roster · scene dressing

- Capsule player collider, ground raycast jump, player/ground physics materials (less bounce)
- Static platform + ground slab colliders — no more floating plane-only feel
- **Alex**, **Jordan** (range patrol), **Sam** (mechanic patrol) — upgraded human proportions
- `npcPatrol.js` — waypoint idle loops; Third Eye highlights all three
- Starter ground slab, backdrop wall, bench; r7 textures at 512px for ground/wall

## 5.20.0 — Action controls · FPS/TPS · Third Eye

- **TPS walk** from first spawn — camera-relative movement, Shift/L3 sprint, accel/decel curves
- **V** / D-pad Down toggles **FPS ↔ TPS**; FPS crosshair, head hidden at eye height
- **Third Eye** (**T** / D-pad Up) — green circle HUD + highlight interactables/NPCs within 18m
- **E** = interact (hint and binding aligned); OrbitControls disabled in walk mode
- Mouse / R-stick look in walk; fire raycast from active camera

## 5.19.0 — Starter world FX (guns, brakes, locks, glass)

- `sounds:gen` — 8 new procedural clips: pistol/rifle, brake squeal, tire skid, door lock/unlock, glass break, metal hit
- `wireStarterSounds()` — crate/glass/target collisions, terminal door-lock on interact, engine loops unchanged
- **G** to shoot — raycast hits glass pane (shatters) or metal target; kick crate for impact SFX
- TC drive — brake squeal on hard stop, tire skid on fast turns
- Starter scene props: glass pane + shooting target on the platform

## 5.18.0 — Starter engine SFX + texture realism

- `npm run sounds:gen` — procedural two-stroke + V8 loops (22 kHz mono WAV, optional OGG via ffmpeg)
- `EngineAudio` — looping drive sound with throttle-linked pitch/volume on `tc_run` / `tc_haul`
- Starter + TC textures: concrete platform, terminal kiosks, muted vehicle palettes (`tc:gen:tex`)
- `sounds:compress` — drop rips in `sounds/import/` for ffmpeg/VLC lightweight conversion
- ffmpeg via winget → OGG clips ~16 KB each (vs ~70–88 KB WAV) · `npm run sounds:verify`

## 5.17.0 — Panel layout · realism pass · AI terminals

- TOOLS / SCENE panels default **left-center** / **right-center**; v3 layout resets cut-off positions
- Toolbar button grid + session bar ellipsis; scene dock scroll/height fixes
- Hyper glare reduced — lower bloom, exposure, env reflections, softer ground/water
- Starter scene: **Alex** guide NPC + **AI Build Station** + **Model Kiosk** (walk up · press E)
- Human mesh proportions — neck, shoulders, matte skin; less neon emissive

## 5.16.0 — G3 checkpoint gates + vehicle enter/exit animations

- `tcGateFx.js` — tc_cp gate bar opens on lap, beacon pulse, checkpoint sfx
- `lastGatePulse` in circuit LIVE_STATE — multiplayer gate sync without extra actions
- `tcDrive.js` — enter camera swoop + vehicle hop; exit spawns walk avatar with scale-in
- TC show checkpoint spawns gate posts + bar · `npm run tc:g3:verify`

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