# Getting started with Threshold (v5.5)

One linear path from lobby to shipping — and where **Threshold Child** assets fit.

---

## The loop

```
Lobby → Tutorial → Build (EDIT) → Playtest → Export (9 steps) → Store prep → Package
```

| Step | Where | What you learn |
|------|--------|----------------|
| 1 | **Lobby → SOLO PLAY** | Session identity, solo vs host |
| 2 | **Tutorial** (auto or MORE → TUTORIAL) | Panels, EDIT/PLAY, insert, optional AI |
| 3 | **EDIT** | Insert objects, textures, GLTF, SFX |
| 4 | **PLAY** | Walk/fly, physics, graphics tier |
| 5 | **SAVE WORLD** | Share links `?world=CODE` |
| 6 | **MORE → EXPORT** | 9-step walkthrough → manifest |
| 7 | **CLI** | `store:prep`, `package:*` or `package:steam` |

Optional: **Lobby → THRESHOLD CHILD** loads **original** reference vehicles (not third-party files) to practice export **SCENE** and **CREDITS**.

---

## Two asset paths

| Path | For | Policy |
|------|-----|--------|
| **Threshold Child** (bundled) | Learning export, demo scenes, store scaffold | **Original** — authored for Threshold only |
| **Your game** (user-built) | Your shipped title | You source and credit **your** assets legally |

We do **not** ship unmodified third-party game art in Threshold Child editions. See [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md).

---

## Export walkthrough (9 steps)

| # | Step | Purpose |
|---|------|---------|
| 1 | INFO | Game name, author, description |
| 2 | ICONS | Bundle ID, app icon checklist |
| 3 | SCENE | Live inventory review |
| 4 | CREDITS | Licenses and attribution |
| 5 | REVIEW | Manifest preview |
| 6 | TARGETS | Web / Android / Windows / iOS / Steam |
| 7 | STORE | Contact, privacy URLs |
| 8 | PACKS | Store SKUs, registry URIs |
| 9 | SHIP | Download + CLI commands |

Detail: [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md)

---

## Ship checklist

```bash
# After EXPORT → download my-game.threshold-game.json
npm run store:prep -- --manifest my-game.threshold-game.json --contact you@example.com
npm run store:assets -- --manifest my-game.threshold-game.json
npm run bundle:assets
npm run package:android:release   # or package:win / package:steam
```

| Guide | When |
|-------|------|
| [STORE_RELEASE.md](STORE_RELEASE.md) | Play, App Store, Windows |
| [STEAM_RELEASE.md](STEAM_RELEASE.md) | Steam depot + achievements |
| [STORE_ASSETS.md](STORE_ASSETS.md) | IAP / depot JSON maps |
| [NATIVE_SHELLS.md](NATIVE_SHELLS.md) | Capacitor + Electron |

---

## Creative pipeline

```bash
npm run gimp:install
npm run blender:install
npm run textures:watch    # + npm run dev
npm run blender:export -- --blend scene.blend --object "My Prop"
```

[GIMP/Blender workflow](CREATIVE_WORKFLOW.md) · [Plugins](CREATIVE_PLUGINS.md)

---

## Multiplayer (optional)

**CREATE SESSION** → copy link → friends **JOIN**. Host pauses for EDIT; guests need **Admin** to build. See [README.md](../README.md) host/player section.

---

## Related

- [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md) — bundled original reference policy
- [REFERENCE_EDITIONS.md](REFERENCE_EDITIONS.md) — edition registry
- [CHANGELOG.md](CHANGELOG.md) — version history