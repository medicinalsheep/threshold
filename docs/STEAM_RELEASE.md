# Steam release guide (Phase M — v5.3)

Ship Threshold games on **Steam** via Windows Electron portable + **steamcmd** depot upload. Optional **Steamworks** integration for achievements and overlay.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| Steamworks partner account | [partner.steamgames.com](https://partner.steamgames.com) |
| App ID + Depot ID | Set in export walkthrough **PACKS** step |
| Windows dev machine | Build portable `.exe`; upload via SteamCMD |
| SteamCMD | [SteamCMD install guide](https://partner.steamgames.com/doc/sdk/uploading) |

---

## Quick start

```bash
# 1. Export manifest (PACKS step → Steam App ID + Depot ID)
# 2. Store prep + asset maps
npm run store:prep -- --manifest my-game.threshold-game.json
npm run store:assets -- --manifest my-game.threshold-game.json

# 3. Build Steam graphics profile + portable exe
npm run package:steam -- --manifest my-game.threshold-game.json

# 4. Stage depot + generate steamcmd VDF scripts
npm run steam:depot -- --manifest my-game.threshold-game.json

# 5. Upload (after SteamCMD login)
dist-steam\scripts\upload-steam-depot.cmd
```

---

## Pipeline

```
EXPORT (PACKS) → store:prep → package:steam → steam:depot → steamcmd upload → Steamworks live branch
```

| Step | Output |
|------|--------|
| `package:steam` | `dist-electron/*-win-portable.exe` + `config/steam-app.json` |
| `steam:depot` | `dist-steam/content/` (exe + `steam_appid.txt` + `bundle/`) |
| `steam:depot` | `dist-steam/scripts/app_build.vdf`, `depot_build.vdf` |
| Upload | `dist-steam/output/` build logs |

Graphics: **ultra** tier, up to **4K** textures (`export:graphics --profile steam`).

---

## Steamworks (achievements + overlay)

Optional native module — Electron runs fine without it (stub mode).

```bash
npm install steamworks.js
```

| Config | Purpose |
|--------|---------|
| `config/steam-app.json` | Written by `package:steam --manifest` — App ID for runtime |
| `STEAM_APP_ID` | Env override |
| `STEAM_DEV=1` | Use Spacewar (480) for local API testing |
| `config/steam-release.json` | Achievement catalog |

### Achievements (auto-unlock in Engine)

| ID | Trigger |
|----|---------|
| `WORLD_SAVED` | Export world file |
| `GAME_EXPORTED` | Download `.threshold-game.json` |
| `FIRST_CUTSCENE` | Complete a video cutscene |
| `MULTIPLAYER_HOST` | Host a PeerJS room |

Renderer API: `window.SteamBridge` · Preload: `ThresholdShell.steam`

### Overlay

Shift+Tab when Steam client is running and game launched via Steam. Programmatic: `SteamBridge.openOverlay('friends')`.

---

## steamcmd upload

1. Install SteamCMD to `C:\steamcmd\` (or edit `upload-steam-depot.cmd`)
2. Set `STEAM_USER` env or edit the script
3. Run `upload-steam-depot.cmd`
4. Steamworks → your app → **SteamPipe** → confirm build
5. Set default branch / beta branch for playtest

---

## Development testing

Without a published app, use Spacewar:

```bash
set STEAM_DEV=1
set STEAM_APP_ID=480
npm run electron:dev
```

Copy `steam_appid.txt` next to the exe when testing a standalone build.

---

## Manifest fields

```json
{
  "targets": { "steam": true, "windows": true },
  "assetOpportunity": {
    "steam": { "appId": "1234560", "depotId": "1234561" }
  },
  "packaging": {
    "steam": {
      "packageCli": "npm run package:steam -- --manifest <game>.threshold-game.json",
      "depotCli": "npm run steam:depot -- --manifest <game>.threshold-game.json"
    }
  }
}
```

---

## Related

- [STORE_ASSETS.md](STORE_ASSETS.md) — `steam-depot-assets.json` asset path map
- [STORE_RELEASE.md](STORE_RELEASE.md) — Windows signing, itch.io
- [NATIVE_SHELLS.md](NATIVE_SHELLS.md) — Electron shell
- [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) — PACKS step