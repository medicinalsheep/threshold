# Export walkthrough (v5.1)

Guided **MORE → EXPORT** flow — from game identity through icons, scene content, asset credits, store prep, and download.

---

## Wizard steps

| Step | What you do |
|------|-------------|
| **INFO** | Game name, author, description — becomes store title and manifest |
| **ICONS** | Bundle ID, custom icon checklist (`icons/appicon512.png`, `build:icons`, `cap:assets`) |
| **SCENE** | Review world objects, GLTF, textures, sounds, videos in the live scene |
| **CREDITS** | Attribute every asset — license, author, source (required for store compliance) |
| **REVIEW** | Full manifest preview + optional sound base64 embed |
| **TARGETS** | Web / Android / Windows / iOS checkboxes |
| **STORE** | Contact email, support URL, privacy policy URL for `store:prep` |
| **SHIP** | Download `.threshold-game.json` + CLI command summary |

---

## Icon & branding workflow

1. Replace **`icons/appicon512.png`** with your 512×512 game icon (PNG, square).
2. Optional: update lobby logos `icon_transfull.png` / `icon_translt.png`.
3. Run on dev machine:

```bash
npm run build:icons    # Windows Electron .ico
npm run cap:assets     # Android + iOS mipmaps + splash (after init:native)
```

4. In wizard **ICONS** step, check off completed tasks and set **bundle ID** (`com.yourstudio.yourgame`).
5. `npm run store:prep` applies bundle ID to `capacitor.config.json` and Electron builder.

---

## Credits & asset registry

The export manifest includes:

- **`credits`** — global text + per-asset `{ license, author, source }`
- **`assetRegistry`** — inventory counts + normalized asset list
- **`storeAssets`** — scaffold linking assets to future store SKUs / registry URIs

### Why it matters

| Audience | Use |
|----------|-----|
| **App Store / Play** | Prove you own or licensed art, audio, models |
| **Players** | In-game credits screen (future) from `credits.global` |
| **Store SKUs** | One manifest documents which files ship in which build |
| **Collectibles (future)** | `registryUri` / `storeSku` per asset — tie GIMP/Blender exports to tradable or premium packs |

Config: `config/store-assets.json`

---

## After download

```bash
npm run store:prep -- --manifest my-game.threshold-game.json \
  --contact you@example.com \
  --privacy-url https://yoursite.com/privacy

npm run bundle:assets
npm run package:android:release   # or package:win / package:ios
```

**Generated in `dist-store/<slug>/`:**

- `privacy-policy.md`
- `credits.md` — from wizard attributions
- `asset-registry.json` — store-facing asset list
- `app-store-metadata.json` / `play-console-metadata.json`

---

## Scene & content checklist

Before export, in Engine **EDIT** mode:

| Content | Where | Ships via |
|---------|-------|-----------|
| PBR textures | GIMP → `textures/` | `bundle:assets` |
| GLTF models | Blender → `import/` | `bundle:assets` |
| Sounds | SFX tab recordings | manifest + optional base64 |
| Cutscenes | `video/*.mp4` | `bundle:assets` |
| World layout | Live scene | `world` in manifest |

Use **SCENE** step to confirm object count and linked assets match what you authored.

---

## Future: store asset opportunities

Phase L2 vision (documented, not fully implemented):

1. **Asset packs** — sell texture/model packs on itch.io / Play as IAP; `storeSku` in registry.
2. **Collectible registry** — optional `registryUri` per authored asset (metadata hash / on-chain pointer).
3. **Cross-game reuse** — import another game’s `assetRegistry` with license verification.
4. **PromptGen** — generates worlds with `ASSETS` block matching registry paths.

See [STORE_RELEASE.md](STORE_RELEASE.md) for platform upload steps.

---

## Related

- [STORE_RELEASE.md](STORE_RELEASE.md) — signing, AAB, TestFlight
- [NATIVE_SHELLS.md](NATIVE_SHELLS.md) — Capacitor / Electron
- [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) — GIMP / Blender pipeline