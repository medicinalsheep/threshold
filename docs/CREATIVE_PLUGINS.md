# Creative Plugins — Local Art Pipeline (shipped A–D)

**Vision:** Lightweight realistic gaming + dev — AI generates textures on **your device** via Blender and GIMP, then Threshold imports them into the live scene.

**Workflow guide:** [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) · **Next phases (LOD, iOS):** [NEXT_PHASES.md](NEXT_PHASES.md)

---

## Why local-first

| Approach | Benefit |
|----------|---------|
| **Blender + GIMP on device** | No upload latency, full artist control, works offline |
| **Threshold PromptGen** | Describes materials; references exported texture paths |
| **Compiler LEGO fit** | Snaps textured meshes into live world with physics metadata |

---

## Phase A — File bridge (v3.3) ✅

- [x] **Import texture** — ENGINE inspector → Texture tab → load PNG/JPG from disk (Electron) or file picker (web)
- [x] **Apply to selected mesh** — `material.map` + roughness/metalness maps when present
- [x] **Manifest field** — `.threshold-game.json` lists `textures: [{ id, path, objectId }]`

---

## Phase B — GIMP plugin (v3.4) ✅

```
plugins/threshold-gimp/
  threshold_export.py      # Filters → Threshold → Export PBR Maps…
  threshold_manifest.json  # Example manifest for PromptGen / Compiler
```

Install: `npm run gimp:install` (copies plugin to GIMP plug-ins folder). Restart GIMP.

**Export workflow:**
1. GIMP — name layers `roughness`, `metalness`, optional `normal`
2. **Filters → Threshold → Export PBR Maps…** — object name must match Engine mesh name
3. Export folder → project `textures/` (writes `threshold_manifest.json`)
4. Engine — EDIT → select mesh → Texture tab → **GIMP SYNC** (Electron loads maps from disk; web shows paths to import manually)

**Left behind (Phase E):** normal map application in Engine; full web auto-apply

---

## Phase C — Blender addon (v3.5) ✅

```
plugins/threshold-blender/
  threshold_blender/
    __init__.py
    export_gltf_threshold.py   # GLB + embedded textures → import/
  threshold_blender_manifest.json
  headless_export.py             # CLI / CI batch export
```

Install: `npm run blender:install` → enable add-on in Blender Preferences.

**Export workflow:**
1. Model in Blender with PBR materials (select object(s))
2. **File → Export → Threshold GLTF (.glb)** — object name matches Engine inspector
3. Export folder → project `import/` (writes `threshold_blender_manifest.json`)
4. Engine — **INSERT → GLTF** — file, URL, or **BLENDER MANIFEST** (Electron loads paths)

---

## Phase D — Unified creative CLI (v3.6) ✅

```bash
npm run textures:watch   # SSE relay on :3927 — hot-reload textures/ + import/
npm run blender:export   # headless Blender → import/*.glb + manifest
npm run creative:watch   # alias for textures:watch
```

**Hot-reload loop (dev):**
1. Terminal A: `npm run textures:watch`
2. Terminal B: `npm run dev`
3. GIMP/Blender saves → Engine updates materials / GLTF meshes live

**Left behind (Phase E):** production builds opt-in watch; native asset bundling

---

## PromptGen contract

```javascript
// After GIMP/Blender export:
const m = World.createObject('cube', 'Stone Block', 0xffffff, true);
m.userData.textureHint = 'textures/stone_block_albedo.png';
// ASSETS: textures/stone_block_*.png · import/stone_block.glb (optional)
```

PromptGen with **Include live scene** appends `getAssetContext()` — lists clips, hints, GLTF paths.

---

## North star

**Breakthrough:** Retro render modes (Threshold/Terminal) for compatibility + **Hyper** for realism — same world, same physics, same locally authored textures. No cloud required for art pipeline.

**Next:** [NEXT_PHASES.md](NEXT_PHASES.md) — Phase E leftovers, iOS App Store, LOD, HILOD, suggested graphics tiers.