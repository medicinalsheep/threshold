import * as THREE from 'three';
import profilesConfig from '../../config/graphics-export-profiles.json';

const HILOD_RE = /_(512|1k|2k|4k)(\.[^.]+)$/i;
const SLOT_ORDER = ['albedo', 'roughness', 'metalness', 'normal'];
const DEFAULT_DISTANCES = [0, 8, 20];

const _camPos = new THREE.Vector3();
const _objPos = new THREE.Vector3();

export const TEXTURE_MAX_BY_TIER = {
    compatibility: 512,
    balanced: 1024,
    realistic: 2048,
    ultra: 4096,
    custom: 2048,
};

export function variantSuffix(fileName = '') {
    const m = String(fileName).match(/_(512|1k|2k|4k)(\.[^.]+)$/i);
    return m ? `_${m[1].toLowerCase()}` : '';
}

export function textureBaseKey(fileName = '') {
    return String(fileName).replace(HILOD_RE, '$2');
}

export function hasHilodSuffix(fileName = '') {
    return HILOD_RE.test(fileName);
}

export function preferenceOrder(textureMax, cfg = profilesConfig) {
    const key = String(textureMax);
    if (cfg.textureMaxPreference?.[key]) return cfg.textureMaxPreference[key];
    if (textureMax <= 512) return ['_512', ''];
    if (textureMax <= 1024) return ['_1k', '_512', ''];
    if (textureMax <= 2048) return ['_2k', '_1k', ''];
    return ['_4k', '_2k', '_1k', ''];
}

export function parseTextureFileName(fileName = '') {
    const lower = String(fileName).toLowerCase();
    let hilod = '';
    let stem = lower;

    const hilodMatch = lower.match(/_(512|1k|2k|4k)(\.[^.]+)$/i);
    if (hilodMatch) {
        hilod = `_${hilodMatch[1].toLowerCase()}`;
        stem = lower.slice(0, lower.length - hilod.length);
    }

    const exts = ['.png', '.jpg', '.jpeg', '.webp'];
    for (const slot of SLOT_ORDER) {
        const suffix = `_${slot}`;
        for (const ext of exts) {
            if (stem.endsWith(`${suffix}${ext}`)) {
                const slug = stem.slice(0, stem.length - suffix.length - ext.length);
                return { slot, slug, hilod, baseKey: textureBaseKey(lower) };
            }
        }
    }
    return null;
}

function ensureHilodUserData(obj) {
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.textureHilod) {
        obj.userData.textureHilod = {
            distances: [...DEFAULT_DISTANCES],
            activeBySlot: {},
            slots: {},
        };
    }
    return obj.userData.textureHilod;
}

function textureMaxForState() {
    const State = window.State;
    const tier = State?.graphicsTier || State?.graphicsDetectedTier || 'realistic';
    return TEXTURE_MAX_BY_TIER[tier] ?? TEXTURE_MAX_BY_TIER.realistic;
}

function pickLevel(distance, distances = DEFAULT_DISTANCES) {
    let level = 0;
    for (let i = 0; i < distances.length; i++) {
        if (distance >= distances[i]) level = i;
    }
    return Math.min(level, distances.length - 1);
}

export function pickSuffix(distance, distances, textureMax, availableSuffixes = ['']) {
    const order = preferenceOrder(textureMax);
    const available = order.filter((s) => availableSuffixes.includes(s));
    if (!available.length) return availableSuffixes[0] ?? '';
    const level = pickLevel(distance, distances);
    const idx = Math.min(level, available.length - 1);
    return available[idx];
}

export const TextureHilod = {
    DEFAULT_DISTANCES,
    HILOD_RE,
    SLOT_ORDER,

    textureMaxForState,

    registerVariant(obj, slot, path, texId = null) {
        if (!obj || !slot || !path) return;
        const hilod = ensureHilodUserData(obj);
        if (!hilod.slots[slot]) hilod.slots[slot] = {};
        const suffix = variantSuffix(path.split(/[/\\]/).pop() || path);
        hilod.slots[slot][suffix] = { path, texId };
    },

    availableSuffixes(obj, slot) {
        const slots = obj?.userData?.textureHilod?.slots?.[slot];
        if (!slots) return [''];
        return Object.keys(slots).sort((a, b) => {
            const order = preferenceOrder(4096);
            return order.indexOf(a) - order.indexOf(b);
        });
    },

    async discoverVariants(obj, slot, basePath, loadFn = null) {
        if (!basePath || !loadFn) return;
        const fileName = basePath.split(/[/\\]/).pop() || basePath;
        const base = textureBaseKey(fileName);
        const dir = basePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '');
        const suffixes = ['_512', '_1k', '_2k', '_4k'];
        const exts = ['.png', '.jpg', '.jpeg', '.webp'];
        const ext = exts.find((e) => base.toLowerCase().endsWith(e)) || '.png';
        const stem = base.slice(0, -ext.length);

        for (const suf of suffixes) {
            const variantName = `${stem}${suf}${ext}`;
            const variantPath = dir ? `${dir}/${variantName}` : variantName;
            try {
                const record = await loadFn(variantPath).catch(() => null);
                if (record) this.registerVariant(obj, slot, variantPath, record.id);
            } catch {
                /* variant optional */
            }
        }
    },

    async applySuffix(obj, slot, suffix, TextureBridge) {
        const hilod = obj?.userData?.textureHilod;
        const entry = hilod?.slots?.[slot]?.[suffix];
        if (!entry) return false;

        if (!entry.texId && entry.path) {
            try {
                const record = await TextureBridge.loadFileFromPath(entry.path);
                entry.texId = record.id;
            } catch {
                return false;
            }
        }
        if (!entry.texId) return false;

        await TextureBridge.applySlot(obj, slot, entry.texId);
        if (!obj.userData.textures) obj.userData.textures = {};
        obj.userData.textures[slot] = entry.texId;
        hilod.activeBySlot[slot] = suffix;
        return true;
    },

    async updateObject(obj, camera, TextureBridge) {
        if (!obj?.material || !obj.userData?.textureHilod?.slots) return;
        const distances = obj.userData.textureHilod.distances || DEFAULT_DISTANCES;
        const textureMax = textureMaxForState();
        camera.getWorldPosition(_camPos);
        obj.getWorldPosition(_objPos);
        const dist = _camPos.distanceTo(_objPos);

        for (const slot of Object.keys(obj.userData.textureHilod.slots)) {
            const available = this.availableSuffixes(obj, slot);
            const suffix = pickSuffix(dist, distances, textureMax, available);
            if (obj.userData.textureHilod.activeBySlot[slot] === suffix) continue;
            await this.applySuffix(obj, slot, suffix, TextureBridge);
        }
    },

    update(camera = window.Engine?.camera) {
        const State = window.State;
        const TextureBridge = window.TextureBridge;
        if (!camera || !State?.objects || !TextureBridge) return;

        const tasks = State.objects
            .filter((o) => o?.userData?.textureHilod?.slots && Object.keys(o.userData.textureHilod.slots).length)
            .map((o) => this.updateObject(o, camera, TextureBridge));
        return Promise.all(tasks);
    },

    async refreshAll() {
        const State = window.State;
        if (!State?.objects) return;
        for (const obj of State.objects) {
            const hilod = obj.userData?.textureHilod;
            if (!hilod?.activeBySlot) continue;
            Object.keys(hilod.activeBySlot).forEach((slot) => {
                delete hilod.activeBySlot[slot];
            });
        }
        return this.update(window.Engine?.camera);
    },

    collectExportEntries(objects = []) {
        const entries = [];
        objects.forEach((obj) => {
            const hilod = obj.userData?.textureHilod;
            if (!hilod?.slots) return;
            Object.entries(hilod.slots).forEach(([slot, variants]) => {
                const variantList = Object.entries(variants).map(([suffix, v]) => ({
                    suffix: suffix || 'full',
                    path: v.path,
                    texId: v.texId || null,
                }));
                if (!variantList.length) return;
                entries.push({
                    objectName: obj.userData?.name || null,
                    objectId: obj.userData?.id || null,
                    slot,
                    activeSuffix: hilod.activeBySlot?.[slot] ?? '',
                    variants: variantList,
                });
            });
        });
        return entries;
    },
};

window.TextureHilod = TextureHilod;