/** AppearanceProfile — serializable character composition state (R8.2) */

export const APPEARANCE_FORMAT = 'threshold-appearance';
/** v3: continuous body shape (shoulders/chest/waist/hips/muscle/weight/height) */
export const APPEARANCE_VERSION = 3;

/** Neutral shape — 0.5 on each axis · heightM null = body preset height */
export const DEFAULT_SHAPE = {
    heightM: null,
    shoulders: 0.5,
    chest: 0.5,
    waist: 0.5,
    hips: 0.5,
    muscle: 0.5,
    weight: 0.5,
};

export const SHAPE_SLIDER_KEYS = ['shoulders', 'chest', 'waist', 'hips', 'muscle', 'weight'];

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

/**
 * Skin tone ladder — lighter → deeper (Fitzpatrick-inspired range).
 * Each id maps to textures/{id}_{albedo,roughness,normal}*.
 */
export const SKIN_TEXTURE_VARIANTS = [
    { id: 'starter_skin_porcelain', label: 'Porcelain', hex: '#f2d4c8', hint: 'Very fair · cool' },
    { id: 'starter_skin_light', label: 'Light', hex: '#e8c4a8', hint: 'Fair · neutral' },
    { id: 'starter_skin_honey', label: 'Honey', hex: '#e0b090', hint: 'Warm fair' },
    { id: 'starter_skin_olive', label: 'Olive', hex: '#c4a070', hint: 'Light-medium · olive' },
    { id: 'starter_skin_medium', label: 'Medium', hex: '#c9956c', hint: 'Medium · warm' },
    { id: 'starter_skin_tan', label: 'Tan', hex: '#b88858', hint: 'Golden tan' },
    { id: 'starter_skin_caramel', label: 'Caramel', hex: '#8b5a3c', hint: 'Rich brown' },
    { id: 'starter_skin_deep', label: 'Deep', hex: '#5c3a28', hint: 'Deep brown' },
    { id: 'starter_skin_ebony', label: 'Ebony', hex: '#2a1a14', hint: 'Deepest · cool' },
];

/** Default mesh tint when a tone is selected (multiplies with map at white) */
export function skinHexForSlug(slug) {
    const v = SKIN_TEXTURE_VARIANTS.find((s) => s.id === slug);
    return v?.hex || DEFAULT_COLORS.skin;
}

export const DEFAULT_PROFILE = {
    format: APPEARANCE_FORMAT,
    version: APPEARANCE_VERSION,
    bodyId: 'male_default',
    hairId: 'hair_short_m',
    /** Modular gear — urban casual starter */
    mods: [...DEFAULT_OUTFIT_MODS],
    shape: { ...DEFAULT_SHAPE },
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

/** Clamp shape fields · heightM 1.2–2.2 m or null */
export function normalizeShape(raw = {}) {
    const n = (v, d = 0.5) => {
        const x = Number(v);
        return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : d;
    };
    let heightM = raw?.heightM;
    if (heightM === '' || heightM == null) {
        heightM = null;
    } else {
        heightM = Number(heightM);
        if (!Number.isFinite(heightM) || heightM < 1.2 || heightM > 2.2) heightM = null;
    }
    return {
        heightM,
        shoulders: n(raw?.shoulders),
        chest: n(raw?.chest),
        waist: n(raw?.waist),
        hips: n(raw?.hips),
        muscle: n(raw?.muscle),
        weight: n(raw?.weight),
    };
}

export function isShapeNeutral(shape) {
    const s = normalizeShape(shape);
    if (s.heightM != null) return false;
    return SHAPE_SLIDER_KEYS.every((k) => Math.abs(s[k] - 0.5) < 0.02);
}

/**
 * Map 0–1 slider to multiply factor (0.5 → 1.0).
 * @param {number} v 0–1
 * @param {number} minMul at 0
 * @param {number} maxMul at 1
 */
export function shapeFactor(v, minMul = 0.82, maxMul = 1.18) {
    const t = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5;
    if (t <= 0.5) return minMul + (1 - minMul) * (t / 0.5);
    return 1 + (maxMul - 1) * ((t - 0.5) / 0.5);
}

/** Default height meters for body presets */
export function defaultHeightForBody(bodyId) {
    return bodyId === 'female_default' ? 1.65 : 1.75;
}

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
        shape: { ...DEFAULT_SHAPE },
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
        shape: normalizeShape(raw.shape || base.shape),
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
    const shape = normalizeShape(p.shape);
    const sh = shapeFactor(shape.shoulders, 0.78, 1.22);
    const ch = shapeFactor(shape.chest, 0.8, 1.2);
    const hi = shapeFactor(shape.hips, 0.8, 1.22);
    const wt = shapeFactor(shape.weight, 0.9, 1.12);

    const baseTorso = female ? [0.9, 0.98, 0.88] : [1.06, 1.02, 0.98];
    const baseHip = female ? [1.1, 1, 1.06] : [1, 1, 1];

    return {
        skinColor: hexToNum(p.colors.skin),
        bodyColor: hexToNum(p.colors.shirt),
        pantsColor: hexToNum(p.colors.pants),
        hairColor: hexToNum(p.colors.hair),
        roughness: p.roughness ?? 0.72,
        bodyId: p.bodyId,
        form: female ? 'female' : 'male',
        shape,
        // Base form × continuous shape
        torsoScale: [
            baseTorso[0] * ch * wt,
            baseTorso[1],
            baseTorso[2] * (0.95 + ch * 0.05),
        ],
        hipScale: [
            baseHip[0] * hi * wt,
            baseHip[1],
            baseHip[2] * hi,
        ],
        // Extra form knobs consumed by HumanMesh.resolveForm
        _shapeFactors: {
            shoulders: sh,
            chest: ch,
            waist: shapeFactor(shape.waist, 0.75, 1.25),
            hips: hi,
            muscle: shapeFactor(shape.muscle, 0.85, 1.2),
            weight: wt,
        },
        heightM: shape.heightM,
    };
}

export function resolveSkinSlug(profile) {
    const t = normalizeProfile(profile).textures?.skin || 'starter_skin_medium';
    if (t === 'starter_skin') return 'starter_skin_medium';
    if (SKIN_TEXTURE_VARIANTS.some((s) => s.id === t)) return t;
    if (String(t).startsWith('starter_skin_')) return t;
    return 'starter_skin_medium';
}

/** Fill #skin-tone-preset from SKIN_TEXTURE_VARIANTS */
export function initSkinToneSelect(selectedId = null) {
    const sel = document.getElementById('skin-tone-preset');
    if (!sel) return;
    const cur = selectedId || sel.value || 'starter_skin_medium';
    sel.innerHTML = SKIN_TEXTURE_VARIANTS.map((s) => {
        const title = s.hint ? ` title="${s.hint}"` : '';
        return `<option value="${s.id}"${title}>${s.label}</option>`;
    }).join('');
    if (SKIN_TEXTURE_VARIANTS.some((s) => s.id === cur)) sel.value = cur;
    else sel.value = 'starter_skin_medium';
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
    const out = {
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
    // Compact: only send shape when non-neutral
    if (!isShapeNeutral(p.shape)) {
        out.shape = normalizeShape(p.shape);
    }
    return out;
}

export function modsFromUi() {
    // Prefer wardrobe layout state when mounted
    if (window.ClothingLayout?.getSelected) {
        const fromLayout = window.ClothingLayout.getSelected();
        if (Array.isArray(fromLayout) && (fromLayout.length || document.getElementById('skin-wardrobe'))) {
            return [...fromLayout];
        }
    }
    const root = document.getElementById('skin-mod-list');
    if (!root) return [];
    return [...root.querySelectorAll('input[data-mod-id]:checked')].map((el) => el.dataset.modId);
}

/**
 * Fill SKIN wardrobe (slot rail + catalog) or legacy checkbox list.
 * Call on engine boot and after profile sync.
 */
export function initModPickerUi(selected = []) {
    const wardrobe = document.getElementById('skin-wardrobe');
    if (wardrobe && window.ClothingLayout?.mount) {
        window.ClothingLayout.mount({ selected: selected || [] });
        return;
    }

    // Legacy fallback: flat category checkboxes
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

export function shapeFromUi(baseShape = {}) {
    const pick = (id, fallback) => {
        const el = document.getElementById(id);
        if (!el) return fallback;
        return el.value;
    };
    const raw = {
        heightM: pick('skin-shape-height', baseShape.heightM),
        shoulders: pick('skin-shape-shoulders', baseShape.shoulders ?? 0.5),
        chest: pick('skin-shape-chest', baseShape.chest ?? 0.5),
        waist: pick('skin-shape-waist', baseShape.waist ?? 0.5),
        hips: pick('skin-shape-hips', baseShape.hips ?? 0.5),
        muscle: pick('skin-shape-muscle', baseShape.muscle ?? 0.5),
        weight: pick('skin-shape-weight', baseShape.weight ?? 0.5),
    };
    // Empty height field → null (body preset)
    if (raw.heightM === '' || raw.heightM == null) raw.heightM = null;
    return normalizeShape(raw);
}

export function profileFromUi(base = {}) {
    const p = normalizeProfile(base);
    const pick = (id, fallback) => document.getElementById(id)?.value ?? fallback;
    p.bodyId = pick('skin-body-preset', p.bodyId);
    p.hairId = pick('skin-hair-preset', p.hairId);
    p.mods = modsFromUi();
    p.colors = colorsFromUi();
    p.textures = texturesFromUi();
    p.shape = shapeFromUi(p.shape);
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
        if (el && val != null && val !== '') el.value = val;
    };
    set('skin-body-color', p.colors.shirt);
    set('skin-head-color', p.colors.skin);
    set('skin-pants-color', p.colors.pants);
    set('skin-hair-color', p.colors.hair);
    const bodySel = document.getElementById('skin-body-preset');
    const hairSel = document.getElementById('skin-hair-preset');
    if (bodySel) bodySel.value = p.bodyId;
    if (hairSel) hairSel.value = p.hairId;
    // Rebuild / sync wardrobe or MOD list
    if (document.getElementById('skin-wardrobe') || document.getElementById('skin-mod-list')) {
        initModPickerUi(p.mods || []);
    }
    initSkinToneSelect(resolveSkinSlug(p));
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
    // Body shape sliders
    const s = normalizeShape(p.shape);
    const setRange = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = String(val);
    };
    setRange('skin-shape-shoulders', s.shoulders);
    setRange('skin-shape-chest', s.chest);
    setRange('skin-shape-waist', s.waist);
    setRange('skin-shape-hips', s.hips);
    setRange('skin-shape-muscle', s.muscle);
    setRange('skin-shape-weight', s.weight);
    const hEl = document.getElementById('skin-shape-height');
    if (hEl) hEl.value = s.heightM != null ? String(s.heightM) : '';
    updateShapeLabels(s);
}

/** Update numeric labels next to shape sliders */
export function updateShapeLabels(shape) {
    const s = normalizeShape(shape);
    const setLab = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    const pct = (v) => `${Math.round(v * 100)}%`;
    setLab('skin-shape-shoulders-val', pct(s.shoulders));
    setLab('skin-shape-chest-val', pct(s.chest));
    setLab('skin-shape-waist-val', pct(s.waist));
    setLab('skin-shape-hips-val', pct(s.hips));
    setLab('skin-shape-muscle-val', pct(s.muscle));
    setLab('skin-shape-weight-val', pct(s.weight));
    setLab(
        'skin-shape-height-val',
        s.heightM != null ? `${s.heightM.toFixed(2)} m` : 'preset',
    );
}

window.AppearanceProfile = {
    DEFAULT_PROFILE,
    DEFAULT_SHAPE,
    SHAPE_SLIDER_KEYS,
    SKIN_TEXTURE_VARIANTS,
    APPEARANCE_VERSION,
    normalizeProfile,
    normalizeShape,
    isShapeNeutral,
    shapeFactor,
    defaultHeightForBody,
    profileFromLegacyAppearance,
    profileToMeshOpts,
    profileForNetwork,
    resolveSkinSlug,
    skinHexForSlug,
    initSkinToneSelect,
    colorsFromUi,
    texturesFromUi,
    modsFromUi,
    shapeFromUi,
    initModPickerUi,
    profileFromUi,
    syncUiFromProfile,
    updateShapeLabels,
};