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