export const GIMP_MANIFEST_FORMAT = 'threshold-gimp-manifest';
export const GIMP_MANIFEST_NAME = 'threshold_manifest.json';

const ENGINE_SLOTS = new Set(['albedo', 'roughness', 'metalness']);

function normName(name = '') {
    return String(name).trim().toLowerCase();
}

function splitPath(filePath = '') {
    const normalized = filePath.replace(/\\/g, '/');
    const idx = normalized.lastIndexOf('/');
    if (idx < 0) return { dir: '', file: normalized };
    return { dir: normalized.slice(0, idx), file: normalized.slice(idx + 1) };
}

export const TextureManifest = {
    parse(raw) {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid manifest JSON');
        }
        if (data.format && data.format !== GIMP_MANIFEST_FORMAT) {
            throw new Error(`Expected ${GIMP_MANIFEST_FORMAT}, got ${data.format}`);
        }
        if (!Array.isArray(data.textures)) {
            throw new Error('Manifest missing textures array');
        }
        return data;
    },

    entriesForObject(manifest, objectName) {
        const target = normName(objectName);
        return (manifest.textures || []).filter(
            (entry) => normName(entry.objectName) === target && ENGINE_SLOTS.has(entry.slot)
        );
    },

    resolveFilePath(manifestDir, entry, manifest) {
        const file = entry.file || splitPath(entry.path || '').file;
        if (!file) return null;

        const candidates = [];
        if (entry.path) {
            const abs = entry.path.replace(/\\/g, '/');
            if (/^[a-zA-Z]:\//.test(abs) || abs.startsWith('/')) {
                candidates.push(entry.path);
            } else {
                candidates.push(joinPath(manifestDir, entry.path));
                if (manifest?.exportDir) {
                    candidates.push(joinPath(manifestDir, '..', manifest.exportDir, file));
                }
            }
        }
        candidates.push(joinPath(manifestDir, file));
        if (manifest?.exportDir) {
            candidates.push(joinPath(manifestDir, manifest.exportDir, file));
        }

        return candidates.find(Boolean) || joinPath(manifestDir, file);
    },

    summarizeForObject(manifest, objectName) {
        const entries = this.entriesForObject(manifest, objectName);
        return entries.map((e) => `${e.slot}: ${e.file || e.path}`).join(' · ');
    },
};

function joinPath(...parts) {
    const cleaned = parts
        .filter(Boolean)
        .map((p) => String(p).replace(/\\/g, '/'))
        .join('/')
        .replace(/\/+/g, '/');
    return cleaned;
}

window.TextureManifest = TextureManifest;