/** Appearance export / import — JSON clipboard + file (R8.2.6) */

import {
    APPEARANCE_FORMAT,
    normalizeProfile,
    profileForNetwork,
} from './appearanceProfile.js';

export function profileForExport(profile) {
    const p = normalizeProfile(profile);
    const out = {
        format: APPEARANCE_FORMAT,
        version: p.version,
        bodyId: p.bodyId,
        hairId: p.hairId,
        colors: { ...p.colors },
        textures: { ...p.textures },
        props: { ...p.props },
        roughness: p.roughness ?? 0.72,
        customBodyImport: p.customBodyImport || null,
        customHairGlb: p.customHairGlb || null,
    };
    if (p.customBodyGlb && !String(p.customBodyGlb).startsWith('blob:')) {
        out.customBodyGlb = p.customBodyGlb;
    }
    return out;
}

export function parseAppearanceJson(text) {
    const raw = typeof text === 'string' ? JSON.parse(text) : text;
    if (!raw || typeof raw !== 'object') {
        throw new Error('Invalid appearance JSON');
    }
    if (raw.format && raw.format !== APPEARANCE_FORMAT) {
        throw new Error(`Expected ${APPEARANCE_FORMAT}`);
    }
    return normalizeProfile(raw);
}

export function serializeAppearance(profile, pretty = true) {
    const data = profileForExport(profile);
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

export async function copyAppearanceToClipboard(profile) {
    const text = serializeAppearance(profile);
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return text;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return text;
}

export function downloadAppearanceJson(profile, filename = 'threshold-appearance.json') {
    const blob = new Blob([serializeAppearance(profile)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export const AppearanceExport = {
    profileForExport,
    profileForNetwork,
    parseAppearanceJson,
    serializeAppearance,
    copyAppearanceToClipboard,
    downloadAppearanceJson,
};

window.AppearanceExport = AppearanceExport;