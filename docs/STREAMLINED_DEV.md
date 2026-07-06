# Streamlined dev path (v9.12)

One linear path from lobby to shipped build — host/join, agents, creative tools, export.

---

## 1. Lobby → Engine

| Step | Action |
|------|--------|
| **Host** | Lobby → HOST → share room code |
| **Join** | Lobby → JOIN → enter code |
| **Enter** | START → Engine (BUILD mode = paused) |

Multiplayer is optional PeerJS — no API key required for local solo dev.

---

## 2. Agents panel (SCENE → AGENTS)

Open **SCENE dock → AGENTS** tab. Status chips show what is ready:

| Chip | Meaning |
|------|---------|
| **Grok ✓** | xAI API key saved in **this browser tab** (`sessionStorage`) |
| **Ollama ✓** | `ollama serve` running; models listed in dropdown |
| **Watch ✓** | `npm run textures:watch` connected — GIMP/Blender hot-reload |
| **Tex N** | Textures loaded in scene library |
| **Local ✓** | Interval script agent running |

### Grok API key

- Get a key at [console.x.ai](https://console.x.ai).
- **Grok edition:** login overlay on first load.
- **Web edition:** paste key in AGENTS panel → SAVE.
- Keys are **per-tab** — logging into Grok in another tab does **not** auto-auth Threshold.
- Keys go only to `api.x.ai`; never commit them to git.

### Ollama (local, no key)

```bash
ollama serve          # if not already running
ollama pull llama3.2:3b
npm run ollama:verify # optional smoke test
```

Use **OLLAMA DEV: SUGGEST CODE** for Compiler suggestions. Ollama does **not** edit PNG/KTX textures — use GIMP workflow below.

### Local script agent

Set interval (ms) + JavaScript → **SAVE LOCAL AGENT**. Runs on timer in PLAY mode via `Runtime.execute`.

---

## 3. Creative workflow (textures & models)

| Tool | Command | What it does |
|------|---------|----------------|
| GIMP plugin | `npm run gimp:install` | Export PBR to `textures/` |
| Texture watch | `npm run textures:watch` | Hot-reload into Engine |
| Blender addon | `npm run blender:install` | Export GLTF to `import/` |

**Textures:** edit in GIMP → save → watch relay updates Engine meshes. See [GIMP_TEXTURES.md](GIMP_TEXTURES.md) and [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md).

**Reference inputs:** Compiler and PromptGen include `referenceLibrary` blocks; local GLBs go in `import/`, textures in `textures/`.

---

## 4. Export (MORE → EXPORT)

9-step wizard. **TARGETS** defaults to **Web only** — check Android/Windows/iOS/Steam only when you will run those `package:*` commands.

**SHIP** step shows:

- Secrets checklist (what is public vs signing keys)
- **Filtered CLI** — only commands for selected targets

```bash
npm run store:prep -- --manifest my-game.threshold-game.json --contact you@example.com
npm run build                    # web-only default
# — or —
npm run bundle:assets
npm run package:win              # if Windows target checked
```

Signing keys (`CSC_LINK`, Android keystore, Apple provisioning) are **local env vars at package time** — never in the manifest. See [STORE_RELEASE.md](STORE_RELEASE.md).

---

## 5. Verify before ship

```bash
npm run controls:verify
npm run tc:verify
npm run store:verify    # full packaging smoke
npm run ollama:verify   # optional local LLM
```

---

## Quick reference

```
Lobby HOST/JOIN → AGENTS (Grok key / Ollama / watch) → GIMP+watch / Blender
→ BUILD scene → MORE → EXPORT (pick targets) → store:prep → package:*
```

Related: [GETTING_STARTED.md](GETTING_STARTED.md) · [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) · [STORE_RELEASE.md](STORE_RELEASE.md)