# THRESHOLD

**Collaborative 3D game lab** — host a session, connect an AI agent, build in the browser, play with friends, export real packages.

**Live:** https://medicinalsheep.github.io/threshold/ · **Version:** 10.14.2

**Build from this:** [docs/BUILD_FROM.md](docs/BUILD_FROM.md) — one-page outline for forks and Grok/agent chats (live link, six-step loop, do/don’t).

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
1. LOBBY     → name · PLAY or BUILD · **ENTER →** (solo; no account needed)
2. SURFACE   → phones default Play UI; desktop Creator (AI tools). ?surface=player|creator|full
3. ENGINE    → blank grid · corner hub tour (~3 steps)
4. PORTAL    → (creator) AI scans Grok/Ollama · describe what to build
5. EDIT      → TOOLS menu → insert / MATERIAL LIBRARY / Compiler / PromptGen
6. PLAY      → tap PLAY (top-left) · touch toggle (bottom-left) · test walk physics
7. SHIP      → TOOLS → Export when ready
```

Multiplayer: **CREATE SESSION** → copy invite → **ENTER SESSION**. Friends **JOIN** with room code.  
Optional: **Grok** API key for cloud AI — [docs/AUTH.md](docs/AUTH.md). Local Ollama: `npm run ollama:serve` (not plain `ollama serve`).  
Ship: [docs/STORE_RELEASE.md](docs/STORE_RELEASE.md) · macOS notary: [docs/MAC_NOTARIZE.md](docs/MAC_NOTARIZE.md) · `npm run store:ship`.

---

## Corner hub UI (play vs edit)

Fullscreen immersive mode with **L-shaped toggles** — menus only open when you need them.

| Corner | PLAY mode | EDIT mode |
|--------|-----------|-----------|
| **Top-left** | PLAY badge · AI · LINK · UNLOCK | EDIT badge · AI · LINK · UNLOCK |
| **Top-right** | hidden | **TOOLS** popup (Compiler, PromptGen, insert, export…) |
| **Bottom-left** | TOUCH · WALK/FLY · FULL | same |
| **Bottom-right** | PLAY+ menu | **SCENE** popup (ENV, EDIT, SKIN, SFX, SETUP) |

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

## AI & accounts (bring your own)

Visitors use **their** models — nothing is bundled on GitHub except small Modelfiles/recipes. Play works with no accounts.

| Provider | How | Pages / laptop | Phone |
|----------|-----|----------------|-------|
| **Grok / xAI** | API key from [console.x.ai](https://console.x.ai) (not SuperGrok tab) | ✅ | ✅ |
| **Ollama** | `npm run ollama:serve` on **this** device (CORS/PNA for Pages) | ✅ | ❌ on phone |
| **Threshold mini models** | `ollama pull medicinalsheep/threshold-mini-npc` or `npm run models:mini` | ✅ | codegen → Grok |
| GIMP/Blender watch | `npm run textures:watch` | ✅ local dev only | ❌ |

Keys and GGUF weights never go to GitHub. [docs/AUTH.md](docs/AUTH.md).

---

## Plugins & export

GIMP/Blender plugins and store packaging live in the repo — see `docs/GETTING_STARTED.md` when you need them. Not required for first run.