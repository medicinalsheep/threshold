import * as THREE from 'three';
import { TextureLibrary } from './textureLibrary.js';
import { ThresholdShell } from './thresholdShell.js';

const SLOT_PROPS = {
    albedo: 'map',
    roughness: 'roughnessMap',
    metalness: 'metalnessMap',
};

const IMAGE_FILTERS = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }];

const loader = new THREE.TextureLoader();
const urlCache = new Map();

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

    formatSlotStatus(textures = {}) {
        const parts = ['albedo', 'roughness', 'metalness'].map((slot) => {
            const id = textures[slot];
            if (!id) return `${slot}: —`;
            const meta = TextureLibrary.list().find((t) => t.id === id);
            const label = meta?.sourcePath?.split(/[/\\]/).pop() || meta?.name || id.slice(-6);
            return `${slot}: ${label}`;
        });
        return parts.join(' · ');
    },

    async previewUrlForSlot(textures = {}, slot = 'albedo') {
        const id = textures[slot];
        if (!id) return null;
        return this.getObjectUrl(id);
    },
};

window.TextureBridge = TextureBridge;