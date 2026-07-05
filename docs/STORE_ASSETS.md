# Store assets & platform mapping (Phase M+ — v5.2)

Map every authored asset (textures, sounds, models, videos) to **store products** — Play IAP, Steam depot files, itch.io DLC, and optional collectible registry URIs.

---

## Workflow

```
MORE → EXPORT walkthrough
  … → CREDITS (licenses)
  … → PACKS (SKUs + Steam/Play IDs)
  … → SHIP (download manifest)
       ↓
npm run store:prep -- --manifest <game>.threshold-game.json
npm run store:assets -- --manifest <game>.threshold-game.json   # also runs inside store:prep
       ↓
dist-store/<slug>/play-in-app-products.json
dist-store/<slug>/steam-depot-assets.json
dist-store/<slug>/itch-asset-packs.json
dist-store/<slug>/collectible-registry.json
```

---

## PACKS step (Engine)

| Field | Purpose |
|-------|---------|
| **Enable store asset mapping** | Sets `assetRegistry.storeAssets.status` to `mapped` |
| **Steam App ID / Depot ID** | Steamworks app + content depot |
| **Play application ID** | Defaults to bundle ID — Play IAP product namespace |
| **itch.io game slug** | DLC / file naming on itch |
| **Per-asset Store SKU** | Unified id — Play product, Steam DLC key, itch file |
| **Per-asset Registry URI** | `threshold://`, `ipfs://`, or custom collectible pointer |
| **SUGGEST ALL SKUs** | Auto-fills `{game}.{kind}.{asset_slug}` + `threshold://` URIs |

Auto **kind packs** group textures, models, sounds, and videos for bulk IAP / depot uploads.

Config: `config/store-assets.json`

---

## Generated files

| File | Platform | Use |
|------|----------|-----|
| `play-in-app-products.json` | Google Play | Create matching SKUs in Play Console → Monetize → Products |
| `steam-depot-assets.json` | Steam | Map `bundle/<kind>/` paths for depot upload after `export:graphics --profile steam` |
| `itch-asset-packs.json` | itch.io | Suggested DLC packs + per-asset file ids |
| `collectible-registry.json` | Registry | Assets with `registryUri` — metadata / collectible scaffold |
| `store-assets-prep.json` | Summary | Status, counts, file list |

---

## CLI

```bash
# Full store bundle (privacy + credits + asset maps)
npm run store:prep -- --manifest my-game.threshold-game.json --contact you@example.com

# Asset maps only (re-run after editing manifest)
npm run store:assets -- --manifest my-game.threshold-game.json
```

---

## Steam depot pipeline

1. PACKS step → set Steam App ID + Depot ID
2. `npm run export:graphics -- --profile steam --install` — ultra tier, up to 4K textures
3. Upload `dist-pages/bundle/` per paths in `steam-depot-assets.json`
4. Phase M (next): Steamworks SDK in Electron for overlay + achievements

---

## Play IAP

1. Create managed products in Play Console matching SKUs in `play-in-app-products.json`
2. Kind packs (`textures_pack`, `models_pack`, …) ship as single IAP covering multiple assets
3. Per-asset SKUs for à-la-carte premium content

---

## itch.io

Use `itch-asset-packs.json` to structure:

- Base game → portable `.exe` or web build zip
- DLC rows → separate uploads per kind pack or individual asset

---

## Collectible registry

Optional `registryUri` per asset enables:

- Cross-game asset verification (import registry + license check)
- Future on-chain / IPFS metadata pointers
- In-game credits screen keyed by URI

Root namespace: `threshold://<bundleId>/asset/<slug>`

---

## Manifest fields

```json
{
  "assetOpportunity": {
    "registryEnabled": true,
    "steam": { "appId": "1234560", "depotId": "1234561" },
    "play": { "applicationId": "com.studio.game" },
    "itch": { "gameSlug": "my-game" }
  },
  "credits": {
    "entries": {
      "tex-1": {
        "storeSku": "game.texture.stone",
        "registryUri": "threshold://com.studio.game/asset/stone"
      }
    }
  },
  "assetRegistry": {
    "storeAssets": {
      "status": "mapped",
      "packs": […],
      "items": […]
    }
  }
}
```

---

## Related

- [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) — full export wizard
- [STORE_RELEASE.md](STORE_RELEASE.md) — signing, AAB, TestFlight
- [NEXT_PHASES.md](NEXT_PHASES.md) — Phase M (Steamworks SDK)