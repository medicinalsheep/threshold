# Performance next steps (after Neg LOD A–E4)

**Status:** Core perf stack shipped · **Engine:** 10.13.13+  
**Related:** [NEGATIVE_LOD.md](NEGATIVE_LOD.md) · [UI_AND_AGENTS.md](UI_AND_AGENTS.md) (surfaces)

X OAuth is **removed**. Shipped: **Neg LOD** (long distance, scene-aware tint, tier auto, multi-mat, floor B) · **Visibility E0–E4** · **measure harness** · **player surface**. Remaining optional: CI headless harness.

---

## 1. Neg LOD auto-enable by graphics tier — **SHIPPED 10.13.8**

### Goal
On **compatibility / balanced** (and optionally mobile detect), automatically set `userData.negativeLOD = true` on eligible background objects so authors don’t have to click every prop.

### Design

| Input | Behavior |
|-------|----------|
| `config/negative-lod.json` → `autoEnableTiers` | e.g. `["compatibility", "balanced"]` |
| `autoEnableMinObjects` | Only if `State.objects.length >= N` (avoid empty grid noise) |
| Exclude | `isPlayer`, `isFloor`, `isHero`, `negativeLodExempt`, selected, vehicles, GLTF heroes with mesh LOD chain optional |

### When to run
1. After graphics tier apply (`GraphicsProfile.apply*`)  
2. After scene load / template bootstrap  
3. Optional: when object count crosses threshold  

### Implementation sketch
```js
// negativeLod.js
NegativeLod.applyTierPolicy(tier, objects) {
  if (!autoEnableTiers.includes(tier)) return;
  if (objects.length < min) return;
  for (const o of objects) {
    if (excluded(o)) continue;
    if (o.userData.negativeLOD === false) continue; // user forced off
    if (!o.userData.negativeLOD) NegativeLod.enableObject(o, { distance: defaultForTier(tier) });
  }
}
```

Distance by tier: compatibility 28m · balanced 40m · realistic/ultra opt-in only or longer 55m.

### Shipped
- `config/negative-lod.json` → `autoEnableTiers`, `autoEnableMinObjects`, `distanceByTier`
- `NegativeLod.applyTierPolicy(tier)` · `maybeAutoEnable(obj)` · source `tier-auto` vs `user` / `negativeLodForcedOff`
- Hooks: `GraphicsProfile.apply`, scene load, template bootstrap, `World.createObject`

### Effort
**S** — done.

---

## 2. Multi-material / skinned edge cases — **SHIPPED 10.13.9**

| Case | Approach |
|------|----------|
| **Multi-material mesh** | Stash full array; flat 1:1 per slot (`poolKeys`) |
| **Shared material** | `clone()` when `userData.shared` / `_shared` / `negativeLodClone` |
| **SkinnedMesh** | Swap mats only; skeleton kept; force-full on selection |
| **InstancedMesh** | Floor path B (§3) |

### Effort
**M** — done (in-engine).

---

## 3. Instanced floor deck — **SHIPPED path B 10.13.9**

| Option | Status |
|--------|--------|
| **A. Keep excluded** from prop registry | ✅ floors stay out of prop auto |
| **B. Swap shared mat** when camera high/far | ✅ `updateFloorTargets` · Lite/Mobile |
| **C. Split near/far instances** | Deferred (L) |

Config: `negative-lod.json` → `floor.cameraHeight` (12) · `floor.distance` (45) · `autoTiersOnly`.

---

## 4. Measure harness — **SHIPPED 10.13.8** (in-engine)

### Goal
Repeatable before/after numbers for Neg LOD + visibility (not subjective “feels faster”).

### Deliverable
In-engine **SETUP → PERF — measure harness** + `window.PerfHarness` · HUD shows last sample:

| Metric | How |
|--------|-----|
| FPS avg / 1% low | `requestAnimationFrame` over 5s |
| Frame ms p50/p95 | same |
| `VisibilitySystem.getStats()` | A–E counts, shadowsDimmed, physicsAsleep |
| `NegativeLod.getStats()` | flat/full/switches |
| Draw calls / triangles | `renderer.info.render` |
| Scenario | Flag: empty grid · 200 cubes NegLOD · 200 cubes off |

### Shipped
- `src/shared/perfHarness.js` — `measure(ms)`, `snapshot()`, `downloadLast()`
- SETUP panel: RUN SAMPLE · SNAPSHOT · DOWNLOAD JSON
- Creator PERF HUD: FPS + neg flat/reg + vis A/C/E + last sample p95

### CLI (headless) — **SHIPPED 10.13.14+** (tuned 10.13.15)

```bash
npm run perf:verify              # static smoke (always CI)
npm run perf:harness             # 200 cubes · 5s · 1s warm · Lite
npm run perf:harness:compare     # Neg LOD on vs off + % p95
npm run perf:harness -- --cubes 200 --seconds 5 --warm 1 --tier compatibility
```

Defaults: **5s sample**, **1s warm-up discarded**, hitch frames **>100ms** dropped.  
Writes `dist-store/perf-<stamp>.json` and `dist-store/perf-latest.json`.

### Success bar
Compare prints p95 on/off and **% lower with Neg LOD** when Δ positive.

---

## Suggested order

```text
1. Auto-enable by tier     ✅
2. Measure harness         ✅ (in-engine)
3. Multi-mat / skinned     ✅
4. Floor deck B            ✅
5. E4 spatial buckets      ✅ 10.13.10
6. CI headless harness     ✅ 10.13.14
7. Player surface (mobile) ✅ 10.13.11
```

---

## Done vs not (perf stack)

| Item | Status |
|------|--------|
| Neg LOD A+B | ✅ |
| Vis E0–E3 | ✅ |
| Vis E4 spatial | ✅ 10.13.10 |
| X OAuth | ❌ removed |
| Tier auto-enable | ✅ 10.13.8 |
| Measure harness (in-engine) | ✅ 10.13.8 |
| Multi-mat / skinned | ✅ 10.13.9 |
| Floor path B | ✅ 10.13.9 |
| Floor path C | ✅ 10.13.15 |
| CI headless harness | ✅ 10.13.14+ |
| Player surface (mobile) | ✅ 10.13.11 |
| E5 remotes / bloom | ✅ 10.13.15 |
| store:ship + mac notary | ✅ 10.13.15 |
