/** AppearanceProfile — serializable character composition state (R8.2) */

export const APPEARANCE_FORMAT = 'threshold-appearance';
export const APPEARANCE_VERSION = 1;

export const DEFAULT_COLORS = {
    skin: '#e8b896',
    shirt: '#3d5a80',
    pants: '#232830',
    hair: '#2a1810',
};

export const DEFAULT_PROFILE = {
    format: APPEARANCE_FORMAT,
    version: APPEARANCE_VERSION,
    bodyId: 'male_default',
    hairId: 'hair_short_m',
    colors: { ...DEFAULT_COLORS },
    textures: {
        skin: 'starter_skin',
        shirt: 'starter_fabric',
        hair: 'hair_alpha',
    },
    props: { torso: null, head: null },
    customBodyGlb: null,
    customHairGlb: null,
};

function hexToNum(hex) {
    if (typeof hex === 'number') return hex;
    const s = String(hex || '').replace('#', '');
    const n = parseInt(s, 16);
    return Number.isFinite(n) ? n : 0xffffff;
}

export function normalizeProfile(raw = {}) {
    const base = { ...DEFAULT_PROFILE, colors: { ...DEFAULT_COLORS }, textures: { ...DEFAULT_PROFILE.textures }, props: { torso: null, head: null } };
    if (!raw || typeof raw !== 'object') return base;
    return {
        ...base,
        ...raw,
        colors: { ...DEFAULT_COLORS, ...(raw.colors || {}) },
        textures: { ...DEFAULT_PROFILE.textures, ...(raw.textures || {}) },
        props: { torso: null, head: null, ...(raw.props || {}) },
    };
}

export function profileFromLegacyAppearance(appearance = {}) {
    if (appearance.bodyId || appearance.hairId || appearance.format) {
        return normalizeProfile(appearance);
    }
    const colors = { ...DEFAULT_COLORS };
    if (appearance.skinColor != null) colors.skin = `#${appearance.skinColor.toString(16).padStart(6, '0')}`;
    if (appearance.bodyColor != null) colors.shirt = `#${appearance.bodyColor.toString(16).padStart(6, '0')}`;
    if (appearance.pantsColor != null) colors.pants = `#${appearance.pantsColor.toString(16).padStart(6, '0')}`;
    if (appearance.hairColor != null) colors.hair = `#${appearance.hairColor.toString(16).padStart(6, '0')}`;
    return normalizeProfile({
        bodyId: appearance.bodyId || DEFAULT_PROFILE.bodyId,
        hairId: appearance.hairId || DEFAULT_PROFILE.hairId,
        colors,
        customBodyGlb: appearance.customBodyGlb || null,
        roughness: appearance.roughness,
    });
}

export function profileToMeshOpts(profile) {
    const p = normalizeProfile(profile);
    return {
        skinColor: hexToNum(p.colors.skin),
        bodyColor: hexToNum(p.colors.shirt),
        pantsColor: hexToNum(p.colors.pants),
        hairColor: hexToNum(p.colors.hair),
        roughness: p.roughness ?? 0.72,
        bodyId: p.bodyId,
        torsoScale: p.bodyId === 'female_default' ? [0.92, 1, 0.88] : [1.04, 1, 0.95],
        hipScale: p.bodyId === 'female_default' ? [0.95, 1, 0.95] : [1, 1, 1],
    };
}

export function profileForNetwork(profile) {
    const p = normalizeProfile(profile);
    return {
        bodyId: p.bodyId,
        hairId: p.hairId,
        colors: { ...p.colors },
        customBodyGlb: p.customBodyGlb || null,
        customHairGlb: p.customHairGlb || null,
    };
}

export function colorsFromUi() {
    const pick = (id, fallback) => document.getElementById(id)?.value || fallback;
    return {
        shirt: pick('skin-body-color', DEFAULT_COLORS.shirt),
        skin: pick('skin-head-color', DEFAULT_COLORS.skin),
        pants: pick('skin-pants-color', DEFAULT_COLORS.pants),
        hair: pick('skin-hair-color', DEFAULT_COLORS.hair),
    };
}

export function syncUiFromProfile(profile) {
    const p = normalizeProfile(profile);
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    };
    set('skin-body-color', p.colors.shirt);
    set('skin-head-color', p.colors.skin);
    set('skin-pants-color', p.colors.pants);
    set('skin-hair-color', p.colors.hair);
    const bodySel = document.getElementById('skin-body-preset');
    const hairSel = document.getElementById('skin-hair-preset');
    if (bodySel) bodySel.value = p.bodyId;
    if (hairSel) hairSel.value = p.hairId;
}

window.AppearanceProfile = {
    DEFAULT_PROFILE,
    normalizeProfile,
    profileFromLegacyAppearance,
    profileToMeshOpts,
    profileForNetwork,
    colorsFromUi,
    syncUiFromProfile,
};