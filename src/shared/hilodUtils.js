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
    // Best → worst. Prefer explicit _Nk over bare master ('') when both exist —
    // bare master is often same res as _2k and swapping them causes flash.
    if (textureMax <= 512) return ['_512', '_1k', ''];
    if (textureMax <= 1024) return ['_1k', '_2k', ''];
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

/**
 * @param {number} [currentIdx] last chosen index into available (hysteresis)
 * @param {number} [band] meters of stickiness at rung boundaries
 */
export function pickSuffix(distance, distances, textureMax, availableSuffixes = [''], currentIdx = 0, band = 4) {
    const order = preferenceOrder(textureMax);
    // Keep only known quality ladder entries that exist
    let available = order.filter((s) => availableSuffixes.includes(s));
    // Drop bare master if a matching max tier exists (avoids '' ↔ _2k flash)
    if (available.includes('') && (available.includes('_2k') || available.includes('_1k') || available.includes('_4k'))) {
        available = available.filter((s) => s !== '');
    }
    if (!available.length) {
        // Fall back to best raw available
        const raw = availableSuffixes.filter(Boolean);
        if (raw.length) return raw.sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
        return availableSuffixes[0] ?? '';
    }

    // Near camera: always best
    const nearHold = (distances?.[1] ?? 35) * 0.55;
    if (distance < nearHold) return available[0];

    let level = pickLodLevel(distance, distances);
    // Hysteresis: stick to previous quality rung near boundaries
    const cur = Math.max(0, Math.min(Number(currentIdx) || 0, available.length - 1));
    if (level > cur) {
        const thr = distances[Math.min(level, distances.length - 1)] ?? 0;
        if (distance < thr + band) level = cur;
    } else if (level < cur) {
        const thr = distances[Math.min(cur, distances.length - 1)] ?? 0;
        if (distance > thr - band) level = cur;
    }
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