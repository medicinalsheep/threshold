# Threshold Roadmap (v10.8+)

**Current:** 10.12.23 · **Live:** https://medicinalsheep.github.io/threshold/

Forward-looking plan after the 10.0 blank-grid rebuild and 10.7 agent/UI polish. Historical phase checklists (v3–9) live in [`old/docs/`](../old/docs/).

**Snapshot:** [CAPABILITIES.md](CAPABILITIES.md) · **Changelog:** [CHANGELOG.md](CHANGELOG.md) · **Vision:** [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md)

---

## Shipped (10.0 → 10.7)

| Version | Focus |
|---------|-------|
| **10.0** | Blank grid default; progressive UI unlock; host-first lobby |
| **10.1** | SETUP tab; design brief intake; agent follow-up forms |
| **10.3–10.4** | Agent Portal; Grok/Ollama auto-detect; build quality sanitizer |
| **10.5** | Corner hub UI; in-game chat (`T`); hub LOCK layout |
| **10.6** | Model capability matrix; sequential Ollama queue |
| **10.7** | Working folder + AI memory freeze; room codes; touch + UNLOCK layout; Alt peek + ADS |

UI reference: [UI_AND_AGENTS.md](UI_AND_AGENTS.md) · Controls: [CONTROLS.md](CONTROLS.md)

---

## 10.8 — Doc hygiene + brand preview ✅

- Archive superseded phase docs → `old/docs/`
- Truth-pass active guides for blank grid + Agent Portal + corner hubs
- Favicon ladder + `og:*` meta from `icons/appicon512.png`
- New lean `ROADMAP.md` replaces `NEXT_PHASES.md` role

## 10.8.1 — Delete fix ✅

- Recursive pick + root resolve for GLTF/groups; proper dispose on delete

## 10.8.2 — Solo BUILD default + PLAY hint ✅

- **ENTER →** forces BUILD; PLAY mode shows edit hint banner
- `createObject` / GLTF insert guarded in PLAY (parity with delete)

---

## 10.9.0 — Lighter first-run + passcode ✅

- Explore-first: no auto-open Agent Portal; pulse AI + status
- Deferred graphics tier prompt (first PLAY or ENV)
- Action hint copy aligned to corner hubs
- Optional host passcode at CREATE; changeable in PLAYERS panel

## 10.9.1 — Touch picker + lobby invite ✅

- In-app touch action picker (replaces `window.prompt` on **+ BTN**)
- Post-CREATE invite panel — room code, link, copy buttons before enter
- Join hints for invite links and room code format

---

## 10.11.0 — Quality-first purge ✅

- **Showcase removed** — INSERT SHOWCASE tab, survival/ambient inspector fields, survival HUD/run card
- **Texture quality floor** — minimum 1K HILOD tier; Lite tier bumped to 1K; grid pad wires `Starter Ground` PBR
- **AI quality gate** — Agent Portal + SETUP brief ask poly budget, texRes, GIMP/Blender workflow before codegen
- **Archive** — `REALISTIC_GAMEPLAY.md`, `AMBIENT_ASSETS_ROADMAP.md`, showcase modules → `old/`

## 10.11.1 — Manifest + starter prune ✅

- **Manifest** — 100 → 25 texture entries; `_512` variants removed; grid + TC + avatar slots only
- **Starter modules** — 14 unused Wardenclyffe builders → `old/src/shared/`
- **`npm run manifest:prune`** — repeatable cleanup script

## 10.11.2 — 2K defaults + compression pipeline ✅

- **`textures:gen:default`** — 2K masters for Starter Ground + AI Build Station
- **`textures:hilod`** — master PNG → `_1k`/`_2k` tiers; watch auto-runs on GIMP save
- **WebP sidecars** — compressed delivery for Lite/Mobile tiers (per-tier encode caps)

## 10.11.3 — Production plan + agent prompts ✅

- **Pipeline order** — scope → collision → mesh → textures → HILOD → weather → interact → codegen → verify
- **Review gate** — SETUP brief Step 3: interior/exterior, weather variants, surfaceType, collision
- **Agent prompts** — Portal + design agent embed engine texture/weather/collision rules

## 10.12.6 — Creator loop + engines ✅

- **Walkthrough/export** — web-first solo path; native targets optional in wizard + design brief
- **engines** — Node >= 22; audit risks documented (dev tooling only)

## 10.12.5 — CI verify + survival dev pack ✅

- **CI** — version drift + portal/controls/tc verifies before Pages deploy
- **dev/survival** — opt-in vitals pack (`npm run dev:survival`); not in default bundle

## 10.12.4 — Engine split + version sync ✅

- **main.js** — 3k lines → bootstrap; subsystems in `src/engine/*.js`
- **CONSOLIDATION_PLAN.md** — multi-phase review action plan
- **npm run version:sync** — doc + package version alignment from `config.js`

## 10.12.3 — Guest immersive replay ✅

- **immersiveReplay.js** — re-apply weather, audio zones, shader hooks/graphs on sync + manifest load
- **Sync.capture** — includes `immersive` block for MP guest FULL_STATE
- **Import** — `.threshold-game.json` manifest imports with immersive prefs
- **Engine tick** — shader hooks/graphs tick in PLAY without requiring AmbientAudio

## 10.12.2 — Shader node graph + export immersive step ✅

- **shaderNodeGraph.js** — sandboxed onBeforeCompile nodes + presets (wet_hero, neon_rim, wind_foliage…)
- **Export wizard** — Step 5 IMMERSIVE: weather/audio/shader preview + slop scan + bundle toggles
- **Manifest** — immersive.prefs control weather/audio/shader bundling for guest replay

## 10.12.1 — Shader hooks + audio zones + agent stability ✅

- **shaderRegistry.js** — 5 sandboxed hooks (wet boost, emissive pulse, dust, snow, heat shimmer)
- **audioZoneSystem.js** — `userData.audioZone` drives spatial ambient loops from scene meshes
- **Export manifest** — `immersive` block: weather, audioZones, shaderHooks for MP replay
- **10.10 partial** — GLTF freeze restore hardening; parallel Ollama guard; Alt fullscreen peek (SETUP)

## 10.12.0 — Creative OS gate + immersive prep ✅

- **Generation gate** — Portal GENERATE + SETUP RUN AGENT blocked until production plan complete (`validateProductionReady`)
- **11-step pipeline** — adds atmosphere + material presets before interact/codegen/verify
- **Weather runtime** — dust (`dustExposure`) + snow (`snowCap`) material passes in `weatherSystem.js`
- **Shader registry** — `materialPresets.js` — agent-directed MeshStandard presets, no CanvasTexture slop
- **Slop scan** — `assessSceneSlop` wired into export preflight (procedural textures, missing surfaceType)
- **PromptGen parity** — injects design brief production plan + material preset block
- **Vision doc** — [CREATIVE_OS.md](CREATIVE_OS.md) — north star for planned generation

---

## 10.10 — Agent stability (remaining)

| Item | Deliverable |
|------|-------------|
| AI memory freeze | ✅ GLTF path restore + placeholder fallback (10.12.1) |
| Native fullscreen | ✅ SETUP toggle Alt peek → Fullscreen API (10.12.1) |
| Parallel Ollama guard | ✅ Warn/block heavy GLB + full world (10.12.1) |

---

## Open / deferred (unpolished)

| Area | Notes |
|------|-------|
| **10.10** agent stability | AI memory freeze GLTF edge cases; native fullscreen peek; parallel Ollama guard |
| GIMP hero pass | ✅ v10.12.16 procedural hero upgrade (joints/kiosk); hand-paint optional via GIMP SYNC |
| Doc version sync | `README.md`, `CAPABILITIES.md`, `GETTING_STARTED.md` still drift from live version |
| `controls:verify` / `store:verify` | ✅ re-run 10.12.15 (store chunk hash fix) |
| Mouse mode without Third Eye highlights | ✅ v10.12.14 — **M** UI mouse + Alt peek (no highlights); F = Third Eye awareness |
| `intent_classify` router | ✅ v10.12.7 — `intentRouter.js` + game chat routing |
| Store upload automation | Signing keys remain local; upload manual |
| Training dataset growth | ✅ waves 1–4 + `train:mini` + `ollama:golden` (10.12.13); grow via Compiler EXPORT TRAINING PAIR |
| Local Ollama tier picks (2060) | ✅ `ollama:benchmark --all` + `laptop2060Defaults`; client `think:false` + num_ctx |
| macOS notarization | Planned |
| AWS relay polish | ✅ v10.12.7 — Docker/PM2/nginx + relay:verify |
| Trellis/Veo-class models | Listed in `models-registry.json` |
| TC reference edition | Lobby **TC →** path kept; separate from default grid |

---

## Verify before ship

```bash
npm run build
node scripts/portal-ui-verify.cjs
npm run controls:verify
npm run store:verify    # optional packaging smoke
```

---

## Archive

| Doc | Location |
|-----|----------|
| `NEXT_PHASES.md` (v3–9 history) | `old/docs/` |
| `POLISH_ROADMAP.md` (sprints K–U) | `old/docs/` |
| `PHASE_13_STABILITY.md` | `old/docs/` |
| `PHASE_18_TESLA_LAB.md` | `old/docs/` |
| `DEFAULT_ASSETS_ROADMAP.md` | `old/docs/` |
| `REALISTIC_GAMEPLAY.md` | `old/docs/` |
| `AMBIENT_ASSETS_ROADMAP.md` | `old/docs/` |
| `showcaseSnippets.js`, `showcaseGateway.js` | `old/src/shared/` |
| Wardenclyffe `starter*.js` builders (14 files) | `old/src/shared/` |