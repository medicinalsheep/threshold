# Performance status (Neg LOD + Visibility + harness)

**Status:** Core perf stack **complete** · **Engine:** **10.13.20**  
**Related:** [NEGATIVE_LOD.md](NEGATIVE_LOD.md) · [MATERIALS.md](MATERIALS.md) · [UI_AND_AGENTS.md](UI_AND_AGENTS.md)

X OAuth is **removed**. Shipped: Neg LOD (**~100m** default, **light-baked** unlit, tier auto, multi-mat, floor B/**C**) · MeshLod + HILOD **18/48m** first · Visibility **E0–E4** (near **100** / sleep **145**) · **E5** remotes/bloom · measure + **CI harness** · **player surface** · **material library**.

---

## Stack order (do not invert)

```text
1. VisibilitySystem.update   → A focus · B on-near · C on-far · D/E off
2. MeshLod.update            → geometry LOD  (config/lod-distances: 0 / 18 / 48 m)
3. TextureHilod.update       → tex res on A/B only
4. NegativeLod.update        → far unlit Basic  (default ~100 m; tiers 72–165)
```

| Band | Mesh | Texture | Material |
|------|------|---------|----------|
| 0–18 m | LOD0 | hi | full PBR |
| 18–48 m | LOD1 | mid | full PBR |
| 48–~100 m | LOD2 | low (while B) | full PBR |
| ≥ Neg threshold | freeze | freeze | unlit + light bake |

Configs: `lod-distances.json` · `negative-lod.json` · `visibility.json`.

---

## 1. Neg LOD auto-enable by graphics tier — **SHIPPED 10.13.8+**

| Input | Behavior |
|-------|----------|
| `autoEnableTiers` | `compatibility`, `balanced`, `realistic` |
| `distanceByTier` | Lite **72** · Mobile **95** · Realistic **125** · Ultra **165** |
| `defaultDistance` | **100** m · hysteresis **12** |
| Exclude | `isPlayer`, `isFloor`, `isHero`, `negativeLodExempt`, vehicles, GLTF heroes |

**API:** `NegativeLod.applyTierPolicy(tier)` · `maybeAutoEnable(obj)` · source `tier-auto` vs `user` / `negativeLodForcedOff`.

**Far color (10.13.19–20):** `unlitLift` · `ambientFloor` · soft `envBlend` · `forMap` light-only when textured · no shared-pool opacity thrash.

---

## 2. Multi-material / skinned — **SHIPPED 10.13.9**

| Case | Approach |
|------|----------|
| Multi-material | Stash full array; flat 1:1 (`poolKeys`) |
| Shared material | Clone when `shared` / `_shared` / `negativeLodClone` |
| SkinnedMesh | Mat swap only; skeleton kept; selection force-full |
| Registry | Root-only register (no child double-scan) |

---

## 3. Floor deck — **SHIPPED B 10.13.9 · C 10.13.15**

| Path | Behavior |
|------|----------|
| **B** | Whole-mat unlit when camera high/far (`cameraHeight` 22 · `distance` 100) |
| **C** | InstancedMesh near/far split (`pathCNearDistance` **52**) |

---

## 4. Visibility E0–E4 + E5

| Layer | Status |
|-------|--------|
| E0 classify A–E | ✅ 10.13.1 · near **100** / far sleep **145** |
| E1 gates | MeshLod / HILOD / idle / spin / NPC |
| E2 sleep | D/E shadows · E physics sleep |
| E3 env | Weather / shaders / audio |
| E4 spatial | Buckets when objects ≥120 |
| E5 | Far remote lerp · bloom skip Lite/no emissive |

---

## 5. Measure harness — **SHIPPED**

### In-engine
SETUP → **PERF** · `window.PerfHarness` · HUD: FPS · neg flat/reg · vis A/C/E · last p95.

### CLI

```bash
npm run perf:verify
npm run perf:harness
npm run perf:harness:compare
npm run perf:harness -- --cubes 200 --seconds 5 --warm 1 --tier compatibility
npm run negative-lod:verify
```

Defaults: **5s** sample · **1s** warm-up discarded · hitch **>100ms** dropped · `dist-store/perf-latest.json`.

---

## Done checklist

| Item | Status |
|------|--------|
| Neg LOD A+B + light bake | ✅ 10.13.0 → **.20** |
| Vis E0–E4 | ✅ |
| E5 remotes / bloom | ✅ 10.13.15 |
| Tier auto | ✅ · realistic included |
| Floor B + C | ✅ |
| Mesh/HILOD before unlit | ✅ 18/48 &lt; 100 |
| CI harness | ✅ |
| Player surface | ✅ |
| Material library | ✅ 10.13.18 |
| store:ship + mac notary | ✅ scripts; certs local |
| X OAuth | ❌ removed |

---

## Open (not perf blockers)

| Area | Notes |
|------|-------|
| Real store notarize | Needs studio certs + Mac host |
| Dataset growth | wave5 shipped; grow via EXPORT TRAINING PAIR |
| Hero hand-paint | Optional GIMP SYNC |
