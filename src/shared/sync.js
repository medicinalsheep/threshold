import { getSceneObjectsForSpawn } from './sceneContext.js';
import { GraphicsProfile } from './graphicsProfile.js';

let applying = false;

export const Sync = {
    isApplying() { return applying; },

    capture() {
        const State = window.State;
        if (!State) return null;
        const player = window.PlayerController?.getState?.();
        const Network = window.Network;
        const Engine = window.Engine;
        let camera = null;
        if (Network?.mode === 'host' && Engine?.camera && Engine.controls) {
            camera = {
                position: {
                    x: Engine.camera.position.x,
                    y: Engine.camera.position.y,
                    z: Engine.camera.position.z,
                },
                target: {
                    x: Engine.controls.target.x,
                    y: Engine.controls.target.y,
                    z: Engine.controls.target.z,
                },
            };
        }
        return {
            objects: getSceneObjectsForSpawn().filter((o) => !o.userData?.isPlayer),
            env: { ...State.env },
            renderMode: State.renderMode,
            graphics: GraphicsProfile.exportSnapshot(),
            runningCode: window.Runtime?.runningCode || '',
            isPaused: !!State.isPaused,
            pauseReason: window.Session?.pauseReason || '',
            gridVisible: !!State.gridVisible,
            player,
            controlMode: State.controlMode || 'fly',
            hostBindings: window.Controls?.exportHostControls?.() || window.Controls?.exportHostBindings?.(),
            admins: window.Session?.getAdminList?.() || [],
            players: Network?.mode === 'host' ? Network.getPlayerList() : undefined,
            playerPositions: Network?.getPlayerPositions?.() || {},
            camera,
        };
    },

    async applyState(state) {
        if (!state || applying) return;
        const State = window.State;
        const World = window.World;
        const Engine = window.Engine;
        const Environment = window.Environment;
        const Runtime = window.Runtime;
        if (!World || !Engine || !State) return;

        applying = true;
        try {
            World.clearWorld(false);
            const gltfSnapshots = [];
            (state.objects || []).forEach((d) => {
                const isGltf = d.type === 'gltf' || d.userData?.type === 'gltf';
                if (isGltf) {
                    gltfSnapshots.push(d);
                    return;
                }
                const m = World.createObject(d.type, d.name, d.color, !!d.userData?.hasPhysics);
                if (m) {
                    m.position.set(d.pos?.x || 0, d.pos?.y || 1, d.pos?.z || 0);
                    if (d.rot) m.rotation.set(d.rot.x, d.rot.y, d.rot.z);
                    if (d.scl) m.scale.set(d.scl.x, d.scl.y, d.scl.z);
                    if (d.userData) m.userData = { ...m.userData, ...d.userData };
                }
            });
            if (gltfSnapshots.length) {
                await window.GltfImport?.spawnSnapshots?.(gltfSnapshots);
            }

            const graphicsState = state.graphics || state.world?.graphics;
            if (graphicsState?.tier || graphicsState?.renderMode != null) {
                GraphicsProfile.applyFromSync(graphicsState);
            } else {
                if (state.env && Environment) {
                    Object.assign(State.env, state.env);
                    Environment.setTimeOfDay(state.env.timeOfDay ?? 14);
                    Environment.setFog(state.env.fogDensity ?? 0.02);
                    if (!!state.env.waterEnabled !== !!Environment.waterReflector) {
                        if (state.env.waterEnabled) Environment.createWater();
                        else Environment.removeWater();
                    }
                    if (!!state.env.atmosphereEnabled !== !!Environment.hemiLight?.visible) {
                        if (state.env.atmosphereEnabled) {
                            if (!Environment.hemiLight && Engine?.scene && window.THREE) {
                                Environment.hemiLight = new window.THREE.HemisphereLight(0x87ceeb, 0x1a2a12, 0.55);
                                Engine.scene.add(Environment.hemiLight);
                            }
                            if (Environment.hemiLight) Environment.hemiLight.visible = true;
                        } else if (Environment.hemiLight) {
                            Environment.hemiLight.visible = false;
                        }
                    }
                }
                if (typeof state.renderMode === 'number') Engine.setRenderMode(state.renderMode);
            }
            if (typeof state.gridVisible === 'boolean' && state.gridVisible !== State.gridVisible) Engine.toggleGrid();

            if (Runtime && state.runningCode) Runtime.setRunningCode(state.runningCode, 'sync');

            State.isPaused = !!state.isPaused;
            State.controlMode = state.controlMode || 'fly';
            const Session = window.Session;
            if (Session) {
                Session.isPaused = State.isPaused;
                Session.pauseReason = state.pauseReason || '';
                if (Array.isArray(state.admins)) Session.setAdmins(state.admins);
            }
            if (state.hostBindings) window.Controls?.applySessionHostBindings?.(state.hostBindings);
            window.dispatchEvent(new CustomEvent('threshold:pause', { detail: { paused: State.isPaused, reason: state.pauseReason } }));
            if (state.camera) State.hostCamera = state.camera;

            if (state.player && window.PlayerController) {
                window.PlayerController.applyState(state.player);
            } else if (state.controlMode === 'fly') {
                window.PlayerController?.despawn();
            }
            window.TextureBridge?.rehydrateScene?.();
            await window.TextureHilod?.rehydrateAfterSync?.();
            window.UI?.updateControlMode?.();
            window.Spectate?.updateHud?.();
        } finally {
            applying = false;
        }
    },

    applyAction(action, payload = {}) {
        if (applying) return;
        const World = window.World;
        const Runtime = window.Runtime;
        const Session = window.Session;
        if (!World) return;

        switch (action) {
            case 'RUN_CODE':
                if (payload.code) Runtime?.execute(payload.code, payload.source || 'network');
                break;
            case 'INSERT_CHARACTER': {
                const State = window.State;
                if (payload.pos && State) State.ctxTargetPos.set(payload.pos.x, payload.pos.y, payload.pos.z);
                World.spawnCharacter(true);
                break;
            }
            case 'SPAWN_PLAYER': {
                const State = window.State;
                if (payload.pos && State) State.ctxTargetPos.set(payload.pos.x, payload.pos.y, payload.pos.z);
                World.spawnPlayablePlayer(true);
                window.UI?.updateControlMode?.();
                break;
            }
            case 'INSERT_PLAYER':
                World.insertPlayerByKey(payload.key, true);
                break;
            case 'INSERT_SAVED':
                World.insertSavedPlayer(payload.key, true);
                break;
            case 'INSERT_CUSTOM': {
                const State = window.State;
                if (payload.pos && State) State.ctxTargetPos.set(payload.pos.x, payload.pos.y, payload.pos.z);
                World.runCustomAtCursor(payload.code, true);
                break;
            }
            case 'INSERT_GLTF': {
                const State = window.State;
                if (payload.pos && State) State.ctxTargetPos.set(payload.pos.x, payload.pos.y, payload.pos.z);
                World.insertGltfAtCursor(payload, true);
                break;
            }
            case 'CLEAR_WORLD':
                World.clearWorld(true);
                break;
            case 'PAUSE':
                if (Session?.canControlPause?.()) Session.setPaused(!!payload.paused, payload.reason || '');
                break;
            case 'SET_ADMINS':
                if (Session?.isHost && Array.isArray(payload.admins)) Session.setAdmins(payload.admins);
                break;
            case 'UPDATE_HOST_BINDINGS':
                if (payload.bindings) {
                    window.Controls?.setHostBindings?.(payload.bindings, false);
                    window.Controls?.applySessionHostBindings?.(payload.bindings);
                }
                break;
            default:
                break;
        }
    }
};