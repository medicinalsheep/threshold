# Native shells (v4.0)

Threshold stays a **single Vite SPA** (`dist-pages/`). Native targets wrap that build — no runtime fork.

| Target | Shell | CLI | Status |
|--------|-------|-----|--------|
| **Web** | Static host / GitHub Pages | `npm run build` | ✅ |
| **Android APK** | Capacitor WebView | `npm run package:android` | 🔧 Scaffold |
| **Windows .exe** | Electron | `npm run package:win` | 🔧 Scaffold |
| **iOS** | Capacitor WebView | `npm run package:ios` | 🔧 Scaffold (Xcode archive on macOS) |

---

## Prerequisites

- **Node 18+** and `npm install` in repo root
- **Android:** [Android Studio](https://developer.android.com/studio) + SDK (API 33+)
- **Windows:** No extra SDK — `electron-builder` downloads Electron on first `package:win`
- **iOS:** macOS + [Xcode](https://developer.apple.com/xcode/) 15+ + Apple Developer account ($99/yr for App Store / TestFlight)

---

## App icons

Brand assets live in `icons/` (neon rocket). Web favicon + lobby logo use `appicon512.png` and `logo_*.jpg`.

```bash
npm run build:icons   # Electron .ico (Windows)
npm run cap:assets    # Capacitor Android + iOS icons + splash
```

`init:native` and `package:win` invoke these when needed.

---

## First-time native setup

```bash
npm install
npm run build:icons
npm run init:native
```

This builds `dist-pages`, adds Capacitor Android + iOS projects (if missing), and syncs web assets.

---

## Creative asset bundling (v3.8)

Before packaging native builds, copy GIMP/Blender output into the web bundle:

```bash
npm run bundle:assets   # textures/ + import/ → dist-pages/bundle/
```

`package:win`, `package:android`, and `package:ios` run this automatically after `npm run build`.

Electron reads bundled assets via `shell:bundle:readBinary`; web/Capacitor fetch from `./bundle/`.

---

## Export workflow (in-app)

1. Design your game in Engine (EDIT mode).
2. **MORE → EXPORT** — 4-step wizard:
   - Game name / author
   - Manifest review (world, scripts, sounds, textures, GLTF refs)
   - Target checkboxes (web / Android / Windows / iOS)
   - Download `.threshold-game.json`
3. Run packaging CLI below.

On **Electron desktop**, the wizard can save the manifest via a native file dialog.

---

## Android APK

```bash
npm run package:android    # build + cap sync
npm run cap:open           # open Android Studio
```

In Android Studio:

1. Wait for Gradle sync.
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

Optional CLI (if Android SDK on PATH):

```bash
cd android
./gradlew assembleDebug    # Unix
gradlew.bat assembleDebug  # Windows
```

### Mic / permissions

SFX recording uses WebView `getUserMedia`. Ensure **RECORD_AUDIO** is granted — Capacitor Android project includes standard WebView mic permission when generated.

---

## Windows portable .exe

```bash
npm run package:win
```

Output: `dist-electron/Threshold-{version}-win-portable.exe` (version from `package.json`).

Dev preview (no packager):

```bash
npm run build
npm run electron:dev
```

### Shell bridges (Electron)

`electron/preload.cjs` exposes `window.ThresholdShell`:

| API | Purpose |
|-----|---------|
| `fullscreen.enter/exit/toggle` | Native fullscreen |
| `fs.saveManifest` | Save export manifest with dialog |
| `fs.pickFile` / `pickSave` | Future world import/export |
| `mic.supported` | WebView mic available |

Browser code uses `src/shared/thresholdShell.js` — same API surface on web (degrades gracefully).

---

## Capacitor config

`capacitor.config.json`:

- `webDir`: `dist-pages`
- `appId`: `com.threshold.suite` (change per shipped game from manifest `packaging.capacitor.appId`)

After changing app name in export wizard, update `appName` in `capacitor.config.json` before `cap sync`.

---

## iOS & TestFlight (v4.0)

Capacitor iOS wraps the same `dist-pages` SPA. **Archive and upload require macOS.**

### First-time iOS setup

```bash
npm install
npm run init:native          # adds android/ + ios/ (generated locally, gitignored)
# or iOS only:
npm run init:native -- --ios
```

### Sync web assets

```bash
npm run package:ios          # build + bundle:assets + cap sync ios
npm run cap:open:ios         # open Xcode (macOS only)
```

### Xcode archive → TestFlight

1. Open `ios/App/App.xcworkspace` in Xcode (use **workspace**, not `.xcodeproj`).
2. Select **Any iOS Device (arm64)** as run destination.
3. **Signing & Capabilities** — set your Team; bundle ID must match manifest `packaging.ios.bundleId` (default `com.threshold.game` per exported game).
4. **Product → Archive**.
5. In Organizer: **Distribute App** → **App Store Connect** → **Upload**.
6. In [App Store Connect](https://appstoreconnect.apple.com): create app record → **TestFlight** tab → add internal/external testers.
7. For App Store release: fill metadata, screenshots, privacy policy → submit for review.

### App Store Connect checklist

| Field | Source |
|-------|--------|
| Bundle ID | `packaging.ios.bundleId` in `.threshold-game.json` |
| App name | Export wizard game name |
| Category | Games |
| Privacy | Mic (SFX recording), multiplayer (PeerJS) — declare in App Privacy |
| Screenshots | iPhone 6.7" + 6.5" required; capture from simulator or device |

### iOS-specific behavior

- **Safe areas:** `viewport-fit=cover` + `env(safe-area-inset-*)` in CSS (engine toolbar, lobby, touch controls).
- **WebGL:** Runs in WKWebView — same Three.js path as Android.
- **Mic:** `getUserMedia` requires HTTPS scheme (`iosScheme: https` in `capacitor.config.json`).
- **Touch:** On-screen joystick + look pad (see `touchControls.js`).
- **No Electron:** iOS uses Capacitor only; Windows `.exe` is separate.

### Troubleshooting (iOS)

| Issue | Fix |
|-------|-----|
| `cap open ios` fails on Windows/Linux | Expected — open project on Mac via `npm run cap:open:ios` |
| Signing errors | Xcode → Signing → select Team; match bundle ID in App Store Connect |
| Blank WebView | Run `npm run package:ios` first; verify `dist-pages/index.html` exists |
| Mic denied | iOS Settings → App → Microphone → Allow |
| CocoaPods errors | `cd ios/App && pod install` (macOS) |

---

## Creative assets in native builds

Export manifest documents `textures/` and `import/` paths. Run `npm run bundle:assets` before native package — copies assets into `dist-pages/bundle/` for APK, `.exe`, and iOS.

Dev hot-reload: `npm run textures:watch` (localhost only).

---

## Steam (Phase 5)

Windows Electron build is the base. Steamworks SDK integrates into the same shell — see [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank Electron window | Run `npm run build` first — shell loads `dist-pages/index.html` |
| `cap: command not found` | Run `npm install` — uses local `@capacitor/cli` |
| Android Gradle fails | Open Android Studio, install suggested SDK components |
| Mic denied on APK | App settings → Permissions → Microphone |