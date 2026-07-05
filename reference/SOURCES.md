# Asset sources policy

## Threshold Child (shipped)

All bundled reference content is **Threshold-original**, except **weather ambient clips** (v6.6.0+).

### Weather SFX (Mixkit — shipped in starter bundle)

| Clip IDs | Source | License |
|----------|--------|---------|
| `starter_rain_*`, `starter_thunder_*`, `starter_wind_gust_real` | [mixkit.co/free-sound-effects](https://mixkit.co/free-sound-effects/) | Mixkit License — free for commercial use |

Fetched via `npm run sounds:fetch:ambient` from `config/ambient-sound-sources.json`. Credits included in EXPORT manifest.

### User field recording (v6.6+)

| Clip IDs | Tags | Source |
|----------|------|--------|
| `starter_rec_birds`, `starter_rec_plastic*`, `starter_rec_papers*`, `starter_rec_water_jug`, `starter_rec_metal_*` | birds, plastic, papers, water_jug, metal_glass | User recording — `npm run sounds:tag:recording` |

Tag index: `config/recorded-sound-tags.json`. Play in-scene: `World.playRecordedSfx('metal_glass')`.

See [docs/THRESHOLD_CHILD_ASSETS.md](../docs/THRESHOLD_CHILD_ASSETS.md) for procedural SFX.

## External material (not shipped)

| Use | Allowed |
|-----|---------|
| Developer local comparison in `reference/_dev-seeds/` | CC0 packs via `reference:fetch` — **gitignored** |
| Ship unmodified downloads as TC assets | **No** (legacy `reference/editions/` archived in `old/`) |
| Ship unmodified third-party GLB/texture in Threshold repo | **No** |

## User-built games

Users may reference external assets in **their** projects when they have rights. Complete EXPORT **CREDITS** honestly. Threshold does not provide or endorse:

- Ripped files from Fallout, Battlefield, Call of Duty, or other commercial games
- Unlicensed FiveM / mod packs
- Any asset without clear redistribution rights

## Workflow inspiration (not asset sources)

| Community | Learn |
|-----------|-------|
| Battlefield mods | Vehicle roles, kit structure |
| Fallout mods | Loose-file folder conventions |
| COD mod tools | Surface-based sound categories |
| Open asset sites (Kenney, Poly Haven, etc.) | **Users** may use for **their** games — not our shipped Child drops |

## Refresh dev seeds (optional)

```bash
npm run reference:fetch   # → reference/_dev-seeds/ only
```

Never run `reference:sync` into shipped editions without a Child authoring pass.