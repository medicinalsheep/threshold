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

- [x] Source of truth: `src/config.js` → `VERSION` (currently **10.12.5**)
- [x] `npm run version:sync` — patches `package.json`, `package-lock.json`, README + doc headers
- [x] `npm run version:sync:check` — CI drift gate (exit 1 if headers stale)

---

## Phase 3 — CI verify gate ✅ (2026-07-08)

**Goal:** Catch regressions before GitHub Pages deploy.

- [x] `version:sync:check` before build
- [x] After build: `portal-ui-verify`, `controls:verify`, `tc-drive-verify`, `tc-circuit-verify`
- [ ] Optional later: `store:verify`, `assets:verify` on schedule

---

## Phase 4 — Survival dev pack ✅ (2026-07-08)

**Goal:** Survival wired for developers, **not** in default shipped package.

- [x] Modules → `dev/survival/` + `bootstrap.js`
- [x] `npm run dev:survival` (`VITE_SURVIVAL_DEV=true`)
- [x] Default build/Pages: survival **not** imported (engine hooks use `window.SurvivalNeeds?.` no-ops)
- [x] `dev/survival/README.md` — DOM snippets + API table for fork authors

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