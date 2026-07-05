# Creative Plugins — Local Texture Pipeline (planned)

**Vision:** Lightweight realistic gaming + dev — AI generates textures on **your device** via Blender and GIMP, then Threshold imports them into the live scene.

---

## Why local-first

| Approach | Benefit |
|----------|---------|
| **Blender + GIMP on device** | No upload latency, full artist control, works offline |
| **Threshold PromptGen** | Describes materials; references exported texture paths |
| **Compiler LEGO fit** | Snaps textured meshes into live world with physics metadata |

---

## Phase A — File bridge (v3.3)

- [x] **Import texture** — ENGINE inspector → Texture tab → load PNG/JPG from disk (Electron) or file picker (web)
- [x] **Apply to selected mesh** — `material.map` + roughness/metalness maps when present
- [x] **Manifest field** — `.threshold-game.json` lists `textures: [{ id, path, objectId }]`

---

## Phase B — GIMP plugin (v3.4)

Python-Fu scaffold:

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

**AI workflow:**
1. PromptGen asks for material description
2. User runs GIMP plugin or AI script locally
3. Compiler sets `userData.textureHint = 'textures/foo_albedo.png'` — GIMP SYNC or Texture tab import applies maps

---

## Phase C — Blender addon (v3.5)

```
plugins/threshold-blender/
  threshold_blender/
    __init__.py
    export_gltf_threshold.py   # GLB + embedded textures → import/
  threshold_blender_manifest.json
```

Install: `npm run blender:install` → enable add-on in Blender Preferences.

**Export workflow:**
1. Model in Blender with PBR materials (select object(s))
2. **File → Export → Threshold GLTF (.glb)** — object name matches Engine inspector
3. Export folder → project `import/` (writes `threshold_blender_manifest.json`)
4. Engine — **INSERT → GLTF** — file, URL, or **BLENDER MANIFEST** (Electron loads paths)

**AI workflow:**
1. Model in Blender with PBR materials
2. Compiler sets `userData.hasPhysics`, mass, friction on snapped props
3. Export GLB → INSERT → GLTF or BLENDER MANIFEST at cursor

---

## Phase D — Unified creative CLI (v3.6)

```bash
npm run textures:watch   # SSE relay on :3927 — hot-reload textures/ + import/ in Engine (dev)
npm run blender:export   # headless Blender → import/*.glb + manifest
npm run creative:watch   # alias for textures:watch (textures + GLTF folders)
```

**Hot-reload loop (dev):**
1. Terminal A: `npm run textures:watch`
2. Terminal B: `npm run dev` (or `electron:dev`)
3. GIMP/Blender saves to `textures/` or `import/` → Engine updates live materials / GLTF meshes

**Headless Blender:**
```bash
npm run blender:export -- --blend scene.blend --object "Stone Block"
```

---

## PromptGen contract (today)

Reference library entry `lego_fit_anything` + future `texture_local_path`:

```javascript
// After GIMP/Blender export:
const m = World.createObject('cube', 'Stone Block', 0xffffff, true);
// Phase A: TextureLoader → m.material.map = ...
m.userData.textureHint = 'textures/stone_albedo.png';
```

---

## North star

**Breakthrough:** Retro render modes (Threshold/Terminal) for compatibility + **Hyper** for realism — same world, same physics, same locally authored textures. No cloud required for art pipeline.