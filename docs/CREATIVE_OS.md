# Threshold Creative OS

**North star:** Plan everything before generation. Creators design games; the tool makes pieces fall into place — not AI slop dumped into a blank chat.

**Version:** 10.12.7 · **Live:** https://medicinalsheep.github.io/threshold/

---

## Principle: directed creation

| Anti-pattern | Creative OS |
|--------------|---------------|
| "Make me a game" → random meshes | Intake → production review → ordered pipeline → codegen |
| CanvasTexture noise floors | GIMP 2K PBR → HILOD → WebP |
| Rain on everything | Placement + weather exposure + per-surface hooks |
| One-shot giant script | Multi-step build job (collision → textures → weather → atmosphere → shaders) |
| Ship without checks | Generation gate + export preflight slop scan |

---

## Pipeline (11 steps)

Every asset — world, prop, character, texture, sound — follows the same ordered plan in `assetProductionPlan.js`:

1. **Scope & placement** — interior / exterior / transitional / floating
2. **Collision & physics** — static, dynamic, trigger, visual-only
3. **Mesh / GLB** — Blender export or procedural primitive; poly budget
4. **PBR textures (master)** — 2K+ albedo, roughness, normal; object name = manifest slot
5. **HILOD + compression** — `_1k` / `_2k` PNG + WebP via `textures:watch`
6. **Weather hooks** — `surfaceType`, wet/dust/snow/wet-glass variants
7. **Atmosphere & lighting** — time of day, fog, audio zones
8. **Material presets** — `MaterialPresets.applyMaterialPreset` — tuned PBR, no slop
9. **Interact & audio** — F-key, sound triggers, ambient zones
10. **Compiler script** — IIFE extending grid; userData wired
11. **PLAY verify** — walk test, weather ON, export preflight

Agents receive the full plan block via Portal, SETUP, PromptGen, and build job step prompts.

---

## Generation gates

### Agent Portal

Chat intake asks placement, weather, collision, workflow **before** emitting `ready` JSON. **GENERATE** calls `validateProductionReady` — blocks if type, title, or placement missing.

### SETUP design brief

Step 1 type → Step 2 details → **Step 3 production review** → review → RUN AGENT. `validateDesignBrief` blocks codegen until Step 3 complete.

### Export preflight

`assessSceneSlop` scans the live scene for:

- CanvasTexture procedural maps
- Walk surfaces without `surfaceType`
- Exterior meshes without weather hooks
- Objects lacking `materialPreset` or GIMP textures

---

## Immersive capabilities (today)

| System | Runtime | Agent wiring |
|--------|---------|--------------|
| **Rain wetness** | `WeatherSystem` roughness lerp on concrete/asphalt | `surfaceType` |
| **Wet glass** | transmission + roughness lerp | `userData.wetGlass` |
| **Dust wear** | dry roughness + albedo mute when rain low | `userData.dustExposure` |
| **Snow cap** | roughness up + albedo toward white | `userData.snowCap` |
| **Sheltered interiors** | reduced rain stress | `userData.zoneSheltered` |
| **Marquee dampen** | emissive reduction in rain | `userData.weatherMarquee` |
| **Atmosphere** | `Environment.setTimeOfDay`, `setFog` | atmosphere preset in brief |
| **Material presets** | `materialPresets.js` registry | `userData.materialPreset` |
| **Shader hooks** | `shaderRegistry.js` CPU tick effects | `userData.shaderHook` |
| **Shader graphs** | `shaderNodeGraph.js` GPU node presets | `userData.shaderGraph` |
| **Audio zones** | `audioZoneSystem.js` spatial loops | `userData.audioZone` |

Registry: `IMMERSIVE_CAPABILITIES` in `assetProductionPlan.js`.

---

## Material / shader presets

`materialPresets.js` ships tuned `MeshStandardMaterial` profiles:

- `pbr_default`, `pbr_concrete_weathered`, `pbr_asphalt_wet`
- `pbr_wood_snow`, `pbr_metal_brushed`, `pbr_glass_wet`
- `pbr_emissive_marquee`, `pbr_fabric_muted`, `pbr_stylized_toon`

Agents call `MaterialPresets.applyMaterialPreset(mesh, id)` — presets auto-wire weather hooks (`dustExposure`, `snowCap`, `wetGlass`).

**Runtime hooks:** `wet_surface_boost`, `emissive_pulse`, `dust_overlay`, `snow_freshen`, `heat_shimmer` — no raw GLSL eval.

**Graph presets:** `wet_hero`, `storm_exterior`, `neon_rim`, `wind_foliage`, `glass_rim` — whitelist nodes only.

**Export:** wizard IMMERSIVE step previews weather + zones + shaders before REVIEW.

**Guest replay:** `ImmersiveReplay.reapplyFromState` on JOIN / `?world=` load — weather + zones + shaders restore from `Sync.immersive`.

---

## Creator journey

```
LOBBY → ENTER blank grid
  ↓
AI Portal OR SETUP brief
  ↓
Production review (placement, weather, atmosphere, shaders)
  ↓
GENERATE / RUN AGENT (gated)
  ↓
Multi-step build OR single Compiler IIFE
  ↓
GIMP watch / Blender insert
  ↓
PLAY — weather, footsteps, atmosphere
  ↓
Export preflight — slop scan → ship
```

---

## What's next

| Phase | Focus |
|-------|-------|
| **10.13** | Trellis / Veo-class model gates when registry entries ship |
| **10.13** | Trellis / Veo-class model gates when registry entries ship |
| **Future** | Trellis mesh gen, Veo cutscenes — listed in capability registry, gated when ready |

See [ROADMAP.md](ROADMAP.md) · [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) · [UI_AND_AGENTS.md](UI_AND_AGENTS.md)