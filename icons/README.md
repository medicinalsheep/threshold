# Threshold brand assets

Source icons for web, Electron, and Capacitor builds.

| File | Use |
|------|-----|
| `appicon512.png` | Favicon, PWA, Electron/Capacitor app icon (512×512) |
| `icon_transfull.png` | Lobby logo — dark theme (transparent PNG) |
| `icon_translt.png` | Lobby logo — light theme (transparent PNG) |
| `appicon_drk.jpg` | Optional marketing |
| `appicon_lgt.jpg` | Optional marketing |
| `logo_transparent.jpg` | Legacy — superseded by `icon_transfull.png` |

## Regenerate native icons

```bash
npm run build:icons    # Electron icon.ico + icon.png
npm run cap:assets     # Android/iOS mipmap + splash (after init:native)
```