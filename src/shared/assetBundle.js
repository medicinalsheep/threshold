import { ThresholdShell } from './thresholdShell.js';
import { BASE_PATH } from '../config.js';

const BUNDLE_ROOT = 'bundle';

function normalizeRel(relPath = '') {
    return String(relPath).replace(/\\/g, '/').replace(/^\/+/, '');
}

function joinBundle(...parts) {
    return normalizeRel(parts.filter(Boolean).join('/'));
}

export const AssetBundle = {
    /** Relative path inside dist-pages/bundle/ */
    toBundlePath(relPath) {
        const norm = normalizeRel(relPath);
        if (norm.startsWith(`${BUNDLE_ROOT}/`)) return norm;
        return joinBundle(BUNDLE_ROOT, norm);
    },

    /** URL for fetch in web / Capacitor WebView */
    getUrl(relPath) {
        const bundlePath = this.toBundlePath(relPath);
        const base = BASE_PATH.endsWith('/') ? BASE_PATH : `${BASE_PATH}/`;
        return `${base}${bundlePath}`;
    },

    /** Candidate filesystem paths for Electron (absolute paths tried by main process) */
    bundleCandidates(relPath) {
        const norm = normalizeRel(relPath);
        const candidates = [this.toBundlePath(norm)];
        if (!norm.startsWith('textures/') && !norm.startsWith('import/')) {
            candidates.push(joinBundle('textures', norm));
            candidates.push(joinBundle('import', norm));
        }
        return [...new Set(candidates)];
    },

    async fetchBlob(relPath) {
        const url = this.getUrl(relPath);
        const res = await fetch(url);
        if (!res.ok) return null;
        return res.blob();
    },

    async readBinary(relPath) {
        if (ThresholdShell.isNative) {
            const api = window.ThresholdShell;
            if (api?.bundle?.readBinary) {
                for (const candidate of this.bundleCandidates(relPath)) {
                    const buf = await api.bundle.readBinary(candidate);
                    if (buf) return buf;
                }
            }
            return null;
        }
        const blob = await this.fetchBlob(relPath);
        if (!blob) return null;
        return blob.arrayBuffer();
    },

    async loadFile(relPath, fileName = null) {
        const name = fileName || relPath.split(/[/\\]/).pop() || 'asset';
        if (ThresholdShell.isNative) {
            const buf = await this.readBinary(relPath);
            if (!buf) return null;
            const lower = name.toLowerCase();
            let mime = 'application/octet-stream';
            if (lower.endsWith('.png')) mime = 'image/png';
            else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
            else if (lower.endsWith('.webp')) mime = 'image/webp';
            else if (lower.endsWith('.glb')) mime = 'model/gltf-binary';
            else if (lower.endsWith('.gltf')) mime = 'model/gltf+json';
            const blob = new Blob([buf], { type: mime });
            return new File([blob], name, { type: mime });
        }
        const blob = await this.fetchBlob(relPath);
        if (!blob) return null;
        return new File([blob], name, { type: blob.type || 'application/octet-stream' });
    },

    isEnabled() {
        return true;
    },

    _indexCache: null,

    async getIndex(force = false) {
        if (this._indexCache && !force) return this._indexCache;
        const blob = await this.fetchBlob('bundle-index.json');
        if (!blob) return null;
        try {
            const text = await blob.text();
            this._indexCache = JSON.parse(text);
            return this._indexCache;
        } catch {
            return null;
        }
    },

    clearIndexCache() {
        this._indexCache = null;
    },
};

window.AssetBundle = AssetBundle;