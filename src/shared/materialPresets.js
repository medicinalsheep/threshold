/**
 * Material & shader preset registry — agent-directed PBR without CanvasTexture slop.
 * Starter library pairs presets with procedural maps from config/default-textures.json.
 */

/** @typedef {{ id: string, label: string, category?: string, color?: number, roughness?: number, metalness?: number, envMapIntensity?: number, emissive?: number, emissiveIntensity?: number, transparent?: boolean, opacity?: number, transmission?: number, surfaceType?: string, weather?: string[], agentHint?: string, textureObjectName?: string, exampleMesh?: string }} MaterialPreset */

/** @type {MaterialPreset[]} */
export const MATERIAL_PRESETS = [
    // ── Core / exterior ──────────────────────────────────────────
    {
        id: 'pbr_default',
        label: 'Realistic PBR (default)',
        category: 'core',
        color: 0xc8c8c8,
        roughness: 0.52,
        metalness: 0.08,
        envMapIntensity: 0.42,
        weather: ['wet'],
        agentHint: 'Default hero surfaces — pair with GIMP 2K maps.',
        exampleMesh: 'sphere',
    },
    {
        id: 'pbr_concrete_weathered',
        label: 'Weathered concrete',
        category: 'exterior',
        color: 0x6e7278,
        roughness: 0.88,
        metalness: 0.02,
        envMapIntensity: 0.22,
        surfaceType: 'concrete',
        weather: ['wet', 'dust'],
        dustExposure: 0.85,
        textureObjectName: 'Starter Ground',
        agentHint: 'Exterior pads, plazas — set userData.dustExposure.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_asphalt_wet',
        label: 'Asphalt (rain-ready)',
        category: 'exterior',
        color: 0x2a2a2e,
        roughness: 0.94,
        metalness: 0.01,
        envMapIntensity: 0.16,
        surfaceType: 'asphalt',
        weather: ['wet'],
        textureObjectName: 'Mat Asphalt',
        agentHint: 'Roads, lots — surfaceType asphalt for Footsteps + rain lerp.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_brick_aged',
        label: 'Aged brick',
        category: 'exterior',
        color: 0x8c4838,
        roughness: 0.86,
        metalness: 0.02,
        envMapIntensity: 0.26,
        surfaceType: 'concrete',
        weather: ['wet', 'dust'],
        dustExposure: 0.55,
        textureObjectName: 'Mat Brick',
        agentHint: 'Walls, warehouses — pair with brick maps.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_dirt_packed',
        label: 'Packed dirt',
        category: 'exterior',
        color: 0x6b4a2e,
        roughness: 0.9,
        metalness: 0,
        envMapIntensity: 0.2,
        surfaceType: 'dirt',
        weather: ['wet', 'dust'],
        dustExposure: 1,
        textureObjectName: 'Mat Dirt',
        agentHint: 'Paths, yards — dust + wet darken albedo.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_grass_dry',
        label: 'Dry grass / turf',
        category: 'exterior',
        color: 0x4a7a3c,
        roughness: 0.92,
        metalness: 0,
        envMapIntensity: 0.18,
        surfaceType: 'grass',
        weather: ['dust'],
        textureObjectName: 'Mat Grass',
        agentHint: 'Lawns, parks — poly low planes.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_gravel_loose',
        label: 'Loose gravel',
        category: 'exterior',
        color: 0x8a857c,
        roughness: 0.96,
        metalness: 0.02,
        envMapIntensity: 0.2,
        surfaceType: 'gravel',
        weather: ['wet', 'dust'],
        textureObjectName: 'Mat Gravel',
        agentHint: 'Driveways, beds — high normal scale.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_wood_snow',
        label: 'Wood deck (snow-cap)',
        category: 'exterior',
        color: 0x8b5a2b,
        roughness: 0.82,
        metalness: 0.03,
        envMapIntensity: 0.28,
        surfaceType: 'wood',
        weather: ['wet', 'snow'],
        snowCap: 0.6,
        textureObjectName: 'Mat Wood',
        agentHint: 'Porches, docks — userData.snowCap for accumulation pass.',
        exampleMesh: 'cube',
    },
    // ── Metal / industrial ───────────────────────────────────────
    {
        id: 'pbr_metal_brushed',
        label: 'Brushed metal',
        category: 'metal',
        color: 0x9aa0a8,
        roughness: 0.38,
        metalness: 0.72,
        envMapIntensity: 0.55,
        surfaceType: 'metal',
        weather: ['wet'],
        textureObjectName: 'Mat Metal',
        agentHint: 'Rails, beams — rain darkens roughness slightly.',
        exampleMesh: 'sphere',
    },
    {
        id: 'pbr_metal_painted',
        label: 'Painted metal panel',
        category: 'metal',
        color: 0x3d6ea8,
        roughness: 0.48,
        metalness: 0.35,
        envMapIntensity: 0.4,
        surfaceType: 'metal',
        weather: ['wet'],
        agentHint: 'Doors, machines — color is the paint layer.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_copper_aged',
        label: 'Aged copper',
        category: 'metal',
        color: 0xb8623e,
        roughness: 0.42,
        metalness: 0.78,
        envMapIntensity: 0.5,
        surfaceType: 'metal',
        weather: ['wet'],
        textureObjectName: 'Mat Copper',
        agentHint: 'Roofs, statues — patina in maps.',
        exampleMesh: 'sphere',
    },
    {
        id: 'pbr_chrome_clean',
        label: 'Chrome / mirror metal',
        category: 'metal',
        color: 0xe8ecf0,
        roughness: 0.12,
        metalness: 0.95,
        envMapIntensity: 0.85,
        surfaceType: 'metal',
        weather: ['wet'],
        agentHint: 'High env reflection — keep mesh count low on Lite.',
        exampleMesh: 'sphere',
    },
    // ── Interior / props ─────────────────────────────────────────
    {
        id: 'pbr_plaster_interior',
        label: 'Interior plaster',
        category: 'interior',
        color: 0xd8d2c6,
        roughness: 0.78,
        metalness: 0,
        envMapIntensity: 0.32,
        surfaceType: 'concrete',
        weather: [],
        textureObjectName: 'Mat Plaster',
        agentHint: 'Interior walls — soft lighting.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_plastic_matte',
        label: 'Matte plastic',
        category: 'props',
        color: 0xe85a4a,
        roughness: 0.72,
        metalness: 0.05,
        envMapIntensity: 0.28,
        surfaceType: 'plastic',
        weather: ['dust'],
        agentHint: 'Toys, shells — saturated albedo, low metal.',
        exampleMesh: 'sphere',
    },
    {
        id: 'pbr_plastic_gloss',
        label: 'Gloss plastic',
        category: 'props',
        color: 0x3a8fd6,
        roughness: 0.22,
        metalness: 0.08,
        envMapIntensity: 0.45,
        surfaceType: 'plastic',
        weather: [],
        agentHint: 'Shiny props — watch Lite bloom cost.',
        exampleMesh: 'sphere',
    },
    {
        id: 'pbr_rubber_tire',
        label: 'Rubber / tire',
        category: 'props',
        color: 0x1a1a1c,
        roughness: 0.97,
        metalness: 0,
        envMapIntensity: 0.12,
        surfaceType: 'rubber',
        weather: ['wet'],
        agentHint: 'Tires, mats — very high roughness.',
        exampleMesh: 'torus',
    },
    {
        id: 'pbr_ceramic_tile',
        label: 'Ceramic tile',
        category: 'interior',
        color: 0xece8e0,
        roughness: 0.28,
        metalness: 0.04,
        envMapIntensity: 0.48,
        surfaceType: 'tile',
        weather: ['wet'],
        agentHint: 'Bathrooms, kitchens — wet darkens slightly.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_fabric_muted',
        label: 'Fabric / canvas awning',
        category: 'props',
        color: 0x586878,
        roughness: 0.92,
        metalness: 0,
        envMapIntensity: 0.18,
        surfaceType: 'fabric',
        weather: ['dust'],
        dustExposure: 0.7,
        textureObjectName: 'Mat Fabric',
        agentHint: 'Awnings, tarps — dust pass mutes albedo.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_leather_soft',
        label: 'Soft leather',
        category: 'props',
        color: 0x5c3a28,
        roughness: 0.68,
        metalness: 0.04,
        envMapIntensity: 0.3,
        surfaceType: 'leather',
        weather: [],
        agentHint: 'Seats, bags — warm albedo.',
        exampleMesh: 'sphere',
    },
    {
        id: 'pbr_cardboard',
        label: 'Cardboard / paper',
        category: 'props',
        color: 0xc4a574,
        roughness: 0.9,
        metalness: 0,
        envMapIntensity: 0.2,
        surfaceType: 'wood',
        weather: ['wet'],
        agentHint: 'Boxes, props — softens when wet.',
        exampleMesh: 'cube',
    },
    // ── Glass / light ────────────────────────────────────────────
    {
        id: 'pbr_glass_wet',
        label: 'Wet glass / window',
        category: 'glass',
        color: 0xc8e0f0,
        roughness: 0.06,
        metalness: 0,
        envMapIntensity: 0.65,
        transparent: true,
        opacity: 0.88,
        transmission: 0.78,
        surfaceType: 'glass',
        weather: ['wet_glass'],
        wetGlass: true,
        agentHint: 'userData.wetGlass = true — transmission + roughness lerp in rain.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_glass_clear',
        label: 'Clear glass',
        category: 'glass',
        color: 0xe8f4fc,
        roughness: 0.04,
        metalness: 0,
        envMapIntensity: 0.7,
        transparent: true,
        opacity: 0.35,
        transmission: 0.9,
        surfaceType: 'glass',
        weather: ['wet_glass'],
        wetGlass: true,
        agentHint: 'Storefronts — keep draw call count low.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_emissive_marquee',
        label: 'Emissive sign / marquee',
        category: 'light',
        color: 0x222228,
        roughness: 0.45,
        metalness: 0.2,
        emissive: 0xffaa44,
        emissiveIntensity: 1.2,
        weather: ['wet'],
        weatherMarquee: true,
        agentHint: 'userData.weatherMarquee — rain dampens emissive glow.',
        exampleMesh: 'cube',
    },
    {
        id: 'pbr_emissive_neon_cyan',
        label: 'Neon cyan',
        category: 'light',
        color: 0x111820,
        roughness: 0.35,
        metalness: 0.15,
        emissive: 0x22e0ff,
        emissiveIntensity: 1.6,
        weather: ['wet'],
        weatherMarquee: true,
        agentHint: 'Accent lights — E5 bloom may skip if off-screen.',
        exampleMesh: 'torus',
    },
    {
        id: 'pbr_stylized_toon',
        label: 'Stylized (high rough, low metal)',
        category: 'stylized',
        color: 0x66aa88,
        roughness: 0.95,
        metalness: 0,
        envMapIntensity: 0.12,
        weather: [],
        agentHint: 'Only when brief style=stylized — still use GIMP maps, not procedural noise.',
        exampleMesh: 'sphere',
    },
];

export const MATERIAL_CATEGORIES = [
    { id: 'core', label: 'Core' },
    { id: 'exterior', label: 'Exterior' },
    { id: 'metal', label: 'Metal' },
    { id: 'interior', label: 'Interior' },
    { id: 'props', label: 'Props' },
    { id: 'glass', label: 'Glass' },
    { id: 'light', label: 'Light' },
    { id: 'stylized', label: 'Stylized' },
];

export function getPresetById(id) {
    return MATERIAL_PRESETS.find((p) => p.id === id) || MATERIAL_PRESETS[0];
}

export function listPresetsByCategory(category) {
    if (!category || category === 'all') return MATERIAL_PRESETS.slice();
    return MATERIAL_PRESETS.filter((p) => p.category === category);
}

export function applyMaterialPreset(mesh, presetId) {
    if (!mesh?.material) return null;
    const preset = getPresetById(presetId);
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
        if (!m) return;
        if (preset.color != null && m.color?.setHex) m.color.setHex(preset.color);
        if (preset.roughness != null) m.roughness = preset.roughness;
        if (preset.metalness != null) m.metalness = preset.metalness;
        if (preset.envMapIntensity != null) m.envMapIntensity = preset.envMapIntensity;
        if (preset.emissive != null) m.emissive?.setHex?.(preset.emissive);
        if (preset.emissiveIntensity != null) m.emissiveIntensity = preset.emissiveIntensity;
        if (preset.transparent) m.transparent = true;
        if (preset.opacity != null) m.opacity = preset.opacity;
        if (preset.transmission != null && 'transmission' in m) m.transmission = preset.transmission;
        m.needsUpdate = true;
    });
    mesh.userData = mesh.userData || {};
    mesh.userData.materialPreset = preset.id;
    if (preset.surfaceType) mesh.userData.surfaceType = preset.surfaceType;
    // Do not clobber custom names — MaterialLibrary.applyWithMaps sets name for map bind
    if (preset.textureObjectName && !mesh.userData.name) {
        mesh.userData.name = preset.textureObjectName;
    }
    if (preset.wetGlass) mesh.userData.wetGlass = true;
    if (preset.weatherMarquee) mesh.userData.weatherMarquee = true;
    if (preset.dustExposure != null) mesh.userData.dustExposure = preset.dustExposure;
    if (preset.snowCap != null) mesh.userData.snowCap = preset.snowCap;
    window.WeatherSystem?.registerMesh?.(mesh);
    const hookMap = {
        pbr_concrete_weathered: 'dust_overlay',
        pbr_asphalt_wet: 'wet_surface_boost',
        pbr_wood_snow: 'snow_freshen',
        pbr_glass_wet: 'wet_surface_boost',
        pbr_glass_clear: 'wet_surface_boost',
        pbr_emissive_marquee: 'emissive_pulse',
        pbr_emissive_neon_cyan: 'emissive_pulse',
        pbr_fabric_muted: 'dust_overlay',
        pbr_brick_aged: 'dust_overlay',
        pbr_dirt_packed: 'dust_overlay',
    };
    const graphMap = {
        pbr_asphalt_wet: 'wet_hero',
        pbr_glass_wet: 'glass_rim',
        pbr_glass_clear: 'glass_rim',
        pbr_emissive_marquee: 'neon_rim',
        pbr_emissive_neon_cyan: 'neon_rim',
        pbr_wood_snow: 'storm_exterior',
        pbr_copper_aged: 'wet_hero',
    };
    const hookId = preset.shaderHook || hookMap[preset.id];
    if (hookId) window.ShaderRegistry?.applyHook?.(mesh, hookId);
    const graphId = preset.shaderGraph || graphMap[preset.id];
    if (graphId) window.ShaderNodeGraph?.applyGraph?.(mesh, graphId);
    if (mesh.userData?.audioZone) window.AudioZoneSystem?.registerMesh?.(mesh);
    return preset;
}

export function getMaterialPresetPromptBlock() {
    const byCat = {};
    MATERIAL_PRESETS.forEach((p) => {
        const c = p.category || 'core';
        if (!byCat[c]) byCat[c] = [];
        byCat[c].push(p);
    });
    const lines = Object.entries(byCat).map(([cat, list]) =>
        `${cat}:\n${list.map((p) => `  - ${p.id}: ${p.label} — ${p.agentHint}`).join('\n')}`,
    );
    return `
THRESHOLD MATERIAL LIBRARY (pick one per hero mesh — never CanvasTexture noise):
${lines.join('\n')}
Apply: MaterialPresets.applyMaterialPreset(mesh, 'preset_id')
Spawn examples: MaterialLibrary.spawnExamples()
Wire starter maps: StarterTex.wireStarterTextures() after naming mesh to Mat Wood / Mat Brick / …
Always pair presets with GIMP 2K or starter maps when surfaces are visible in PLAY.`.trim();
}

window.MaterialPresets = {
    MATERIAL_PRESETS,
    MATERIAL_CATEGORIES,
    getPresetById,
    listPresetsByCategory,
    applyMaterialPreset,
    getMaterialPresetPromptBlock,
};
