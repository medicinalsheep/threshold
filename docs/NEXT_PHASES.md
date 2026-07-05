# Next Phases — Universal Compatibility Roadmap

**Current:** v5.7.0 — Phase R3 Child showcase (characters, audio, full export demo).

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

### Phase H — Mesh LOD (v4.6) ✅

| Step | Status |
|------|--------|
| H1 Blender addon LOD0/1/2 export | ✅ `{name}_LOD1` / `_LOD2` → `slug_lod1.glb` |
| H2 `userData.lodPaths` + distance switch | ✅ `MeshLod.update()` in Engine loop |
| H3 `blender:export --lod` | ✅ headless + UI `export_lods` |
| H4 Manifest `models[].lods[]` | ✅ Blender + game export `models[]` |
| H5 Physics LOD0 collider | ✅ `MeshLod.physicsSource()` uses LOD0 bbox |

### Phase I — HILOD textures & streaming (v4.7) ✅

**HILOD** = Hierarchical Level of Detail for textures (mip chains + distance-based map selection).

| Step | Status |
|------|--------|
| I1 GIMP export `_512`/`_1k`/`_2k` variants + manifest `variants[]` | ✅ |
| I2 `TextureHilod.update()` — camera distance + graphics tier | ✅ |
| I3 KTX2/Basis scaffold (`nativeTextureCodec.js`) | ✅ scaffold |
| I4 `textures:watch` parses HILOD suffix; hot-reload active tier | ✅ |
| I5 Export `graphics.textures[]` with variant groups | ✅ |

### Phase N — LOD + HILOD unify (v4.8) ✅

| Step | Status |
|------|--------|
| N1 Shared `config/lod-distances.json` (0/12/28m) for mesh + texture | ✅ |
| N2 Sync sanitizes `textureHilod` paths + `lodPaths`; guests rehydrate from bundle | ✅ |
| N3 `bundle-index.json` `textureGroups[]` for web variant discovery | ✅ |
| N4 `hilodUtils` shared (browser + `scripts/hilod-utils.cjs`) | ✅ |
| N5 Throttled `TextureHilod.update()`; KTX2 sibling path probe | ✅ scaffold |

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

### Phase L — Store-ready native polish (v5.0) ✅

| Step | Status |
|------|--------|
| L1 `npm run store:prep` — privacy policy + store metadata from manifest | ✅ |
| L2 `config/native-app.json` → Capacitor + Electron `appId` / `appName` | ✅ |
| L3 `package:android:release` (AAB) + Play Console template | ✅ |
| L4 Windows portable + NSIS installer; `CSC_LINK` signing docs | ✅ |
| L5 `package:mac` + notarization guide; iOS checklist in STORE_RELEASE.md | ✅ |

```bash
npm run store:prep -- --manifest my-game.threshold-game.json --contact you@example.com
npm run package:android:release
npm run package:win
```

See [STORE_RELEASE.md](STORE_RELEASE.md).

### Phase L2 — Export walkthrough & asset registry (v5.1) ✅

| Step | Status |
|------|--------|
| L2.1 9-step export wizard (INFO → REVIEW → … → PACKS → SHIP) | ✅ |
| L2.2 ICONS — bundle ID + `appicon512` / `build:icons` / `cap:assets` checklist | ✅ |
| L2.3 SCENE — live inventory (objects, GLTF, textures, sounds, video) | ✅ |
| L2.4 CREDITS — per-asset license, author, source → `credits.md` | ✅ |
| L2.5 `assetRegistry` + `storeAssets` scaffold (`storeSku`, `registryUri`) | ✅ |
| L2.6 STORE step — contact / support / privacy URLs → `store:prep` | ✅ |
| L2.7 `store:prep` writes `credits.md` + `asset-registry.json` | ✅ |

```bash
# In Engine: MORE → EXPORT (walkthrough)
npm run store:prep -- --manifest my-game.threshold-game.json --contact you@example.com
```

See [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md) · `config/store-assets.json`

### Phase M+ — Store asset platform mapping (v5.2) ✅

| Step | Status |
|------|--------|
| M+.1 PACKS wizard step — per-asset `storeSku` + `registryUri` | ✅ |
| M+.2 Steam App/Depot ID, Play app ID, itch slug in manifest | ✅ |
| M+.3 Auto kind packs (textures, models, sounds, videos) | ✅ |
| M+.4 `npm run store:assets` — Play / Steam / itch / registry JSON | ✅ |
| M+.5 Integrated into `store:prep` + `store-assets-prep.json` summary | ✅ |

```bash
npm run store:assets -- --manifest my-game.threshold-game.json
npm run export:graphics -- --profile steam --install   # Steam depot bundle
```

See [STORE_ASSETS.md](STORE_ASSETS.md) · `config/store-assets.json`

### Phase M — Steam release (v5.3) ✅

| Step | Status |
|------|--------|
| M1 `electron/steamworks-shim.cjs` — optional steamworks.js, stub fallback | ✅ |
| M2 Achievements + overlay IPC (`ThresholdShell.steam`, `SteamBridge`) | ✅ |
| M3 `npm run package:steam` — ultra graphics + portable exe | ✅ |
| M4 `npm run steam:depot` — content layout + steamcmd VDF scripts | ✅ |
| M5 Export TARGETS → Steam checkbox + manifest `packaging.steam` | ✅ |
| M6 Auto achievements: world save, export, cutscene, multiplayer host | ✅ |

```bash
npm run package:steam -- --manifest my-game.threshold-game.json
npm run steam:depot -- --manifest my-game.threshold-game.json
npm install steamworks.js   # optional — achievements when on Steam
```

See [STEAM_RELEASE.md](STEAM_RELEASE.md)

### Phase R1 — Reference editions scaffold (v5.4) ✅

| Step | Status |
|------|--------|
| R1.1 `config/reference-editions.json` + `reference/ATTRIBUTION.md` | ✅ |
| R1.2 Edition registry + dev `reference:fetch` CLI | ✅ |
| R1.3 `referenceEdition.js` lobby bootstrap | ✅ |
| R1.4 Doc truth pass (9-step export, AGENTS.md, README) | ✅ |

### Phase R1.5 — Threshold Child policy (v5.5) ✅

| Step | Status |
|------|--------|
| R1.5.1 Procedural Child Lite — Runner, Hauler, Circuit Span | ✅ |
| R1.5.2 Lobby **THRESHOLD CHILD** + `thresholdChildAssets.js` | ✅ |
| R1.5.3 Policy docs — no unmodified external assets in shipped editions | ✅ |
| R1.5.4 Deprecated `threshold-ref-lite` Kenney drop; dev seeds gitignored | ✅ |
| R1.5.5 Tier 2 — [GETTING_STARTED.md](GETTING_STARTED.md), [CHANGELOG.md](CHANGELOG.md) | ✅ |

See [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md) · [REFERENCE_EDITIONS.md](REFERENCE_EDITIONS.md)

### Phase R2 — Blender Child GLB + LOD (v5.6) ✅

| Step | Status |
|------|--------|
| R2.1 `threshold_child_*.glb` + LOD chain in `import/` | ✅ |
| R2.2 `thresholdChildVehicles.js` + `MeshLod` @ 12m/28m | ✅ |
| R2.3 `child:vehicles:build` + Blender `build_child_vehicles.py` | ✅ |
| R2.4 Lobby THRESHOLD CHILD → GLB default, Lite fallback | ✅ |
| R2.5 Edition registry `threshold-child-vehicles` | ✅ |

```bash
npm run child:vehicles:build
npm run blender:export -- --blend plugins/threshold-blender/child_vehicles.blend --object "Threshold Runner" --lod
```

### Phase R3 — Characters, audio, showcase (v5.7) ✅

| Step | Status |
|------|--------|
| R3.1 `thresholdChildCharacters.js` — Marshal + Mechanic | ✅ |
| R3.2 `thresholdChildAudio.js` — synthesized SFX seeds | ✅ |
| R3.3 `thresholdChildShowcase.js` — full export demo world | ✅ |
| R3.4 PromptGen `childAssetsPrompt.js` ASSETS block | ✅ |
| R3.5 Lobby showcase default; CREDITS/PACKS character + sound kinds | ✅ |

### Phase R4 — Walkthrough QA + doc truth (v5.8.1) ✅

| Step | Status |
|------|--------|
| R4.1 TC walkthrough QA checklist (lobby TC → → EXPORT) | ✅ |
| R4.2 Doc/manifest truth pass — `tc-*` ids everywhere | ✅ |
| R4.3 `npm run tc:verify` smoke test + alias map | ✅ |
| R4.4 Manifest `childEdition` removed; root `tcEd=tc-show` | ✅ |
| R4.5 G1 starter — Compiler WORKFLOWS **TC Circuit** timer + checkpoint | ✅ |

```bash
npm run tc:build
npm run tc:verify
# Lobby → TC → → MORE → EXPORT (SCENE / CREDITS / PACKS)
```

**Next (R5):** Blender TC mesh realism (`build_tc_chr.py`), refine veh silhouettes.

### Phase G1 — TC Circuit game-dev path (v5.8.1) ✅

| Step | Status |
|------|--------|
| G1.1 `referenceLibrary.js` workflow — lap timer + `tc_cp` checkpoint | ✅ |
| G1.2 PromptGen extends TC scene without `World.clearWorld()` | ✅ |

**Next:** Multiplayer lap sync smoke, export E2E (S1).

### Phase K — Cinematic layer (v4.9) ✅

| Step | Status |
|------|--------|
| K1 `video/` folder + `threshold_video_manifest.json` | ✅ |
| K2 `World.playCutscene()` / `stopCutscene()` — Three.js VideoTexture | ✅ |
| K3 `textures:watch` watches `video/` (MP4/WebM hot-reload) | ✅ |
| K4 `bundle:assets` + `export:graphics` ship `video/` | ✅ |
| K5 Export manifest `videos[]` + wizard count | ✅ |

```javascript
// In running world code (Compiler → RUN):
await World.playCutscene('video/intro.mp4', {
  skippable: true,
  onComplete: (meta) => console.log('done', meta.reason),
});
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