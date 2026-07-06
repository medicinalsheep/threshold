# Threshold documentation index

**Version:** 9.12.0 · **Live:** https://medicinalsheep.github.io/threshold/

This page is the **full scope map** — what ships today, what is TC vs showcase vs yours, and where to read more.

**Polish:** L–U ✅ · **Snapshot:** [CAPABILITIES.md](CAPABILITIES.md) · **Changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## Three content layers

| Layer | What | Policy |
|-------|------|--------|
| **Showcase site** | Lobby → **PLAY/BUILD** → **ENTER** — Wardenclyffe lab GLBs, survival, weather | Original Threshold defaults; `assets:pack` |
| **TC editions** | Lobby → **TC →** — vehicles, circuit, export demo | Original bundled reference — [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md) |
| **Your game** | Worlds you build, GIMP/Blender art, export manifest | You source and credit your assets |

Legacy edition manifests (`threshold-child-*`) live in `old/reference-editions/` — active ids are `tc-*`.

---

## Capability map (v9.10)

```mermaid
flowchart TB
    subgraph session [Session]
        MODE[PLAY / BUILD gate]
        TOUR[6-step guided tour]
        MP[MP vitals + handoff]
    end
    subgraph play [Play]
        TPS[TPS / FPS / ADS]
        SURV[Survival vitals + zones]
        WX[Weather + ambient zones]
        TE[Third Eye + F interact]
    end
    subgraph create [Create]
        SNIP[INSERT SHOWCASE snippets]
        PG[PromptGen EXAMPLES]
        COMP[Compiler + scene undo]
        ART[GIMP / Blender pipeline]
    end
    subgraph ship [Ship]
        QEP[EXPORT and PLAY]
        EXP[9-step EXPORT wizard]
        NAT[APK / Windows / iOS / Steam]
    end
    MODE --> TOUR --> play
    MODE --> create
    SNIP --> create
    PG --> COMP --> play
    ART --> play
    play --> QEP --> NAT
    play --> EXP --> NAT
    MP --> play
```

---

## Start here (pick your path)

| I want to… | Read | Run |
|------------|------|-----|
| Play immediately | [README.md](../README.md) Quick start | Live URL → **ENTER** |
| Clone & develop | [GETTING_STARTED.md](GETTING_STARTED.md) | `npm install` → `npm run quickstart` |
| Streamlined dev path | [STREAMLINED_DEV.md](STREAMLINED_DEV.md) | Lobby → AGENTS → EXPORT (target-filtered) |
| Showcase + controls | [REALISTIC_GAMEPLAY.md](REALISTIC_GAMEPLAY.md) | PLAY mode · gateway · survival |
| Creative loop | [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) | BUILD → INSERT SHOWCASE · PromptGen |
| Action controls | [CONTROLS.md](CONTROLS.md) | LMB aim · RMB shoot · F interact |
| Ambient + weather | [AMBIENT_ASSETS_ROADMAP.md](AMBIENT_ASSETS_ROADMAP.md) | Rain, creek, interior zones |
| Full asset pipeline | [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md) | `npm run assets:pack` |
| TC export practice | [REFERENCE_EDITIONS.md](REFERENCE_EDITIONS.md) | Lobby → **TC →** |
| Ship to stores | [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) | MORE → EXPORT → `store:prep` |

---

## Sprint history (v8–9)

| Sprint | Version | Shipped |
|--------|---------|---------|
| **A** | 8.0 | Scene undo, compile sandbox, Grok no-clearWorld |
| **B** | 8.1 | Performance HUD, sync chip |
| **C** | 8.2 | Starter templates, PromptGen cookbook |
| **D** | 8.3 | Nikola NPC, dusk lighting |
| **E** | 8.4 | EXPORT & PLAY, export preflight |
| **F** | 8.5 | Action hints, skippable intro (removed in K) |
| **G** | 8.6 | Guest rebuild, audio manifest, sync story |
| **H** | 8.7 | Scene lock, AI ack, texture manifest |
| **I** | 8.8 | Rebuild telemetry, per-author undo, host handoff |
| **J** | 8.9 | Survival vitals (6 stats, zones, HUD, MP) |
| **K** | 9.0 | Guided PLAY/BUILD, showcase gateway |
| **Q** | 9.1 | Documentation truth (v9.0) |
| **L** | 9.2 | Gateway sign, PBR path, golden hour |
| **M** | 9.3 | Onboarding stack, URL `?mode=`, guest skip |
| **N** | 9.4 | Survival depth, MP vitals pill, inspector hooks |
| **O** | 9.5 | SHOWCASE insert, v9 creator WORKFLOWS |
| **P** | 9.6 | LIVE_STATE vitals, reconnect, spectate banner |
| **R** | 9.6.1 | Documentation truth (v9.6) |
| **S** | 9.7 | Survival gameplay loop |
| **V** | 9.8 | Action controls + doc cleanup |
| **T** | 9.9 | JS chunk split |
| **W** | 9.10 | Hygiene + capabilities outline |
| **U** | 9.11 | Store/native verify pass |

Full snapshot: [CAPABILITIES.md](CAPABILITIES.md) · Earlier phases: [NEXT_PHASES.md](NEXT_PHASES.md)

---

## Command cheat sheet

```bash
npm run quickstart              # onboarding (+ --verify / --pack)
npm run dev                     # Vite dev server
npm run assets:pack             # full starter pipeline
npm run assets:verify           # smoke test
npm run preview                 # production preview :4173
npm run textures:watch          # GIMP live SYNC (with dev)
npm run tc:build                # TC GLBs + textures
npm run tc:verify               # TC smoke test
npm run controls:verify         # binding defaults + doc truth
npm run store:verify            # packaging E2E smoke
npm run build:electron          # native-relative chunks
```

---

## All guides

| Doc | Topic |
|-----|-------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Lobby → ship linear path |
| [REALISTIC_GAMEPLAY.md](REALISTIC_GAMEPLAY.md) | Controls, survival, MP, showcase site |
| [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) | PLAY/BUILD, GIMP/Blender loop |
| [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md) | HILOD, codecs, v9.6 systems table |
| [CAPABILITIES.md](CAPABILITIES.md) | Progress + capability snapshot |
| [STORE_VERIFY.md](STORE_VERIFY.md) | Sprint U store/native verify plan |
| [POLISH_ROADMAP.md](POLISH_ROADMAP.md) | Sprints K–W |
| [GIMP_TEXTURES.md](GIMP_TEXTURES.md) | GIMP install, batch, live SYNC |
| [BLENDER_AVATARS.md](BLENDER_AVATARS.md) | Rigged GLB export |
| [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) | 9-step export wizard |
| [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) | North star |
| [NEXT_PHASES.md](NEXT_PHASES.md) | Detailed phase checklist |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

Agent/contributor guide: [AGENTS.md](../AGENTS.md)