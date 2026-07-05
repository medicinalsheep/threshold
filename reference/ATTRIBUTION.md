# Reference asset attribution

Bundled **Threshold Reference** editions use only assets we can redistribute in this repo.

## Threshold Reference Lite (CC0)

| Asset | File | Author | License |
|-------|------|--------|---------|
| Motorcycle | `kenney_motorcycle.glb` | Kenney Vleugels | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Truck (green) | `kenney_truck_green.glb` | Kenney Vleugels | CC0 1.0 |
| Track straight | `kenney_track_straight.glb` | Kenney Vleugels | CC0 1.0 |
| Colormap texture | `ref_kenney_colormap.png` | Kenney Vleugels | CC0 1.0 |

**Source pack:** [Kenney Starter Kit: Racing](https://github.com/KenneyNL/Starter-Kit-Racing) (MIT/CC0 — see pack LICENSE).

## Not included (by design)

We do **not** bundle assets ripped from commercial games (Fallout, Battlefield, Call of Duty, etc.) or unlicensed FiveM packs. Those communities are useful as **workflow inspiration** only — see `docs/REFERENCE_EDITIONS.md`.

## Export walkthrough

When you export a game using reference assets, the **CREDITS** and **PACKS** steps pick up these files from the live scene. Run `npm run store:prep` to generate `credits.md` with attributions.