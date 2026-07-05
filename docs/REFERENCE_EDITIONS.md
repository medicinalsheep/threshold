# Reference editions (TC — v5.8)

Bundled content is **TC** (Threshold Child) — **original** assets for learning export and store workflows. Not third-party file drops.

**Policy:** [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md)

---

## Active editions

| Edition | Lobby | Contents |
|---------|-------|----------|
| `threshold` | SOLO PLAY | Core starter scene |
| **`tc-show`** | **TC →** (default) | Runner, Hauler, Marshal, Mechanic, Span, Checkpoint — GLB+LOD, SFX |
| `tc-veh` | fallback | Runner, Hauler — GLB + LOD; TC Span procedural |
| `tc-chr` | — | Marshal + Mechanic HumanMesh NPCs |
| `tc-sfx` | — | 5 synthesized TC SFX seeds |
| `tc-lite` | fallback | Procedural Runner, Hauler, TC Span |

Config: `config/reference-editions.json`

Legacy ids `threshold-child-*` map to `tc-*` (v5.8). Archived manifests: `old/reference-editions/`.

---

## Quick start

```bash
npm run dev
npm run tc:build      # GLBs + PBR/HILOD textures → import/ + textures/
npm run tc:gen:tex    # textures only (48 PNGs + threshold_manifest.json)
npm run tc:verify     # smoke test modules, GLBs, textures, HILOD, aliases
```

Lobby → **TC →** — full showcase (≥6 objects): GLB vehicles + characters with LOD @ 12m/28m, TC Span, checkpoint, SFX.

Then **MORE → EXPORT** — **SCENE** shows TC GLTF objects; **CREDITS** + **PACKS** pre-fill.

---

## Build pipeline

```bash
npm run tc:build
# Blender R5 path (when installed):
blender --background --python plugins/threshold-blender/build_tc_veh.py
blender --background --python plugins/threshold-blender/build_tc_chr.py
npm run blender:export -- --blend plugins/threshold-blender/tc_veh.blend --object "TC Runner" --slug tc_run --lod --mass 3.4 --realism r5
npm run blender:export -- --blend plugins/threshold-blender/tc_chr.blend --object "TC Marshal" --slug tc_msh --lod --no-physics --tc-ed tc-chr --realism r5
```

Manifest: `import/threshold_blender_manifest.json` · Loaders: `src/shared/tcVeh.js`, `tcChr.js`, `tcShow.js`

---

## External seeds (developers only)

```bash
npm run reference:fetch   # optional CC0 packs → reference/_dev-seeds/ (gitignored)
```

Use only for **comparison** when authoring new TC GLBs in Blender. **Do not** ship unmodified downloads.

---

## Related

- [GETTING_STARTED.md](GETTING_STARTED.md)
- [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md)
- [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md)