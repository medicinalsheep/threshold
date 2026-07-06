# Changelog

## 9.4.0 — Sprint N: Survival & gameplay depth

- **`remotePlayers.js`** — compact HP/F/W vitals pill sprite above remote avatars (MP `avatar.v` sync)
- **Inspector** — `survivalKind`, `ambientZone`, `zoneRadius`, `interactHint` in SCENE → EDIT
- **`survivalZones.js`** — custom ambient zone discovery from scene markers
- **`survivalNeeds.js`** — collapse vignette FX; TC drive handoff snapshot/restore API
- **`tcDrive.js`** — vitals frozen during drive; restored on vehicle exit
- **`exportPreflight.js`** — warns when custom worlds lack survival hooks
- **`promptCookbook.js`** + **`referenceLibrary.js`** — survival prop + ambient zone recipes

## 9.3.0 — Sprint M: Guided onboarding polish

- **`guidedSession.js`** — single modal stack (no double-flash); guest/spectate skip mode gate; inherit host pause
- **`walkthrough.js`** — mode-aware step 3/4 highlights; BUILD opens SCENE dock; PLAY pulses vitals HUD; replay preserves `sessionMode`
- **`lobby/main.js`** — URL `?mode=play` / `?mode=build` deep link; remembers last template + mode
- **`actionHints.js`** — showcase copy; TC quest card deferred until guided tour complete
- **`engine.css`** — `.survival-needs-hud.tour-pulse` animation for PLAY tour step

## 9.2.0 — Sprint L: Showcase visual polish

- **`makeWardenclyffeSignTex`** — procedural gateway plaque with emissive map
- **`showcaseGateway.js`** — copper lamp arms, gravel inlay, curbs, rain-dampened lamp anim
- **`starterSiteTerrain191.js`** — tiled plane courtyards/path, approach stone curbs, PBR object names
- **`aiTerminal.js`** — showcase kiosk variant (wood top, copper trim, pedestal)
- **`starterLighting195.js`** — approach + gateway fill lights, golden hour lock, rain dampening
- **`starterScene.js`** — async bootstrap; textures applied before player spawn
- **`starter-textures.json`** — Visitor Courtyard, Approach Path, Gateway aliases

## 9.1.0 — Sprint Q: Documentation truth pass

- **`REALISTIC_GAMEPLAY.md`** — v9 showcase guide: PLAY/BUILD, survival vitals, gateway site map, F interact
- **`CREATIVE_WORKFLOW.md`** — guided loop, PromptGen EXAMPLES, EXPORT & PLAY, survival prop hooks
- **`docs/README.md`** — v9 capability map, sprint history A–Q, polish roadmap link
- **`ASSET_CAPABILITIES.md`** — v9 systems table (survival, guided session, export preflight, MP manifests)
- **`referenceLibrary.js`** — guided tour v9, survival vitals, EXPORT & PLAY compiler workflows
- **`AGENTS.md`** — version + module paths (starterScene, guidedSession, survival)
- **Lobby** — release strip with version + GitHub changelog link

## 9.0.0 — Guided session + showcase world overhaul

- **Intro removed** — no flythrough on Wardenclyffe; camera spawns at visitor gateway facing the lab
- **`guidedSession.js`** — upfront **PLAY** vs **BUILD** choice (lobby + in-engine modal); persists in `ViewPrefs`
- **Lobby** — **START IN** toggle · primary **ENTER →** button · updated quick tips
- **`showcaseGateway.js`** — stone/copper visitor arch replaces blocky courtyard toys (platform, beacon, cubes, windmill)
- **`starterScene.js`** — gutted minecraft-style demo props; curated terminals + Alex guide on polished site path
- **Walkthrough** — 6-step guided tour aligned to mode choice, survival, PromptGen, export (no tutorial cube)
- Default sim starts **paused** until PLAY/BUILD is applied

## 8.9.0 — Sprint J: Survival vitals system

- **`survivalNeeds.js`** — six coupled stats (health, food, water, rest, stamina, stress): drain/regen, sprint gating, collapse recovery, weather + zone modifiers
- **`survivalZones.js`** — passive recovery near creek, coffee nook, Tesla lab, interior shelter
- **`survivalWorldHooks.js`** — tags starter coffee, creek, shop, benches as `[F]` survival interactables
- **`survivalInteract.js`** — consume/rest actions with per-prop cooldowns; channeled bench rest
- **`survivalNeedsHud.js`** — six-bar vitals overlay + status effects; **V** toggles visibility
- **Player** — walk/sprint speed scaled by vitals; movement context feeds survival tick
- **MP** — compact `v` vitals array on player avatars (VoIP position reporter + live sync)

## 8.8.0 — Sprint I: Rebuild telemetry + per-author undo + host handoff

- **`guestRebuildTelemetry.js`** — logs guest starter rebuilds; status toast + sync chip `rebuild +N` + SYNC STORY detail
- **Per-author undo** — Compiler **Undo my edits only** toggles `UNDO MINE` (skips other authors' checkpoints in MP)
- **`hostMigration.js`** — **SAVE & HANDOFF** (PLAYERS): snapshot world + designate successor; guests get `HANDOFF_SNAPSHOT`
- **Migration modal** — after reconnect grace fails: play link, successor steps, lobby return
- **Reconnect** — 5 failed retries open migration modal instead of silent dead-end

## 8.7.0 — Sprint H: Collab guardrails + texture manifest

- **`collaborateGuard.js`** — **scene lock** (host-only edits) + **AI run ack** queue; host approves/denies guest compiler/Grok runs in modal
- **`textureManifestSync.js`** — host pushes custom `tex_*` GIMP blobs on join (mirrors audio manifest); sync chip `tex N/M`
- **`textureLibrary.saveWithId`** — receive network texture blobs into IndexedDB
- **Scene history** — checkpoints tagged with `authorKey`; undo status shows who ran the script
- **PLAYERS panel** — scene lock + AI ack toggles; guest collab status note
- **Permissions** — scene lock blocks all guests (including admins)

## 8.6.0 — Sprint G: Phase 2 multiplayer foundation

- **`guestRebuild.js`** — registry-driven guest starter rebuilds (replaces sync.js if-chain); marker + upgrade chains for Wardenclyffe 19.x modules
- **`audioManifestSync.js`** — host pushes custom recorded clip manifest on join; guests pull missing `sfx_*` blobs (≤480KB); sync chip shows `audio N/M`
- **`syncStory.js`** — **SYNC STORY** modal + **SYNC** toolbar button + clickable sync chip — documents live sync vs local-only vs host-only
- **Reconnect grace** — guest/spectate auto-retry host connection (5× / 3s) before giving up
- **Spectate HUD** — shows pending audio sync count when watching

## 8.5.0 — Sprint F: First-run delight

- **`introSkip.js`** — skippable Wardenclyffe flythrough (ESC, click canvas, SKIP pill); intro shortened to ~4.5s
- **`actionHints.js`** — progressive teaching toasts (walk, PromptGen EXAMPLES, EXPORT & PLAY)
- **Tutorial** — compressed default walkthrough to **5 steps**; **MORE → TUTORIAL (FULL)** keeps 9-step deep dive
- **TC quest card** — optional dismissible side-quest hint (lobby TC → lap challenge), not a gate
- **Lobby tips** — updated quick steps for EXPORT & PLAY + optional TC

## 8.4.0 — Sprint E: Export & Play + export preflight

- **`quickExportPlay.js`** — one-click **EXPORT & PLAY**: pause snapshot, `SAVE WORLD`, manifest download, open `?world=CODE&autoplay=1` in new tab; **PLAY LAST EXPORT** in lobby + engine MORE menu
- **`exportPreflight.js`** — pre-export scan: empty scene / guest blockers, missing sound clips, texture hints, GLTF paths, `clearWorld` in running code; modal with **EXPORT ANYWAY** on warnings
- **Lobby autoplay** — `?world=CODE&autoplay=1` skips lobby, starts SOLO, loads saved world in engine

## 8.3.0 — Sprint D: Nikola R8.2.7 + Phase 19.5 lighting

- **`labCoatProp.js`** — procedural `prop_lab_coat` on Nikola (`tesla_guide` role + manifest hair)
- **Nikola patrol** — bench ↔ coil ↔ tube rack ↔ rotary (unified lab layout waypoints)
- **Intro caption** — Nikola hint during flythrough
- **`starterLighting195.js`** — dusk default (18.75h), warm lab/coil/façade/courtyard lights, window glow; guest sync

## 8.2.0 — Sprint C: Starter templates + PromptGen cookbook

- **`starterTemplates.js`** — lobby picker: **Wardenclyffe** (default), **Blank Yard**, **TC Circuit**, **Surreal Seed**; `?template=` URL param
- **TC →** shortcut loads TC Circuit template (vehicles + checkpoint + auto lap timer)
- **`promptCookbook.js`** — 10 tested LEGO FIT examples in PromptGen **EXAMPLES** sidebar
- Engine boot uses `bootstrapSelectedTemplate()` instead of hard-coded Wardenclyffe-only path

## 8.1.0 — Sprint B: Performance HUD + sync status chip

- **`creatorHud.js`** — live **FPS · bodies · objs · mesh · draw · tier** overlay (bottom-left)
- **PERF** toolbar toggle + **\`** backtick shortcut; preference stored in `ViewPrefs`
- **Sync chip** — role (host/guest/spectate), weather %, appearance count, **audio local only ⓘ** tooltip in MP
- **EDIT/PLAY** pill updates with pause state

## 8.0.0 — Sprint A: Scene undo + compile sandbox + Grok extend

- **`sceneHistory.js`** — ring buffer of `Sync.capture()` checkpoints before world-mutating runs and `clearWorld`; **UNDO SCENE** button + **Ctrl+Z** (outside text fields)
- **`runtime.js`** — failed eval auto-reverts last checkpoint; error line highlight on compiler output
- **Compiler** — removed inner try/catch that swallowed script errors; transpile rethrows to sandbox
- **Grok client** — LEGO FIT: extend scene, no `clearWorld` unless user explicitly requests reset
- **Readiness** — new `no_clear` check flags accidental `World.clearWorld()` in generated scripts

## 7.9.4 — Phase 19.4: Wet south windows + courtyard prop density

- **South façade glass** — `labWindow` panes use physical transmission; `wetGlass` registered with `WeatherSystem` for rain-driven roughness/opacity
- **`starterCourtyard194.js`** — period yard clutter: barrels, cable spools, crates, gas lamps, visitor sign, rope stanchions, work bench, tool cart
- **Lamp animation** — courtyard gas lamps flicker with rain dampening; guest sync rebuilds `starter_courtyard_props`
- **Weather** — `registerSouthLabWindows()`; wet glass driven by `WeatherSystem` (skylight duplicate anim removed)

## 7.9.3 — Phase 19.3: Building PBR + HILOD

- **`starterBuildingTex193.js`** — tags GLB mesh names → brick/wood/roof/copper maps; per-mesh PBR + HILOD after GLB upgrade
- **Textures** — enhanced `starter_tesla_brick` / `starter_tesla_wood` palettes; new `starter_tesla_roof` slate
- **UV finish** — façade tiling tuned in `starter-textures.json` for brick, liner, roof
- **Auto-wire** — runs after `upgradeTeslaBuildingGlb192` and `upgradeTeslaLabGlb185`; guest sync rebuild

## 7.9.2 — Phase 19.2: Architectural GLB pass

- **`building:gen`** — `wardenclyffe_building` LOD0/1/2, `lab_wood_liner`, `wardenclyffe_door` + manifest entries
- **`teslaBuildingGlb192.js`** — runtime shell/liner/door upgrade with `MeshLod` on brick façade
- **Building groups** — `starter_tesla_building_shell` + `_liner` for GLB swap; unified physics box
- **`lab:gen`** — south-facing `lab_door.glb` aligned with Phase 19.1 interior
- **Blender scaffold** — `build_starter_building.py`

## 7.9.1 — Phase 19.1: Terrain + building shell

- **`starterSiteTerrain191.js`** — unified grass field, gravel courtyard, approach path, lab apron (replaces overlapping slabs)
- **Building shell** — south wall door cutout, wood liner + interior ceiling, windows flank entrance
- **Lab interior** — expanded to 10.8×4 m inside brick volume; floor on building slab (`y=0.14`)
- **Interactables / NPC / skylight** — repositioned for human-scale room layout
- **Guest sync** — rebuilds `starter_site_terrain` on join

## 7.9.0 — Phase 19: Wardenclyffe unified site (Option A)

- **Site layout** — `starterSiteLayout.js` single anchor map: building `(0,0,0)`, courtyard south, tower north, highway east perimeter
- **Lab interior** — coil room inside brick shell; south doors exit to visitor courtyard (no east annex)
- **Doors** — walk-in entry/exit nudges replace cross-map teleport
- **Relocated zones** — plaza pads/NPCs → courtyard; creek west; highway/urban east; env props on site plan
- **Ambient zones** — wildlife, urban, interior audio follows new coordinates

## 7.8.3 — R8.2.6: Custom GLB path + appearance export + character kit

- **Custom body** — `import/` path (`customBodyImport`), local GLB picker, URL load, clear reset
- **Appearance JSON** — export to clipboard / download · import from paste
- **Character kit** — `npm run kit:export:chr` → `exports/starter-character-kit/` (GLBs + skin PBR + presets)
- **`kit:export`** — also runs character kit export

## 7.8.2 — R8.2.4: Avatar skin / fabric / hair PBR + HILOD

- **Textures** — `starter_skin_light|medium|deep`, `starter_fabric`, `hair_alpha` via `tex:gen`
- **AvatarTex** — region-based PBR apply (skin, shirt, pants, hair) on composed avatars
- **HILOD** — `TextureHilod` tracks `avatarTexMeshes` on player/NPC groups
- **Skin panel** — skin tone preset dropdown (light / medium / deep)
- **Multiplayer** — `appearance.textures` synced for remote compose

## 7.8.0 — R8.2: Character kit (female + hair + composition)

- **Manifest v2** — `avatar-manifest.json` bodies, hair, attach points, roles
- **AppearanceProfile** — serializable body + hair + colors + custom GLB overrides
- **AvatarComposer** — manifest-driven body GLB + `HairSlot` attach + color apply
- **Assets** — `starter_avatar_female.glb`, `hair_short_m`, `hair_long_f`, `hair_bun_f`
- **Skin panel** — build preset, hair style, pants/hair colors · full recompose on reload
- **Multiplayer** — `appearance` in `LIVE_STATE` · remote players compose from profile

## 7.7.0 — Phase 18.5: Tesla lab GLB + mesh LOD

- **Tesla coil** — `tesla_coil.glb` LOD0/1/2 via `MeshLod`; arc pulse + spark hooks preserved
- **Lab bench** — `lab_bench.glb` with gauge, Leyden jar, switch baked
- **Lab door** — `lab_door.glb` hinged `door_open` clip + runtime swing on interact
- **Generator** — `npm run lab:gen` (Node fallback) · Blender scaffold `build_starter_lab.py`
- **Module** — `teslaLabGlb185.js` upgrades procedural props after lab build · guest sync `glb185` flag

## 7.6.0 — Phase 18.4: Annex weather + exterior marquee

- **Skylight** — glass pane in lab ceiling; wet roughness/opacity/transmission scales with rain
- **Thunder flash** — lightning sync boosts coil arc, tower cage, bulbs, marquee emissive + spark SFX
- **THRESHOLD LAB marquee** — emissive sign on approach path; pulses in rain and storms
- **WeatherSystem** — `registerWetGlass()` + guest thunder flash via synced events
- **Module** — `starterTeslaWeather184.js` · guest sync `starter_tesla_skylight`

## 7.5.0 — Phase 18.3: Lab guide NPC + intro captions

- **Nikola** — lab-coat guide NPC patrols bench ↔ coil ↔ tube rack (`tesla_guide_npc`)
- **Intro captions** — cinematic subtitle lines during 6.2s Wardenclyffe flythrough (`#intro-caption`)
- **Lab radio** — `starter_interior_radio_chatter` zone in annex (5.5 m, west of plaza terminal)
- **Module** — `starterTeslaNpc183.js` + guest sync for guide spawn

## 7.4.0 — Phase 18.2: Lab interactables

- **Rotary switch** — `[F]` crank anim, spark SFX, boosts coil arc + tube warmth + jar charge
- **Vacuum tube rack** — 4 tubes with filament emissive warm-up sequence (ramps on switch use)
- **Leyden jars** — `MeshPhysicalMaterial` glass transmission + copper foil charge pulse
- **Lab journal** — `[F]` opens PromptGen with page flash anim
- **Module** — `starterTeslaInteract182.js` + guest sync marker `starter_tesla_rotary`

## 7.3.1 — Controls fix + Wardenclyffe exterior intro

- **Mouse look** — fixed inverted horizontal (yaw) look; spawn inherits intro camera facing
- **WASD** — fly camera no longer steals input during intro flythrough
- **Wardenclyffe exterior** — brick lab building, 17 m lattice tower, grass field, tree line, dirt path
- **Project build** — scaffold fades, windows/sign/tower power on over 28s with status captions
- **Lab entrance** — south facade double doors teleport to annex; connects to existing interior lab
- **Intro** — 6.2s aerial tower → path → spawn outside building

## 7.3.0 — Phase 18.1: Tesla lab intro shell

- **Tesla lab annex** — west of plaza: wood floor, brick north wall, instrument bench, hanging bulbs
- **Tesla coil** — copper tower with emissive arc pulse, cable runs, random spark SFX
- **Double doors** — interact + creak SFX, swing anim, colliders on shell + threshold pad
- **PBR textures** — `starter_tesla_wood`, `starter_tesla_brick`, `starter_tesla_copper` (brick + copper gen styles)
- **Ambient** — `teslaLabAmbient.js` coil hum zone (6 m) + spark one-shots
- **Intro flythrough** — 4.8s camera: coil → doors → plaza spawn `(0, 1.2, 2.5)`
- **Guest sync** — `starter_tesla_coil` marker rebuild in `sync.js`
- Docs: [PHASE_18_TESLA_LAB.md](PHASE_18_TESLA_LAB.md) · [DEFAULT_ASSETS_ROADMAP.md](DEFAULT_ASSETS_ROADMAP.md)

## 7.2.1 — UX: proximity panel, camera, F interact, third eye clicks

- **Proximity panel** — draggable + lockable float panel (`#proximity-panel`) like SCENE dock
- **Mouse look** — fixed inverted vertical pitch in walk/TPS/FPS
- **EDIT dock** — inspector sub-tabs no longer overlap panel content (flex layout)
- **F key** — interact + third eye (near target → interact, else toggle awareness); E = vehicle
- **Third eye** — releases pointer lock; mouse clicks work on UI and interact targets

## 7.2.0 — Starter asset polish: low-poly, high-detail, compression pass

- **Geometry** — reduced segment counts (platform 16, torus 24, shared geos); `InstancedMesh` for highway dashes + construction cones
- **Materials** — `starterMaterials.js` shared presets + procedural canvas signs (billboard, coffee, register, tape) + noise roughness maps
- **Textures** — 5 new PBR slugs (fence, coffee, shop, door, construction); extended `starter-textures.json` aliases
- **Compression** — `tex:compress` sharp fallback when ffmpeg missing; `sounds:compress:wav` batch OGG script
- **Draw calls** — shared materials across stripes, blades, birds, barrier posts

## 7.1.0 — Phase 17: Interior / RP (ambient iteration 5)

- **Radio chatter** — muffled loop zone near AI Build terminal
- **Coffee murmur** — indoor crowd loop at west coffee nook
- **Door creak** — RP interact prop with swing anim
- **Elevator ding** — multi-floor kiosk at north wall; button flash on interact
- **Cash register** — corner shop counter on wood deck
- **Module** — `interiorAmbient.js` + `starterInterior17.js`
- **Guest sync** — interior props rebuilt on starter-world join
- Docs: [AMBIENT_ASSETS_ROADMAP.md](AMBIENT_ASSETS_ROADMAP.md) iteration 5 shipped

## 7.0.0 — Phase 16: Urban / highway (ambient iteration 4)

- **Semi truck pass** — Doppler whoosh on highway strip when nearby
- **Motorcycle pass** — quick rev pass with animated playback rate
- **Distant siren** — rare ambient one-shot across the scene
- **Construction beep** — proximity zone near orange cones / barrier
- **Traffic lights** — junction emissive cycle (green → yellow → red)
- **Billboard** — scrolling UV emissive face east of highway
- **Module** — `urbanAmbient.js` + `starterUrban16.js`
- **Guest sync** — urban props rebuilt on starter-world join
- Docs: [AMBIENT_ASSETS_ROADMAP.md](AMBIENT_ASSETS_ROADMAP.md) iteration 4 shipped

## 6.9.0 — Phase 15: Wildlife & life (ambient iteration 3)

- **Dog bark** — proximity to Sam (mechanic NPC) + dog bowl prop
- **Alley cat** — meow when near west alley; tail sway anim
- **Cicadas / crickets** — grass-patch loops swap by time of day (day / dusk / night)
- **Owl hoot** — evening and night one-shots
- **Fish splash** — random splashes when near creek
- **Time-of-day** — `Environment.setTimeOfDay` fires `threshold:timeofday` for wildlife
- **Module** — `wildlifeAmbient.js` + `starterWildlife15.js`
- Docs: [AMBIENT_ASSETS_ROADMAP.md](AMBIENT_ASSETS_ROADMAP.md) iteration 3 shipped

## 6.8.0 — Phase 14: Ambient iteration 2b (environment)

- **Creek** — water plane west edge, babble loop, proximity zone audio
- **Power lines** — backdrop cables sway with wind/rain, 60 Hz hum zone
- **Chain fence** — metal wires + gust-triggered `starter_fence_rattle` SFX
- **Dirt mound** — `dirt` texture style, footstep surface, dust particles on gust
- **Pipeline** — `starterEnv14.js`, staggered creek/power loops in `AmbientAudio`
- **Guest sync** — env props rebuilt on starter-world join
- Docs: [AMBIENT_ASSETS_ROADMAP.md](AMBIENT_ASSETS_ROADMAP.md) iteration 2b shipped

## 6.7.0 — Phase 13: Stability & session UX

- **Manifest fingerprint skip** — `seedStarterSounds()` stores `threshold_starter_manifest_fp`; skips IndexedDB re-import when manifest version + clip sizes unchanged and all clips cached
- **Staggered audio bootstrap** — `AmbientAudio.startStaggered()`, `WeatherSystem` rain layers, `starterAudio.js` pipeline; yields every 4 clips on first import
- **Guest audio hydration** — `ensureStarterAudio({ deferWeather: true })` after `FULL_STATE`; guests hear wind/highway/birds/rain matching host
- **Weather multiplayer sync** — `Sync.capture` / `captureLive` include `weather`; host authority for drift + thunder/gust events; guests lerp intensity + replay synced one-shots
- **Pointer / pause hardening** — release pointer lock on tab-out (`visibilitychange`), window `blur`, host EDIT pause, spectate mode; no lock in spectate / host-cam follow
- **Windowed fullscreen** (6.6.2) — immersive UI without browser exclusive fullscreen; Electron maximized window; auto on lobby enter
- **TPS camera fix** (6.6.2) — camera behind player, corrected mouse look
- **Freeze fix** (6.6.1) — bird loop guard, `dt` order in animate loop
- Docs: [PHASE_13_STABILITY.md](PHASE_13_STABILITY.md)

## 6.6.2 — Hotfix: windowed fullscreen + TPS camera

- Windowed fullscreen (web + Electron maximize) for easy Alt+Tab
- TPS camera behind player; mouse look invert fix
- Lobby auto-enters windowed fullscreen on session start

## 6.6.1 — Hotfix: post-start freeze

- `RecordedAmbient` bird loop spam guard (`_birdStarting`)
- `animate()` computes `dt` before ambient tick
- `seedStarterSounds` dedupes concurrent calls
- `playRecordedSfx` moved off import-time `World` assignment

## 6.6.0 — Phase 12: Real weather audio + dynamic storms (iteration 2)

- **Real combat SFX** — `sounds:fetch:sfx` replaces procedural gun (drum-like), glass, metal, horn, brakes, footsteps with Mixkit + your recordings
- **User recording pipeline** — `sounds:tag:recording` clips + tags field recording (birds, plastic, papers, water jug, metal/glass)
- **RecordedAmbient** — bird loop + proximity foley; `World.playRecordedSfx('metal_glass')`
- **Real ambient clips** — Mixkit field recordings: rain light/heavy/roof, 6 thunder variants, wind gust
- **Pipeline** — `sounds:fetch:ambient` downloads, trims, normalizes → 22 kHz mono WAV + OGG
- **WeatherSystem** — crossfaded rain layers, random thunder pools with pitch/volume variation, wet asphalt
- **Visuals** — rain particle field, fog intensifies during storms
- **API** — `World.setWeather({ intensity: 0.7 })` · auto-starts in starter scene after intro
- Docs: [AMBIENT_ASSETS_ROADMAP.md](AMBIENT_ASSETS_ROADMAP.md) iteration 2 shipped

## 6.5.0 — Phase 11: FiveM controls + ambient makeover (iteration 1)

- **Controls** — FiveM-style defaults: LMB fire, RMB aim, F vehicle, Ctrl crouch, grouped KEYS menu
- **Player** — crouch, stealth walk, flashlight, reload/melee/emote, look behind, holster
- **Ambient SFX** — wind, highway, birds, cicadas, dust, horn (`sounds:gen`)
- **Starter scene** — highway strip, street lamp, wind turbine, birds; `StarterAnim` + `AmbientAudio`
- **Textures** — richer ground/wall/grass/asphalt palettes + `starter_highway`
- Docs: [CONTROLS_FIVEM.md](CONTROLS_FIVEM.md), [AMBIENT_ASSETS_ROADMAP.md](AMBIENT_ASSETS_ROADMAP.md)

## 6.4.1 — Doc truth pass + legacy archive

- **docs/README.md** — full scope map, phase history, command cheat sheet
- **README.md** — v6.4 realism starter, asset pipeline table, `quickstart`
- **old/** — archived `threshold-child-*` editions, R2 child-vehicle scripts, sample GIMP manifest
- `npm run quickstart` — onboarding (+ `--verify` / `--pack`)
- Updated AGENTS, GETTING_STARTED, PRODUCT_ROADMAP, REALISTIC_GAMEPLAY, CREATIVE_WORKFLOW

## 6.4.0 — Phase 10: GIMP live SYNC + starter texture kit

- **Live SYNC** — `textures:watch` auto-WebP, bundle mirror, manifest hot-reload + UV finish pass
- **Starter kit** — `npm run kit:export` → lightweight WebP pack for forks (`exports/starter-texture-kit/`)
- GIMP export plugin reads HILOD tiers from `tc-textures.json` (incl. `_4k`)
- Creative watch connects on localhost preview; POST `/gimp-sync` trigger

## 6.3.0 — Phase 9: GIMP parity, Blender avatar export, immersive starter textures

- GIMP `build_tc_tex.py` — full r8 parity with Node (all 12 surface styles + `_4k` HILOD)
- `blender:avatar` — headless rigged GLB export with animations
- `config/starter-textures.json` — UV tiling + normal scale for lightweight PBR on large meshes
- `starterTex.js` — multi-mesh wiring, alias support, finish pass
- Starter scene: fabric banner, bench wood preset, tiled surface pads
- [GIMP_TEXTURES.md](GIMP_TEXTURES.md) — install, batch, override workflow

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