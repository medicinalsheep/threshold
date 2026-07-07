# Threshold brand assets

Source icons for web, Electron, and Capacitor builds.

| File | Use |
|------|-----|
| `appicon512.png` | **Source of truth** — PWA, Electron/Capacitor, og:image (512×512) |
| `favicon.ico` | Browser tab + bookmarks (16+32) — run `npm run build:icons` |
| `favicon-32.png` | Modern favicon |
| `icon-192.png` | PWA / Android manifest |
| `icon_transfull.png` | Lobby logo — dark theme (transparent PNG) |
| `icon_translt.png` | Lobby logo — light theme (transparent PNG) |
| `appicon_drk.jpg` | Optional marketing |
| `appicon_lgt.jpg` | Optional marketing |
| `logo_transparent.jpg` | Legacy — superseded by `icon_transfull.png` |

`npm run build:icons` writes to `icons/` and copies to `public/icons/` for GitHub Pages.

## Regenerate native icons

```bash
npm run build:icons    # favicon ladder + Electron icon.ico
npm run cap:assets     # Android/iOS mipmap + splash (after init:native)
```