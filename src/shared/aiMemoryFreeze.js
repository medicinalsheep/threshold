import * as THREE from 'three';
import { WorkFolderScope } from './workFolderScope.js';
import { MeshLod } from './meshLod.js';
import { GltfImport } from './gltfImport.js';

let suspendLoads = false;
let suspendWaiters = [];

export function isLoadSuspended() {
    return suspendLoads;
}

export async function waitWhileLoadSuspended() {
    while (suspendLoads) {
        await new Promise((resolve) => {
            suspendWaiters.push(resolve);
            setTimeout(resolve, 400);
        });
    }
}

function resumeLoadWaiters() {
    const waiters = suspendWaiters.splice(0);
    waiters.forEach((fn) => fn());
}

function isEssentialObject(obj, parkMode) {
    const ud = obj?.userData || {};
    if (ud.isPlayer || ud.id === 'player' || ud.isFloor || ud.id === 'floor' || ud.type === 'grid' || ud.isGrid) {
        return true;
    }
    if (parkMode === 'none') return true;
    if (parkMode === 'full') return false;
    if (parkMode === 'gltf') {
        return ud.type !== 'gltf' && !ud.isGltf;
    }
    if (parkMode === 'heavy') {
        if (ud.type === 'gltf' || ud.isGltf) return false;
        if (ud._lodScenes?.length > 1) return false;
        return true;
    }
    return true;
}

function disposeObjectGpu(root) {
    root.traverse((c) => {
        if (c.geometry) c.geometry.dispose?.();
        if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
            else c.material.dispose?.();
        }
    });
}

function snapshotObject(obj) {
    const ud = obj.userData || {};
    const gltfPath = ud.gltfPath || ud.gltfUrl || null;
    return {
        obj,
        wasVisible: obj.visible,
        parkMode: null,
        transform: {
            pos: obj.position.clone(),
            rot: obj.rotation.clone(),
            scl: obj.scale.clone(),
        },
        userData: {
            ...ud,
            gltfPath: ud.gltfPath || null,
            gltfUrl: ud.gltfUrl || null,
            gltfFile: ud.gltfFile || null,
        },
        gltfPath,
        color: obj.material?.color?.getHex?.() ?? ud.color ?? 0xffffff,
        type: ud.type || 'cube',
        name: ud.name || 'Object',
        removed: false,
        restoreKey: gltfPath ? `${gltfPath}@${obj.position.x.toFixed(2)},${obj.position.z.toFixed(2)}` : null,
    };
}

export const AiMemoryFreeze = {
    _depth: 0,
    _parked: [],
    _wasPaused: null,
    _freezeMeta: null,
    _overlay: null,
    _ambientPaused: false,

    isFrozen() {
        return this._depth > 0;
    },

    getStatus() {
        return {
            frozen: this._depth > 0,
            depth: this._depth,
            scope: WorkFolderScope.getScope().id,
            parked: this._parked.length,
            meta: this._freezeMeta,
        };
    },

    ensureOverlay() {
        if (this._overlay) return this._overlay;
        const el = document.createElement('div');
        el.id = 'ai-freeze-overlay';
        el.className = 'ai-freeze-overlay';
        el.setAttribute('aria-live', 'polite');
        el.innerHTML = `
            <div class="ai-freeze-frame" id="ai-freeze-frame"></div>
            <div class="ai-freeze-status">
                <span class="ai-freeze-spinner" aria-hidden="true"></span>
                <span class="ai-freeze-label">Local model thinking…</span>
                <span class="ai-freeze-model" id="ai-freeze-model"></span>
                <span class="ai-freeze-scope" id="ai-freeze-scope"></span>
            </div>
        `;
        document.body.appendChild(el);
        this._overlay = el;
        return el;
    },

    _setOverlayFrame() {
        const canvas = window.Engine?.renderer?.domElement;
        const frame = document.getElementById('ai-freeze-frame');
        if (!canvas || !frame) return;
        try {
            frame.style.backgroundImage = `url(${canvas.toDataURL('image/jpeg', 0.78)})`;
        } catch {
            frame.style.backgroundImage = 'none';
        }
    },

    _updateOverlayMeta(meta = {}) {
        const modelEl = document.getElementById('ai-freeze-model');
        const scopeEl = document.getElementById('ai-freeze-scope');
        if (modelEl) {
            modelEl.textContent = meta.model ? `${meta.model}${meta.tier ? ` · ${meta.tier}` : ''}` : '';
        }
        if (scopeEl) {
            const scope = WorkFolderScope.getScope();
            scopeEl.textContent = `Working folder: ${scope.label}`;
        }
    },

    async enter(meta = {}) {
        if (!WorkFolderScope.shouldFreezeOnLocal()) return;

        this._depth += 1;
        if (this._depth > 1) return;

        this._freezeMeta = meta;
        suspendLoads = true;

        const State = window.State;
        if (State) {
            this._wasPaused = State.isPaused;
            State.aiFrozen = true;
            if (!State.isPaused) window.UI?.togglePause?.('AI inference');
        }

        this._setOverlayFrame();
        const overlay = this.ensureOverlay();
        overlay.classList.add('visible');
        this._updateOverlayMeta(meta);
        document.body.classList.add('ai-inference-frozen');

        await this._parkAssets();
        this._suspendAmbient(true);

        window.dispatchEvent(new CustomEvent('ai-freeze-change', { detail: { frozen: true, meta, status: this.getStatus() } }));
    },

    async exit() {
        if (!WorkFolderScope.shouldFreezeOnLocal()) return;

        this._depth = Math.max(0, this._depth - 1);
        if (this._depth > 0) return;

        suspendLoads = false;
        resumeLoadWaiters();

        await this._restoreAssets();
        this._suspendAmbient(false);

        if (window.State) window.State.aiFrozen = false;
        document.body.classList.remove('ai-inference-frozen');
        this._overlay?.classList.remove('visible');
        const frame = document.getElementById('ai-freeze-frame');
        if (frame) frame.style.backgroundImage = '';

        this._freezeMeta = null;
        window.dispatchEvent(new CustomEvent('ai-freeze-change', { detail: { frozen: false, status: this.getStatus() } }));
    },

    _suspendAmbient(on) {
        if (on === this._ambientPaused) return;
        this._ambientPaused = on;
        const systems = [
            window.AmbientAudio,
            window.WeatherSystem,
            window.RecordedAmbient,
            window.InteriorAmbient,
            window.TeslaLabAmbient,
            window.UrbanAmbient,
            window.WildlifeAmbient,
        ];
        systems.forEach((sys) => {
            if (!sys) return;
            if (on) {
                sys._aiFrozenWasActive = sys._active;
                if (typeof sys.stop === 'function') sys.stop();
                else if (typeof sys.pause === 'function') sys.pause();
                else sys._active = false;
            } else if (sys._aiFrozenWasActive) {
                if (typeof sys.start === 'function') sys.start();
                else if (typeof sys.resume === 'function') sys.resume();
                else sys._active = true;
                delete sys._aiFrozenWasActive;
            }
        });
    },

    async _parkAssets() {
        const State = window.State;
        const Engine = window.Engine;
        if (!State?.objects || !Engine) return;

        const scope = WorkFolderScope.getScope();
        const parkMode = scope.parkMode;
        if (parkMode === 'none') return;

        this._parked = [];

        for (const obj of [...State.objects]) {
            if (isEssentialObject(obj, parkMode)) continue;

            const snap = snapshotObject(obj);
            snap.parkMode = parkMode;
            obj.visible = false;

            if (scope.suspendLod && obj.userData?._lodScenes?.length > 1) {
                MeshLod.dispose(obj);
            }

            if (parkMode === 'full') {
                const physIdx = State.physicsObjects.findIndex((p) => p.mesh === obj);
                if (physIdx >= 0) {
                    window.Physics?.world?.removeBody(State.physicsObjects[physIdx].body);
                    snap.physics = State.physicsObjects[physIdx];
                    State.physicsObjects.splice(physIdx, 1);
                }
                if (State.selectedObject === obj) window.UI?.deselectObject?.();
                Engine.scene.remove(obj);
                State.objects = State.objects.filter((o) => o !== obj);
                disposeObjectGpu(obj);
                snap.removed = true;
            }

            this._parked.push(snap);
        }
    },

    async _restoreAssets() {
        const State = window.State;
        const Engine = window.Engine;
        const World = window.World;
        if (!State || !Engine) {
            this._parked = [];
            return;
        }

        const restoredKeys = new Set();

        for (const snap of this._parked) {
            if (snap.removed) {
                const ud = snap.userData || {};
                if (snap.restoreKey && restoredKeys.has(snap.restoreKey)) continue;

                if (ud.type === 'gltf' || ud.isGltf) {
                    if (!ud.gltfPath && !ud.gltfUrl) {
                        console.warn('[ai-freeze] GLTF missing path — placeholder', snap.name);
                        if (World?.createObject) {
                            const ph = World.createObject('cube', `${snap.name} (restore pending)`, 0x553322, false);
                            if (ph) {
                                ph.position.copy(snap.transform.pos);
                                ph.scale.set(0.6, 0.6, 0.6);
                                ph.userData = { ...ud, freezeRestoreFailed: true, locked: true };
                            }
                        }
                        continue;
                    }
                    try {
                        const root = await GltfImport.spawnSnapshot({
                            name: snap.name,
                            pos: { x: snap.transform.pos.x, y: snap.transform.pos.y, z: snap.transform.pos.z },
                            rot: { x: snap.transform.rot.x, y: snap.transform.rot.y, z: snap.transform.rot.z },
                            scl: { x: snap.transform.scl.x, y: snap.transform.scl.y, z: snap.transform.scl.z },
                            userData: {
                                ...ud,
                                gltfPath: ud.gltfPath || snap.gltfPath,
                                gltfUrl: ud.gltfUrl,
                            },
                        });
                        if (root) {
                            if (snap.restoreKey) restoredKeys.add(snap.restoreKey);
                            window.ShaderRegistry?.registerMesh?.(root);
                            window.ShaderNodeGraph?.registerMesh?.(root);
                            window.AudioZoneSystem?.registerMesh?.(root);
                            window.WeatherSystem?.registerMesh?.(root);
                        }
                    } catch (e) {
                        console.warn('[ai-freeze] GLTF restore failed', snap.name, e);
                        if (World?.createObject) {
                            const ph = World.createObject('cube', `${snap.name} (restore failed)`, 0x442211, false);
                            if (ph) {
                                ph.position.copy(snap.transform.pos);
                                ph.userData = { ...ud, freezeRestoreFailed: true };
                            }
                        }
                    }
                } else if (World?.createObject) {
                    const mesh = World.createObject(snap.type, snap.name, snap.color, !!ud.hasPhysics);
                    if (mesh) {
                        mesh.position.copy(snap.transform.pos);
                        mesh.rotation.copy(snap.transform.rot);
                        mesh.scale.copy(snap.transform.scl);
                        mesh.userData = { ...ud };
                        mesh.visible = snap.wasVisible;
                    }
                }
                if (snap.physics && snap.physics.body) {
                    State.physicsObjects.push(snap.physics);
                }
            } else {
                const obj = snap.obj;
                if (obj && obj.parent) {
                    obj.visible = snap.wasVisible;
                    if (snap.userData?.lodPaths?.length > 1 && !obj.userData?._lodScenes?.length) {
                        try {
                            const lod0 = obj.children[0] || obj;
                            await MeshLod.initChain(obj, lod0, snap.userData.lodPaths, {
                                distances: snap.userData.lodDistances,
                            });
                        } catch (e) {
                            console.warn('[ai-freeze] LOD restore failed', e);
                        }
                    }
                }
            }
        }

        this._parked = [];
    },
};

window.AiMemoryFreeze = AiMemoryFreeze;