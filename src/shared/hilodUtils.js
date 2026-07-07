import profilesConfig from '../../config/graphics-export-profiles.json';
import { pickLodLevel } from './lodConfig.js';

export const HILOD_RE = /_(512|1k|2k|4k)(\.[^.]+)$/i;
export const SLOT_ORDER = ['albedo', 'roughness', 'metalness', 'normal'];

export function variantSuffix(fileName = '') {
    const m = String(fileName).match(/_(512|1k|2k|4k)(\.[^.]+)$/i);
    return m ? `_${m[1].toLowerCase()}` : '';
}

export function textureBaseKey(fileName = '') {
    return String(fileName).replace(HILOD_RE, '$2');
}

export function hasHilodSuffix(fileName = '') {
    return HILOD_RE.test(fileName);
}

export function preferenceOrder(textureMax, cfg = profilesConfig) {
    const key = String(textureMax);
    if (cfg.textureMaxPreference?.[key]) return cfg.textureMaxPreference[key];
    if (textureMax <= 1024) return ['_1k', ''];
    if (textureMax <= 2048) return ['_2k', '_1k', ''];
    return ['_4k', '_2k', '_1k', ''];
}

export function parseTextureFileName(fileName = '') {
    const lower = String(fileName).toLowerCase();
    let hilod = '';
    let stem = lower;

    const hilodMatch = lower.match(/_(512|1k|2k|4k)(\.[^.]+)$/i);
    if (hilodMatch) {
        hilod = `_${hilodMatch[1].toLowerCase()}`;
        stem = lower.slice(0, lower.length - hilod.length);
    }

    const exts = ['.png', '.jpg', '.jpeg', '.webp', '.ktx2'];
    for (const slot of SLOT_ORDER) {
        const suffix = `_${slot}`;
        for (const ext of exts) {
            if (stem.endsWith(`${suffix}${ext}`)) {
                const slug = stem.slice(0, stem.length - suffix.length - ext.length);
                return { slot, slug, hilod, baseKey: textureBaseKey(lower) };
            }
        }
    }
    return null;
}

export function pickSuffix(distance, distances, textureMax, availableSuffixes = ['']) {
    const order = preferenceOrder(textureMax);
    const available = order.filter((s) => availableSuffixes.includes(s));
    if (!available.length) return availableSuffixes[0] ?? '';
    const level = pickLodLevel(distance, distances);
    const idx = Math.min(level, available.length - 1);
    return available[idx];
}

export function groupTextureFiles(fileNames = []) {
    const groups = new Map();
    fileNames.forEach((fileName) => {
        const parsed = parseTextureFileName(fileName);
        if (!parsed) return;
        const base = parsed.baseKey;
        if (!groups.has(base)) {
            groups.set(base, { slug: parsed.slug, baseKey: base, variants: [] });
        }
        groups.get(base).variants.push({
            slot: parsed.slot,
            suffix: parsed.hilod || 'full',
            file: fileName,
        });
    });
    return [...groups.values()];
}