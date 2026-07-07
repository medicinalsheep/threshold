# Threshold Product Roadmap

**Vision:** Design in the browser → play with friends → export real games → scale with your own relay or AWS → local GIMP/Blender art → tiered AI agents (Ollama + Grok).

**Current version:** **9.16.0** — Realism-first PBR, tiered agent router, training bootcamp mini models, streamlined export, store verify re-passed.

**Scope map:** [README.md](README.md) · **Snapshot:** [CAPABILITIES.md](CAPABILITIES.md) · **Phases:** [NEXT_PHASES.md](NEXT_PHASES.md) · **Changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## Goals (north star)

| Pillar | Goal (shipped) |
|--------|----------------|
| **Design** | Drag UI, record sounds, 9-step tutorial, Compiler + PromptGen |
| **Art** | GIMP live SYNC, Blender avatars, procedural PBR + HILOD, `kit:export` |
| **Play** | TPS/FPS/ADS, survival loop, weather, Third Eye, TC circuit + drive |
| **Dev** | `textures:watch`, tiered agents, bootcamp mini models, `ollama:benchmark` |
| **Ship** | 9-step EXPORT (target-filtered SHIP) → `store:prep` → APK / Windows / iOS / Steam |
| **Scale** | Self-host relay locally or AWS free tier |

---

## User journey (target workflow)

```
1. LOBBY        → PLAY or BUILD → ENTER (or Create Session)
2. GUIDED TOUR  → Mode-aware 6-step walkthrough
3. PLAYTEST     → Walk showcase, survival vitals, weather, Third Eye
4. DESIGN       → BUILD: insert, Compiler, textures
5. ART          → GIMP textures · Blender GLB · textures:watch
6. GENERATE     → PromptGen (+ assets) → Compiler → RUN IN ENGINE
7. AGENTS       → SCENE → AI tab: Ollama tiers, optional Grok, NPC chat
8. PACKAGE      → EXPORT manifest (pick targets) → Capacitor / Electron / Steam
9. HOST         → PeerJS cloud | local relay | AWS
```

See [STREAMLINED_DEV.md](STREAMLINED_DEV.md) · [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) · [REALISTIC_GAMEPLAY.md](REALISTIC_GAMEPLAY.md)

---

## Phase map (summary)

### Foundation through Steam (v2–5) ✅

Export manifest, relay scaffold, native shells (Android/Windows/iOS), 9-step export wizard, store prep, Steam depot, graphics tiers, mesh LOD, HILOD textures, TC editions (`tc-*`), circuit + drive, VOIP, TC ship E2E.

Detail: [NEXT_PHASES.md](NEXT_PHASES.md) Phases 1–5, R1–S1, G1–G3, K.

### Realism & asset pipeline (v6.0–6.4) ✅

| Version | Focus |
|---------|-------|
| **6.0** | `assets:pack`, WebP HILOD, realistic gameplay guide |
| **6.1** | GLB avatars, footsteps, FPS viewmodel, remote meshes |
| **6.2** | 6 texture presets, KTX2 scaffold, ADS, surface pads |
| **6.3** | GIMP r8 parity, UV tiling, `blender:avatar` |
| **6.4** | GIMP live SYNC, `kit:export` starter pack |
| **6.4.1** | Doc truth pass, `old/` archive, `quickstart` |

### Polish & ship (v9.0–9.16) ✅

| Version | Focus |
|---------|-------|
| **9.0–9.8** | Guided PLAY/BUILD, showcase, survival, action controls |
| **9.9–9.11** | Chunk split, capabilities outline, `store:verify` |
| **9.12** | Streamlined dev, agent status, export target filtering |
| **9.13** | Tiered `AgentRouter`, Ollama benchmarks |
| **9.14–9.16** | Training bootcamp, mini models on GitHub, realism-first PBR |

---

## Open work

| Area | Status |
|------|--------|
| Signed APK / store upload | Per-developer signing keys |
| macOS notarization | Planned |
| App Store Connect automation | Manual today |
| AWS relay polish | Scaffold exists; polish open |
| Training dataset growth | Starter JSONL only (~15 examples) |
| `intent_classify` UI hook | Prompt exists; no command router yet |
| Trellis/Veo-class models | Roadmap in `models-registry.json` |
| Dual license / Threshold Cloud | Phase 7 |

---

## Export targets

| Target | Technology | Status |
|--------|------------|--------|
| **Web** | Vite → GitHub Pages | ✅ Live |
| **APK** | Capacitor | 🔧 Build scripts; signing local |
| **Windows** | Electron | 🔧 Build scripts; `store:verify` PASS |
| **iOS** | Capacitor + Xcode | ✅ Scaffold (archive needs macOS) |
| **Steam** | Electron + Steamworks | ✅ Scripts + stub shim |
| **Self-host** | `dist-pages` + `relay/` | ✅ |

**Manifest includes:** world, scripts, sounds, textures[], gimp/blender/creativeCli blocks, agent configs, graphics profile, relay mode.

**Verify:** `npm run store:verify` — re-passed v9.16.0 ([STORE_VERIFY.md](STORE_VERIFY.md)).

---

## Agents

| Agent | Role | Status |
|-------|------|--------|
| **Local Script** | Interval sandbox JS | ✅ |
| **AgentRouter** | small / medium / large task routing | ✅ |
| **Ollama** | NPC chat, SMART DEV, PromptGen (local) | ✅ |
| **Grok** | Large scenes, fallback, forced DEV | ✅ |
| **Mini trained** | `threshold-mini-npc`, `threshold-mini-dev` | ✅ Modelfile + JSONL on GitHub |
| **Bootcamp** | Grow datasets → `bootcamp:build` → `models:mini` | ✅ Pipeline; data thin |

Attach via **SCENE → AI tab**. Install: [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) · [AGENT_ROUTING.md](AGENT_ROUTING.md).

---

## Contributing

Pick open items above or grow `training/bootcamp/datasets/`. Update [CHANGELOG.md](CHANGELOG.md) and [CAPABILITIES.md](CAPABILITIES.md) when shipping.