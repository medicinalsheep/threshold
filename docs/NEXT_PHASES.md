# Next Phases — Universal Compatibility Roadmap

**Current:** v7.3.0 — Phase 18.1 Tesla lab intro shell (coil, doors, PBR, ambient, flythrough).

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

### Phase R5 — Blender TC mesh realism (v5.9) ✅

| Step | Status |
|------|--------|
| R5.1 `tc_mesh_lib.py` — shared veh+chr builders | ✅ |
| R5.2 `build_tc_chr.py` → Marshal + Mechanic GLB+LOD | ✅ |
| R5.3 `build_tc_veh.py` refine — wheels, nose, spoiler, tailgate | ✅ |
| R5.4 `headless_export` — `--slug tc_run` etc. + `realism: r5` | ✅ |
| R5.5 `tc-build` Blender chr path; Node R5 fallback | ✅ |

```bash
npm run tc:build
# With Blender:
blender --background --python plugins/threshold-blender/build_tc_chr.py
npm run blender:export -- --blend plugins/threshold-blender/tc_chr.blend --object "TC Marshal" --slug tc_msh --lod --no-physics --tc-ed tc-chr --realism r5
```

### Phase R6 — TC GIMP textures + HILOD (v5.10) ✅

| Step | Status |
|------|--------|
| R6.1 `tc-gen-tex.cjs` — PBR + HILOD `_512`/`_1k`/`_2k` | ✅ |
| R6.2 `config/tc-textures.json` + GIMP `build_tc_tex.py` | ✅ |
| R6.3 `tcTex.js` — spawn-time texture + HILOD wire | ✅ |
| R6.4 `threshold_manifest.json` TC entries + EXPORT credits | ✅ |
| R6.5 `tc:verify` texture + HILOD smoke | ✅ |

```bash
npm run tc:gen:tex
npm run tc:build
# GIMP: Filters → Threshold → Build TC Textures (R6)
```

### Phase R7 — TC intro cutscene (v5.11) ✅

| Step | Status |
|------|--------|
| R7.1 `video/tc_intro.webm` — TC showcase intro | ✅ |
| R7.2 `build_tc_intro.py` + `tc:gen:vid` | ✅ |
| R7.3 `tcIntro.js` — play after Lobby TC → (skippable) | ✅ |
| R7.4 Video manifest + EXPORT / PromptGen ASSETS | ✅ |

```bash
npm run tc:gen:vid   # pip install pillow imageio imageio-ffmpeg
# Lobby → TC → → intro plays once · ESC to skip
```

### Phase S1 — TC export E2E ship path (v5.12) ✅

| Step | Status |
|------|--------|
| S1.1 `tc-export-manifest.cjs` — TC Show `.threshold-game.json` | ✅ |
| S1.2 `npm run tc:ship` — build → bundle → manifest → `store:prep` | ✅ |
| S1.3 `npm run tc:ship:verify` — dist-store + bundle + preview smoke | ✅ |
| S1.4 `exports/tc-show.threshold-game.json` whitelisted in git | ✅ |

```bash
npm run tc:ship
npm run tc:ship:verify -- --preview-smoke   # uses preview on :4173 if running
npm run package:win                           # optional — heavy Electron build
```

### Phase G1 — TC Circuit + multiplayer lap sync (v5.14) ✅

| Step | Status |
|------|--------|
| G1.1 `referenceLibrary.js` workflow — lap timer + `tc_cp` checkpoint | ✅ |
| G1.2 PromptGen extends TC scene without `World.clearWorld()` | ✅ |
| G1.3 `tcCircuit.js` — synced leaderboard + `LAP_CROSS` actions | ✅ |
| G1.4 `remotePlayers.js` — multiplayer position markers | ✅ |
| G1.5 `npm run tc:circuit:verify` | ✅ |

```bash
# Solo: Lobby → TC → · Compiler RUN:
World.startTcCircuit()
# Multiplayer: host CREATE → guests JOIN → host RUN startTcCircuit → all cross tc_cp
npm run tc:circuit:verify
```

### Phase G2 — Drivable TC vehicles + live sync (v5.15) ✅

| Step | Status |
|------|--------|
| G2.1 `tcDrive.js` — claim tc_run/tc_haul, WASD physics drive | ✅ |
| G2.2 `LIVE_STATE` avatar sync (~80ms) without world rebuild | ✅ |
| G2.3 `World.enterTcRace()` — circuit + vehicle claim | ✅ |
| G2.4 Extra tc_run spawn for 3+ players | ✅ |
| G2.5 `npm run tc:drive:verify` | ✅ |

```bash
World.enterTcRace()   # Compiler after Lobby → TC →
npm run tc:drive:verify
```

### Phase G3 — Checkpoint gates + vehicle enter/exit (v5.16) ✅

| Step | Status |
|------|--------|
| G3.1 `tcGateFx.js` — gate bar + beacon pulse + checkpoint sfx | ✅ |
| G3.2 `lastGatePulse` circuit sync — multiplayer gate flash | ✅ |
| G3.3 `tcDrive` enter/exit animations — camera + walk spawn | ✅ |
| G3.4 `npm run tc:g3:verify` | ✅ |

```bash
World.enterTcRace()   # gate + drive anim on claim
# Cross tc_cp — bar opens · sfx · lap logged · synced to guests
World.releaseTcVehicle()   # exit anim · walk avatar
npm run tc:g3:verify
```

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

### Phase 6 — Realism defaults (v6.0) ✅

| Step | Status |
|------|--------|
| 6.0.1 `assets:pack` + `assets:verify` one-shot pipeline | ✅ |
| 6.0.2 WebP HILOD compress + runtime prefer WebP | ✅ |
| 6.0.3 `REALISTIC_GAMEPLAY.md` — controls, NPC/texture/audio recipes | ✅ |
| 6.0.4 Starter scene dressing — stripes, barriers, parking | ✅ |

### Phase 7 — Avatars, footsteps, FPS (v6.1) ✅

| Step | Status |
|------|--------|
| 7.1 `avatar:gen` — starter_avatar + NPC GLBs with walk clip | ✅ |
| 7.2 Footstep SFX — concrete/metal surface raycast | ✅ |
| 7.3 FPS viewmodel — arms + pistol on camera | ✅ |
| 7.4 Remote players — avatar mesh (not capsule) | ✅ |
| 7.5 Full HILOD WebP on all texture tiers | ✅ |

### Phase 8 — Textures, KTX2, ADS (v6.2) ✅

| Step | Status |
|------|--------|
| 8.1 Six new texture presets (grass, wood, gravel, asphalt, fabric, metal_grate) | ✅ |
| 8.2 `_4k` HILOD tier + r8 generation | ✅ |
| 8.3 KTX2 scaffold (`tex:ktx2`, Basis transcoder) | ✅ |
| 8.4 ADS — hold R/LT in FPS | ✅ |
| 8.5 Surface pads in starter scene + 6 footstep surfaces | ✅ |
| 8.6 `ASSET_CAPABILITIES.md` + `BLENDER_AVATARS.md` | ✅ |

### Phase 9 — GIMP parity, Blender avatar, UV tiling (v6.3) ✅

| Step | Status |
|------|--------|
| 9.1 GIMP `build_tc_tex.py` full r8 parity (12 styles) | ✅ |
| 9.2 `blender:avatar` headless rigged GLB export | ✅ |
| 9.3 `starter-textures.json` UV repeat + finish pass | ✅ |
| 9.4 Starter scene — fabric banner, bench, tiled pads | ✅ |
| 9.5 `GIMP_TEXTURES.md` | ✅ |

### Phase 10 — GIMP live SYNC + starter kit (v6.4) ✅

| Step | Status |
|------|--------|
| 10.1 `creative-watch.cjs` — auto WebP, bundle mirror, `/gimp-sync` | ✅ |
| 10.2 Runtime hot-reload — `finishMaterial` + UV tiling on SYNC | ✅ |
| 10.3 `kit:export` + `kit:verify` — ~1.4 MB WebP fork pack | ✅ |
| 10.4 GIMP export reads HILOD from `tc-textures.json` | ✅ |

### Phase 11 — FiveM controls + ambient makeover (v6.5) ✅

| Step | Status |
|------|--------|
| 11.1 FiveM-style control defaults (LMB/RMB, F vehicle, grouped KEYS) | ✅ |
| 11.2 Crouch, stealth, flashlight, reload, melee, holster, horn | ✅ |
| 11.3 Ambient SFX — wind, highway, birds, cicadas, dust | ✅ |
| 11.4 Starter anim — lamps, birds, wind turbine, banner | ✅ |
| 11.5 Highway strip + texture palette pass | ✅ |
| 11.6 [CONTROLS_FIVEM.md](CONTROLS_FIVEM.md) + [AMBIENT_ASSETS_ROADMAP.md](AMBIENT_ASSETS_ROADMAP.md) | ✅ |

### Phase 10.1 — Docs + archive (v6.4.1) ✅

| Step | Status |
|------|--------|
| 10.1.1 `docs/README.md` scope index | ✅ |
| 10.1.2 README / AGENTS / GETTING_STARTED / PRODUCT_ROADMAP truth pass | ✅ |
| 10.1.3 `old/` — legacy editions + R2 scripts | ✅ |
| 10.1.4 `npm run quickstart` onboarding CLI | ✅ |

### Phase 12 — Real weather audio (v6.6.0) ✅

| Step | Status |
|------|--------|
| 12.1 Mixkit rain/thunder fetch pipeline | ✅ |
| 12.2 `WeatherSystem` — layers, particles, wet surfaces | ✅ |
| 12.3 User recording tag pipeline + `RecordedAmbient` | ✅ |
| 12.4 Real combat SFX (gun, glass, metal, footsteps) | ✅ |

### Phase 13 — Stability & session UX (v6.7.0) ✅

| Step | Status |
|------|--------|
| 13.1 Manifest fingerprint skip for starter sounds | ✅ |
| 13.2 Staggered ambient + rain loop starts | ✅ |
| 13.3 Guest `ensureStarterAudio` after `FULL_STATE` | ✅ |
| 13.4 Weather sync in `LIVE_STATE` + thunder/gust events | ✅ |
| 13.5 Pointer lock release — blur, visibility, pause, spectate | ✅ |
| 13.6 Hotfixes 6.6.1–6.6.2 (freeze, TPS, windowed fullscreen) | ✅ |
| 13.7 [PHASE_13_STABILITY.md](PHASE_13_STABILITY.md) | ✅ |

### Phase 14 — Ambient iteration 2b (v6.8.0) ✅

| Step | Status |
|------|--------|
| 14.1 River / creek water + flow anim + zone audio | ✅ |
| 14.2 Power lines — hum zone + sway anim | ✅ |
| 14.3 Fence chain rattle on wind gusts | ✅ |
| 14.4 Dirt mound + dust particles + `dirt` texture | ✅ |

### Phase 15 — Wildlife & life (v6.9.0) ✅

| Step | Status |
|------|--------|
| 15.1 Dog bark proximity near Sam + bowl prop | ✅ |
| 15.2 Cat meow alley spawn + tail anim | ✅ |
| 15.3 Cicadas day / crickets night time swap | ✅ |
| 15.4 Owl evening + fish splash at creek | ✅ |

### Phase 16 — Urban / highway (v7.0.0) ✅

| Step | Status |
|------|--------|
| 16.1 Semi truck Doppler pass | ✅ |
| 16.2 Motorcycle quick pass | ✅ |
| 16.3 Distant siren + construction beep | ✅ |
| 16.4 Traffic lights + billboard UV | ✅ |

### Phase 17 — Interior / RP (v7.1.0) ✅

| Step | Status |
|------|--------|
| 17.1 Radio chatter terminal zone | ✅ |
| 17.2 Coffee shop murmur loop | ✅ |
| 17.3 Door creak interact prop | ✅ |
| 17.4 Elevator ding + cash register | ✅ |

See [AMBIENT_ASSETS_ROADMAP.md](AMBIENT_ASSETS_ROADMAP.md) iteration 5 shipped.

### Phase 18 — Tesla lab intro makeover

| Step | Status | Version |
|------|--------|---------|
| 18.1 Lab shell + coil + doors + intro flythrough | ✅ | v7.3.0 |
| 18.2 Interactables (rotary switch, tubes, jars) | ⏳ | v7.4 |
| 18.3 Lab coat NPC + intro captions | ⏳ | v7.5 |
| 18.4 Annex weather + skylight rain | ⏳ | v7.6 |
| 18.5 Blender GLB + mesh LOD | ⏳ | v7.7 |

See [PHASE_18_TESLA_LAB.md](PHASE_18_TESLA_LAB.md) · [DEFAULT_ASSETS_ROADMAP.md](DEFAULT_ASSETS_ROADMAP.md).

```bash
npm run quickstart
npm run quickstart -- --pack
npm run assets:verify
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