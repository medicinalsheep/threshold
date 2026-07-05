# Threshold brand assets

Source icons for web, Electron, and Capacitor builds.

| File | Use |
|------|-----|
| `appicon512.png` | Favicon, PWA, Electron/Capacitor app icon (512×512) |
| `appicon_drk.jpg` | Dark theme marketing / optional UI |
| `appicon_lgt.jpg` | Light theme marketing / optional UI |
| `appicon_transparent.jpg` | Transparent-style app art |
| `logo_transparent.jpg` | Lobby logo (dark backgrounds) |
| `logo_lgt.jpg` | Lobby logo (light mode) |

## Regenerate native icons

```bash
npm run build:icons    # Electron icon.ico + icon.png
npm run cap:assets     # Android/iOS mipmap + splash (after init:native)
```

`package:win` runs `build:icons` automatically if `.ico` is missing.