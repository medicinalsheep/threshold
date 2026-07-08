# Threshold documentation index

**Version:** 10.12.9 · **Live:** https://medicinalsheep.github.io/threshold/

Full scope map — quality-first blank grid, optional TC reference editions, and where to read more.

**Snapshot:** [CAPABILITIES.md](CAPABILITIES.md) · **Forward plan:** [ROADMAP.md](ROADMAP.md) · **Changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## Content layers

| Layer | What | Policy |
|-------|------|--------|
| **Your game** | Blank grid + quality-gated AI + PBR export | Default path since 10.0; min 1K textures since 10.11 |
| **TC editions** | Lobby → **TC →** — vehicles, circuit, export demo | Bundled reference only — [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md) |

Legacy edition manifests (`threshold-child-*`) live in `old/reference-editions/` — active ids are `tc-*`.

---

## Capability map (v10.8)

```mermaid
flowchart TB
    subgraph session [Session]
        LOBBY[CREATE / JOIN room code]
        PORTAL[Agent Portal]
        HUBS[Corner hub UI]
    end
    subgraph play [Play]
        TPS[TPS / FPS / ADS / Alt peek]
        TOUCH[Touch + UNLOCK layout]
        PBR[Quality PBR 1K+]
        TE[Third Eye + F interact]
    end
    subgraph create [Create]
        SETUP[SETUP + agents]
        COMP[Compiler + scene undo]
        ART[GIMP / Blender pipeline]
        FREEZE[AI memory freeze]
    end
    subgraph ship [Ship]
        EXP[9-step EXPORT wizard]
        NAT[APK / Windows / iOS / Steam]
    end
    LOBBY --> PORTAL --> create
    LOBBY --> play
    SETUP --> COMP
    ART --> play
    play --> EXP --> NAT
```

---

## Start here (pick your path)

| I want to… | Read | Run |
|------------|------|-----|
| Play immediately | [README.md](../README.md) Quick start | Live URL → **CREATE SESSION** |
| Clone & develop | [GETTING_STARTED.md](GETTING_STARTED.md) | `npm install` → `npm run quickstart` |
| Streamlined dev path | [STREAMLINED_DEV.md](STREAMLINED_DEV.md) | Portal → SETUP → EXPORT |
| Agent tiers & benchmarks | [AGENT_ROUTING.md](AGENT_ROUTING.md) | `ollama:benchmark` · SMART DEV |
| UI layout + agents (10.7+) | [UI_AND_AGENTS.md](UI_AND_AGENTS.md) | Portal · freeze · touch · UNLOCK layout |
| Train custom models | [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) | `npm run models:mini` |
| Action controls | [CONTROLS.md](CONTROLS.md) | PLAY mode · weather · F interact |
| Creative loop | [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) | BUILD → insert · PromptGen |
| Action controls | [CONTROLS.md](CONTROLS.md) | LMB aim · RMB shoot · F interact |
| Full asset pipeline | [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md) | `npm run assets:pack` |
| TC export practice | [REFERENCE_EDITIONS.md](REFERENCE_EDITIONS.md) | Lobby → **TC →** |
| Ship to stores | [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) | TOOLS → EXPORT → `store:prep` |

---

## Command cheat sheet

```bash
npm run quickstart              # onboarding (+ --verify / --pack)
npm run dev                     # Vite dev server
npm run ollama:serve            # CORS proxy for Pages + localhost Ollama
npm run assets:pack             # full starter pipeline
npm run assets:verify           # smoke test
npm run preview                 # production preview :4173
npm run textures:watch          # GIMP live SYNC (with dev)
npm run tc:build                # TC GLBs + textures
npm run controls:verify         # binding defaults + doc truth
npm run store:verify            # packaging E2E smoke
npm run models:mini             # install mini agents
npm run build:icons             # favicon ladder from appicon512.png
npm run build                   # GitHub Pages → dist-pages/
```

---

## All guides

| Doc | Topic |
|-----|-------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Lobby → ship linear path |
| [ROADMAP.md](ROADMAP.md) | v10.8+ forward plan |
| [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) | Vision + pillars |
| `old/docs/REALISTIC_GAMEPLAY.md` | Archived — survival + showcase (pre-10.11) |
| [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) | GIMP/Blender loop |
| [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md) | HILOD, codecs, asset systems |
| [AGENT_ROUTING.md](AGENT_ROUTING.md) | Tiered agents + bootcamp |
| [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) | GitHub vs local weights |
| [CAPABILITIES.md](CAPABILITIES.md) | Progress snapshot |
| [UI_AND_AGENTS.md](UI_AND_AGENTS.md) | Corner hubs, freeze, touch |
| [STORE_VERIFY.md](STORE_VERIFY.md) | Store/native verify plan |
| [GIMP_TEXTURES.md](GIMP_TEXTURES.md) | GIMP install, batch, live SYNC |
| [BLENDER_AVATARS.md](BLENDER_AVATARS.md) | Rigged GLB export |
| [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) | 9-step export wizard |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

**Archived phase history:** [old/docs/](../old/docs/)

Agent/contributor guide: [AGENTS.md](../AGENTS.md)