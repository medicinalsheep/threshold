import * as THREE from 'three';
import { TextureLibrary } from './textureLibrary.js';
import { TextureManifest } from './textureManifest.js';
import { ThresholdShell } from './thresholdShell.js';
import { AssetBundle } from './assetBundle.js';
import { CREATIVE_WATCH_URL } from '../config.js';
import { TextureHilod, parseTextureFileName } from './textureHilod.js';
import { NativeTextureCodec } from './nativeTextureCodec.js';
import { finishMaterial, resolveFinishSettings } from './starterTex.js';

const SLOT_PROPS = {
    albedo: 'map',
    roughness: 'roughnessMap',
    metalness: 'metalnessMap',
    normal: 'normalMap',
};

const SLOT_ORDER = ['albedo', 'roughness', 'metalness', 'normal'];

const IMAGE_FILTERS = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'ktx2'] }];
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
    return parseTextureFileName(fileName);
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
    if (lower.endsWith('.ktx2')) return 'image/ktx2';
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
        const resolvedPath = await NativeTextureCodec.resolveSourcePath(filePath);
        const name = resolvedPath.split(/[/\\]/).pop();
        const mime = mimeFromPath(resolvedPath);

        if (ThresholdShell.isNative) {
            let buf = await ThresholdShell.readBinary(resolvedPath);
            if (!buf) buf = await AssetBundle.readBinary(resolvedPath);
            if (!buf) return null;
            const blob = new Blob([buf], { type: mime });
            const file = new File([blob], name, { type: mime });
            return TextureLibrary.saveFromFile(file, {
                name,
                sourcePath: resolvedPath,
                ktx2Path: resolvedPath !== filePath ? resolvedPath : null,
            });
        }

        const bundleFile = await AssetBundle.loadFile(resolvedPath, name);
        if (bundleFile) {
            return TextureLibrary.saveFromFile(bundleFile, {
                name,
                sourcePath: resolvedPath,
                ktx2Path: resolvedPath !== filePath ? resolvedPath : null,
            });
        }

        throw new Error('Load from disk requires Threshold desktop (Electron) build or bundled assets');
    },

    async applyPathToObject(obj, slot, filePath) {
        if (!obj?.material || !SLOT_PROPS[slot] || !filePath) return null;
        const record = await this.loadFileFromPath(filePath);
        await this.applySlot(obj, slot, record.id);
        const textures = ensureTexturesUserData(obj);
        textures[slot] = record.id;
        TextureHilod.registerVariant(obj, slot, filePath, record.id);
        TextureHilod.discoverVariants(obj, slot, filePath, (p) => this.loadFileFromPath(p));
        TextureHilod.discoverVariantsFromBundle(obj);
        if (slot === 'albedo') obj.userData.textureHint = filePath;
        return record;
    },

    async pickWebTextureBatch(entries = []) {
        const needed = entries
            .map((e) => e.file || e.path?.split(/[/\\]/).pop())
            .filter(Boolean);
        const hint = needed.length ? needed.join(', ') : 'texture maps';
        const input = document.getElementById('insp-texture-batch');
        if (!input) return null;
        return new Promise((resolve) => {
            const onChange = () => {
                input.removeEventListener('change', onChange);
                const files = [...(input.files || [])];
                input.value = '';
                resolve(files.length ? files : null);
            };
            input.addEventListener('change', onChange);
            window.UI?.status?.(`Select map files: ${hint}`);
            input.click();
        });
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
            const batch = await this.pickWebTextureBatch(entries);
            if (!batch?.length) {
                const summary = TextureManifest.summarizeForObject(manifest, obj.userData?.name);
                obj.userData.textureHint = entries.find((e) => e.slot === 'albedo')?.path
                    || entries[0]?.path
                    || obj.userData.textureHint;
                return {
                    applied: 0,
                    entries,
                    message: `Manifest loaded (web): ${summary}. Pick maps via GIMP SYNC again to batch-apply.`,
                };
            }

            let applied = 0;
            const errors = [];
            const fileByName = new Map(batch.map((f) => [f.name.toLowerCase(), f]));

            for (const entry of entries) {
                const fileName = (entry.file || entry.path?.split(/[/\\]/).pop() || '').toLowerCase();
                const file = fileByName.get(fileName)
                    || batch.find((f) => f.name.toLowerCase().endsWith(fileName));
                if (!file) {
                    errors.push(`${entry.slot}: ${fileName || 'missing'}`);
                    continue;
                }
                try {
                    const record = await TextureLibrary.saveFromFile(file, {
                        name: file.name,
                        sourcePath: entry.path || file.name,
                    });
                    await this.applySlot(obj, entry.slot, record.id);
                    const textures = ensureTexturesUserData(obj);
                    textures[entry.slot] = record.id;
                    const srcPath = entry.path || file.name;
                    TextureHilod.registerVariant(obj, entry.slot, srcPath, record.id);
                    for (const variant of entry.variants || []) {
                        const vPath = variant.path || srcPath.replace(
                            /(\.[^.]+)$/i,
                            `${variant.suffix || ''}$1`
                        );
                        TextureHilod.registerVariant(obj, entry.slot, vPath, null);
                    }
                    applied += 1;
                } catch (e) {
                    errors.push(`${entry.slot}: ${e.message || file.name}`);
                }
            }

            const albedo = entries.find((e) => e.slot === 'albedo');
            if (albedo?.path) obj.userData.textureHint = albedo.path;

            return {
                applied,
                entries,
                errors,
                message: applied
                    ? `GIMP SYNC (web): ${applied} map(s) applied — ${obj.userData?.name}`
                    : `GIMP SYNC (web) failed — ${errors.join('; ') || 'no files matched'}`,
            };
        }

        let applied = 0;
        const errors = [];
        for (const entry of entries) {
            const candidates = TextureManifest.resolveFilePathCandidates(manifestDir, entry, manifest);
            let lastErr = null;
            let ok = false;
            for (const filePath of candidates) {
                try {
                    await this.applyPathToObject(obj, entry.slot, filePath);
                    applied += 1;
                    ok = true;
                    break;
                } catch (e) {
                    lastErr = e;
                }
            }
            if (!ok) {
                errors.push(`${entry.slot}: ${lastErr?.message || candidates[0] || 'not found'}`);
            } else {
                for (const variant of entry.variants || []) {
                    const vCandidates = TextureManifest.resolveFilePathCandidates(manifestDir, {
                        ...entry,
                        file: variant.file,
                        path: variant.path,
                    }, manifest);
                    for (const vPath of vCandidates) {
                        try {
                            const vRecord = await this.loadFileFromPath(vPath);
                            TextureHilod.registerVariant(obj, entry.slot, vPath, vRecord.id);
                            break;
                        } catch {
                            /* optional variant */
                        }
                    }
                }
            }
        }

        obj.userData.gimpManifestPath = options.manifestPath || null;
        TextureHilod.registerFromManifestEntries(obj, entries);
        await TextureHilod.discoverVariantsFromBundle(obj);
        const albedo = entries.find((e) => e.slot === 'albedo');
        if (albedo?.path) obj.userData.textureHint = albedo.path;
        if (applied) finishMaterial(obj, resolveFinishSettings(obj));

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

        const meta = await TextureLibrary.getMeta(texId);
        const sourcePath = meta?.sourcePath || meta?.path || '';
        const resolvedPath = sourcePath
            ? await NativeTextureCodec.resolveSourcePath(sourcePath, meta)
            : '';
        const isKtx2 = /\.ktx2$/i.test(resolvedPath);

        let loadUrl = await this.getObjectUrl(texId);
        if (!loadUrl) return false;
        if (resolvedPath && resolvedPath !== sourcePath) {
            const blob = await AssetBundle.fetchBlob(resolvedPath);
            if (blob) loadUrl = URL.createObjectURL(blob);
            else if (ThresholdShell.isNative) {
                const buf = await AssetBundle.readBinary(resolvedPath);
                if (buf) {
                    loadUrl = URL.createObjectURL(new Blob([buf], { type: mimeFromPath(resolvedPath) }));
                }
            }
        }

        disposeMap(mat, prop);
        const texture = await NativeTextureCodec.loadTextureFromUrl(loadUrl, { isKtx2 });
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        if (slot === 'albedo' && THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
        }
        mat[prop] = texture;
        if (slot === 'normal' && mat.normalScale) {
            mat.normalScale.set(1, 1);
        }
        mat.needsUpdate = true;
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

    formatSlotStatus(textures = {}, hint = '', hilodActive = {}) {
        const lines = [];
        if (hint) lines.push(`hint: ${hint.split(/[/\\]/).pop() || hint}`);
        const hilod = hilodActive || {};
        const parts = SLOT_ORDER.map((slot) => {
            const id = textures[slot];
            if (!id) return `${slot}: —`;
            const meta = TextureLibrary.list().find((t) => t.id === id);
            const label = meta?.sourcePath?.split(/[/\\]/).pop() || meta?.name || id.slice(-6);
            const tier = hilod[slot] ? ` [${hilod[slot] || 'full'}]` : '';
            return `${slot}: ${label}${tier}`;
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

        const filePath = event.path || record.meta?.sourcePath || event.file;
        const hilodSuffix = event.hilod ?? parseTextureFile(event.file || '')?.hilod ?? '';

        let applied = 0;
        for (const obj of targets) {
            const textures = ensureTexturesUserData(obj);
            TextureHilod.registerVariant(obj, slot, filePath, record.id);
            const activeSuffix = obj.userData.textureHilod?.activeBySlot?.[slot];
            const shouldApply = activeSuffix == null || activeSuffix === hilodSuffix;
            if (shouldApply) {
                if (textures[slot]) revokeCachedUrl(textures[slot]);
                await this.applySlot(obj, slot, record.id);
                textures[slot] = record.id;
                if (obj.userData.textureHilod) obj.userData.textureHilod.activeBySlot[slot] = hilodSuffix;
            }
            if (slot === 'albedo' && shouldApply) obj.userData.textureHint = filePath;
            if (shouldApply) finishMaterial(obj, resolveFinishSettings(obj));
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
            for (const obj of window.State?.objects || []) {
                if (obj?.material) finishMaterial(obj, resolveFinishSettings(obj));
            }
            if (applied) window.UI?.status?.(`GIMP live SYNC: ${applied} map(s)`);
            return { applied };
        } catch (e) {
            window.UI?.status?.(e.message || 'Manifest hot-reload failed');
            return null;
        }
    },
};

window.TextureBridge = TextureBridge;