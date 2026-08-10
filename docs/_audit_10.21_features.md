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
| M1 | PLAY/ARRANGE/EDIT | hub | both | | ≠ surface |
| M2 | Walk/sprint/crouch | keys | both | | |
| M3 | Touch pad | phone | player | | |
| M4 | Play as (K) | manual | both | | |
| M5 | Arrange snap | 1u=1m | creator | | |
| M6 | TPS/FPS/ADS | LMB/RMB | both | | |
| M7 | M / F / Alt | keys | both | | |

## Block 4 — Build & agents

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| B1 | BUILD SOMETHING | manual | creator | | |
| B2 | openBuildFast / hub AI | manual | creator | | |
| B3 | LIVE SCENE | manual | creator | | no clearWorld |
| B4 | Live undo | HUD ↩ | creator | | |
| B5 | SMART DEV | Ollama | creator | | type-first |
| B6 | Intent realistic→4 | golden | creator | | |
| B7 | Grok optional | key | creator | | |
| B8 | Sequential freeze | SETUP | creator | | |
| B9 | Player blocks Ollama | player | player | | |

## Block 5 — Art

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| A1 | Inspector art paths | rename | creator | | 10.21.2 |
| A2 | LiveBuild textureHint | live step | creator | | |
| A3 | MaterialPresets | apply | creator | | |
| A4 | GIMP SYNC copy | status/docs | creator | | |
| A5 | Blender GLB | if asset | creator | | |

## Block 6 — Avatar

| ID | Feature | Verify | Surface | Result | Notes |
|----|---------|--------|---------|--------|-------|
| V1 | Body shape | SKIN | both | | 10.21 |
| V2 | Wardrobe | SKIN | both | | |
| V3 | Walk LOD | walk | both | | |

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
| | Block 3 next | M1–M7 modes & movement |
