# Starter materials & textures

Quality-first PBR library for builders and agents — **presets + procedural starter maps**, not CanvasTexture noise.

**Live:** open Engine → **INSERT → MATERIAL LIBRARY EXAMPLES** · or EDIT object → **Texture → Preset**.

---

## Quick start

```bash
# Regenerate starter maps (2K + HILOD + WebP) into textures/ + public/bundle/textures/
npm run textures:gen:default

# Optional: pack into Pages bundle
npm run bundle:assets
```

In Engine (EDIT mode):

1. **INSERT → MATERIAL LIBRARY EXAMPLES** — gallery rows = categories (all ~25 presets)  
2. **INSERT → MAPPED MATERIALS** — only presets with starter PBR maps (wood/brick/…)  
3. Select a sample → **Texture** tab → change **Preset** (maps re-wire when name matches)  
4. **GIMP SYNC** or ALBEDO/ROUGH/METAL/NORMAL to override with your maps  
5. Agents: `await MaterialLibrary.applyWithMaps(mesh, 'pbr_wood_snow')`

---

## Architecture

| Piece | Role |
|-------|------|
| `src/shared/materialPresets.js` | Preset catalog + `applyMaterialPreset` |
| `src/shared/materialLibrary.js` | UI, `spawnExamples()`, map wiring |
| `config/default-textures.json` | Procedural asset list for `textures:gen:default` |
| `config/starter-textures.json` | UV finish + object name aliases |
| `textures/threshold_manifest.json` | GIMP-compatible slot manifest |
| `public/bundle/textures/` | Pages runtime assets |

---

## Preset categories

| Category | Examples |
|----------|----------|
| **core** | `pbr_default` |
| **exterior** | concrete, asphalt, brick, dirt, grass, gravel, wood |
| **metal** | brushed, painted, copper, chrome |
| **interior** | plaster, ceramic tile |
| **props** | matte/gloss plastic, rubber, fabric, leather, cardboard |
| **glass** | wet glass, clear glass |
| **light** | marquee, neon cyan |
| **stylized** | toon (only when brief asks) |

Full ids: `MaterialPresets.MATERIAL_PRESETS` or SETUP agents prompt block.

---

## Starter map object names

Wire maps by naming the mesh (or using presets that set `textureObjectName`):

| Name | Style |
|------|--------|
| Starter Ground | concrete |
| AI Build Station | terminal |
| Mat Wood | wood |
| Mat Asphalt | asphalt |
| Mat Brick | brick |
| Mat Dirt | dirt |
| Mat Grass | grass |
| Mat Metal | metal_grate |
| Mat Copper | copper |
| Mat Plaster | wall |
| Mat Fabric | fabric |
| Mat Gravel | gravel |

---

## Agent / Compiler rules

```js
// Good
const m = World.createObject('cube', 'Mat Brick', 0x8c4838, false);
MaterialPresets.applyMaterialPreset(m, 'pbr_brick_aged');
// or
await MaterialLibrary.applyWithMaps(m, 'pbr_wood_snow');

// Bad
new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(...) });
```

- Prefer **MaterialPresets** + GIMP / starter maps  
- Set `userData.surfaceType` for footsteps / weather  
- Export preflight flags objects missing `materialPreset` and textures  

---

## API

```js
MaterialPresets.applyMaterialPreset(mesh, 'pbr_metal_brushed');
MaterialLibrary.list('exterior');
MaterialLibrary.spawnExamples({ category: 'metal' });
MaterialLibrary.clearExamples();
await MaterialLibrary.applyWithMaps(mesh, 'pbr_concrete_weathered');
```

---

## Related

- [GIMP_TEXTURES.md](GIMP_TEXTURES.md) — live SYNC workflow  
- [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md) — HILOD / codecs  
- [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md)  
- [BUILD_FROM.md](BUILD_FROM.md)  
