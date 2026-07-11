import * as THREE from 'three';
import { State, OBJECT_TYPES } from './state.js';
import { Engine } from './engineCore.js';
import { Physics } from './physics.js';
import { AudioSys } from './audioSys.js';
import { UI } from './ui.js';
import { SimMode } from '../shared/simMode.js';
import { Session } from '../shared/session.js';
import { Runtime } from '../shared/runtime.js';
import { getSceneObjectsForSpawn } from '../shared/sceneContext.js';
import { PlayerController } from './player.js';
import { HumanMesh } from './humanMesh.js';
import { GltfImport } from '../shared/gltfImport.js';
import { TextureBridge } from '../shared/textureBridge.js';
import { Cinematic } from '../shared/cinematic.js';
import { NegativeLod } from '../shared/negativeLod.js';

export const World = {
    _requireEditWorld(action = 'modify the world') {
        if (SimMode.canEditWorld()) return true;
        UI.status(SimMode.isPlay()
            ? `PLAY mode — tap EDIT (top-left) to ${action}`
            : `Cannot ${action} — no edit permission`);
        return false;
    },

    // Modified to allow Physics flag
    createObject: function (type, name, color = 0xffffff, usePhysics = false) {
        if (!this._requireEditWorld('add objects')) return null;
        let geo, mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.52,
            metalness: 0.12,
            envMapIntensity: 0.48,
        });
        if (type === 'cube') geo = new THREE.BoxGeometry(1, 1, 1);
        else if (type === 'sphere') geo = new THREE.SphereGeometry(0.7, 32, 32);
        else if (type === 'cone') geo = new THREE.ConeGeometry(0.7, 1.2, 32);
        else if (type === 'torus') geo = new THREE.TorusGeometry(0.6, 0.2, 16, 100);
        else return null;
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 5; // Start high to drop
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { id: Date.now().toString(36), name: name || type, type: type, locked: false, isRotating: false, hasPhysics: usePhysics };
        Engine.scene.add(mesh);
        State.objects.push(mesh);
        NegativeLod.syncObject(mesh);
        window.dispatchEvent(new CustomEvent('threshold:object-added', { detail: { mesh } }));
        if (usePhysics) {
            const body = Physics.addBody(mesh, type);
            State.physicsObjects.push({ mesh, body });
        }
        AudioSys.playTone(300, 'sine');
        return mesh;
    },
    addCustom: function (geometry, material, name, usePhysics = false) {
        if (!this._requireEditWorld('add objects')) return null;
        // Ensure material reacts to Bloom in Hyper mode
        if (material) {
            material.emissiveIntensity = 0.12;
            // If the color is very bright, increase emissive
            if (material.color.getHex() > 0xaaaaaa) {
                material.emissive = material.color;
                material.emissiveIntensity = 0.1;
            }
        }
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 5;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { id: Date.now().toString(36), name: name || 'custom', type: 'custom', locked: false, isRotating: false, hasPhysics: usePhysics };
        Engine.scene.add(mesh);
        State.objects.push(mesh);
        NegativeLod.syncObject(mesh);
        window.dispatchEvent(new CustomEvent('threshold:object-added', { detail: { mesh } }));
        if (usePhysics) {
            // Auto-detect best physics shape
            let shapeType = 'box';
            if (geometry.type.toLowerCase().includes('sphere')) shapeType = 'sphere';
            const body = Physics.addBody(mesh, shapeType);
            State.physicsObjects.push({ mesh, body });
        }
        AudioSys.playTone(400, 'sine');
        return mesh;
    },
    spawnAtCursor: function (type) {
        const mesh = this.createObject(type, type, Math.random() * 0xffffff, true);
        if (mesh) {
            const entry = State.physicsObjects.find((o) => o.mesh === mesh);
            if (entry) {
                entry.body.position.set(State.ctxTargetPos.x, State.ctxTargetPos.y + 2, State.ctxTargetPos.z);
                entry.body.velocity.set(0, 0, 0);
            } else {
                mesh.position.set(State.ctxTargetPos.x, State.ctxTargetPos.y + 1, State.ctxTargetPos.z);
            }
        }
        UI.closeCtx();
    },
    insertRandomObject: function () {
        const type = OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)];
        this.spawnAtCursor(type);
    },
    spawnCharacter: function (silent = false) {
        const x = State.ctxTargetPos.x;
        const z = State.ctxTargetPos.z;
        const y = State.ctxTargetPos.y;
        const npc = HumanMesh.build();
        if (npc) {
            npc.position.set(x, y, z);
            npc.userData = {
                id: `npc_${Date.now()}`,
                name: 'NPC',
                type: 'human',
                isHuman: true,
                isCharacter: true,
                locked: false
            };
            Engine.scene.add(npc);
            State.objects.push(npc);
        }
        if (!silent) {
            UI.closeInsert();
            UI.status('NPC human inserted');
            if (npc) setTimeout(() => SoundPrompt.offerForObject(npc, 'NPC character', 'interact'), 400);
        }
    },
    spawnPlayablePlayer: function (silent = false) {
        const x = State.ctxTargetPos.x;
        const z = State.ctxTargetPos.z;
        const y = State.ctxTargetPos.y + 1;
        PlayerController.spawn(x, y, z);
        if (!silent) { UI.closeInsert(); UI.updateControlMode(); }
    },
    insertPlayerByKey: function (key, silent = false) {
        const player = Session.getPlayer(key);
        if (!player) {
            if (!silent) UI.status('Player key not found — import their file first');
            return false;
        }
        if (player.code) Runtime.execute(player.code, 'player-key');
        else if (player.objects?.length) this.spawnObjectSnapshot(player.objects);
        if (!silent) { UI.closeInsert(); UI.status(`Inserted player ${player.name}`); }
        return true;
    },
    insertSavedPlayer: function (key, silent = false) {
        return this.insertPlayerByKey(key, silent);
    },
    spawnObjectSnapshot: function (objects) {
        const ox = State.ctxTargetPos.x;
        const oz = State.ctxTargetPos.z;
        const gltfSnapshots = [];
        objects.forEach((d) => {
            if (d.type === 'gltf' || d.userData?.type === 'gltf') {
                gltfSnapshots.push({
                    ...d,
                    pos: {
                        x: ox + (d.pos?.x || 0),
                        y: d.pos?.y ?? 1,
                        z: oz + (d.pos?.z || 0),
                    },
                });
                return;
            }
            const m = this.createObject(d.type, d.name, d.color, false);
            if (m) {
                m.position.set(ox + (d.pos?.x || 0), d.pos?.y || 1, oz + (d.pos?.z || 0));
                if (d.rot) m.rotation.set(d.rot.x, d.rot.y, d.rot.z);
                if (d.scl) m.scale.set(d.scl.x, d.scl.y, d.scl.z);
                if (d.userData) m.userData = { ...m.userData, ...d.userData };
            }
        });
        TextureBridge.rehydrateScene();
        if (gltfSnapshots.length) GltfImport.spawnSnapshots(gltfSnapshots);
    },
    insertGltfAtCursor: async function (payload, silent = false) {
        try {
            const insertPayload = { ...payload };
            if (!payload.pos) delete insertPayload.pos;
            await GltfImport.insertAtCursor(insertPayload);
            if (!silent) UI.closeInsert();
            UI.status(`Inserted GLTF: ${payload.name || 'model'}`);
        } catch (e) {
            UI.status(e.message || 'GLTF insert failed');
        }
    },
    runCustomAtCursor: function (code, silent = false) {
        const wrapped = `const _x=${State.ctxTargetPos.x}, _y=${State.ctxTargetPos.y}, _z=${State.ctxTargetPos.z};\n${code}`;
        Runtime.execute(wrapped, 'insert-code');
        if (!silent) {
            UI.closeInsert();
            setTimeout(() => SoundPrompt.offerForWorld('Custom code / object'), 500);
        }
    },
    getCursorPos: function () {
        return { x: State.ctxTargetPos.x, y: State.ctxTargetPos.y, z: State.ctxTargetPos.z };
    },
    deleteObject: function (obj) {
        const root = Engine.resolveRegistryObject(obj) || obj;
        if (!root || root.userData?.isPlayer) return;
        if (!SimMode.canEditObject(root)) {
            UI.status(SimMode.isPlay()
                ? 'PLAY mode — switch to EDIT to delete objects'
                : 'Cannot delete — no edit permission');
            return;
        }
        window.SceneHistory?.push?.('before:deleteObject', {
            id: root.userData?.id,
            name: root.userData?.name || 'Object',
        });
        if (root.userData?.type === 'gltf') {
            GltfImport.removeFromWorld(root);
            UI.status(`Deleted: ${root.userData?.name || 'GLTF'}`);
            return;
        }
        Engine.transformControl.detach();
        const physIdx = State.physicsObjects.findIndex((p) => p.mesh === root);
        if (physIdx > -1) {
            Physics.world.removeBody(State.physicsObjects[physIdx].body);
            State.physicsObjects.splice(physIdx, 1);
        }
        window.MeshLod?.dispose?.(root);
        Engine.scene.remove(root);
        State.objects = State.objects.filter((o) => o !== root);
        GltfImport.disposeObjectTree(root);
        UI.deselectObject();
        UI.status(`Deleted: ${root.userData?.name || 'Object'}`);
    },
    clearWorld: function (silent = false) {
        window.SceneHistory?.push?.('before:clearWorld');
        State.physicsObjects.forEach(p => Physics.world.removeBody(p.body));
        State.physicsObjects = [];
        State.objects.forEach(o => Engine.scene.remove(o));
        State.objects = [];
        Engine.transformControl.detach();
        UI.deselectObject();
        if (!silent) UI.status('World cleared');
    },
    playCutscene: async function (source, options = {}) {
        return Cinematic.play(source, options);
    },
    stopCutscene: async function () {
        return Cinematic.stop('manual');
    },
    listVideos: async function () {
        return Cinematic.listBundled();
    },
    startTcCircuit: function (options = {}) {
        return window.TcCircuit?.start?.(options);
    },
    stopTcCircuit: function () {
        return window.TcCircuit?.stop?.();
    },
    claimTcVehicle: function (vehicleId) {
        return window.TcDrive?.claimVehicle?.(vehicleId);
    },
    releaseTcVehicle: function () {
        return window.TcDrive?.release?.();
    },
    enterTcRace: function (options = {}) {
        return window.TcDrive?.enterTcRace?.(options);
    },
    setWeather: function (options = {}) {
        return window.WeatherSystem?.setWeather?.(options);
    },
    playRecordedSfx: function (tag, opts = {}) {
        return window.RecordedAmbient?.playTag?.(tag, opts);
    },
    // NEW: Dynamic import for limitless extensions (e.g., loaders, controls)
    importModule: async function (modulePath, alias) {
        try {
            const mod = await import(modulePath); // e.g., 'three/examples/jsm/loaders/OBJLoader.js'
            window[alias || modulePath.split('/').pop().replace('.js', '')] = mod;
            UI.status(`Imported ${modulePath} as ${alias || 'global'}. Use it endlessly!`);
            return mod;
        } catch (e) {
            console.error(e);
            UI.status("Import failed: " + e.message);
        }
    }
};
