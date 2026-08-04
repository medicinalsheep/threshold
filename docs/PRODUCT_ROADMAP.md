# Threshold Product Roadmap

**Vision:** Design in the browser → play with friends → export real games → local GIMP/Blender art → tiered AI agents (Ollama + Grok).

**Current version:** **10.20.1**

**Forward plan:** [ROADMAP.md](ROADMAP.md) · **Snapshot:** [CAPABILITIES.md](CAPABILITIES.md) · **Changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## Goals (north star)

| Pillar | Goal |
|--------|------|
| **Design** | Terminal grid + quality ladder + live agents + Compiler + PromptGen |
| **Art** | GIMP live SYNC, Blender GLB, PBR + HILOD, material library, **shape + wardrobe** |
| **Play** | TPS/FPS/ADS · Arrange · Play as · weather · Third Eye · touch |
| **Dev** | SETUP, tiered agents, sequential Ollama, freeze, **wave7 train:mini** |
| **Ship** | 9-step EXPORT → `store:prep` → APK / Windows / iOS / Steam |
| **Scale** | Self-host relay locally or AWS free tier |

---

## User journey (v10.20+)

```
1. LOBBY        → ENTER (solo terminal grid) or CREATE SESSION / JOIN
2. ENGINE       → empty grid · hub PLAY/ARRANGE/EDIT · optional Play as (K)
3. BUILD        → BUILD SOMETHING / AI · one brief · GENERATE → LIVE SCENE
4. SKIN         → body shape + wardrobe (SCENE → SKIN) when character-focused
5. QUALITY      → INSERT QUALITY: light · kit · AI · materials · pad (opt-in)
6. EDIT         → gizmo · inspector · Compiler / PromptGen
7. PLAY         → walk · sim · touch toggle
8. SHIP         → TOOLS → Export when ready
```

Optional **Grok** API key — [AUTH.md](AUTH.md). Mobile defaults to **player** surface — [UI_AND_AGENTS.md](UI_AND_AGENTS.md).

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