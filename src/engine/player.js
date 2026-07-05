import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { HumanMesh } from './humanMesh.js';
import { tryLoadAvatarGroup } from '../shared/avatarLoader.js';

const WALK_SPEED = 3.2;
const SPRINT_MULT = 1.875;
const ACCEL = 14;
const DECEL = 18;
const TPS_DIST = 4.2;
const TPS_HEIGHT = 2.15;
const EYE_HEIGHT = 1.65;
const PITCH_MIN = -0.35;
const PITCH_MAX = 1.15;

export const PlayerController = {
    mesh: null,
    body: null,
    group: null,
    spawned: false,
    walkSpeed: WALK_SPEED,
    jumpForce: 5,
    canJump: false,
    _camYaw: 0,
    _camPitch: 0.28,
    _velX: 0,
    _velZ: 0,

    async spawn(x = 0, y = 2, z = 0) {
        if (this.spawned) this.despawn();

        const State = window.State;
        const Engine = window.Engine;
        const Physics = window.Physics;
        if (!State || !Engine?.scene) return null;

        State.viewMode = State.viewMode || 'tps';

        this.group = HumanMesh.build();
        this.group.name = 'player_human';
        this.group.position.set(x, y, z);
        this.group.userData = {
            id: 'player',
            name: 'You',
            type: 'human',
            isHuman: true,
            isPlayer: true,
            locked: true,
        };

        Engine.scene.add(this.group);
        this.mesh = this.group;

        const playerMat = Physics.materials?.player;
        const cyl = new CANNON.Cylinder(0.32, 0.32, 1.55, 16);
        this.body = new CANNON.Body({
            mass: 78,
            fixedRotation: true,
            linearDamping: 0.08,
            material: playerMat,
        });
        this.body.addShape(cyl);
        this.body.position.set(x, y + 0.86, z);
        Physics.world.addBody(this.body);
        State.objects.push(this.group);
        this.spawned = true;
        State.controlMode = 'walk';
        State.playerRef = this;

        this._camYaw = Math.PI;
        this._camPitch = 0.28;
        this._velX = 0;
        this._velZ = 0;
        await tryLoadAvatarGroup(this.group, 'starter_avatar.glb');

        this._syncWalkOrbit();
        this._applyViewMode();
        window.FpsViewmodel?.mount?.(Engine.camera);

        if (window.UI?.status) {
            window.UI.status('Action controls — WASD move · Shift sprint · V FPS/TPS · T Third Eye · E interact');
        }
        window.ThirdEye?.updateHud?.();
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
        window.FpsViewmodel?.unmount?.(window.Engine?.camera);
        this._syncWalkOrbit();
        window.ThirdEye?.updateHud?.();
    },

    toggleViewMode() {
        const State = window.State;
        if (!this.spawned || State.controlMode !== 'walk') return State?.viewMode || 'tps';
        State.viewMode = State.viewMode === 'fps' ? 'tps' : 'fps';
        this._applyViewMode();
        window.FpsViewmodel?.setVisible?.(State.viewMode === 'fps');
        window.ThirdEye?.updateHud?.();
        window.UI?.status?.(State.viewMode === 'fps' ? 'First person' : 'Third person');
        return State.viewMode;
    },

    _applyViewMode() {
        const fps = window.State?.viewMode === 'fps';
        if (this.group?.userData?.isGltf) {
            this.group.visible = !fps;
        } else {
            HumanMesh.setFirstPersonVisible(this.group, !fps);
        }
        window.FpsViewmodel?.setVisible?.(fps);
    },

    _syncWalkOrbit() {
        const Engine = window.Engine;
        const State = window.State;
        if (!Engine?.controls) return;
        const walk = State.controlMode === 'walk' && this.spawned;
        Engine.controls.enabled = !walk;
    },

    applyLookInput(dx, dy, sens = 1) {
        if (!this.spawned || window.State?.controlMode !== 'walk') return;
        this._camYaw -= dx * 0.003 * sens;
        this._camPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this._camPitch + dy * 0.0025 * sens));
    },

    resetCameraBehind() {
        if (!this.spawned || !this.group) return;
        this._camYaw = this.group.rotation.y + Math.PI;
        this._camPitch = 0.28;
    },

    prePhysics() {
        if (!this.spawned || !this.body || window.State?.controlMode !== 'walk' || window.State?.isPaused || window.State?.cutscenePlaying) return;

        const Engine = window.Engine;
        const camera = Engine?.camera;
        if (!camera) return;

        const yaw = this._camYaw;
        const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const Controls = window.Controls;
        let mx = 0;
        let mz = 0;
        if (Controls?.isAction('forward')) { mx += forward.x; mz += forward.z; }
        if (Controls?.isAction('back')) { mx -= forward.x; mz -= forward.z; }
        if (Controls?.isAction('left')) { mx -= right.x; mz -= right.z; }
        if (Controls?.isAction('right')) { mx += right.x; mz += right.z; }

        const len = Math.hypot(mx, mz);
        const sprintMult = Controls?.isAction('sprint') ? SPRINT_MULT : 1;
        const targetSpeed = this.walkSpeed * sprintMult;

        if (len > 0) {
            mx /= len;
            mz /= len;
            const tx = mx * targetSpeed;
            const tz = mz * targetSpeed;
            this._velX += (tx - this._velX) * Math.min(1, ACCEL * 0.016);
            this._velZ += (tz - this._velZ) * Math.min(1, ACCEL * 0.016);
            this.body.velocity.x = this._velX;
            this.body.velocity.z = this._velZ;
            this._lastFacing = Math.atan2(this._velX, this._velZ);
        } else {
            this._velX += (0 - this._velX) * Math.min(1, DECEL * 0.016);
            this._velZ += (0 - this._velZ) * Math.min(1, DECEL * 0.016);
            this.body.velocity.x = this._velX;
            this.body.velocity.z = this._velZ;
        }

        const ground = this._probeGround();
        this.canJump = ground.grounded && Math.abs(this.body.velocity.y) < 0.35;
        if (Controls?.isAction('jump') && this.canJump) {
            this.body.velocity.y = this.jumpForce;
            this.canJump = false;
        }
    },

    _probeGround() {
        const Physics = window.Physics;
        if (!this.body || !Physics?.raycastDown) return { grounded: false, dist: 999 };
        const hit = Physics.raycastDown(this.body.position, 1.15);
        const dist = hit.hasHit ? hit.distance : 999;
        const grounded = hit.hasHit && dist < 0.62 && this.body.velocity.y <= 0.15;
        return { grounded, dist, hit };
    },

    postPhysics() {
        if (!this.spawned || !this.body || window.State?.controlMode !== 'walk') return;

        const Engine = window.Engine;
        const camera = Engine?.camera;
        if (!camera) return;

        const State = window.State;
        const fps = State.viewMode === 'fps';

        this.group.position.set(this.body.position.x, this.body.position.y - 0.86, this.body.position.z);

        const speed = Math.hypot(this.body.velocity.x, this.body.velocity.z);
        const sprinting = window.Controls?.isAction?.('sprint') && speed > 0.5;

        if (speed > 0.2) {
            this.group.rotation.y = this._lastFacing ?? this.group.rotation.y;
        } else if (!fps) {
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this._camYaw, 0.08);
        } else {
            this.group.rotation.y = this._camYaw;
        }

        HumanMesh.updateWalk(this.group, speed, 0.016, sprinting);

        const ground = this._probeGround();
        window.Footsteps?.tick?.({
            speed,
            sprinting,
            grounded: ground.grounded,
            ground,
        });
        window.FpsViewmodel?.tick?.(speed);

        const base = this.group.position.clone();
        const chest = base.clone().add(new THREE.Vector3(0, 1.4, 0));

        if (fps) {
            const eye = base.clone().add(new THREE.Vector3(0, EYE_HEIGHT, 0));
            camera.position.lerp(eye, 0.35);
            camera.rotation.order = 'YXZ';
            camera.rotation.y = this._camYaw;
            camera.rotation.x = this._camPitch;
            Engine.controls.target.copy(chest);
        } else {
            const offset = new THREE.Vector3(
                Math.sin(this._camYaw) * Math.cos(this._camPitch) * TPS_DIST,
                Math.sin(this._camPitch) * TPS_DIST + TPS_HEIGHT,
                Math.cos(this._camYaw) * Math.cos(this._camPitch) * TPS_DIST
            );
            const desired = chest.clone().add(offset);
            camera.position.lerp(desired, 0.14);
            camera.lookAt(chest);
            Engine.controls.target.lerp(chest, 0.16);
        }
    },

    getState() {
        if (!this.spawned || !this.group) return null;
        return {
            position: {
                x: this.group.position.x,
                y: this.group.position.y,
                z: this.group.position.z,
            },
            controlMode: window.State?.controlMode || 'fly',
            viewMode: window.State?.viewMode || 'tps',
        };
    },

    applySkin({ bodyColor = 0x3366cc, headColor = 0xffcc99, roughness = 0.7 } = {}) {
        if (!this.group || this.group.userData.isGltf) return;
        HumanMesh.applySkin(this.group, { bodyColor, headColor, roughness });
    },

    async applyModelUrl(url) {
        if (!this.group) return;
        await HumanMesh.loadGltf(this.group, url);
        this._applyViewMode();
    },

    applyState(data) {
        if (!data) return;
        if (data.controlMode) window.State.controlMode = data.controlMode;
        if (data.viewMode) window.State.viewMode = data.viewMode;
        if (data.position && this.spawned) {
            this.body.position.set(data.position.x, data.position.y + 0.86, data.position.z);
            this.group.position.set(data.position.x, data.position.y, data.position.z);
        } else if (data.position && !this.spawned) {
            this.spawn(data.position.x, data.position.y, data.position.z);
        }
        this._applyViewMode();
        this._syncWalkOrbit();
    },
};

window.PlayerController = PlayerController;