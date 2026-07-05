# Creative Workflow — GIMP, Blender, Engine (v3.6+)

**One loop:** design on device → import into Engine → playtest → export manifest → ship to any platform.

---

## How creative phases change your workflow

| Before (primitives only) | After (A–D shipped) |
|--------------------------|---------------------|
| Color sliders in Texture tab | PNG/JPG PBR maps from GIMP |
| Basic cubes/spheres | Blender GLB meshes at cursor |
| Manual re-import after every save | `textures:watch` hot-reload in dev |
| Export = world JSON only | Manifest lists textures, GLTF paths, GIMP/Blender metadata |

### Recommended solo loop

```
1. LOBBY → SOLO (EDIT)
2. Build layout — Compiler LEGO fit OR Insert primitives
3. ART (pick your path):
   A. GIMP → textures/*.png → Texture tab → GIMP SYNC
   B. Blender → import/*.glb → INSERT → GLTF
   C. Dev: textures:watch + npm run dev (live reload)
4. Optional: SCENE → AI agents on NPCs
5. PLAY — test physics + Hyper render mode
6. SAVE WORLD + MORE → EXPORT (manifest captures all asset refs)
7. package:android / package:win (iOS pipeline — see NEXT_PHASES.md)
```

### Multiplayer note

- **Host** exports GIMP/Blender assets locally; guests receive mesh transforms + `userData` via sync.
- **Texture blobs** and **GLB files** are device-local; run `npm run bundle:assets` before `package:win` / `package:android` to ship `textures/` + `import/` in the app.
- Use **hosted GLB URLs** or bundled paths (`bundle/textures/`, `bundle/import/`) for guests.
- PromptGen should set `textureHint` / `gltfPath` so every client knows which files to load.

---

## Asset naming contract (critical)

Object **Name** in Engine inspector must match export tools:

| Tool | Name field | File pattern |
|------|------------|--------------|
| GIMP | Object name: `Stone Block` | `textures/stone_block_albedo.png` |
| Blender UI | Engine Object Name | `import/stone_block.glb` |
| Blender CLI | `--object "Stone Block"` | same |
| Hot-reload | slug `stone_block` | matches filename prefix |

PromptGen and Compiler **must** use the same display name:

```javascript
const m = World.createObject('cube', 'Stone Block', 0xffffff, true);
m.userData.textureHint = 'textures/stone_block_albedo.png';
// After Blender: INSERT → GLTF or userData.gltfPath = 'import/stone_block.glb'
```

---

## Tool quick reference

| Command | Purpose |
|---------|---------|
| `npm run gimp:install` | Install GIMP export plugin |
| `npm run blender:install` | Install Blender addon |
| `npm run textures:watch` | SSE hot-reload (dev; `VITE_CREATIVE_WATCH=true` in production) |
| `npm run bundle:assets` | Copy textures/ + import/ → dist-pages/bundle/ |
| `npm run blender:export -- --blend scene.blend --object "Name"` | Headless GLB |
| Engine → Texture → **GIMP SYNC** | Load `threshold_manifest.json` |
| Engine → INSERT → **GLTF** | File, URL, or Blender manifest |

---

## PromptGen & Compiler expectations

When generating worlds, AI output should include an **ASSET MANIFEST** comment block:

```javascript
// ASSETS (user imports after RUN):
// - Stone Block: textures/stone_block_albedo.png (+ roughness/metalness optional)
// - Stone Block: import/stone_block.glb (optional — replaces primitive)
// INSPECTOR: Texture / Collision / Audio after pause
```

See `getAssetContext()` in live scene prompts for objects already in the world.

---

## Export manifest fields

`.threshold-game.json` includes:

- `textures[]` — per-object slot IDs and paths
- `gimp` — plugin install path + manifest name
- `blender` — addon path + headless export command
- `creativeCli` — watch URL + npm scripts

Sounds: IndexedDB locally; export wizard can embed base64 clips in manifest. Textures ship via `bundle:assets`.

---

## Render mode tip

Use **Hyper (4)** when showcasing PBR textures and GLTF materials. Retro modes (0–3) remain compatible — stagger objects in Z for depth readability.

---

## Further reading

- [CREATIVE_PLUGINS.md](CREATIVE_PLUGINS.md) — phase A–D implementation detail
- [NEXT_PHASES.md](NEXT_PHASES.md) — LOD, HILOD, iOS, leftovers
- [NATIVE_SHELLS.md](NATIVE_SHELLS.md) — APK / Windows (iOS planned)