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

## Phase B — GIMP plugin (v4.0)

Python-Fu / Script-Fu scaffold:

```
plugins/threshold-gimp/
  threshold_export.py   # Export layer → textures/MyObject_albedo.png (+ normal optional)
  threshold_manifest.json  # IDs for PromptGen / Compiler
```

**AI workflow:**
1. PromptGen asks for material description
2. User runs GIMP plugin or AI script locally
3. Compiler references `textures/foo_albedo.png` in `World.createObject` material loader

---

## Phase C — Blender addon (v4.0)

```
plugins/threshold-blender/
  __init__.py
  export_gltf_threshold.py  # GLTF + embedded textures → dist/import/
```

**AI workflow:**
1. Model in Blender with PBR materials
2. Export → Threshold **INSERT → GLTF** or drag to Engine
3. Physics + collision from Compiler `userData.hasPhysics`

---

## Phase D — Unified creative CLI (v4.5)

```bash
npm run textures:watch   # watches ./textures → hot-reload on Engine materials
npm run blender:export   # headless Blender export hook
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