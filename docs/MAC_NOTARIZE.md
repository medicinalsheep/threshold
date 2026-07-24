# macOS notarization (Electron)

Sign + notarize Threshold desktop `.dmg` / `.app` for Gatekeeper. **Credentials stay on your machine** — never commit certs or app-specific passwords.

**Related:** [STORE_RELEASE.md](STORE_RELEASE.md) · `npm run package:mac` · `scripts/notarize-mac.cjs`

---

## Prerequisites

| Item | Notes |
|------|--------|
| macOS host | `package:mac` only runs on **darwin** |
| Apple Developer Program | Paid membership |
| **Developer ID Application** cert | Export `.p12` for `CSC_LINK` |
| App-specific password | [appleid.apple.com](https://appleid.apple.com) → App-Specific Passwords |
| Team ID | Developer account → Membership |

---

## Environment variables

```bash
export CSC_LINK="/absolute/path/to/DeveloperID.p12"
export CSC_KEY_PASSWORD="••••"
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="ABCDE12345"   # 10-char team id
# optional override:
# export APP_BUNDLE_ID="com.yourstudio.game"
```

Check without printing secrets:

```bash
npm run mac:notarize:check
# or: node scripts/notarize-mac.cjs --check
```

---

## Build + notarize

```bash
npm run build:electron          # relative asset base for Electron
npm run package:mac             # signs if CSC_* set; afterSign notarizes when Apple env present
```

`electron-builder.config.cjs` sets:

- `mac.hardenedRuntime: true`
- `afterSign: scripts/notarize-mac.cjs` (no-ops if env incomplete)

---

## Staple (after notary finishes)

```bash
# Wait for email / notarytool history if async
npm run mac:staple -- dist-electron/Threshold-*-mac.dmg
# or:
node scripts/notarize-mac.cjs --staple dist-electron/YourApp.dmg
```

Validate:

```bash
spctl --assess --type open --verbose=4 dist-electron/YourApp.dmg
xcrun stapler validate dist-electron/YourApp.dmg
```

---

## Orchestrated ship

```bash
npm run store:ship -- --manifest exports/my-game.threshold-game.json --targets mac --notarize-check
```

Runs `store:prep` → `store:assets` → env check → `package:mac` (on darwin) → `store:upload` guide → `store:verify`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `package:mac` on Windows | Expected fail — use a Mac or macOS CI |
| Notary rejects unsigned | Ensure Developer ID Application + `CSC_LINK` |
| `invalid password` | Regenerate app-specific password (not Apple ID login password) |
| Staple fails “Ticket not found” | Wait for notary processing; re-run staple |
| Capacitor vs Electron | **iOS App Store** = `package:ios` + Xcode · **Mac desktop dmg** = this doc |

---

## Security

- Never commit `*.p12`, passwords, or `.env` with Apple credentials
- Prefer CI secrets (GitHub Actions `environment`) for studio pipelines
- `dist-electron/` and `dist-store/` stay gitignored
