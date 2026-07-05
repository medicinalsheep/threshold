# Threshold Suite — Agent & Developer Guide

Browser-first 3D sandbox with PeerJS multiplayer, Compiler, PromptGen, GIMP/Blender creative pipeline, realism starter defaults (TPS/FPS/ADS/footsteps), and store/Steam export.

**Version:** `src/config.js` → `VERSION` (currently **6.4.1**)

**Doc index:** [docs/README.md](docs/README.md) — full scope map

---

## Architecture

| Area | Path |
|------|------|
| Lobby | `src/lobby/` |
| Engine | `src/engine/main.js` |
| Starter scene | `src/engine/starterScene.js`, `starterTex.js`, `starterSfx.js` |
| Realism | `player.js`, `fpsViewmodel.js`, `footsteps.js`, `npcPatrol.js` |
| Compiler | `src/compiler/main.js` |
| PromptGen | `src/prompter/main.js` |
| Multiplayer | `src/shared/network.js`, `sync.js`, `actions.js` |
| Creative | `textureBridge.js`, `gltfImport.js`, `creativeWatch.js` |
| Export | `gameExport.js`, `exportWizard.js`, `exportWalkthrough.js` |
| Store / Steam | `scripts/store-*.cjs`, `scripts/steam-*.cjs`, `electron/steam*.cjs` |
| TC assets | `tcShow.js`, `tcVeh.js`, `tcChr.js`, `tcSfx.js`, `tcLite.js`, `tcMeta.js` |
| Asset gen | `scripts/tc-gen-tex.cjs`, `gen-starter-avatar.cjs`, `gen-starter-sfx.cjs` |
| Starter kit | `config/starter-kit.json`, `export-starter-kit.cjs` |
| Native | `electron/`, `capacitor.config.json`, `thresholdShell.js` |
| Plugins | `plugins/threshold-gimp/`, `plugins/threshold-blender/` |
| Legacy archive | `old/` — pre-tc-* editions, R2 child-vehicle scripts |

---

## Commands

```bash
npm run quickstart              # onboarding (+ --verify / --pack)
npm run dev                     # Vite dev
npm run build                   # GitHub Pages → dist-pages/
npm run preview                 # :4173 smoke test
npm run assets:pack             # tex + avatars + sounds + webp + build + bundle + kit
npm run assets:verify           # starter smoke test
npm run textures:watch          # GIMP live SYNC (with dev)
npm run kit:export              # fork-friendly WebP pack
npm run kit:verify
npm run gimp:install
npm run blender:install
npm run blender:avatar -- --blend file.blend --object Armature
npm run blender:export -- --blend file.blend --object "Name"
npm run bundle:assets
npm run tc:build
npm run tc:verify
npm run tc:ship
npm run tc:ship:verify
```

---

## Export walkthrough (9 steps)

`MORE → EXPORT`: **INFO → ICONS → SCENE → CREDITS → REVIEW → TARGETS → STORE → PACKS → SHIP**

Manifest includes `branding`, `credits`, `assetRegistry`, `assetOpportunity`, `store`. Post-download: `store:prep`, `store:assets`, `package:*` or `package:steam`.

---

## Multiplayer rules

- Host-authoritative via PeerJS
- Guests use `Actions.dispatch()` — do not mutate world directly
- Sync includes `userData` (texture IDs, gltfPath, physics)
- Creative files ship via `npm run bundle:assets` → `dist-pages/bundle/`

---

## Asset naming contract

Object **Name** in Engine inspector must match GIMP/Blender export slug:

| Tool | Name `Stone Block` | Files |
|------|-------------------|-------|
| GIMP | `objectName` | `textures/stone_block_albedo.png` |
| Blender | `--object "Stone Block"` | `import/stone_block.glb` |
| Starter | `config/starter-textures.json` | UV repeat + preset bind |

Live manifest: `textures/threshold_manifest.json` (not `old/plugins/...` sample).

---

## Docs map

| Doc | Purpose |
|-----|---------|
| [docs/README.md](docs/README.md) | **Full scope index** |
| [README.md](README.md) | Quick start + capabilities |
| [docs/REALISTIC_GAMEPLAY.md](docs/REALISTIC_GAMEPLAY.md) | Action controls, starter scene |
| [docs/ASSET_CAPABILITIES.md](docs/ASSET_CAPABILITIES.md) | HILOD, codecs, presets, kit |
| [docs/GIMP_TEXTURES.md](docs/GIMP_TEXTURES.md) | GIMP install + live SYNC |
| [docs/BLENDER_AVATARS.md](docs/BLENDER_AVATARS.md) | Rigged GLB export |
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Lobby → ship path |
| [docs/EXPORT_WALKTHROUGH.md](docs/EXPORT_WALKTHROUGH.md) | 9-step export wizard |
| [docs/THRESHOLD_CHILD_ASSETS.md](docs/THRESHOLD_CHILD_ASSETS.md) | TC original-asset policy |
| [docs/REFERENCE_EDITIONS.md](docs/REFERENCE_EDITIONS.md) | TC edition registry |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Version history |
| [old/README.md](old/README.md) | Archived legacy files |

---

## Contributing

Vanilla JS + Vite. No React. One SPA for web, Capacitor, Electron. Update [docs/CHANGELOG.md](docs/CHANGELOG.md) when shipping features. **Shipped TC editions must be original Threshold content** — see `docs/THRESHOLD_CHILD_ASSETS.md`. External seeds are dev-only in `reference/_dev-seeds/`.