import * as THREE from 'three';
import { LOD_DISTANCES } from './lodConfig.js';
import {
    HILOD_RE,
    SLOT_ORDER,
    variantSuffix,
    textureBaseKey,
    preferenceOrder,
    parseTextureFileName,
    pickSuffix,
    groupTextureFiles,
} from './hilodUtils.js';

const _camPos = new THREE.Vector3();
const _objPos = new THREE.Vector3();
const UPDATE_INTERVAL_MS = 280;
let _lastUpdateMs = 0;
let _lastTier = null;
let _lastCamKey = '';

export const TEXTURE_MAX_BY_TIER = {
    compatibility: 1024,
    balanced: 2048,
    realistic: 2048,
    ultra: 4096,
    custom: 2048,
};

export { parseTextureFileName, variantSuffix, textureBaseKey, pickSuffix, groupTextureFiles };

function slugify(name = '') {
    return String(name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'object';
}

function ensureHilodUserData(obj) {
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.textureHilod) {
        obj.userData.textureHilod = {
            distances: [...LOD_DISTANCES],
            activeBySlot: {},
            slots: {},
        };
    }
    if (!obj.userData.textureHilod.distances?.length) {
        obj.userData.textureHilod.distances = [...LOD_DISTANCES];
    }
    return obj.userData.textureHilod;
}

function textureMaxForState() {
    const State = window.State;
    const tier = State?.graphicsTier || State?.graphicsDetectedTier || 'realistic';
    return TEXTURE_MAX_BY_TIER[tier] ?? TEXTURE_MAX_BY_TIER.realistic;
}

function shouldRunUpdate(camera) {
    const now = performance.now();
    const tier = window.State?.graphicsTier;
    const camKey = camera
        ? `${camera.position.x.toFixed(0)}|${camera.position.y.toFixed(0)}|${camera.position.z.toFixed(0)}`
        : '';
    if (now - _lastUpdateMs < UPDATE_INTERVAL_MS && tier === _lastTier && camKey === _lastCamKey) {
        return false;
    }
    _lastUpdateMs = now;
    _lastTier = tier;
    _lastCamKey = camKey;
    return true;
}

export const TextureHilod = {
    DEFAULT_DISTANCES: LOD_DISTANCES,
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

    registerFromManifestEntries(obj, entries = []) {
        entries.forEach((entry) => {
            const path = entry.path || `textures/${entry.file}`;
            this.registerVariant(obj, entry.slot, path, null);
            (entry.variants || []).forEach((variant) => {
                const vPath = variant.path || path.replace(/(\.[^.]+)$/i, `${variant.suffix || ''}$1`);
                this.registerVariant(obj, entry.slot, vPath, null);
            });
        });
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
        const suffixes = ['_1k', '_2k', '_4k'];
        const exts = ['.png', '.jpg', '.jpeg', '.webp', '.ktx2'];
        const ext = exts.find((e) => base.toLowerCase().endsWith(e)) || '.png';
        const stem = base.slice(0, -ext.length);

        for (const suf of suffixes) {
            const variantName = `${stem}${suf}${ext}`;
            const variantPath = dir ? `${dir}/${variantName}` : variantName;
            try {
                const record = await loadFn(variantPath).catch(() => null);
                if (record) this.registerVariant(obj, slot, variantPath, record.id);
            } catch {
                /* optional */
            }
        }
    },

    async discoverVariantsFromBundle(obj) {
        const AssetBundle = window.AssetBundle;
        if (!AssetBundle?.getIndex) return;
        const index = await AssetBundle.getIndex();
        const groups = index?.textureGroups;
        if (!groups?.length) return;

        const slug = slugify(obj.userData?.name);
        for (const group of groups) {
            if (group.slug !== slug) continue;
            for (const variant of group.variants) {
                const rel = variant.path || `textures/${variant.file}`;
                this.registerVariant(obj, variant.slot, rel, null);
            }
        }
    },

    async loadSlotVariants(obj, TextureBridge) {
        const hilod = obj?.userData?.textureHilod;
        if (!hilod?.slots || !TextureBridge) return;
        for (const slot of Object.keys(hilod.slots)) {
            for (const entry of Object.values(hilod.slots[slot])) {
                if (!entry?.path || entry.texId) continue;
                try {
                    const record = await TextureBridge.loadFileFromPath(entry.path);
                    entry.texId = record.id;
                } catch {
                    /* optional variant */
                }
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
        // Floors / heroes / avatars: keep a stable map — distance thrash looked like "glitching textures"
        if (obj.userData?.isFloor || obj.userData?.negativeLodFloor || obj.userData?.noTextureHilod) return;
        if (obj.userData?.isPlayer || obj.userData?.isHuman || obj.userData?.avatarTex) return;

        const hilod = obj.userData.textureHilod;
        const distances = hilod.distances || LOD_DISTANCES;
        const textureMax = textureMaxForState();
        camera.getWorldPosition(_camPos);
        obj.getWorldPosition(_objPos);
        const dist = Number.isFinite(obj.userData?._visDist)
            ? obj.userData._visDist
            : _camPos.distanceTo(_objPos);
        const band = Number(hilod.hysteresisBand) || 4;

        for (const slot of Object.keys(hilod.slots)) {
            const available = this.availableSuffixes(obj, slot);
            const prev = hilod.activeBySlot[slot];
            const prevIdx = Math.max(0, available.indexOf(prev));
            const order = preferenceOrder(textureMax);
            const ladder = order.filter((s) => available.includes(s) && s !== '');
            const ladderIdx = prev && ladder.includes(prev)
                ? ladder.indexOf(prev)
                : prevIdx;
            const suffix = pickSuffix(dist, distances, textureMax, available, ladderIdx, band);
            if (prev === suffix) continue;
            // Cooldown per slot — never thrash more than once per 450ms
            const coolKey = `_hilodCool_${slot}`;
            const now = performance.now();
            if (hilod[coolKey] && now - hilod[coolKey] < 450) continue;
            hilod[coolKey] = now;
            await this.applySuffix(obj, slot, suffix, TextureBridge);
        }
    },

    update(camera = window.Engine?.camera) {
        if (window.State?.aiFrozen) return;
        const State = window.State;
        const TextureBridge = window.TextureBridge;
        if (!camera || !State?.objects || !TextureBridge) return;
        if (!shouldRunUpdate(camera)) return;

        const tasks = [];
        const Vis = window.VisibilitySystem;
        for (const o of State.objects) {
            // E1: HILOD only for focus + on-screen near (A/B); skip far/off-screen
            if (Vis && !Vis.shouldProcessHeavy(o)) continue;
            // Never distance-swap avatar body maps (causes skin/clothes flicker)
            if (o?.userData?.isPlayer || o?.userData?.isHuman || o?.userData?.avatarTex) continue;
            if (o?.userData?.avatarTexMeshes?.length) continue;
            if (o?.userData?.isFloor || o?.userData?.negativeLodFloor) continue;
            if (o?.userData?.textureHilod?.slots && Object.keys(o.userData.textureHilod.slots).length) {
                tasks.push(this.updateObject(o, camera, TextureBridge));
            }
        }
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
        _lastUpdateMs = 0;
        return this.update(window.Engine?.camera);
    },

    async rehydrateAfterSync() {
        const State = window.State;
        const TextureBridge = window.TextureBridge;
        if (!State?.objects || !TextureBridge) return;

        for (const obj of State.objects) {
            if (!obj.material) continue;
            const hilod = obj.userData?.textureHilod;
            if (hilod?.slots) {
                for (const [slot, variants] of Object.entries(hilod.slots)) {
                    for (const [suffix, entry] of Object.entries(variants)) {
                        if (entry?.path) this.registerVariant(obj, slot, entry.path, null);
                    }
                }
                await this.discoverVariantsFromBundle(obj);
                await this.loadSlotVariants(obj, TextureBridge);
            }
        }
        await this.refreshAll();
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
                }));
                if (!variantList.length) return;
                entries.push({
                    objectName: obj.userData?.name || null,
                    objectId: obj.userData?.id || null,
                    slot,
                    distances: hilod.distances || LOD_DISTANCES,
                    activeSuffix: hilod.activeBySlot?.[slot] ?? '',
                    variants: variantList,
                });
            });
        });
        return entries;
    },
};

window.TextureHilod = TextureHilod;