# Sprint U — Store / Native Packaging Verify Pass

**Status:** ✅ Complete (v9.11.0) · **Command:** `npm run store:verify`

Sprint U is **not greenfield** — store tooling shipped in Phases L–M (v5.0–v5.3). Sprint U is a **verification and truth pass**: run every ship path, fix drift, document blockers.

---

## Why U now

| Done (v5–v9) | Gap |
|--------------|-----|
| `store:prep`, `store:assets`, `package:*` scripts | No recent E2E audit after v9 chunk split |
| 9-step EXPORT wizard + TC ship (`tc:ship`) | Docs still reference v9.6 in places |
| Capacitor + Electron one-SPA model | iOS archive still manual (needs macOS + Apple account) |
| Graphics export profiles (android/ios/windows/steam) | Heavy builds not CI-smoked on every release |

Sprint U answers: **“Can we still ship a game from lobby → EXPORT → store:prep → package:win today?”**

---

## U deliverables

| ID | Task | Verify |
|----|------|--------|
| U1 | **TC ship E2E** | `npm run tc:ship` → `tc:ship:verify` |
| U2 | **Asset bundle** | `bundle:assets` → `dist-pages/bundle/` index valid |
| U3 | **Graphics profiles** | `export:graphics --profile windows` (light smoke) |
| U4 | **store:prep** | From `exports/tc-show.threshold-game.json` → `dist-store/` outputs |
| U5 | **store:assets** | Play / Steam / itch JSON generated |
| U6 | **Windows package smoke** | `package:win` starts (optional full build — heavy) |
| U7 | **Android sync smoke** | `package:android` Gradle sync (no upload required) |
| U8 | **Chunk split + native** | Lazy chunks load inside Electron/Capacitor WebView |
| U9 | **Doc truth** | `STORE_RELEASE.md`, `EXPORT_WALKTHROUGH.md`, `CAPABILITIES.md` |
| U10 | **Blocker list** | macOS notarization, iOS signing, Play upload — per-developer steps |

---

## Recommended run order

```bash
# 1. Web build + chunks (already in CI habit)
npm run build

# 2. Starter + TC assets
npm run assets:verify
npm run tc:verify

# 3. Full TC export ship path
npm run tc:ship
npm run tc:ship:verify

# 4. Store metadata from whitelisted manifest
npm run store:prep -- --manifest exports/tc-show.threshold-game.json --contact you@example.com
npm run store:assets -- --manifest exports/tc-show.threshold-game.json

# 5. Targeted graphics bundle (pick your platform)
npm run export:graphics -- --profile windows --manifest exports/tc-show.threshold-game.json

# 6. Native package (optional — long, needs toolchain)
npm run package:win
# npm run package:android:release   # needs Android SDK + signing
# npm run package:ios               # needs macOS + Xcode
```

---

## Platform matrix

| Target | Script | Sprint U scope | Blockers |
|--------|--------|----------------|----------|
| **Web (GitHub Pages)** | `npm run build` | ✅ every release | `VITE_BASE_PATH` for subpath deploy |
| **Windows** | `package:win` | Smoke build | `CSC_LINK` for signed installer |
| **Android** | `package:android:release` | Gradle sync + AAB path | Play Console account, signing keystore |
| **iOS** | `package:ios` | Doc checklist only | macOS, Apple Developer, provisioning |
| **macOS** | `package:mac` | Doc checklist only | Notarization, Apple account |
| **Steam** | `package:steam`, `steam:depot` | Manifest + depot VDF smoke | Steamworks partner account |

---

## Chunk split considerations (v9.9+)

Native shells load the same `dist-pages` SPA. Sprint U must confirm:

1. **Relative chunk paths** resolve under `file://` (Electron) and Capacitor `localhost`
2. **Lazy imports** after lobby enter work in WebView (no `import()` CSP block)
3. **`VITE_BASE_PATH`** matches deploy subpath for GitHub Pages and bundled apps

If chunk 404s appear in Electron, fix `base` in `vite.config.js` / `capacitor.config.json` before calling U done.

---

## What U will not do

- Obtain Apple / Google / Steam developer accounts for you
- Automate notarization or Play upload
- Run full Electron builds on every commit (too heavy — smoke on demand)
- Replace legal review of your game’s CREDITS / privacy policy

---

## Success criteria

Sprint U is **done** when:

1. `npm run store:verify` passes (91s smoke, Jul 2026)
2. `tc:ship` + `store:prep` + `store:assets` produce valid outputs from TC manifest
3. `export:graphics --profile windows` completes
4. `npm run build:electron` emits relative `./assets/` chunk paths for Electron
5. Manual blockers documented below (iOS, Play upload, signing)

### Verified (v9.11.0)

| Check | Result |
|-------|--------|
| `controls:verify` | PASS |
| `tc:verify` | PASS (tcRealism r6–r8) |
| `tc:ship` | PASS — bundle + manifest + store:prep |
| `store:assets` | PASS — 31 mapped assets |
| `build:electron` | PASS — relative chunk paths |
| `export:graphics windows` | PASS — 173 textures, 32 models |

---

## Related

- [STORE_RELEASE.md](STORE_RELEASE.md) — platform guides
- [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) — 9-step wizard
- [STORE_ASSETS.md](STORE_ASSETS.md) — PACKS / SKU mapping
- [STEAM_RELEASE.md](STEAM_RELEASE.md) — Steam depot path
- [CAPABILITIES.md](CAPABILITIES.md) — full progress snapshot