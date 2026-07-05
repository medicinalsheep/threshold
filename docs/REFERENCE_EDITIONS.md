# Reference editions (Threshold Child — v5.6)

Bundled content is **Threshold Child** — **original** assets for learning export and store workflows. Not third-party file drops.

**Policy:** [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md)

---

## Active editions

| Edition | Lobby | Contents |
|---------|-------|----------|
| `threshold` | SOLO PLAY | Core starter scene |
| **`threshold-child-vehicles`** | **THRESHOLD CHILD** (default) | Runner, Hauler — GLB + LOD; Circuit Span procedural |
| `threshold-child-lite` | fallback | Procedural Runner, Hauler, Circuit Span |

Config: `config/reference-editions.json`

---

## Quick start

```bash
npm run dev
npm run child:vehicles:build   # ensure GLBs in import/ + public/bundle/import/
```

Lobby → **THRESHOLD CHILD →** — GLB vehicles with LOD @ 12m/28m + circuit span.

Then **MORE → EXPORT** — **SCENE** shows Child GLTF objects; **CREDITS** + **PACKS** pre-fill.

---

## R2 build pipeline

```bash
npm run child:vehicles:build
# Blender path (when installed):
npm run blender:export -- --blend plugins/threshold-blender/child_vehicles.blend --object "Threshold Runner" --lod --mass 3.4
```

Manifest: `import/threshold_blender_manifest.json` · Loader: `src/shared/thresholdChildVehicles.js`

---

## External seeds (developers only)

```bash
npm run reference:fetch   # optional CC0 packs → reference/_dev-seeds/ (gitignored)
```

Use only for **comparison** when authoring new Child GLBs in Blender. **Do not** ship unmodified downloads.

---

## Planned Child editions

| Edition | Focus |
|---------|--------|
| `threshold-child-characters` | Unique humanoids |
| `threshold-child-audio` | Original SFX |
| `threshold-child-showcase` | Full export demo world |

---

## Related

- [GETTING_STARTED.md](GETTING_STARTED.md)
- [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md)
- [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md)