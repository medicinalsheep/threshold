/**
 * Material & shader preset registry — agent-directed PBR without CanvasTexture slop.
 * Agents pick a preset id; engine applies tuned MeshStandardMaterial params + weather hooks.
 */

export const MATERIAL_PRESETS = [
    {
        id: 'pbr_default',
        label: 'Realistic PBR (default)',
        roughness: 0.52,
        metalness: 0.08,
        envMapIntensity: 0.42,
        weather: ['wet'],
        agentHint: 'Default hero surfaces — pair with GIMP 2K maps.',
    },
    {
        id: 'pbr_concrete_weathered',
        label: 'Weathered concrete',
        roughness: 0.88,
        metalness: 0.02,
        envMapIntensity: 0.22,
        surfaceType: 'concrete',
        weather: ['wet', 'dust'],
        dustExposure: 0.85,
        agentHint: 'Exterior pads, plazas — set userData.dustExposure.',
    },
    {
        id: 'pbr_asphalt_wet',
        label: 'Asphalt (rain-ready)',
        roughness: 0.94,
        metalness: 0.01,
        envMapIntensity: 0.16,
        surfaceType: 'asphalt',
        weather: ['wet'],
        agentHint: 'Roads, lots — surfaceType asphalt for Footsteps + rain lerp.',
    },
    {
        id: 'pbr_wood_snow',
        label: 'Wood deck (snow-cap)',
        roughness: 0.82,
        metalness: 0.03,
        envMapIntensity: 0.28,
        surfaceType: 'wood',
        weather: ['wet', 'snow'],
        snowCap: 0.6,
        agentHint: 'Porches, docks — userData.snowCap for accumulation pass.',
    },
    {
        id: 'pbr_metal_brushed',
        label: 'Brushed metal',
        roughness: 0.38,
        metalness: 0.72,
        envMapIntensity: 0.55,
        surfaceType: 'metal',
        weather: ['wet'],
        agentHint: 'Rails, beams — rain darkens roughness slightly.',
    },
    {
        id: 'pbr_glass_wet',
        label: 'Wet glass / window',
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
    },
    {
        id: 'pbr_emissive_marquee',
        label: 'Emissive sign / marquee',
        roughness: 0.45,
        metalness: 0.2,
        emissive: 0xffaa44,
        emissiveIntensity: 1.2,
        weather: ['wet'],
        weatherMarquee: true,
        agentHint: 'userData.weatherMarquee — rain dampens emissive glow.',
    },
    {
        id: 'pbr_fabric_muted',
        label: 'Fabric / canvas awning',
        roughness: 0.92,
        metalness: 0,
        envMapIntensity: 0.18,
        surfaceType: 'fabric',
        weather: ['dust'],
        dustExposure: 0.7,
        agentHint: 'Awnings, tarps — dust pass mutes albedo.',
    },
    {
        id: 'pbr_stylized_toon',
        label: 'Stylized (high rough, low metal)',
        roughness: 0.95,
        metalness: 0,
        envMapIntensity: 0.12,
        weather: [],
        agentHint: 'Only when brief style=stylized — still use GIMP maps, not procedural noise.',
    },
];

export function getPresetById(id) {
    return MATERIAL_PRESETS.find((p) => p.id === id) || MATERIAL_PRESETS[0];
}

export function applyMaterialPreset(mesh, presetId) {
    if (!mesh?.material) return null;
    const preset = getPresetById(presetId);
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
        if (!m) return;
        if (preset.roughness != null) m.roughness = preset.roughness;
        if (preset.metalness != null) m.metalness = preset.metalness;
        if (preset.envMapIntensity != null) m.envMapIntensity = preset.envMapIntensity;
        if (preset.emissive != null) m.emissive?.setHex?.(preset.emissive);
        if (preset.emissiveIntensity != null) m.emissiveIntensity = preset.emissiveIntensity;
        if (preset.transparent) m.transparent = true;
        if (preset.opacity != null) m.opacity = preset.opacity;
        if (preset.transmission != null) m.transmission = preset.transmission;
    });
    mesh.userData = mesh.userData || {};
    mesh.userData.materialPreset = preset.id;
    if (preset.surfaceType) mesh.userData.surfaceType = preset.surfaceType;
    if (preset.wetGlass) mesh.userData.wetGlass = true;
    if (preset.weatherMarquee) mesh.userData.weatherMarquee = true;
    if (preset.dustExposure != null) mesh.userData.dustExposure = preset.dustExposure;
    if (preset.snowCap != null) mesh.userData.snowCap = preset.snowCap;
    window.WeatherSystem?.registerMesh?.(mesh);
    return preset;
}

export function getMaterialPresetPromptBlock() {
    return `
THRESHOLD MATERIAL PRESETS (pick one per hero mesh — never CanvasTexture noise):
${MATERIAL_PRESETS.map((p) => `- ${p.id}: ${p.label} — ${p.agentHint}`).join('\n')}
Apply via MaterialPresets.applyMaterialPreset(mesh, 'preset_id') OR mirror params on MeshStandardMaterial.
Always pair presets with GIMP 2K PBR maps when surfaces are visible in PLAY.`.trim();
}

window.MaterialPresets = {
    MATERIAL_PRESETS,
    getPresetById,
    applyMaterialPreset,
    getMaterialPresetPromptBlock,
};