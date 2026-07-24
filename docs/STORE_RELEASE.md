# Store release guide (Phase L — v5.0, walkthrough v5.1)

Ship Threshold games to **Google Play**, **App Store**, and **Windows** from one export manifest.

**Prerequisites:** **TOOLS → EXPORT** 9-step walkthrough → download `.threshold-game.json` → creative assets bundled.

**Walkthrough:** [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) — icons, scene inventory, per-asset credits, store metadata.

**Verify pass:** `npm run store:verify` — see [STORE_VERIFY.md](STORE_VERIFY.md) (last full pass v9.16; re-run after major export changes).

**Native builds:** use `npm run build:electron` (relative `./assets/` chunks) before `package:win`. GitHub Pages uses `npm run build` (`/threshold/` base).

**Streamlined path:** [STREAMLINED_DEV.md](STREAMLINED_DEV.md) — Portal → SETUP → export with target-filtered SHIP commands.

---

## Secrets & credentials checklist

The EXPORT wizard collects **public** metadata only. Signing credentials stay on your machine.

| Item | Secret? | Where |
|------|---------|-------|
| `.threshold-game.json` manifest | No | Download from SHIP step — bundle ID, credits, store URLs |
| Contact / privacy / support URLs | No | STORE step → `store:prep` templates |
| xAI Grok API key | **Yes** | Browser `sessionStorage` per tab — **SETUP** or Agent Portal |
| `CSC_LINK` / `CSC_KEY_PASSWORD` | **Yes** | Shell env at `package:win` / `package:mac` time |
| Android keystore | **Yes** | Android Studio signed-bundle wizard or `android/` signing config |
| Apple provisioning | **Yes** | Xcode Signing & Capabilities |
| `config/steam-app.json` | **Yes** | Local gitignored — Steam App ID + depot |
| `.env.local` | **Yes** | Gitignored — optional `VITE_*` overrides |

**Never commit:** `dist-store/`, `dist-electron/`, keystores, `.p12` certs, API keys.

**Grok login elsewhere:** Logging into Grok on x.ai in another browser tab does **not** share keys with Threshold. Paste your xAI API key in SETUP or the Agent Portal.

---

## Quick start

```bash
# 1. Export manifest from Engine (MORE → EXPORT)
# 2. One-shot prep + package + upload guide (signing still local)
npm run store:ship -- --manifest my-game.threshold-game.json --targets win --contact you@example.com

# Or step-by-step:
npm run store:prep -- --manifest my-game.threshold-game.json --contact you@example.com
npm run package:android:release   # AAB (sign in Android Studio if Gradle fails)
npm run package:ios               # sync — archive on macOS in Xcode
npm run package:win               # portable .exe + NSIS installer
npm run package:mac               # macOS .dmg (darwin only) — see MAC_NOTARIZE.md
npm run store:upload -- --manifest my-game.threshold-game.json
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

**Distribution:** itch.io, [Steam (STEAM_RELEASE.md)](STEAM_RELEASE.md), or direct download — no Microsoft Store pipeline in Phase L.

---

## macOS (Electron .dmg)

```bash
npm run package:mac    # macOS host only — signs + afterSign notarize when env set
npm run mac:notarize:check
npm run mac:staple -- dist-electron/Threshold-*-mac.dmg
```

Full guide: **[MAC_NOTARIZE.md](MAC_NOTARIZE.md)**

| Step | Action |
|------|--------|
| Build | `electron-builder` → `dist-electron/*.dmg` |
| Sign | `CSC_LINK` + `CSC_KEY_PASSWORD` (Developer ID Application) |
| Notarize | `APPLE_ID` · `APPLE_APP_SPECIFIC_PASSWORD` · `APPLE_TEAM_ID` via `afterSign` |
| Staple | `npm run mac:staple -- path/to.dmg` |

**Orchestrated:** `npm run store:ship -- --manifest game.json --targets mac --notarize-check`

**Note:** Capacitor iOS ≠ Electron macOS. For Mac App Store with WKWebView, use Xcode iOS target on Apple Silicon Mac or separate macOS Catalyst project (out of scope).

---

## Environment variables (signing)

| Variable | Platform | Purpose |
|----------|----------|---------|
| `CSC_LINK` | Windows / macOS | Code signing certificate (.p12) |
| `CSC_KEY_PASSWORD` | Windows / macOS | Cert password |
| `APPLE_ID` | macOS | Notarization Apple ID |
| `APPLE_APP_SPECIFIC_PASSWORD` | macOS | App-specific password for notary |
| `APPLE_TEAM_ID` | macOS | 10-char team id for notarytool |

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

- [GETTING_STARTED.md](GETTING_STARTED.md) — lobby → export → package path
- [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md) — bundled Child assets vs user-sourced art
- [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) — 9-step wizard
- [NATIVE_SHELLS.md](NATIVE_SHELLS.md) — Capacitor / Electron setup
- [ROADMAP.md](ROADMAP.md) — forward plan · [old/docs/NEXT_PHASES.md](../old/docs/NEXT_PHASES.md) — archived phase history
- [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) — distribution pillars