import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { VERSION } from '../config.js';
import { Session } from '../shared/session.js';
import { Runtime } from '../shared/runtime.js';
import { getSceneObjectsForSpawn } from '../shared/sceneContext.js';
import { Actions } from '../shared/actions.js';
import { Network } from '../shared/network.js';
import { PlayerController } from './player.js';
import { Persistence } from '../shared/persistence.js';
import { Sync } from '../shared/sync.js';
import { Controls, CONTROL_ACTIONS } from '../shared/controls.js';

const IS_TOUCH_DEVICE = window.matchMedia('(pointer: coarse)').matches;

// --- INITIALIZATION ---
export function initEngine() {
    console.log(`Initializing Threshold Engine v${VERSION} (HYPER)...`);

    // Expose globals for command bar eval (enables limitless user scripting)
    window.THREE = THREE;
    window.CANNON = CANNON;
    window.OrbitControls = OrbitControls;
    window.TransformControls = TransformControls;
    window.GLTFLoader = GLTFLoader;
    window.AudioSys = AudioSys;
    window.Engine = Engine;
    window.EffectComposer = EffectComposer;
    window.renderPass = RenderPass;
    window.ShaderPass = ShaderPass;
    window.UnrealBloomPass = UnrealBloomPass;

    window.World = World;
    window.State = State;
    window.UI = UI;
    window.Recorder = Recorder;
    window.Utils = {
        getMode: () => State.renderMode,
        isHyper: () => State.renderMode === 4,
        randomColor: () => Math.random() * 0xffffff
    };
    window.Session = Session;
    window.Runtime = Runtime;
    window.Actions = Actions;
    window.Network = Network;
    window.Physics = Physics;
    window.PlayerController = PlayerController;
    window.Persistence = Persistence;
    window.Sync = Sync;
    window.Controls = Controls;
    Controls.init();

    window.addEventListener('theme-change', () => {
        State.darkMode = !document.body.classList.contains('light-mode');
        Engine.updateBackground();
    });

    Physics.init();
    Engine.init();
    Environment.init();
    UI.init();
    Physics.createFloor();
    window.Environment = Environment;

    if (Network.mode === 'host') {
        document.body.classList.add('network-host');
        Network.updateUi();
    }

    window.addEventListener('threshold:pause', (e) => {
        State.isPaused = !!e.detail?.paused;
        UI.status(State.isPaused ? 'Scene paused by host' : 'Scene resumed');
    });

    const worldCode = new URLSearchParams(window.location.search).get('world');
    if (worldCode) {
        Persistence.loadWorld(worldCode)
            .then((r) => UI.status(`Loaded world ${r.name} (${r.code})`))
            .catch((e) => UI.status(e.message));
    }
}

// --- GLOBAL STATE ---
const State = {
    selectedObject: null,
    audioEnabled: false,
    darkMode: true,
    gridVisible: true,
    renderMode: 4,
    objects: [],
    physicsObjects: [],
    keys: {},
    clipboardAllowed: false,
    ctxTargetPos: new THREE.Vector3(),
    isRecording: false,
    isPaused: false,
    controlMode: 'fly',
    playerRef: null,
    env: {
        timeOfDay: 14,
        fogDensity: 0.02,
        waterEnabled: false,
        atmosphereEnabled: false
    }
};

const OBJECT_TYPES = ['cube', 'sphere', 'cone', 'torus'];

const Modes = [
    { name: "THRESHOLD (5-BAND)", desc: "Quantized Grayscale" },
    { name: "1-BIT (BINARY)", desc: "High Contrast B&W" },
    { name: "TERMINAL (MATRIX)", desc: "Phosphor Green" },
    { name: "SMPTE (8-BIT)", desc: "Quantized Color" },
    { name: "HYPER (BLOOM)", desc: "Unreal Glow + Physics" } // NEW MODE
];

// --- PHYSICS SYSTEM (REALISM) ---
const Physics = {
    world: null,
    materials: {},

    init: function () {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Earth Gravity
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;

        // Default Material
        const defaultMat = new CANNON.Material('default');
        const contactMat = new CANNON.ContactMaterial(defaultMat, defaultMat, {
            friction: 0.3, restitution: 0.7 // Bounciness
        });
        this.world.addContactMaterial(contactMat);
    },

    createFloor: function () {
        const shape = new CANNON.Plane();
        const body = new CANNON.Body({ mass: 0 }); // Mass 0 = Static
        body.addShape(shape);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(body);
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

    update: function () {
        if (State.isPaused) return;
        this.world.step(1 / 60);

        // Sync Visuals to Physics
        State.physicsObjects.forEach(obj => {
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        });
    }
};

// --- AUDIO SYSTEM ---
const AudioSys = {
    ctx: null,
    init: function () {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    },
    playTone: function (freq, type = 'square', dur = 0.1) {
        if (!State.audioEnabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + dur);
    },
    toggle: function () {
        if (!this.ctx) this.init();
        State.audioEnabled = !State.audioEnabled;
        document.getElementById('btn-audio').innerText = State.audioEnabled ? "AUDIO: ON" : "AUDIO: OFF";
        if (State.audioEnabled && this.ctx.state === 'suspended') this.ctx.resume();
    }
};

// --- VIDEO RECORDER --- (Merged: Your version + fixes for smoothness/cleanup)
const Recorder = {
    mediaRecorder: null,
    chunks: [],
    blob: null,
    stream: null,

    toggle: function () { if (State.isRecording) this.stop(); else this.start(); },

    start: function () {
        const canvas = document.querySelector('canvas');
        if (!canvas) {
            UI.status("No canvas found for recording.");
            return;
        }
        // Capture at 0 FPS (manual requests for variable Three.js timing)
        this.stream = canvas.captureStream(0);
        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'video/webm' });
        this.chunks = [];
        this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
        this.mediaRecorder.onstop = () => {
            this.blob = new Blob(this.chunks, { type: 'video/webm' });
            this.chunks = [];
            this.stream = null;
            State.isRecording = false;
            document.getElementById('btn-rec-start').style.display = 'inline-block';
            document.getElementById('btn-rec-stop').style.display = 'none';
            document.getElementById('btn-rec-save').style.display = 'inline-block';
            document.getElementById('rec-indicator').style.display = 'none';
            UI.status("Recording Ready");
        };
        this.mediaRecorder.start();
        State.isRecording = true;
        document.getElementById('btn-rec-start').style.display = 'none';
        document.getElementById('btn-rec-stop').style.display = 'inline-block';
        document.getElementById('rec-indicator').style.display = 'inline-block';
        UI.status("Recording...");
    },

    stop: function () {
        if (!State.isRecording || !this.mediaRecorder) return;
        this.mediaRecorder.stop();
    },

    save: function () {
        if (!this.blob) {
            UI.status("No recording to save.");
            return;
        }
        const url = URL.createObjectURL(this.blob);
        const a = document.createElement('a');
        a.href = url; a.download = `threshold_${Date.now()}.webm`; a.click();
        // Cleanup
        URL.revokeObjectURL(url);
        this.blob = null;
        document.getElementById('btn-rec-save').style.display = 'none';
        UI.status("Video saved.");
    }
};

// --- ENVIRONMENT ---
const Environment = {
    sunLight: null,
    hemiLight: null,
    waterMesh: null,
    waterBasePositions: null,

    init: function () {
        this.bindUi();
        this.setTimeOfDay(State.env.timeOfDay);
        this.setFog(State.env.fogDensity);
    },

    bindUi: function () {
        document.getElementById('env-mode')?.addEventListener('change', (e) => {
            const idx = parseInt(e.target.value, 10);
            Engine.setRenderMode(idx);
        });
        document.getElementById('env-time')?.addEventListener('input', (e) => {
            this.setTimeOfDay(parseFloat(e.target.value));
        });
        document.getElementById('env-fog')?.addEventListener('input', (e) => {
            this.setFog(parseFloat(e.target.value));
        });
        document.getElementById('env-water-toggle')?.addEventListener('click', () => this.toggleWater());
        document.getElementById('env-atmo-toggle')?.addEventListener('click', () => this.toggleAtmosphere());
    },

    setTimeOfDay: function (hours) {
        State.env.timeOfDay = hours;
        const label = document.getElementById('env-time-label');
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        if (label) label.textContent = `${h}:${String(m).padStart(2, '0')}`;

        const t = hours / 24;
        const sunAngle = (t - 0.25) * Math.PI * 2;
        const sunHeight = Math.sin(sunAngle);
        const warmth = Math.max(0, sunHeight);
        const sunX = Math.cos(sunAngle) * 40;
        const sunY = Math.max(sunHeight * 40, -5);
        const sunZ = 20;

        if (this.sunLight) {
            this.sunLight.position.set(sunX, sunY, sunZ);
            const r = 0.4 + warmth * 0.6;
            const g = 0.35 + warmth * 0.55;
            const b = 0.5 + warmth * 0.4;
            this.sunLight.color.setRGB(r, g, b);
            this.sunLight.intensity = 0.15 + warmth * 1.85;
        }

        if (Engine.scene?.fog) {
            const sky = new THREE.Color().setHSL(0.58, 0.35, 0.08 + warmth * 0.35);
            if (!State.darkMode) sky.setHSL(0.58, 0.2, 0.65);
            Engine.scene.fog.color.copy(sky);
            if (State.env.atmosphereEnabled) Engine.scene.background = sky.clone();
        }
    },

    setFog: function (density) {
        State.env.fogDensity = density;
        if (Engine.scene?.fog) Engine.scene.fog.density = density;
    },

    toggleWater: function () {
        State.env.waterEnabled = !State.env.waterEnabled;
        const btn = document.getElementById('env-water-toggle');
        if (State.env.waterEnabled) {
            this.createWater();
            if (btn) { btn.textContent = 'ON'; btn.classList.add('active'); }
            if (Engine.groundPlane) Engine.groundPlane.visible = false;
        } else {
            this.removeWater();
            if (btn) { btn.textContent = 'OFF'; btn.classList.remove('active'); }
            if (Engine.groundPlane) Engine.groundPlane.visible = true;
        }
    },

    createWater: function () {
        if (this.waterMesh) return;
        const geo = new THREE.PlaneGeometry(120, 120, 48, 48);
        geo.rotateX(-Math.PI / 2);
        this.waterBasePositions = geo.attributes.position.array.slice();
        const mat = new THREE.MeshStandardMaterial({
            color: 0x1a6b8a,
            transparent: true,
            opacity: 0.82,
            metalness: 0.75,
            roughness: 0.15
        });
        this.waterMesh = new THREE.Mesh(geo, mat);
        this.waterMesh.position.y = 0.02;
        this.waterMesh.receiveShadow = true;
        Engine.scene.add(this.waterMesh);
    },

    removeWater: function () {
        if (!this.waterMesh) return;
        Engine.scene.remove(this.waterMesh);
        this.waterMesh.geometry.dispose();
        this.waterMesh.material.dispose();
        this.waterMesh = null;
        this.waterBasePositions = null;
    },

    updateWater: function (time) {
        if (!this.waterMesh || !this.waterBasePositions) return;
        const pos = this.waterMesh.geometry.attributes.position;
        const t = time * 0.001;
        for (let i = 0; i < pos.count; i++) {
            const x = this.waterBasePositions[i * 3];
            const z = this.waterBasePositions[i * 3 + 2];
            pos.setY(i, Math.sin(x * 0.25 + t * 1.5) * 0.12 + Math.cos(z * 0.2 + t) * 0.1);
        }
        pos.needsUpdate = true;
    },

    toggleAtmosphere: function () {
        State.env.atmosphereEnabled = !State.env.atmosphereEnabled;
        const btn = document.getElementById('env-atmo-toggle');
        if (State.env.atmosphereEnabled) {
            if (!this.hemiLight) {
                this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d1b0e, 0.55);
                Engine.scene.add(this.hemiLight);
            }
            this.hemiLight.visible = true;
            if (btn) { btn.textContent = 'ON'; btn.classList.add('active'); }
            this.setTimeOfDay(State.env.timeOfDay);
        } else {
            if (this.hemiLight) this.hemiLight.visible = false;
            if (btn) { btn.textContent = 'OFF'; btn.classList.remove('active'); }
            Engine.updateBackground();
        }
    }
};

// --- CORE ENGINE ---
const Engine = {
    scene: null, camera: null, renderer: null, composer: null, shaderPass: null, bloomPass: null,
    controls: null, transformControl: null, raycaster: null, mouse: new THREE.Vector2(),
    gridHelper: null, groundPlane: null,
    init: function () {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02); // Distance fog for realism
        this.updateBackground();
        const navHeight = document.getElementById('app-nav')?.offsetHeight || 50;
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / (window.innerHeight - navHeight), 0.1, 1000);
        this.camera.position.set(10, 8, 10);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight - navHeight);
        this.renderer.setPixelRatio(IS_TOUCH_DEVICE ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true; // Enable Shadows
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        // Lighting (Realism Upgrade)
        const amb = new THREE.AmbientLight(0x404040, 1.0);
        this.scene.add(amb);
        Environment.sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
        Environment.sunLight.position.set(10, 20, 10);
        Environment.sunLight.castShadow = true;
        Environment.sunLight.shadow.mapSize.width = 2048;
        Environment.sunLight.shadow.mapSize.height = 2048;
        this.scene.add(Environment.sunLight);
        // Visual Helpers
        this.gridHelper = new THREE.GridHelper(40, 40, 0x666666, 0x333333);
        this.scene.add(this.gridHelper);
        const planeGeo = new THREE.PlaneGeometry(100, 100);
        const planeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
        this.groundPlane = new THREE.Mesh(planeGeo, planeMat);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.receiveShadow = true; // Floor receives shadows
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
        this.setRenderMode(4);
        UI.updateModeDisplay(4);
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('keydown', (e) => {
            if (Controls._rebind) return;
            State.keys[e.code] = true;
            if (e.code === 'Delete') World.deleteObject(State.selectedObject);
            const action = Controls.getActionForCode(e.code);
            if (!e.repeat) {
                if (action === 'toggleMode') UI.toggleControlMode();
                if (action === 'pause' && Controls.canUse('pause')) UI.togglePause();
            }
        });
        window.addEventListener('keyup', (e) => State.keys[e.code] = false);
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.renderer.domElement.addEventListener('contextmenu', (e) => this.onContextMenu(e));
        this.animate();
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
            uniforms: { tDiffuse: { value: null }, mode: { value: 4 }, time: { value: 0 } },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform int mode;
                uniform float time;
                varying vec2 vUv;
                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    if (mode == 4) { gl_FragColor = texel; return; }
                    float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
                    vec3 outColor;
                    if (mode == 0) {
                        float q = 0.0;
                        if (luma > 0.8) q = 1.0;
                        else if (luma > 0.6) q = 0.75;
                        else if (luma > 0.4) q = 0.5;
                        else if (luma > 0.2) q = 0.25;
                        outColor = vec3(q);
                    } else if (mode == 1) {
                        outColor = (luma > 0.4) ? vec3(1.0) : vec3(0.0);
                    } else if (mode == 2) {
                        float q = (luma > 0.5) ? 1.0 : ((luma > 0.2) ? 0.3 : 0.0);
                        outColor = vec3(0.0, q, 0.0);
                        if (mod(gl_FragCoord.y, 4.0) < 2.0) outColor *= 0.8;
                    } else if (mode == 3) {
                        outColor = floor(texel.rgb * 4.0) / 4.0;
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

        this.bloomPass = new UnrealBloomPass(size, 1.5, 0.4, 0.85);
        this.bloomPass.enabled = true;
        this.bloomPass.renderToScreen = true;
        this.composer.addPass(this.bloomPass);
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
            this.bloomPass.strength = 1.5;
            this.bloomPass.radius = 0.5;
        }
        UI.updateModeDisplay(idx);
        const select = document.getElementById('env-mode');
        if (select) select.value = String(idx);
    },
    onPointerDown: function (e) {
        if (e.button !== 0) { UI.closeCtx(); return; }
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(State.objects);
        if (intersects.length > 0) UI.selectObject(intersects[0].object);
        else if (!this.transformControl.dragging) UI.deselectObject();
    },
    onContextMenu: function (e) {
        e.preventDefault();
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const objIntersects = this.raycaster.intersectObjects(State.objects);
        if (objIntersects.length > 0) {
            UI.openCtx(e.clientX, e.clientY, 'object', objIntersects[0].object);
            return;
        }
        const intersects = this.raycaster.intersectObject(this.groundPlane);
        if (intersects.length > 0) {
            State.ctxTargetPos.copy(intersects[0].point);
            UI.openCtx(e.clientX, e.clientY, 'ground');
        }
    },
    onResize: function () {
        const navHeight = document.getElementById('app-nav')?.offsetHeight || 50;
        this.camera.aspect = window.innerWidth / (window.innerHeight - navHeight);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight - navHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight - navHeight);
        if (this.bloomPass) this.bloomPass.setSize(window.innerWidth, window.innerHeight - navHeight);
    },
    animate: function (time) {
        requestAnimationFrame((t) => this.animate(t));
        if (this.shaderPass) this.shaderPass.uniforms.time.value = time * 0.001;

        Controls.pollGamepad();
        if (Controls.consumeJustPressed('toggleMode')) UI.toggleControlMode();
        if (Controls.consumeJustPressed('pause')) UI.togglePause();

        if (!State.isPaused) {
            if (State.controlMode === 'walk' && PlayerController.spawned) {
                PlayerController.prePhysics(State.keys);
            }
            Physics.update();
            if (State.controlMode === 'walk' && PlayerController.spawned) {
                PlayerController.postPhysics();
            } else {
                const speed = 0.2;
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
        this.controls.update();
        // Visual Rotation (Only for non-physics objects or purely visual effect)
        if (!State.isPaused) {
            State.objects.forEach(obj => {
                if (obj.userData.isRotating && !obj.userData.locked && !obj.userData.hasPhysics) obj.rotation.y += 0.02;
            });
        }
        // Recorder frame request (for smooth video)
        if (State.isRecording && Recorder.stream) {
            Recorder.stream.getVideoTracks()[0].requestFrame();
        }
        this.composer.render();
    }
};

// --- WORLD MANAGER ---
const World = {
    // Modified to allow Physics flag
    createObject: function (type, name, color = 0xffffff, usePhysics = false) {
        let geo, mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.2, // Shiny for Bloom
            metalness: 0.5
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
        if (usePhysics) {
            const body = Physics.addBody(mesh, type);
            State.physicsObjects.push({ mesh, body });
        }
        AudioSys.playTone(300, 'sine');
        return mesh;
    },
    addCustom: function (geometry, material, name, usePhysics = false) {
        // Ensure material reacts to Bloom in Hyper mode
        if (material) {
            material.emissiveIntensity = 0.5; // Base glow
            // If the color is very bright, increase emissive
            if (material.color.getHex() > 0x888888) {
                material.emissive = material.color;
            }
        }
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 5;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { id: Date.now().toString(36), name: name || 'custom', type: 'custom', locked: false, isRotating: false, hasPhysics: usePhysics };
        Engine.scene.add(mesh);
        State.objects.push(mesh);
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
        const body = this.createObject('cube', 'character_body', 0x3366cc, false);
        body.scale.set(0.55, 1.1, 0.35);
        body.position.set(x, y + 1.1, z);
        const head = this.createObject('sphere', 'character_head', 0xffcc99, false);
        head.scale.set(0.45, 0.45, 0.45);
        head.position.set(x, y + 2.1, z);
        body.userData.isCharacter = true;
        body.userData.isHuman = true;
        head.userData.isCharacter = true;
        head.userData.isHuman = true;
        if (!silent) { UI.closeInsert(); UI.status('Character inserted'); }
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
        objects.forEach((d) => {
            const m = this.createObject(d.type, d.name, d.color, false);
            if (m) {
                m.position.set(ox + (d.pos?.x || 0), d.pos?.y || 1, oz + (d.pos?.z || 0));
                if (d.rot) m.rotation.set(d.rot.x, d.rot.y, d.rot.z);
                if (d.scl) m.scale.set(d.scl.x, d.scl.y, d.scl.z);
                if (d.userData) m.userData = { ...m.userData, ...d.userData };
            }
        });
    },
    runCustomAtCursor: function (code, silent = false) {
        const wrapped = `const _x=${State.ctxTargetPos.x}, _y=${State.ctxTargetPos.y}, _z=${State.ctxTargetPos.z};\n${code}`;
        Runtime.execute(wrapped, 'insert-code');
        if (!silent) UI.closeInsert();
    },
    getCursorPos: function () {
        return { x: State.ctxTargetPos.x, y: State.ctxTargetPos.y, z: State.ctxTargetPos.z };
    },
    deleteObject: function (obj) {
        if (!obj) return;
        Engine.transformControl.detach();
        Engine.scene.remove(obj);
        State.objects = State.objects.filter(o => o !== obj);
        // Remove from physics
        const physIdx = State.physicsObjects.findIndex(p => p.mesh === obj);
        if (physIdx > -1) {
            Physics.world.removeBody(State.physicsObjects[physIdx].body);
            State.physicsObjects.splice(physIdx, 1);
        }
        UI.deselectObject();
    },
    clearWorld: function (silent = false) {
        State.physicsObjects.forEach(p => Physics.world.removeBody(p.body));
        State.physicsObjects = [];
        State.objects.forEach(o => Engine.scene.remove(o));
        State.objects = [];
        Engine.transformControl.detach();
        UI.deselectObject();
        if (!silent) UI.status('World cleared');
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

// --- IO SYSTEM ---
const IO = {
    exportScene: function () {
        const data = State.objects.map(o => ({
            type: o.userData.type, name: o.userData.name,
            pos: o.position, rot: o.rotation, scl: o.scale,
            userData: o.userData, color: o.material.color.getHex()
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `threshold_${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
        UI.status("Scene Exported");
    },
    importScene: function () { document.getElementById('file-input').click(); },
    handleFileSelect: function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                World.clearWorld();
                data.forEach(d => {
                    // Import assumes no physics to start (can be added later)
                    const m = World.createObject(d.type, d.name, d.color, false);
                    if (m) {
                        m.position.copy(d.pos); m.rotation.set(d.rot._x, d.rot._y, d.rot._z);
                        m.scale.copy(d.scl); m.userData = d.userData;
                    }
                });
                UI.status("Scene Loaded");
            } catch (err) { UI.status("Error Loading"); }
        };
        reader.readAsText(file);
    }
};

// --- UI MANAGER ---
const UI = {
    init: function () {
        // Recorder buttons
        document.getElementById('btn-rec-start').onclick = () => Recorder.start();
        document.getElementById('btn-rec-stop').onclick = () => Recorder.stop();
        document.getElementById('btn-rec-save').onclick = () => Recorder.save();

        document.getElementById('ctx-insert').onclick = () => { UI.closeCtx(); UI.openInsert(); };
        document.getElementById('ctx-clear').onclick = () => { Actions.dispatch('CLEAR_WORLD'); UI.closeCtx(); };
        document.getElementById('ctx-close').onclick = () => UI.closeCtx();

        document.getElementById('btn-mobile-insert')?.addEventListener('click', () => UI.openInsert());
        document.getElementById('insert-close')?.addEventListener('click', () => UI.closeInsert());
        document.getElementById('insert-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'insert-modal') UI.closeInsert();
        });
        document.querySelectorAll('.insert-tab').forEach((tab) => {
            tab.addEventListener('click', () => UI.switchInsertTab(tab.dataset.tab));
        });
        document.getElementById('insert-character')?.addEventListener('click', () => {
            Actions.dispatch('INSERT_CHARACTER', { pos: World.getCursorPos() });
            UI.closeInsert();
        });
        document.getElementById('insert-spawn-player')?.addEventListener('click', () => {
            Actions.dispatch('SPAWN_PLAYER', { pos: World.getCursorPos() });
            UI.closeInsert();
        });
        document.getElementById('insert-player-btn')?.addEventListener('click', () => {
            const key = document.getElementById('insert-player-key')?.value;
            Actions.dispatch('INSERT_PLAYER', { key });
            UI.closeInsert();
        });
        document.getElementById('insert-saved-btn')?.addEventListener('click', () => {
            const key = document.getElementById('insert-saved-player')?.value;
            if (key) { Actions.dispatch('INSERT_SAVED', { key }); UI.closeInsert(); }
        });
        document.getElementById('save-current-player')?.addEventListener('click', () => UI.saveCurrentPlayer());
        document.getElementById('insert-code-run')?.addEventListener('click', () => {
            const code = document.getElementById('insert-custom-code')?.value;
            Actions.dispatch('INSERT_CUSTOM', { code, pos: World.getCursorPos() });
            UI.closeInsert();
        });
        document.getElementById('import-player-file')?.addEventListener('change', (e) => UI.importPlayerFile(e));

        document.getElementById('btn-copy-link')?.addEventListener('click', () => UI.copySessionLink());
        document.getElementById('btn-host-pause')?.addEventListener('click', () => UI.togglePause());
        document.getElementById('btn-env-toggle')?.addEventListener('click', () => {
            document.getElementById('env-panel')?.classList.toggle('mobile-open');
        });

        document.getElementById('ctx-edit-inspect').onclick = () => { if (State.selectedObject) UI.selectObject(State.selectedObject); UI.closeCtx(); };
        document.getElementById('ctx-edit-delete').onclick = () => { World.deleteObject(State.selectedObject); UI.closeCtx(); };

        document.getElementById('btn-lock').onclick = () => this.toggleLock();
        document.getElementById('btn-delete').onclick = () => World.deleteObject(State.selectedObject);
        document.getElementById('btn-anim-rot').onclick = () => { if (State.selectedObject) State.selectedObject.userData.isRotating = !State.selectedObject.userData.isRotating; };
        document.getElementById('btn-raw').onclick = () => this.openJsonEditor();
        document.querySelectorAll('input[name="gizmo"]').forEach(r => r.addEventListener('change', (e) => Engine.transformControl.setMode(e.target.value)));

        document.getElementById('btn-json-cancel').onclick = () => this.closeModal();
        document.getElementById('btn-json-apply').onclick = () => this.applyJson();

        const cmd = document.getElementById('cmd-input');
        cmd.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.runCmd(); } });

        document.getElementById('btn-grid').onclick = () => {
            const vis = Engine.toggleGrid();
            document.getElementById('btn-grid').innerText = vis ? 'ON' : 'OFF';
        };
        document.getElementById('btn-save').onclick = () => IO.exportScene();
        document.getElementById('btn-load').onclick = () => IO.importScene();
        document.getElementById('file-input').addEventListener('change', (e) => IO.handleFileSelect(e));

        document.getElementById('btn-save-world')?.addEventListener('click', () => UI.saveWorld());
        document.getElementById('btn-load-world')?.addEventListener('click', () => UI.openWorldModal());
        document.getElementById('world-close')?.addEventListener('click', () => UI.closeWorldModal());
        document.getElementById('world-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'world-modal') UI.closeWorldModal();
        });
        document.getElementById('world-load-btn')?.addEventListener('click', () => UI.loadWorldByCode());
        document.getElementById('world-copy-link')?.addEventListener('click', () => UI.copyWorldLink());
        document.getElementById('world-export-btn')?.addEventListener('click', () => UI.exportCurrentWorld());
        document.getElementById('world-import-file')?.addEventListener('change', (e) => UI.importWorldFile(e));
        document.getElementById('btn-control-mode')?.addEventListener('click', () => UI.toggleControlMode());
        document.getElementById('btn-bindings')?.addEventListener('click', () => UI.openBindingsModal());
        document.getElementById('bindings-close')?.addEventListener('click', () => UI.closeBindingsModal());
        document.getElementById('bindings-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'bindings-modal') UI.closeBindingsModal();
        });
        document.getElementById('bindings-profile')?.addEventListener('change', (e) => UI.switchBindingsProfile(e.target.value));
        document.getElementById('bindings-reset')?.addEventListener('click', () => UI.resetBindingsProfile());
        document.getElementById('bindings-list')?.addEventListener('click', (e) => {
            const bindBtn = e.target.closest('[data-bind]');
            const clearBtn = e.target.closest('[data-clear]');
            if (bindBtn) UI.startBinding(bindBtn.dataset.bind);
            if (clearBtn) UI.clearBinding(clearBtn.dataset.clear);
        });
        document.getElementById('world-list')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-world-code]');
            if (btn) UI.loadWorldByCode(btn.dataset.worldCode);
        });

        UI.updateControlMode();
    },
    updateModeDisplay: function (idx) {
        const el = document.getElementById('mode-display');
        if (el && Modes[idx]) el.textContent = Modes[idx].name;
    },
    selectObject: function (obj) {
        if (State.selectedObject === obj) return;
        State.selectedObject = obj;
        document.getElementById('inspector').style.display = 'block';
        document.getElementById('insp-name').value = obj.userData.name;
        document.getElementById('btn-lock').innerText = obj.userData.locked ? "LOCKED" : "UNLOCK";
        if (!obj.userData.locked) Engine.transformControl.attach(obj); else Engine.transformControl.detach();
    },
    deselectObject: function () {
        State.selectedObject = null; Engine.transformControl.detach(); document.getElementById('inspector').style.display = 'none';
    },
    toggleLock: function () {
        if (!State.selectedObject) return;
        const o = State.selectedObject; o.userData.locked = !o.userData.locked;
        if (o.userData.locked) Engine.transformControl.detach(); else Engine.transformControl.attach(o);
        document.getElementById('btn-lock').innerText = o.userData.locked ? "LOCKED" : "UNLOCK";
    },
    openCtx: function (x, y, contextType, targetObj = null) {
        const menu = document.getElementById('ctx-menu');
        const header = document.getElementById('ctx-header');
        const groundGroup = document.getElementById('ctx-group-ground');
        const editGroup = document.getElementById('ctx-group-edit');
        menu.style.display = 'flex'; menu.style.left = x + 'px'; menu.style.top = y + 'px';
        if (contextType === 'object' && targetObj) {
            State.selectedObject = targetObj;
            if (header) header.innerText = 'OBJECT: ' + (targetObj.userData.name || 'Object');
            groundGroup.style.display = 'none';
            editGroup.style.display = 'flex';
            editGroup.style.flexDirection = 'column';
        } else {
            if (header) header.innerText = 'SCENE';
            groundGroup.style.display = 'flex';
            groundGroup.style.flexDirection = 'column';
            editGroup.style.display = 'none';
        }
    },
    closeCtx: function () { document.getElementById('ctx-menu').style.display = 'none'; },
    openJsonEditor: function () {
        if (!State.selectedObject) return;
        document.getElementById('json-modal').style.display = 'flex';
        document.getElementById('json-editor').value = JSON.stringify(State.selectedObject.userData, null, 2);
    },
    applyJson: function () { try { State.selectedObject.userData = JSON.parse(document.getElementById('json-editor').value); this.closeModal(); this.selectObject(State.selectedObject); } catch (e) { alert("Invalid JSON"); } },
    closeModal: function () { document.getElementById('json-modal').style.display = 'none'; },
    status: function (msg) {
        const el = document.getElementById('status-msg');
        el.innerText = `> ${msg}`; el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 3000);
    },
    runCmd: function () {
        const input = document.getElementById('cmd-input');
        const raw = input.value.trim();
        if (!raw) return;
        if (raw.toLowerCase() === 'allow pasting') { State.clipboardAllowed = true; input.value = ''; this.status('Pasting Allowed'); return; }
        if (!State.clipboardAllowed && raw.length > 50) { this.status("Type 'allow pasting' first."); return; }
        const result = Runtime.execute(raw, 'command-bar');
        if (result.ok) {
            input.classList.add('cmd-success');
            setTimeout(() => input.classList.remove('cmd-success'), 300);
            input.value = '';
        } else {
            input.classList.add('cmd-error');
            setTimeout(() => input.classList.remove('cmd-error'), 300);
        }
    },
    openInsert: function () {
        if (IS_TOUCH_DEVICE && Engine.groundPlane) {
            Engine.raycaster.setFromCamera(new THREE.Vector2(0, 0), Engine.camera);
            const hit = Engine.raycaster.intersectObject(Engine.groundPlane);
            if (hit.length) State.ctxTargetPos.copy(hit[0].point);
        }
        Session.refreshSavedPlayerList();
        document.getElementById('insert-modal')?.classList.add('open');
    },
    closeInsert: function () {
        document.getElementById('insert-modal')?.classList.remove('open');
    },
    switchInsertTab: function (tab) {
        document.querySelectorAll('.insert-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
        document.querySelectorAll('.insert-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === tab));
    },
    saveCurrentPlayer: function () {
        const name = prompt('Player name?', Session.playerName) || Session.playerName;
        const code = Runtime.runningCode || '';
        const objects = getSceneObjectsForSpawn();
        const saved = Session.savePlayer(name, code, objects);
        Session.refreshSavedPlayerList();
        const blob = new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `player_${Session.playerKey}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.status(`Saved player ${Session.playerKey} — share this file`);
    },
    importPlayerFile: function (e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (Session.importPlayer(data)) this.status(`Imported player ${data.key}`);
                else this.status('Invalid player file');
            } catch {
                this.status('Invalid player file');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },
    copySessionLink: async function () {
        const link = Network.getShareUrl();
        try {
            await navigator.clipboard.writeText(link);
            this.status('Invite link copied — send to friends');
        } catch {
            this.status(link);
        }
    },
    updateControlMode: function () {
        const btn = document.getElementById('btn-control-mode');
        const mode = State.controlMode === 'walk' && PlayerController.spawned ? 'walk' : 'fly';
        if (btn) btn.textContent = mode === 'walk' ? 'WALK' : 'FLY';
        this.updateControlsHint();
    },
    updateControlsHint: function () {
        const hint = document.getElementById('controls-hint');
        if (hint && Controls) hint.textContent = Controls.getHint() + ' · right-click menu';
    },
    updateGamepadStatus: function () {
        const el = document.getElementById('gamepad-status');
        if (!el) return;
        el.textContent = Controls.gamepad
            ? `Controller: ${Controls.gamepadName.slice(0, 40)}`
            : 'Controller: none (plug in gamepad)';
    },
    togglePause: function () {
        if (Network.mode === 'guest') {
            this.status('Only the host can pause');
            return;
        }
        const paused = !State.isPaused;
        Actions.dispatch('PAUSE', { paused });
        State.isPaused = paused;
        Session.isPaused = paused;
        Session.updateUi();
    },
    openBindingsModal: function () {
        const profile = Controls.getProfile();
        const select = document.getElementById('bindings-profile');
        if (select) select.value = profile;
        Controls.renderEditor(profile);
        this.updateGamepadStatus();
        document.getElementById('bindings-modal')?.classList.add('open');
    },
    closeBindingsModal: function () {
        Controls._rebind = null;
        document.getElementById('bindings-modal')?.classList.remove('open');
        this.updateControlsHint();
    },
    switchBindingsProfile: function (profile) {
        Controls.renderEditor(profile || 'host');
    },
    resetBindingsProfile: function () {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        Controls.resetProfile(profile);
        Controls.renderEditor(profile);
        this.status(`${profile === 'host' ? 'Host' : 'Guest'} bindings reset`);
    },
    startBinding: function (action) {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        const btn = document.querySelector(`[data-bind="${action}"]`);
        if (btn) btn.textContent = 'Press key… (Esc cancel)';
        Controls.startRebind(profile, action, (ok) => {
            Controls.renderEditor(profile);
            if (ok) this.status(`Bound ${CONTROL_ACTIONS[action]?.label || action}`);
        });
    },
    clearBinding: function (action) {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        Controls.clearBinding(profile, action);
        Controls.renderEditor(profile);
    },
    toggleControlMode: function () {
        if (PlayerController.spawned) {
            if (State.controlMode === 'walk') {
                State.controlMode = 'fly';
                this.status('Fly camera mode');
            } else {
                State.controlMode = 'walk';
                this.status('Walk mode — WASD + Space');
            }
        } else {
            const pos = World.getCursorPos();
            PlayerController.spawn(pos.x, pos.y + 1, pos.z);
        }
        this.updateControlMode();
    },
    saveWorld: async function () {
        const name = prompt('World name?', `World-${Date.now().toString(36).slice(-4)}`);
        if (!name) return;
        try {
            const record = await Persistence.saveWorld(name);
            this._lastWorldCode = record.code;
            document.getElementById('world-code-input').value = record.code;
            document.getElementById('world-share-link').value = Persistence.getShareUrl(record.code);
            this.refreshWorldList();
            this.status(`World saved: ${record.name} (${record.code})`);
        } catch (e) {
            this.status('Save failed: ' + e.message);
        }
    },
    openWorldModal: function () {
        this.refreshWorldList();
        document.getElementById('world-modal')?.classList.add('open');
    },
    closeWorldModal: function () {
        document.getElementById('world-modal')?.classList.remove('open');
    },
    refreshWorldList: function () {
        const list = document.getElementById('world-list');
        if (!list) return;
        const worlds = Persistence.listLocal();
        if (!worlds.length) {
            list.innerHTML = '<p class="insert-hint">No saved worlds on this device yet.</p>';
            return;
        }
        list.innerHTML = worlds.map((w) => `
            <button class="insert-action secondary world-item" data-world-code="${w.code}" type="button">
                ${w.name} <code>${w.code}</code>${w.cloud ? ' ☁' : ''}
            </button>
        `).join('');
    },
    loadWorldByCode: async function (code) {
        const input = document.getElementById('world-code-input');
        const trimmed = (code || input?.value || '').trim().toUpperCase();
        if (!trimmed) { this.status('Enter a world code'); return; }
        try {
            const record = await Persistence.loadWorld(trimmed);
            this._lastWorldCode = record.code;
            if (input) input.value = record.code;
            document.getElementById('world-share-link').value = Persistence.getShareUrl(record.code);
            this.updateControlMode();
            this.closeWorldModal();
            this.status(`Loaded world ${record.name} (${record.code})`);
        } catch (e) {
            this.status(e.message);
        }
    },
    copyWorldLink: async function () {
        const code = document.getElementById('world-code-input')?.value || this._lastWorldCode;
        if (!code) { this.status('Save or load a world first'); return; }
        const link = Persistence.getShareUrl(code);
        document.getElementById('world-share-link').value = link;
        try {
            await navigator.clipboard.writeText(link);
            this.status('World link copied');
        } catch {
            this.status(link);
        }
    },
    exportCurrentWorld: function () {
        const code = document.getElementById('world-code-input')?.value || this._lastWorldCode || 'SNAPSHOT';
        const name = prompt('Export name?', 'world-export') || 'world-export';
        const record = { code, name, data: Sync.capture(), savedAt: Date.now() };
        Persistence.exportFile(record);
        this.status('World file exported');
    },
    importWorldFile: async function (e) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const record = await Persistence.importFile(file);
            this._lastWorldCode = record.code;
            document.getElementById('world-code-input').value = record.code;
            document.getElementById('world-share-link').value = Persistence.getShareUrl(record.code);
            this.refreshWorldList();
            this.updateControlMode();
            this.status(`Imported world ${record.name || record.code}`);
        } catch (err) {
            this.status('Import failed: ' + err.message);
        }
        e.target.value = '';
    }
};