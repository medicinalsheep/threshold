import { LOD_DISTANCES } from './lodConfig.js';

const RUNTIME_ONLY_KEYS = ['_lodScenes'];

export function sanitizeUserDataForSync(userData = {}) {
    const out = { ...userData };
    RUNTIME_ONLY_KEYS.forEach((key) => delete out[key]);

    if (out.textureHilod) {
        const hilod = out.textureHilod;
        out.textureHilod = {
            distances: hilod.distances?.length ? [...hilod.distances] : [...LOD_DISTANCES],
            activeBySlot: { ...(hilod.activeBySlot || {}) },
            slots: {},
        };
        Object.entries(hilod.slots || {}).forEach(([slot, variants]) => {
            out.textureHilod.slots[slot] = Object.fromEntries(
                Object.entries(variants)
                    .filter(([, v]) => v?.path)
                    .map(([suffix, v]) => [suffix, { path: v.path }])
            );
        });
    }

    if (out.lodPaths) {
        out.lodPaths = out.lodPaths.map((entry) => ({
            level: entry.level ?? 0,
            path: entry.path || null,
            file: entry.file || null,
            url: entry.url || null,
            distance: entry.distance ?? 0,
        }));
    }

    if (!out.lodDistances?.length) {
        out.lodDistances = [...LOD_DISTANCES];
    }

    return out;
}

window.LodSync = { sanitizeUserDataForSync };