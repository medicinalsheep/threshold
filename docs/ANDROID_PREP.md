# Android APK prep (after polish)

Ship **Threshold the app** as a Capacitor WebView shell. Local Ollama minis are **desktop**; on phone use **Grok** for AI (see [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md)).

**When:** After roadmap polish + manual PLAY testing — not mid-feature.

---

## Prerequisites

| Tool | Notes |
|------|--------|
| Node ≥ 22 | Matches `package.json` engines |
| Android Studio | SDK API 34+, build-tools, platform-tools |
| JDK 17 | Android Studio embedded JDK is fine |
| Optional keystore | Release AAB only |

---

## One-shot sync (debug APK path)

```bash
npm install
npm run package:android
# or step-by-step:
npm run build
npm run bundle:assets
npm run init:native          # first time only — creates android/
npx cap sync android
npm run cap:open             # Android Studio
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)** for a debug install.

---

## Release AAB (Play Console)

```bash
npm run store:prep -- --manifest exports/tc-show.threshold-game.json --contact you@example.com
# Edit dist-store/<slug>/privacy-policy.md and host a public URL

npm run package:android:release
# Sign in Android Studio if Gradle signing is not configured
```

Checklist: [STORE_RELEASE.md](STORE_RELEASE.md) · verify: `npm run store:verify`

---

## Mobile AI defaults (product honesty)

| Feature | On APK |
|---------|--------|
| Play / build / multiplayer (PeerJS) | Yes |
| Grok agents (API key in SETUP) | Yes (network) |
| Ollama / `threshold-mini-*` | **No** — use desktop Ollama pull |
| Offline local LLM | Future on-device pack (not in base APK) |

Copy for store listing: *AI features require an internet connection and your own API key. Local models are available on desktop via Ollama.*

---

## Icons & splash

```bash
npm run build:icons
npm run cap:assets
```

---

## Related

- [NATIVE_SHELLS.md](NATIVE_SHELLS.md)  
- [STORE_RELEASE.md](STORE_RELEASE.md)  
- [STORE_VERIFY.md](STORE_VERIFY.md)  
