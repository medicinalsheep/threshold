## 10.12.25 — Display name: custom or X profile

- Lobby **Display name** source: Custom · X handle (@) · X profile name
- X options enable when signed in; input becomes read-only when using X
- Does not overwrite custom names on login unless still default `Player*`
- Session/multiplayer uses resolved name via `DisplayName`

## 10.12.24 — X feed panel + create post

- **Nav 𝕏 button** — opens side panel with feed + compose
- **Create post** — `POST /2/tweets` (needs `tweet.write`; re-sign-in after scope upgrade)
- **Feed** — home reverse-chronological when allowed; falls back to your posts on free/limited apps
- OAuth scopes now include `tweet.write` (session storage v2)

## 10.12.23 — Sign in with X (OAuth 2.0 PKCE)

- **XAuth** — official X OAuth 2.0 + PKCE (SPA); lobby + nav + portal **Sign in with X**
- Stores X user `@handle` / avatar / tokens locally; optional `offline.access` refresh
- Config: `VITE_X_CLIENT_ID` (+ callback URLs in developer.x.com)
- **Note:** X identity ≠ SuperGrok/xAI API — Grok still uses `console.x.ai` key

## 10.12.22 — Grok / SuperGrok-class API hooks

- **GrokClient** — official `api.x.ai` chat + Imagine hooks; models from `config/grok-models.json` (4.5, 4.3, 4.20, build, imagine)
- **AgentRouter** — uses selected Grok code/chat model (default **grok-4.5**)
- **Portal** — key save + remember device, TEST probe, model dropdown; honest note that SuperGrok *tabs* cannot share session
- **Auth** — optional localStorage remember for xAI key

## 10.12.21 — Ollama Pages connectivity (CORS/PNA proxy)

- **`npm run ollama:serve`** — keeps Ollama up + local proxy on **:11435** with `Access-Control-Allow-Private-Network` (Chrome/Pages fix)
- **OllamaClient** — tries `/ollama` (vite) → `:11435` (proxy) → `:11434`; clearer offline/CORS errors; RE-SCAN resets base
- Portal copy: run `ollama:serve` and leave it open when using GitHub Pages

## 10.12.20 — Generation reasoning (intensity + MOD policy)

- **generation-policy.json** — minimal → maximal intensity budgets (props, NPCs, weather, tex/poly)
- **MOD reasoning** — archetypes (operator, explorer, scientist…): **required slots always**; optional by intensity + user language
- **Agent portal / production plan / scene prompts** — inject reasoning; ready JSON gets `intensity`, `appearance.mods`, budgets
- **Auto-apply loadout** — character ready signal applies body/hair/mods to player SKIN
- **UX rule** — generate only what the brief needs; skip weather/atmosphere/fashion when irrelevant

## 10.12.19 — Full MOD gear system

- **avatar-mods.json** — 50+ pieces across 13 slots (headwear→props), 8 categories, 8 loadout presets
- **Exclusive slot resolve** — hat vs helmet, jacket vs coat, etc.; accessories stack (max 6)
- **SKIN UI** — search, category groups, preset buttons (Explorer / Operator / Scientist / Spacer / …)
- **Procedural builders** — field, tactical, lab, urban, sci-fi, fantasy, tools; GLB override hook
- **FPS hide** — head/face mods respect first-person visibility

## 10.12.18 — Combat touch + avatar LOD + MOD layer

- **Combat touch** — fire/ADS/reload/melee appear when weapon drawn; holster always reachable; start holstered for lean pad
- **Avatar LOD** — male/female LOD0/1/2 (~2.3k → 1.6k → 0.9k tris); distance switch via MeshLod; hair/mods rebind on level change
- **MOD layer** — stackable gear (jacket, vest, pack, cap, goggles) in SKIN; `profile.mods[]` networked; procedural builders
- **Manifest v3** — `bodies.*.lods` + `mods` catalog

## 10.12.17 — Lean touch, formed avatars, proximity chip

- **Touch layout v4** — core only (sticks + JMP/RUN/F/II); combat/utility add via **+ BTN** (unlock); double-tap hide/show; VEH context when TC vehicle present
- **Player avatars** — moderate-poly male/female formed bodies (`starter_avatar*.glb` ~2.3–2.6k tris), walk clip, SKIN presets
- **Proximity** — sleek F-chip (hidden until near); **movable in UNLOCK**; better horizontal range + tree interact scan
- **Agent Portal** — download buttons for `medicinalsheep/threshold-mini-*` + Ollama setup steps
- **UI** — TL hub clearance under ✕ EXIT immersive

## 10.12.16 — Hero default textures + Android prep doc

- **Starter Ground** — richer concrete: tile joints, grit FBM, joint-aware roughness/normal @ 2K
- **AI Build Station** — kiosk chassis, bezel, scanline screen, status LEDs, metalness map
- **Regen** — `npm run textures:gen:default` (+ HILOD tiers + WebP compress)
- **Docs** — [ANDROID_PREP.md](ANDROID_PREP.md) APK path after polish; Grok-on-mobile honesty

## 10.12.15 — Practical touch layout + store-verify fix

- **Touch layout v3** — dual-stick practical defaults: move/sprint left; fire/ADS/jump arc above look stick; interact mid-right; meta top-right; **UI** touch button
- **store:verify** — accept Vite entry hashes with `_` (e.g. `threshold-DU_e-GTF.js`)

## 10.12.14 — UI mouse mode (PLAY)

- **UI mouse** — **M** toggles free cursor in PLAY without Third Eye green highlights (click hubs/panels)
- **Alt hold** — temporary UI mouse peek only (no awareness scan); optional fullscreen still in SETUP
- **Third Eye (F)** — still enables interactable highlights when not using F to interact
- **Bindings schema v4** — `uiMouse` action; defaults in KEYS menu

## 10.12.13 — Mini agents: train stack, plans, safety

- **Bootcamp** — expanded JSONL (intent/NPC/compiler/scenes) + seed waves; `npm run train:mini`
- **Mini models** — `threshold-mini-npc` (llama3.2:3b), `threshold-mini-dev` (`qwen2.5-coder:1.5b` instruct)
- **Task `production_plan`** — 11-step asset pipeline text before codegen
- **Quality guards** — intent format repairs; render-mode map; `finalizeAgentCode` anti-slop (`clearWorld`, type-first, THREE.Scene)
- **Perf / HILOD** — plan + code metadata for texRes, WebP/Lite, sequential Ollama defaults
- **Safety / MP** — host-authoritative coaches; recovery (CORS, GENERATE gate, freeze)
- **Tooling** — `ollama:golden` local regression; `bootcamp:seed:wave2|3|4|critical`
- **Docs** — [BOOTCAMP.md](BOOTCAMP.md), [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md)

## 10.12.12 — Local Ollama fit + benchmarks

- **Benchmark** — `ollama:benchmark -- --all` (tok/s, num_ctx 4096)
- **2060 defaults** — `laptop2060Defaults` in agent-tasks; OllamaClient `think:false` + CoT strip
- **Training** — initial JSONL growth + stress harness

## 10.12.9 — Slab concrete deck + water VFX pass

- **Floor** — instanced 2 m concrete pavers with expansion joints, curb, dark substrate; `starter_ground` PBR maps (albedo/roughness/normal)
- **Water** — GPU wave shader: fresnel, sun specular, env reflections, caustic shimmer, inner-edge foam ring; reflector 2K on Ultra
- **Starter grid** — removed duplicate flat pad mesh; single slab deck + physics collider

## 10.12.8 — Floor / water separation

- **Concrete deck** — opaque 48×48 slab always visible (`Environment.floorGroup`); water no longer replaces the floor
- **Water moat** — ring basin outside the play pad at y ≈ −0.18; no full-plane overlay on concrete
- **Water quality** — denser ripples, higher opacity, depthWrite on; reflector tint tuned
- **Raycast** — `Engine.intersectFloor()` hits deck + ground plane for placement / context menu

## 10.12.7 — Phase 7: intent router, relay polish, store upload guide

- **Intent router** — `intentRouter.js` keyword + LLM classify; game chat (T) routes export/spawn/edit/texture/etc.
- **Relay** — PM2 `ecosystem.config.cjs`, `Dockerfile`, `nginx.conf.example`, graceful shutdown, `npm run relay:verify`
- **Training** — classify.jsonl expanded to 15 examples; npc.jsonl to 8
- **Store upload** — `npm run store:upload` generates per-platform `upload-guide.md` (signing stays local)
- **CI** — `intent-router-verify` in deploy workflow

## 10.12.6 — Creator loop polish + dependency hygiene

- **Walkthrough** — quick tour adds Export step; full tour de-emphasizes survival (points to `dev/survival/`)
- **Export wizard** — TARGETS defaults Web-only; Android/iOS/Windows/Steam collapsed under optional details
- **Design brief** — export targets match wizard (Web first, native optional)
- **package.json** — `engines.node` >= 22 (matches CI); `npm run audit:report`
- **npm audit** — 19 highs remain in Electron/Capacitor **dev** tooling (`tar`, `node-gyp`); no runtime browser deps affected; no fix without major electron-builder bump

## 10.12.5 — CI verify gate + survival dev pack

- **CI** — `deploy-pages.yml` runs `version:sync:check`, `portal-ui-verify`, `controls:verify`, `tc-drive-verify`, `tc-circuit-verify` before deploy
- **Survival** — moved to `dev/survival/` (opt-in via `npm run dev:survival`); not bundled in default Pages build
- **controls:verify** — accepts current `BINDINGS_SCHEMA` version (v3+)

## 10.12.4 — Engine split + version sync

- **Engine modules** — `main.js` bootstrap only; subsystems in `state`, `physics`, `audioSys`, `recorder`, `environment`, `engineCore`, `world`, `io`, `ui`
- **Consolidation plan** — `docs/CONSOLIDATION_PLAN.md` (phases 2–7 forward work)
- **version:sync** — `npm run version:sync` aligns package.json + doc headers from `src/config.js`
- **Verify scripts** — `tc-drive-verify` / `tc-circuit-verify` grep all `src/engine/*.js`

## 10.12.3 — Guest immersive replay

- **immersiveReplay.js** — `reapplyFromState` wires weather, audioZone, shaderHook, shaderGraph after join/load
- **Sync.capture** — ships `immersive` snapshot alongside `weather` for guests
- **Manifest import** — `.threshold-game.json` loads `world` + `immersive` via Persistence
- **Manifest fallback** — matches audio/shader entries by mesh name when userData drifted
- **Engine loop** — ImmersiveReplay.tick drives shader systems in PLAY (not only when ambient on)

## 10.12.2 — Shader node graph + export immersive review

- **shaderNodeGraph.js** — whitelisted GLSL nodes (fresnel_rim, rain_specular, vertex_sway…) + graph presets
- **MaterialPresets** — auto-applies matching shader graphs (wet_hero, glass_rim, neon_rim)
- **Export wizard** — new IMMERSIVE step (10 steps): weather preview, audio zones, shader registry, slop scan
- **Manifest** — immersive.prefs for replayWeather / bundleAudioZones / bundleShaderGraphs
- **PromptGen** — shader node graph prompt block

## 10.12.1 — Shader hooks, audio zones, agent stability

- **shaderRegistry.js** — wet_surface_boost, emissive_pulse, dust_overlay, snow_freshen, heat_shimmer
- **audioZoneSystem.js** — scene meshes with userData.audioZone register spatial ambient loops
- **MaterialPresets** — auto-applies matching shader hooks; AudioZoneSystem on audioZone meshes
- **Export manifest** — immersive.weather / audioZones / shaderHooks for guest replay
- **AI memory freeze** — GLTF gltfPath restore, dedupe, placeholder on failure
- **Parallel Ollama guard** — warns on full world + many GLBs; blocks >12 GLBs parallel
- **Third Eye** — SETUP toggle: Alt-hold peek requests native fullscreen

## 10.12.0 — Creative OS gate + immersive prep

- **Generation gate** — `validateProductionReady` blocks Portal GENERATE and SETUP RUN AGENT until placement, weather, collision intake complete
- **11-step pipeline** — atmosphere + material presets added between weather and interact
- **Weather runtime** — dust wear (`userData.dustExposure`) and snow accumulation (`userData.snowCap`) in `weatherSystem.js`
- **materialPresets.js** — shader/material registry; agents pick preset ids instead of procedural CanvasTexture slop
- **Export preflight** — `assessSceneSlop` warns on missing surfaceType, CanvasTexture maps, unhooked exterior meshes
- **PromptGen** — pulls SETUP design brief production plan + material preset prompt block
- **SETUP Step 3** — atmosphere preset, shader preset, ambient audio zone fields
- **CREATIVE_OS.md** — planned-generation vision (weather, shaders, immersive environments)

## 10.11.3 — Asset production plan + prompt engineering

- **assetProductionPlan.js** — 9-step pipeline (scope → collision → mesh → textures → HILOD → weather → interact → codegen → verify)
- **SETUP design brief** — Step 3 review: interior/exterior, weather exposure, wet/dust/snow/wet-glass, surfaceType, collision
- **Agent Portal** — intake asks placement & weather before ready JSON; codegen prompt includes full production plan
- **buildJob** — multi-step builds add collision, texture manifest, and weather hook phases
- **sceneApiPrompt** — documents userData.surfaceType, wetGlass, zoneSheltered, manifest name parity

## 10.11.2 — 2K default textures + compression pipeline

- **Default textures** — `npm run textures:gen:default` generates 2K PBR for Grid Pad + AI Build Station
- **HILOD tiers** — `textures:hilod` + `textures:watch` auto-downscale `_1k` / `_2k` PNG tiers from masters
- **WebP compression** — each tier gets a compressed `.webp` sibling for Lite/Mobile delivery (sharp or ffmpeg)
- **AI / SETUP** — design brief + Agent Portal document master → tier → WebP workflow

## 10.11.1 — Manifest + starter module prune

- **Manifest cleanup** — `threshold_manifest.json` pruned 100 → 25 entries; dropped `_512` variants and showcase-only object names
- **Starter modules archived** — 14 unused `starterTesla*.js`, `starterUrban16.js`, etc. moved to `old/src/shared/`
- **Script** — `npm run manifest:prune` for repeatable manifest hygiene

## 10.11.0 — Quality-first purge

- **Showcase removed** — INSERT SHOWCASE tab; survival/ambient/zone-radius inspector fields; survival HUD + run card
- **Texture quality floor** — minimum 1K HILOD; Lite graphics tier 1K; default grid pad wires `Starter Ground` PBR maps
- **AI quality gate** — Agent Portal system prompt + SETUP design brief require poly budget, texRes, GIMP/Blender workflow
- **Archive** — `REALISTIC_GAMEPLAY.md`, `AMBIENT_ASSETS_ROADMAP.md`, showcase modules moved to `old/`
- **Export preflight** — warns on objects missing 1K+ PBR instead of survival hooks

## 10.9.1 — Touch picker + lobby invite UX

- **Touch + BTN** — in-app action picker replaces `window.prompt` when adding custom touch buttons (UNLOCK layout)
- **Lobby invite panel** — after CREATE SESSION, hosts see room code + invite link with COPY before entering
- **Join hints** — clearer copy for invite links, room code format, and passcode on join

## 10.9.0 — Lighter first-run + optional host passcode

- **Explore-first** — Agent Portal no longer auto-opens; AI button pulses + status nudge instead
- **Deferred graphics prompt** — tier picker shows on first PLAY or ENV open, not stacked at enter
- **Action hints** — copy updated for corner hubs (TOOLS / SETUP / AI paths)
- **Host passcode** — optional at CREATE SESSION; guests enter passcode to JOIN; host can change in PLAYERS panel

## 10.8.2 — Solo BUILD default + PLAY hint

- **ENTER →** solo path now defaults **BUILD** (EDIT) — insert/delete work without mode hunting; blank **grid** template
- **PLAY mode banner** — top hint: tap EDIT to insert, delete, export
- **World edit guards** — `createObject`, `addCustom`, and GLTF insert blocked in PLAY (matches delete)

## 10.8.1 — Delete inserted objects fix

- **DELETE** now resolves Group/GLTF child hits to the registry root in `State.objects` (recursive raycast)
- **deleteObject** properly removes GLTF models (dispose + physics + LOD), showcase groups, and primitives
- Context menu + inspector selection use the same root resolution; clearer status when blocked in PLAY mode

## 10.8.0 — Doc sweep + favicon preview

- **Documentation** — archived superseded phase docs to `old/docs/`; new lean [ROADMAP.md](ROADMAP.md); truth-pass for blank grid + Agent Portal + corner hubs
- **Favicon chain** — `npm run build:icons` generates `favicon.ico`, `favicon-32.png`, `icon-192.png` from `appicon512.png`
- **Link preview** — `og:*` / `twitter:*` meta in `index.html`; manifest multi-size icons; `theme-color` aligned to `#39ff14`

## 10.7.4 — Docs sweep + Alt/stealth fix

- **Stealth walk** moved off **Alt** (was conflicting with Alt-hold Third Eye peek) → default **U** hold; bindings schema v3 migrates saved profiles
- **Lobby join field** accepts longer room codes (`NAME4-KEY6-RAND4` format, maxlength 24)
- **Documentation** — this changelog through 10.7.x; [CONTROLS.md](CONTROLS.md) updated for play/chat/UI layout

## 10.7.3 — Touch layout + ADS + Alt peek

- **Touch controls** — full controller button set (ADS, fire, reload, melee, holster, interact, third eye, vehicle, etc.); drag to arrange in UI **UNLOCK** mode; **+ BTN** adds custom actions
- **PLAY ADS** — LMB aims in FPS play unless Third Eye / Alt peek frees the mouse for UI clicks
- **Alt hold** — temporary Third Eye peek in walk PLAY (best in fullscreen/immersive); release Alt returns to aim

## 10.7.2 — Scene dock strip + UI layout edit

- **Scene dock ◀** collapses entire panel background to tab column (not just contents)
- **UNLOCK / LOCK** hub control — drag corner hubs, FPS HUD, model status bar, chat header, nav brand, touch controls
- Fixed **LOCK** button not working (click capture blocked toggle)

## 10.7.1 — Host codes + GPU compat

- **Room codes** embed name + player key + entropy (`BOB3-K7M2NP-XR8W`); retry on PeerJS ID collision
- **GPU** — `powerPreference: high-performance`; SETUP chip shows WebGL renderer; xAI keys stay per-tab (not synced to guests)

## 10.7.0 — Working folder + AI memory freeze

- **Working folder** scope (SETUP + Agent Portal) — choose what stays loaded during local Ollama runs
- **Freeze screen** during local inference — canvas snapshot, pause loads, park assets, restore after job
- Hooks `OllamaRunQueue` (sequential and parallel local paths)

## 10.6.0 — Model capability matrix + sequential local runs

- Red/yellow/green tier matrix per model × task size
- **Sequential Ollama** queue (one local model at a time); opt-in parallel for strong PCs
- Live **model status HUD** during builds

## 10.5.0 — Game chat + corner hub polish

- **T** opens in-game chat; **/** slash commands; help menu
- L-shaped corner hubs; nav auto-collapse in engine; hub **LOCK** layout (early)
- Dev console removed from default chrome

## 10.4.0 — Agent build quality

- Model tier routing in portal; multi-step builds; code sanitizer + world API prompts
- Build job time limits; Grok fallback on red-tier local models

## 10.3.x — Agent portal + GitHub Pages visitor flow

- Agent Portal auto-detect Grok/Ollama; conversational build intake
- `npm run ollama:serve` CORS proxy for Pages + localhost

## 10.1.1 — Lobby + panel stability

- **Lobby restored** — VOIP open by default, SESSION flow, ENTER + CREATE, starter template visible (no samples yet)
- **Panels fixed** — Compiler/PromptGen always in nav; dock not hidden on load; collapse toggle works both ways
- **Removed auto-popup** — SETUP no longer forces open on session start
- **Deploy fix** — `package-lock.json` synced to package version (CI `npm ci` was failing)

## 10.1.0 — SETUP tab + design brief intake

- **Minimal session UI** — join with sparse chrome; **SETUP** always available (not unlock-on-object)
- **Design brief wizard** — world / character / prop / animation / texture / sound; export targets, poly budget, GIMP/Blender workflow, reference sounds (record/upload)
- **Agent follow-up forms** — agents can return `intake_questions` JSON; user answers in a GrokDevPrompt-style popup before code generates
- **SETUP panel** — Grok key, Ollama tiers, creative watch; advanced dev/training tools collapsed in `<details>`
- **Show all tools** checkbox — opt-in to Compiler, PromptGen, full scene dock

## 10.0.0 — Blank grid rebuild

Focused, smaller default experience. Capabilities (multiplayer, agents, compiler, export, plugins) remain — the **default path** is simpler.

### For users
- **Default world** — blank grid; no bundled showcase props or low-quality starter meshes
- **Host-first lobby** — CREATE SESSION is the primary entry; offline play under "Offline & options"
- **Progressive UI** — scene dock, Compiler, and PromptGen unlock as you build (not shown on day one)
- **Scene dock** — collapse now hides the entire panel; **SCENE** tab on the right edge restores it
- **Removed from default** — Wardenclyffe showcase, survival tour, guided walkthrough on first visit

### Still available
- Multiplayer (PeerJS host/join/spectate)
- Compiler, PromptGen, AI agents (when unlocked or via host session)
- Export pipeline, store scripts, GIMP/Blender plugins (see `docs/`)
- TC Circuit demo (lobby → Offline & options)

### Developers
- Starter scene modules no longer imported at engine boot (smaller initial bundle)
- New: `src/shared/starterGrid.js`, `src/shared/progressiveUi.js`
- Version bump: `10.0.0`

---

Older release notes (9.x) are archived in git history prior to this rebuild.