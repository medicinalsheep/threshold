export const GIMP_MANIFEST_FORMAT = 'threshold-gimp-manifest';
export const GIMP_MANIFEST_NAME = 'threshold_manifest.json';

const ENGINE_SLOTS = new Set(['albedo', 'roughness', 'metalness', 'normal']);

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

    resolveFilePathCandidates(manifestDir, entry, manifest) {
        const file = entry.file || splitPath(entry.path || '').file;
        if (!file) return [];

        const candidates = [];
        const add = (p) => {
            if (p && !candidates.includes(p)) candidates.push(p);
        };

        if (entry.path) {
            const abs = entry.path.replace(/\\/g, '/');
            if (/^[a-zA-Z]:\//.test(abs) || abs.startsWith('/')) {
                add(entry.path);
            } else {
                add(joinPath(manifestDir, entry.path));
                add(abs);
                if (manifest?.exportDir) {
                    add(joinPath(manifestDir, '..', manifest.exportDir, file));
                }
            }
        }
        add(joinPath(manifestDir, file));
        if (manifest?.exportDir) {
            add(joinPath(manifestDir, manifest.exportDir, file));
        }

        const rel = entry.path?.replace(/\\/g, '/') || `textures/${file}`;
        add(rel);
        add(`textures/${file}`);
        add(`bundle/textures/${file}`);
        add(`bundle/${rel}`);

        if (/\.png$/i.test(file)) {
            const webp = file.replace(/\.png$/i, '.webp');
            add(joinPath(manifestDir, webp));
            add(`textures/${webp}`);
            add(`bundle/textures/${webp}`);
        }

        return candidates;
    },

    resolveFilePath(manifestDir, entry, manifest) {
        const candidates = this.resolveFilePathCandidates(manifestDir, entry, manifest);
        return candidates[0] || null;
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