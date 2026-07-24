import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { State } from './state.js';
import { PlayerController } from './player.js';
import { AudioSys } from './audioSys.js';

const DEFAULT_G = { x: 0, y: -9.82, z: 0 };
const MAX_CONSTRAINTS = 48;

function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
}

/**
 * Cannon-es world + engineering helpers (mass/friction truth, joints, gravity).
 * @see docs/PHYSICS.md
 */
export const Physics = {
    world: null,
    materials: {},
    /** @type {Map<string, { id: string, type: string, constraint: any, bodyA: any, bodyB: any }>} */
    constraints: new Map(),
    _timeStep: 1 / 60,
    _maxSubSteps: 3,
    _bodyMatCache: new Map(),
    _floorPlaneBody: null,
    _padBodies: [],

    init: function () {
        this.world = new CANNON.World();
        this.world.gravity.set(DEFAULT_G.x, DEFAULT_G.y, DEFAULT_G.z);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 18;
        this.world.allowSleep = true;
        this.constraints = new Map();
        this._bodyMatCache = new Map();
        this._padBodies = [];

        this.materials = {
            default: new CANNON.Material('default'),
            ground: new CANNON.Material('ground'),
            player: new CANNON.Material('player'),
        };
        this._rebuildContactMaterials();

        const lastHit = new Map();
        this.world.addEventListener('collide', (e) => {
            const now = performance.now();
            [e.bodyA, e.bodyB].forEach((body) => {
                const entry = State.physicsObjects.find((p) => p.body === body);
                if (!entry?.mesh) return;
                const id = entry.mesh.userData?.id || entry.mesh.uuid;
                if (lastHit.get(id) && now - lastHit.get(id) < 280) return;
                lastHit.set(id, now);
                AudioSys.playObjectSound(entry.mesh, 'collision');
            });
        });
    },

    _rebuildContactMaterials() {
        const { default: def, ground, player } = this.materials;
        // cannon-es: clear by re-adding; keep pairs for common gameplay combos
        this.world.contactmaterials.length = 0;
        this.world.addContactMaterial(new CANNON.ContactMaterial(def, def, {
            friction: 0.45,
            restitution: 0.12,
        }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(player, ground, {
            friction: 0.55,
            restitution: 0.02,
        }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(player, def, {
            friction: 0.5,
            restitution: 0.05,
        }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(ground, def, {
            friction: 0.55,
            restitution: 0.08,
        }));
    },

    /**
     * Per-body material so inspector friction/restitution affect contacts.
     * Keyed by quantized friction/restitution.
     */
    materialFor(friction = 0.4, restitution = 0.1) {
        const f = Math.round(clamp(Number(friction) || 0.4, 0, 1) * 100) / 100;
        const r = Math.round(clamp(Number(restitution) || 0.1, 0, 1) * 100) / 100;
        const key = `${f}_${r}`;
        let mat = this._bodyMatCache.get(key);
        if (!mat) {
            mat = new CANNON.Material(`dyn_${key}`);
            this._bodyMatCache.set(key, mat);
            const pairs = [
                [mat, this.materials.default],
                [mat, this.materials.ground],
                [mat, this.materials.player],
                [mat, mat],
            ];
            for (const [a, b] of pairs) {
                this.world.addContactMaterial(new CANNON.ContactMaterial(a, b, {
                    friction: (f + (b === this.materials.ground ? 0.5 : f)) * 0.5,
                    restitution: Math.min(r, 0.95),
                }));
            }
        }
        return mat;
    },

    createFloor: function () {
        // Infinite safety net (below pad). Pad collider is the walk surface.
        const shape = new CANNON.Plane();
        const body = new CANNON.Body({ mass: 0, material: this.materials.ground });
        body.addShape(shape);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        body.position.y = -0.02;
        body.surfaceType = 'concrete';
        this.world.addBody(body);
        this._floorPlaneBody = body;
        return body;
    },

    /** Static pad collider matching visual workspace (replaces mismatched small box). */
    setPadCollider(halfSize = 24, y = 0.06, surfaceType = 'concrete') {
        for (const b of this._padBodies) {
            try { this.world.removeBody(b); } catch { /* */ }
        }
        this._padBodies = [];
        const half = Number(halfSize) || 24;
        const body = this.addStaticBox(
            new CANNON.Vec3(half, 0.08, half),
            { x: 0, y: y, z: 0 },
            'ground',
            surfaceType,
        );
        body._isPad = true;
        this._padBodies.push(body);
        return body;
    },

    addStaticBox(halfExtents, position, materialKey = 'ground', surfaceType = 'concrete') {
        const mat = this.materials[materialKey] || this.materials.ground;
        const shape = new CANNON.Box(halfExtents);
        const body = new CANNON.Body({ mass: 0, material: mat });
        body.addShape(shape);
        body.position.set(position.x, position.y, position.z);
        body.surfaceType = surfaceType;
        this.world.addBody(body);
        return body;
    },

    raycastDown(origin, maxDist = 1.25) {
        const from = new CANNON.Vec3(origin.x, origin.y + 0.05, origin.z);
        const to = new CANNON.Vec3(origin.x, origin.y - maxDist, origin.z);
        const result = new CANNON.RaycastResult();
        this.world.raycastClosest(from, to, {}, result);
        return result;
    },

    /** General raycast for engineering probes. */
    raycast(from, to) {
        const a = new CANNON.Vec3(from.x, from.y, from.z);
        const b = new CANNON.Vec3(to.x, to.y, to.z);
        const result = new CANNON.RaycastResult();
        this.world.raycastClosest(a, b, {}, result);
        return result;
    },

    shapeForMesh(mesh, shapeType) {
        const type = shapeType || mesh?.userData?.type || 'cube';
        mesh?.updateWorldMatrix?.(true, false);
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const sx = Math.max(size.x, 0.08);
        const sy = Math.max(size.y, 0.08);
        const sz = Math.max(size.z, 0.08);
        if (type === 'sphere' || type === 'ball') {
            const r = Math.max(sx, sy, sz) * 0.5;
            return new CANNON.Sphere(r);
        }
        // cone/torus/cube/custom → box from bounds
        return new CANNON.Box(new CANNON.Vec3(sx * 0.5, sy * 0.5, sz * 0.5));
    },

    addBody: function (mesh, shapeType) {
        const shape = this.shapeForMesh(mesh, shapeType);
        const mass = Number(mesh?.userData?.mass);
        const m = Number.isFinite(mass) && mass >= 0 ? mass : 1;
        const friction = mesh?.userData?.friction ?? 0.4;
        const restitution = mesh?.userData?.restitution ?? 0.1;
        const body = new CANNON.Body({
            mass: m,
            position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
            shape,
            material: this.materialFor(friction, restitution),
        });
        if (mesh.quaternion) {
            body.quaternion.set(
                mesh.quaternion.x,
                mesh.quaternion.y,
                mesh.quaternion.z,
                mesh.quaternion.w,
            );
        }
        body.linearDamping = 0.08;
        body.angularDamping = 0.08;
        this.world.addBody(body);
        return body;
    },

    addBodyFromObject: function (root, mass = 1) {
        const shape = this.shapeForMesh(root, root?.userData?.type || 'box');
        const m = Number.isFinite(Number(mass)) ? Number(mass) : 1;
        const friction = root?.userData?.friction ?? 0.4;
        const restitution = root?.userData?.restitution ?? 0.1;
        const body = new CANNON.Body({
            mass: m,
            position: new CANNON.Vec3(root.position.x, root.position.y, root.position.z),
            shape,
            material: this.materialFor(friction, restitution),
        });
        if (root.quaternion) {
            body.quaternion.set(
                root.quaternion.x,
                root.quaternion.y,
                root.quaternion.z,
                root.quaternion.w,
            );
        }
        this.world.addBody(body);
        return body;
    },

    findBody(mesh) {
        return State.physicsObjects.find((p) => p.mesh === mesh)?.body || null;
    },

    /** Apply userData mass / friction / restitution to live body. */
    syncBodyFromUserData(mesh) {
        if (!mesh) return null;
        const body = this.findBody(mesh);
        if (!body) return null;
        const mass = Number(mesh.userData?.mass);
        if (Number.isFinite(mass) && mass >= 0) {
            body.mass = mass;
            body.updateMassProperties();
            body.type = mass <= 0 ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC;
            if (mass <= 0) {
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
            }
        }
        const friction = mesh.userData?.friction ?? 0.4;
        const restitution = mesh.userData?.restitution ?? 0.1;
        body.material = this.materialFor(friction, restitution);
        body.wakeUp?.();
        return body;
    },

    setBodyMass(mesh, mass) {
        if (!mesh) return;
        mesh.userData = mesh.userData || {};
        mesh.userData.mass = mass;
        return this.syncBodyFromUserData(mesh);
    },

    setStatic(mesh, isStatic = true) {
        if (!mesh) return;
        mesh.userData = mesh.userData || {};
        if (isStatic) {
            mesh.userData.mass = 0;
            mesh.userData.locked = true;
        } else {
            mesh.userData.mass = mesh.userData.mass > 0 ? mesh.userData.mass : 1;
        }
        return this.syncBodyFromUserData(mesh);
    },

    massFromDensity(mesh, density = 400) {
        if (!mesh) return 1;
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const vol = Math.max(0.001, size.x * size.y * size.z);
        return Math.max(0.05, vol * density);
    },

    setGravity(x = 0, y = -9.82, z = 0) {
        if (!this.world) return;
        this.world.gravity.set(Number(x) || 0, Number(y) || 0, Number(z) || 0);
    },

    getGravity() {
        const g = this.world?.gravity;
        return g ? { x: g.x, y: g.y, z: g.z } : { ...DEFAULT_G };
    },

    resetGravity() {
        this.setGravity(DEFAULT_G.x, DEFAULT_G.y, DEFAULT_G.z);
    },

    setTimeStep(dt) {
        const t = Number(dt);
        if (Number.isFinite(t) && t > 0 && t < 0.1) this._timeStep = t;
    },

    setMaxSubSteps(n) {
        this._maxSubSteps = Math.max(1, Math.min(10, Number(n) || 3));
    },

    setSolverIterations(n) {
        if (!this.world) return;
        this.world.solver.iterations = Math.max(4, Math.min(40, Number(n) || 18));
    },

    _constraintId() {
        return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    },

    _registerConstraint(type, constraint, bodyA, bodyB, meta = {}) {
        if (this.constraints.size >= MAX_CONSTRAINTS) {
            console.warn('[Physics] constraint cap', MAX_CONSTRAINTS);
            try { this.world.removeConstraint(constraint); } catch { /* */ }
            return null;
        }
        const id = meta.id || this._constraintId();
        this.world.addConstraint(constraint);
        const rec = { id, type, constraint, bodyA, bodyB, ...meta };
        this.constraints.set(id, rec);
        return rec;
    },

    removeConstraint(id) {
        const rec = this.constraints.get(id);
        if (!rec) return false;
        try { this.world.removeConstraint(rec.constraint); } catch { /* */ }
        this.constraints.delete(id);
        return true;
    },

    clearConstraints() {
        for (const id of [...this.constraints.keys()]) this.removeConstraint(id);
    },

    lockBodies(meshA, meshB, opts = {}) {
        const a = this.findBody(meshA);
        const b = this.findBody(meshB);
        if (!a || !b) return null;
        const c = new CANNON.LockConstraint(a, b, {
            maxForce: opts.maxForce ?? 1e6,
        });
        return this._registerConstraint('lock', c, a, b, {
            meshA, meshB, maxForce: opts.maxForce,
        });
    },

    /**
     * Hinge two bodies. pivotA/pivotB local to each body; axis world-ish unit vector.
     */
    hingeBodies(meshA, meshB, pivotA, pivotB, axis = { x: 0, y: 1, z: 0 }, opts = {}) {
        const a = this.findBody(meshA);
        const b = this.findBody(meshB);
        if (!a || !b) return null;
        const pA = new CANNON.Vec3(pivotA?.x ?? 0, pivotA?.y ?? 0, pivotA?.z ?? 0);
        const pB = new CANNON.Vec3(pivotB?.x ?? 0, pivotB?.y ?? 0, pivotB?.z ?? 0);
        const ax = new CANNON.Vec3(axis.x ?? 0, axis.y ?? 1, axis.z ?? 0);
        if (ax.length() < 1e-6) ax.set(0, 1, 0);
        ax.normalize();
        const c = new CANNON.HingeConstraint(a, b, {
            pivotA: pA,
            pivotB: pB,
            axisA: ax,
            axisB: ax,
            maxForce: opts.maxForce ?? 1e6,
        });
        return this._registerConstraint('hinge', c, a, b, {
            meshA, meshB, pivotA, pivotB, axis,
        });
    },

    pointBodies(meshA, meshB, pivotA, pivotB, opts = {}) {
        const a = this.findBody(meshA);
        const b = this.findBody(meshB);
        if (!a || !b) return null;
        const c = new CANNON.PointToPointConstraint(
            a,
            new CANNON.Vec3(pivotA?.x ?? 0, pivotA?.y ?? 0, pivotA?.z ?? 0),
            b,
            new CANNON.Vec3(pivotB?.x ?? 0, pivotB?.y ?? 0, pivotB?.z ?? 0),
            opts.maxForce ?? 1e6,
        );
        return this._registerConstraint('point', c, a, b, { meshA, meshB });
    },

    applyEnvironmentEffects: function () {
        const fog = State.env?.fogDensity ?? 0.02;
        const atmo = State.env?.atmosphereEnabled ? 1 : 0;
        const damp = 0.06 + fog * 5.5 + atmo * 0.1;

        const applyDamping = (body) => {
            if (!body || body.mass <= 0) return;
            // Don't thrash bodies that set custom damping for sim
            if (body._simDampingLocked) return;
            body.linearDamping = damp;
            body.angularDamping = damp * 0.55;
        };

        State.physicsObjects.forEach(({ body }) => applyDamping(body));
        if (PlayerController.body) {
            PlayerController.body.linearDamping = 0.08;
            PlayerController.body.angularDamping = 0.9;
        }

        if (atmo && fog > 0.008) {
            const t = (State.env.timeOfDay ?? 12) / 24 * Math.PI * 2;
            const wind = fog * 14;
            const fx = Math.sin(t) * wind;
            const fz = Math.cos(t) * wind * 0.6;
            State.physicsObjects.forEach(({ body }) => {
                if (body.mass > 0 && body.mass < 80 && !body._simNoWind) {
                    body.applyForce(new CANNON.Vec3(fx, 0, fz), body.position);
                }
            });
        }
    },

    update: function () {
        if (State.isPaused) return;
        this.applyEnvironmentEffects();
        this.world.step(this._timeStep, undefined, this._maxSubSteps);

        State.physicsObjects.forEach((obj) => {
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        });
    },
};

window.Physics = Physics;
