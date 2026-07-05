# Next Phases — Universal Compatibility Roadmap

**Current:** v4.5.0 — Phase J (targeted graphics export CLI per platform profile).

**North star:** One world, every device, every render tier — retro modes for reach, Hyper for realism, smart LOD so low-end hardware still feels intentional.

---

## Priority order (left behind first)

### Phase E — Creative pipeline completion (v3.7–3.8) ✅

*Finished in v3.8.0 — proceed to Phase F (iOS).*

| Item | Status | Deliverable |
|------|--------|-------------|
| Normal maps from GIMP | ✅ v3.8 | `material.normalMap` + NORMAL button in TextureBridge |
| Native asset bundling | ✅ v3.8 | `npm run bundle:assets` → `dist-pages/bundle/` in Electron/Capacitor |
| Web GIMP SYNC auto-apply | ✅ v3.8 | Multi-file picker matches manifest slots (albedo/rough/metal/normal) |
| `textures:watch` in production | ✅ v3.8 | Opt-in `VITE_CREATIVE_WATCH=true` (or `=1`) for desktop/native builds |
| Sound blob bundling | ✅ v3.8 | Export wizard checkbox embeds base64 sound clips in manifest |
| Capacitor Filesystem import | ✅ scaffold v3.8 | `NativeAssets` + `@capacitor/filesystem` for device manifest load |
| Doc/version drift | ✅ v3.8 | Roadmap + workflow docs updated |

### Phase F — iOS & Apple App Store (v4.0) 🔧

*iOS scaffold shipped — archive/upload still requires macOS + Apple Developer account.*

| Step | Status | Work |
|------|--------|------|
| F1 | ✅ v4.0 | `@capacitor/ios`, `init:native` adds `ios/` (gitignored, generated locally) |
| F2 | ✅ v4.0 | `npm run package:ios`, `cap:open:ios` → Xcode |
| F3 | 📋 manual | Signing, provisioning, App Store Connect metadata (per-developer) |
| F4 | ✅ v4.0 | `cap:assets` generates iOS icon/splash from `icons/` |
| F5 | ✅ v4.0 | TestFlight pipeline documented in NATIVE_SHELLS.md |
| F6 | ✅ v4.0 | Export wizard **iOS** checkbox + manifest `packaging.ios` block |

**Compatibility notes:** WebGL on iOS WebView, safe-area insets (`viewport-fit=cover`), touch controls, mic HTTPS, no Electron on iOS.

**Left for store release:** signed archive, App Store screenshots, privacy questionnaire, notarized macOS (separate).

### Phase G — Suggested graphics & quality tiers (v4.1) ✅

*Shipped in v4.1.0 — Engine detects device tier; user overrides in ENV.*

| Tier | Target | Render mode | Features |
|------|--------|-------------|----------|
| **Compatibility** | Old phones, retro aesthetic | Threshold (0) | No bloom, no water, lighter physics |
| **Balanced** | Mid devices | SMPTE (3) | Atmosphere + fog, no water |
| **Realistic** | Desktop / flagship | Hyper (4) | PBR, water, bloom, atmosphere |
| **Ultra** | High-end desktop | Hyper (4) | Higher DPR cap, bloom, shadow res |

Deliverables:

- ✅ `GraphicsProfile.detect()` — GPU heuristic, cores, `deviceMemory`
- ✅ First-run prompt after tutorial — “Suggested: …” + ENV override
- ✅ Persist `graphics.tier` in sync + export manifest
- ✅ PromptGen `GRAPHICS TIERS` block in system prompt

### Phase H — Mesh LOD (v4.2)

| Step | Work |
|------|------|
| H1 | Blender addon: export LOD0/LOD1/LOD2 GLB chain |
| H2 | `userData.lodPaths` + distance switch in Engine |
| H3 | `blender:export --lod` headless batch |
| H4 | Manifest `models[].lods[]` |
| H5 | Physics: single collider from LOD0 bbox (unchanged) |

### Phase I — HILOD textures & streaming (v4.3–4.4)

**HILOD** = Hierarchical Level of Detail for textures (mip chains + distance-based map selection).

| Step | Work |
|------|------|
| I1 | GIMP/Blender export 2K/1K/512 variants (`_2k`, `_1k`, `_512` suffix) |
| I2 | TextureBridge selects map set by camera distance + graphics tier |
| I3 | Optional KTX2/Basis transcoding in native builds |
| I4 | `textures:watch` reload correct tier on save |
| I5 | Export pipeline: `graphics.textures[]` with tier variants |

### Phase J — Targeted graphics export (v4.5) ✅

*Ship different asset packages per store target from one manifest.*

| Deliverable | Status |
|-------------|--------|
| `config/graphics-export-profiles.json` | ✅ web/android/ios/windows/steam |
| `graphics.profiles` in game export manifest | ✅ v4.5 |
| `npm run export:graphics -- --profile <id>` | ✅ pruned `dist-export/<id>/bundle/` |
| HILOD suffix pick (`_512`/`_1k`/`_2k`) | ✅ by `textureMax` |
| `--install` + package scripts | ✅ auto in `package:android/win/ios` |
| Sliced `.threshold-game.json` per profile | ✅ with `--manifest` |

```bash
npm run export:graphics -- --profile android
npm run export:graphics -- --profile windows --manifest my-game.threshold-game.json --install
npm run export:graphics -- --all-profiles
```

---

## VLC plugin — do we need it?

**Recommendation: No VLC plugin in near-term roadmap.**

| Approach | Pros | Cons |
|----------|------|------|
| **HTML5 `<video>` + WebCodecs** | Universal in browser/Electron/Capacitor WebView | Limited codecs on some Android WebViews |
| **Electron native `<video>`** | Good for desktop cutscenes | Not on iOS WebView |
| **VLC embedding** | Broad codec support | Heavy dep, GPL/licensing, poor mobile story, fights universal “one SPA” model |

**When to revisit:** Phase K (optional) — **Cinematic layer** for in-engine cutscenes, spectator replay, or streamed texture sources. Prefer:

1. MP4/WebM assets in `video/` folder (like `textures/`)
2. `World.playCutscene(url)` using Three.js VideoTexture
3. Only add VLC if enterprise users need exotic codecs on desktop Electron

---

## Walkthrough & UX (Phase E1 — included in 3.7)

- Expand tutorial: textures, optional agents, export asset summary
- Export wizard shows texture/GLTF/GIMP/Blender counts
- PromptGen includes `getAssetContext()` when scene is attached
- Compiler WORKFLOWS: unified creative + export paths

---

## Universal compatibility principles

1. **One SPA** — same `dist-pages` for web, Capacitor, Electron
2. **Retro modes never removed** — Hyper is opt-in realism
3. **Local-first art** — GIMP/Blender on device; no cloud required
4. **Manifest-driven ship** — every asset path documented for packaging
5. **Graceful degrade** — LOD + HILOD + suggested tiers, not hard crashes
6. **Host-authoritative multiplayer** — sync metadata first, bundle assets per platform later

---

## Version map (planned)

| Version | Focus |
|---------|--------|
| **3.7** | Docs, prompts, walkthrough, export UX |
| **3.8** | Phase E — normal maps, bundling, web GIMP batch, sound sidecar |
| **4.0** | iOS Capacitor scaffold + export wizard + TestFlight docs |
| **4.1** | Suggested graphics tiers + first-run prompt + ENV presets |
| **4.5** | Targeted graphics export CLI (`export:graphics`) |
| **4.1** | Suggested graphics tiers |
| **4.2** | Mesh LOD |
| **4.3–4.4** | HILOD textures |
| **4.5** | Targeted graphics export CLI |
| **4.6+** | Steam, cinematic video (HTML5 first) |

---

## Contributing

Pick a Phase E item for fastest user-visible gain. iOS (Phase F) is the largest platform gap after creative pipeline completion.