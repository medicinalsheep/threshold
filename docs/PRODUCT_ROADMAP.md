# Threshold Product Roadmap

**Vision:** Design in the browser → play with friends → export real games → scale with your own relay or AWS → local GIMP/Blender art → AI agents on NPCs.

**Current version:** **4.0.0** (Phase F — iOS Capacitor scaffold, export wizard iOS target)

**Detailed next phases:** [NEXT_PHASES.md](NEXT_PHASES.md) (LOD, HILOD, iOS, Phase E leftovers)

---

## Goals (north star)

| Pillar | Goal |
|--------|------|
| **Design** | Drag UI, record sounds, GIMP/Blender textures, AI-assisted worlds |
| **Play** | Solo, host/guest, EDIT/PLAY, walk/fly, touch + gamepad, retro + Hyper |
| **Dev** | Compiler, PromptGen, agents (local + Grok), `textures:watch` |
| **Ship** | Export manifest → APK / Windows / **iOS (planned)** / Steam |
| **Scale** | Self-host relay locally or AWS free tier |

---

## User journey (target workflow)

```
1. LOBBY        → Solo or Create Session
2. DESIGN       → EDIT: build map, SFX, insert NPCs / GLTF
3. ART          → GIMP textures/ · Blender GLB · optional textures:watch
4. GENERATE     → PromptGen (+ assets) → Compiler → RUN IN ENGINE
5. AGENTS       → Optional: Grok/local agents on NPCs
6. PLAYTEST     → PLAY: walk, physics, Hyper for PBR
7. PACKAGE      → EXPORT manifest → Capacitor / Electron / (iOS Phase F)
8. HOST         → PeerJS cloud | local relay | AWS
```

See [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md).

---

## Phase map

### Phase 1 — Foundation (v2.2) ✅

- [x] Game export manifest (`.threshold-game.json`)
- [x] Relay scaffold + `relay/` server
- [x] Agents dock: Grok Dev, Grok NPC, Local Script
- [x] First-session walkthrough + MORE → TUTORIAL replay
- [x] PWA manifest (light) — `public/manifest.webmanifest`

### Phase 2 — Native shells (v3.0–3.6) 🔧

- [x] Capacitor Android APK scaffold
- [x] Electron Windows portable `.exe`
- [x] Export wizard (4-step) with texture/GLTF asset summary (v3.7)
- [x] App icons + `build:icons` / `cap:assets`
- [x] **Creative pipeline A–D** — [CREATIVE_PLUGINS.md](CREATIVE_PLUGINS.md)
- [ ] Signed APK / store-ready builds
- [ ] macOS `.app` notarization
- [x] Capacitor Filesystem scaffold for on-device world import (`NativeAssets`, v3.8)
- [x] Native bundle of `textures/` + `import/` via `bundle:assets` (v3.8)
- [x] Sound blob sidecar — base64 in export manifest (v3.8)

### Phase 3 — iOS & Apple (v4.0) 🔧

- [x] `@capacitor/ios` + `init:native` generates Xcode project locally
- [x] `npm run package:ios` + `cap:open:ios` + TestFlight docs (NATIVE_SHELLS.md)
- [x] Export wizard iOS target checkbox + `packaging.ios` in manifest
- [ ] App Store Connect metadata automation (manual per release today)
- [ ] Signed TestFlight / App Store archive (requires macOS + developer account)

*Android + Windows + iOS scaffold exist; store submission is per-developer.*

### Phase 4 — Graphics intelligence (v4.1–4.5) 📋

See [NEXT_PHASES.md](NEXT_PHASES.md):

- [ ] Suggested graphics tiers (Compatibility / Balanced / Realistic / Ultra)
- [ ] Mesh LOD (Blender multi-GLB)
- [ ] HILOD textures (distance + tier-based maps)
- [ ] Targeted graphics export CLI per platform
- [x] Normal maps in Engine (v3.8)

### Phase 5 — Steam & distribution (v3.5+) 📋

- [ ] Steamworks in Electron
- [ ] Depot CI
- [ ] itch.io / sideload docs

### Phase 6 — Scale & AI (v4.0+) 📋

- [ ] AWS relay polish
- [ ] Grok proxy / NPC sync
- [ ] Local LLM (Ollama) desktop
- [ ] Dev agent auto-run loop

### Phase 7 — Commercial

- [ ] Dual license
- [ ] Threshold Cloud tier

---

## Export targets

| Target | Technology | Status |
|--------|------------|--------|
| **Web** | Vite → GitHub Pages | ✅ Live |
| **APK** | Capacitor | 🔧 Scaffold |
| **Windows** | Electron | 🔧 Scaffold |
| **iOS** | Capacitor | ❌ Not started (Phase F) |
| **Steam** | Electron + Steamworks | 📋 Planned |
| **Self-host** | `dist-pages` + `relay/` | ✅ |

**Manifest includes:** world, scripts, sounds, **textures[]**, gimp/blender/creativeCli blocks, agent configs, relay mode.

---

## Agents (optional in workflow)

| Agent | Role | Status |
|-------|------|--------|
| **Local Script** | Interval sandbox JS | ✅ |
| **Grok Dev** | Compiler suggestions | ✅ |
| **Grok NPC** | NPC dialogue | ✅ |
| **Local LLM** | Desktop offline | Phase 6 |

Attach via SCENE → AI tab. Tutorial presents agents as **optional**.

---

## VLC / video

**No VLC plugin planned.** Cinematic cutscenes will use HTML5 video + VideoTexture first (Phase K in NEXT_PHASES). VLC only if exotic desktop codec needs arise.

---

## Contributing

Pick Phase E (leftovers) or Phase F (iOS) items. Update checkboxes via PR.