# Native shells (Phase 2 — v3.0)

Threshold stays a **single Vite SPA** (`dist-pages/`). Native targets wrap that build — no runtime fork.

| Target | Shell | CLI |
|--------|-------|-----|
| **Web** | Static host / GitHub Pages | `npm run build` |
| **Android APK** | Capacitor WebView | `npm run package:android` |
| **Windows .exe** | Electron | `npm run package:win` |

---

## Prerequisites

- **Node 18+** and `npm install` in repo root
- **Android:** [Android Studio](https://developer.android.com/studio) + SDK (API 33+)
- **Windows:** No extra SDK — `electron-builder` downloads Electron on first `package:win`

---

## App icons

Brand assets live in `icons/` (neon rocket). Web favicon + lobby logo use `appicon512.png` and `logo_*.jpg`.

```bash
npm run build:icons   # Electron .ico (Windows)
npm run cap:assets    # Capacitor Android mipmaps + splash
```

`init:native` and `package:win` invoke these when needed.

---

## First-time native setup

```bash
npm install
npm run build:icons
npm run init:native
```

This builds `dist-pages`, adds the Capacitor Android project (if missing), and syncs web assets.

---

## Export workflow (in-app)

1. Design your game in Engine (EDIT mode).
2. **MORE → EXPORT** — 4-step wizard:
   - Game name / author
   - Manifest review (world, scripts, sounds)
   - Target checkboxes (web / Android / Windows)
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

Output: `dist-electron/Threshold-3.0.0-win-portable.exe` (version from `package.json`).

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

## Steam (Phase 3.5)

Windows Electron build is the base. Steamworks SDK integrates into the same shell — see [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank Electron window | Run `npm run build` first — shell loads `dist-pages/index.html` |
| `cap: command not found` | Run `npm install` — uses local `@capacitor/cli` |
| Android Gradle fails | Open Android Studio, install suggested SDK components |
| Mic denied on APK | App settings → Permissions → Microphone |