# Build from Threshold

**One-page spine** for humans and agents. Open the live app, then extend — don’t rewrite the core.

| | |
|--|--|
| **Live** | https://medicinalsheep.github.io/threshold/ |
| **Repo** | https://github.com/medicinalsheep/threshold |
| **Version** | see `src/config.js` → `VERSION` |
| **Snapshot** | [CAPABILITIES.md](CAPABILITIES.md) · **Perf next** | [PERF_NEXT.md](PERF_NEXT.md) |

---

## What it is

Browser **3D creative suite**: blank grid → optional AI (Grok key + local Ollama) → play/build multiplayer → export.  
**No account required.** **No X OAuth.** Host-authoritative PeerJS when you CREATE a session.

Stack: Vite · Three.js · Cannon · PeerJS SPA · GitHub Pages.

---

## Six-step loop

```text
1. LOBBY     Open live (or npm run dev) · optional display name
2. ENTER     Solo blank grid — no network (or CREATE SESSION for MP)
3. PLAY/EDIT Corner hubs — walk physics vs insert/tools
4. PORTAL    Optional: Grok key (console.x.ai) and/or Ollama
5. BUILD     Compiler · PromptGen · GIMP/Blender when local
6. SHIP      TOOLS → Export (web / native scaffolds)
```

Multiplayer: **CREATE SESSION** → copy room code or invite link → friends **JOIN**.  
Voice mic is requested **after** session start — never blocks CREATE.

---

## Where to work

| Area | Path |
|------|------|
| Lobby | `src/lobby/` |
| Auth (Grok key + name) | `src/auth/` |
| Engine | `src/engine/` + `src/shared/` |
| Neg LOD | `negativeLod.js` + `config/negative-lod.json` |
| Visibility E0–E4 | `visibilitySystem.js` + `config/visibility.json` |
| UI surface | `surfaceProfile.js` + `css/surface.css` |
| Network | `network.js`, `sync.js` |
| Agents | `agentPortal.js`, `agentRouter.js`, `src/grok/`, Ollama |
| Agent map | [AGENTS.md](../AGENTS.md) |

Canonical docs: **this file** · CAPABILITIES · [AUTH.md](AUTH.md) · [UI_AND_AGENTS.md](UI_AND_AGENTS.md) · [MULTIPLAYER.md](MULTIPLAYER.md) · [NEGATIVE_LOD.md](NEGATIVE_LOD.md) · PERF_NEXT · [GETTING_STARTED.md](GETTING_STARTED.md). Full index: [README.md](README.md).

---

## Shipped perf (do not re-invent)

- **Neg LOD** — far unlit · **long distances** (~52–110m by tier) · **per-material appearance** tinted by scene fog/hemi/sun
- **Neg LOD tier auto** — static props on Lite/Mobile/Realistic (`applyTierPolicy`)
- **Neg LOD multi-mat / skinned / floor B** — 1:1 slot flats · shared clone · floor unlit when high/far
- **Visibility E0–E4** — frustum × distance · sleep/env gates · **spatial buckets** at scale
- **Perf harness** — SETUP → PERF · `PerfHarness.measure()` · JSON export

### UI surfaces (same URL)

| Profile | Who | Force |
|---------|-----|--------|
| **player** | Play / test / join — no Ollama/AI chrome | `?surface=player` |
| **creator** | Build + agents (desktop default) | `?surface=creator` |
| **full** | All tools | `?surface=full` |

Mobile / coarse pointer defaults to **player**. Switch anytime in lobby or SETUP.

Perf CI: `npm run perf:verify` · browser: `npm run perf:harness` / `perf:harness:compare`.  
Store: `npm run store:ship -- --manifest game.json` · macOS notary: [MAC_NOTARIZE.md](MAC_NOTARIZE.md).

---

## Do / don’t (agent contract)

**Do**

- Prefer ENTER solo first; CREATE only when testing multiplayer  
- Optional Grok from [console.x.ai](https://console.x.ai) — not SuperGrok browser login  
- Prefer graphics tier + existing Neg LOD / visibility / surface flags over new systems  
- Read this file + CAPABILITIES + AGENTS.md before large refactors  
- Keep `src/config.js` `VERSION` as truth; run `npm run version:sync` after bumps  
- Quality defaults: PBR, production intake, export slop scan (no CanvasTexture spam)  
- Respect player surface (no Ollama probe / no forced Portal on phones)

**Don’t**

- Re-add X OAuth / feed / “Sign in with X”  
- Treat `old/` as active code  
- Invent new auth providers without updating AUTH.md  
- Default retro shaders or procedural texture spam  
- Force-push or change product direction without human confirm  
- Re-enable Ollama probes on player surface without an explicit creator switch

---

## Dev commands

```bash
npm install
npm run dev                 # http://localhost:5173
npm run build               # dist-pages (GitHub Pages)
npm run preview:pages       # smoke what visitors get
npm run version:sync:check  # VERSION header drift gate
```

Ollama for **GitHub Pages**: keep a local proxy open — `node scripts/ollama-cors-proxy.cjs` or `npm run ollama:serve` (listens on **:11435**). Plain `ollama serve` alone on `:11434` will CORS-block the live site.

---

## Paste into a Grok chat

```text
Live: https://medicinalsheep.github.io/threshold/
Repo: https://github.com/medicinalsheep/threshold
Spine: docs/BUILD_FROM.md · CAPABILITIES.md · AGENTS.md · UI_AND_AGENTS.md
Free core: ENTER solo, optional Grok key + Ollama (creator surface), PeerJS CREATE/JOIN.
No X OAuth. Surfaces: player | creator | full (?surface=). Mobile → player.
Perf: Neg LOD stack + Visibility E0–E4 shipped. Optional: CI headless (PERF_NEXT).
Task: [your goal]
```
