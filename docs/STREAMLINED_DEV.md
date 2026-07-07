# Streamlined dev path (v10.8)

One linear path from lobby to shipped build — host/join, Agent Portal, creative tools, export.

---

## 1. Lobby → Engine

| Step | Action |
|------|--------|
| **Host** | Lobby → **CREATE SESSION** → share room code |
| **Join** | Lobby → paste code → **JOIN** |
| **Enter** | **ENTER** → blank grid (EDIT mode = paused physics) |

Multiplayer is optional PeerJS — no API key required for local solo dev.

---

## 2. Agent Portal + SETUP

**Agent Portal** opens on ENTER. **SETUP** tab (SCENE menu → SETUP) holds tier prefs and dev tools.

| Chip | Meaning |
|------|---------|
| **Grok ✓** | xAI API key in **this browser tab** (`sessionStorage`) |
| **Ollama ✓** | `npm run ollama:serve` + models listed |
| **Watch ✓** | `npm run textures:watch` — GIMP/Blender hot-reload |
| **Tex N** | Textures loaded in scene library |
| **Freeze** | AI memory freeze active during local inference |

### Grok API key

- Get a key at [console.x.ai](https://console.x.ai).
- Paste in SETUP or Portal → SAVE.
- Keys are **per-tab** — not auto-shared from other x.ai sessions.

### Tiered models (small / medium / large)

| Tier | Use for | Trained mini model |
|------|---------|-------------------|
| Small | NPC chat | `threshold-mini-npc` |
| Medium | Compiler patches | `threshold-mini-dev` |
| Large | Full scene scripts | Grok or `threshold-dev` |

```bash
npm run ollama:serve              # CORS proxy for Pages + localhost
npm run bootcamp:build && npm run models:mini
npm run ollama:benchmark
npm run ollama:verify
```

See [AGENT_ROUTING.md](AGENT_ROUTING.md) and [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md).

Ollama does **not** edit textures — use GIMP workflow below.

---

## 3. Creative workflow (textures & models)

| Tool | Command | What it does |
|------|---------|----------------|
| GIMP plugin | `npm run gimp:install` | Export PBR to `textures/` |
| Texture watch | `npm run textures:watch` | Hot-reload into Engine |
| Blender addon | `npm run blender:install` | Export GLTF to `import/` |

[GIMP_TEXTURES.md](GIMP_TEXTURES.md) · [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md)

---

## 4. Export (TOOLS → EXPORT)

9-step wizard. **TARGETS** defaults to **Web only**.

```bash
npm run store:prep -- --manifest my-game.threshold-game.json --contact you@example.com
npm run build
# — or —
npm run bundle:assets
npm run package:win
```

Signing keys are **local env vars at package time** — never in the manifest. [STORE_RELEASE.md](STORE_RELEASE.md)

---

## 5. Verify before ship

```bash
npm run controls:verify
npm run tc:verify
node scripts/portal-ui-verify.cjs
npm run store:verify
npm run ollama:verify
```

---

## Quick reference

```
CREATE SESSION → Portal (Grok/Ollama) → SETUP tiers
→ GIMP+watch / Blender → BUILD scene → TOOLS → EXPORT → store:prep → package:*
```

Related: [GETTING_STARTED.md](GETTING_STARTED.md) · [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) · [ROADMAP.md](ROADMAP.md)