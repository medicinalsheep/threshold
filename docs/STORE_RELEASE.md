# Store release guide (Phase L — v5.0, walkthrough v5.1)

Ship Threshold games to **Google Play**, **App Store**, and **Windows** from one export manifest.

**Prerequisites:** **MORE → EXPORT** 8-step walkthrough → download `.threshold-game.json` → creative assets bundled.

**Walkthrough:** [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) — icons, scene inventory, per-asset credits, store metadata.

---

## Quick start

```bash
# 1. Export manifest from Engine (MORE → EXPORT)
# 2. Prepare store assets + apply bundle ID to native config
npm run store:prep -- --manifest my-game.threshold-game.json --contact you@example.com

# 3. Package per target
npm run package:android:release   # AAB (sign in Android Studio if Gradle fails)
npm run package:ios               # sync — archive on macOS in Xcode
npm run package:win               # portable .exe + NSIS installer
npm run package:mac               # macOS .dmg (darwin only)
```

Output of `store:prep`:

| File | Use |
|------|-----|
| `dist-store/<slug>/privacy-policy.md` | Host on your site; paste URL into store forms |
| `dist-store/<slug>/credits.md` | Asset attributions from export wizard CREDITS step |
| `dist-store/<slug>/asset-registry.json` | Store-facing asset list + SKU/registry mappings |
| `dist-store/<slug>/play-in-app-products.json` | Google Play IAP SKU reference |
| `dist-store/<slug>/steam-depot-assets.json` | Steam depot file paths |
| `dist-store/<slug>/itch-asset-packs.json` | itch.io DLC structure |
| `dist-store/<slug>/collectible-registry.json` | Assets with registry URIs |
| `dist-store/<slug>/app-store-metadata.json` | App Store Connect copy-paste reference |
| `dist-store/<slug>/play-console-metadata.json` | Play Console listing reference |
| `dist-store/<slug>/store-prep.json` | Checklist + next commands |
| `config/native-app.json` | Applied `appId` / `appName` for Electron + Capacitor |

---

## Workflow

```
EXPORT walkthrough → manifest → store:prep → package:<target> → store console upload
```

1. **Export walkthrough** — INFO → … → STORE → PACKS → SHIP (see [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md)).
2. **Name & bundle ID** — ICONS step; `store:prep` writes `capacitor.config.json` and `config/native-app.json`.
3. **Credits** — CREDITS step feeds `credits.md` and `asset-registry.json` for store review.
4. **Packs** — PACKS step maps assets to Play/Steam/itch SKUs; `npm run store:assets` generates platform JSON. See [STORE_ASSETS.md](STORE_ASSETS.md).
5. **Privacy policy** — edit generated `privacy-policy.md`; host at a public URL (STORE step URL → `store:prep`).
6. **Graphics bundle** — `package:*` scripts run `bundle:assets` + `export:graphics --install` automatically.
7. **Checklist** — `store:prep` prints per-target steps from `config/store-release.json`.

---

## Android (Google Play)

```bash
npm run store:prep -- --manifest my-game.threshold-game.json
npm run package:android:release
```

| Step | Action |
|------|--------|
| Package name | Must match `packaging.capacitor.appId` in manifest |
| Signed AAB | Android Studio → **Build → Generate Signed Bundle** (recommended) |
| Data safety | Microphone (optional SFX), local storage, optional multiplayer |
| Privacy URL | Required — host `privacy-policy.md` |
| Tracks | Internal → closed → production |

**Permissions:** `RECORD_AUDIO` for SFX — declared when Capacitor Android project is generated.

---

## iOS (TestFlight / App Store)

```bash
npm run package:ios          # any OS — syncs assets
npm run cap:open:ios         # macOS only — Xcode
```

| Step | Action |
|------|--------|
| Bundle ID | `packaging.ios.bundleId` — create matching ID in Apple Developer portal |
| Signing | Xcode → Signing & Capabilities → Team |
| Archive | Product → Archive → Distribute → App Store Connect |
| TestFlight | Add internal testers before external |
| Privacy | App Privacy questionnaire — mic + networking if used |

See also [NATIVE_SHELLS.md](NATIVE_SHELLS.md) § iOS & TestFlight.

---

## Windows (Electron)

```bash
npm run package:win
```

| Artifact | Path |
|----------|------|
| Portable | `dist-electron/<AppName>-<version>-win-portable.exe` |
| Installer | `dist-electron/<AppName>-<version>-win-setup.exe` (NSIS) |

### Optional code signing

```bash
# Set before package:win (certificate .p12 or path)
set CSC_LINK=path\to\cert.p12
set CSC_KEY_PASSWORD=your-password
npm run package:win
```

Reduces SmartScreen warnings. Certificate from DigiCert, Sectigo, etc.

**Distribution:** itch.io, Steam (Phase M), or direct download — no Microsoft Store pipeline in Phase L.

---

## macOS (Electron .dmg)

```bash
npm run package:mac    # macOS host only
```

| Step | Action |
|------|--------|
| Build | `electron-builder` → `dist-electron/*.dmg` |
| Sign | `CSC_LINK` + Apple Developer ID Application cert |
| Notarize | `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `notarize` in electron-builder |
| Staple | `xcrun stapler staple` after notarization |

**Note:** Capacitor iOS ≠ Electron macOS. For Mac App Store with WKWebView, use Xcode iOS target on Apple Silicon Mac or separate macOS Catalyst project (out of scope).

---

## Environment variables (signing)

| Variable | Platform | Purpose |
|----------|----------|---------|
| `CSC_LINK` | Windows / macOS | Code signing certificate (.p12) |
| `CSC_KEY_PASSWORD` | Windows / macOS | Cert password |
| `APPLE_ID` | macOS | Notarization Apple ID |
| `APPLE_APP_SPECIFIC_PASSWORD` | macOS | App-specific password for notary |

---

## Manifest `packaging.storeRelease`

Game exports include:

```json
"packaging": {
  "storeRelease": {
    "prepCli": "npm run store:prep -- --manifest <file>.threshold-game.json",
    "docs": "docs/STORE_RELEASE.md",
    "privacyTemplate": "docs/templates/privacy-policy.template.md"
  }
}
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Wrong app name on device | Re-run `store:prep` then `cap sync` |
| Gradle release unsigned | Use Android Studio signed bundle wizard |
| `package:mac` on Windows | Expected failure — use macOS CI or local Mac |
| SmartScreen unknown publisher | Sign Windows build with `CSC_LINK` |
| iOS blank WebView | Run `package:ios` before archive |

---

## Related

- [NATIVE_SHELLS.md](NATIVE_SHELLS.md) — Capacitor / Electron setup
- [NEXT_PHASES.md](NEXT_PHASES.md) — Phase M (Steam), Phase L checklist
- [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) — distribution pillars