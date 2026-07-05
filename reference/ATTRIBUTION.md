# TC (Threshold Child) attribution

## Shipped editions (original)

| Asset | Edition | License | Author |
|-------|---------|---------|--------|
| TC Runner | `tc-veh` | Original — TC (GLB+LOD) | Threshold |
| TC Hauler | `tc-veh` | Original — TC (GLB+LOD) | Threshold |
| TC Span | `tc-lite` | Original — TC | Threshold |
| TC Marshal | `tc-chr` | Original — TC (GLB+LOD) | Threshold |
| TC Mechanic | `tc-chr` | Original — TC (GLB+LOD) | Threshold |
| TC Checkpoint | `tc-show` | Original — TC | Threshold |
| TC SFX (5 clips) | `tc-sfx` | Original — TC (synthesized) | Threshold |

Loaders: `src/shared/tcVeh.js`, `tcChr.js`, `tcLite.js`, `tcSfx.js`, `tcShow.js`

## External seeds (dev only — not shipped)

Optional `npm run reference:fetch` downloads third-party **CC0** packs into `reference/_dev-seeds/` for **local developer comparison**. Those files are **gitignored** and must **not** be copied into TC editions without a documented transformation pass.

## User games

When you export **your** game, you attribute **your** assets in the EXPORT **CREDITS** step. TC assets in a scene export as `Original — TC` unless you replace them with your own work.