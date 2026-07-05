# Asset sources policy

## Threshold Child (shipped)

All bundled reference content is **Threshold-original**. See [docs/THRESHOLD_CHILD_ASSETS.md](../docs/THRESHOLD_CHILD_ASSETS.md).

## External material (not shipped)

| Use | Allowed |
|-----|---------|
| Developer local comparison in `reference/_dev-seeds/` | CC0 packs via `reference:fetch` — **gitignored** |
| Copy into `reference/editions/` without Child transformation | **No** |
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