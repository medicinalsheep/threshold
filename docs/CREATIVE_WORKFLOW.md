# Creative Workflow — GIMP, Blender, Engine (v9.6+)

**One loop:** choose PLAY or BUILD → design on device → import into Engine → playtest → export manifest → ship.

---

## How creative phases change your workflow

| Before (primitives only) | After (showcase + pipeline) |
|--------------------------|-----------------------------|
| Color sliders in Texture tab | PNG/JPG PBR maps from GIMP |
| Colored cubes in courtyard | Wardenclyffe GLBs + gateway + PromptGen extend |
| Manual re-import after every save | `textures:watch` hot-reload in dev |
| Export = world JSON only | Manifest lists textures, GLTF, survival hooks, MP sync |

### Recommended solo loop

```
1. LOBBY → choose PLAY or BUILD → ENTER
2. Guided tour (first visit) — confirm mode, PromptGen EXAMPLES, export path
3. BUILD — **INSERT → SHOWCASE** snippets OR Compiler LEGO fit OR Insert / GLTF
4. ART (pick your path):
   A. GIMP → textures/*.png → Texture tab → GIMP SYNC
   B. Blender → import/*.glb → INSERT → GLTF
   C. Dev: textures:watch + npm run dev (live reload)
5. Optional: SCENE → EDIT (`survivalKind`, `ambientZone`) · Agents on NPCs
6. PLAY — test walk, vitals, weather, physics
7. SAVE WORLD + MORE → EXPORT & PLAY (quick) or EXPORT wizard (full)
8. package:android / package:win / package:steam
```

### Multiplayer note

- **Host** exports GIMP/Blender assets locally; guests receive transforms + `userData` via sync.
- **Texture/audio manifests** — host pushes custom blobs on join (Sprints G–H).
- **Scene lock** + **AI ack** — host can gate guest edits and compiler runs.
- Use bundled paths (`bundle/textures/`, `bundle/import/`) or hosted GLB URLs for guests.
- PromptGen should set `textureHint` / `gltfPath` and `// ASSETS:` blocks for export credits.

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

**Extend pattern (preferred):** PromptGen → **EXAMPLES** — tested prompts that add to the live scene without `World.clearWorld()`.

---

## Tool quick reference

| Command | Purpose |
|---------|---------|
| `npm run gimp:install` | Install GIMP export plugin |
| `npm run blender:install` | Install Blender addon |
| `npm run textures:watch` | GIMP live SYNC — auto WebP + manifest hot-reload (with `dev`) |
| `npm run kit:export` | Fork-friendly WebP starter pack (~1.4 MB) |
| `npm run quickstart` | Onboarding steps (+ `--pack` for full `assets:pack`) |
| `npm run bundle:assets` | Copy textures/ + import/ → dist-pages/bundle/ |
| `npm run blender:export -- --blend scene.blend --object "Name"` | Headless GLB |
| Engine → Texture → **GIMP SYNC** | Load `threshold_manifest.json` |
| Engine → INSERT → **GLTF** | File, URL, or Blender manifest |
| Engine → **MORE → EXPORT & PLAY** | One-click save + playable tab |

---

## PromptGen & Compiler expectations

When generating worlds, AI output should include an **ASSETS** comment block:

```javascript
// ASSETS (user imports after RUN):
// - Stone Block: textures/stone_block_albedo.png (+ roughness/metalness optional)
// - Stone Block: import/stone_block.glb (optional — replaces primitive)
// INSPECTOR: Texture / Collision / Audio after BUILD pause
```

See `getAssetContext()` in live scene prompts. Cookbook: **PromptGen → EXAMPLES** (10 tested extend prompts).

Survival props:

```javascript
// userData on interact root:
// interactAction: 'survival', survivalKind: 'food'|'water'|'rest'|'snack'
// then applySurvivalWorldHooks() or tag in bootstrap
```

---

## Export manifest fields

`.threshold-game.json` includes:

- `textures[]` — per-object slot IDs and paths
- `gimp` / `blender` / `creativeCli` — tool metadata
- `graphics.profiles` — per-platform asset slices
- Optional embedded sound blobs (export wizard)

Sounds: IndexedDB locally; textures ship via `bundle:assets`. **EXPORT preflight** scans missing clips, GLTF paths, and `clearWorld` risks before ship.

---

## Render mode tip

Use **Hyper (4)** when showcasing PBR textures and GLB materials. Retro modes (0–3) remain compatible — stagger objects in Z for depth readability. Graphics tier suggested after guided tour — **SCENE → ENV**.

---

## Further reading

- [GETTING_STARTED.md](GETTING_STARTED.md) — lobby → ship linear path
- [REALISTIC_GAMEPLAY.md](REALISTIC_GAMEPLAY.md) — controls, survival, showcase site
- [GIMP_TEXTURES.md](GIMP_TEXTURES.md) — install, batch, live SYNC
- [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md) — HILOD, codecs, presets
- [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) — 9-step wizard
- [POLISH_ROADMAP.md](POLISH_ROADMAP.md) — Sprints L–R (polish complete)
- [NEXT_PHASES.md](NEXT_PHASES.md) — phase history