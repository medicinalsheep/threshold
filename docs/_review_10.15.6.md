# Code review — Threshold 10.15 interaction / quality series

**Scope:** arrange mode, play-as, quality ladder, sim mode, grid, engine/UI/controls branches  
**Mode:** read-only review  
**Date:** 2026-07-26

## Summary

The 10.15 modules are well-structured (clear mode labels, solo network gate, delete→release, grid units as meters, quality ladder opt-in). Several real bugs block or corrupt the new loops: hub mode cycle immediately undoes ARRANGE via a `|| togglePause` short-circuit; arrange never restores kinematic bodies on reselect or mode exit (physics mass leak); and `Controls.pollGamepad` early-returns without restoring keyboard edge presses when no gamepad is connected (breaks **K** / other edge actions). Play-as early-outs and look routing are mostly solid; residual risks are pause-while-possessed, fixed 0.016 step, and host (non-solo) play-as block.

## Issues

### Issue 1 -- Severity: bug
- File: `src/shared/cornerHub.js:40`
- Description: Hub mode button runs `window.ArrangeMode?.cycleMode?.() || window.UI?.togglePause?.()`. `cycleMode()` returns `undefined` (void), which is falsy, so **`togglePause` always runs after every cycle**. Sequence from PLAY: `enter()` → pause + `interactionMode='arrange'`, then `togglePause` resumes and forces `interactionMode='play'`. Net effect: hub never stays in ARRANGE; PLAY↔EDIT thrash and ARRANGE is effectively unreachable via the documented hub control.
- Suggestion: Call only `ArrangeMode.cycleMode()` when present; use `togglePause` solely as a true fallback when `ArrangeMode` is missing. Prefer `if (window.ArrangeMode?.cycleMode) ArrangeMode.cycleMode(); else UI.togglePause();`. Have `cycleMode` return a boolean if a fallback chain is desired.
- Status: fixed (hub calls cycleMode only; cycleMode returns true)

### Issue 2 -- Severity: bug
- File: `src/shared/arrangeMode.js:224-247` (select); `167-201` (exitToPlay / exitToEdit)
- Description: **Physics / kinematic leak.** `select()` calls `setBodyKinematic(root, true)` but never restores the previously selected body's mass/type. Switching A→B leaves A at `mass=0` / KINEMATIC. `exitToPlay` / `exitToEdit` only `_endDrag` + clear highlight; they do **not** call `setBodyKinematic(obj, false)` or `deselect()`. Leaving ARRANGE with a selection (or after multi-select) leaves props permanently unpushable / wrong body type once PLAY physics resumes. `_endDrag` even re-applies kinematic true (line 356), which is fine while selected but compounds the exit path.
- Suggestion: Track `_kinematicTarget` (or restore previous on every select). On `exitToPlay` / `exitToEdit` / mode leave, restore selected body then clear selection (or call `deselect()`). On select of a new root, restore the old mesh first.
- Status: fixed (restore body on select switch + exitToPlay/Edit)

### Issue 3 -- Severity: bug
- File: `src/shared/controls.js:476-495` (`pollGamepad`)
- Description: Each frame copies `justPressed` into `kbEdges`, clears `justPressed`, then **returns early** when `getGamepads()` is missing or no pad is connected — **before** the restore loop at 540–545. Keyboard edges set via `markJustPressed` in `engineCore` keydown (including **playAs / K**, pause, reload, etc.) are dropped whenever no gamepad is connected. With a pad connected, restore runs and keys work — intermittent, hard-to-repro “K does nothing.”
- Suggestion: Always restore `kbEdges` / touch edges in a `finally`-style path before any early return; only skip gamepad axis/button sampling when no pad. Example: structure as clear → sample pad if any → always merge kbEdges back.
- Status: fixed (always restore kb edges in finally)

### Issue 4 -- Severity: bug
- File: `src/shared/playAs.js:343-347`
- Description: Non-dynamic (kinematic / mesh-only) human jump does `target.position.y += 0.04` every frame while jump is held, with no ground probe or cooldown. Holding Space floats the mesh upward indefinitely (and writes body.position.y if a static body exists).
- Suggestion: One-shot hop (edge on jump), clamp height, or lerp back to floor; mirror player ground probe if a body exists.
- Status: fixed (one-shot hop latch)

### Issue 5 -- Severity: bug
- File: `src/engine/ui.js:317-343` (`selectObject`)
- Description: In PLAY, selection is assigned (`State.selectedObject = obj`) but the `!SimMode.canEditObject` early return skips `PlayAs.refreshUi()`. Play-as button enable/label stays stale after canvas pick until some other refresh. Same skip on `isPlayer` early return.
- Suggestion: Call `PlayAs.refreshUi()` on all select/deselect exit paths (or in a `finally`). Optionally suppress the “world locked” status when the pick is only for play-as.
- Status: fixed (refreshUi on all select paths; play-as status hint)

### Issue 6 -- Severity: bug
- File: `src/engine/ui.js:1190-1211` (`togglePause`); interplay with `src/shared/playAs.js`
- Description: Pausing (P / host pause) while Play As is active does **not** release possession. Player remains parked (`collisionResponse=false`, body at y≈−50, group hidden). `postPhysics` / look stop while paused, but resume continues possess with no camera re-lock guarantee. `togglePause` also forces `interactionMode` to `'edit'|'play'`, fighting ARRANGE if that mode was active (related to Issue 1). Badge can show PLAY AS over EDIT chrome.
- Suggestion: On pause → EDIT, either release Play As or park a clear “frozen possess” state and re-request look lock on resume. Never clobber `interactionMode==='arrange'` unless intentionally leaving arrange (deselect + restore kinematics first).
- Status: fixed (release play-as on pause; deselect arrange)

### Issue 7 -- Severity: suggestion
- File: `src/shared/playAs.js:308-331` (and arrange WASD); engine supplies real `dt` in `animate`
- Description: Movement uses hard-coded `0.016` / `ACCEL * 0.016` instead of frame `dt`. Speed and accel scale with framerate (fast on high Hz, sluggish on low).
- Suggestion: Pass `dt` from `engineCore` into `PlayAs.prePhysics(dt)` / `postPhysics(dt)` and clamp like the main loop (`Math.min(0.05, dt)`).
- Status: open

### Issue 8 -- Severity: suggestion
- File: `src/shared/playAs.js:153-157` (`networkOk`)
- Description: Play as allowed only for `!mode || mode === 'solo'`. After **CREATE SESSION**, `Network.mode === 'host'` even with zero guests — possess is blocked despite solo feel. Docs say solo-only (OK), but UX surprise for host-only rooms.
- Suggestion: Allow host when `peerCount===0` / no remote players, or document “solo ENTER only” in the hub status string when blocked.
- Status: open

### Issue 9 -- Severity: suggestion
- File: `src/shared/arrangeMode.js:409-417` vs `src/shared/controls.js` reload default `KeyR`
- Description: In ARRANGE, **R** rotates the selection; engine still `consumeJustPressed('reload')` without `isPaused` / arrange guard and may fire player reload SFX/anim. **Q/E** dual-map fly up/down vs arrange height.
- Suggestion: Gate combat/reload/melee while `SimMode.isArrange()` or `State.isPaused`; arrange handlers already `preventDefault` but do not stop Controls edge marking.
- Status: open

### Issue 10 -- Severity: suggestion
- File: `src/shared/playAs.js:187-220`, `265-276`
- Description: `_state.entry` is snapshotted at possess time. Adding/removing physics on the target mid-possess leaves a stale entry (dynamic path never arms, or body already removed). Delete path in `world.js` does release when target matches — good — but non-World removals rely on parent/objects check only.
- Suggestion: Re-resolve `physicsEntry(target)` each tick or subscribe to body add/remove; on any scene removal of target, release.
- Status: open

### Issue 11 -- Severity: suggestion
- File: `src/engine/engineCore.js:146-166` (look); `src/shared/playAs.js:228-229`
- Description: Play-as auto `requestPointerLock` after 40ms; unlocked path still applies look from raw pointer deltas on every canvas `pointermove` (not drag-gated). Can feel “sticky” / accidental look when pointer free (UI mouse / Third Eye). Release on pause is good (`_releaseLookLock`).
- Suggestion: When not pointer-locked, only apply look while primary button held (or while not `ThirdEye.isPointerFree()`), consistent with walk look policy.
- Status: open

### Issue 12 -- Severity: suggestion
- File: `src/shared/qualityLadder.js:201-210`, `256-287`
- Description: `addMaterialExamples` synthetic-clicks DOM insert buttons; silent no-op if IDs missing or listeners not bound yet. `initUi` can double-bind if called twice (no guard). Ladder “cookbook” step never marks done (`done = false` always) — status UI slightly misleading.
- Suggestion: Call material spawn APIs directly; guard `initUi` with `_uiBound`; mark cookbook done via ViewPrefs visit flag if desired.
- Status: open

### Issue 13 -- Severity: nit
- File: `src/shared/arrangeMode.js:336-337`
- Description: `_hit.add(_offset)` mutates the shared `_hit` vector in place. Correct for one consumer, fragile if another system reuses `_hit` mid-drag.
- Suggestion: Use `_hit.clone().add(_offset)` or a dedicated `_dragPos` scratch.
- Status: open

### Issue 14 -- Severity: nit
- File: `src/shared/simMode.js:17-28`
- Description: `isEdit()` is purely `!!isPaused`, so ARRANGE is “edit” for rights — intentional — but `isPlay()` also excludes arrange by mode. Callers that only check `isPaused` vs `interactionMode` can disagree briefly during `threshold:pause` (handler may set mode to `edit` before Arrange sets `arrange`).
- Suggestion: Single writer for mode transitions (ArrangeMode / togglePause only); pause handler should not force `edit` when reason is `'ARRANGE'`.
- Status: open

### Issue 15 -- Severity: nit
- File: docs vs code
- Description: `docs/CONTROLS.md` / `PHYSICS.md` / `BUILD_FROM.md` match intended design (PLAY→ARRANGE→EDIT, play-as K, kit opt-in, 1 unit = 1 m). Code issues above mean hub ARRANGE and K-without-gamepad may not match docs until Issues 1 and 3 are fixed. No contradictory API claims found in grid/quality modules.
- Suggestion: After fixes, smoke: ENTER solo → hub cycle three modes → snap move → K possess → Esc release → delete while possessed.
- Status: open

## What looks solid

- **Play-as engine wiring:** `engineCore` pre/postPhysics exclusive branch; player early-outs; combat actions gated; gamepad stick routes to `PlayAs.applyLookInput`.
- **Delete / clear world:** `World.deleteObject` / `clearWorld` release possess when target (or any) active.
- **GridSystem:** cell presets, snap, TransformControls snap, helper rebuild — coherent with 1 m unit docs.
- **Starter grid / quality ladder:** terminal default, no auto kit/pad; lighting presets avoid pad thrash when possible.
- **SimMode rights:** arrange counts as edit-world for insert/inspect; guests blocked from cycleMode.
- **Arrange input capture:** document capture listeners + canvas target check reduce walk look-lock fights.

## Residual risks (no separate issue)

- Parked player body under floor if release fails mid-error (try/finally around release recommended long-term).
- Multiplayer play-as still deferred — no replication of possessed target intent.
- Highlight emissive restore can miss multi-mesh roots (only first mesh tinted).
- `setBodyKinematic` relies on `CANNON.Body.KINEMATIC`; if CANNON global missing, type may not switch (mass still 0).

## Issue counts

| Severity   | Count |
|-----------|-------|
| bug       | 6     |
| suggestion| 6     |
| nit       | 3     |
| **Total** | **15** |
