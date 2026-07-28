# Getting started with Threshold (v10.15.9)

One linear path from lobby to shipping — **terminal grid** default (empty quality baseline), Agent Portal, tiered agents, and optional **TC** export practice.

**Full scope:** [README.md](README.md) (doc index) · **Linear dev path:** [STREAMLINED_DEV.md](STREAMLINED_DEV.md) · **Spine:** [BUILD_FROM.md](BUILD_FROM.md)

---

## Browsers {#browsers}

| Browser | Notes |
|---------|--------|
| **Chrome / Edge** | Fully supported (WebGL + WebRTC) |
| **Firefox** | Fully supported — **not blocked** by Mozilla specifically |
| **Safari** | Works for solo play; multiplayer WebRTC varies by iOS version |

**“Forget About This Site” (Firefox History)** clears site data (cache, storage). That is **good** after a GitHub Pages deploy — it removes **stale `index.html`** that pointed at old hashed JS (the `MIME type text/html` console errors). It does **not** mean Firefox is incompatible.

If the live app fails to load modules after a deploy:

1. Hard refresh (`Ctrl+Shift+R`) or open with `?_v=1`  
2. Or Forget About This Site → reopen the URL  
3. App auto-reloads once when it detects a stale chunk (v10.14.2+)

**Multiplayer on Firefox:** allow WebRTC; if join fails, check Enhanced Tracking Protection exceptions for the site, or try a temporary “Standard” protection level. Corporate VPN/firewall can block PeerJS cloud.

---

## The loop

```
Lobby → ENTER (solo) → PLAY on terminal grid → ARRANGE / EDIT to place → Export → Package
         ↘ CREATE SESSION → share invite → ENTER SESSION (multiplayer host)
```

| Step | Where | What you learn |
|------|--------|----------------|
| 1 | **Lobby → ENTER →** | Solo — **PLAY** on empty terminal grid |
| 2 | Engine | Dark ground + grid · no auto props · hub tour |
| 3 | **Surface** | Phones **player**; desktop **creator**. `?surface=` |
| 4 | **Agent Portal** (creator) | Grok/Ollama · describe a scene |
| 5 | **EDIT** | Insert cube · SCENE **Cell** / **Snap** (1 unit = 1 m) · optional kit |
| 5b | **ARRANGE** | Hub cycle · click select · drag / WASD · snap moves |
| 5c | **PLAY AS** | Select NPC/prop · **K** or inspector **PLAY AS** · release restores player |
| 5d | **QUALITY** | INSERT → QUALITY: light · AI station · materials · physics kit · pad |
| 5e | **SCENE** | Grid cell · snap · Light presets (Terminal / Day / Soft / Night) |
| 6 | **PLAY** | Walk · sim · **F** interact |
| 7 | **SETUP** (optional) | Ollama tiers · gravity · Grok key |
| 8 | **TOOLS → EXPORT** | 9-step walkthrough |
| 9 | **CLI** | `store:prep`, `package:*` or `package:steam` |

Optional multiplayer: **CREATE SESSION** → copy code/link → **ENTER SESSION**. Friends **JOIN** with code (+ passcode if set).  
Optional demo: **Lobby → TC DEMO** (creator surface). Optional **Grok** key — [AUTH.md](AUTH.md).

---

## Developer first clone

```bash
git clone https://github.com/medicinalsheep/threshold.git
cd threshold
npm install
npm run quickstart              # read onboarding steps
npm run quickstart -- --pack    # regenerate all starter assets (~1 min)
npm run dev                     # http://localhost:5173
```

For local Ollama with GitHub Pages-style CORS:

```bash
npm run ollama:serve            # terminal 1 — not plain ollama serve
npm run dev                     # terminal 2
```

Verify:

```bash
npm run assets:verify
npm run controls:verify
node scripts/portal-ui-verify.cjs
node scripts/surface-verify.cjs
node scripts/negative-lod-verify.cjs
npm run physics:verify
npm run perf:verify
npm run preview                 # http://localhost:4173
```

Optional local agents:

```bash
npm run bootcamp:build && npm run models:mini
npm run ollama:verify
```

---

## First session (2 minutes)

After **ENTER** (starts in **PLAY** on empty grid):

1. Walk the terminal grid — clean slate.
2. Hub **ARRANGE** / **EDIT** — place props; **INSERT → QUALITY** for light / kit / AI / materials / pad.
3. Select prop → **K** Play as (solo); Esc/K release.
4. On **desktop (creator):** AI chip / Portal for Grok or Ollama.
5. **PLAY** to simulate; **T** chat; **UNLOCK** to drag hubs.

Full controls: [CONTROLS.md](CONTROLS.md) · UI layout / surfaces: [UI_AND_AGENTS.md](UI_AND_AGENTS.md)

---

## Two asset paths

| Path | For | Policy |
|------|-----|--------|
| **Your game** (default) | Terminal grid + QUALITY ladder + Portal | You source and credit your assets |
| **Workspace Pad** | Lobby template / INSERT QUALITY | Optional polished pad + day light |
| **TC** (bundled) | Learning export, demo scenes | Original Threshold art only |

See [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md). Legacy ids (`threshold-child-*`) are in `old/reference-editions/`.

---

## Creative pipeline

```bash
npm run gimp:install
npm run blender:install
npm run textures:watch    # terminal 1
npm run dev               # terminal 2 — GIMP export hot-reloads
npm run kit:export        # fork-friendly ~1.4 MB WebP pack
```

[GIMP_TEXTURES.md](GIMP_TEXTURES.md) · [BLENDER_AVATARS.md](BLENDER_AVATARS.md) · [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md)

---

## Export walkthrough (9 steps)

| # | Step | Purpose |
|---|------|---------|
| 1 | INFO | Game name, author, description |
| 2 | ICONS | Bundle ID, `icons/appicon512.png` checklist |
| 3 | SCENE | Live inventory review |
| 4 | CREDITS | Licenses and attribution |
| 5 | REVIEW | Manifest preview |
| 6 | TARGETS | Web / Android / Windows / iOS / Steam |
| 7 | STORE | Contact, privacy URLs |
| 8 | PACKS | Store SKUs, registry URIs |
| 9 | SHIP | Download + target-filtered CLI |

Detail: [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md)

---

## Ship checklist

```bash
npm run store:prep -- --manifest my-game.threshold-game.json --contact you@example.com
npm run store:assets -- --manifest my-game.threshold-game.json
npm run bundle:assets
npm run package:android:release   # or package:win / package:steam
npm run store:verify              # optional smoke
```

| Guide | When |
|-------|------|
| [STORE_RELEASE.md](STORE_RELEASE.md) | Play, App Store, Windows |
| [STEAM_RELEASE.md](STEAM_RELEASE.md) | Steam depot |
| [NATIVE_SHELLS.md](NATIVE_SHELLS.md) | Capacitor + Electron |

---

## Multiplayer (optional)

**CREATE SESSION** → share room code/link → **ENTER SESSION** → friends **JOIN**. Optional host passcode under **More options**. Host pauses for EDIT; guests need **Admin** to build. CREATE times out after 12s if the peer server is unreachable — use **ENTER** for solo.

---

## Related

- [ROADMAP.md](ROADMAP.md) — v10.8+ forward plan
- [STREAMLINED_DEV.md](STREAMLINED_DEV.md) — Portal → SETUP → export
- [AUTH.md](AUTH.md) — optional Grok API key (no X OAuth)
- [BUILD_FROM.md](BUILD_FROM.md) — one-page spine
- [AGENT_ROUTING.md](AGENT_ROUTING.md) — tiered Ollama + Grok
- [UI_AND_AGENTS.md](UI_AND_AGENTS.md) — surfaces, lobby, hubs, freeze
- [CONTROLS.md](CONTROLS.md) — action controls + movement tuning
- [CHANGELOG.md](CHANGELOG.md) — version history