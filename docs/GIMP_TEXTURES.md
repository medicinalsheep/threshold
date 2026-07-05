# GIMP Texture Workflow

Threshold GIMP plugins mirror `scripts/tc-gen-tex.cjs` — same `config/tc-textures.json`, all surface styles, r8 HILOD.

---

## Install

```bash
npm run gimp:install
```

Copies `build_tc_tex.py` + `threshold_export.py` into your GIMP plug-ins folder.

---

## Build all presets (batch)

**Inside GIMP:** Filters → Threshold → **Build TC Textures (R8)...**  
Export folder: `E:\threshold\threshold\textures` (repo `textures/`)

**Headless (GIMP 2.10+):**

```bash
cd textures
gimp -i -b '(python-fu-threshold-build-tc-textures 1 RUN-NONINTERACTIVE "E:/threshold/threshold/textures")' -b '(gimp-quit 0)'
```

---

## Manual override (single slot)

1. Open any PNG from `textures/`
2. Paint / filter your changes
3. Filters → Threshold → **Export to Engine** (or SYNC via TextureBridge in dev)
4. `npm run tex:compress && npm run bundle:assets`

Manifest merges by `objectName` + `slot` — same rules as Node generator.

---

## Styles supported (parity with Node)

`vehicle` · `character` · `span` · `concrete` · `wall` · `stripe` · `terminal`  
`grass` · `wood` · `gravel` · `asphalt` · `fabric` · `metal_grate`

HILOD tiers read from JSON: `_512` / `_1k` / `_2k` / `_4k`

---

## Starter scene tiling

After manifest wiring, `config/starter-textures.json` applies UV repeat + normal scale per object — keeps 512px maps sharp on large floors without bigger files.

---

## Pipeline

```bash
npm run tc:gen:tex      # Node (CI / no GIMP)
# OR GIMP Build TC Textures (R8)
npm run tex:compress
npm run bundle:assets
npm run preview
```