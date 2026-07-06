import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import driveCfg from '../../config/tc-drive.json';
import gateCfg from '../../config/tc-gates.json';
import { engineClipForVehicle } from './starterSfx.js';
import { AssetBundle } from './assetBundle.js';
import { GltfImport } from './gltfImport.js';
import { Actions } from './actions.js';
import { RemotePlayers } from './remotePlayers.js';
import { TC_IDS, normTcId } from './tcMeta.js';

function normKey(key) {
    return String(key || '').toUpperCase();
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function animFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

function findVehicleRoot(mesh) {
    const State = window.State;
    if (!mesh || !State?.physicsObjects) return null;
    for (const entry of State.physicsObjects) {
        if (entry.mesh === mesh) return entry;
        let p = mesh;
        while (p) {
            if (p === entry.mesh) return entry;
            p = p.parent;
        }
    }
    return null;
}

export const TcDrive = {
    active: false,
    vehicleId: null,
    mesh: null,
    body: null,
    claims: {},
    _reportTimer: null,
    _animating: false,
    _prevSpd: 0,
    _brakeCooldown: 0,
    _skidCooldown: 0,

    findVehicle(id) {
        const nid = normTcId(id || '');
        return (window.State?.objects || []).find(
            (o) => o.userData?.id === id || o.userData?.id === nid
        );
    },

    getClaims() {
        return { ...this.claims };
    },

    setClaims(claims = {}) {
        this.claims = { ...claims };
    },

    hostClaim(playerKey, vehicleId) {
        const key = normKey(playerKey);
        const id = vehicleId || driveCfg.defaultVehicle;
        if (this.claims[id] && this.claims[id] !== key) return false;
        Object.entries(this.claims).forEach(([vid, pk]) => {
            if (pk === key) delete this.claims[vid];
        });
        this.claims[id] = key;
        const veh = this.findVehicle(id);
        if (veh) veh.userData.driveClaimedBy = key;
        window.Network?.scheduleLiveSync?.();
        return true;
    },

    hostRelease(playerKey) {
        const key = normKey(playerKey);
        Object.entries({ ...this.claims }).forEach(([vid, pk]) => {
            if (pk === key) {
                delete this.claims[vid];
                const veh = this.findVehicle(vid);
                if (veh) delete veh.userData.driveClaimedBy;
            }
        });
        window.Network?.scheduleLiveSync?.();
    },

    async claimVehicle(preferredId = null) {
        const Session = window.Session;
        const net = window.Network;
        if (net?.mode === 'spectate') {
            window.UI?.status?.('Spectators cannot drive');
            return false;
        }
        if (net?.mode === 'guest') {
            const vid = preferredId || driveCfg.defaultVehicle;
            Actions.dispatch('VEHICLE_CLAIM', { vehicleId: vid });
            const order = [vid, ...(driveCfg.fallbackOrder || [])];
            for (const id of order) {
                const veh = this.findVehicle(id);
                if (veh && this._mount(veh, id)) return true;
            }
            return true;
        }

        const key = normKey(Session?.playerKey);
        const order = [
            preferredId,
            ...(driveCfg.fallbackOrder || ['tc_run', 'tc_haul']),
        ].filter(Boolean);

        for (const id of order) {
            const veh = this.findVehicle(id);
            if (veh && (!this.claims[id] || this.claims[id] === key)) {
                if (this.hostClaim(key, id) && this._mount(veh, id)) return true;
            }
        }

        const spawned = await this._spawnExtraVehicle(key);
        if (spawned) return this._mount(spawned, spawned.userData.id);

        window.UI?.status?.('No TC vehicle available to claim');
        return false;
    },

    isAnimating() {
        return !!this._animating;
    },

    async _playEnterAnim(mesh) {
        const Engine = window.Engine;
        const PC = window.PlayerController;
        if (!Engine?.camera || !Engine.controls || !mesh) return;

        const dur = gateCfg.enterAnimMs || 580;
        const startCam = Engine.camera.position.clone();
        const startTarget = Engine.controls.target.clone();
        const veh = mesh.position.clone();
        const yaw = mesh.rotation.y;
        const camBack = new THREE.Vector3(Math.sin(yaw + 0.55) * 6.5, 2.4, Math.cos(yaw + 0.55) * 6.5);
        const endCam = veh.clone().add(camBack);
        const endTarget = veh.clone().add(new THREE.Vector3(0, 1.05, 0));
        const baseY = mesh.position.y;
        const hasPlayer = !!PC?.spawned;

        this._animating = true;
        const t0 = performance.now();
        while (performance.now() - t0 < dur) {
            const raw = (performance.now() - t0) / dur;
            const ease = easeOutCubic(Math.min(1, raw));
            Engine.camera.position.lerpVectors(startCam, endCam, ease);
            Engine.controls.target.lerpVectors(startTarget, endTarget, ease);
            mesh.position.y = baseY + Math.sin(ease * Math.PI) * 0.12;
            if (hasPlayer && PC.group) {
                const s = Math.max(0.12, 1 - ease * 0.88);
                PC.group.scale.setScalar(s);
            }
            await animFrame();
        }
        mesh.position.y = baseY;
        if (hasPlayer && PC.group) PC.group.scale.setScalar(1);
        this._animating = false;
    },

    async _playExitAnim(mesh) {
        const Engine = window.Engine;
        const PC = window.PlayerController;
        const Physics = window.Physics;
        if (!Engine?.camera || !Engine.controls || !mesh) return;

        const off = gateCfg.exitOffset || { x: 2.2, y: 0.5, z: 0.4 };
        const offset = new THREE.Vector3(off.x, 0, off.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), mesh.rotation.y);
        const spawn = mesh.position.clone().add(offset);
        const dur = gateCfg.exitAnimMs || 520;
        const startCam = Engine.camera.position.clone();
        const startTarget = Engine.controls.target.clone();

        this._animating = true;
        PC?.spawn?.(spawn.x, spawn.y + (off.y || 0.5), spawn.z);
        if (PC?.group) {
            PC.group.scale.setScalar(0.15);
            PC.group.rotation.y = mesh.rotation.y + Math.PI * 0.5;
        }
        if (PC?.body && Physics?.world) {
            PC.body.velocity.set(0, 0, 0);
            PC.body.position.set(spawn.x, spawn.y + 0.8, spawn.z);
        }

        const endTarget = spawn.clone().add(new THREE.Vector3(0, 1.35, 0));
        const endCam = endTarget.clone().add(new THREE.Vector3(
            Math.sin(mesh.rotation.y) * -4.5,
            2.3,
            Math.cos(mesh.rotation.y) * -4.5
        ));

        const t0 = performance.now();
        while (performance.now() - t0 < dur) {
            const raw = (performance.now() - t0) / dur;
            const ease = easeOutCubic(Math.min(1, raw));
            Engine.camera.position.lerpVectors(startCam, endCam, ease);
            Engine.controls.target.lerpVectors(startTarget, endTarget, ease);
            if (PC?.group) {
                const s = 0.15 + ease * 0.85;
                PC.group.scale.setScalar(s);
            }
            await animFrame();
        }
        if (PC?.group) PC.group.scale.setScalar(1);
        this._animating = false;
    },

    async _spawnExtraVehicle(playerKey) {
        const spec = driveCfg.spawnExtra || {};
        const id = `${spec.vehicleId || 'tc_run'}_${playerKey.slice(-4).toLowerCase()}`;
        if (this.findVehicle(id)) return this.findVehicle(id);

        const offset = spec.offset || { x: 0, y: 0, z: 4 };
        const span = this.findVehicle(TC_IDS.span);
        const base = span?.position || { x: 0, y: 0, z: 0 };

        try {
            const root = await GltfImport.insertAtCursor({
                url: AssetBundle.getUrl(spec.url || 'import/tc_run.glb'),
                name: spec.name || 'TC Runner',
                usePhysics: true,
                mass: 3.4,
                friction: 0.36,
                restitution: 0.14,
                pos: { x: base.x + offset.x, y: base.y + offset.y, z: base.z + offset.z },
            });
            if (!root) return null;
            Object.assign(root.userData, {
                id,
                type: 'gltf',
                isTC: true,
                tcEd: 'tc-veh',
                driveSpawned: true,
            });
            this.hostClaim(playerKey, id);
            return root;
        } catch (e) {
            console.warn('[tc-drive] spawn extra', e);
            return null;
        }
    },

    async _mount(mesh, id, silent = false) {
        const entry = findVehicleRoot(mesh);
        if (!entry?.body) {
            if (!silent) window.UI?.status?.('Vehicle has no physics — enable physics on GLTF');
            return false;
        }

        if (!silent) await this._playEnterAnim(mesh);
        if (!silent && !this._vitalsSnapshot) {
            this._vitalsSnapshot = window.SurvivalNeeds?.snapshotForHandoff?.() || null;
        }
        window.PlayerController?.despawn?.();
        this.mesh = mesh;
        this.body = entry.body;
        this.vehicleId = id;
        this.active = true;
        window.State.controlMode = 'vehicle';
        mesh.userData.driveClaimedBy = normKey(window.Session?.playerKey);
        window.UI?.updateControlMode?.();
        this._startAvatarReporter();
        const engClip = mesh.userData?.engineClipId || engineClipForVehicle(id);
        window.EngineAudio?.start?.(engClip, id === 'tc_haul' ? 0.26 : 0.2);
        if (!silent) window.UI?.status?.(`Driving ${mesh.userData?.name || id} — WASD steer`);
        return true;
    },

    async release() {
        const net = window.Network;
        const mesh = this.mesh;
        const wasActive = this.active;

        if (net?.mode === 'guest') {
            Actions.dispatch('VEHICLE_RELEASE', {});
        } else {
            this.hostRelease(window.Session?.playerKey);
        }
        if (mesh) delete mesh.userData.driveClaimedBy;
        this.active = false;
        this.vehicleId = null;
        this.mesh = null;
        this.body = null;
        clearInterval(this._reportTimer);
        this._reportTimer = null;

        if (wasActive && mesh) await this._playExitAnim(mesh);
        window.EngineAudio?.stop?.();

        window.State.controlMode = wasActive && mesh ? 'walk' : 'fly';
        window.UI?.updateControlMode?.();
        if (this._vitalsSnapshot) {
            window.SurvivalNeeds?.restoreHandoff?.(this._vitalsSnapshot);
            this._vitalsSnapshot = null;
        }
        window.Network?.updateLocalAvatar?.(this._fallbackAvatar());
    },

    rebindAfterSync() {
        if (!this.vehicleId) return;
        const veh = this.findVehicle(this.vehicleId);
        if (veh) this._mount(veh, this.vehicleId, true);
    },

    getAvatar() {
        if (this.active && this.mesh) {
            return {
                x: this.mesh.position.x,
                y: this.mesh.position.y,
                z: this.mesh.position.z,
                rotY: this.mesh.rotation.y,
                mode: 'vehicle',
                vehicleId: this.vehicleId,
            };
        }
        return null;
    },

    _fallbackAvatar() {
        const PC = window.PlayerController;
        if (PC?.spawned && PC.group) {
            const p = PC.group.position;
            const appearance = window.AppearanceProfile?.profileForNetwork?.(
                PC.group.userData?.appearanceProfile || window.AppearanceStore?.getPlayerProfile?.()
            );
            return {
                x: p.x, y: p.y, z: p.z, rotY: PC.group.rotation.y, mode: 'walk',
                appearance,
            };
        }
        const cam = window.Engine?.camera;
        if (cam) return { x: cam.position.x, y: cam.position.y, z: cam.position.z, rotY: 0, mode: 'fly' };
        return null;
    },

    _startAvatarReporter() {
        clearInterval(this._reportTimer);
        this._reportTimer = setInterval(() => this._reportAvatar(), 90);
    },

    _reportAvatar() {
        const net = window.Network;
        if (!net || net.mode === 'solo') {
            window.Network?.updateLocalAvatar?.(this.getAvatar() || this._fallbackAvatar());
            return;
        }
        const av = this.getAvatar() || this._fallbackAvatar();
        if (!av) return;
        if (net.mode === 'host') net.updateLocalAvatar(av);
        else net.sendPlayerAvatar(av);
    },

    prePhysics() {
        if (this._animating || !this.active || !this.body || window.State?.isPaused || window.State?.cutscenePlaying) return;

        const Controls = window.Controls;
        const forward = new THREE.Vector3(
            Math.sin(this.mesh.rotation.y),
            0,
            Math.cos(this.mesh.rotation.y)
        );
        const mass = this.body.mass || 3;
        const engine = (driveCfg.engineForce || 90) * (mass / 3.4);
        const brake = (driveCfg.brakeForce || 54) * (mass / 3.4);
        const maxSpd = driveCfg.maxSpeed || 14;
        const force = new CANNON.Vec3(0, 0, 0);

        if (Controls?.isAction('forward')) {
            force.x += forward.x * engine;
            force.z += forward.z * engine;
        }
        if (Controls?.isAction('back')) {
            force.x -= forward.x * brake;
            force.z -= forward.z * brake;
        }

        if (Controls?.isAction('left')) this.body.angularVelocity.y = driveCfg.turnRate || 2.4;
        else if (Controls?.isAction('right')) this.body.angularVelocity.y = -(driveCfg.turnRate || 2.4);
        else this.body.angularVelocity.y *= 0.82;

        if (force.length() > 0) this.body.applyForce(force, this.body.position);

        const spd = Math.hypot(this.body.velocity.x, this.body.velocity.z);
        if (spd > maxSpd) {
            const s = maxSpd / spd;
            this.body.velocity.x *= s;
            this.body.velocity.z *= s;
        }
        this.body.velocity.x *= 0.985;
        this.body.velocity.z *= 0.985;

        const now = performance.now();
        const braking = Controls?.isAction('back');
        const turning = Controls?.isAction('left') || Controls?.isAction('right');
        const decel = this._prevSpd - spd;

        if (braking && spd > 3.5 && (decel > 0.6 || spd > 7) && now > this._brakeCooldown) {
            window.StarterSfx?.playStarterSfx?.('starter_brake_squeal', 0.42);
            this._brakeCooldown = now + 1100;
        }
        if (turning && spd > 8.5 && now > this._skidCooldown) {
            window.StarterSfx?.playStarterSfx?.('starter_tire_skid', 0.34);
            this._skidCooldown = now + 1400;
        }
        this._prevSpd = spd;

        window.EngineAudio?.setThrottle?.(spd, driveCfg.maxSpeed || 14);
    },

    postPhysics() {
        if (this._animating || !this.active || !this.mesh) return;
        const Engine = window.Engine;
        if (!Engine?.camera || !Engine.controls) return;

        const forward = new THREE.Vector3(
            Math.sin(this.mesh.rotation.y),
            0,
            Math.cos(this.mesh.rotation.y)
        );
        const target = this.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0));
        const back = forward.clone().multiplyScalar(-7).add(new THREE.Vector3(0, 2.2, 0));
        Engine.camera.position.lerp(target.clone().add(back), 0.14);
        Engine.controls.target.lerp(target, 0.16);

        if (window.Network?.mode === 'host') {
            window.Network.updateLocalAvatar(this.getAvatar());
        }
    },

    applyNetworkState(avatars = {}, claims = {}) {
        this.setClaims(claims);
        const self = normKey(window.Session?.playerKey);

        Object.entries(avatars).forEach(([key, av]) => {
            const k = normKey(key);
            if (k === self && this.active) return;
            if (av?.mode === 'vehicle' && av.vehicleId) {
                const veh = this.findVehicle(av.vehicleId);
                if (veh && Number.isFinite(av.x)) {
                    veh.position.lerp(new THREE.Vector3(av.x, av.y, av.z), 0.45);
                    if (Number.isFinite(av.rotY)) veh.rotation.y = av.rotY;
                    veh.userData.driveClaimedBy = k;
                }
            }
        });

        const roster = window.Network?.getPlayerList?.() || Object.entries(avatars).map(([key]) => ({
            key: normKey(key),
            name: key,
        }));
        RemotePlayers.syncAvatars(avatars, roster);
    },

    async enterTcRace(options = {}) {
        await window.TcCircuit?.start?.(options);
        return this.claimVehicle(options.vehicleId || driveCfg.defaultVehicle);
    },
};

window.TcDrive = TcDrive;
window.World = window.World || {};
window.World.claimTcVehicle = (id) => TcDrive.claimVehicle(id);
window.World.releaseTcVehicle = () => TcDrive.release();
window.World.enterTcRace = (opts) => TcDrive.enterTcRace(opts);