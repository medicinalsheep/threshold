# Threshold Suite — Agent & Developer Guide

Browser-first 3D sandbox with PeerJS multiplayer, Compiler, PromptGen, GIMP/Blender creative pipeline, realism starter defaults (TPS/FPS/ADS/footsteps), tiered local/cloud agents, and store/Steam export.

**Version:** `src/config.js` → `VERSION` (currently **10.7.4**)

**Doc index:** [docs/README.md](docs/README.md) — full scope map

---

## Architecture

| Area | Path |
|------|------|
| Lobby | `src/lobby/` |
| Engine | `src/engine/main.js` |
| Starter scene | `src/shared/starterScene.js`, `starterTemplates.js`, `showcaseGateway.js` |
| Guided session | `src/shared/guidedSession.js`, `walkthrough.js`, `actionHints.js` |
| Survival | `survivalNeeds.js`, `survivalZones.js`, `survivalWorldHooks.js`, `survivalNeedsHud.js`, `survivalGameplay.js` |
| Showcase | `showcaseGateway.js`, `showcaseSnippets.js`, `starterScene.js` |
| MP session | `network.js`, `sync.js`, `remotePlayers.js`, `hostMigration.js`, `syncStory.js` |
| Realism | `player.js`, `fpsViewmodel.js`, `footsteps.js`, `npcPatrol.js` |
| Graphics | `graphicsProfile.js`, `renderModes.js` — PBR default; retro opt-in |
| Compiler | `src/compiler/main.js` |
| PromptGen | `src/prompter/main.js` |
| Agent router | `src/shared/agentRouter.js`, `agentPrompts.js`, `agentStatus.js` |
| Ollama client | `src/shared/ollamaClient.js`, `src/ollama/devAgent.js` |
| Grok agents | `src/grok/client.js`, `npcAgent.js`, `devAgent.js` |
| Multiplayer | `src/shared/network.js`, `sync.js`, `actions.js` |
| Creative | `textureBridge.js`, `gltfImport.js`, `creativeWatch.js` |
| Export | `gameExport.js`, `exportWizard.js`, `exportWalkthrough.js` |
| Store / Steam | `scripts/store-*.cjs`, `scripts/steam-*.cjs`, `electron/steam*.cjs` |
| Training bootcamp | `training/bootcamp/`, `scripts/bootcamp-*.cjs`, `scripts/models-*.cjs` |
| Model registry | `config/models-registry.json`, `config/agent-tasks.json` |
| TC assets | `tcShow.js`, `tcVeh.js`, `tcChr.js`, `tcSfx.js`, `tcLite.js`, `tcMeta.js` |
| Asset gen | `scripts/tc-gen-tex.cjs`, `gen-starter-avatar.cjs`, `gen-starter-sfx.cjs` |
| Starter kit | `config/starter-kit.json`, `export-starter-kit.cjs` |
| Native | `electron/`, `capacitor.config.json`, `thresholdShell.js` |
| Plugins | `plugins/threshold-gimp/`, `plugins/threshold-blender/` |
| Legacy archive | `old/` — pre-tc-* editions, R2 child-vehicle scripts |

---

## Commands

```bash
npm run quickstart              # onboarding (+ --verify / --pack)
npm run dev                     # Vite dev
npm run build                   # GitHub Pages → dist-pages/
npm run preview                 # :4173 smoke test
npm run assets:pack             # tex + avatars + sounds + webp + build + bundle + kit
npm run assets:verify           # starter smoke test
npm run textures:watch          # GIMP live SYNC (with dev)
npm run kit:export              # fork-friendly WebP pack
npm run kit:verify
npm run gimp:install
npm run blender:install
npm run blender:avatar -- --blend file.blend --object Armature
npm run blender:export -- --blend file.blend --object "Name"
npm run bundle:assets
npm run tc:build
npm run tc:verify
npm run tc:ship
npm run tc:ship:verify
npm run controls:verify         # binding defaults + doc truth
npm run store:verify            # packaging E2E smoke
```

### Agents & Ollama

```bash
ollama serve
npm run ollama:verify           # local LLM smoke
npm run ollama:benchmark        # rank models → dist-store/ollama-benchmark.json
```

Copy `.env.local.example` → `.env.local` for `VITE_OLLAMA_URL` and optional `VITE_OLLAMA_TIER_*` defaults.

### Training bootcamp

```bash
npm run bootcamp:build          # JSONL → Modelfiles in training/bootcamp/
npm run models:mini             # threshold-mini-npc + threshold-mini-dev (canonical)
npm run models:large -- --yes   # optional threshold-dev + threshold-large-scenes
npm run bootcamp:import -- --file training/bootcamp/datasets/raw/pair.json
# or: --input "..." --output "..." · UI: SCENE → AI → EXPORT TRAINING PAIR
```

`bootcamp:create` is a deprecated alias for `models:mini` (+ `--large` → `models:large`).

Weights stay in `~/.ollama/models` — never commit GGUF or API keys. See [docs/MODEL_DISTRIBUTION.md](docs/MODEL_DISTRIBUTION.md).

---

## Export walkthrough (9 steps)

`MORE → EXPORT`: **INFO → ICONS → SCENE → CREDITS → REVIEW → TARGETS → STORE → PACKS → SHIP**

TARGETS defaults to **Web only**. SHIP shows target-filtered `package:*` commands and a secrets checklist.

Manifest includes `branding`, `credits`, `assetRegistry`, `assetOpportunity`, `store`. Post-download: `store:prep`, `store:assets`, `package:*` or `package:steam`.

---

## Agent UI

**SCENE dock → AI tab** (panel header: AGENTS)

- Status chips: Grok, Ollama, creative watch, textures, local script agent
- Tier dropdowns: Small / Medium / Large → **SAVE TIERS**
- **RUN BENCHMARK** — in-browser workflow probes
- **SMART DEV** — tiered `dev_suggest` via `AgentRouter`
- **GROK DEV** / **OLLAMA DEV** — force provider (bypass tier auto-pick)
- PromptGen **RUN AGENT (tiered)** — large tier scene scripts

Config: `config/agent-tasks.json` · Prompts: `src/shared/agentPrompts.js`

---

## Multiplayer rules

- Host-authoritative via PeerJS
- Guests use `Actions.dispatch()` — do not mutate world directly
- Sync includes `userData` (texture IDs, gltfPath, physics)
- Creative files ship via `npm run bundle:assets` → `dist-pages/bundle/`

---

## Asset naming contract

Object **Name** in Engine inspector must match GIMP/Blender export slug:

| Tool | Name `Stone Block` | Files |
|------|-------------------|-------|
| GIMP | `objectName` | `textures/stone_block_albedo.png` |
| Blender | `--object "Stone Block"` | `import/stone_block.glb` |
| Starter | `config/starter-textures.json` | UV repeat + preset bind |

Live manifest: `textures/threshold_manifest.json` (not `old/plugins/...` sample).

---

## Docs map

| Doc | Purpose |
|-----|---------|
| [docs/README.md](docs/README.md) | **Full scope index** |
| [README.md](README.md) | Quick start + capabilities |
| [docs/STREAMLINED_DEV.md](docs/STREAMLINED_DEV.md) | Lobby → agents → export path |
| [docs/AGENT_ROUTING.md](docs/AGENT_ROUTING.md) | Tiered router, benchmarks, providers |
| [docs/MODEL_DISTRIBUTION.md](docs/MODEL_DISTRIBUTION.md) | GitHub vs local weights policy |
| [docs/BOOTCAMP.md](docs/BOOTCAMP.md) | Training bootcamp quick start |
| [docs/REALISTIC_GAMEPLAY.md](docs/REALISTIC_GAMEPLAY.md) | Action controls, starter scene |
| [docs/ASSET_CAPABILITIES.md](docs/ASSET_CAPABILITIES.md) | HILOD, codecs, presets, kit |
| [docs/GIMP_TEXTURES.md](docs/GIMP_TEXTURES.md) | GIMP install + live SYNC |
| [docs/BLENDER_AVATARS.md](docs/BLENDER_AVATARS.md) | Rigged GLB export |
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Lobby → ship path |
| [docs/EXPORT_WALKTHROUGH.md](docs/EXPORT_WALKTHROUGH.md) | 9-step export wizard |
| [docs/THRESHOLD_CHILD_ASSETS.md](docs/THRESHOLD_CHILD_ASSETS.md) | TC original-asset policy |
| [docs/REFERENCE_EDITIONS.md](docs/REFERENCE_EDITIONS.md) | TC edition registry |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Version history |
| [old/README.md](old/README.md) | Archived legacy files |

---

## Contributing

Vanilla JS + Vite. No React. One SPA for web, Capacitor, Electron. Update [docs/CHANGELOG.md](docs/CHANGELOG.md) when shipping features. **Shipped TC editions must be original Threshold content** — see `docs/THRESHOLD_CHILD_ASSETS.md`. External seeds are dev-only in `reference/_dev-seeds/`.