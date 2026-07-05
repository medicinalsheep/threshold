# Reference asset sources

Legal, redistributable sources for Threshold Reference editions.

## Active (Reference Lite)

| Pack | URL | License | Notes |
|------|-----|---------|-------|
| Kenney Starter Kit: Racing | https://github.com/KenneyNL/Starter-Kit-Racing | CC0 / MIT | Vehicles + track GLB used in `threshold-ref-lite` |
| Kenney Car Kit | https://kenney.nl/assets/car-kit | CC0 | Planned for `threshold-ref-vehicles` expansion |
| Kenney Nature Kit | https://kenney.nl/assets | CC0 | Props / environment |

## Planned sources (Phase R2+)

| Category | Suggested sources | License |
|----------|-------------------|---------|
| Textures | [Poly Haven](https://polyhaven.com), ambientCG | CC0 |
| Characters | [Quaternius](https://quaternius.com) modular packs | CC0 |
| Audio | Freesound CC0 filter, Kenney audio | CC0 |

## Workflow inspiration (do not rip assets)

| Community | Learn from | Threshold feature |
|-----------|------------|-------------------|
| Battlefield 2 / 2142 mods | Vehicle + kit structure | `assetRegistry` vehicle `kind` |
| Fallout mod kits | Loose file trees | `bundle:assets` paths |
| COD mod tools | Surface footstep sets | SFX taxonomy (R4 audio) |
| FiveM debadged packs | Spawn lists only | Use **Kenney/CC0** meshes instead |

## Refresh assets

```bash
npm run reference:fetch    # re-download from Kenney GitHub raw
npm run reference:sync       # copy → import/, textures/, public/bundle/
npm run bundle:assets        # ship in native builds
```