# THRESHOLD

**Collaborative 3D game lab** — host a session, connect an AI agent, build in the browser, play with friends, export real packages.

**Live:** https://medicinalsheep.github.io/threshold/ · **Version:** 10.12.7

---

## What it is (use case)

Threshold is for people who want to **go from idea → playable 3D scene → shipped build** without leaving the browser:

| You want to… | Threshold gives you… |
|--------------|----------------------|
| Prototype a game world fast | Blank grid + AI Build Station + Compiler |
| Use your own AI | Agent Portal auto-detects **Grok** + **Ollama** on your machine |
| Collaborate | PeerJS sessions — host shares a link, friends join live |
| Art pipeline | GIMP textures + Blender GLB import with hot-reload (local dev) |
| Ship | Export wizard → web, Android, Windows, iOS, Steam scaffolds |

**Not a AAA engine** — it's a focused sandbox: JavaScript scene scripts, realistic PBR defaults, tiered agents, and store packaging scripts when you're ready.

---

## First run (walked through)

```
1. LOBBY     → name · PLAY or BUILD · CREATE SESSION (or **ENTER →** solo — starts in BUILD)
2. ENTER     → blank grid · corner hub tour (3 steps)
3. PORTAL    → AI scans Grok/Ollama · describe what to build
4. EDIT      → TOOLS menu → Compiler / PromptGen / insert
5. PLAY      → tap PLAY (top-left) · touch toggle (bottom-left) · test walk physics
6. SHIP      → TOOLS → Export when ready
```

---

## Corner hub UI (play vs edit)

Fullscreen immersive mode with **L-shaped toggles** — menus only open when you need them.

| Corner | PLAY mode | EDIT mode |
|--------|-----------|-----------|
| **Top-left** | PLAY badge · AI agent · LINK | EDIT badge · AI · LINK |
| **Top-right** | hidden | **TOOLS** popup (Compiler, PromptGen, insert, export…) |
| **Bottom-left** | TOUCH · WALK/FLY · FULL | same |
| **Bottom-right** | **SKIN** popup | **SCENE** popup (inspect, env, agents) |

Tap **PLAY/EDIT** (top-left) to switch modes — physics pauses in EDIT so you can build safely.

Walk to the **AI Build Station** on the grid and press **F** anytime.

---

## Develop locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist-pages for GitHub Pages
npm run preview:pages  # test the GitHub Pages build locally (no file watcher)
```

**Dev server crash on `E:\` or network drives?** Vite’s file watcher fails on some mapped drives. The repo enables polling by default. If it still dies, use `npm run preview:pages` after `npm run build` — same as what visitors get on GitHub.

Doc index: [docs/README.md](docs/README.md)

---

## Multiplayer

Host-authoritative **PeerJS (WebRTC)**. Host browser is session authority.

| Role | World edit | Pause |
|------|------------|-------|
| Host | Yes (EDIT) | Yes |
| Guest | No | Synced from host |

---

## AI providers (bring your own)

Visitors use **their** models — nothing is bundled on GitHub except small Modelfiles/recipes.

| Provider | How | GitHub link on your PC | Phone |
|----------|-----|------------------------|-------|
| **Grok / xAI** | Paste API key in Agent Portal | ✅ | ✅ |
| **Ollama** | `npm run ollama:serve` on **this** device (fixes CORS 403) | ✅ | ❌ on phone |
| **Threshold mini models** | `npm run bootcamp:build && npm run models:mini` | ✅ after `ollama pull` | ❌ |
| GIMP/Blender watch | `npm run textures:watch` | ✅ local dev only | ❌ |

Keys and GGUF weights never go to GitHub — only your browser tab session.

---

## Plugins & export

GIMP/Blender plugins and store packaging live in the repo — see `docs/GETTING_STARTED.md` when you need them. Not required for first run.