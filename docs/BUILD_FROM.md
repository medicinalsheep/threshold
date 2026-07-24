# Build from Threshold

**One-page spine** for humans and agents. Open the live app, then extend — don’t rewrite the core.

| | |
|--|--|
| **Live** | https://medicinalsheep.github.io/threshold/ |
| **Repo** | https://github.com/medicinalsheep/threshold |
| **Version** | see `src/config.js` → `VERSION` |
| **Snapshot** | [CAPABILITIES.md](CAPABILITIES.md) · **Perf** | [PERF_NEXT.md](PERF_NEXT.md) |

---

## What it is

Browser **3D creative suite**: blank grid → optional AI (Grok key + local Ollama) → play/build multiplayer → export.  
**No account required.** **No X OAuth.** Host-authoritative PeerJS when you CREATE a session.

Stack: Vite · Three.js · Cannon · PeerJS SPA · GitHub Pages.

---

## Six-step loop

```text
1. LOBBY     Open live (or npm run dev) · optional display name
2. SURFACE   Phones → player UI; desktop → creator · ?surface=player|creator|full
3. ENTER     Solo blank grid — no network (or CREATE SESSION for MP)
4. PLAY/EDIT Corner hubs — walk physics vs insert/tools
5. PORTAL    (creator) Grok key and/or Ollama · build agents
6. SHIP      TOOLS → Export · npm run store:ship (optional)
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
| Network | `network.js`, `sync.js`, `remotePlayers.js` |
| Agents | `agentPortal.js`, `agentRouter.js`, `src/grok/`, Ollama |
| Materials | `materialPresets.js`, `materialLibrary.js` · [MATERIALS.md](MATERIALS.md) |
| Store / macOS | `scripts/store-ship.cjs`, `notarize-mac.cjs` · [MAC_NOTARIZE.md](MAC_NOTARIZE.md) |
| Agent map | [AGENTS.md](../AGENTS.md) |

Canonical docs: **this file** · CAPABILITIES · [AUTH.md](AUTH.md) · [UI_AND_AGENTS.md](UI_AND_AGENTS.md) · [MULTIPLAYER.md](MULTIPLAYER.md) · [NEGATIVE_LOD.md](NEGATIVE_LOD.md) · PERF_NEXT · [STORE_RELEASE.md](STORE_RELEASE.md) · [GETTING_STARTED.md](GETTING_STARTED.md). Full index: [README.md](README.md).

---

## Shipped systems (do not re-invent)

- **Neg LOD** — long distances (~72–165m, default 100) · light-baked unlit color · tier auto static props · multi-mat/skinned · **floor B + path C** (instance near/far) · mesh/HILOD first (18/48m)
- **Visibility E0–E4** — frustum × distance · sleep/env · spatial buckets
- **E5** — far remote lerp · bloom skip (Lite / no on-screen emissive)
- **Surfaces** — player / creator / full (`?surface=`)
- **Perf** — SETUP → PERF · `npm run perf:harness` / `perf:harness:compare` · warm-up + hitch filter
- **Store** — `npm run store:ship` · mac notary hooks · signing stays local

### UI surfaces (same URL)

| Profile | Who | Force |
|---------|-----|--------|
| **player** | Play / test / join — no Ollama/AI chrome | `?surface=player` |
| **creator** | Build + agents (desktop default) | `?surface=creator` |
| **full** | All tools | `?surface=full` |

Mobile / coarse pointer defaults to **player**. Switch anytime in lobby or SETUP.

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
- Commit keystores, `.p12`, or Apple app-specific passwords  

---

## Dev commands

```bash
npm install
npm run dev                 # http://localhost:5173
npm run build               # dist-pages (GitHub Pages)
npm run preview:pages       # smoke what visitors get
npm run version:sync:check  # VERSION header drift gate
npm run perf:verify
npm run perf:harness:compare
npm run store:ship -- --manifest exports/game.threshold-game.json --targets win
```

Ollama for **GitHub Pages**: keep a local proxy open — `node scripts/ollama-cors-proxy.cjs` or `npm run ollama:serve` (listens on **:11435**). Plain `ollama serve` alone on `:11434` will CORS-block the live site.

---

## Paste into a Grok chat

```text
Live: https://medicinalsheep.github.io/threshold/
Repo: https://github.com/medicinalsheep/threshold
Spine: docs/BUILD_FROM.md · CAPABILITIES.md · AGENTS.md · UI_AND_AGENTS.md
Free core: ENTER solo, optional Grok + Ollama (creator surface), PeerJS CREATE/JOIN.
No X OAuth. Surfaces: player | creator | full (?surface=). Mobile → player.
Perf: Neg LOD (tint + floor C) · Vis E0–E4 · E5 remotes/bloom · perf:harness.
Ship: store:ship · MAC_NOTARIZE.md (signing local).
Task: [your goal]
```
