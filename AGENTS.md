# Threshold Suite — Agent & Developer Guide

Browser-first 3D sandbox with PeerJS multiplayer, Compiler, PromptGen, GIMP/Blender creative pipeline, and store/Steam export.

**Version:** `src/config.js` → `VERSION` (currently **5.5.0**)

---

## Architecture

| Area | Path |
|------|------|
| Lobby | `src/lobby/` |
| Engine | `src/engine/main.js` |
| Compiler | `src/compiler/main.js` |
| PromptGen | `src/prompter/main.js` |
| Multiplayer | `src/shared/network.js`, `sync.js`, `actions.js` |
| Creative | `textureBridge.js`, `gltfImport.js`, `creativeWatch.js` |
| Export | `gameExport.js`, `exportWizard.js`, `exportWalkthrough.js` |
| Store / Steam | `scripts/store-*.cjs`, `scripts/steam-*.cjs`, `electron/steam*.cjs` |
| Threshold Child assets | `thresholdChildAssets.js`, `referenceEdition.js`, `config/reference-editions.json` |
| Native | `electron/`, `capacitor.config.json`, `thresholdShell.js` |
| Plugins | `plugins/threshold-gimp/`, `plugins/threshold-blender/` |

---

## Commands

```bash
npm run dev                    # Vite dev
npm run build                  # GitHub Pages → dist-pages/
npm run textures:watch         # Hot-reload textures/ + import/ + video/
npm run gimp:install           # GIMP plugin
npm run blender:install        # Blender addon
npm run blender:export -- --blend file.blend --object "Name"
npm run bundle:assets          # Copy creative folders → dist-pages/bundle/
npm run export:graphics -- --profile android|steam|windows
npm run store:prep -- --manifest <game>.threshold-game.json
npm run store:assets -- --manifest <game>.threshold-game.json
npm run package:android        # Capacitor APK scaffold
npm run package:android:release
npm run package:win            # Electron portable + NSIS
npm run package:steam -- --manifest <game>.threshold-game.json
npm run steam:depot -- --manifest <game>.threshold-game.json
npm run reference:fetch        # Dev-only CC0 seeds → reference/_dev-seeds/ (gitignored)
npm run reference:sync         # No-op — Child assets are procedural (see thresholdChildAssets.js)
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

## AI agents (optional UX)

| Agent | UI | API |
|-------|-----|-----|
| Local Script | SCENE → AI | `AgentHub`, interval JS |
| Grok NPC | SCENE → AI | `NpcAgent`, xAI key |
| Grok Dev | SCENE → AI | `DevAgent`, Compiler context |

Engine tutorial = 9 steps. PromptGen is the primary codegen path.

---

## PromptGen / Compiler asset contract

- `getSceneContext()` — live objects + texture/GLTF hints
- `getAssetContext()` — ASSET MANIFEST when "Include live scene" is checked
- Generated JS should include `// ASSETS:` comment with `textureHint` and `import/*.glb` paths
- Object **name** must match GIMP/Blender export (`Stone Block` → `stone_block_*`)

---

## Docs map

| Doc | Purpose |
|-----|---------|
| [README.md](README.md) | Quick start + capabilities |
| [docs/EXPORT_WALKTHROUGH.md](docs/EXPORT_WALKTHROUGH.md) | 9-step export wizard |
| [docs/STORE_RELEASE.md](docs/STORE_RELEASE.md) | Play / App Store / Windows |
| [docs/STORE_ASSETS.md](docs/STORE_ASSETS.md) | IAP / depot / registry maps |
| [docs/STEAM_RELEASE.md](docs/STEAM_RELEASE.md) | Steamworks + depot upload |
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Lobby → ship linear path |
| [docs/THRESHOLD_CHILD_ASSETS.md](docs/THRESHOLD_CHILD_ASSETS.md) | Child policy — original bundled assets only |
| [docs/REFERENCE_EDITIONS.md](docs/REFERENCE_EDITIONS.md) | Child editions registry |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Version history |
| [docs/CREATIVE_WORKFLOW.md](docs/CREATIVE_WORKFLOW.md) | GIMP/Blender/Engine loop |
| [docs/NATIVE_SHELLS.md](docs/NATIVE_SHELLS.md) | APK / Windows / iOS / Steam |
| [docs/NEXT_PHASES.md](docs/NEXT_PHASES.md) | Phase history + open work |
| [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md) | Product north star |

---

## Contributing

Vanilla JS + Vite. No React. One SPA for web, Capacitor, Electron. Update roadmap when shipping features. **Shipped Child editions must be original Threshold content** — see `docs/THRESHOLD_CHILD_ASSETS.md`. External seeds are dev-only in `reference/_dev-seeds/`.