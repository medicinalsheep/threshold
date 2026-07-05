# Threshold Product Roadmap

**Vision:** Design in the browser → play with friends → export real games → scale with your own relay or AWS → add AI agents to NPCs and your dev workflow.

**Current version:** 3.0.0 (native shells scaffold) → **3.5** (Steam) → **4.x** (scale + commercial tier)

---

## Goals (north star)

| Pillar | Goal |
|--------|------|
| **Design** | Drag UI, record sounds, AI-assisted worlds, reference workflows |
| **Play** | Solo, host/guest, EDIT/PLAY, walk/fly, touch + gamepad |
| **Dev** | Compiler, PromptGen, agents (local + Grok), project vault |
| **Ship** | Export game packages → APK / Windows / Steam-ready |
| **Scale** | Self-host relay locally or AWS free tier when rooms grow |

---

## User journey (target workflow)

```
1. LOBBY        → Solo or Create Session
2. DESIGN       → EDIT mode: build map, SFX, insert NPCs
3. GENERATE     → PromptGen (+ sounds) → Compiler → RUN IN ENGINE
4. AGENTS       → Attach Grok/local agents to NPCs or dev menu
5. PLAYTEST     → PLAY mode: walk, physics, multiplayer
6. PACKAGE      → Export manifest → Capacitor (APK) / Electron (Win) / Steam depot
7. HOST         → PeerJS cloud (default) | local relay | AWS relay (more players)
8. MONETIZE     → Commercial license when product matures (see README)
```

---

## Phase map

### Phase 1 — Foundation (v2.2, **complete**)

- [x] Game export manifest (`.threshold-game.json`) — world + scripts + build hints
- [x] Relay config via env (`VITE_PEER_HOST`, ICE servers)
- [x] `relay/` PeerJS server scaffold + AWS free-tier deploy notes
- [x] **Agents** dock tab: Grok Dev, Grok NPC, Local Script
- [x] Workflow entries: export, relay, agents
- [x] First-session walkthrough (8 steps) + MORE → TUTORIAL replay
- [ ] PWA manifest (light) — deferred to Phase 2 shell work

### Phase 2 — Native shells (v3.0, **scaffold shipped**)

- [x] **Capacitor** — Android APK from `dist-pages` (`capacitor.config.json`, `init:native`)
- [x] **Electron** — Windows portable `.exe` (`electron/`, `package:win`)
- [x] CLI: `npm run package:android` / `package:win` / `electron:dev`
- [x] Shell bridges — `ThresholdShell` (fullscreen, fs save, mic note)
- [x] Export wizard — MORE → EXPORT (4-step UI)
- [ ] Signed APK / store-ready builds (release keystore, icons)
- [ ] macOS `.app` notarization polish
- [ ] Capacitor Filesystem plugin for world import on device

### Phase 3 — Steam & distribution (v3.5)

- [ ] Steamworks SDK integration in Electron shell
- [ ] Depot build CI (GitHub Actions)
- [ ] itch.io / sideload APK docs
- [ ] App icons, splash, store metadata from export manifest

### Phase 4 — Scale & AI (v4.0)

- [ ] AWS relay: ECS/Fargate or EC2 free tier + peerjs-server
- [ ] Optional TURN (coturn) for strict NAT
- [ ] Grok proxy on Lambda (hide API keys, fix CORS)
- [ ] NPC agent state sync (host-authoritative dialogue)
- [ ] Dev agent: auto check → transpile → run loop
- [ ] Local agent IPC (desktop): file watch, terminal (Electron preload)

### Phase 5 — Commercial (when value justifies)

- [ ] Dual license (community + commercial)
- [ ] Hosted Threshold Cloud (worlds, relay, Grok proxy tier)
- [ ] Enterprise relay + support

---

## Export targets

| Target | Technology | Status v2.1 |
|--------|------------|---------------|
| **Web** | Vite → GitHub Pages | ✅ Live |
| **APK** | Capacitor + WebView | 🔧 Scaffold + `package:android` |
| **Windows** | Electron | 🔧 Scaffold + `package:win` |
| **Steam** | Electron + Steamworks | 📋 Planned v3.5 |
| **Self-host** | Static `dist-pages` + optional `relay/` | ✅ |

**Export manifest includes:** world snapshot, running code, compiler scripts, sound clip metadata, suggested app name, relay mode, agent configs.

---

## Hosting & relay

| Mode | Use when | Setup |
|------|----------|--------|
| **PeerJS cloud** | Jams, small groups | Default (zero config) |
| **Local relay** | LAN parties, dev | `cd relay && npm start` |
| **AWS free tier** | Public games, more peers | `relay/README.md` — t2.micro / Lightsail |

Configure build with:
```env
VITE_PEER_HOST=your-relay.example.com
VITE_PEER_PORT=443
VITE_PEER_PATH=/peerjs
VITE_PEER_SECURE=true
VITE_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"}]
```

---

## Agents

| Agent | Role | API | v2.1 |
|-------|------|-----|------|
| **Local Script** | Run sandbox JS on interval / trigger | None | ✅ |
| **Grok Dev** | Suggest/fix Compiler code | xAI key (user) | ✅ |
| **Grok NPC** | Dialogue + actions for selected NPC | xAI key (user) | ✅ |
| **Local LLM** | Ollama / LM Studio (desktop) | localhost | Phase 4 |

Agents attach via `userData.agentId` on NPCs or run from **AGENTS** dock tab.

---

## What stays browser-first

The engine remains a **Vite SPA**. Native targets wrap the same build — no fork of the runtime. Multiplayer stays host-authoritative until optional dedicated game server (future).

---

## Contributing to the roadmap

Pick a Phase 1–2 item, open an issue, or PR against `docs/PRODUCT_ROADMAP.md` checkboxes.