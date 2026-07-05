import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import driveCfg from '../../config/tc-drive.json';
import { AssetBundle } from './assetBundle.js';
import { GltfImport } from './gltfImport.js';
import { Actions } from './actions.js';
import { RemotePlayers } from './remotePlayers.js';
import { TC_IDS, normTcId } from './tcMeta.js';

function normKey(key) {
    return String(key || '').toUpperCase();
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

    _mount(mesh, id, silent = false) {
        const entry = findVehicleRoot(mesh);
        if (!entry?.body) {
            if (!silent) window.UI?.status?.('Vehicle has no physics — enable physics on GLTF');
            return false;
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
        if (!silent) window.UI?.status?.(`Driving ${mesh.userData?.name || id} — WASD steer`);
        return true;
    },

    release() {
        const net = window.Network;
        if (net?.mode === 'guest') {
            Actions.dispatch('VEHICLE_RELEASE', {});
        } else {
            this.hostRelease(window.Session?.playerKey);
        }
        if (this.mesh) delete this.mesh.userData.driveClaimedBy;
        this.active = false;
        this.vehicleId = null;
        this.mesh = null;
        this.body = null;
        window.State.controlMode = 'fly';
        clearInterval(this._reportTimer);
        this._reportTimer = null;
        window.UI?.updateControlMode?.();
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
            return { x: p.x, y: p.y, z: p.z, rotY: PC.group.rotation.y, mode: 'walk' };
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
        if (!this.active || !this.body || window.State?.isPaused || window.State?.cutscenePlaying) return;

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
    },

    postPhysics() {
        if (!this.active || !this.mesh) return;
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

        const roster = Object.entries(avatars).map(([key, av]) => ({
            key: normKey(key),
            name: this.claims[av?.vehicleId] === normKey(key) ? key : key,
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