import { ThresholdShell } from './thresholdShell.js';
import { BASE_PATH } from '../config.js';

const BUNDLE_ROOT = 'bundle';

function normalizeRel(relPath = '') {
    return String(relPath).replace(/\\/g, '/').replace(/^\/+/, '');
}

function joinBundle(...parts) {
    return normalizeRel(parts.filter(Boolean).join('/'));
}

/** Vite base always ends with / when set via `base` config */
function appBase() {
    const viteBase = import.meta.env.BASE_URL;
    const raw = (viteBase && viteBase !== './')
        ? viteBase
        : (BASE_PATH || '/');
    if (raw === './' || raw === '.') {
        // Electron / relative base — resolve from document
        try {
            return new URL('./', window.location.href).pathname.endsWith('/')
                ? new URL('./', window.location.href).href
                : `${new URL('./', window.location.href).href}/`;
        } catch {
            return './';
        }
    }
    return raw.endsWith('/') ? raw : `${raw}/`;
}

function looksLikeHtmlError(blob) {
    if (!blob || blob.size < 15) return false;
    const type = (blob.type || '').toLowerCase();
    return type.includes('text/html') || type.includes('text/plain');
}

export const AssetBundle = {
    /** Relative path inside dist-pages/bundle/ */
    toBundlePath(relPath) {
        const norm = normalizeRel(relPath);
        if (norm.startsWith(`${BUNDLE_ROOT}/`)) return norm;
        // Already a top-level public file
        if (norm.startsWith('assets/') || norm.startsWith('icons/') || norm.startsWith('basis/')) {
            return norm;
        }
        return joinBundle(BUNDLE_ROOT, norm);
    },

    /** URL for fetch in web / Capacitor WebView */
    getUrl(relPath) {
        const bundlePath = this.toBundlePath(relPath);
        return `${appBase()}${bundlePath}`;
    },

    /**
     * Alternate URLs if primary 404s (base path drift, missing bundle/ prefix).
     * @param {string} relPath
     * @returns {string[]}
     */
    urlCandidates(relPath) {
        const norm = normalizeRel(relPath);
        const base = appBase();
        const urls = [];
        const add = (u) => {
            if (u && !urls.includes(u)) urls.push(u);
        };

        add(this.getUrl(norm));

        // Without forcing bundle/ (for assets already rooted)
        add(`${base}${norm}`);

        // Explicit bundle + textures/import roots
        if (!norm.startsWith(`${BUNDLE_ROOT}/`)) {
            add(`${base}${BUNDLE_ROOT}/${norm}`);
        }
        if (norm.startsWith('textures/') || norm.startsWith('import/') || norm.startsWith('sounds/') || norm.startsWith('video/')) {
            add(`${base}${BUNDLE_ROOT}/${norm}`);
        }
        // Dev sometimes has files only under /textures (rare)
        if (norm.startsWith('textures/')) {
            add(`${base}${norm}`);
        }

        return urls;
    },

    /** Candidate filesystem paths for Electron (absolute paths tried by main process) */
    bundleCandidates(relPath) {
        const norm = normalizeRel(relPath);
        const candidates = [this.toBundlePath(norm)];
        if (!norm.startsWith('textures/') && !norm.startsWith('import/') && !norm.startsWith('video/') && !norm.startsWith('sounds/')) {
            candidates.push(joinBundle('textures', norm));
            candidates.push(joinBundle('import', norm));
            candidates.push(joinBundle('video', norm));
            candidates.push(joinBundle('sounds', norm));
        }
        if (norm.startsWith(`${BUNDLE_ROOT}/`)) {
            candidates.push(norm.replace(new RegExp(`^${BUNDLE_ROOT}/`), ''));
        }
        return [...new Set(candidates)];
    },

    async fetchBlob(relPath, { retries = 1 } = {}) {
        const urls = this.urlCandidates(relPath);
        let lastStatus = 0;
        for (const url of urls) {
            for (let attempt = 0; attempt <= retries; attempt += 1) {
                try {
                    const res = await fetch(url, { cache: 'force-cache' });
                    lastStatus = res.status;
                    if (!res.ok) {
                        // Retry transient CDN / rate-limit failures
                        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
                            await new Promise((r) => setTimeout(r, 200 + attempt * 300));
                            continue;
                        }
                        break;
                    }
                    const blob = await res.blob();
                    if (!blob?.size) break;
                    if (looksLikeHtmlError(blob)) break;
                    return blob;
                } catch (e) {
                    if (attempt < retries) {
                        await new Promise((r) => setTimeout(r, 200 + attempt * 300));
                        continue;
                    }
                    console.warn('[AssetBundle] fetch failed', url, e?.message || e);
                }
            }
        }
        if (lastStatus) {
            console.warn(`[AssetBundle] missing ${relPath} (last HTTP ${lastStatus}) tried:`, urls[0]);
        }
        return null;
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

    /**
     * Load asset as File. For PNG paths, try WebP first but fall back to PNG if WebP missing/bad.
     */
    async loadFile(relPath, fileName = null) {
        const norm = normalizeRel(relPath);
        const tries = [];
        if (/\.png$/i.test(norm)) {
            tries.push(norm.replace(/\.png$/i, '.webp'));
        }
        tries.push(norm);

        let lastErr = null;
        for (const pathTry of tries) {
            try {
                const name = fileName || pathTry.split(/[/\\]/).pop() || 'asset';
                if (ThresholdShell.isNative) {
                    const buf = await this.readBinary(pathTry);
                    if (!buf) continue;
                    const lower = name.toLowerCase();
                    let mime = 'application/octet-stream';
                    if (lower.endsWith('.png')) mime = 'image/png';
                    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
                    else if (lower.endsWith('.webp')) mime = 'image/webp';
                    else if (lower.endsWith('.glb')) mime = 'model/gltf-binary';
                    else if (lower.endsWith('.gltf')) mime = 'model/gltf+json';
                    else if (lower.endsWith('.mp4')) mime = 'video/mp4';
                    else if (lower.endsWith('.webm')) mime = 'video/webm';
                    else if (lower.endsWith('.m4v')) mime = 'video/mp4';
                    const blob = new Blob([buf], { type: mime });
                    if (looksLikeHtmlError(blob)) continue;
                    return new File([blob], name, { type: mime });
                }
                const blob = await this.fetchBlob(pathTry);
                if (!blob) continue;
                const lower = name.toLowerCase();
                let mime = blob.type || 'application/octet-stream';
                if (!mime || mime === 'application/octet-stream') {
                    if (lower.endsWith('.png')) mime = 'image/png';
                    else if (lower.endsWith('.webp')) mime = 'image/webp';
                    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
                }
                return new File([blob], name, { type: mime });
            } catch (e) {
                lastErr = e;
            }
        }
        if (lastErr) console.warn('[AssetBundle] loadFile', norm, lastErr);
        return null;
    },

    isEnabled() {
        return true;
    },

    _indexCache: null,

    async getIndex(force = false) {
        if (this._indexCache && !force) return this._indexCache;
        // Written to dist-pages/bundle/bundle-index.json by bundle:assets
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
