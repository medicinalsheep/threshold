import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const PlayerController = {
    mesh: null,
    body: null,
    group: null,
    spawned: false,
    walkSpeed: 4,
    jumpForce: 5,
    canJump: false,

    spawn(x = 0, y = 2, z = 0) {
        if (this.spawned) this.despawn();

        const State = window.State;
        const Engine = window.Engine;
        const Physics = window.Physics;
        if (!State || !Engine?.scene) return null;

        this.group = new THREE.Group();
        this.group.name = 'player_human';

        const skin = 0xffcc99;
        const shirt = 0x3366cc;
        const matSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
        const matShirt = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.7 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.28), matShirt);
        torso.position.y = 1.15;
        torso.castShadow = true;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), matSkin);
        head.position.y = 1.65;
        head.castShadow = true;
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), matShirt);
        legL.position.set(-0.14, 0.55, 0);
        const legR = legL.clone();
        legR.position.x = 0.14;
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), matSkin);
        armL.position.set(-0.36, 1.2, 0);
        const armR = armL.clone();
        armR.position.x = 0.36;

        this.group.add(torso, head, legL, legR, armL, armR);
        this.group.position.set(x, y, z);
        this.group.userData = {
            id: 'player',
            name: 'You',
            type: 'human',
            isHuman: true,
            isPlayer: true,
            locked: true
        };

        Engine.scene.add(this.group);
        this.mesh = this.group;

        const shape = new CANNON.Cylinder(0.28, 0.28, 1.6, 8);
        this.body = new CANNON.Body({ mass: 70, fixedRotation: true, linearDamping: 0.9 });
        this.body.addShape(shape);
        this.body.position.set(x, y + 0.8, z);
        Physics.world.addBody(this.body);
        State.objects.push(this.group);
        this.spawned = true;
        State.controlMode = 'walk';
        State.playerRef = this;

        if (window.UI?.status) window.UI.status('Player spawned — WASD walk, Space jump');
        return this.group;
    },

    despawn() {
        const State = window.State;
        const Physics = window.Physics;
        if (!this.spawned) return;

        if (this.body && Physics?.world) Physics.world.removeBody(this.body);
        if (this.mesh) {
            window.Engine?.scene?.remove(this.mesh);
            State.objects = State.objects.filter((o) => o !== this.mesh);
        }
        this.mesh = null;
        this.body = null;
        this.group = null;
        this.spawned = false;
        State.controlMode = 'fly';
        State.playerRef = null;
    },

    prePhysics(keys) {
        if (!this.spawned || !this.body || window.State?.controlMode !== 'walk' || window.State?.isPaused) return;

        const Engine = window.Engine;
        const camera = Engine?.camera;
        if (!camera) return;

        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

        const Controls = window.Controls;
        const move = new CANNON.Vec3(0, 0, 0);
        if (Controls?.isAction('forward')) move.vadd(new CANNON.Vec3(forward.x, 0, forward.z), move);
        if (Controls?.isAction('back')) move.vsub(new CANNON.Vec3(forward.x, 0, forward.z), move);
        if (Controls?.isAction('left')) move.vsub(new CANNON.Vec3(right.x, 0, right.z), move);
        if (Controls?.isAction('right')) move.vadd(new CANNON.Vec3(right.x, 0, right.z), move);

        if (move.length() > 0) {
            move.normalize();
            const mult = Controls?.getSprintMultiplier?.() || 1;
            move.scale(this.walkSpeed * mult, move);
            this.body.velocity.x = move.x;
            this.body.velocity.z = move.z;
            this._lastFacing = Math.atan2(move.x, move.z);
        } else {
            this.body.velocity.x *= 0.85;
            this.body.velocity.z *= 0.85;
        }

        if (Math.abs(this.body.velocity.y) < 0.08) this.canJump = true;
        if (Controls?.isAction('jump') && this.canJump) {
            this.body.velocity.y = this.jumpForce;
            this.canJump = false;
        }
    },

    postPhysics() {
        if (!this.spawned || !this.body || window.State?.controlMode !== 'walk') return;

        const Engine = window.Engine;
        const camera = Engine?.camera;
        if (!camera) return;

        this.group.position.set(this.body.position.x, this.body.position.y - 0.8, this.body.position.z);
        if (this._lastFacing !== undefined) this.group.rotation.y = this._lastFacing;

        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const camOffset = forward.clone().multiplyScalar(-4).add(new THREE.Vector3(0, 2.5, 0));
        const target = this.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        camera.position.lerp(target.clone().add(camOffset), 0.08);
        Engine.controls.target.lerp(target, 0.12);
    },

    getState() {
        if (!this.spawned || !this.group) return null;
        return {
            position: {
                x: this.group.position.x,
                y: this.group.position.y,
                z: this.group.position.z
            },
            controlMode: window.State?.controlMode || 'fly'
        };
    },

    applyState(data) {
        if (!data) return;
        if (data.controlMode) window.State.controlMode = data.controlMode;
        if (data.position && this.spawned) {
            this.body.position.set(data.position.x, data.position.y + 0.8, data.position.z);
            this.group.position.set(data.position.x, data.position.y, data.position.z);
        } else if (data.position && !this.spawned) {
            this.spawn(data.position.x, data.position.y, data.position.z);
        }
    }
};

window.PlayerController = PlayerController;