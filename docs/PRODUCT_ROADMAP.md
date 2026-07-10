# Threshold Product Roadmap

**Vision:** Design in the browser → play with friends → export real games → local GIMP/Blender art → tiered AI agents (Ollama + Grok).

**Current version:** **10.12.30**

**Forward plan:** [ROADMAP.md](ROADMAP.md) · **Snapshot:** [CAPABILITIES.md](CAPABILITIES.md) · **Changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## Goals (north star)

| Pillar | Goal |
|--------|------|
| **Design** | Blank grid + Agent Portal + Compiler + PromptGen |
| **Art** | GIMP live SYNC, Blender GLB, procedural PBR + HILOD |
| **Play** | TPS/FPS/ADS, survival (optional), weather, Third Eye, touch controls |
| **Dev** | SETUP tab, tiered agents, sequential Ollama, AI memory freeze |
| **Ship** | 9-step EXPORT → `store:prep` → APK / Windows / iOS / Steam |
| **Scale** | Self-host relay locally or AWS free tier |

---

## User journey (v10+)

```
1. LOBBY        → ENTER → (solo) or CREATE SESSION (host) / JOIN
2. ENGINE       → blank grid · corner hub tour
3. PORTAL       → Agent Portal scans Grok/Ollama · describe what to build
4. EDIT         → TOOLS menu → Compiler / PromptGen / insert
5. PLAY         → top-left PLAY · touch toggle · walk physics
6. SHIP         → TOOLS → Export when ready
```

Optional: **Lobby → TC DEMO** for bundled reference editions. Optional **X / Grok** accounts — [AUTH.md](AUTH.md).

See [GETTING_STARTED.md](GETTING_STARTED.md) · [STREAMLINED_DEV.md](STREAMLINED_DEV.md) · [UI_AND_AGENTS.md](UI_AND_AGENTS.md)

---

## Export targets

| Target | Technology | Status |
|--------|------------|--------|
| **Web** | Vite → GitHub Pages | ✅ Live |
| **APK** | Capacitor | 🔧 Build scripts; signing local |
| **Windows** | Electron | 🔧 `store:verify` PASS |
| **iOS** | Capacitor + Xcode | ✅ Scaffold (archive needs macOS) |
| **Steam** | Electron + Steamworks | ✅ Scripts + stub shim |
| **Self-host** | `dist-pages` + `relay/` | ✅ |

---

## Agents

| Agent | Role | Where |
|-------|------|-------|
| **Agent Portal** | Build intake, tier picks, multi-step builds | On ENTER |
| **SETUP** | Grok key, Ollama tiers, freeze, working folder | SCENE → SETUP |
| **AgentRouter** | small / medium / large task routing | `agentRouter.js` |
| **Ollama** | NPC chat, SMART DEV, local PromptGen | localhost only |
| **Grok** | Large scenes, fallback | xAI key (console.x.ai) — [AUTH.md](AUTH.md) |
| **X** | Identity / feed / posts (optional) | OAuth PKCE — not an AI provider |
| **Mini trained** | `threshold-mini-npc`, `threshold-mini-dev` | `npm run models:mini` |

Install: [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) · Routing: [AGENT_ROUTING.md](AGENT_ROUTING.md)

---

## Contributing

Pick items from [ROADMAP.md](ROADMAP.md). Update [CHANGELOG.md](CHANGELOG.md) and [CAPABILITIES.md](CAPABILITIES.md) when shipping.