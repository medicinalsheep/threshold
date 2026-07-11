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
    return false;
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

function getMeshes(root) {
    const out = [];
    if (!root) return out;
    if (root.isMesh && root.material) {
        out.push(root);
        return out;
    }
    root.traverse?.((c) => {
        if (c.isMesh && c.material) out.push(c);
    });
    return out;
}

function colorKey(mat) {
    const hex = mat?.color?.getHex?.() ?? 0xffffff;
    const mapId = preserveMapActive(mat) ? (mat.map?.uuid || 'nomap') : 'nomap';
    return `${hex.toString(16)}_${mapId}`;
}

function preserveMapActive(mat) {
    return !!(mat?.map);
}

function acquireFlat(fullMat, obj) {
    const useMap = preserveMap(obj) && fullMat?.map;
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
        if (useMap && THREE.SRGBColorSpace && mat.map) {
            // keep map colorSpace as-is
        }
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

function getRt(obj) {
    let rt = runtime.get(obj);
    if (!rt) {
        rt = {
            state: 'full',
            fullMat: null,
            castShadow: !!obj.castShadow,
            receiveShadow: !!obj.receiveShadow,
            poolKey: null,
        };
        runtime.set(obj, rt);
    }
    return rt;
}

function applyOpacity(flatMat, dist, threshold, obj) {
    if (!fadeEnabled(obj) || !flatMat) return;
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

function enterFlat(mesh, objRoot) {
    if (!mesh?.material || Array.isArray(mesh.material)) {
        // multi-material: skip v1 or handle first slot only
        if (Array.isArray(mesh.material) && mesh.material[0]) {
            // treat as single by operating on array — store array
        } else return false;
    }
    const rt = getRt(mesh);
    if (rt.state === 'flat') return false;

    const full = mesh.material;
    // Don't flatten exotic custom materials aggressively
    if (full?.userData?.shaderGraph || full?.userData?.noNegativeLod) return false;
    if (full?.isShaderMaterial && !full.isMeshStandardMaterial && !full.isMeshPhysicalMaterial && !full.isMeshBasicMaterial) {
        if (!full.isMeshLambertMaterial && !full.isMeshPhongMaterial) return false;
    }

    rt.fullMat = full;
    rt.castShadow = mesh.castShadow;
    rt.receiveShadow = mesh.receiveShadow;

    const { mat: flat, key } = acquireFlat(
        Array.isArray(full) ? full[0] : full,
        objRoot || mesh,
    );
    rt.poolKey = key;

    if (Array.isArray(full)) {
        mesh.material = full.map(() => flat);
    } else {
        mesh.material = flat;
    }

    if (cfg.disableCastShadowWhenFlat) {
        mesh.castShadow = false;
    }
    rt.state = 'flat';
    return true;
}

function enterFull(mesh) {
    const rt = runtime.get(mesh);
    if (!rt || rt.state !== 'flat' || !rt.fullMat) return false;

    mesh.material = rt.fullMat;
    mesh.castShadow = rt.castShadow;
    mesh.receiveShadow = rt.receiveShadow;
    releaseFlat(rt.poolKey);
    rt.poolKey = null;
    rt.fullMat = null;
    rt.state = 'full';
    return true;
}

function applyStateToMeshes(root, wantFlat, dist, threshold) {
    const meshes = getMeshes(root);
    let switches = 0;
    for (const mesh of meshes) {
        if (wantFlat) {
            if (enterFlat(mesh, root)) switches += 1;
            const rt = runtime.get(mesh);
            if (rt?.state === 'flat' && mesh.material) {
                const flat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                if (flat?.isMeshBasicMaterial) applyOpacity(flat, dist, threshold, root);
            }
        } else if (enterFull(mesh)) {
            switches += 1;
        }
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

let _stats = { registered: 0, flat: 0, full: 0, switches: 0, scanned: 0 };
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
        if (opts.distance != null) obj.userData.negativeLodDistance = opts.distance;
        if (opts.fade != null) obj.userData.negativeLodFade = opts.fade;
        if (opts.preserveMap != null) obj.userData.negativeLodPreserveMap = opts.preserveMap;
        obj.userData.negativeLodMode = opts.mode || obj.userData.negativeLodMode || 'auto';
        this.syncObject(obj);
    },

    disableObject(obj, { clearFlag = true } = {}) {
        if (!obj) return;
        applyStateToMeshes(obj, false, 0, 1);
        getMeshes(obj).forEach((m) => enterFull(m));
        if (clearFlag && obj.userData) {
            delete obj.userData.negativeLOD;
            delete obj.userData.negativeLod;
        }
        registry.delete(obj);
        getMeshes(obj).forEach((m) => {
            enterFull(m);
            registry.delete(m);
        });
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
        const budget = cfg.maxUpdatesPerFrame;

        if (!list.length) {
            _stats.flat = 0;
            _stats.full = 0;
            return;
        }

        // Round-robin when over budget
        const n = list.length;
        const start = _scanOffset % n;
        for (let i = 0; i < n && switches < budget; i += 1) {
            const obj = list[(start + i) % n];
            if (!obj || obj.visible === false) continue;
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

            obj.getWorldPosition(_objPos);
            const dist = Number.isFinite(obj.userData?._visDist)
                ? obj.userData._visDist
                : _camPos.distanceTo(_objPos);
            const threshold = distanceThreshold(obj);
            const h = hysteresisOf(obj);
            const mode = modeOf(obj);

            let wantFlat = false;
            if (shouldForceFull(obj) || mode === 'force-full') {
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
            const st = meshes[0] ? (runtime.get(meshes[0])?.state || 'full') : 'full';
            if (st === 'flat') flatCount += 1;
            else fullCount += 1;
        }
        _scanOffset = (start + Math.min(n, budget)) % Math.max(1, n);
        _stats.flat = flatCount;
        _stats.full = fullCount;
        _stats.switches = switches;
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
