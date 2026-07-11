# Negative LOD — Design & Implementation Plan

**Status:** Design approved for implementation (not yet coded)  
**Target version:** 10.13.x  
**Live engine version:** 10.12.30+  
**Related:** `meshLod.js`, `textureHilod.js`, `lodConfig.js`, `config/lod-distances.json`, `engineCore.js` animate tick

---

## 1. Idea (one paragraph)

Add a boolean **`negativeLOD`** on materials and/or objects. When `true` and the camera is far enough, the renderer **does not swap meshes** (classic LOD). Instead it **swaps the material’s shading path** to an ultra-cheap “negative” shader: **no PBR**, no lights/shadows/envMap/reflections, only **flat albedo color** (optional map sample) plus **distance fade**. Close range restores full `MeshStandardMaterial` (or the previous material). This is a **shader LOD** complementary to existing **mesh LOD** and **texture HILOD**.

```
distance < near  → full PBR (MeshStandard / graphs / weather)
distance ≥ far   → NegativeFlat (unlit + fade)
hysteresis band  → keep last state (avoid thrash)
```

---

## 2. Why it can be a breakthrough

| Traditional mesh LOD | Negative LOD |
|----------------------|--------------|
| Needs `_LOD1` / `_LOD2` GLBs, authoring, memory for variants | Works on **any** existing mesh with one flag |
| Geometry cost drops | **Fragment + lighting cost** drops (often the real mobile killer) |
| Hard for agent-generated primitives | Perfect for mass-spawned AI props |
| Align/scale chain complexity | Material swap only |

**Gains stack** with MeshLod + TextureHilod:

1. **Near:** full PBR + high tex  
2. **Mid:** cheaper tex (HILOD) ± mesh LOD1  
3. **Far:** **negativeLOD** flat unlit (and optionally hide shadows)  

---

## 3. Property model

### 3.1 Canonical fields (`userData` + material)

Prefer **object `userData`** as source of truth (syncs with multiplayer / scene JSON). Material may mirror for Three tooling.

```js
// On Object3D / mesh.userData (and optional material.userData)
{
  negativeLOD: true,              // master enable
  negativeLodDistance: 40,        // meters; default from config
  negativeLodHysteresis: 4,       // band so we don't flip every frame
  negativeLodMode: 'auto',        // 'auto' | 'force-full' | 'force-flat'  (dynamic control)
  negativeLodFade: true,          // distance alpha fade in flat mode
  negativeLodPreserveMap: false,  // if true, sample map.rgb * color (still unlit)
  // runtime (engine-owned, not serialized as authoring):
  _negativeLodState: 'full',      // 'full' | 'flat'
  _negativeLodFullMat: null,      // ref or UUID of full material
  _negativeLodFlatMat: null,      // shared or per-mesh flat material
}
```

**Boolean property name:** `negativeLOD` (camelCase to match existing `userData` style).

**Where it can be set:**

| Site | Meaning |
|------|---------|
| `mesh.userData.negativeLOD` | Applies to that mesh |
| Group `userData.negativeLOD` | Applies to all mesh descendants (composer/GLTF roots) |
| `material.userData.negativeLOD` | Optional override if mesh flag absent |
| Graphics tier / global | Optional “auto-enable negativeLOD for non-hero objects on Mobile/Lite” |

### 3.2 Config (`config/negative-lod.json`)

```json
{
  "format": "threshold-negative-lod",
  "version": 1,
  "enabled": true,
  "defaultDistance": 40,
  "hysteresis": 4,
  "maxUpdatesPerFrame": 48,
  "fadeStart": 0.85,
  "fadeEnd": 1.15,
  "preserveMapDefault": false,
  "skipIfMeshLodActive": false,
  "autoEnableTiers": ["compatibility", "balanced"],
  "autoEnableMinObjects": 24,
  "excludeFlags": ["isPlayer", "isFloor", "negativeLodExempt", "isHero"]
}
```

Extend `config/lod-distances.json` note **or** keep separate so mesh LOD distances (12 / 28) stay independent of negative flat threshold (often **farther**, e.g. 40–60 m).

### 3.3 Scene / export serialization

- Persist: `negativeLOD`, `negativeLodDistance`, `negativeLodMode`, `negativeLodFade`, `negativeLodPreserveMap`
- **Do not** persist runtime mats (`_negativeLod*`)
- Sync over multiplayer via existing `userData` pipeline (`sync.js` / object create payloads)

---

## 4. Shader design

### 4.1 Full mode (near)

Unchanged: `MeshStandardMaterial` (+ optional `shaderRegistry` / node graphs / weather).  
Store reference when entering flat mode so restore is exact.

### 4.2 Flat mode (far) — “NegativeFlat”

Use **`THREE.MeshBasicMaterial`** (or a tiny custom `ShaderMaterial` if we need custom fade).

**Skips (by construction of BasicMaterial):**

- All lights / PBR BRDF  
- Env map reflections  
- Metalness / roughness / normal maps (unless we later add a custom unlit with normal — **out of v1**)  
- Shadow receive/cast contribution from lighting (still can cast if `castShadow` left on — recommend **`castShadow = false` while flat** for more savings)

**Does:**

- `color` = original `material.color` (or average if multi-mat)  
- Optional `map` if `negativeLodPreserveMap`  
- `transparent` + `opacity` driven by distance fade  
- `depthWrite` true when opacity ≈ 1; careful when fading  

**Custom ShaderMaterial (optional v1.1)** if BasicMaterial fade is too limited:

```glsl
// vertex: standard project
// fragment:
//   vec3 col = uColor * (uUseMap ? texture2D(map, vUv).rgb : vec3(1.0));
//   float fade = smoothstep(uFadeEnd, uFadeStart, vViewZ); // or camera distance uniform
//   gl_FragColor = vec4(col, fade);
// no lights chunk
```

**Recommendation for Threshold v1:** start with **shared `MeshBasicMaterial` pool** keyed by  
`color hex | map uuid | transparent`  
to avoid one material per object. Upgrade to custom shader only if pooling + fade needs it.

### 4.3 Switching mechanics

```
onEnterFlat(mesh):
  if already flat: return
  full = mesh.material  // or materials[]
  stash mesh.userData._negativeLodFullMat = full (clone? NO — keep same instance)
  flat = pool.acquire(from full)
  mesh.material = flat   // or map array
  mesh.castShadow = false (stash previous)
  mesh.userData._negativeLodState = 'flat'

onEnterFull(mesh):
  if already full: return
  mesh.material = stashed full
  restore castShadow
  pool.release(flat) if refcount 0
  mesh.userData._negativeLodState = 'full'
```

**Do not dispose** the full material while flat — only swap references.

**Multi-material meshes:** apply per submesh or treat as single if all share one mat.

---

## 5. Distance check — where it lives

### 5.1 Module: `src/shared/negativeLod.js`

New module `NegativeLod` mirroring `MeshLod` API:

```js
export const NegativeLod = {
  init(),           // load config
  register(root),   // optional: pre-walk and mark
  update(camera),   // called once per frame from engineCore
  setMode(obj, mode), // dynamic 'auto' | 'force-full' | 'force-flat'
  forceFull(obj), forceFlat(obj),
  dispose(obj),
  getStats(),       // fullCount, flatCount, switchesThisFrame
};
```

### 5.2 Engine tick (same place as mesh LOD)

In `engineCore.js` animate loop, **after** camera is final for the frame, alongside:

```js
MeshLod.update(this.camera);
TextureHilod.update(this.camera);
NegativeLod.update(this.camera);  // NEW — after MeshLod preferred
```

**Order rationale:**

1. MeshLod may change which child is visible  
2. NegativeLod should evaluate **visible** meshes (or roots)  
3. TextureHilod can stay independent; far objects with flat unlit can skip HILOD swaps later (opt)

### 5.3 Distance metric

```js
camera.getWorldPosition(camPos);
obj.getWorldPosition(objPos);
dist = camPos.distanceTo(objPos);
// Optional: use bounding sphere radius → dist - radius for large props
```

**Hysteresis:**

```
threshold = userData.negativeLodDistance ?? config.defaultDistance
h = userData.negativeLodHysteresis ?? config.hysteresis

if state === 'full' && dist >= threshold + h → enter flat
if state === 'flat' && dist <= threshold - h → enter full
```

### 5.4 Budget / scheduling

- Cap **material switches** per frame (`maxUpdatesPerFrame`, e.g. 48)  
- Round-robin remaining candidates next frames  
- Skip if `State.isPaused` optional (still OK to update for camera moves while paused)  
- Skip when `isLoadSuspended()` (AI freeze) like MeshLod  

### 5.5 Culling interaction

Objects with `visible === false` or frustum-culled still pay update cost if we iterate all `State.objects`. Optimize:

- Only consider objects with `negativeLOD === true` (maintain a **weak Set** registry on flag set)  
- Or filter: `if (!ud.negativeLOD && !ud._negativeLodState) continue`

---

## 6. Static vs dynamic switching

### 6.1 Static (authoring)

| Source | Behavior |
|--------|----------|
| Inspector / scene dock toggle | Sets `userData.negativeLOD = true` |
| Agent / Compiler codegen | Emits flag on mass props |
| Import defaults | GLTF non-hero props auto-flag on Mobile tier |
| Starter templates | Optional on grid clutter |

Static means **policy is fixed**; distance still **auto-switches** shaders every frame when mode is `auto`.

### 6.2 Dynamic (runtime API)

```js
// Force never go flat (cutscene / inspect / selection)
NegativeLod.setMode(obj, 'force-full');

// Force flat regardless of distance (debug / performance panic)
NegativeLod.setMode(obj, 'force-flat');

// Back to distance-driven
NegativeLod.setMode(obj, 'auto');

// One-shot
NegativeLod.forceFull(obj);
NegativeLod.forceFlat(obj);
```

**Engine hooks that should force-full temporarily:**

- Object selected in EDIT  
- Third Eye highlight target  
- Player body / local avatar  
- Active vehicle seat mesh  
- Screen-space UI world anchors  

**Graphics panic button (optional):**  
`NegativeLod.setGlobalBias(+15)` increases effective distance threshold for all (more objects go flat sooner).

### 6.3 Interaction with MeshLod

| Policy | Behavior |
|--------|----------|
| **Complement (default)** | Mesh LOD still swaps geometry; negativeLOD can also flatten far LOD levels |
| **Skip if mesh LOD active** | Config `skipIfMeshLodActive`: if `lodActive >= 1`, still allow flat (usually want both) |
| **Negative only** | Objects without `_lodScenes` benefit most |

**Recommended default:** allow **both** — far LOD2 mesh **+** flat unlit is the cheapest combo.

### 6.4 Interaction with TextureHilod

When flat and `!preserveMap`, skip TextureHilod map upgrades for that mesh (CPU + GPU win). When returning to full, let HILOD re-apply active tier.

---

## 7. Implementation plan (PRs / steps)

### PR A — Core plumbing (no visual risk)

1. Add `config/negative-lod.json` + import in `lodConfig.js` or `negativeLod.js`  
2. Implement `NegativeLod` registry + hysteresis + stats  
3. Hook `engineCore` tick  
4. Unit-free smoke: `node scripts/negative-lod-verify.cjs` greps API surface  
5. Docs: this file + changelog stub  

### PR B — Material swap + pool

1. Material pool for BasicMaterial  
2. Enter/exit flat with stash of full mat + shadow flags  
3. Fade opacity by normalized distance  
4. Inspector checkbox **Negative LOD** on selected object  
5. Scene JSON round-trip of flags  

### PR C — Dynamic API + policy

1. `setMode` / force APIs on `window.NegativeLod`  
2. Selection / player / vehicle exemptions  
3. Optional auto-enable by graphics tier  
4. SETUP or graphics panel: “Far unlit (negative LOD)” master toggle  
5. Agent prompt note: “set userData.negativeLOD on background props”  

### PR D — Polish

1. Multi-material + skinned mesh tests  
2. InstancedMesh support (floor deck) — optional; harder (shared mat)  
3. Debug overlay: count flat vs full  
4. Benchmark harness (object count vs frame time)  

---

## 8. Expected performance gains

*Directional estimates; measure on device.*

| Scenario | Expected |
|----------|----------|
| 200 static MeshStandard props, mid mobile GPU | **15–40%** GPU time drop when most are beyond threshold |
| Fill-rate bound (many large screenspace footprints far) | High gain from unlit + optional no maps |
| CPU bound (physics/sync) | **Little** gain — negativeLOD is mostly GPU |
| Already MeshLod LOD2 + low tex | Smaller incremental gain (10–20%) |
| Few objects / desktop ultra | Negligible; keep for battery/mobile tiers |

**Why it helps Three.js specifically:**

- Standard materials pull large shader chunks (lights, env, shadows)  
- BasicMaterial fragment is tiny → better batching if materials pooled  
- Disabling `castShadow` while flat reduces shadow map casters  

---

## 9. Visual quality loss (honest)

| Lose | When |
|------|------|
| Specular highlights / metal | Flat |
| Environment reflections | Flat |
| Normal-map detail | Flat (v1) |
| Soft shadow on the object | If receiveShadow ignored in unlit |
| Soft shadow **from** the object | If castShadow disabled while flat |
| Smooth material continuity | Hard or faded pop at threshold (hysteresis mitigates thrash, not pop) |
| Weather wetness / shader graphs | Flat path ignores them until full restore |

**Acceptable when:** object is small on screen (far).  
**Not for:** hero props, player, inspect focus, reflective vehicles in mid-range.

---

## 10. Downsides & mitigations

| Downside | Mitigation |
|----------|------------|
| Popping at threshold | Hysteresis + short opacity crossfade (1–2 frames or distance smoothstep) |
| Material thrash / GC | Pool BasicMaterials; never dispose full mat |
| Breaks custom `onBeforeCompile` materials | Detect `userData.shaderGraph` / custom flag → exempt or rebuild carefully |
| Multiplayer desync of visual state | Only sync **flags**, not `_negativeLodState` — each client evaluates camera-local |
| Skinned meshes / shared materials | Clone material on first flat enter if `material.userData.shared` |
| Transparent sorting artifacts when fading | Fade only when `negativeLodFade` and beyond threshold; keep opaque until then |
| Debug confusion (“why is my metal grey?”) | Inspector shows state FULL/FLAT + distance |
| Over-eager auto-enable | Tier allowlist + exclude heroes/floor/player |

---

## 11. Clean / efficient design rules

1. **Registry Set** of roots with `negativeLOD` — O(k) not O(all objects)  
2. **No per-frame allocations** (reuse Vector3 like MeshLod)  
3. **Shared flat materials** by color key  
4. **Camera-local only** — do not network flat/full state  
5. **Complement mesh LOD**, do not replace authoring of hero LODs  
6. **One module** owns all swaps — no ad-hoc mat swaps elsewhere  
7. **Feature flag** `config.enabled` + graphics master toggle for instant off  

---

## 12. API sketch (public)

```js
// window.NegativeLod
NegativeLod.enableObject(obj, { distance = 40, fade = true } = {})
NegativeLod.disableObject(obj)          // restore full, clear flag
NegativeLod.setMode(obj, 'auto'|'force-full'|'force-flat')
NegativeLod.update(camera)
NegativeLod.getStats() // { registered, flat, full, switches }
```

Compiler / agents:

```js
obj.userData.negativeLOD = true;
obj.userData.negativeLodDistance = 45;
```

---

## 13. Test plan

| Test | Expect |
|------|--------|
| Flag false | Never flat |
| Flag true, walk away | Flat past threshold+h |
| Walk back | Full below threshold−h |
| force-full while far | Stays PBR |
| Select object | force-full while selected |
| Save/load scene | Flag persists; state recomputed |
| Guest MP | Each client independent shading |
| AI freeze | update no-ops or safe |
| 500 boxes stress | Frame time improves when far; no GC spikes |

---

## 14. File touch list (implementation)

| File | Change |
|------|--------|
| `config/negative-lod.json` | New defaults |
| `src/shared/negativeLod.js` | **New** core |
| `src/engine/engineCore.js` | `NegativeLod.update` in tick |
| `src/engine/ui.js` or inspector | Checkbox + distance |
| `src/engine/world.js` / createObject | Optional auto flag |
| `src/shared/sync.js` / scene IO | Persist flags |
| `src/shared/agentPrompts.js` | Hint for background props |
| `scripts/negative-lod-verify.cjs` | Smoke |
| `docs/NEGATIVE_LOD.md` | This design |
| `docs/CAPABILITIES.md` / CHANGELOG | When shipping |

---

## 15. Success criteria

1. Any mesh with `userData.negativeLOD === true` uses unlit far path without second GLB.  
2. No material thrash (stable full/flat with hysteresis).  
3. Measurable GPU win on mobile/compatibility tier with dense prop scenes.  
4. Heroes/player/selection never stuck flat unintentionally.  
5. Works alongside MeshLod + TextureHilod without double-dispose bugs.  

---

## 16. Implementation phases (summary)

| Phase | Deliverable | Effort |
|-------|-------------|--------|
| **A** | Module + tick + config + verify script | S |
| **B** | Material pool + inspector + serialize | M |
| **C** | Dynamic modes + exemptions + tier auto | M |
| **D** | Fade polish, stats HUD, benchmarks | S–M |

**Suggested order:** A → B → C → D. Do not block on custom GLSL until BasicMaterial path is proven.

---

## 17. Decision log (defaults)

| Decision | Choice | Why |
|----------|--------|-----|
| Property name | `negativeLOD` | User-specified; clear “invert of detail” |
| Far material | MeshBasicMaterial pool | Zero custom shader risk in v1 |
| Distance default | 40 m | Beyond mesh LOD 28 m mid tier |
| Hysteresis | 4 m | Stops boundary flicker |
| Network state | Not synced | Camera-local optimization |
| Relation to mesh LOD | Complementary | Best of both |

---

*End of design. Next step when approved: implement Phase A+B in the Threshold engine.*
