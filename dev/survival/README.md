# Survival dev pack (optional)

Vitals, interact props, zones, and challenge card — **for developers**, not the default shipped web build.

## Enable locally

```bash
npm run dev:survival
```

Sets `VITE_SURVIVAL_DEV=true` so `src/engine/main.js` dynamically imports this folder after engine init.

## Wire into a custom build

```bash
VITE_SURVIVAL_DEV=true npm run build
```

Only use when you intentionally ship survival in your fork/export — **medicinalsheep/threshold** GitHub Pages stays off by default.

## DOM (paste into index.html when testing HUD)

Survival HUD markup was removed from the default SPA in 10.11. Add these when you need the vitals overlay:

```html
<div id="survival-needs-hud" class="survival-needs-hud" hidden></div>
<div id="survival-collapse-vignette" class="survival-collapse-vignette"></div>
<div id="survival-run-card" class="survival-run-card" hidden>
  <div class="survival-run-title">Survival Run</div>
  <p class="survival-run-body">Keep all vitals above 35% for 3 minutes.</p>
  <div class="survival-run-nav">
    <button type="button" id="survival-run-start">Start</button>
    <button type="button" id="survival-run-dismiss">Dismiss</button>
  </div>
</div>
```

Host panel guest toggle (optional MP):

```html
<label class="guest-survival-hud-row">
  <input type="checkbox" id="guest-survival-hud" checked /> Show vitals HUD
</label>
```

## API surface (window globals)

| Global | Module |
|--------|--------|
| `SurvivalNeeds` | Vitals tick, sprint gates, pack/unpack for MP |
| `SurvivalZones` | Passive zone modifiers |
| `SurvivalInteract` | F-key interact handler |
| `applySurvivalWorldHooks` | Tag starter props by id/name |
| `SurvivalNeedsHud` | HUD render (needs DOM above) |
| `SurvivalRun` | Optional challenge card |

Core engine already calls `window.SurvivalNeeds?.tick?.()` in PLAY — no-op until this pack loads.

## Compiler / agents

Reference workflows live in `src/shared/referenceLibrary.js` and `promptCookbook.js`. Tag meshes with `userData.interactAction: 'survival'` and `survivalKind: 'food' | 'water' | 'rest' | 'snack'`, then call `applySurvivalWorldHooks()`.