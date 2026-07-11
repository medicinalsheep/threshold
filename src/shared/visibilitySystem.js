/**
 * E0 — VisibilitySystem
 * Classifies objects by frustum × distance for elimination pipelines.
 * Classes: A focus · B on-near · C on-far · D off-near · E off-far
 * @see docs/NEGATIVE_LOD.md §18–21
 */
import * as THREE from 'three';
import visCfg from '../../config/visibility.json';
import negCfg from '../../config/negative-lod.json';
import { isLoadSuspended } from './aiMemoryFreeze.js';

export const VIS = {
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    E: 'E',
};

const cfg = {
    enabled: visCfg.enabled !== false,
    nearDistance: Number(visCfg.nearDistance) || Number(negCfg.defaultDistance) || 40,
    farDistance: Number(visCfg.farDistance) || 60,
    frustumMargin: Number(visCfg.frustumMargin) || 0.08,
    frameHysteresis: Math.max(1, Number(visCfg.frameHysteresis) || 6),
    maxUpdatesPerFrame: Number(visCfg.maxUpdatesPerFrame) || 96,
    focusFlags: Array.isArray(visCfg.focusFlags) ? visCfg.focusFlags : ['isPlayer', 'alwaysProcess'],
};

const _camPos = new THREE.Vector3();
const _objPos = new THREE.Vector3();
const _sphere = new THREE.Sphere();
const _frustum = new THREE.Frustum();
const _mat = new THREE.Matrix4();
const _box = new THREE.Box3();
const _size = new THREE.Vector3();

/** @type {WeakMap<THREE.Object3D, { pending: string|null, frames: number, radius: number }>} */
const hysteresis = new WeakMap();

let _stats = {
    A: 0, B: 0, C: 0, D: 0, E: 0,
    scanned: 0, changed: 0, total: 0,
};
let _scanOffset = 0;
let _frame = 0;

function masterEnabled() {
    if (!cfg.enabled) return false;
    if (window.State?.visibilityDisabled) return false;
    return true;
}

function isFocus(obj) {
    const ud = obj?.userData || {};
    if (ud.alwaysProcess || ud.negativeLodExempt) return true;
    for (const f of cfg.focusFlags) {
        if (ud[f]) return true;
    }
    const sel = window.State?.selectedObject;
    if (sel && (sel === obj || isDescendant(sel, obj) || isDescendant(obj, sel))) return true;
    if (window.TcDrive?.active && (obj.userData?.isVehicle || obj.userData?.vehicleId)) {
        // driven vehicle focus if marked
        if (obj.userData?.isDriven || obj.userData?.driverKey) return true;
    }
    return false;
}

function isDescendant(a, b) {
    let p = a;
    while (p) {
        if (p === b) return true;
        p = p.parent;
    }
    return false;
}

function nearDist(obj) {
    const d = Number(obj.userData?.negativeLodDistance);
    if (Number.isFinite(d) && d > 0) return d;
    return cfg.nearDistance;
}

function farDist(obj) {
    const d = Number(obj.userData?.offscreenSleepDistance);
    if (Number.isFinite(d) && d > 0) return d;
    const n = nearDist(obj);
    return Math.max(cfg.farDistance, n + 15);
}

function estimateRadius(obj) {
    const cached = hysteresis.get(obj)?.radius;
    if (cached > 0) return cached;
    let r = 1;
    try {
        _box.setFromObject(obj);
        if (!_box.isEmpty()) {
            _box.getSize(_size);
            r = Math.max(_size.x, _size.y, _size.z) * 0.5;
            if (!Number.isFinite(r) || r <= 0) r = 1;
        }
    } catch {
        r = 1;
    }
    r = Math.min(Math.max(r, 0.25), 80);
    const h = hysteresis.get(obj) || { pending: null, frames: 0, radius: r };
    h.radius = r;
    hysteresis.set(obj, h);
    return r;
}

/**
 * Expand frustum slightly via projection matrix scale (margin in NDC-ish space).
 * margin 0.08 ≈ 8% wider culling volume to reduce pop-in.
 */
function updateFrustum(camera) {
    const margin = 1 + cfg.frustumMargin;
    _mat.makeScale(1 / margin, 1 / margin, 1);
    _mat.multiplyMatrices(camera.projectionMatrix, _mat);
    _mat.multiplyMatrices(_mat, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_mat);
}

function inFrustum(obj) {
    obj.getWorldPosition(_objPos);
    const radius = estimateRadius(obj);
    _sphere.center.copy(_objPos);
    _sphere.radius = radius;
    return _frustum.intersectsSphere(_sphere);
}

function classifyRaw(obj, dist, onScreen) {
    if (isFocus(obj)) return VIS.A;
    const near = nearDist(obj);
    const far = farDist(obj);
    if (onScreen) {
        return dist < near ? VIS.B : VIS.C;
    }
    return dist < far ? VIS.D : VIS.E;
}

function applyClass(obj, next) {
    const prev = obj.userData?._visClass;
    if (!obj.userData) obj.userData = {};
    obj.userData._visClass = next;
    obj.userData._visDist = obj.userData._visDist; // set by update
    if (prev !== next) {
        obj.userData._visClassPrev = prev || null;
        return true;
    }
    return false;
}

/**
 * Hysteresis: require frameHysteresis consecutive frames agreeing on a new class.
 */
function stabilize(obj, candidate) {
    const cur = obj.userData?._visClass || null;
    if (!cur) {
        applyClass(obj, candidate);
        hysteresis.set(obj, { pending: null, frames: 0, radius: estimateRadius(obj) });
        return true;
    }
    if (candidate === cur) {
        const h = hysteresis.get(obj) || { pending: null, frames: 0, radius: estimateRadius(obj) };
        h.pending = null;
        h.frames = 0;
        hysteresis.set(obj, h);
        return false;
    }
    // A (focus) applies immediately
    if (candidate === VIS.A || cur === VIS.A) {
        applyClass(obj, candidate);
        hysteresis.set(obj, { pending: null, frames: 0, radius: estimateRadius(obj) });
        return true;
    }
    let h = hysteresis.get(obj);
    if (!h) h = { pending: null, frames: 0, radius: estimateRadius(obj) };
    if (h.pending !== candidate) {
        h.pending = candidate;
        h.frames = 1;
        hysteresis.set(obj, h);
        return false;
    }
    h.frames += 1;
    if (h.frames >= cfg.frameHysteresis) {
        applyClass(obj, candidate);
        h.pending = null;
        h.frames = 0;
        hysteresis.set(obj, h);
        return true;
    }
    hysteresis.set(obj, h);
    return false;
}

export const VisibilitySystem = {
    VIS,
    config: cfg,

    /** @returns {'A'|'B'|'C'|'D'|'E'|null} */
    getClass(obj) {
        return obj?.userData?._visClass || null;
    },

    isOnScreen(obj) {
        const c = this.getClass(obj);
        return c === VIS.A || c === VIS.B || c === VIS.C;
    },

    isFar(obj) {
        const c = this.getClass(obj);
        return c === VIS.C || c === VIS.E;
    },

    shouldProcessVisual(obj) {
        const c = this.getClass(obj);
        return !c || c === VIS.A || c === VIS.B || c === VIS.C;
    },

    shouldProcessLod(obj) {
        // E1 will use this — E0 only classifies; allow B/C/A, optional slow D later
        const c = this.getClass(obj);
        return !c || c === VIS.A || c === VIS.B || c === VIS.C;
    },

    shouldProcessHeavy(obj) {
        // HILOD / idle / expensive
        const c = this.getClass(obj);
        return !c || c === VIS.A || c === VIS.B;
    },

    shouldSleep(obj) {
        return this.getClass(obj) === VIS.E;
    },

    getStats() {
        return { ..._stats, frame: _frame };
    },

    setEnabled(on) {
        cfg.enabled = !!on;
    },

    /**
     * Classify State.objects (budgeted). Call once per frame before NegativeLod / MeshLod.
     */
    update(camera = window.Engine?.camera) {
        if (!masterEnabled() || isLoadSuspended()) return;
        if (!camera) return;

        _frame += 1;
        const objects = window.State?.objects;
        if (!objects?.length) {
            _stats = { A: 0, B: 0, C: 0, D: 0, E: 0, scanned: 0, changed: 0, total: 0 };
            return;
        }

        camera.updateMatrixWorld?.(true);
        camera.getWorldPosition(_camPos);
        updateFrustum(camera);

        const n = objects.length;
        const budget = Math.min(cfg.maxUpdatesPerFrame, n);
        const start = _scanOffset % n;
        let scanned = 0;
        let changed = 0;
        const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };

        // Always count full pass lightly: for stats, sample classified objects
        // Full classification within budget; unclassified keep previous class
        for (let i = 0; i < n && scanned < budget; i += 1) {
            const obj = objects[(start + i) % n];
            if (!obj || obj.visible === false) continue;
            // Skip pure UI / non-world
            if (obj.userData?.isUi || obj.userData?.noVisibility) continue;

            scanned += 1;
            obj.getWorldPosition(_objPos);
            const dist = _camPos.distanceTo(_objPos);
            const onScreen = inFrustum(obj);
            // refine: sphere center was set in inFrustum via getWorldPosition already
            const raw = classifyRaw(obj, dist, onScreen);

            if (!obj.userData) obj.userData = {};
            obj.userData._visDist = dist;
            obj.userData._visOnScreen = onScreen;

            if (stabilize(obj, raw)) changed += 1;
        }
        _scanOffset = (start + budget) % Math.max(1, n);

        // Stats over all objects that have a class
        for (const obj of objects) {
            const c = obj.userData?._visClass;
            if (c && counts[c] != null) counts[c] += 1;
        }

        _stats = {
            ...counts,
            scanned,
            changed,
            total: n,
        };
    },

    /** Invalidate cached radius (after scale/geometry change) */
    invalidateRadius(obj) {
        const h = hysteresis.get(obj);
        if (h) {
            h.radius = 0;
            hysteresis.set(obj, h);
        }
    },
};

window.VisibilitySystem = VisibilitySystem;
