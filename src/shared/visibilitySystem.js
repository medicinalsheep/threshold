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

const sleepCfg = visCfg.sleep || {};
const cfg = {
    enabled: visCfg.enabled !== false,
    nearDistance: Number(visCfg.nearDistance) || Number(negCfg.defaultDistance) || 40,
    farDistance: Number(visCfg.farDistance) || 60,
    frustumMargin: Number(visCfg.frustumMargin) || 0.08,
    frameHysteresis: Math.max(1, Number(visCfg.frameHysteresis) || 6),
    maxUpdatesPerFrame: Number(visCfg.maxUpdatesPerFrame) || 96,
    focusFlags: Array.isArray(visCfg.focusFlags) ? visCfg.focusFlags : ['isPlayer', 'alwaysProcess'],
    sleep: {
        enabled: sleepCfg.enabled !== false,
        disableShadowOnD: sleepCfg.disableShadowOnD !== false,
        disableShadowOnE: sleepCfg.disableShadowOnE !== false,
        physicsSleepOnE: sleepCfg.physicsSleepOnE !== false,
        physicsSleepOnD: !!sleepCfg.physicsSleepOnD,
        neverSleepFlags: Array.isArray(sleepCfg.neverSleepFlags)
            ? sleepCfg.neverSleepFlags
            : ['isPlayer', 'alwaysProcess', 'isProjectile'],
    },
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

/**
 * E2 runtime stash (not serialized)
 * @type {WeakMap<THREE.Object3D, { shadows: Map<string, boolean>, physicsAsleep: boolean }>}
 */
const sleepState = new WeakMap();

let _stats = {
    A: 0, B: 0, C: 0, D: 0, E: 0,
    scanned: 0, changed: 0, total: 0,
    shadowsDimmed: 0, physicsAsleep: 0,
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
    if (prev !== next) {
        obj.userData._visClassPrev = prev || null;
        applySleepPolicies(obj, prev || null, next);
        return true;
    }
    return false;
}

function neverSleep(obj) {
    const ud = obj?.userData || {};
    if (ud.culledSleep === false || ud.noCulledSleep) return true;
    for (const f of cfg.sleep.neverSleepFlags) {
        if (ud[f]) return true;
    }
    if (ud.isPlayer || ud.alwaysProcess) return true;
    const sel = window.State?.selectedObject;
    if (sel && (sel === obj || isDescendant(sel, obj) || isDescendant(obj, sel))) return true;
    if (window.TcDrive?.active && (ud.isDriven || ud.driverKey)) return true;
    return false;
}

function findPhysicsBody(obj) {
    const list = window.State?.physicsObjects;
    if (!list?.length || !obj) return null;
    const hit = list.find((p) => p.mesh === obj);
    if (hit?.body) return hit.body;
    // parent/child: mesh might be root with body on root
    for (const p of list) {
        if (!p?.mesh || !p.body) continue;
        if (p.mesh === obj || isDescendant(obj, p.mesh) || isDescendant(p.mesh, obj)) return p.body;
    }
    return null;
}

function stashAndDisableShadows(obj) {
    let st = sleepState.get(obj);
    if (!st) st = { shadows: new Map(), physicsAsleep: false };
    if (st.shadows.size > 0) {
        // already dimmed — ensure still off
        obj.traverse?.((c) => {
            if (c.isMesh) c.castShadow = false;
        });
        if (obj.isMesh) obj.castShadow = false;
        sleepState.set(obj, st);
        return;
    }
    const apply = (mesh) => {
        if (!mesh?.isMesh) return;
        st.shadows.set(mesh.uuid, !!mesh.castShadow);
        mesh.castShadow = false;
    };
    if (obj.isMesh) apply(obj);
    obj.traverse?.((c) => apply(c));
    sleepState.set(obj, st);
}

function restoreShadows(obj) {
    const st = sleepState.get(obj);
    if (!st?.shadows?.size) return;
    const restore = (mesh) => {
        if (!mesh?.isMesh) return;
        if (st.shadows.has(mesh.uuid)) {
            mesh.castShadow = st.shadows.get(mesh.uuid);
        }
    };
    if (obj.isMesh) restore(obj);
    obj.traverse?.((c) => restore(c));
    st.shadows.clear();
    sleepState.set(obj, st);
}

function sleepPhysics(obj) {
    if (neverSleep(obj)) return;
    if (obj.userData?.culledSleep === false) return;
    const body = findPhysicsBody(obj);
    if (!body || body.mass <= 0) return; // static already cheap
    try {
        if (typeof body.sleep === 'function') body.sleep();
        else {
            body.sleepState = 2; // Cannon SLEEPY/SLEEPING
            body.velocity.setZero?.();
            body.angularVelocity?.setZero?.();
        }
        let st = sleepState.get(obj) || { shadows: new Map(), physicsAsleep: false };
        st.physicsAsleep = true;
        sleepState.set(obj, st);
        if (obj.userData) obj.userData._visPhysicsSleep = true;
    } catch {
        /* ignore */
    }
}

function wakePhysics(obj) {
    const st = sleepState.get(obj);
    const body = findPhysicsBody(obj);
    if (body && typeof body.wakeUp === 'function') {
        try { body.wakeUp(); } catch { /* ignore */ }
    }
    if (st) {
        st.physicsAsleep = false;
        sleepState.set(obj, st);
    }
    if (obj.userData) delete obj.userData._visPhysicsSleep;
}

/**
 * E2 — apply shadow dim + physics sleep only on class transitions.
 */
function applySleepPolicies(obj, _prev, next) {
    if (!cfg.sleep.enabled || !obj) return;

    // Focus / player / selected: never dim or sleep
    if (neverSleep(obj) || next === VIS.A) {
        restoreShadows(obj);
        wakePhysics(obj);
        return;
    }

    const wantShadowOff =
        (next === VIS.E && cfg.sleep.disableShadowOnE)
        || (next === VIS.D && cfg.sleep.disableShadowOnD);

    const wantPhysicsSleep =
        (next === VIS.E && cfg.sleep.physicsSleepOnE)
        || (next === VIS.D && cfg.sleep.physicsSleepOnD);

    if (wantShadowOff) stashAndDisableShadows(obj);
    else restoreShadows(obj);

    if (wantPhysicsSleep) sleepPhysics(obj);
    else wakePhysics(obj);
}

function recountSleepStats(objects) {
    let shadowsDimmed = 0;
    let physicsAsleep = 0;
    for (const obj of objects || []) {
        const st = sleepState.get(obj);
        if (st?.shadows?.size) shadowsDimmed += 1;
        if (st?.physicsAsleep || obj.userData?._visPhysicsSleep) physicsAsleep += 1;
    }
    return { shadowsDimmed, physicsAsleep };
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

    /**
     * Resolve vis class walking up parents (child meshes inherit root classification).
     * E3: weather / shader / env use this.
     */
    resolveClass(node) {
        let o = node;
        while (o) {
            const c = o.userData?._visClass;
            if (c) return c;
            o = o.parent;
        }
        return null;
    },

    /** A/B/C — worth per-mesh env/shader work this frame */
    shouldProcessEnv(node) {
        if (!masterEnabled()) return true;
        const c = this.resolveClass(node);
        if (!c) return true; // not classified yet
        return c === VIS.A || c === VIS.B || c === VIS.C;
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

        const sleepStats = recountSleepStats(objects);
        _stats = {
            ...counts,
            scanned,
            changed,
            total: n,
            ...sleepStats,
        };
    },

    /** Force re-apply sleep policy (e.g. after selection change) */
    refreshSleep(obj) {
        if (!obj) return;
        const c = obj.userData?._visClass;
        if (c) applySleepPolicies(obj, c, c);
    },

    wakeAll() {
        const objects = window.State?.objects || [];
        for (const obj of objects) {
            restoreShadows(obj);
            wakePhysics(obj);
        }
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
