import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { State, IS_TOUCH_DEVICE } from './state.js';
import { Environment } from './environment.js';
import { Physics } from './physics.js';
import { Recorder } from './recorder.js';
import { UI } from './ui.js';
import { World } from './world.js';
import { PlayerController } from './player.js';
import { HumanMesh } from './humanMesh.js';
import { Controls } from '../shared/controls.js';
import { TouchControls } from '../shared/touchControls.js';
import { ThirdEye } from '../shared/thirdEye.js';
import { getRenderMode } from '../shared/renderModes.js';
import { GraphicsProfile } from '../shared/graphicsProfile.js';
import { MeshLod } from '../shared/meshLod.js';
import { TextureHilod } from '../shared/textureHilod.js';
import { NegativeLod } from '../shared/negativeLod.js';
import { VisibilitySystem } from '../shared/visibilitySystem.js';
import { Cinematic } from '../shared/cinematic.js';
import { AgentHub } from '../shared/agentHub.js';

export const Engine = {
    scene: null, camera: null, renderer: null, composer: null, shaderPass: null, bloomPass: null,
    controls: null, transformControl: null, raycaster: null, mouse: new THREE.Vector2(),
    _lookPointerLocked: false,
    gridHelper: null, groundPlane: null,
    init: function () {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02); // Distance fog for realism
        this.updateBackground();
        const navHeight = document.getElementById('app-nav')?.offsetHeight || 50;
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / (window.innerHeight - navHeight), 0.1, 1000);
        this.camera.position.set(10, 8, 10);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight - navHeight);
        this.renderer.setPixelRatio(IS_TOUCH_DEVICE ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.84;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        // Lighting (Realism Upgrade)
        const amb = new THREE.AmbientLight(0x3a3d42, 0.72);
        this.scene.add(amb);
        Environment.sunLight = new THREE.DirectionalLight(0xfff4e8, 1.55);
        Environment.sunLight.position.set(10, 20, 10);
        Environment.sunLight.castShadow = true;
        Environment.sunLight.shadow.mapSize.width = 2048;
        Environment.sunLight.shadow.mapSize.height = 2048;
        this.scene.add(Environment.sunLight);
        // Visual Helpers
        this.gridHelper = new THREE.GridHelper(40, 40, 0x666666, 0x333333);
        this.scene.add(this.gridHelper);
        // Default play surface — Environment.useSimpleGround() wires PBR maps
        const planeGeo = new THREE.PlaneGeometry(100, 100);
        const planeMat = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.78, metalness: 0.04, envMapIntensity: 0.28 });
        this.groundPlane = new THREE.Mesh(planeGeo, planeMat);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = 0.06;
        this.groundPlane.receiveShadow = true;
        this.groundPlane.userData = {
            id: 'engine_ground',
            isFloor: true,
            negativeLodFloor: true,
            surfaceType: 'concrete',
        };
        this.scene.add(this.groundPlane);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
            if (!event.value) this.syncPhysicsFromMesh(State.selectedObject);
        });
        this.scene.add(this.transformControl);
        this.raycaster = new THREE.Raycaster();
        this.setupPipeline();
        this.setupImageBasedLighting();
        this.setRenderMode(4);
        UI.updateModeDisplay(4);
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('keydown', (e) => {
            if (Controls._rebind) return;
            State.keys[e.code] = true;
            if (e.code === 'Delete' || e.code === 'Backspace') {
                const tag = (e.target?.tagName || '').toLowerCase();
                if (tag !== 'input' && tag !== 'textarea' && !e.target?.isContentEditable) {
                    World.deleteObject(State.selectedObject);
                }
            }
            if (!e.repeat) {
                const action = Controls.getActionForCode(e.code);
                if (action) Controls.markJustPressed(action);
            }
        });
        window.addEventListener('keyup', (e) => State.keys[e.code] = false);
        this._setupWalkLook();
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.renderer.domElement.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.renderer.domElement.addEventListener('contextmenu', (e) => this.onContextMenu(e));
        this.animate();
    },
    _setupWalkLook() {
        const canvas = this.renderer.domElement;
        this._lastPointer = { x: 0, y: 0 };

        const onLockChange = () => {
            this._lookPointerLocked = document.pointerLockElement === canvas;
        };
        document.addEventListener('pointerlockchange', onLockChange);
        document.addEventListener('mozpointerlockchange', onLockChange);
        document.addEventListener('webkitpointerlockchange', onLockChange);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') this._releaseLookLock();
        });
        window.addEventListener('blur', () => this._releaseLookLock());

        canvas.addEventListener('pointermove', (e) => {
            if (State.controlMode !== 'walk' || !PlayerController.spawned || State.isPaused) return;
            if (e.pointerType === 'touch') return;

            let dx = 0;
            let dy = 0;
            if (this._lookPointerLocked) {
                dx = e.movementX;
                dy = e.movementY;
            } else {
                dx = e.clientX - this._lastPointer.x;
                dy = e.clientY - this._lastPointer.y;
                this._lastPointer.x = e.clientX;
                this._lastPointer.y = e.clientY;
            }
            if (Math.abs(dx) + Math.abs(dy) < 0.01) return;
            PlayerController.applyLookInput(dx, dy, this._lookPointerLocked ? 1 : 0.9);
        });

        canvas.addEventListener('pointerdown', (e) => {
            this._lastPointer.x = e.clientX;
            this._lastPointer.y = e.clientY;
        });
    },

    _requestLookLock() {
        const canvas = this.renderer.domElement;
        if (document.pointerLockElement === canvas) return;
        if (State.controlMode !== 'walk' || !PlayerController.spawned || State.isPaused) return;
        canvas.requestPointerLock?.();
    },

    _releaseLookLock() {
        if (document.pointerLockElement === this.renderer.domElement) {
            document.exitPointerLock();
        }
        this._lookPointerLocked = false;
    },

    _isWalkPlayLook() {
        if (window.Spectate?.isSpectatorSession?.()) return false;
        if (window.Spectate?.isActive?.() && window.Spectate?.isFollowingHost?.()) return false;
        if (window.Network?.mode === 'spectate') return false;
        return State.controlMode === 'walk' && PlayerController.spawned && !State.isPaused;
    },

    syncPhysicsFromMesh: function (mesh) {
        if (!mesh?.userData?.hasPhysics) return;
        const entry = State.physicsObjects.find((p) => p.mesh === mesh);
        if (!entry) return;
        entry.body.position.copy(mesh.position);
        entry.body.quaternion.copy(mesh.quaternion);
        entry.body.velocity.set(0, 0, 0);
        entry.body.angularVelocity.set(0, 0, 0);
    },
    updateBackground: function () {
        const hex = State.darkMode ? 0x050505 : 0xaaaaaa;
        this.scene.background = new THREE.Color(hex);
        this.scene.fog.color.setHex(hex);
    },
    toggleGrid: function () {
        State.gridVisible = !State.gridVisible;
        this.gridHelper.visible = State.gridVisible;
        return State.gridVisible;
    },
    setupPipeline: function () {
        const size = new THREE.Vector2(window.innerWidth, window.innerHeight - (document.getElementById('app-nav')?.offsetHeight || 50));
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        const ThresholdShader = {
            uniforms: {
                tDiffuse: { value: null },
                mode: { value: 4 },
                time: { value: 0 },
                resolution: { value: new THREE.Vector2(size.x, size.y) }
            },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform int mode;
                uniform float time;
                uniform vec2 resolution;
                varying vec2 vUv;

                float layeredGrid(vec2 fragCoord, float band, float baseScale) {
                    float scale = baseScale + band * 6.0;
                    vec2 g = abs(fract(fragCoord / scale) - 0.5);
                    float parallel = step(0.46, max(g.x, g.y));
                    vec2 d = abs(fract((fragCoord + band * 2.0) / (scale * 1.15)) - 0.5);
                    float crossed = step(0.48, abs(d.x - d.y));
                    return max(parallel, crossed * 0.65);
                }

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    if (mode == 4) { gl_FragColor = texel; return; }

                    float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
                    float depthCue = 1.0 - vUv.y * 0.38;
                    float edge = length(vec2(dFdx(luma), dFdy(luma)));
                    float depthMix = clamp(luma * 0.62 + depthCue * 0.28 + edge * 2.2, 0.0, 0.999);
                    float band = floor(depthMix * 5.0);
                    float grid = layeredGrid(gl_FragCoord.xy, band, 5.0);
                    vec3 outColor;

                    if (mode == 0) {
                        float q = band / 4.0;
                        outColor = mix(vec3(q), texel.rgb, 0.12);
                        outColor = mix(outColor, outColor * 0.55, grid);
                    } else if (mode == 1) {
                        float thresh = 0.38 + depthCue * 0.12;
                        outColor = (depthMix > thresh) ? vec3(1.0) : vec3(0.0);
                        outColor = mix(outColor, vec3(0.12), grid * 0.45);
                    } else if (mode == 2) {
                        float g = 0.08;
                        if (band > 0.5) g = 0.22;
                        if (band > 1.5) g = 0.4;
                        if (band > 2.5) g = 0.65;
                        if (band > 3.5) g = 0.95;
                        outColor = vec3(0.0, g, 0.0);
                        float scan = mod(gl_FragCoord.y, 3.0) < 1.5 ? 0.85 : 1.0;
                        outColor *= scan;
                        outColor = mix(outColor, outColor * 0.35, grid);
                    } else if (mode == 3) {
                        outColor = floor(texel.rgb * 4.0) / 4.0;
                        vec3 layerTint = vec3(0.9 + band * 0.02, 0.85, 1.0 - band * 0.05);
                        outColor *= layerTint;
                        outColor = mix(outColor, outColor * 0.6, grid);
                    } else {
                        outColor = texel.rgb;
                    }
                    gl_FragColor = vec4(outColor, 1.0);
                }
            `
        };
        this.shaderPass = new ShaderPass(ThresholdShader);
        this.shaderPass.renderToScreen = false;
        this.composer.addPass(this.shaderPass);

        this.bloomPass = new UnrealBloomPass(size, 0.46, 0.28, 0.97);
        this.bloomPass.enabled = true;
        this.bloomPass.renderToScreen = true;
        this.composer.addPass(this.bloomPass);
    },
    setupImageBasedLighting: function () {
        if (this._envMap) return;
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        pmrem.compileEquirectangularShader();
        this._envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environment = this._envMap;
        pmrem.dispose();
        State.objects.forEach((o) => {
            if (o.material?.isMeshStandardMaterial) o.material.needsUpdate = true;
        });
    },

    applyRenderModeSceneTuning: function (idx) {
        const isRealistic = idx === 4;
        if (Environment.sunLight) Environment.sunLight.intensity = isRealistic ? 1.38 : 1.5;
        if (this.renderer) this.renderer.toneMappingExposure = isRealistic ? 0.88 : 0.78;
        if (this.scene.fog) this.scene.fog.density = isRealistic ? State.env.fogDensity : Math.max(State.env.fogDensity, 0.02);
        State.objects.forEach((obj) => {
            if (!obj.material?.isMeshStandardMaterial) return;
            obj.material.envMapIntensity = isRealistic ? 0.48 : 0.18;
            if (!isRealistic && obj.material.emissive) {
                obj.material.emissiveIntensity = Math.max(obj.material.emissiveIntensity || 0, 0.1);
            }
        });
    },

    setRenderMode: function (idx) {
        State.renderMode = idx;
        if (!this.shaderPass || !this.bloomPass) return;
        this.shaderPass.uniforms.mode.value = idx;
        const isHyper = idx === 4;
        this.bloomPass.enabled = isHyper;
        this.bloomPass.renderToScreen = isHyper;
        this.shaderPass.renderToScreen = !isHyper;
        if (isHyper) {
            this.bloomPass.strength = 0.46;
            this.bloomPass.radius = 0.28;
            this.bloomPass.threshold = 0.97;
        }
        this.applyRenderModeSceneTuning(idx);
        UI.updateModeDisplay(idx);
        const select = document.getElementById('env-mode');
        if (select) select.value = String(idx);
        const info = document.getElementById('env-mode-info');
        const meta = getRenderMode(idx);
        if (info) {
            const prefix = meta.retro ? 'Retro style — ' : '';
            info.textContent = `${prefix}${meta.tagline} — ${meta.limits}`;
        }
        window.Spectate?.updateHud?.();
        GraphicsProfile.syncUi();
    },
    resolveRegistryObject(obj) {
        if (!obj) return null;
        let cur = obj;
        while (cur) {
            if (State.objects.includes(cur)) return cur;
            cur = cur.parent;
        }
        return null;
    },

    pickObjectAtMouse() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObjects(State.objects, true);
        for (const hit of hits) {
            const root = this.resolveRegistryObject(hit.object);
            if (root) return root;
        }
        return null;
    },

    openContextAtScreen: function (clientX, clientY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        const picked = this.pickObjectAtMouse();
        if (picked) {
            UI.openCtx(clientX, clientY, 'object', picked);
            return;
        }
        const intersects = this.intersectFloor();
        if (intersects.length > 0) {
            State.ctxTargetPos.copy(intersects[0].point);
            UI.openCtx(clientX, clientY, 'ground');
        }
    },

    intersectFloor() {
        const targets = [];
        if (Environment.floorGroup) targets.push(Environment.floorGroup);
        if (this.groundPlane) targets.push(this.groundPlane);
        return targets.length ? this.raycaster.intersectObjects(targets, true) : [];
    },

    onPointerMove: function (e) {
        if (this._holdPointer && Math.hypot(e.clientX - this._holdPointer.x, e.clientY - this._holdPointer.y) > 14) {
            clearTimeout(this._holdPointer.timer);
            this._holdPointer = null;
        }
    },
    onPointerUp: function (e) {
        if (e?.pointerType === 'mouse' || e?.pointerType === 'pen') {
            Controls.setMouseButton(e.button, false);
        }
        if (this._holdPointer) {
            clearTimeout(this._holdPointer.timer);
            this._holdPointer = null;
        }
    },

    tryEnterVehicle() {
        if (window.TcDrive?.active) {
            window.World?.releaseTcVehicle?.();
            return true;
        }
        const hasTc = State.objects.some((o) => o.userData?.id === 'tc_run' || o.userData?.id === 'tc_haul');
        if (hasTc && window.World?.enterTcRace) {
            window.World.enterTcRace();
            UI.status('Vehicle claimed — WASD drive · F exit');
            return true;
        }
        return false;
    },
    onPointerDown: function (e) {
        // Track all mouse buttons (0–4) so secondary binds like MMB / Mouse4 work for VOIP, fire, etc.
        if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
            Controls.setMouseButton(e.button, true);
            if (e.button === 3 || e.button === 4) e.preventDefault();
        }
        // Non-LMB: controls only (no world place / context). Still allow aim/fire/PTT via bindings.
        if (e.button !== 0) {
            UI.closeCtx();
            return;
        }
        if (TouchControls.enabled && e.pointerType === 'touch') return;

        if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
            const playWalk = this._isWalkPlayLook();
            const pointerFree = ThirdEye.isPointerFree?.();

            if (playWalk && pointerFree) {
                if (window.WorldInteract?.tryInteract?.()) return;
            } else if (playWalk && !pointerFree) {
                if (State.viewMode === 'fps' && !Controls.isHolstered?.()) {
                    this._requestLookLock();
                }
                if (playWalk) return;
            }
        }

        if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
            clearTimeout(this._holdPointer?.timer);
            this._holdPointer = {
                x: e.clientX, y: e.clientY,
                timer: setTimeout(() => {
                    this.openContextAtScreen(e.clientX, e.clientY);
                    this._holdPointer = null;
                }, 480)
            };
        }
        const now = Date.now();
        if (this._lastClick
            && now - this._lastClick.time < 380
            && Math.hypot(e.clientX - this._lastClick.x, e.clientY - this._lastClick.y) < 30) {
            if (this._holdPointer) clearTimeout(this._holdPointer.timer);
            this._holdPointer = null;
            this.openContextAtScreen(e.clientX, e.clientY);
            this._lastClick = null;
            return;
        }
        this._lastClick = { x: e.clientX, y: e.clientY, time: now };

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const picked = this.pickObjectAtMouse();
        if (picked) UI.selectObject(picked);
        else if (!this.transformControl.dragging) UI.deselectObject();
    },
    onContextMenu: function (e) {
        e.preventDefault();
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const picked = this.pickObjectAtMouse();
        if (picked) {
            UI.openCtx(e.clientX, e.clientY, 'object', picked);
            return;
        }
        const intersects = this.intersectFloor();
        if (intersects.length > 0) {
            State.ctxTargetPos.copy(intersects[0].point);
            UI.openCtx(e.clientX, e.clientY, 'ground');
        }
    },
    tickHostCameraFollow: function () {
        const Spectate = window.Spectate;
        const follow = Spectate?.shouldFollowHost?.() || Spectate?.isFollowingHost?.();
        if (!follow || !State.hostCamera) {
            if ((Spectate?.isActive?.() || window.Network?.mode === 'spectate') && !follow) {
                this.controls.enabled = true;
            }
            return;
        }
        this.controls.enabled = false;
        const hc = State.hostCamera;
        if (!this._hostCamPos) {
            this._hostCamPos = new THREE.Vector3();
            this._hostCamTarget = new THREE.Vector3();
        }
        this._hostCamPos.set(hc.position.x, hc.position.y, hc.position.z);
        this._hostCamTarget.set(hc.target.x, hc.target.y, hc.target.z);
        this.camera.position.lerp(this._hostCamPos, 0.14);
        this.controls.target.lerp(this._hostCamTarget, 0.14);
    },

    onResize: function () {
        const navHeight = document.getElementById('app-nav')?.offsetHeight || 50;
        this.camera.aspect = window.innerWidth / (window.innerHeight - navHeight);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight - navHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight - navHeight);
        if (this.bloomPass) this.bloomPass.setSize(window.innerWidth, window.innerHeight - navHeight);
        if (this.shaderPass?.uniforms?.resolution) {
            this.shaderPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight - navHeight);
        }
    },
    animate: function (time) {
        requestAnimationFrame((t) => this.animate(t));
        if (State.aiFrozen) return;
        if (this.shaderPass) this.shaderPass.uniforms.time.value = time * 0.001;

        const dt = this._lastAnimTime
            ? Math.min(0.05, (time - this._lastAnimTime) / 1000)
            : 0.016;
        this._lastAnimTime = time;

        Controls.pollGamepad();
        Controls.applyCameraStick();
        // Situational touch: vehicle + combat (unholstered)
        if (window.TouchControls?.enabled) {
            const vehReady = State.controlMode === 'vehicle'
                || !!window.TcDrive?.active
                || State.objects.some((o) => o.userData?.id === 'tc_run' || o.userData?.id === 'tc_haul');
            window.TouchControls.setContextVisible?.('enterVehicle', vehReady);
            const weaponReady = !Controls.isHolstered?.();
            window.TouchControls.syncCombatContext?.(weaponReady);
        }
        if (Controls.consumeJustPressed('toggleMode')) UI.toggleControlMode();
        if (Controls.consumeJustPressed('pause') && Controls.canUse('pause')) UI.togglePause();
        if (Controls.consumeJustPressed('bindingsMenu')) UI.openBindingsModal?.();
        if (Controls.consumeJustPressed('sessionPanel')) UI.openHostPanel?.();
        if (Controls.consumeJustPressed('uiMouse')) {
            ThirdEye.toggleUiMouse?.();
        }
        if (Controls.consumeJustPressed('interact') || Controls.consumeJustPressed('thirdEye')) {
            if (!window.WorldInteract?.tryInteract?.()) {
                ThirdEye.toggle();
            }
        }
        if (Controls.consumeJustPressed('enterVehicle')) this.tryEnterVehicle();
        if (Controls.consumeJustPressed('fire') && !Controls.isHolstered()) {
            window.StarterSfx?.fireStarterGun?.();
        }
        if (Controls.consumeJustPressed('reload')) PlayerController.playReload?.();
        if (Controls.consumeJustPressed('melee')) PlayerController.playMelee?.();
        if (Controls.consumeJustPressed('emote')) PlayerController.playEmote?.();
        if (Controls.consumeJustPressed('holster')) {
            Controls._holstered = !Controls._holstered;
            UI.status(Controls._holstered ? 'Weapon holstered' : 'Weapon ready');
        }
        if (Controls.consumeJustPressed('toggleView')) PlayerController.toggleViewMode?.();
        if (Controls.consumeJustPressed('flashlight')) PlayerController.toggleFlashlight?.();
        if (Controls.consumeJustPressed('lookBehind')) PlayerController.lookBehind?.();
        if (Controls.consumeJustPressed('horn')) {
            window.StarterSfx?.playStarterSfx?.('starter_horn', 0.55);
        }
        if (window.Voip?._initialized && window.Voip?.config?.transmission === 'ptt') {
            window.Voip.pttDown = Controls.isAction('voipPtt');
            window.Voip._applyTransmission?.();
        }
        window.WorldInteract?.tick?.();
        ThirdEye.tick();
        window.AmbientAudio?.tick?.(dt);
        window.ImmersiveReplay?.tick?.(dt);
        window.StarterAnim?.tick?.(time);
        if (Controls.consumeJustPressed('cameraReset')) {
            PlayerController.resetCameraBehind?.();
            Controls.resetCameraBehindPlayer();
        }

        this.tickHostCameraFollow();
        const camFollow = window.Spectate?.shouldFollowHost?.() || window.Spectate?.isFollowingHost?.();

        if (!State.isPaused && !camFollow) {
            if (State.controlMode === 'vehicle' && window.TcDrive?.active) {
                window.TcDrive.prePhysics();
            } else if (State.controlMode === 'walk' && PlayerController.spawned) {
                PlayerController.prePhysics(State.keys);
            }
            Physics.update();
            if (State.controlMode === 'vehicle' && window.TcDrive?.active) {
                window.TcDrive.postPhysics();
            } else if (State.controlMode === 'walk' && PlayerController.spawned) {
                PlayerController.postPhysics();
                window.SurvivalNeeds?.tick?.(dt, PlayerController.getMovementContext?.());
            } else if (!State.introPlaying) {
                const speed = 0.2 * (Controls.getSprintMultiplier?.() || 1);
                const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
                const rgt = new THREE.Vector3(); rgt.crossVectors(fwd, this.camera.up).normalize();
                if (Controls.isAction('forward')) { this.camera.position.addScaledVector(fwd, speed); this.controls.target.addScaledVector(fwd, speed); }
                if (Controls.isAction('back')) { this.camera.position.addScaledVector(fwd, -speed); this.controls.target.addScaledVector(fwd, -speed); }
                if (Controls.isAction('left')) { this.camera.position.addScaledVector(rgt, -speed); this.controls.target.addScaledVector(rgt, -speed); }
                if (Controls.isAction('right')) { this.camera.position.addScaledVector(rgt, speed); this.controls.target.addScaledVector(rgt, speed); }
                if (Controls.isAction('up')) { this.camera.position.y += speed; this.controls.target.y += speed; }
                if (Controls.isAction('down')) { this.camera.position.y -= speed; this.controls.target.y -= speed; }
            }
            Environment.updateWater(time);
        }
        UI.updateControlsHint?.();

        window.IntroSkip?.tick?.();
        window.ActionHints?.tick?.(time);

        if (State.introPlaying) {
            window.TeslaIntroCaptions?.tick?.();
            const elapsed = performance.now() - (State.introStart || 0);
            const t = Math.min(1, elapsed / (State.introDuration || 2500));
            const ease = 1 - Math.pow(1 - t, 3);
            if (State.introFrom && State.introTo) {
                if (!this._introFromVec) {
                    this._introFromVec = new THREE.Vector3();
                    this._introToVec = new THREE.Vector3();
                    this._introTargetVec = new THREE.Vector3();
                }
                this._introFromVec.set(State.introFrom.x, State.introFrom.y, State.introFrom.z);
                this._introToVec.set(State.introTo.x, State.introTo.y, State.introTo.z);
                this.camera.position.lerpVectors(this._introFromVec, this._introToVec, ease);
                if (State.introTarget) {
                    this._introTargetVec.set(State.introTarget.x, State.introTarget.y, State.introTarget.z);
                    this.controls.target.lerp(this._introTargetVec, ease * 0.35 + 0.1);
                }
            }
            if (t >= 1) {
                State.introPlaying = false;
                window.TeslaIntroCaptions?._hide?.();
                window.ActionHints?.onIntroEnded?.();
            }
        } else {
            window.TeslaIntroCaptions?._hide?.();
        }

        AgentHub.tick(dt);
        // E0: classify once; E1 gates below read userData._visClass
        VisibilitySystem.update(this.camera);

        window.NpcPatrol?.tick?.(dt);
        // E1: idle anim only on-screen (A/B/C)
        State.objects.forEach((obj) => {
            if (obj.userData?.patrolId) return;
            if (VisibilitySystem.shouldProcessLod && !VisibilitySystem.shouldProcessLod(obj)) return;
            if (obj.userData?.isHuman && !obj.userData?.isPlayer && !obj.userData?.isGltf) {
                HumanMesh.updateIdle(obj, time * 0.001, dt);
            }
        });

        MeshLod.update(this.camera);
        TextureHilod.update(this.camera);
        NegativeLod.update(this.camera);
        Cinematic.tick();
        window.TcGateFx?.tick?.();

        if (this.controls.enabled && !State.introPlaying) this.controls.update();
        // E1: spin only when visually processed (on-screen)
        if (!State.isPaused) {
            State.objects.forEach((obj) => {
                if (!obj.userData.isRotating || obj.userData.locked || obj.userData.hasPhysics) return;
                if (VisibilitySystem.shouldProcessLod && !VisibilitySystem.shouldProcessLod(obj)) return;
                obj.rotation.y += 0.02;
            });
        }
        // Recorder frame request (for smooth video)
        if (State.isRecording && Recorder.stream) {
            Recorder.stream.getVideoTracks()[0].requestFrame();
        }
        this.composer.render();
        window.CreatorHud?.tick?.(time);
    }
};
