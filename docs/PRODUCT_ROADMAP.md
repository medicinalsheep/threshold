# Threshold Product Roadmap

**Vision:** Design in the browser → play with friends → export real games → scale with your own relay or AWS → local GIMP/Blender art → AI agents on NPCs.

**Current version:** **6.4.1** — realism starter defaults, GIMP live SYNC, starter texture kit, full doc index

**Scope map:** [README.md](README.md) · **Phases:** [NEXT_PHASES.md](NEXT_PHASES.md) · **Changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## Goals (north star)

| Pillar | Goal (shipped) |
|--------|----------------|
| **Design** | Drag UI, record sounds, 9-step tutorial, Compiler + PromptGen |
| **Art** | GIMP live SYNC, Blender avatars, procedural PBR + HILOD, `kit:export` |
| **Play** | TPS/FPS/ADS, footsteps (6 surfaces), Third Eye, TC circuit + drive |
| **Dev** | `assets:pack`, `textures:watch`, agents (local + Grok) |
| **Ship** | 9-step EXPORT → APK / Windows / iOS scaffold / Steam |
| **Scale** | Self-host relay locally or AWS free tier |

---

## User journey (target workflow)

```
1. LOBBY        → Solo or Create Session
2. PLAYTEST     → Walk pads, FPS, ADS, footsteps, Third Eye
3. DESIGN       → EDIT: build map, SFX, insert NPCs / GLTF
4. ART          → GIMP textures · Blender GLB · textures:watch
5. GENERATE     → PromptGen (+ assets) → Compiler → RUN IN ENGINE
6. AGENTS       → Optional: Grok/local agents on NPCs
7. PACKAGE      → EXPORT manifest → Capacitor / Electron / Steam
8. HOST         → PeerJS cloud | local relay | AWS
```

See [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) · [REALISTIC_GAMEPLAY.md](REALISTIC_GAMEPLAY.md)

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

### Open work

| Area | Status |
|------|--------|
| Signed APK / store upload | Per-developer signing keys |
| macOS notarization | Planned |
| App Store Connect automation | Manual today |
| AWS relay polish | Phase 6 |
| Grok proxy / NPC sync | Phase 6 |
| Local LLM (Ollama) | Phase 6 |
| Dual license / Threshold Cloud | Phase 7 |

---

## Export targets

| Target | Technology | Status |
|--------|------------|--------|
| **Web** | Vite → GitHub Pages | ✅ Live |
| **APK** | Capacitor | 🔧 Scaffold |
| **Windows** | Electron | 🔧 Scaffold |
| **iOS** | Capacitor + Xcode | ✅ Scaffold |
| **Steam** | Electron + Steamworks | ✅ |
| **Self-host** | `dist-pages` + `relay/` | ✅ |

**Manifest includes:** world, scripts, sounds, textures[], gimp/blender/creativeCli blocks, agent configs, relay mode.

---

## Agents (optional)

| Agent | Role | Status |
|-------|------|--------|
| **Local Script** | Interval sandbox JS | ✅ |
| **Grok Dev** | Compiler suggestions | ✅ |
| **Grok NPC** | NPC dialogue | ✅ |
| **Local LLM** | Desktop offline | Phase 6 |

Attach via SCENE → AI tab.

---

## Contributing

Pick open Phase 6 items or polish starter onboarding. Update [CHANGELOG.md](CHANGELOG.md) and [README.md](README.md) when shipping.