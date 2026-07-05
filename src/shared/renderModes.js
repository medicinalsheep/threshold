/** Render mode catalog — ENV panel, Spectate HUD, PromptGen reference */

export const RENDER_MODES = [
    {
        id: 0,
        key: 'threshold',
        name: 'THRESHOLD (5-BAND)',
        short: 'Threshold',
        tagline: 'Ultimate compatibility · lightweight',
        limits: '5 grayscale depth bands + crossed grid per band. No bloom. Best on low-end devices.',
        tips: 'Space props on Z-axis; use luminance contrast between layers.',
    },
    {
        id: 1,
        key: 'onebit',
        name: '1-BIT (BINARY)',
        short: '1-Bit',
        tagline: 'High-contrast B&W',
        limits: 'Only black/white — mid-tones collapse. 2D-style readability; depth from spacing + fog.',
        tips: 'Separate objects by distance; avoid similar-gray materials touching.',
    },
    {
        id: 2,
        key: 'terminal',
        name: 'TERMINAL (MATRIX)',
        short: 'Terminal',
        tagline: 'Phosphor green · parallel + crossed layers',
        limits: 'Green phosphor bands with scanlines + per-depth cross-hatch grid.',
        tips: 'Terminal gallery pattern: stagger Z every 2–3 units for readable layers.',
    },
    {
        id: 3,
        key: 'smpte',
        name: 'SMPTE (8-BIT)',
        short: 'SMPTE',
        tagline: 'Quantized retro color',
        limits: '4-level color quantization + depth tint. Bloom off.',
        tips: 'Bold distinct hues; emissive helps separation in dark scenes.',
    },
    {
        id: 4,
        key: 'hyper',
        name: 'HYPER (BLOOM)',
        short: 'Hyper',
        tagline: 'Full PBR · bloom · physics showcase',
        limits: 'Heaviest mode — full lighting, water ripples, IBL reflections.',
        tips: 'Default for realism: physics props, water, atmosphere, emissive accents.',
    },
];

export function getRenderMode(id) {
    return RENDER_MODES.find((m) => m.id === id) || RENDER_MODES[4];
}

export function getRenderModePromptBlock() {
    return RENDER_MODES.map((m) =>
        `- ${m.id} ${m.short}: ${m.tagline}. Limits: ${m.limits} Tips: ${m.tips}`
    ).join('\n');
}