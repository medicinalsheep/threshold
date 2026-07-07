# Threshold — Progress & Capabilities (v9.16)

**Live:** https://medicinalsheep.github.io/threshold/ · **Version:** 9.16.0

This page is the **single progress snapshot** — what ships today, how the pieces connect, and what is next.

---

## Three content layers

| Layer | Entry | What you get |
|-------|-------|--------------|
| **Showcase site** | Lobby → **PLAY/BUILD** → **ENTER** | Wardenclyffe lab GLBs, survival loop, weather, gateway, Nikola |
| **TC editions** | Lobby → **TC →** | Vehicles, NPCs, circuit, export demo — original bundled reference |
| **Your game** | BUILD + EXPORT | GIMP/Blender art, agents, manifest → store packages |

Policy: shipped TC content is **original Threshold art** only — [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md).

---

## Session & onboarding

| Capability | Module / doc |
|------------|--------------|
| PLAY / BUILD gate | `guidedSession.js`, lobby mode picker, `?mode=play\|build` |
| 6-step guided tour | `walkthrough.js` — mode-aware highlights |
| Action hints + side quests | `actionHints.js`, TC quest card, Survival Run card |
| Guest / spectate inherit host | `guidedSession.js`, `spectate/main.js` |
| Session prefs persist | `viewPrefs.js` — mode, tour, HUD toggles |

---

## Play & realism

| Capability | Module / doc |
|------------|--------------|
| TPS / FPS + ADS | `player.js`, `fpsViewmodel.js` — **LMB aim · RMB shoot** |
| Walk / sprint / crouch / stealth | `player.js`, `controls.js` |
| Survival vitals (6 stats) | `survivalNeeds.js`, `survivalZones.js`, `survivalInteract.js` |
| Survival gameplay loop | `survivalGameplay.js` — run quest, Nikola bark, night drain |
| Vitals HUD + guest toggle | `survivalNeedsHud.js`, PLAYERS panel |
| MP vitals sync | `sync.js` `avatar.v`, `remotePlayers.js` pill |
| Weather + ambient zones | `weatherSystem.js`, starter site modules |
| Third Eye + F interact | `thirdEye.js`, `worldInteract.js` |
| TC circuit + drive | `tcCircuit.js`, `tcDrive.js`, `tcGateFx.js` |
| Footsteps + surface SFX | `footsteps.js`, `starterSfx.js` |
| Graphics tiers | `graphicsProfile.js` — Lite/Mobile/Realistic/Ultra (all PBR; retro opt-in) |

Full guide: [REALISTIC_GAMEPLAY.md](REALISTIC_GAMEPLAY.md) · Controls: [CONTROLS.md](CONTROLS.md)

---

## Create & edit

| Capability | Module / doc |
|------------|--------------|
| SCENE dock (ENV / EDIT / SKIN) | `sceneDock.js`, inspector hooks |
| INSERT SHOWCASE snippets | `showcaseSnippets.js` — gateway, terminals, survival props |
| PromptGen + EXAMPLES | `prompter/main.js`, `promptCookbook.js` |
| Compiler + scene undo | `compiler/main.js`, `sceneHistory.js` |
| GIMP live SYNC | `creativeWatch.js`, `textureBridge.js` |
| Blender GLB + LOD | `blender-export.cjs`, `meshLod.js` |
| Texture HILOD + WebP/KTX2 | `textureHilod.js`, `tc-gen-tex.cjs` |
| AI tab (tiered agents) | `agentRouter.js`, `agentStatus.js` — SCENE → **AI** tab |
| NPC chat + SMART DEV | `npcAgent.js`, `ollama/devAgent.js` — Ollama or Grok via router |
| PromptGen tiered run | `prompter/main.js` → `prompter_generate` large tier |

Workflow: [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) · Agents: [AGENT_ROUTING.md](AGENT_ROUTING.md) · Assets: [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md)

---

## Multiplayer & session

| Capability | Module / doc |
|------------|--------------|
| PeerJS rooms | `network.js` |
| Host-authoritative sync | `sync.js`, `actions.js` |
| Live avatar + vehicle claims | `LIVE_STATE`, `tcDrive.js` |
| Host migration handoff | `hostMigration.js` — vitals + sessionMode |
| Guest rebuild telemetry | `guestRebuildTelemetry.js` |
| VOIP proximity | `voip.js`, lobby VOIP config |
| Spectate mode | `spectate/main.js` — host vitals banner |

Scope doc: [syncStory.js](../src/shared/syncStory.js) (in-engine SYNC STORY panel)

---

## Ship & store

| Capability | Command / doc |
|------------|---------------|
| 9-step EXPORT wizard | MORE → EXPORT — target-filtered SHIP CLI — [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) |
| Quick EXPORT & PLAY | `quickExportPlay.js` |
| Asset bundle | `npm run bundle:assets` |
| Graphics profiles | `npm run export:graphics -- --profile android\|ios\|windows\|steam` |
| Store metadata | `npm run store:prep` |
| Store asset packs | `npm run store:assets` |
| Android AAB | `npm run package:android:release` |
| Windows portable + NSIS | `npm run package:win` |
| iOS scaffold | `npm run package:ios` (archive needs macOS) |
| Steam depot | `npm run package:steam`, `npm run steam:depot` |
| TC full ship path | `npm run tc:ship` |
| Store verify smoke | `npm run store:verify` |
| Native web build | `npm run build:electron` (relative chunks) |

**Store verify re-passed (v9.16)** — [STORE_VERIFY.md](STORE_VERIFY.md) ✅

---

## Agents & training (v9.12–9.16)

| Capability | Module / command |
|------------|------------------|
| Agent status chips | `agentStatus.js` — Grok, Ollama, watch, textures |
| Tiered task router | `agentRouter.js`, `config/agent-tasks.json` |
| Workflow benchmarks | `agentBenchmark.js`, `npm run ollama:benchmark` |
| Mini models (GitHub) | `training/bootcamp/`, `npm run models:mini` |
| Large models (local pull) | `npm run models:large -- --yes` |
| Realism-first prompts | `agentPrompts.js` — PBR default; retro opt-in |
| Streamlined dev doc | [STREAMLINED_DEV.md](STREAMLINED_DEV.md) |
| Model distribution policy | [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) |

---

## Performance (v9.9+)

| Before | After Sprint T |
|--------|----------------|
| ~1.9 MB monolithic `threshold.js` | ~24 kB entry + cached vendor chunks |
| Eager engine load | Lazy engine/compiler/prompter after lobby **ENTER** |

Chunks: `vendor-three`, `vendor-physics`, `vendor-peer`, `app-engine`, `app-compiler`, `app-prompter`

---

## Polish sprint progress (v9.0–9.10)

```
K → L → M → Q → N → O → P → R → S → V → T → W → U ✅
```

| Sprint | Version | Focus |
|--------|---------|-------|
| K | 9.0 | Guided PLAY/BUILD |
| L | 9.2 | Showcase visuals |
| M | 9.3 | Onboarding polish |
| N | 9.4 | Survival depth |
| O | 9.5 | Creator tooling |
| P | 9.6 | MP session polish |
| R | 9.6.1 | Doc truth (v9.6) |
| S | 9.7 | Survival gameplay loop |
| V | 9.8 | Action controls + doc cleanup |
| T | 9.9 | JS chunk split |
| W | 9.10 | Hygiene + capabilities outline |
| U | 9.11 | Store/native verify pass |
| — | 9.12 | Streamlined export + agent status panel |
| — | 9.13 | Tiered agent router + Ollama benchmarks |
| — | 9.14–9.16 | Training bootcamp + mini models on GitHub |
| — | 9.15 | Realism-first graphics (all tiers PBR) |

Detail: [POLISH_ROADMAP.md](POLISH_ROADMAP.md) · History: [CHANGELOG.md](CHANGELOG.md)

---

## Verify commands

```bash
npm run assets:verify      # starter pipeline smoke
npm run tc:verify          # TC GLBs + textures
npm run tc:ship:verify     # export bundle smoke
npm run controls:verify    # binding defaults + doc truth
npm run store:verify       # Sprint U packaging smoke
npm run ollama:verify      # local LLM smoke
npm run ollama:benchmark   # rank models for workflows
npm run models:mini        # install mini agents from GitHub recipes
npm run build              # GitHub Pages chunk split
npm run build:electron     # native-relative chunks
```

---

## Related

- [docs/README.md](README.md) — doc index
- [NEXT_PHASES.md](NEXT_PHASES.md) — long-form phase history
- [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) — north star
- [AGENTS.md](../AGENTS.md) — contributor map