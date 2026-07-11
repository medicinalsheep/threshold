# Performance next steps (after Neg LOD A–E3)

**Status:** Planning · **Engine:** 10.13.x visibility + negative LOD stack live  
**Related:** [NEGATIVE_LOD.md](NEGATIVE_LOD.md)

X OAuth is **removed** from the product. Remaining perf polish:

---

## 1. Neg LOD auto-enable by graphics tier

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

### Effort
**S** (~0.5–1 day) · low risk · high ROI for mobile demos.

---

## 2. Multi-material / skinned edge cases

### Current limit
`getMeshes` + first material path; multi-material arrays partially handled; skinned / shared mats may thrash pool or tint siblings.

### Plan

| Case | Approach |
|------|----------|
| **Multi-material mesh** | Stash full array; build flat array 1:1 (or one Basic per unique color) |
| **Shared material** (`material.userData.shared` or refcount >1) | `material.clone()` on first enterFlat; mark `_negativeLodCloned` |
| **SkinnedMesh** | Same as mesh; never dispose skeleton; force-full on focus |
| **InstancedMesh** | Separate path (see §3) |

### Tests
- GLTF with 3 mats → far flat all slots  
- Two meshes sharing one StandardMaterial → clone on flat  
- Avatar skinned body with Neg LOD  

### Effort
**M** (~1–2 days)

---

## 3. Instanced floor deck

### Current
`floorDeck.js` uses `InstancedMesh` + one shared `MeshStandardMaterial`. Neg LOD registry treats roots in `State.objects` — floor may be `isFloor` **excluded** by design.

### Options

| Option | Pros | Cons |
|--------|------|------|
| **A. Keep excluded** | Floor always quality | No gain on huge slabs |
| **B. Swap shared mat** | One mat → Basic when camera high/far | Whole floor pops together (OK) |
| **C. Split near/far instances** | Best look | Hard — re-bucket instances |

**Recommend B:** if camera height or distance to deck origin > threshold, `instanced.material = flatPool`; restore when near. Hook in `NegativeLod.update` for objects with `userData.isFloor && userData.negativeLodFloor`.

### Effort
**S–M** if B · **L** if C

---

## 4. Measure harness

### Goal
Repeatable before/after numbers for Neg LOD + visibility (not subjective “feels faster”).

### Deliverable
`scripts/perf-harness.cjs` **or** in-engine **SETUP → PERF** panel:

| Metric | How |
|--------|-----|
| FPS avg / 1% low | `requestAnimationFrame` over 5s |
| Frame ms p50/p95 | same |
| `VisibilitySystem.getStats()` | A–E counts, shadowsDimmed, physicsAsleep |
| `NegativeLod.getStats()` | flat/full/switches |
| Draw calls / triangles | `renderer.info.render` |
| Scenario | Flag: empty grid · 200 cubes NegLOD · 200 cubes off |

### CLI (headless limited)
Puppeteer against `vite preview` + scripted camera orbit; write `dist-store/perf-*.json`.

### Effort
**M** (~1–2 days) for in-engine panel + JSON export; **M+** for CI headless.

### Success bar
Document: “200 cubes, orbit, mobile tier: p95 frame time −X% with stack on vs off.”

---

## Suggested order

```text
1. Auto-enable by tier     (fast win, uses existing flag)
2. Measure harness         (prove wins before more systems)
3. Multi-mat / skinned     (correctness)
4. Floor deck B            (if floor shows in profiles)
5. E4 spatial buckets      (only if classify CPU shows hot)
```

---

## Done vs not (perf stack)

| Item | Status |
|------|--------|
| Neg LOD A+B | ✅ |
| Vis E0–E3 | ✅ |
| X OAuth | ❌ removed |
| Tier auto-enable | Plan only |
| Multi-mat / skinned | Plan only |
| Floor instanced | Plan only |
| Measure harness | Plan only |
| E4 spatial | Plan only (scale) |
