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
const HIP_FOV = 75;
const ADS_FOV = 42;
const ADS_WALK_MULT = 0.72;

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
    _adsBlend: 0,
    _crouchBlend: 0,
    _lookBehindT: 0,
    _flashlight: null,
    _flashOn: false,
    _holstered: false,

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

        this._velX = 0;
        this._velZ = 0;
        await tryLoadAvatarGroup(this.group, 'starter_avatar.glb');

        this._inheritLookFromCamera();
        if (State.viewMode !== 'fps') {
            this._camPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this._camPitch));
        }
        this._syncWalkOrbit();
        this._applyViewMode();
        window.FpsViewmodel?.mount?.(Engine.camera);

        if (window.UI?.status) {
            window.UI.status('FiveM controls — LMB shoot · RMB aim · F interact/third eye · E vehicle · click canvas to look');
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
        this._setFlashlight(false);
        window.Engine?._releaseLookLock?.();
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
        const play = walk && !State.isPaused;
        Engine.controls.enabled = !play;
        if (walk && this.group) {
            const chest = this.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
            if (!play) Engine.controls.target.copy(chest);
        }
    },

    _inheritLookFromCamera() {
        const camera = window.Engine?.camera;
        if (!camera || !this.group) {
            this._camYaw = this.group?.rotation?.y ?? 0;
            this._camPitch = 0.28;
            return;
        }
        const chest = this.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        const offset = camera.position.clone().sub(chest);
        if (offset.lengthSq() < 0.25) {
            this._camYaw = this.group.rotation.y;
            this._camPitch = 0.28;
            return;
        }
        const horiz = Math.hypot(offset.x, offset.z) || 1;
        this._camYaw = Math.atan2(-offset.x, -offset.z);
        this._camPitch = Math.atan2(offset.y - TPS_HEIGHT, horiz);
        this._camPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this._camPitch));
    },

    applyLookInput(dx, dy, sens = 1) {
        if (!this.spawned || window.State?.controlMode !== 'walk' || window.State?.isPaused) return;
        this._camYaw -= dx * 0.003 * sens;
        this._camPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this._camPitch + dy * 0.0025 * sens));
    },

    resetCameraBehind() {
        if (!this.spawned || !this.group) return;
        this._camYaw = this.group.rotation.y;
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
        const fps = window.State?.viewMode === 'fps';
        const aiming = fps && Controls?.isAction?.('aim') && !Controls?.isHolstered?.();
        const crouching = Controls?.isAction?.('crouch');
        this._crouchBlend = THREE.MathUtils.lerp(this._crouchBlend, crouching ? 1 : 0, 0.18);
        const stealth = Controls?.isAction?.('stealthWalk');
        const sprintMult = Controls?.isAction('sprint') && !crouching ? SPRINT_MULT : 1;
        const adsMult = aiming ? ADS_WALK_MULT : 1;
        const crouchMult = THREE.MathUtils.lerp(1, 0.42, this._crouchBlend);
        const stealthMult = stealth ? 0.55 : 1;
        const targetSpeed = this.walkSpeed * sprintMult * adsMult * crouchMult * stealthMult;

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
        const aiming = fps && window.Controls?.isAction?.('aim') && !window.Controls?.isHolstered?.();
        this._adsBlend = THREE.MathUtils.lerp(this._adsBlend, aiming ? 1 : 0, 0.2);
        this._holstered = window.Controls?.isHolstered?.() ?? false;

        const crouchY = this._crouchBlend * 0.38;
        this.group.position.set(this.body.position.x, this.body.position.y - 0.86 - crouchY, this.body.position.z);
        const bodyScale = 1 - this._crouchBlend * 0.14;
        this.group.scale.set(1, bodyScale, 1);

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
        window.FpsViewmodel?.setAiming?.(this._adsBlend);
        window.FpsViewmodel?.setHolstered?.(this._holstered);
        window.FpsViewmodel?.tick?.(speed);
        this._tickFlashlight();

        if (fps && camera.fov != null) {
            camera.fov = THREE.MathUtils.lerp(HIP_FOV, ADS_FOV, this._adsBlend);
            camera.updateProjectionMatrix();
        }
        document.getElementById('fps-crosshair')?.classList.toggle('ads', this._adsBlend > 0.55);

        const base = this.group.position.clone();
        const chest = base.clone().add(new THREE.Vector3(0, 1.4 - this._crouchBlend * 0.5, 0));
        let yaw = this._camYaw;
        if (this._lookBehindT > 0) {
            this._lookBehindT = Math.max(0, this._lookBehindT - 0.016);
            yaw += Math.PI * Math.sin((1 - this._lookBehindT / 0.45) * Math.PI);
        }

        if (fps) {
            const eye = base.clone().add(new THREE.Vector3(0, EYE_HEIGHT, 0));
            camera.position.lerp(eye, 0.35);
            camera.rotation.order = 'YXZ';
            camera.rotation.y = yaw;
            camera.rotation.x = this._camPitch;
            Engine.controls.target.copy(chest);
        } else {
            const dist = TPS_DIST - this._crouchBlend * 0.8;
            const height = TPS_HEIGHT - this._crouchBlend * 0.55;
            const offset = new THREE.Vector3(
                -Math.sin(yaw) * Math.cos(this._camPitch) * dist,
                Math.sin(this._camPitch) * dist + height,
                -Math.cos(yaw) * Math.cos(this._camPitch) * dist
            );
            const desired = chest.clone().add(offset);
            camera.position.lerp(desired, 0.14);
            camera.lookAt(chest);
            Engine.controls.target.copy(chest);
        }
    },

    lookBehind() {
        if (!this.spawned) return;
        this._lookBehindT = 0.45;
    },

    toggleFlashlight() {
        this._setFlashlight(!this._flashOn);
        window.UI?.status?.(this._flashOn ? 'Flashlight on' : 'Flashlight off');
    },

    _setFlashlight(on) {
        const Engine = window.Engine;
        if (!Engine?.scene) return;
        this._flashOn = on;
        if (on && !this._flashlight) {
            this._flashlight = new THREE.SpotLight(0xfff4e8, 2.8, 28, 0.42, 0.35, 1.2);
            this._flashlight.castShadow = false;
            Engine.scene.add(this._flashlight);
            Engine.scene.add(this._flashlight.target);
        }
        if (this._flashlight) this._flashlight.visible = on;
    },

    _tickFlashlight() {
        if (!this._flashOn || !this._flashlight) return;
        const camera = window.Engine?.camera;
        if (!camera) return;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        this._flashlight.position.copy(camera.position);
        this._flashlight.target.position.copy(camera.position).addScaledVector(dir, 6);
    },

    playMelee() {
        if (!this.spawned || !this.group) return;
        const parts = this.group.userData?.humanParts;
        if (parts?.armR) {
            parts.armR.rotation.x = -1.2;
            setTimeout(() => { if (parts?.armR) parts.armR.rotation.x = -0.35; }, 180);
        }
        window.StarterSfx?.playMetalImpact?.(0.38);
    },

    playReload() {
        window.StarterSfx?.playStarterSfx?.('starter_gun_reload', 0.42);
        window.FpsViewmodel?.playReload?.();
    },

    playEmote() {
        if (!this.group) return;
        const parts = this.group.userData?.humanParts;
        if (parts?.armL && parts?.armR) {
            parts.armL.rotation.z = 1.1;
            parts.armR.rotation.z = -1.1;
            setTimeout(() => {
                if (parts?.armL) parts.armL.rotation.z = 0.12;
                if (parts?.armR) parts.armR.rotation.z = -0.12;
            }, 900);
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