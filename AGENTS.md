# Threshold Suite — Agent & Developer Guide

Browser-first 3D sandbox with PeerJS multiplayer, Compiler, PromptGen, and local GIMP/Blender creative pipeline.

**Version:** `src/config.js` → `VERSION` (currently 3.7.x)

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
| Export | `gameExport.js`, `exportWizard.js` |
| Native | `electron/`, `capacitor.config.json`, `thresholdShell.js` |
| Plugins | `plugins/threshold-gimp/`, `plugins/threshold-blender/` |
| CLI | `scripts/creative-watch.cjs`, `blender-export.cjs` |

---

## Commands

```bash
npm run dev              # Vite dev (auto-connects creative watch if running)
npm run build            # GitHub Pages production build
npm run textures:watch   # Hot-reload textures/ + import/
npm run gimp:install     # GIMP plugin
npm run blender:install  # Blender addon
npm run blender:export -- --blend scene.blend --object "Name"
npm run package:android  # Capacitor APK scaffold
npm run package:win      # Electron portable exe
```

---

## Multiplayer rules

- Host-authoritative via PeerJS
- Guests use `Actions.dispatch()` — do not mutate world directly
- Sync includes `userData` (textures IDs, gltfPath, physics) — asset **files** are local until Phase E bundling

---

## AI agents (optional UX)

| Agent | UI | API |
|-------|-----|-----|
| Local Script | SCENE → AI | `AgentHub`, interval JS |
| Grok NPC | SCENE → AI | `NpcAgent`, xAI key |
| Grok Dev | SCENE → AI | `DevAgent`, Compiler context |

Walkthrough presents agents as optional. PromptGen is the primary codegen path.

---

## PromptGen / Compiler asset contract

- `getSceneContext()` — live objects + texture/GLTF hints in object list
- `getAssetContext()` — ASSET MANIFEST block when "Include live scene" is checked
- Generated JS should include `// ASSETS:` comment with `textureHint` and `import/*.glb` paths
- Object **name** must match GIMP/Blender export (`Stone Block` → `stone_block_*`)

---

## Docs map

| Doc | Purpose |
|-----|---------|
| [README.md](README.md) | Quick start |
| [docs/CREATIVE_WORKFLOW.md](docs/CREATIVE_WORKFLOW.md) | GIMP/Blender/Engine loop |
| [docs/CREATIVE_PLUGINS.md](docs/CREATIVE_PLUGINS.md) | Phase A–D technical |
| [docs/NEXT_PHASES.md](docs/NEXT_PHASES.md) | LOD, HILOD, iOS, Phase E leftovers |
| [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md) | Product phases |
| [docs/NATIVE_SHELLS.md](docs/NATIVE_SHELLS.md) | APK / Windows / iOS planned |

---

## Contributing

Vanilla JS + Vite. No React. Keep one SPA for all targets. Update roadmap checkboxes when shipping features.