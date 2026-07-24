# Getting started with Threshold (v10.14.2)

One linear path from lobby to shipping — blank grid default, Agent Portal, tiered agents, and optional **TC** export practice.

**Full scope:** [README.md](README.md) (doc index) · **Linear dev path:** [STREAMLINED_DEV.md](STREAMLINED_DEV.md)

---

## The loop

```
Lobby → ENTER (solo) → play or build → EDIT or PLAY → Export → Package
         ↘ CREATE SESSION → share invite → ENTER SESSION (multiplayer host)
```

| Step | Where | What you learn |
|------|--------|----------------|
| 1 | **Lobby → ENTER →** | Solo primary — **PLAY** walk-ready on workspace pad |
| 2 | Engine | Concrete pad · kit props · AI station · short hub tour |
| 3 | **Surface** | Phones default **player** (clean play UI). Desktop **creator** for AI tools. `?surface=` |
| 4 | **Agent Portal** (creator) | Describe what to build · Grok/Ollama auto-detect |
| 5 | **EDIT** | TOOLS menu → insert, **MATERIAL LIBRARY EXAMPLES**, Compiler, PromptGen, textures |
| 6 | **PLAY** | Top-left PLAY · walk physics · **F** interact |
| 7 | **SETUP** (optional) | Ollama tiers, freeze prefs, Grok key — [AGENT_ROUTING.md](AGENT_ROUTING.md) |
| 8 | **TOOLS → EXPORT** | 9-step walkthrough → manifest (TARGETS default Web only) |
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

After **ENTER**:

1. On **desktop (creator):** Agent Portal / AI chip — connect Grok or Ollama, describe a scene. On **phone (player):** walk/test first; tap **Creator tools** when you need AI.
2. Switch to **EDIT** (top-left) — TOOLS menu for insert (Compiler/export on creator).
3. Switch to **PLAY** — test walk, LMB aim, touch toggle (bottom-left).
4. Press **T** for in-game chat; **UNLOCK** (top-left) to drag hub buttons.

Full controls: [CONTROLS.md](CONTROLS.md) · UI layout / surfaces: [UI_AND_AGENTS.md](UI_AND_AGENTS.md)

---

## Two asset paths

| Path | For | Policy |
|------|-----|--------|
| **Your game** (default) | Blank grid + Portal builds | You source and credit your assets |
| **TC** (bundled) | Learning export, demo scenes | Original Threshold art only |
| **Showcase snippets** | Optional props via INSERT | Wardenclyffe pieces — not default spawn |

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