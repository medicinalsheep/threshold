import { ThresholdShell } from './thresholdShell.js';

const WORLD_FILTERS = [
    { name: 'Threshold Game', extensions: ['threshold-game.json', 'json'] },
];

function getFilesystem() {
    return window.Capacitor?.Plugins?.Filesystem || null;
}

export const NativeAssets = {
    get available() {
        return ThresholdShell.kind === 'capacitor' && !!getFilesystem();
    },

    async readText(uri) {
        const Fs = getFilesystem();
        if (!Fs) return null;
        const { data } = await Fs.readFile({ path: uri, directory: 'DOCUMENTS' });
        return typeof data === 'string' ? data : null;
    },

    async readBinary(uri) {
        const Fs = getFilesystem();
        if (!Fs) return null;
        const { data } = await Fs.readFile({ path: uri, directory: 'DOCUMENTS' });
        if (typeof data === 'string') {
            const binary = atob(data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes.buffer;
        }
        return null;
    },

    async listDocuments(subdir = '') {
        const Fs = getFilesystem();
        if (!Fs) return [];
        try {
            const { files } = await Fs.readdir({
                path: subdir || '',
                directory: 'DOCUMENTS',
            });
            return files || [];
        } catch {
            return [];
        }
    },

    /** Scaffold: pick a world manifest from device Documents (Capacitor Android/iOS). */
    async pickWorldManifest() {
        if (!this.available) {
            throw new Error('Device import requires Capacitor build with @capacitor/filesystem');
        }
        const files = await this.listDocuments();
        const manifests = files.filter(
            (f) => f.type === 'file' && /\.threshold-game\.json$/i.test(f.name || f.uri || '')
        );
        if (!manifests.length) {
            return { ok: false, message: 'No .threshold-game.json in Documents — copy manifest to device first' };
        }
        const pick = manifests[0];
        const path = pick.uri || pick.name;
        const text = await this.readText(path);
        if (!text) return { ok: false, message: 'Could not read manifest from device' };
        let manifest;
        try {
            manifest = JSON.parse(text);
        } catch {
            return { ok: false, message: 'Invalid manifest JSON on device' };
        }
        return { ok: true, manifest, path, message: `Loaded ${pick.name || path} from device` };
    },

    /** Scaffold: import bundled asset paths referenced in a game manifest. */
    async resolveManifestAssets(manifest) {
        const textures = manifest?.textures || [];
        const resolved = [];
        for (const entry of textures) {
            const rel = entry.path || entry.file;
            if (!rel) continue;
            resolved.push({ ...entry, bundlePath: rel.replace(/\\/g, '/') });
        }
        return { textures: resolved, note: 'Use AssetBundle.loadFile() for bundled paths in native builds' };
    },

    getWorldFilters() {
        return WORLD_FILTERS;
    },
};

window.NativeAssets = NativeAssets;