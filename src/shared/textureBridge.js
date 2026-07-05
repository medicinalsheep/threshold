import * as THREE from 'three';
import { TextureLibrary } from './textureLibrary.js';
import { TextureManifest } from './textureManifest.js';
import { ThresholdShell } from './thresholdShell.js';
import { CREATIVE_WATCH_URL } from '../config.js';

const SLOT_PROPS = {
    albedo: 'map',
    roughness: 'roughnessMap',
    metalness: 'metalnessMap',
};

const IMAGE_FILTERS = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }];
const MANIFEST_FILTERS = [
    { name: 'Threshold GIMP Manifest', extensions: ['json'] },
    { name: 'JSON', extensions: ['json'] },
];

const loader = new THREE.TextureLoader();
const urlCache = new Map();

function slugify(name = '') {
    return String(name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'object';
}

function parseTextureFile(fileName = '') {
    const lower = fileName.toLowerCase();
    for (const slot of ['albedo', 'roughness', 'metalness']) {
        const suffix = `_${slot}`;
        const exts = ['.png', '.jpg', '.jpeg', '.webp'];
        for (const ext of exts) {
            if (lower.endsWith(`${suffix}${ext}`)) {
                const slug = lower.slice(0, lower.length - suffix.length - ext.length);
                return { slot, slug };
            }
        }
    }
    return null;
}

function revokeCachedUrl(texId) {
    const url = urlCache.get(texId);
    if (url) URL.revokeObjectURL(url);
    urlCache.delete(texId);
}

function findObjectsForTextureWatch(event = {}) {
    const State = window.State;
    if (!State?.objects) return [];
    const slug = event.slug || (event.file ? parseTextureFile(event.file)?.slug : null);
    const base = event.file?.split(/[/\\]/).pop();

    return State.objects.filter((obj) => {
        if (!obj.material) return false;
        if (slug && slugify(obj.userData?.name) === slug) return true;
        if (base && obj.userData?.textureHint?.includes(base)) return true;
        return false;
    });
}

function mimeFromPath(filePath = '') {
    const lower = filePath.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
}

function disposeMap(mat, prop) {
    const tex = mat?.[prop];
    if (tex) {
        tex.dispose();
        mat[prop] = null;
        mat.needsUpdate = true;
    }
}

function ensureTexturesUserData(obj) {
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.textures) obj.userData.textures = {};
    return obj.userData.textures;
}

export const TextureBridge = {
    async getObjectUrl(id) {
        if (!id) return null;
        if (urlCache.has(id)) return urlCache.get(id);
        const blob = await TextureLibrary.getBlob(id);
        if (!blob) return null;
        const url = URL.createObjectURL(blob);
        urlCache.set(id, url);
        return url;
    },

    async pickImageFile() {
        if (ThresholdShell.isNative) {
            const filePath = await ThresholdShell.pickFile(IMAGE_FILTERS);
            if (!filePath) return null;
            const api = window.ThresholdShell;
            if (api?.fs?.readBinary) {
                const buf = await api.fs.readBinary(filePath);
                const mime = mimeFromPath(filePath);
                const name = filePath.split(/[/\\]/).pop();
                const blob = new Blob([buf], { type: mime });
                const file = new File([blob], name, { type: mime });
                return { file, sourcePath: filePath };
            }
        }

        const input = document.getElementById('insp-texture-file');
        if (!input) return null;
        return new Promise((resolve) => {
            const onChange = () => {
                input.removeEventListener('change', onChange);
                const picked = input.files?.[0];
                input.value = '';
                resolve(picked ? { file: picked, sourcePath: picked.name } : null);
            };
            input.addEventListener('change', onChange);
            input.click();
        });
    },

    async loadFileFromPath(filePath) {
        if (!filePath) return null;
        if (ThresholdShell.isNative) {
            const buf = await ThresholdShell.readBinary(filePath);
            if (!buf) return null;
            const mime = mimeFromPath(filePath);
            const name = filePath.split(/[/\\]/).pop();
            const blob = new Blob([buf], { type: mime });
            const file = new File([blob], name, { type: mime });
            return TextureLibrary.saveFromFile(file, { name, sourcePath: filePath });
        }
        throw new Error('Load from disk requires Threshold desktop (Electron) build');
    },

    async applyPathToObject(obj, slot, filePath) {
        if (!obj?.material || !SLOT_PROPS[slot] || !filePath) return null;
        const record = await this.loadFileFromPath(filePath);
        await this.applySlot(obj, slot, record.id);
        const textures = ensureTexturesUserData(obj);
        textures[slot] = record.id;
        if (slot === 'albedo') obj.userData.textureHint = filePath;
        return record;
    },

    async pickManifestPayload() {
        if (ThresholdShell.isNative) {
            const manifestPath = await ThresholdShell.pickFile(MANIFEST_FILTERS);
            if (!manifestPath) return null;
            const text = await ThresholdShell.readText(manifestPath);
            if (!text) return null;
            const manifestDir = manifestPath.replace(/\\/g, '/').replace(/\/[^/]+$/, '');
            return { text, manifestDir, manifestPath };
        }

        const input = document.getElementById('insp-texture-manifest');
        if (!input) return null;
        return new Promise((resolve) => {
            const onChange = () => {
                input.removeEventListener('change', onChange);
                const file = input.files?.[0];
                input.value = '';
                if (!file) {
                    resolve(null);
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    resolve({
                        text: reader.result,
                        manifestDir: '',
                        manifestPath: file.name,
                        webOnly: true,
                    });
                };
                reader.onerror = () => resolve(null);
                reader.readAsText(file);
            };
            input.addEventListener('change', onChange);
            input.click();
        });
    },

    async applyFromGimpManifest(obj, manifest, manifestDir, options = {}) {
        const entries = TextureManifest.entriesForObject(manifest, obj.userData?.name);
        if (!entries.length) {
            return {
                applied: 0,
                entries: [],
                message: `No maps in manifest for "${obj.userData?.name || 'object'}"`,
            };
        }

        if (options.webOnly || !ThresholdShell.isNative) {
            const summary = TextureManifest.summarizeForObject(manifest, obj.userData?.name);
            obj.userData.textureHint = entries.find((e) => e.slot === 'albedo')?.path
                || entries[0]?.path
                || obj.userData.textureHint;
            return {
                applied: 0,
                entries,
                message: `Manifest loaded (web): ${summary}. Import each file via ALBEDO/ROUGH/METAL.`,
            };
        }

        let applied = 0;
        const errors = [];
        for (const entry of entries) {
            const filePath = TextureManifest.resolveFilePath(manifestDir, entry, manifest);
            try {
                await this.applyPathToObject(obj, entry.slot, filePath);
                applied += 1;
            } catch (e) {
                errors.push(`${entry.slot}: ${e.message || filePath}`);
            }
        }

        obj.userData.gimpManifestPath = options.manifestPath || null;
        const albedo = entries.find((e) => e.slot === 'albedo');
        if (albedo?.path) obj.userData.textureHint = albedo.path;

        return {
            applied,
            entries,
            errors,
            message: applied
                ? `GIMP SYNC: ${applied} map(s) applied to ${obj.userData?.name}`
                : `GIMP SYNC failed — ${errors.join('; ') || 'files not found'}`,
        };
    },

    async pickAndApplyGimpManifest(obj) {
        const payload = await this.pickManifestPayload();
        if (!payload?.text) return null;
        const manifest = TextureManifest.parse(payload.text);
        return this.applyFromGimpManifest(obj, manifest, payload.manifestDir, {
            manifestPath: payload.manifestPath,
            webOnly: payload.webOnly,
        });
    },

    async pickAndApplyToObject(obj, slot) {
        if (!obj?.material || !SLOT_PROPS[slot]) return null;
        const picked = await this.pickImageFile();
        if (!picked?.file) return null;

        const record = await TextureLibrary.saveFromFile(picked.file, {
            name: picked.file.name,
            sourcePath: picked.sourcePath,
        });
        await this.applySlot(obj, slot, record.id);
        const textures = ensureTexturesUserData(obj);
        textures[slot] = record.id;
        if (picked.sourcePath) obj.userData.textureHint = picked.sourcePath;
        return record;
    },

    async applySlot(mesh, slot, texId) {
        const mat = mesh?.material;
        const prop = SLOT_PROPS[slot];
        if (!mat || !prop || !texId) return false;

        const url = await this.getObjectUrl(texId);
        if (!url) return false;

        disposeMap(mat, prop);
        const texture = await new Promise((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
        });
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        if (slot === 'albedo' && THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
        }
        mat[prop] = texture;
        if (slot === 'albedo') mat.needsUpdate = true;
        return true;
    },

    async applyFromUserData(mesh) {
        const tex = mesh?.userData?.textures;
        if (!tex || !mesh.material) return;
        for (const slot of Object.keys(SLOT_PROPS)) {
            if (tex[slot]) await this.applySlot(mesh, slot, tex[slot]);
        }
    },

    async rehydrateScene(objects = window.State?.objects || []) {
        const tasks = objects
            .filter((m) => m?.userData?.textures && m.material)
            .map((m) => this.applyFromUserData(m));
        await Promise.all(tasks);
    },

    clearMaps(mesh) {
        const mat = mesh?.material;
        if (!mat) return;
        Object.values(SLOT_PROPS).forEach((prop) => disposeMap(mat, prop));
        if (mesh.userData) {
            delete mesh.userData.textures;
            delete mesh.userData.textureHint;
        }
    },

    formatSlotStatus(textures = {}, hint = '') {
        const lines = [];
        if (hint) lines.push(`hint: ${hint.split(/[/\\]/).pop() || hint}`);
        const parts = ['albedo', 'roughness', 'metalness'].map((slot) => {
            const id = textures[slot];
            if (!id) return `${slot}: —`;
            const meta = TextureLibrary.list().find((t) => t.id === id);
            const label = meta?.sourcePath?.split(/[/\\]/).pop() || meta?.name || id.slice(-6);
            return `${slot}: ${label}`;
        });
        lines.push(parts.join(' · '));
        return lines.join('\n');
    },

    async previewUrlForSlot(textures = {}, slot = 'albedo') {
        const id = textures[slot];
        if (!id) return null;
        return this.getObjectUrl(id);
    },

    async loadFromWatchSource(event) {
        const fileName = event.file || event.path?.split(/[/\\]/).pop() || 'texture.png';
        if (!event.watchUrl) {
            throw new Error('No watch source — run npm run textures:watch');
        }
        const res = await fetch(`${event.watchUrl}${event.watchUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
        if (!res.ok) throw new Error(`Watch fetch failed: ${fileName}`);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: blob.type || mimeFromPath(fileName) });
        return TextureLibrary.saveFromFile(file, {
            name: fileName,
            sourcePath: event.path || fileName,
        });
    },

    async hotReloadFromWatch(event = {}) {
        const parsed = parseTextureFile(event.file || '') || {};
        const slot = event.slot || parsed.slot;
        if (!slot) return { applied: 0, message: `Skipped ${event.file || event.path} — unknown slot` };

        const targets = findObjectsForTextureWatch({ ...event, slug: event.slug || parsed.slug });
        if (!targets.length) {
            return { applied: 0, message: `No mesh matched ${event.file || event.path}` };
        }

        let record;
        try {
            record = await this.loadFromWatchSource(event);
        } catch (e) {
            window.UI?.status?.(e.message || 'Texture hot-reload failed');
            return { applied: 0, error: e };
        }

        let applied = 0;
        for (const obj of targets) {
            const textures = ensureTexturesUserData(obj);
            if (textures[slot]) revokeCachedUrl(textures[slot]);
            await this.applySlot(obj, slot, record.id);
            textures[slot] = record.id;
            if (slot === 'albedo') obj.userData.textureHint = event.path || record.meta?.sourcePath;
            applied += 1;
        }

        const msg = `Hot-reloaded ${event.file || slot} on ${applied} object(s)`;
        window.UI?.status?.(msg);
        if (window.State?.selectedObject) window.UI?.syncTextureInspector?.(window.State.selectedObject);
        return { applied, message: msg };
    },

    async hotReloadManifestFromWatch(event = {}) {
        if (!event.watchUrl) return null;
        try {
            const res = await fetch(`${event.watchUrl}?t=${Date.now()}`);
            const manifest = TextureManifest.parse(await res.text());
            const base = CREATIVE_WATCH_URL.replace(/\/$/, '');
            let applied = 0;
            for (const obj of window.State?.objects || []) {
                const entries = TextureManifest.entriesForObject(manifest, obj.userData?.name);
                for (const entry of entries) {
                    const assetPath = (entry.path || `textures/${entry.file}`).replace(/\\/g, '/');
                    const result = await this.hotReloadFromWatch({
                        type: 'texture',
                        file: entry.file,
                        path: assetPath,
                        slot: entry.slot,
                        watchUrl: `${base}/asset?path=${encodeURIComponent(assetPath)}`,
                    });
                    applied += result?.applied || 0;
                }
            }
            if (applied) window.UI?.status?.(`GIMP manifest hot-reload: ${applied} map(s)`);
            return { applied };
        } catch (e) {
            window.UI?.status?.(e.message || 'Manifest hot-reload failed');
            return null;
        }
    },
};

window.TextureBridge = TextureBridge;