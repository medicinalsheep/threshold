# Creative Workflow — GIMP, Blender, Engine (v10.8)

**One loop:** CREATE SESSION → blank grid → design on device → import into Engine → playtest → export manifest → ship.

---

## How creative phases change your workflow

| Before (primitives only) | After (pipeline) |
|--------------------------|------------------|
| Color sliders in Texture tab | PNG/JPG PBR maps from GIMP |
| Empty grid cubes | Blender GLBs + PromptGen extend |
| Manual re-import after every save | `textures:watch` hot-reload in dev |
| Export = world JSON only | Manifest lists textures, GLTF, survival hooks, MP sync |

### Recommended solo loop

```
1. LOBBY → CREATE SESSION → ENTER (blank grid)
2. Agent Portal — describe scene or use TOOLS → Compiler / PromptGen
3. BUILD — insert GLTF or Compiler scripts (quality PBR via GIMP/Blender)
4. ART (pick your path):
   A. GIMP → textures/*.png → GIMP SYNC
   B. Blender → import/*.glb → INSERT → GLTF
   C. Dev: textures:watch + npm run dev (live reload)
5. Optional: SETUP (tiered agents) · EDIT inspector hooks
6. PLAY — test walk, physics, vitals if enabled
7. SAVE WORLD + TOOLS → EXPORT & PLAY or EXPORT wizard
8. package:android / package:win / package:steam
```

### Multiplayer note

- **Host** exports GIMP/Blender assets locally; guests receive transforms + `userData` via sync.
- **Texture/audio manifests** — host pushes custom blobs on join.
- **Scene lock** + **AI ack** — host can gate guest edits.
- Use bundled paths or hosted GLB URLs for guests.

---

## Asset naming contract (critical)

Object **Name** in Engine inspector must match export tools:

| Tool | Name field | File pattern |
|------|------------|--------------|
| GIMP | Object name: `Stone Block` | `textures/stone_block_albedo.png` |
| Blender UI | Engine Object Name | `import/stone_block.glb` |
| Blender CLI | `--object "Stone Block"` | same |

**Extend pattern (preferred):** PromptGen → **EXAMPLES** — tested prompts that add to the live scene without `World.clearWorld()`.

---

## Tool quick reference

| Command | Purpose |
|---------|---------|
| `npm run gimp:install` | Install GIMP export plugin |
| `npm run blender:install` | Install Blender addon |
| `npm run textures:watch` | GIMP live SYNC |
| `npm run kit:export` | Fork-friendly WebP starter pack |
| `npm run quickstart` | Onboarding (+ `--pack` for `assets:pack`) |
| `npm run bundle:assets` | Copy textures/ + import/ → dist-pages/bundle/ |
| TOOLS → INSERT | Character, GLTF, saved players, custom code |
| TOOLS → EXPORT | 9-step wizard |

---

## PromptGen & Compiler expectations

Include an **ASSETS** comment block in generated scripts. See `getAssetContext()` in live scene prompts. Cookbook: **PromptGen → EXAMPLES**.

Use **Hyper (4)** when showcasing PBR textures. Graphics tier in SETUP or SCENE → ENV.

---

## Further reading

- [GETTING_STARTED.md](GETTING_STARTED.md) — lobby → ship linear path
- [CONTROLS.md](CONTROLS.md) — action controls
- [GIMP_TEXTURES.md](GIMP_TEXTURES.md) — install, batch, live SYNC
- [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md) — HILOD, codecs
- [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) — 9-step wizard
- [ROADMAP.md](ROADMAP.md) — forward plan