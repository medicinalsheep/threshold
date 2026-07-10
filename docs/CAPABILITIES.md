# Threshold — Progress & Capabilities (v10.12)

**Live:** https://medicinalsheep.github.io/threshold/ · **Version:** 10.12.25

Single progress snapshot — what ships today, how the pieces connect, and what is next.

**Forward plan:** [ROADMAP.md](ROADMAP.md) · **UI reference:** [UI_AND_AGENTS.md](UI_AND_AGENTS.md)

---

## Default experience (10.0+)

| Capability | Module / doc |
|------------|--------------|
| Blank grid spawn | `starterScene.js`, `starterTemplates.js` |
| Host-first lobby | `lobby/main.js` — CREATE SESSION primary |
| Progressive UI unlock | Scene dock, Compiler, PromptGen opt-in |
| Agent Portal on ENTER | `agentPortal.js` — Grok/Ollama auto-detect |
| Corner hub UI | `hubLayout.js` — PLAY/EDIT, TOOLS, SCENE menus |
| Room codes | `roomCode.js` — `NAME4-KEY6-RAND4` format |
| Short hub tour | `walkthrough.js` — 3 steps (not showcase walkthrough) |

---

## Content layers

| Layer | Entry | What you get |
|-------|-------|--------------|
| **Your game** | BUILD + Portal | Blank grid, quality-gated AI, GIMP/Blender PBR, export |
| **TC editions** | Lobby → **TC →** | Vehicles, NPCs, circuit — bundled reference only |

Policy: [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md) · Showcase/survival docs archived in `old/docs/`

---

## Play & realism

| Capability | Module / doc |
|------------|--------------|
| TPS / FPS + ADS | `player.js`, `fpsViewmodel.js` — LMB aim · RMB shoot |
| Alt peek / Third Eye | `thirdEye.js` — Alt hold peek in immersive |
| Walk / sprint / crouch / stealth | `controls.js` — stealth on **U** hold |
| Touch controls | `touchControls.js` — full pad, UNLOCK drag layout |
| Weather | `weatherSystem.js` |
| F interact | `worldInteract.js` |
| TC circuit + drive | `tcCircuit.js`, `tcDrive.js` |
| Graphics tiers | `graphicsProfile.js` — PBR default; retro opt-in |

[CONTROLS.md](CONTROLS.md)

---

## Create & edit

| Capability | Module / doc |
|------------|--------------|
| Agent Portal + SETUP | `agentPortal.js`, scene dock SETUP tab |
| Tiered agents + freeze | `agentRouter.js`, `aiMemoryFreeze.js`, `ollamaRunQueue.js` |
| Working folder scope | `workFolderScope.js` — memory prefs during Ollama |
| Compiler + scene undo | `compiler/main.js`, `sceneHistory.js` |
| PromptGen + EXAMPLES | `prompter/main.js`, `promptCookbook.js` |
| GIMP live SYNC | `creativeWatch.js`, `textureBridge.js` |
| Blender GLB + LOD | `blender-export.cjs`, `meshLod.js` |
| UI layout edit | `hubLayout.js` — UNLOCK/LOCK corner hubs |
| Scene dock strip | `panelDrag.js` — ◀ collapses to tab column |

[CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) · [AGENT_ROUTING.md](AGENT_ROUTING.md)

---

## Multiplayer & session

| Capability | Module / doc |
|------------|--------------|
| PeerJS rooms | `network.js` |
| Host-authoritative sync | `sync.js`, `actions.js` |
| Host migration handoff | `hostMigration.js` |
| VOIP proximity | `voip.js` |
| Spectate mode | `spectate/main.js` |
| xAI keys per tab | `sessionStorage` — not synced to guests |

---

## Ship & store

| Capability | Command / doc |
|------------|---------------|
| 9-step EXPORT wizard | TOOLS → EXPORT — [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) |
| Quick EXPORT & PLAY | `quickExportPlay.js` |
| Store metadata | `npm run store:prep` |
| Android / Windows / iOS / Steam | `package:*` scripts |
| Store verify smoke | `npm run store:verify` |

---

## Agents & training

| Capability | Module / command |
|------------|------------------|
| Agent status + GPU chip | `agentStatus.js` |
| Sequential Ollama queue | `ollamaRunQueue.js` |
| Capability matrix | Red/yellow/green per model × tier |
| Mini models (GitHub) | `npm run models:mini` |
| Benchmarks | `npm run ollama:benchmark` |
| Ollama CORS proxy | `npm run ollama:serve` (Pages + localhost) |

[MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) · [BOOTCAMP.md](BOOTCAMP.md)

---

## Performance (v9.9+)

Lazy-loaded chunks after lobby ENTER: `app-engine`, `app-compiler`, `app-prompter`, vendor splits.

---

## Verify commands

```bash
npm run assets:verify
npm run tc:verify
npm run controls:verify
npm run store:verify
npm run ollama:verify
node scripts/portal-ui-verify.cjs
npm run build
```

---

## Related

- [docs/README.md](README.md) — doc index
- [ROADMAP.md](ROADMAP.md) — v10.8+ forward plan
- [CHANGELOG.md](CHANGELOG.md) — version history
- [AGENTS.md](../AGENTS.md) — contributor map
- [old/docs/](../old/docs/) — archived phase history