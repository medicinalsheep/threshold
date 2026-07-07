# Changelog

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