# Archived / legacy files

Content here is **not used by the active runtime** (v6.4+). Kept for history and migration reference only.

**Import safety:** `src/` has zero imports from `old/`. Active loaders live in `src/shared/tc*.js` and `config/reference-editions.json`.

## What moved here

| Path | Why archived |
|------|----------------|
| `reference-editions/` | Pre-v5.8 edition manifests (`threshold-child-*`, `threshold-ref-lite`) — replaced by `tc-*` loaders in `src/shared/tc*.js` |
| `scripts/child-vehicles-build.cjs` | R2 vehicle pipeline — superseded by `npm run tc:build` |
| `scripts/generate-child-vehicle-glb.cjs` | Node fallback for R2 — superseded by `tc-gen-veh.cjs` |
| `plugins/threshold-blender/build_child_vehicles.py` | R2 Blender scaffold — superseded by `build_tc_veh.py` |
| `plugins/threshold-gimp/threshold_manifest.json` | Example manifest only — live manifest is `textures/threshold_manifest.json` |

## Active replacements

| Legacy | Current |
|--------|---------|
| `threshold-child-showcase` | `tc-show` — Lobby **TC →** |
| `threshold-child-vehicles` | `tc-veh` |
| `threshold-child-characters` | `tc-chr` |
| `threshold-child-audio` | `tc-sfx` |
| `threshold-child-lite` | `tc-lite` |
| `threshold-ref-lite` | Removed v5.5 (external CC0 drop) |

Registry: `config/reference-editions.json` · Policy: `docs/THRESHOLD_CHILD_ASSETS.md`

## Archived documentation (`old/docs/`)

Superseded phase and sprint docs — not maintained for v10+. **Current roadmap:** `docs/ROADMAP.md`

| Path | Why archived |
|------|----------------|
| `docs/NEXT_PHASES.md` | v3–9 phase checklist (~586 lines) |
| `docs/POLISH_ROADMAP.md` | Sprints K–U (complete) |
| `docs/PHASE_13_STABILITY.md` | Historical stability sprint |
| `docs/PHASE_18_TESLA_LAB.md` | Pre-10.0 showcase lab plan |
| `docs/DEFAULT_ASSETS_ROADMAP.md` | Showcase-default asset plan (removed in 10.0) |