export const BLENDER_MANIFEST_FORMAT = 'threshold-blender-manifest';
export const BLENDER_MANIFEST_NAME = 'threshold_blender_manifest.json';

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

    resolveModelPath(manifestDir, model, manifest) {
        const file = model.file || model.path?.split(/[/\\]/).pop();
        if (!file) return null;

        const candidates = [];
        if (model.path) {
            const normalized = model.path.replace(/\\/g, '/');
            if (/^[a-zA-Z]:\//.test(normalized) || normalized.startsWith('/')) {
                candidates.push(model.path);
            } else {
                candidates.push(joinPath(manifestDir, model.path));
                if (manifest?.exportDir) {
                    candidates.push(joinPath(manifestDir, '..', manifest.exportDir, file));
                }
            }
        }
        candidates.push(joinPath(manifestDir, file));
        if (manifest?.exportDir) {
            candidates.push(joinPath(manifestDir, manifest.exportDir, file));
        }
        return candidates[0] || joinPath(manifestDir, file);
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