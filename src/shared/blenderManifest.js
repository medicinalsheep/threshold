export const BLENDER_MANIFEST_FORMAT = 'threshold-blender-manifest';
export const BLENDER_MANIFEST_NAME = 'threshold_blender_manifest.json';
/** Keep in sync with config/lod-distances.json (MeshLod + HILOD rungs). */
export const DEFAULT_LOD_DISTANCES = [0, 18, 48];

function normName(name = '') {
    return String(name).trim().toLowerCase();
}

export const BlenderManifest = {
    parse(raw) {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid manifest JSON');
        }
        if (data.format && data.format !== BLENDER_MANIFEST_FORMAT) {
            throw new Error(`Expected ${BLENDER_MANIFEST_FORMAT}, got ${data.format}`);
        }
        if (!Array.isArray(data.models)) {
            throw new Error('Manifest missing models array');
        }
        return data;
    },

    modelForObject(manifest, objectName) {
        const target = normName(objectName);
        return (manifest.models || []).find((m) => normName(m.objectName) === target) || null;
    },

    lodsForModel(model) {
        if (model?.lods?.length) return model.lods;
        const file = model?.file || model?.path?.split(/[/\\]/).pop();
        return [{
            level: 0,
            file,
            path: model?.path || (file ? `import/${file}` : null),
            distance: 0,
        }];
    },

    lodDistances(model) {
        if (model?.lodDistances?.length) return model.lodDistances;
        const lods = this.lodsForModel(model);
        return lods.map((l) => l.distance ?? 0);
    },

    resolveLodPath(manifestDir, lod, manifest) {
        const file = lod.file || lod.path?.split(/[/\\]/).pop();
        if (!file) return null;

        const candidates = [];
        if (lod.path) {
            const normalized = lod.path.replace(/\\/g, '/');
            if (/^[a-zA-Z]:\//.test(normalized) || normalized.startsWith('/')) {
                candidates.push(lod.path);
            } else {
                candidates.push(joinPath(manifestDir, lod.path));
                if (manifest?.exportDir) {
                    candidates.push(joinPath(manifestDir, '..', manifest.exportDir, file));
                }
            }
        }
        candidates.push(joinPath(manifestDir, file));
        if (manifest?.exportDir) {
            candidates.push(joinPath(manifestDir, manifest.exportDir, file));
        }
        candidates.push(joinPath('import', file));
        candidates.push(joinPath('bundle', 'import', file));
        return candidates[0] || joinPath(manifestDir, file);
    },

    resolveModelPath(manifestDir, model, manifest) {
        const lods = this.lodsForModel(model);
        return this.resolveLodPath(manifestDir, lods[0], manifest);
    },

    resolveLodPaths(manifestDir, model, manifest) {
        return this.lodsForModel(model).map((lod) => ({
            ...lod,
            path: this.resolveLodPath(manifestDir, lod, manifest),
        }));
    },
};

function joinPath(...parts) {
    return parts
        .filter(Boolean)
        .map((p) => String(p).replace(/\\/g, '/'))
        .join('/')
        .replace(/\/+/g, '/');
}

window.BlenderManifest = BlenderManifest;