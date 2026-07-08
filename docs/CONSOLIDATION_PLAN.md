# Threshold Consolidation Plan

**Created:** 2026-07-08 · **Live version:** `src/config.js` → `VERSION`

Action plan from project review. Execute in order; each phase should pass `npm run build` before moving on.

---

## Phase 1 — Engine split ✅ (2026-07-08)

**Goal:** `src/engine/main.js` becomes a thin bootstrap; subsystems live in focused modules.

| Module | Responsibility |
|--------|----------------|
| `state.js` | `State`, `OBJECT_TYPES`, `Modes`, touch flag |
| `physics.js` | Cannon-es world, bodies, sync |
| `audioSys.js` | Web Audio clips, tones, object sounds |
| `recorder.js` | Canvas capture → WebM |
| `environment.js` | Sun, fog, water, atmosphere UI |
| `engineCore.js` | Three.js scene, render loop, input, shaders |
| `world.js` | Object create/delete/spawn, TC vehicle API |
| `io.js` | Scene JSON import/export |
| `ui.js` | Inspector, insert modal, bindings, agents panel |
| `main.js` | `initEngine()`, window globals, session bootstrap |

**Rules:**
- Keep `window.Engine`, `window.World`, `window.UI`, etc. — compiler + agents depend on them.
- No behavior changes in Phase 1; move code only.
- Update `tc-*-verify.cjs` to grep `src/engine/*.js` when symbols move out of `main.js`.

---

## Phase 2 — Version & doc sync ✅ (2026-07-08)

**Goal:** One source of truth for shipped version.

- [x] Source of truth: `src/config.js` → `VERSION` (currently **10.12.4**)
- [x] `npm run version:sync` — patches `package.json`, `package-lock.json`, README + doc headers
- [x] `npm run version:sync:check` — CI drift gate (exit 1 if headers stale)

---

## Phase 3 — CI verify gate

**Goal:** Catch regressions before GitHub Pages deploy.

Add to `.github/workflows/deploy-pages.yml` after `npm run build`:

```bash
node scripts/portal-ui-verify.cjs
npm run controls:verify
```

Optional weekly: `npm run store:verify`, `npm run assets:verify`.

---

## Phase 4 — Survival module purge

**Goal:** Finish 10.11 quality-first cleanup.

Files still in `src/shared/`:
- `survivalGameplay.js`, `survivalInteract.js`, `survivalNeeds.js`
- `survivalNeedsHud.js`, `survivalZones.js`, `survivalWorldHooks.js`

**Options:**
1. **Archive** → `old/src/shared/` + remove imports from engine tick / host panel.
2. **Re-wire** → optional template toggle in SETUP (only if you want survival back).

Default recommendation: archive unless actively used in PLAY tests.

---

## Phase 5 — Solo creator loop polish

**Goal:** Idea → playable scene → web export in under 30 minutes.

- [ ] Walkthrough timing audit (corner hub → portal → first object → PLAY → export).
- [ ] Export wizard defaults to Web-only; hide Steam/iOS until user expands TARGETS.
- [ ] Agent Portal: first-run path without mandatory AI connect (10.9 explore-first — verify still holds).

---

## Phase 6 — Dependency hygiene

- [ ] Run `npm audit` — triage Electron/Capacitor highs; document accepted risks in `docs/CHANGELOG.md`.
- [ ] Pin Node 22 in CI (already set) + add `engines` field to `package.json`.

---

## Phase 7 — Deferred (post-consolidation)

| Item | Notes |
|------|-------|
| Store upload automation | Signing stays local |
| macOS notarization | Needs Mac hardware |
| AWS relay polish | Scaffold exists in `relay/` |
| `intent_classify` router | Prompt exists, no router |
| Training dataset growth | ~15 JSONL examples |
| GIMP hero 2K hand pass | Procedural seed ships |

---

## Verify before any release

```bash
npm run build
node scripts/portal-ui-verify.cjs
npm run controls:verify
npm run preview:pages   # smoke at :4173
```

---

## Phase 1 results

- `main.js`: **3005 → 183 lines** (bootstrap + globals only)
- New modules: `state`, `physics`, `audioSys`, `recorder`, `environment`, `engineCore`, `world`, `io`, `ui`
- `npm run build` PASS · `portal-ui-verify` PASS · `tc-drive-verify` PASS · `tc-circuit-verify` PASS

---

## Success criteria

1. `src/engine/main.js` under 250 lines. ✅
2. All verify scripts PASS.
3. Live demo behavior unchanged (lobby → BUILD → PLAY → export).
4. Version strings aligned across README + config + package.json.