/** Render mode catalog — Hyper PBR default; retro modes optional (ENV → Visual style) */

export const REALISTIC_RENDER_MODE = 4;

export const RENDER_MODES = [
    {
        id: 4,
        key: 'hyper',
        name: 'REALISTIC (PBR)',
        short: 'Realistic',
        tagline: 'Default — full PBR lighting, textures, bloom, water',
        limits: 'MeshStandardMaterial + IBL + optional bloom. Use GIMP/Blender PBR textures.',
        tips: 'Default for all new worlds. Assign userData.textures albedo/roughness/metalness.',
        default: true,
    },
    {
        id: 0,
        key: 'threshold',
        name: 'RETRO: THRESHOLD (5-BAND)',
        short: 'Threshold',
        tagline: 'Optional retro — grayscale depth bands',
        limits: '5 grayscale depth bands + crossed grid. AI gallery / nostalgia only.',
        tips: 'User must opt in via ENV. Space props on Z-axis for readable layers.',
        retro: true,
    },
    {
        id: 1,
        key: 'onebit',
        name: 'RETRO: 1-BIT',
        short: '1-Bit',
        tagline: 'Optional retro — high-contrast B&W',
        limits: 'Only black/white — mid-tones collapse.',
        tips: 'Stylized showcases only — not default for gameplay.',
        retro: true,
    },
    {
        id: 2,
        key: 'terminal',
        name: 'RETRO: TERMINAL',
        short: 'Terminal',
        tagline: 'Optional retro — phosphor green matrix',
        limits: 'Green phosphor bands + scanlines.',
        tips: 'AI terminal demos — opt in when user asks for retro.',
        retro: true,
    },
    {
        id: 3,
        key: 'smpte',
        name: 'RETRO: SMPTE (8-BIT)',
        short: 'SMPTE',
        tagline: 'Optional retro — quantized color',
        limits: '4-level color quantization + depth tint.',
        tips: 'Bold distinct hues for retro art direction.',
        retro: true,
    },
];

export function getRenderMode(id) {
    return RENDER_MODES.find((m) => m.id === id) || RENDER_MODES[0];
}

export function isRetroRenderMode(id) {
    const m = getRenderMode(id);
    return !!m.retro;
}

export function getRenderModePromptBlock() {
    const realistic = RENDER_MODES.find((m) => m.default);
    const retro = RENDER_MODES.filter((m) => m.retro);
    return [
        `DEFAULT (always unless user asks for retro): ${realistic.id} ${realistic.short} — ${realistic.tagline}`,
        ...retro.map((m) => `OPT-IN RETRO ${m.id} ${m.short}: ${m.tagline}`),
    ].join('\n');
}

export function getRetroRenderModePromptBlock() {
    return RENDER_MODES.filter((m) => m.retro).map((m) =>
        `- ${m.id} ${m.short}: ${m.limits}`
    ).join('\n');
}

window.RenderModes = { RENDER_MODES, getRenderMode, REALISTIC_RENDER_MODE };