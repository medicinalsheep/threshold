# Threshold — Progress & Capabilities (v10.14)

**Live:** https://medicinalsheep.github.io/threshold/ · **Version:** 10.14.4

Single progress snapshot — what ships today, how the pieces connect, and what is next.

**Build from:** [BUILD_FROM.md](BUILD_FROM.md) · **Forward plan:** [ROADMAP.md](ROADMAP.md) · **UI:** [UI_AND_AGENTS.md](UI_AND_AGENTS.md) · **Accounts:** [AUTH.md](AUTH.md)

---

## Default experience (10.0+)

| Capability | Module / doc |
|------------|--------------|
| Blank grid spawn | `starterScene.js`, `starterTemplates.js` |
| Lobby (ENTER primary) | `lobby/main.js` — solo **ENTER** · CREATE optional multiplayer |
| Progressive UI unlock | Scene dock, Compiler, PromptGen opt-in |
| Surface profiles | `surfaceProfile.js` — player / creator / full (`?surface=`) · mobile → player |
| Agent Portal | `agentPortal.js` — Grok/Ollama auto-detect (**creator** surface; skipped on player) |
| Corner hub UI | `hubLayout.js` — PLAY/EDIT, TOOLS, SCENE menus |
| Room codes + passcode | `roomCode.js`, `hostPasscode.js` |
| Grok API (optional) | BYO key — [AUTH.md](AUTH.md) |
| Short hub tour | `walkthrough.js` — ~3 steps |

---

## Content layers

| Layer | Entry | What you get |
|-------|-------|--------------|
| **Your game** | BUILD + Portal | Blank grid, quality-gated AI, GIMP/Blender PBR, export |
| **TC editions** | Lobby → **TC DEMO** | Vehicles, NPCs, circuit — bundled reference only |

Policy: [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md) · Showcase/survival docs archived in `old/docs/`

---

## Play & realism

| Capability | Module / doc |
|------------|--------------|
| TPS / FPS + ADS | `player.js`, `fpsViewmodel.js` — LMB aim · RMB shoot |
| UI mouse / Third Eye | `thirdEye.js` — **M** / Alt peek; **F** Third Eye |
| Walk / sprint / crouch / stealth | `controls.js` — stealth on **U** hold |
| Touch controls | `touchControls.js` — practical pad v4, UNLOCK drag |
| Avatar LOD + MOD gear | `avatarMod.js`, LOD GLBs, `generation-policy.json` |
| Weather | `weatherSystem.js` |
| F interact | `worldInteract.js` |
| TC circuit + drive | `tcCircuit.js`, `tcDrive.js` |
| Graphics tiers | `graphicsProfile.js` — PBR default; retro opt-in |
| Workspace pad + kit | Concrete deck · crate/sphere/ramp/hinge · ENTER PLAY; [PHYSICS.md](PHYSICS.md) |
| Physics / joints | Mass·friction live · hinge/lock · gravity UI; `physics:verify` |
| Avatar defaults | Realistic skin/fabric + normals · starter outfit · multi-LOD walk pose |
| Pages deploy | Stale-chunk auto-reload · CI skips full texture regen |
| Negative LOD (far unlit) | ~100m · **light bake** · mesh/HILOD first · static auto · multi-mat · floor B/**C**; [NEGATIVE_LOD.md](NEGATIVE_LOD.md) |
| E5 remotes / bloom | Far remote lerp · bloom skip Lite/no emissive |
| Perf measure | `perfHarness.js` — SETUP → PERF · HUD · `npm run perf:harness` (CI) |
| Visibility E0–E4 | `visibilitySystem.js` — frustum×distance · sleep · env · **spatial buckets** |
| Vis gates (E1) | MeshLod / HILOD / idle / spin / NPC anim skip off-screen |
| Vis sleep (E2) | D/E shadow dim · E physics sleep · selection wake |
| Vis env (E3) | Weather/shader/audio zone skip off-screen |
| Vis spatial (E4) | Cell buckets when objects ≥120 · full sweep every 45 frames |

[CONTROLS.md](CONTROLS.md)

---

## Create & edit

| Capability | Module / doc |
|------------|--------------|
| Agent Portal + SETUP | `agentPortal.js`, scene dock SETUP tab |
| Tiered agents + freeze | `agentRouter.js`, `aiMemoryFreeze.js`, `ollamaRunQueue.js` |
| Generation intensity / MOD policy | `generation-policy.json`, agent reasoning |
| Working folder scope | `workFolderScope.js` — memory prefs during Ollama |
| Compiler + scene undo | `compiler/main.js`, `sceneHistory.js` |
| PromptGen + EXAMPLES | `prompter/main.js`, `promptCookbook.js` |
| GIMP live SYNC | `creativeWatch.js`, `textureBridge.js` |
| Material library | `materialPresets.js` + `materialLibrary.js` — [MATERIALS.md](MATERIALS.md) |
| Blender GLB + LOD | `blender-export.cjs`, `meshLod.js` |
| UI layout edit | `hubLayout.js` — UNLOCK/LOCK corner hubs |
| Scene dock strip | `panelDrag.js` — ◀ collapses to tab column |

[CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) · [AGENT_ROUTING.md](AGENT_ROUTING.md)

---

## Multiplayer & session

| Capability | Module / doc |
|------------|--------------|
| PeerJS rooms | `network.js` — host start **12s timeout** |
| Host-authoritative sync | `sync.js`, `actions.js` |
| Host migration handoff | `hostMigration.js` |
| Optional host passcode | Lobby More options + PLAYERS panel |
| VOIP proximity + PTT | `voip.js` — mic after start; PTT default **N** |
| Spectate mode | `spectate/main.js` |
| xAI keys per tab | `sessionStorage` — not synced to guests |


---

## Ship & store

| Capability | Command / doc |
|------------|---------------|
| 9-step EXPORT wizard | TOOLS → EXPORT — [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) |
| Quick EXPORT & PLAY | `quickExportPlay.js` |
| Store orchestrator | `npm run store:ship -- --manifest game.json --targets win` |
| Store metadata | `npm run store:prep` · `store:assets` · `store:upload` |
| Android / Windows / iOS / Steam | `package:*` · `package:steam` · `steam:depot` |
| macOS notarize | [MAC_NOTARIZE.md](MAC_NOTARIZE.md) · `mac:notarize:check` · `mac:staple` |
| Store verify smoke | `npm run store:verify` |

---

## Agents & training

| Capability | Module / command |
|------------|------------------|
| Agent status + GPU chip | `agentStatus.js` |
| Sequential Ollama queue | `ollamaRunQueue.js` |
| Capability matrix | Red/yellow/green per model × tier |
| Mini models (GitHub) | `npm run models:mini` · **wave5** `train:mini -- --wave5` |
| Benchmarks | `npm run ollama:benchmark` · `ollama:golden` |
| Ollama CORS proxy | `npm run ollama:serve` → `:11435` (Pages + localhost); not plain `ollama serve` |
| Play surface Ollama | **No probe** on player surface (avoids mobile CORS noise) |

[MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) · [BOOTCAMP.md](BOOTCAMP.md)

---

## Performance (v10.13)

| Layer | Status |
|-------|--------|
| Code-split after lobby | `app-engine`, `app-compiler`, `app-prompter`, vendors |
| Neg LOD stack | ~100m · light bake · tiers 72–165 · HILOD/mesh 18/48 first · floor B/**C** |
| Visibility E0–E4 | near 100 / sleep 145 · gates · sleep · env · spatial |
| E5 | Far remotes · bloom skip |
| Materials | Presets + starter maps · [MATERIALS.md](MATERIALS.md) |
| Measure | SETUP → PERF · `perf:harness` · `negative-lod:verify` |

Details: [PERF_NEXT.md](PERF_NEXT.md) · [NEGATIVE_LOD.md](NEGATIVE_LOD.md)

---

## Verify commands

```bash
npm run assets:verify
npm run tc:verify
npm run controls:verify
npm run store:verify
npm run ollama:verify
npm run version:sync:check
node scripts/portal-ui-verify.cjs
node scripts/negative-lod-verify.cjs
node scripts/surface-verify.cjs
npm run perf:verify
npm run perf:harness            # browser; needs puppeteer
npm run mac:notarize:check      # env only (no secrets printed)
npm run build
```

---

## Related

- [BUILD_FROM.md](BUILD_FROM.md) — one-page spine
- [docs/README.md](README.md) — doc index
- [ROADMAP.md](ROADMAP.md) — v10.8+ forward plan
- [CHANGELOG.md](CHANGELOG.md) — version history
- [AUTH.md](AUTH.md) — optional Grok API key (no X OAuth)
- [UI_AND_AGENTS.md](UI_AND_AGENTS.md) — surfaces, hubs, portal
- [STORE_RELEASE.md](STORE_RELEASE.md) · [MAC_NOTARIZE.md](MAC_NOTARIZE.md)
- [AGENTS.md](../AGENTS.md) — contributor map
- [old/docs/](../old/docs/) — archived phase history
