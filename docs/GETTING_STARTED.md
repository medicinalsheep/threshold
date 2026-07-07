# Getting started with Threshold (v9.16)

One linear path from lobby to shipping — realism starter, tiered agents, and **TC** export practice.

**Full scope:** [README.md](README.md) (doc index) · **Linear dev path:** [STREAMLINED_DEV.md](STREAMLINED_DEV.md)

---

## The loop

```
Lobby → PLAY or BUILD → Guided tour → Build (EDIT) or Playtest (PLAY) → Export → Package
```

| Step | Where | What you learn |
|------|--------|----------------|
| 1 | **Lobby → ENTER** | Choose **PLAY** or **BUILD** (`?mode=play` deep link) |
| 2 | **Guided tour** (auto or MORE → TUTORIAL) | Showcase site, PromptGen, export pipeline |
| 3 | **PLAY** | Walk, survival vitals, **F** interact, weather, Nikola |
| 4 | **EDIT** | **INSERT → SHOWCASE** snippets, textures, GLTF, SFX |
| 5 | **SAVE WORLD** | Share links `?world=CODE` |
| 6 | **SCENE → AI** (optional) | Ollama tiers, SMART DEV, NPC chat — see [AGENT_ROUTING.md](AGENT_ROUTING.md) |
| 7 | **MORE → EXPORT** | 9-step walkthrough → manifest (TARGETS default Web only) |
| 8 | **CLI** | `store:prep`, `package:*` or `package:steam` |

Optional: **Lobby → TC →** — vehicles, NPCs, circuit, full export **SCENE** / **CREDITS** / **PACKS** practice.

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

Without `--pack`, the live GitHub Pages build already includes bundled assets. A fresh clone needs `assets:pack` (or `quickstart --pack`) before `preview` shows full PBR + avatars.

Verify:

```bash
npm run assets:verify
npm run controls:verify
npm run preview                 # http://localhost:4173
```

Optional local agents:

```bash
ollama serve
npm run bootcamp:build && npm run models:mini
npm run ollama:verify
```

---

## Wardenclyffe showcase (SOLO default)

After **ENTER**, try this 2-minute playtest:

1. Spawn at the **visitor gateway** — walk the gravel path toward the lab.
2. **PLAY** mode — survival vitals tick; **F** at coffee nook / creek / benches.
3. **T** → Third Eye — terminals, Nikola, courtyard props.
4. **F** at AI / Compiler / Avatar kiosks on the approach path.

Full controls and recipes: [REALISTIC_GAMEPLAY.md](REALISTIC_GAMEPLAY.md)

---

## Two asset paths

| Path | For | Policy |
|------|-----|--------|
| **Starter** (SOLO) | Walk/shoot template, GIMP/Blender onboarding | Original Threshold defaults — `assets:pack` |
| **TC** (bundled) | Learning export, demo scenes, store scaffold | **Original** — authored for Threshold only |
| **Your game** | Your shipped title | You source and credit **your** assets |

We do **not** ship unmodified third-party game art in TC editions. See [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md).

Legacy edition ids (`threshold-child-*`) are archived in `old/reference-editions/`. Active ids: `tc-*`.

---

## Creative pipeline

```bash
npm run gimp:install
npm run blender:install
npm run textures:watch    # terminal 1
npm run dev               # terminal 2 — GIMP export hot-reloads
npm run kit:export        # fork-friendly ~1.4 MB WebP pack
```

[GIMP_TEXTURES.md](GIMP_TEXTURES.md) · [BLENDER_AVATARS.md](BLENDER_AVATARS.md) · [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) · [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md)

---

## TC walkthrough QA

After **Lobby → TC →**, verify before export:

| Check | Expected |
|-------|----------|
| Scene objects | ≥6 (`tc_run`, `tc_haul`, `tc_span`, `tc_msh`, `tc_mec`, `tc_cp`) |
| Render mode | Hyper (4) |
| SFX tab | 5 TC clips seeded (`tc_sfx_*`) |
| Textures | PBR maps + HILOD `_512`/`_1k`/`_2k` on TC meshes |
| Intro | `video/tc_intro.webm` plays once (ESC skip) |
| EXPORT SCENE | All TC objects listed with `isTC` / `tcEd` |

Automated: `npm run tc:verify`

---

## Export walkthrough (9 steps)

| # | Step | Purpose |
|---|------|---------|
| 1 | INFO | Game name, author, description |
| 2 | ICONS | Bundle ID, app icon checklist |
| 3 | SCENE | Live inventory review |
| 4 | CREDITS | Licenses and attribution |
| 5 | REVIEW | Manifest preview |
| 6 | TARGETS | Web / Android / Windows / iOS / Steam (default: Web only) |
| 7 | STORE | Contact, privacy URLs |
| 8 | PACKS | Store SKUs, registry URIs |
| 9 | SHIP | Download + target-filtered CLI + secrets checklist |

Detail: [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md)

---

## Ship checklist

**TC Show (automated):**

```bash
npm run tc:ship
npm run tc:ship:verify -- --preview-smoke
```

**Custom game (MORE → EXPORT wizard):**

```bash
npm run store:prep -- --manifest my-game.threshold-game.json --contact you@example.com
npm run store:assets -- --manifest my-game.threshold-game.json
npm run bundle:assets
npm run package:android:release   # or package:win / package:steam
npm run store:verify              # full packaging smoke (optional)
```

| Guide | When |
|-------|------|
| [STORE_RELEASE.md](STORE_RELEASE.md) | Play, App Store, Windows |
| [STEAM_RELEASE.md](STEAM_RELEASE.md) | Steam depot + achievements |
| [STORE_ASSETS.md](STORE_ASSETS.md) | IAP / depot JSON maps |
| [NATIVE_SHELLS.md](NATIVE_SHELLS.md) | Capacitor + Electron |

---

## TC Circuit race

```bash
# Solo or multiplayer: Lobby → TC → · Compiler RUN:
World.enterTcRace()    # lap timer + claim tc_run

World.releaseTcVehicle()   # exit anim · walk avatar
npm run tc:circuit:verify
npm run tc:drive:verify
npm run tc:g3:verify
```

---

## Multiplayer (optional)

**CREATE SESSION** → copy link → friends **JOIN**. Host pauses for EDIT; guests need **Admin** to build. See [README.md](../README.md) host/player section.

---

## Related

- [README.md](README.md) — documentation index + scope map
- [STREAMLINED_DEV.md](STREAMLINED_DEV.md) — lobby → AI tab → export
- [AGENT_ROUTING.md](AGENT_ROUTING.md) — tiered Ollama + Grok
- [REALISTIC_GAMEPLAY.md](REALISTIC_GAMEPLAY.md) — controls + asset recipes
- [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md) — TC policy
- [REFERENCE_EDITIONS.md](REFERENCE_EDITIONS.md) — edition registry
- [CHANGELOG.md](CHANGELOG.md) — version history