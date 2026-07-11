# Negative LOD — Design & Implementation Plan

**Status:** Phase **A+B implemented** (10.13.0) · E0–E2+ planned below  
**Target version:** 10.13.x  
**Live engine version:** 10.13.0+  
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

---

## 18. Off-screen elimination (not on camera)

**Yes — we should plan this.** Three.js already **skips drawing** frustum-culled meshes, but Threshold still runs **JS systems** on every `State.objects` entry every frame (`MeshLod`, `TextureHilod`, idle anim, spin, weather hooks, etc.). Off-screen work is pure waste when the result is not visible and not needed for gameplay.

### 18.1 Visibility classes (interest tiers)

Compute once per object per frame (or amortized), store on `userData._vis`:

| Class | Definition | Policy |
|-------|------------|--------|
| **A — Focus** | Selected, player, driven vehicle, interact target | Full everything |
| **B — On-screen near** | In frustum + dist < negativeLodDistance | Full PBR (+ mesh/tex LOD) |
| **C — On-screen far** | In frustum + dist ≥ threshold | **negativeLOD flat** |
| **D — Off-screen near** | Outside frustum, dist < sleepDist | No draw (Three); light JS (physics if dynamic) |
| **E — Off-screen far / culled** | Outside frustum + far, or always-out | **Max elimination** |

```
on-screen? ──no──► off-screen branch
    │                    │
    yes                  ├─ near → keep physics if dynamic; skip mat swaps / HILOD / idle
    │                    └─ far  → sleep physics; skip almost all per-object ticks
    │
    ├─ near → full PBR
    └─ far  → negativeLOD flat
```

### 18.2 Frustum test (efficient)

```js
// Once per frame in NegativeLod.update or VisibilitySystem.update
_projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
_frustum.setFromProjectionMatrix(_projScreenMatrix);

// Prefer bounding sphere (cheap):
sphere.center.copy(obj world pos); sphere.radius = ud._bsRadius || estimate;
inView = _frustum.intersectsSphere(sphere);
```

- Cache `_bsRadius` on register / geometry change  
- Hysteresis: require **N frames** off-screen before demoting to E (avoid edge flicker)  
- Optional margin: expand frustum slightly so objects entering view aren’t one frame late  

**Module:** either fold into `negativeLod.js` as `Visibility` helpers, or `src/shared/visibilitySystem.js` that **feeds** NegativeLod / MeshLod / others.

### 18.3 What to skip when off-screen

| System | Off-screen near (D) | Off-screen far (E) |
|--------|---------------------|---------------------|
| **GPU draw** | Already culled by Three | Same |
| **negativeLOD mat swap** | Optional stay flat or freeze last state | Freeze; no further swaps |
| **MeshLod.update** | Skip or 5–10 Hz | Skip |
| **TextureHilod.update** | Skip | Skip |
| **HumanMesh.updateIdle** | Skip | Skip |
| **userData.isRotating spin** | Skip | Skip |
| **Shader graphs / weather mat pass** | Skip | Skip |
| **castShadow** | Can disable | Disable |
| **Physics body** | Keep if dynamic gameplay | **Sleep** / low freq if static or far |
| **NPC patrol** | Slow tick | Pause until on-screen |
| **Audio spatialize** | Attenuate / pause if inaudible | Pause |
| **Network remote avatar anim** | Low-rate pose | Snapshot only |

### 18.4 Properties (extend negative LOD flags)

```js
userData.negativeLOD = true;
userData.culledSleep = true;           // allow off-screen far sleep (default true if negativeLOD)
userData.alwaysProcess = false;        // force A-class (player, important triggers)
userData.offscreenSleepDistance = 60;  // meters; default from config
```

Config additions:

```json
{
  "offscreen": {
    "enabled": true,
    "frameHysteresis": 8,
    "sleepDistance": 60,
    "skipLodWhenOffscreen": true,
    "sleepPhysicsWhenFar": true,
    "frustumMargin": 0.05
  }
}
```

---

## 19. Elimination by “known linear” / deterministic skip

**Principle:** If a computation’s output **cannot change what the user sees, hears, or simulates this frame**, do not run it. Prefer **branch on known invariants** over always-on loops.

### 19.1 Categories of skippable work in Threshold

| Domain | Linear / known-skip condition | Elimination |
|--------|------------------------------|-------------|
| **Render materials** | Off-screen OR far + negativeLOD | Unlit / no swap / no HILOD |
| **Mesh LOD** | Off-screen OR single-level chain | Skip `MeshLod.update` entry |
| **Texture HILOD** | Off-screen OR flat unlit without map | Skip `TextureHilod` |
| **Idle / spin anim** | Off-screen OR paused OR EDIT freeze | Skip per-object anim loops |
| **Shadow map casters** | Off-screen far OR flat | `castShadow = false` |
| **Physics** | Static body + never moved | Already cheap; **sleep** dynamic far-offscreen |
| **Physics island** | Body sleeping + no contact | Cannon sleep (ensure enabled) |
| **Water / env** | No water meshes / not in view | Early-out `updateWater` |
| **Weather full-scene mat walk** | No active weather or only on-screen list | Iterate **registry of weather-affected** only |
| **VOIP / audio** | Listener far + source silent | Don’t spatialize; don’t decode |
| **Agent hub tick** | No agents / queue empty | Early return (already mostly true) |
| **Third Eye** | Mode off | No highlight passes |
| **Sync broadcast** | No dirty objects | Already scheduled; tighten dirty flags |
| **Remote players** | Off-screen + far | Lower interp rate; hide mesh |
| **Compiler / AI** | Not running | No freeze path |
| **UI hint strings** | Throttle | Update every N frames (already partial) |

### 19.2 “Linear” pipelines worth short-circuiting

These are **predictable multi-step costs** where early exit is free:

1. **LOD stack** — if off-screen → skip mesh + tex + negative evaluation beyond “class E” stamp  
2. **PBR apply** — if flat → never re-run `finishMaterial` / env intensity  
3. **GLTF traverse** — cache mesh lists at load; never re-traverse full tree per frame  
4. **Shadow list** — maintain `shadowCasters[]` active set; remove when E-class  
5. **Postprocess** — if no bloom targets / no damage FX, skip composer passes (graphics tier already partial)  
6. **MP FULL_STATE** — guests only apply delta when version changes (existing pattern; ensure dirty bits)

### 19.3 Proposed `VisibilitySystem` (single owner)

```text
VisibilitySystem.update(camera):
  for obj in registry (or dirty spatial set):
    dist = ...
    inFrustum = ...
    class = classify(dist, inFrustum, flags)
    if class != obj.userData._visClass:
      obj.userData._visClass = class
      applyClassTransition(obj, class)  // shadows, sleep, force mat mode

NegativeLod.update: only classes B/C (on-screen)
MeshLod.update: only A/B/C (and maybe D at low rate)
TextureHilod.update: only A/B
Anim/spin: only A/B/C
```

One classification → many systems read `_visClass` — **no repeated frustum math**.

### 19.4 Spatial acceleration (later phase)

When object counts > ~200:

- Grid or bucket by world cell  
- Only test objects in cells near camera + all dynamic  
- Static world: reclassify on camera cell change, not every object every frame  

### 19.5 Correctness rules (do not skip)

Never eliminate solely for performance when:

- **Gameplay collision** still needed (projectiles, interact volumes) — use physics layers / larger cheap colliders  
- **Audio one-shots** that must fire on timers  
- **Network authority** simulation on host for gameplay-critical actors  
- **Selected object** in EDIT  

Use `alwaysProcess` / class **A** for those.

---

## 20. Combined state machine (distance × screen)

```
                 on-screen                off-screen
              ┌─────────────┐          ┌──────────────┐
near          │ FULL PBR    │          │ LIGHT JS     │
              │ mesh/tex LOD│          │ physics ok   │
              │ anim on     │          │ no HILOD     │
              └─────────────┘          └──────────────┘
far           │ FLAT unlit  │          │ SLEEP        │
              │ negativeLOD │          │ no lod/anim  │
              │ no shadows  │          │ physics sleep│
              └─────────────┘          └──────────────┘
```

**Priority of policies:**  
`force-full` / selection → A  
else `force-flat` → flat if on-screen else sleep  
else auto matrix above  

---

## 21. Implementation plan add-on (phases)

| Phase | Scope | Status |
|-------|--------|--------|
| **A–B** | On-screen negativeLOD, pool, inspector, serialize | **Done (10.13.0)** |
| **E0** | `VisibilitySystem`: frustum + dist → `_visClass` | Next |
| **E1** | Gate MeshLod / TextureHilod / idle / spin on class | After E0 |
| **E2** | Off-screen far: shadow off + optional Cannon sleep | After E1 |
| **E3** | Weather/shader registry only visits on-screen | Later |
| **E4** | Spatial buckets if needed | Later |

**Effort:** E0–E1 are high leverage, small code, low risk. Do next after A+B.

### Follow-on outline (E0 → E2+)

**E0 — VisibilitySystem** (`src/shared/visibilitySystem.js`)
- One frustum + distance pass per frame (or amortized)
- Write `userData._visClass` ∈ `A|B|C|D|E` (focus / on-near / on-far / off-near / off-far)
- Frustum margin + N-frame hysteresis
- NegativeLod reads class: only B/C need distance mat logic; D/E freeze last state

**E1 — Gate existing ticks**
- `MeshLod.update` / `TextureHilod.update`: skip D/E (optional slow tick D)
- `HumanMesh.updateIdle` + `isRotating` loop: A/B/C only
- Wire from `engineCore` after `VisibilitySystem.update`

**E2 — Sleep**
- E-class: `castShadow=false`, Cannon body sleep if `culledSleep` and not gameplay-critical
- Never sleep player / projectiles / `alwaysProcess`

**E3–E4** — Weather registry + spatial grid (see §19)

```text
A+B (done) → E0 → E1 → E2 → (measure) → E3/E4 if object counts demand it
```

---

## 22. Expected extra gains (off-screen + linear skip)

| Scene | Extra beyond far-flat alone |
|-------|-----------------------------|
| Dense props, camera looking at one corner | Large CPU win (skip HILOD/anim on majority) |
| Open field, everything in view | Mostly GPU win from flat only |
| MP many remote avatars behind you | Big: freeze remote anim/interp |

---

## 23. Downsides of off-screen elimination

| Risk | Mitigation |
|------|------------|
| Pop-in when turning camera | Frustum margin + 1–2 frame delay before full restore |
| Physics tunnel if slept colliders | Don’t sleep dynamics with active gameplay tags |
| Host sim vs guest view mismatch | Host keeps sim class A for critical; visual-only sleep on clients |
| Debugging “why didn’t X update?” | Stats: counts per class; `alwaysProcess` debug flag |

---

*End of design. Next step when approved: implement Phase A+B (on-screen flat), then E0–E1 (visibility gate) as the high-ROI elimination layer.*
