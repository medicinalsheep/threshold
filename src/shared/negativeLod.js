/**
 * Negative LOD — far-field unlit material swap (shader LOD).
 * Complements MeshLod (geometry) and TextureHilod (textures).
 * @see docs/NEGATIVE_LOD.md
 */
import * as THREE from 'three';
import cfgJson from '../../config/negative-lod.json';
import { isLoadSuspended } from './aiMemoryFreeze.js';

const cfg = {
    enabled: cfgJson.enabled !== false,
    defaultDistance: Number(cfgJson.defaultDistance) || 40,
    hysteresis: Number(cfgJson.hysteresis) || 4,
    maxUpdatesPerFrame: Number(cfgJson.maxUpdatesPerFrame) || 48,
    fadeStart: Number(cfgJson.fadeStart) || 0.85,
    fadeEnd: Number(cfgJson.fadeEnd) || 1.15,
    preserveMapDefault: !!cfgJson.preserveMapDefault,
    disableCastShadowWhenFlat: cfgJson.disableCastShadowWhenFlat !== false,
    forceFullWhenSelected: cfgJson.forceFullWhenSelected !== false,
    excludeFlags: Array.isArray(cfgJson.excludeFlags) ? cfgJson.excludeFlags : [],
    /** Graphics tiers that auto-flag eligible props (Lite / Mobile). */
    autoEnableTiers: Array.isArray(cfgJson.autoEnableTiers)
        ? cfgJson.autoEnableTiers
        : ['compatibility', 'balanced'],
    autoEnableMinObjects: Number(cfgJson.autoEnableMinObjects) || 6,
    distanceByTier: cfgJson.distanceByTier && typeof cfgJson.distanceByTier === 'object'
        ? cfgJson.distanceByTier
        : { compatibility: 28, balanced: 40, realistic: 55, ultra: 55 },
    floor: {
        enabled: cfgJson.floor?.enabled !== false,
        autoTiersOnly: cfgJson.floor?.autoTiersOnly !== false,
        cameraHeight: Number(cfgJson.floor?.cameraHeight) || 12,
        distance: Number(cfgJson.floor?.distance) || 45,
        hysteresis: Number(cfgJson.floor?.hysteresis) || 2,
        preserveMap: cfgJson.floor?.preserveMap !== false,
    },
};

const _camPos = new THREE.Vector3();
const _objPos = new THREE.Vector3();

/** @type {Set<THREE.Object3D>} */
const registry = new Set();

/** @type {WeakMap<THREE.Object3D, RuntimeState>} */
const runtime = new WeakMap();

/** @type {Map<string, { mat: THREE.MeshBasicMaterial, refs: number }>} */
const flatPool = new Map();

/**
 * @typedef {{ state: 'full'|'flat', fullMat: any, castShadow: boolean, receiveShadow: boolean, poolKey: string|null }} RuntimeState
 */

function masterEnabled() {
    if (!cfg.enabled) return false;
    if (window.State?.negativeLodDisabled) return false;
    return true;
}

function isExcluded(obj) {
    const ud = obj?.userData || {};
    if (ud.negativeLodExempt || ud.alwaysProcess) return true;
    for (const f of cfg.excludeFlags) {
        if (ud[f]) return true;
    }
    if (ud.isPlayer) return true;
    if (ud.isVehicle || ud.vehicleId || ud.drivenVehicle) return true;
    if (ud.isGltfHero || ud.gltfLodChain) return true;
    return false;
}

function distanceForTier(tier) {
    const map = cfg.distanceByTier || {};
    const d = Number(map[tier]);
    return Number.isFinite(d) && d > 0 ? d : cfg.defaultDistance;
}

/** Eligible for graphics-tier auto Neg LOD (not user-owned / excluded). */
function isAutoEligible(obj) {
    if (!obj || isExcluded(obj)) return false;
    const ud = obj.userData || {};
    if (ud.negativeLodForcedOff || ud.negativeLOD === false || ud.negativeLod === false) return false;
    // User / scene-authored flag — leave alone (except re-tune distance only if tier-auto)
    if (ud.negativeLodSource === 'user' || ud.negativeLodManual) return false;
    if ((ud.negativeLOD === true || ud.negativeLod === true) && ud.negativeLodSource !== 'tier-auto') {
        return false;
    }
    const sel = window.State?.selectedObject;
    if (sel && (sel === obj || isDescendant(sel, obj) || isDescendant(obj, sel))) return false;
    return true;
}

function wantsNegative(obj) {
    if (!obj || isExcluded(obj)) return false;
    const ud = obj.userData || {};
    if (ud.negativeLOD === true || ud.negativeLod === true) return true;
    // Group inheritance: walk up parents
    let p = obj.parent;
    while (p) {
        if (p.userData?.negativeLOD === true || p.userData?.negativeLod === true) return true;
        if (p.userData?.negativeLodExempt) return false;
        p = p.parent;
    }
    return false;
}

function modeOf(obj) {
    const m = obj.userData?.negativeLodMode || 'auto';
    if (m === 'force-full' || m === 'force-flat' || m === 'auto') return m;
    return 'auto';
}

function distanceThreshold(obj) {
    const d = Number(obj.userData?.negativeLodDistance);
    return Number.isFinite(d) && d > 0 ? d : cfg.defaultDistance;
}

function hysteresisOf(obj) {
    const h = Number(obj.userData?.negativeLodHysteresis);
    return Number.isFinite(h) && h >= 0 ? h : cfg.hysteresis;
}

function preserveMap(obj) {
    if (obj.userData?.negativeLodPreserveMap != null) return !!obj.userData.negativeLodPreserveMap;
    return cfg.preserveMapDefault;
}

function fadeEnabled(obj) {
    return obj.userData?.negativeLodFade !== false;
}

function isRenderableMesh(obj) {
    return !!(obj && (obj.isMesh || obj.isSkinnedMesh || obj.isInstancedMesh) && obj.material);
}

function getMeshes(root) {
    const out = [];
    if (!root) return out;
    if (isRenderableMesh(root)) {
        out.push(root);
        return out;
    }
    root.traverse?.((c) => {
        if (isRenderableMesh(c)) out.push(c);
    });
    return out;
}

function matSlots(material) {
    if (!material) return [];
    return Array.isArray(material) ? material : [material];
}

function isFlattable(mat) {
    if (!mat) return false;
    if (mat.userData?.shaderGraph || mat.userData?.noNegativeLod) return false;
    if (mat.isShaderMaterial
        && !mat.isMeshStandardMaterial
        && !mat.isMeshPhysicalMaterial
        && !mat.isMeshBasicMaterial
        && !mat.isMeshLambertMaterial
        && !mat.isMeshPhongMaterial) {
        return false;
    }
    return true;
}

/** Clone shared materials so siblings do not share a thrashing full-mat ref. */
function ensureOwnedMaterials(mesh) {
    const shared = (m) => !!(m?.userData?.shared || m?.userData?._shared || m?.userData?.negativeLodClone);
    if (!mesh?.material) return;
    if (Array.isArray(mesh.material)) {
        let changed = false;
        const next = mesh.material.map((m) => {
            if (!m || !shared(m) || m.userData?._negativeLodCloned) return m;
            const c = m.clone();
            c.userData = { ...(m.userData || {}), _negativeLodCloned: true };
            changed = true;
            return c;
        });
        if (changed) mesh.material = next;
        return;
    }
    const m = mesh.material;
    if (m && shared(m) && !m.userData?._negativeLodCloned) {
        const c = m.clone();
        c.userData = { ...(m.userData || {}), _negativeLodCloned: true };
        mesh.material = c;
    }
}

function preserveMapActive(mat) {
    return !!(mat?.map);
}

function acquireFlat(fullMat, obj, forcePreserveMap) {
    const useMap = (forcePreserveMap || preserveMap(obj)) && fullMat?.map;
    const hex = fullMat?.color?.getHex?.() ?? 0xffffff;
    const key = `${hex.toString(16)}_${useMap ? fullMat.map.uuid : 'nomap'}`;
    let entry = flatPool.get(key);
    if (!entry) {
        const mat = new THREE.MeshBasicMaterial({
            color: hex,
            map: useMap ? fullMat.map : null,
            transparent: false,
            opacity: 1,
            toneMapped: true,
        });
        entry = { mat, refs: 0 };
        flatPool.set(key, entry);
    }
    entry.refs += 1;
    return { mat: entry.mat, key };
}

function releaseFlat(key) {
    if (!key) return;
    const entry = flatPool.get(key);
    if (!entry) return;
    entry.refs -= 1;
    if (entry.refs <= 0) {
        entry.mat.map = null;
        entry.mat.dispose();
        flatPool.delete(key);
    }
}

function releaseRtKeys(rt) {
    if (Array.isArray(rt.poolKeys)) {
        for (const k of rt.poolKeys) releaseFlat(k);
        rt.poolKeys = null;
    }
    releaseFlat(rt.poolKey);
    rt.poolKey = null;
}

function getRt(obj) {
    let rt = runtime.get(obj);
    if (!rt) {
        rt = {
            state: 'full',
            fullMat: null,
            castShadow: !!obj.castShadow,
            receiveShadow: !!obj.receiveShadow,
            poolKey: null,
            poolKeys: null,
        };
        runtime.set(obj, rt);
    }
    return rt;
}

function applyOpacity(flatMat, dist, threshold, obj) {
    if (!fadeEnabled(obj) || !flatMat?.isMeshBasicMaterial) return;
    const start = threshold * cfg.fadeStart;
    const end = threshold * cfg.fadeEnd;
    let opacity = 1;
    if (dist >= end) opacity = 0.35;
    else if (dist > start) {
        const t = (dist - start) / Math.max(0.001, end - start);
        opacity = 1 - t * 0.65;
    }
    flatMat.transparent = opacity < 0.999;
    flatMat.opacity = opacity;
    flatMat.depthWrite = opacity > 0.9;
    flatMat.needsUpdate = true;
}

function applyOpacityToMesh(mesh, dist, threshold, objRoot) {
    const slots = matSlots(mesh.material);
    for (const m of slots) applyOpacity(m, dist, threshold, objRoot);
}

/**
 * Multi-mat 1:1 flat slots · shared-mat clone · SkinnedMesh / InstancedMesh safe.
 * Never disposes skeleton or bone data.
 */
function enterFlat(mesh, objRoot, opts = {}) {
    if (!isRenderableMesh(mesh)) return false;
    // Skinned: allow; skeleton stays on mesh. Never dispose geometry/skeleton.
    if (mesh.isSkinnedMesh && mesh.userData?.negativeLodNoSkin) return false;

    const rt = getRt(mesh);
    if (rt.state === 'flat') return false;

    ensureOwnedMaterials(mesh);

    const wasArray = Array.isArray(mesh.material);
    const slots = matSlots(mesh.material);
    if (!slots.length || !slots.some(isFlattable)) return false;

    // Stash full materials (array copy so restore is 1:1)
    rt.fullMat = wasArray ? slots.slice() : slots[0];
    rt.castShadow = mesh.castShadow;
    rt.receiveShadow = mesh.receiveShadow;
    rt.poolKeys = [];
    rt.poolKey = null;

    const forceMap = !!opts.preserveMap;
    const flats = [];
    for (const full of slots) {
        if (!isFlattable(full)) {
            flats.push(full);
            rt.poolKeys.push(null);
            continue;
        }
        const { mat: flat, key } = acquireFlat(full, objRoot || mesh, forceMap);
        flats.push(flat);
        rt.poolKeys.push(key);
    }

    mesh.material = wasArray ? flats : flats[0];

    if (cfg.disableCastShadowWhenFlat && !mesh.isInstancedMesh) {
        mesh.castShadow = false;
    }
    rt.state = 'flat';
    return true;
}

function enterFull(mesh) {
    const rt = runtime.get(mesh);
    if (!rt || rt.state !== 'flat' || rt.fullMat == null) return false;

    mesh.material = rt.fullMat;
    mesh.castShadow = rt.castShadow;
    mesh.receiveShadow = rt.receiveShadow;
    releaseRtKeys(rt);
    rt.fullMat = null;
    rt.state = 'full';
    return true;
}

function applyStateToMeshes(root, wantFlat, dist, threshold, opts = {}) {
    const meshes = getMeshes(root);
    let switches = 0;
    for (const mesh of meshes) {
        if (wantFlat) {
            if (enterFlat(mesh, root, opts)) switches += 1;
            const rt = runtime.get(mesh);
            if (rt?.state === 'flat') applyOpacityToMesh(mesh, dist, threshold, root);
        } else if (enterFull(mesh)) {
            switches += 1;
        }
    }
    return switches;
}

function floorTierAllows() {
    if (!cfg.floor?.enabled) return false;
    if (!cfg.floor.autoTiersOnly) return true;
    const tier = window.State?.graphicsTier || 'realistic';
    return (cfg.autoEnableTiers || []).includes(tier);
}

/** Ground plane + instanced deck slabs (path B). */
function collectFloorTargets() {
    const out = new Set();
    const add = (o) => {
        if (!o) return;
        if (isRenderableMesh(o)) out.add(o);
        else getMeshes(o).forEach((m) => out.add(m));
    };
    add(window.Engine?.groundPlane);
    const fg = window.Environment?.floorGroup;
    if (fg) {
        fg.traverse((c) => {
            if (isRenderableMesh(c) && (c.userData?.isFloor || c.userData?.negativeLodFloor || c.isInstancedMesh)) {
                out.add(c);
            }
        });
    }
    for (const o of window.State?.objects || []) {
        if (o?.userData?.isFloor || o?.userData?.negativeLodFloor) add(o);
    }
    return [...out];
}

/**
 * Floor path B: one shared mat → Basic when camera high or far from origin.
 * Whole slab deck pops together (acceptable).
 */
function updateFloorTargets(camera) {
    if (!cfg.floor?.enabled || !floorTierAllows()) {
        // Restore full if we left floors flat from a previous tier
        for (const mesh of collectFloorTargets()) {
            const rt = runtime.get(mesh);
            if (rt?.state === 'flat') enterFull(mesh);
        }
        return 0;
    }

    camera.getWorldPosition(_camPos);
    const heightThr = cfg.floor.cameraHeight;
    const distThr = cfg.floor.distance;
    const h = cfg.floor.hysteresis;
    let switches = 0;

    for (const mesh of collectFloorTargets()) {
        if (!mesh.visible) continue;
        mesh.getWorldPosition(_objPos);
        const horiz = Math.hypot(_camPos.x - _objPos.x, _camPos.z - _objPos.z);
        const height = _camPos.y;
        const rt = runtime.get(mesh);
        const cur = rt?.state || 'full';

        let wantFlat = false;
        if (cur === 'full') {
            wantFlat = height >= heightThr + h || horiz >= distThr + h;
        } else {
            wantFlat = height > heightThr - h || horiz > distThr - h;
        }

        const metric = Math.max(height, horiz);
        const thr = Math.max(heightThr, distThr);
        const sw = applyStateToMeshes(mesh, wantFlat, metric, thr, {
            preserveMap: cfg.floor.preserveMap,
        });
        switches += sw;
    }
    return switches;
}

function shouldForceFull(obj) {
    if (!cfg.forceFullWhenSelected) return false;
    const sel = window.State?.selectedObject;
    if (!sel) return false;
    return sel === obj || isDescendant(sel, obj) || isDescendant(obj, sel);
}

function isDescendant(a, b) {
    let p = a;
    while (p) {
        if (p === b) return true;
        p = p.parent;
    }
    return false;
}

let _stats = {
    registered: 0, flat: 0, full: 0, switches: 0, scanned: 0,
    floorFlat: 0, floorTargets: 0, multiMat: 0, skinned: 0,
};
let _scanOffset = 0;

export const NegativeLod = {
    config: cfg,

    /** Call when object gains/loses negativeLOD flag or is created */
    syncObject(obj) {
        if (!obj) return;
        if (wantsNegative(obj) && !isExcluded(obj)) {
            registry.add(obj);
            // also register mesh children for direct access
            getMeshes(obj).forEach((m) => {
                if (m !== obj) registry.add(m);
            });
        } else {
            this.disableObject(obj, { clearFlag: false });
            registry.delete(obj);
            getMeshes(obj).forEach((m) => registry.delete(m));
        }
    },

    enableObject(obj, opts = {}) {
        if (!obj) return;
        obj.userData = obj.userData || {};
        obj.userData.negativeLOD = true;
        delete obj.userData.negativeLodForcedOff;
        if (opts.distance != null) obj.userData.negativeLodDistance = opts.distance;
        if (opts.fade != null) obj.userData.negativeLodFade = opts.fade;
        if (opts.preserveMap != null) obj.userData.negativeLodPreserveMap = opts.preserveMap;
        obj.userData.negativeLodMode = opts.mode || obj.userData.negativeLodMode || 'auto';
        if (opts.source) obj.userData.negativeLodSource = opts.source;
        this.syncObject(obj);
    },

    disableObject(obj, { clearFlag = true, forceOff = false } = {}) {
        if (!obj) return;
        applyStateToMeshes(obj, false, 0, 1);
        getMeshes(obj).forEach((m) => enterFull(m));
        if (clearFlag && obj.userData) {
            delete obj.userData.negativeLOD;
            delete obj.userData.negativeLod;
            delete obj.userData.negativeLodSource;
            if (forceOff) obj.userData.negativeLodForcedOff = true;
            else delete obj.userData.negativeLodForcedOff;
        }
        registry.delete(obj);
        getMeshes(obj).forEach((m) => {
            enterFull(m);
            registry.delete(m);
        });
    },

    /**
     * Auto-enable Neg LOD on eligible objects for Lite/Mobile tiers.
     * Strips prior tier-auto flags when tier is outside autoEnableTiers.
     * @param {string} [tier] graphics tier id
     * @param {THREE.Object3D[]} [objects]
     * @returns {{ enabled: number, stripped: number, skipped?: string, tier: string }}
     */
    applyTierPolicy(tier, objects) {
        const State = window.State;
        const tierId = tier || State?.graphicsTier || 'realistic';
        const list = objects || State?.objects || [];
        const autoTiers = cfg.autoEnableTiers || [];
        const min = cfg.autoEnableMinObjects || 6;
        const dist = distanceForTier(tierId);
        let enabled = 0;
        let stripped = 0;

        if (!autoTiers.includes(tierId)) {
            for (const obj of list) {
                if (obj?.userData?.negativeLodSource === 'tier-auto') {
                    this.disableObject(obj, { clearFlag: true });
                    stripped += 1;
                }
            }
            return { enabled: 0, stripped, tier: tierId, active: false };
        }

        if (list.length < min) {
            return { enabled: 0, stripped: 0, tier: tierId, skipped: 'min-objects', min, active: true };
        }

        for (const obj of list) {
            if (!isAutoEligible(obj)) continue;
            this.enableObject(obj, { distance: dist, source: 'tier-auto' });
            enabled += 1;
        }
        return { enabled, stripped, tier: tierId, distance: dist, active: true };
    },

    /** Single-object path after spawn when current tier is auto. */
    maybeAutoEnable(obj) {
        const tierId = window.State?.graphicsTier || 'realistic';
        if (!(cfg.autoEnableTiers || []).includes(tierId)) return false;
        if (!isAutoEligible(obj)) return false;
        const n = window.State?.objects?.length ?? 0;
        if (n < (cfg.autoEnableMinObjects || 6) && n < 1) return false;
        // Allow early auto on first props once scene has any objects
        if (n < (cfg.autoEnableMinObjects || 6)) {
            // still enable this prop so dense scenes build up; policy re-run after load sets the rest
        }
        this.enableObject(obj, { distance: distanceForTier(tierId), source: 'tier-auto' });
        return true;
    },

    setMode(obj, mode) {
        if (!obj?.userData) return;
        obj.userData.negativeLodMode = mode;
        if (mode === 'force-full') {
            applyStateToMeshes(obj, false, 0, 1);
        } else if (mode === 'force-flat') {
            applyStateToMeshes(obj, true, 9999, distanceThreshold(obj));
        }
        this.syncObject(obj);
    },

    forceFull(obj) {
        this.setMode(obj, 'force-full');
    },

    forceFlat(obj) {
        this.setMode(obj, 'force-flat');
    },

    /** Restore full materials for inspector/edit without clearing the flag */
    ensureFullForEdit(obj) {
        if (!obj) return;
        applyStateToMeshes(obj, false, 0, 1);
        getMeshes(obj).forEach((m) => enterFull(m));
    },

    /** Rebuild registry from State.objects (after scene load) */
    rescan(objects = window.State?.objects) {
        registry.clear();
        if (!objects) return;
        for (const obj of objects) {
            if (wantsNegative(obj) && !isExcluded(obj)) this.syncObject(obj);
        }
    },

    update(camera = window.Engine?.camera) {
        if (!masterEnabled() || isLoadSuspended()) return;
        if (!camera) return;

        // Opportunistic rescan if registry empty but scene has flags
        const objects = window.State?.objects;
        if (registry.size === 0 && objects?.length) {
            for (const obj of objects) {
                if (wantsNegative(obj)) this.syncObject(obj);
            }
        }

        camera.getWorldPosition(_camPos);
        const list = [...registry];
        _stats.registered = list.length;
        _stats.switches = 0;
        _stats.scanned = 0;
        let flatCount = 0;
        let fullCount = 0;
        let switches = 0;
        let multiMat = 0;
        let skinned = 0;
        const budget = cfg.maxUpdatesPerFrame;

        // Floor path B always (even when prop registry empty)
        const floorSw = updateFloorTargets(camera);
        switches += floorSw;
        const floors = collectFloorTargets();
        let floorFlat = 0;
        for (const m of floors) {
            if (runtime.get(m)?.state === 'flat') floorFlat += 1;
        }
        _stats.floorTargets = floors.length;
        _stats.floorFlat = floorFlat;

        if (!list.length) {
            _stats.flat = floorFlat;
            _stats.full = 0;
            _stats.switches = switches;
            _stats.multiMat = 0;
            _stats.skinned = 0;
            return;
        }

        // Round-robin when over budget
        const n = list.length;
        const start = _scanOffset % n;
        for (let i = 0; i < n && switches < budget; i += 1) {
            const obj = list[(start + i) % n];
            if (!obj || obj.visible === false) continue;
            // Floors use dedicated path B — never thrash them in the prop registry
            if (obj.userData?.isFloor || obj.userData?.negativeLodFloor) {
                registry.delete(obj);
                continue;
            }
            if (!wantsNegative(obj) || isExcluded(obj)) {
                this.disableObject(obj, { clearFlag: false });
                registry.delete(obj);
                continue;
            }

            _stats.scanned += 1;

            // E0: off-screen (D/E) — freeze materials, no swap work
            const vis = obj.userData?._visClass;
            if (vis === 'D' || vis === 'E') {
                const meshes = getMeshes(obj);
                const st = meshes[0] ? (runtime.get(meshes[0])?.state || 'full') : 'full';
                if (st === 'flat') flatCount += 1;
                else fullCount += 1;
                continue;
            }

            // Focus / selected / force-full always restores PBR (incl. skinned avatars)
            if (shouldForceFull(obj)) {
                const swFocus = applyStateToMeshes(obj, false, 0, 1);
                switches += swFocus;
                fullCount += 1;
                continue;
            }

            obj.getWorldPosition(_objPos);
            const dist = Number.isFinite(obj.userData?._visDist)
                ? obj.userData._visDist
                : _camPos.distanceTo(_objPos);
            const threshold = distanceThreshold(obj);
            const h = hysteresisOf(obj);
            const mode = modeOf(obj);

            let wantFlat = false;
            if (mode === 'force-full') {
                wantFlat = false;
            } else if (mode === 'force-flat') {
                wantFlat = true;
            } else if (vis === 'A' || vis === 'B') {
                wantFlat = false; // on-screen near / focus → full PBR
            } else if (vis === 'C') {
                wantFlat = true; // on-screen far → flat unlit
            } else {
                // Vis not ready yet — distance hysteresis
                const meshes = getMeshes(obj);
                const sample = meshes[0];
                const cur = sample ? (runtime.get(sample)?.state || 'full') : 'full';
                if (cur === 'full') wantFlat = dist >= threshold + h;
                else wantFlat = dist > threshold - h;
            }

            const sw = applyStateToMeshes(obj, wantFlat, dist, threshold);
            switches += sw;

            const meshes = getMeshes(obj);
            for (const m of meshes) {
                if (Array.isArray(m.material) && m.material.length > 1) multiMat += 1;
                if (m.isSkinnedMesh) skinned += 1;
            }
            const st = meshes[0] ? (runtime.get(meshes[0])?.state || 'full') : 'full';
            if (st === 'flat') flatCount += 1;
            else fullCount += 1;
        }
        _scanOffset = (start + Math.min(n, budget)) % Math.max(1, n);
        _stats.flat = flatCount + floorFlat;
        _stats.full = fullCount;
        _stats.switches = switches;
        _stats.multiMat = multiMat;
        _stats.skinned = skinned;
    },

    getStats() {
        return { ..._stats, poolSize: flatPool.size };
    },

    setGlobalEnabled(on) {
        cfg.enabled = !!on;
        if (!on && window.State?.objects) {
            for (const obj of window.State.objects) {
                applyStateToMeshes(obj, false, 0, 1);
                getMeshes(obj).forEach((m) => enterFull(m));
            }
        }
    },
};

window.NegativeLod = NegativeLod;
