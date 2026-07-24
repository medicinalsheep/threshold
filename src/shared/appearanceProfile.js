/** AppearanceProfile — serializable character composition state (R8.2) */

export const APPEARANCE_FORMAT = 'threshold-appearance';
/** v2: default civilian outfit mods + richer starter maps */
export const APPEARANCE_VERSION = 2;

export const DEFAULT_COLORS = {
    skin: '#e0b090',
    shirt: '#4a6b8a',
    pants: '#2c323c',
    hair: '#2a1810',
};

/** Light field kit — reads as clothed, not naked prims */
export const DEFAULT_OUTFIT_MODS = [
    'hoodie_urban',
    'shoes_casual',
    'belt_utility',
];

export const SKIN_TEXTURE_VARIANTS = [
    { id: 'starter_skin_light', label: 'Light' },
    { id: 'starter_skin_medium', label: 'Medium' },
    { id: 'starter_skin_deep', label: 'Deep' },
];

export const DEFAULT_PROFILE = {
    format: APPEARANCE_FORMAT,
    version: APPEARANCE_VERSION,
    bodyId: 'male_default',
    hairId: 'hair_short_m',
    /** Modular gear — urban casual starter */
    mods: [...DEFAULT_OUTFIT_MODS],
    colors: { ...DEFAULT_COLORS },
    textures: {
        skin: 'starter_skin_medium',
        shirt: 'starter_fabric',
        hair: 'hair_alpha',
    },
    props: { torso: null, head: null },
    customBodyGlb: null,
    customBodyImport: null,
    customHairGlb: null,
};

function hexToNum(hex) {
    if (typeof hex === 'number') return hex;
    const s = String(hex || '').replace('#', '');
    const n = parseInt(s, 16);
    return Number.isFinite(n) ? n : 0xffffff;
}

export function normalizeProfile(raw = {}) {
    const base = {
        ...DEFAULT_PROFILE,
        colors: { ...DEFAULT_COLORS },
        textures: { ...DEFAULT_PROFILE.textures },
        props: { torso: null, head: null },
        mods: [...DEFAULT_OUTFIT_MODS],
    };
    if (!raw || typeof raw !== 'object') return base;

    // Migration: pre-v2 profiles with empty mods get starter outfit once
    const ver = Number(raw.version) || 1;
    let mods = Array.isArray(raw.mods)
        ? [...new Set(raw.mods.filter(Boolean))]
        : [...DEFAULT_OUTFIT_MODS];
    if (ver < 2 && Array.isArray(raw.mods) && raw.mods.length === 0 && !raw._modsCleared) {
        mods = [...DEFAULT_OUTFIT_MODS];
    }
    // Explicit empty after v2: honor user clear
    if (ver >= 2 && Array.isArray(raw.mods) && raw.mods.length === 0) {
        mods = [];
    }

    return {
        ...base,
        ...raw,
        version: Math.max(ver, APPEARANCE_VERSION),
        mods,
        colors: { ...DEFAULT_COLORS, ...(raw.colors || {}) },
        textures: { ...DEFAULT_PROFILE.textures, ...(raw.textures || {}) },
        props: { torso: null, head: null, ...(raw.props || {}) },
    };
}

/** One-click realistic starter (UI) */
export function realisticStarterProfile(overrides = {}) {
    return normalizeProfile({
        ...DEFAULT_PROFILE,
        ...overrides,
        version: APPEARANCE_VERSION,
        mods: [...DEFAULT_OUTFIT_MODS],
    });
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
    const female = p.bodyId === 'female_default';
    return {
        skinColor: hexToNum(p.colors.skin),
        bodyColor: hexToNum(p.colors.shirt),
        pantsColor: hexToNum(p.colors.pants),
        hairColor: hexToNum(p.colors.hair),
        roughness: p.roughness ?? 0.72,
        bodyId: p.bodyId,
        form: female ? 'female' : 'male',
        // Formed presets — wider hips / narrower shoulders for female
        torsoScale: female ? [0.9, 0.98, 0.88] : [1.06, 1.02, 0.98],
        hipScale: female ? [1.1, 1, 1.06] : [1, 1, 1],
    };
}

export function resolveSkinSlug(profile) {
    const t = normalizeProfile(profile).textures?.skin || 'starter_skin_medium';
    if (t === 'starter_skin') return 'starter_skin_medium';
    if (['starter_skin_light', 'starter_skin_medium', 'starter_skin_deep'].includes(t)) return t;
    if (String(t).startsWith('starter_skin_')) return t;
    return 'starter_skin_medium';
}

export function texturesFromUi() {
    const pick = (id, fallback) => document.getElementById(id)?.value || fallback;
    return {
        skin: pick('skin-tone-preset', 'starter_skin_medium'),
        shirt: 'starter_fabric',
        hair: 'hair_alpha',
    };
}

export function profileForNetwork(profile) {
    const p = normalizeProfile(profile);
    return {
        bodyId: p.bodyId,
        hairId: p.hairId,
        mods: [...(p.mods || [])],
        colors: { ...p.colors },
        textures: {
            skin: resolveSkinSlug(p),
            shirt: p.textures?.shirt || 'starter_fabric',
            hair: p.textures?.hair || 'hair_alpha',
        },
        customBodyGlb: p.customBodyGlb && !String(p.customBodyGlb).startsWith('blob:')
            ? p.customBodyGlb
            : null,
        customBodyImport: p.customBodyImport || null,
        customHairGlb: p.customHairGlb || null,
    };
}

export function modsFromUi() {
    const root = document.getElementById('skin-mod-list');
    if (!root) return [];
    return [...root.querySelectorAll('input[data-mod-id]:checked')].map((el) => el.dataset.modId);
}

/** Fill SKIN MOD picker from catalog (categories + presets). Call once on engine boot. */
export function initModPickerUi(selected = []) {
    const list = document.getElementById('skin-mod-list');
    const presets = document.getElementById('skin-mod-presets');
    if (!list) return;

    const Mod = window.AvatarMod;
    if (!Mod?.renderPickerHtml) {
        list.innerHTML = '<p class="insert-hint">MOD catalog loading…</p>';
        return;
    }

    const paint = (sel, q = '') => {
        if (q) {
            const items = Mod.list({ q });
            const set = new Set(sel);
            list.innerHTML = items.length
                ? `<div class="skin-mod-cat-grid">${items.map((m) => `
                    <label class="skin-mod-opt" title="${(m.tags || []).join(', ')} · ${m.slot}">
                        <input type="checkbox" data-mod-id="${m.id}" ${set.has(m.id) ? 'checked' : ''}>
                        <span>${m.label || m.id}</span>
                    </label>`).join('')}</div>`
                : '<p class="insert-hint">No mods match</p>';
        } else {
            list.innerHTML = Mod.renderPickerHtml(sel);
        }
    };

    paint(selected);

    if (presets && !presets.dataset.ready) {
        presets.dataset.ready = '1';
        presets.innerHTML = Mod.renderPresetButtonsHtml?.() || '';
        presets.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-mod-preset]');
            if (!btn) return;
            Mod.applyPresetToUi?.(btn.dataset.modPreset);
            // Re-paint full catalog with new selection so exclusive siblings stay honest
            paint(modsFromUi());
            window.UI?.status?.(`MOD preset: ${btn.textContent.trim()}`);
        });
    }

    if (!list.dataset.bound) {
        list.dataset.bound = '1';
        list.addEventListener('change', (e) => {
            const input = e.target.closest?.('input[data-mod-id]');
            if (!input?.checked) return;
            const id = input.dataset.modId;
            const spec = Mod.catalog?.()?.[id];
            const slot = spec?.slot;
            const exclusive = slot && Mod.slots?.()?.[slot]?.exclusive;
            if (!exclusive) return;
            list.querySelectorAll('input[data-mod-id]').forEach((el) => {
                if (el === input) return;
                const s = Mod.catalog?.()?.[el.dataset.modId];
                if (s?.slot === slot) el.checked = false;
            });
        });
    }

    const search = document.getElementById('skin-mod-search');
    if (search && !search.dataset.bound) {
        search.dataset.bound = '1';
        search.addEventListener('input', () => {
            paint(modsFromUi(), search.value.trim());
        });
    }
}

export function profileFromUi(base = {}) {
    const p = normalizeProfile(base);
    const pick = (id, fallback) => document.getElementById(id)?.value ?? fallback;
    p.bodyId = pick('skin-body-preset', p.bodyId);
    p.hairId = pick('skin-hair-preset', p.hairId);
    p.mods = modsFromUi();
    p.colors = colorsFromUi();
    p.textures = texturesFromUi();
    p.roughness = parseFloat(pick('skin-rough', String(p.roughness ?? 0.72)));
    const impEl = document.getElementById('skin-body-import');
    if (impEl) p.customBodyImport = impEl.value.trim() || null;
    const urlEl = document.getElementById('skin-model-url');
    if (urlEl?.value?.trim()) p.customBodyGlb = urlEl.value.trim();
    return p;
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
    // Rebuild / sync MOD checkboxes (catalog may be large)
    if (document.getElementById('skin-mod-list')) {
        initModPickerUi(p.mods || []);
    }
    const toneSel = document.getElementById('skin-tone-preset');
    if (toneSel) toneSel.value = resolveSkinSlug(p);
    const imp = document.getElementById('skin-body-import');
    if (imp) imp.value = p.customBodyImport || '';
    const url = document.getElementById('skin-model-url');
    if (url && p.customBodyGlb && !String(p.customBodyGlb).startsWith('blob:')) {
        url.value = p.customBodyGlb;
    }
    const status = document.getElementById('skin-custom-status');
    if (status) {
        const hint = p.customBodyImport
            || (p.customBodyGlb?.startsWith?.('blob:') ? 'local GLB (session)' : p.customBodyGlb);
        status.textContent = hint ? `Custom body: ${hint}` : 'Custom body: default manifest';
    }
}

window.AppearanceProfile = {
    DEFAULT_PROFILE,
    SKIN_TEXTURE_VARIANTS,
    normalizeProfile,
    profileFromLegacyAppearance,
    profileToMeshOpts,
    profileForNetwork,
    resolveSkinSlug,
    colorsFromUi,
    texturesFromUi,
    modsFromUi,
    initModPickerUi,
    profileFromUi,
    syncUiFromProfile,
};