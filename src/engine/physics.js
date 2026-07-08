import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { State } from './state.js';
import { PlayerController } from './player.js';
import { AudioSys } from './audioSys.js';

export const Physics = {
    world: null,
    materials: {},

    init: function () {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 18;
        this.world.allowSleep = true;

        this.materials = {
            default: new CANNON.Material('default'),
            ground: new CANNON.Material('ground'),
            player: new CANNON.Material('player'),
        };
        const { default: def, ground, player } = this.materials;
        this.world.addContactMaterial(new CANNON.ContactMaterial(def, def, { friction: 0.48, restitution: 0.12 }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(player, ground, { friction: 0.55, restitution: 0.02 }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(player, def, { friction: 0.52, restitution: 0.05 }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(ground, def, { friction: 0.52, restitution: 0.08 }));

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

    createFloor: function () {
        const shape = new CANNON.Plane();
        const body = new CANNON.Body({ mass: 0, material: this.materials.ground });
        body.addShape(shape);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(body);
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

    addBody: function (mesh, shapeType) {
        let shape;
        if (shapeType === 'sphere') shape = new CANNON.Sphere(0.7);
        else shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)); // Half extents

        const body = new CANNON.Body({
            mass: 1, // Dynamic
            position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
            shape: shape
        });

        this.world.addBody(body);
        return body;
    },

    addBodyFromObject: function (root, mass = 1) {
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        box.getSize(size);
        const half = new CANNON.Vec3(
            Math.max(size.x / 2, 0.05),
            Math.max(size.y / 2, 0.05),
            Math.max(size.z / 2, 0.05)
        );
        const body = new CANNON.Body({
            mass: mass ?? 1,
            position: new CANNON.Vec3(root.position.x, root.position.y, root.position.z),
            shape: new CANNON.Box(half),
        });
        this.world.addBody(body);
        return body;
    },

    applyEnvironmentEffects: function () {
        const fog = State.env?.fogDensity ?? 0.02;
        const atmo = State.env?.atmosphereEnabled ? 1 : 0;
        const damp = 0.06 + fog * 5.5 + atmo * 0.1;

        const applyDamping = (body) => {
            if (!body || body.mass <= 0) return;
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
                if (body.mass > 0 && body.mass < 80) {
                    body.applyForce(new CANNON.Vec3(fx, 0, fz), body.position);
                }
            });
        }
    },

    update: function () {
        if (State.isPaused) return;
        this.applyEnvironmentEffects();
        this.world.step(1 / 60);

        // Sync Visuals to Physics
        State.physicsObjects.forEach(obj => {
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        });
    }
};
