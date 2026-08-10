# Feature audit matrix — 10.21.x

Living checklist after origin train (10.21.1), art naming (10.21.2), export polish (10.21.3), surface clarity (10.21.4).

**How:** one ID at a time → scripted check if any → manual path → PASS/FAIL/N/A → fix blockers only.

**Policy:** blocker = same-session fix · warn = batch · defer = ROADMAP. Never Ollama probe on player surface.

---

## Automated smoke (B1)

| Script | Last run | Result | Notes |
|--------|----------|--------|-------|
| `version:sync:check` | 2026-08-10 | PASS | 10.21.4 aligned |
| `surface-verify` | 2026-08-10 | PASS | extended 10.21.4 |
| `portal-ui-verify` | 2026-08-10 | PASS | |
| `controls:verify` | 2026-08-10 | PASS | |
| `negative-lod-verify` | 2026-08-10 | PASS | |
| `physics:verify` | 2026-08-10 | PASS | |
| `perf:verify` | | | run via `node scripts/…` if npm.ps1 blocked |
| `ollama:golden` | | | optional minis |
| `store:verify` | | | optional |

---

## Block 1 — Surfaces

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| S1 | Player surface + mobile UA | puppeteer `?surface=player` | player | **PASS** | body.surface-player · allowsOllama=false · badge PLAY · hint |
| S2 | `?surface=creator` | puppeteer | creator | **PASS** | surface-creator · allowsOllama=true · badge CREATE |
| S3 | `?surface=full` | puppeteer | full | **PASS** | surface-full · badge FULL |
| S4 | Badge / cycle API | puppeteer cycle | both | **PASS** | player→creator→full→player · badge click works |
| S5 | Lobby + SETUP chips | puppeteer click creator | both | **PASS** | hints sync both elements |
| S6 | Origin minis | ollama chat | creator | **PASS** | medicinalsheep MIT; not Anthropic/UK (npc+mobile) |

Report: `dist-store/block1-surface-audit.json` · runner: `node scripts/block1-surface-audit.cjs` (rebuild dist-pages first if stale)

## Block 2 — Lobby

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| L1 | ENTER solo | puppeteer | both | **PASS** | lobby hidden · Network.mode=solo · template grid · starterGrid · 2 objs |
| L2 | CREATE SESSION | puppeteer PeerJS | creator | **PASS** | host mode + roomId + hostPasscode set (share panel race ok) |
| L3 | JOIN | 2 pages | both | **PASS** | empty-code error; guest join with code → lobby hidden · guest mode |
| L4 | Passcode | unit + 2 pages | both | **PASS** | wrong → “Wrong passcode”; correct → join · unit 5/5 |
| L5 | Display name | puppeteer | both | **PASS** | lobby-name → Session.playerName |

Report: `dist-store/block2-lobby-audit.json` · runner: `node scripts/block2-lobby-audit.cjs`

## Block 3 — Modes & movement

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| M1 | PLAY/ARRANGE/EDIT | puppeteer cycleMode | both | **PASS** | play→arrange→edit→play · pause on arrange/edit · surface unchanged |
| M2 | Sprint/crouch/stealth | getActiveBindings | both | **PASS** | Shift / Ctrl / KeyU · controls:verify also PASS |
| M3 | Touch pad | mobile UA | player | **PASS** | #touch-controls display block · TouchControls enabled |
| M4 | Play as (K) | possess/release | both | **PASS** | canPossess cube · possess+release · KeyK bound |
| M5 | Arrange snap 1u=1m | GridSystem | creator | **PASS** | cell=1 · label “1 unit = 1 m” · snap 1.4→1 |
| M6 | TPS/FPS + LMB/RMB | bindings + toggle | both | **PASS** | Mouse0 aim · Mouse2 fire · tps↔fps toggle |
| M7 | M / F | bindings | both | **PASS** | KeyM uiMouse · KeyF thirdEye+interact · ThirdEye present |

Report: `dist-store/block3-modes-audit.json` · runner: `node scripts/block3-modes-audit.cjs` (+ `controls-verify`)

## Block 4 — Build & agents

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| B1 | BUILD SOMETHING | puppeteer CTA | creator | **PASS** | CTA visible “BUILD SOMETHING” after showBuildCta |
| B2 | openBuildFast / hub AI | puppeteer | creator | **PASS** | hub-agent exists · openBuildFast opens portal |
| B3 | LIVE clearWorld block | LiveBuild.applyChunk | creator | **PASS** | clearWorld does not wipe scene (Starter Ground+You remain) |
| B4 | Live undo | undoLastStep | creator | **PASS** | canUndo · undid · HUD undo button present |
| B5 | SMART DEV / mini-dev | ollama | creator | **PASS** | type-first cube · setRenderMode(4) · no clearWorld |
| B6 | Intent realistic→4 | ollama npc | creator | **PASS** | INTENT graphics · setRenderMode(4) |
| B7 | Grok optional | UI | creator | **PASS** | xAI key field · prefer-grok · no key required |
| B8 | Sequential + freeze | prefs UI | creator | **PASS** | allowParallelLocal false · freeze checked · parallel off |
| B9 | Player blocks Ollama | player probe | player | **PASS** | allows=false · skippedSurface · “switch to Creator tools” |

Report: `dist-store/block4-build-audit.json` · runner: `node scripts/block4-build-audit.cjs`

## Block 5 — Art

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| A1 | Inspector art paths | puppeteer rename | creator | **PASS** | Stone Block → textures/stone_block_albedo.png · import/stone_block.glb |
| A2 | LiveBuild textureHint | create named prop | creator | **PASS** | Mat Wood Bench → textures/mat_wood_bench_albedo.png |
| A3 | MaterialPresets | applyMaterialPreset | creator | **PASS** | pbr_concrete_weathered · 26 select options |
| A4 | GIMP SYNC UI | button + bridge | creator | **PASS** | GIMP SYNC · pickAndApplyGimpManifest · plugin folder |
| A5 | Blender GLB UI | insert manifest | creator | **PASS** | BLENDER MANIFEST · GltfImport · plugin folder |

Report: `dist-store/block5-art-audit.json` · runner: `node scripts/block5-art-audit.cjs`

## Block 6 — Avatar

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| V1 | Body shape | SKIN sliders + applyShape | both | **PASS** | 6 sliders · applyShape soft-scale (Y 1.017) · no crash |
| V2 | Wardrobe | ClothingLayout equip/unequip | both | **PASS** | hoodie_urban equip · unequip · 13 slots · rail present |
| V3 | Walk LOD | updateWalk + AvatarLod | both | **PASS** | updateWalk walk/sprint · AvatarLod + PoseSync · no hop error |

Report: `dist-store/block6-avatar-audit.json` · runner: `node scripts/block6-avatar-audit.cjs`

## Block 7 — Perf

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| P1 | Mode 4 default | visual | both | | |
| P2 | Neg LOD ~100m | far | both | | |
| P3 | GraphicsProfile | SETUP | creator | | |
| P4 | PERF measure | SETUP | creator | | |

## Block 8 — Export

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| E1 | EXPORT & PLAY preflight | empty/full | creator | | |
| E2 | Web-only SHIP skip | wizard | creator | | 10.21.3 |
| E3 | Copy CLI | SHIP | creator | | |
| E4 | Draft restore | reopen | creator | | |
| E5 | Art preflight notes | named prop | creator | | |

## Block 9 — Multiplayer

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| N1 | Guest edit deny | 2 tabs | both | | |
| N2 | Sync userData | host tex | both | | |
| N3 | Host migration | optional | both | | |

---

## Session log

| Date | Blocks | Summary |
|------|--------|---------|
| 2026-08-10 | Phase A ship 10.21.4 | surface clarity pushed `b4c2b25` |
| 2026-08-10 | B1 smoke | version + surface + portal + controls + neg-lod + physics PASS |
| 2026-08-10 | **Block 1 complete** | S1–S6 all PASS (puppeteer + ollama origin) |
| 2026-08-10 | **Block 2 complete** | L1–L5 all PASS (solo + PeerJS host/guest + passcode) |
| 2026-08-10 | **Block 3 complete** | M1–M7 all PASS (modes, bindings, touch, play-as, grid, view) |
| 2026-08-10 | **Block 4 complete** | B1–B9 all PASS (portal, live build, minis, ollama gate) |
| 2026-08-10 | **Block 5 complete** | A1–A5 all PASS (art paths, textureHint, presets, GIMP/Blender UI) |
| 2026-08-10 | **Block 6 complete** | V1–V3 all PASS (shape, wardrobe, walk LOD) |
| | Block 7 next | P1–P4 perf & graphics |
