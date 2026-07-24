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

- [x] Source of truth: `src/config.js` → `VERSION` (currently **10.13.19**)
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

## Phase 5 — Solo creator loop polish ✅ (2026-07-08)

**Goal:** Idea → playable scene → web export in under 30 minutes.

- [x] Quick walkthrough — 4 steps ending in Export wizard (web-first)
- [x] Full tour copy — survival → `dev/survival/` dev pack pointer
- [x] Export TARGETS + design brief — Web default; native collapsed in `<details>`
- [x] Agent Portal explore-first — `startIfNeeded()` pulses only (no auto-open modal)

---

## Phase 6 — Dependency hygiene ✅ (2026-07-08)

- [x] `engines.node` >= 22 in `package.json` (CI already on Node 22)
- [x] `npm run audit:report` — manual triage command
- [x] Accepted risks documented in `CHANGELOG.md` (Electron/Capacitor dev tooling only)

---

## Phase 7 — Post-consolidation polish ✅ (2026-07-08)

| Item | Status |
|------|--------|
| `intent_classify` router | ✅ `src/shared/intentRouter.js` + game chat (T) routing |
| AWS relay polish | ✅ PM2, Docker, nginx example, `relay:verify`, graceful shutdown |
| Training dataset growth | ✅ classify.jsonl 15 · npc.jsonl 8 examples |
| Store upload automation | ✅ `store:upload` + **`store:ship`** (signing local) |
| macOS notarization | ✅ scripts + [MAC_NOTARIZE.md](MAC_NOTARIZE.md) — needs Mac + certs to run |
| GIMP hero 2K hand pass | Deferred — procedural seed ships |
| Training dataset growth | ✅ 2026-07-10 — classify/npc/compiler/scenes expanded |
| Local Ollama 2060 bench | ✅ llama3.2:3B default; qwen2.5 large; client think/num_ctx |

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
3. Live demo: lobby **ENTER** → BUILD → PLAY → export (multiplayer CREATE optional).
4. Version strings aligned via `npm run version:sync` (`config.js` → package + doc headers + `native-app.json`).