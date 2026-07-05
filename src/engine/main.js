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
import { HumanMesh } from './humanMesh.js';
import { Persistence } from '../shared/persistence.js';
import { Sync } from '../shared/sync.js';
import { Controls, CONTROL_ACTIONS } from '../shared/controls.js';
import { TouchControls } from '../shared/touchControls.js';
import { Permissions } from '../shared/permissions.js';
import { SimMode } from '../shared/simMode.js';
import { initPanelDrag, ensurePanelVisible } from '../shared/panelDrag.js';
import { ViewPrefs } from '../shared/viewPrefs.js';
import { SceneDock } from '../shared/sceneDock.js';
import { SoundLibrary } from '../shared/soundLibrary.js';
import { SoundPrompt } from '../shared/soundPrompt.js';
import { TextureLibrary } from '../shared/textureLibrary.js';
import { TextureBridge } from '../shared/textureBridge.js';
import { GltfImport } from '../shared/gltfImport.js';
import { ThresholdShell } from '../shared/thresholdShell.js';
import { CreativeWatch } from '../shared/creativeWatch.js';
import { bootstrapStarterScene } from '../shared/starterScene.js';
import { GameExport } from '../shared/gameExport.js';
import { AgentHub } from '../shared/agentHub.js';
import { NpcAgent } from '../grok/npcAgent.js';
import { DevAgent } from '../grok/devAgent.js';
import { Walkthrough } from '../shared/walkthrough.js';
import { ExportWizard } from '../shared/exportWizard.js';
import { getRenderMode } from '../shared/renderModes.js';
import { GraphicsProfile } from '../shared/graphicsProfile.js';
import { GraphicsPrompt } from '../shared/graphicsPrompt.js';
import { MeshLod } from '../shared/meshLod.js';
import { TextureHilod } from '../shared/textureHilod.js';
import { Cinematic } from '../shared/cinematic.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

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
    window.Cinematic = Cinematic;
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
    GraphicsProfile.bootstrap();
    Environment.init();
    UI.init();
    Physics.createFloor();
    window.Environment = Environment;
    TouchControls.init();

    if (Network.mode === 'host') {
        document.body.classList.add('network-host');
        Network.updateUi();
    }

    window.addEventListener('threshold:pause', (e) => {
        State.isPaused = !!e.detail?.paused;
        UI.updateSimMode();
        const reason = e.detail?.reason;
        UI.status(State.isPaused ? (reason ? `EDIT: ${reason}` : 'EDIT mode — world editable') : 'PLAY mode — simulation running');
    });

    const worldCode = new URLSearchParams(window.location.search).get('world');
    if (worldCode) {
        Persistence.loadWorld(worldCode)
            .then((r) => UI.status(`Loaded world ${r.name} (${r.code})`))
            .catch((e) => UI.status(e.message));
    } else {
        setTimeout(() => bootstrapStarterScene(), 120);
    }

    Walkthrough.startIfNeeded();
    if (ViewPrefs.get('walkthroughDone') || ViewPrefs.get('welcomeSeen')) {
        GraphicsPrompt.startIfNeeded();
    }
}

// --- GLOBAL STATE ---
const State = {
    selectedObject: null,
    audioEnabled: false,
    darkMode: true,
    gridVisible: true,
    renderMode: 4,
    graphicsTier: 'realistic',
    graphicsDetectedTier: null,
    objects: [],
    physicsObjects: [],
    keys: {},
    clipboardAllowed: false,
    ctxTargetPos: new THREE.Vector3(),
    isRecording: false,
    isPaused: false,
    cutscenePlaying: false,
    cinematicCatalog: [],
    controlMode: 'fly',
    playerRef: null,
    hostCamera: null,
    env: {
        timeOfDay: 14,
        fogDensity: 0.015,
        waterEnabled: true,
        atmosphereEnabled: true
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
        this.world.solver.iterations = 15;
        this.world.allowSleep = true;

        const defaultMat = new CANNON.Material('default');
        const contactMat = new CANNON.ContactMaterial(defaultMat, defaultMat, {
            friction: 0.42,
            restitution: 0.28
        });
        this.world.addContactMaterial(contactMat);

        const lastHit = new Map();
        this.world.addEventListener('collide', (e) => {
            const now = performance.now();
            [e.bodyA, e.bodyB].forEach((body) => {
                const entry = State.physicsObjects.find((p) => p.body === body);
                if (!entry?.mesh) return;
                const id = entry.mesh.userData?.id || entry.mesh.uuid;
                if (lastHit.get(id) && now - lastHit.get(id) < 280) return;
                lastHit.set(id, now);
                AudioSys.playObjectSound(entry.mesh, 'collision');
            });
        });
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

    addBodyFromObject: function (root, mass = 1) {
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        box.getSize(size);
        const half = new CANNON.Vec3(
            Math.max(size.x / 2, 0.05),
            Math.max(size.y / 2, 0.05),
            Math.max(size.z / 2, 0.05)
        );
        const body = new CANNON.Body({
            mass: mass ?? 1,
            position: new CANNON.Vec3(root.position.x, root.position.y, root.position.z),
            shape: new CANNON.Box(half),
        });
        this.world.addBody(body);
        return body;
    },

    applyEnvironmentEffects: function () {
        const fog = State.env?.fogDensity ?? 0.02;
        const atmo = State.env?.atmosphereEnabled ? 1 : 0;
        const damp = 0.06 + fog * 5.5 + atmo * 0.1;

        const applyDamping = (body) => {
            if (!body || body.mass <= 0) return;
            body.linearDamping = damp;
            body.angularDamping = damp * 0.55;
        };

        State.physicsObjects.forEach(({ body }) => applyDamping(body));
        if (PlayerController.body) applyDamping(PlayerController.body);

        if (atmo && fog > 0.008) {
            const t = (State.env.timeOfDay ?? 12) / 24 * Math.PI * 2;
            const wind = fog * 14;
            const fx = Math.sin(t) * wind;
            const fz = Math.cos(t) * wind * 0.6;
            State.physicsObjects.forEach(({ body }) => {
                if (body.mass > 0 && body.mass < 80) {
                    body.applyForce(new CANNON.Vec3(fx, 0, fz), body.position);
                }
            });
        }
    },

    update: function () {
        if (State.isPaused) return;
        this.applyEnvironmentEffects();
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
    clipCache: new Map(),

    init: function () {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    },

    ensureContext: function () {
        if (!this.ctx) this.init();
        State.audioEnabled = true;
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    playTone: function (freq, type = 'square', dur = 0.1) {
        if (!this.ctx) return;
        this.ensureContext();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    },

    playClip: async function (clipId, volume = 0.85) {
        if (!clipId) return;
        this.ensureContext();
        try {
            let buffer = this.clipCache.get(clipId);
            if (!buffer) {
                const blob = await SoundLibrary.getBlob(clipId);
                if (!blob) return;
                const arr = await blob.arrayBuffer();
                buffer = await this.ctx.decodeAudioData(arr.slice(0));
                this.clipCache.set(clipId, buffer);
            }
            const src = this.ctx.createBufferSource();
            const gain = this.ctx.createGain();
            src.buffer = buffer;
            gain.gain.value = volume;
            src.connect(gain);
            gain.connect(this.ctx.destination);
            src.start();
        } catch (e) {
            console.warn('Clip playback failed:', e);
        }
    },

    playObjectSound: function (obj, trigger = 'test') {
        if (!obj?.userData) return;
        const mode = obj.userData.soundMode || 'tone';
        const configured = obj.userData.soundTrigger || 'collision';
        if (trigger !== 'test' && configured !== trigger) return;

        if (mode === 'clip' && obj.userData.soundClipId) {
            this.playClip(obj.userData.soundClipId);
            return;
        }
        this.playTone(obj.userData.soundFreq || 440, obj.userData.soundType || 'sine', 0.25);
    },

    toggle: function () {
        if (!this.ctx) this.init();
        State.audioEnabled = !State.audioEnabled;
        const btn = document.getElementById('btn-audio');
        if (btn) btn.innerText = State.audioEnabled ? 'AUDIO: ON' : 'AUDIO: OFF';
        if (State.audioEnabled && this.ctx.state === 'suspended') this.ctx.resume();
    },
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
    waterReflector: null,
    waterBasePositions: null,

    init: function () {
        this.bindUi();
        this.setTimeOfDay(State.env.timeOfDay);
        this.setFog(State.env.fogDensity);
        if (State.env.waterEnabled) {
            this.createWater();
            const btn = document.getElementById('env-water-toggle');
            if (btn) { btn.textContent = 'ON'; btn.classList.add('active'); }
            if (Engine.groundPlane) Engine.groundPlane.visible = false;
        }
        if (State.env.atmosphereEnabled) {
            if (!this.hemiLight) {
                this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x1a2a12, 0.55);
                Engine.scene.add(this.hemiLight);
            }
            this.hemiLight.visible = true;
            const btn = document.getElementById('env-atmo-toggle');
            if (btn) { btn.textContent = 'ON'; btn.classList.add('active'); }
        }
    },

    bindUi: function () {
        document.getElementById('env-graphics-tier')?.addEventListener('change', (e) => {
            const tierId = e.target.value;
            if (tierId === 'custom') {
                GraphicsProfile.markCustom();
                return;
            }
            GraphicsProfile.apply(tierId);
        });
        document.getElementById('env-mode')?.addEventListener('change', (e) => {
            const idx = parseInt(e.target.value, 10);
            Engine.setRenderMode(idx);
            GraphicsProfile.markCustom();
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
        if (this.waterReflector) return;

        const tier = State.graphicsTier || 'realistic';
        const tierPreset = GraphicsProfile.getTier(tier);
        const texSize = tierPreset.waterTexSize || (IS_TOUCH_DEVICE ? 512 : 1024);
        const reflectorGeo = new THREE.PlaneGeometry(120, 120);
        this.waterReflector = new Reflector(reflectorGeo, {
            clipBias: 0.003,
            textureWidth: texSize,
            textureHeight: texSize,
            color: 0x0a1820,
        });
        this.waterReflector.rotation.x = -Math.PI / 2;
        this.waterReflector.position.y = 0.015;
        this.waterReflector.receiveShadow = true;
        Engine.scene.add(this.waterReflector);

        const rippleGeo = new THREE.PlaneGeometry(120, 120, 48, 48);
        rippleGeo.rotateX(-Math.PI / 2);
        this.waterBasePositions = rippleGeo.attributes.position.array.slice();
        const rippleMat = new THREE.MeshStandardMaterial({
            color: 0x1a4a5a,
            transparent: true,
            opacity: 0.22,
            metalness: 0.45,
            roughness: 0.18,
            depthWrite: false,
            envMapIntensity: 0.55,
        });
        this.waterMesh = new THREE.Mesh(rippleGeo, rippleMat);
        this.waterMesh.position.y = 0.06;
        Engine.scene.add(this.waterMesh);
    },

    removeWater: function () {
        if (this.waterReflector) {
            Engine.scene.remove(this.waterReflector);
            this.waterReflector.geometry.dispose();
            this.waterReflector.material.dispose();
            this.waterReflector = null;
        }
        if (this.waterMesh) {
            Engine.scene.remove(this.waterMesh);
            this.waterMesh.geometry.dispose();
            this.waterMesh.material.dispose();
            this.waterMesh = null;
        }
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
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.92;
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
        const planeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.55, metalness: 0.15, envMapIntensity: 0.6 });
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
        this.setupImageBasedLighting();
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
                if (action === 'interact') UI.openInsert();
            }
        });
        window.addEventListener('keyup', (e) => State.keys[e.code] = false);
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.renderer.domElement.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
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

        this.bloomPass = new UnrealBloomPass(size, 0.75, 0.32, 0.92);
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
        const isHyper = idx === 4;
        if (Environment.sunLight) Environment.sunLight.intensity = isHyper ? 1.65 : 2.2;
        if (this.renderer) this.renderer.toneMappingExposure = isHyper ? 0.88 : 0.92;
        if (this.scene.fog) this.scene.fog.density = isHyper ? State.env.fogDensity : Math.max(State.env.fogDensity, 0.018);
        State.objects.forEach((obj) => {
            if (!obj.material?.isMeshStandardMaterial) return;
            obj.material.envMapIntensity = isHyper ? 0.65 : 0.35;
            if (!isHyper && obj.material.emissive) {
                obj.material.emissiveIntensity = Math.max(obj.material.emissiveIntensity || 0, 0.08);
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
            this.bloomPass.strength = 0.72;
            this.bloomPass.radius = 0.32;
        }
        this.applyRenderModeSceneTuning(idx);
        UI.updateModeDisplay(idx);
        const select = document.getElementById('env-mode');
        if (select) select.value = String(idx);
        const info = document.getElementById('env-mode-info');
        const meta = getRenderMode(idx);
        if (info) info.textContent = `${meta.tagline} — ${meta.limits}`;
        window.Spectate?.updateHud?.();
        GraphicsProfile.syncUi();
    },
    openContextAtScreen: function (clientX, clientY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const objIntersects = this.raycaster.intersectObjects(State.objects);
        if (objIntersects.length > 0) {
            UI.openCtx(clientX, clientY, 'object', objIntersects[0].object);
            return;
        }
        const intersects = this.raycaster.intersectObject(this.groundPlane);
        if (intersects.length > 0) {
            State.ctxTargetPos.copy(intersects[0].point);
            UI.openCtx(clientX, clientY, 'ground');
        }
    },
    onPointerMove: function (e) {
        if (this._holdPointer && Math.hypot(e.clientX - this._holdPointer.x, e.clientY - this._holdPointer.y) > 14) {
            clearTimeout(this._holdPointer.timer);
            this._holdPointer = null;
        }
    },
    onPointerUp: function () {
        if (this._holdPointer) {
            clearTimeout(this._holdPointer.timer);
            this._holdPointer = null;
        }
    },
    onPointerDown: function (e) {
        if (e.button !== 0) { UI.closeCtx(); return; }
        if (TouchControls.enabled && e.pointerType === 'touch') return;

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
        if (this.shaderPass) this.shaderPass.uniforms.time.value = time * 0.001;

        Controls.pollGamepad();
        Controls.applyCameraStick();
        if (Controls.consumeJustPressed('toggleMode')) UI.toggleControlMode();
        if (Controls.consumeJustPressed('pause')) UI.togglePause();
        if (Controls.consumeJustPressed('interact')) UI.openInsert();
        if (Controls.consumeJustPressed('bindingsMenu')) UI.openBindingsModal();
        if (Controls.consumeJustPressed('cameraReset')) Controls.resetCameraBehindPlayer();

        this.tickHostCameraFollow();
        const camFollow = window.Spectate?.shouldFollowHost?.() || window.Spectate?.isFollowingHost?.();

        if (!State.isPaused && !camFollow) {
            if (State.controlMode === 'walk' && PlayerController.spawned) {
                PlayerController.prePhysics(State.keys);
            }
            Physics.update();
            if (State.controlMode === 'walk' && PlayerController.spawned) {
                PlayerController.postPhysics();
            } else {
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

        if (State.introPlaying) {
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
            if (t >= 1) State.introPlaying = false;
        }

        const dt = 0.016;
        State.objects.forEach((obj) => {
            if (obj.userData?.isHuman && !obj.userData?.isPlayer && !obj.userData?.isGltf) {
                HumanMesh.updateIdle(obj, time * 0.001, dt);
            }
        });

        AgentHub.tick(dt);
        MeshLod.update(this.camera);
        TextureHilod.update(this.camera);
        Cinematic.tick();

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
            roughness: 0.42,
            metalness: 0.28,
            envMapIntensity: 0.65,
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
        if (!obj) return;
        if (SimMode.isPlay() && !obj.userData?.isPlayer) {
            UI.status('PLAY mode — cannot delete world objects');
            return;
        }
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
    playCutscene: async function (source, options = {}) {
        return Cinematic.play(source, options);
    },
    stopCutscene: async function () {
        return Cinematic.stop('manual');
    },
    listVideos: async function () {
        return Cinematic.listBundled();
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
            userData: o.userData, color: o.material?.color?.getHex?.() ?? 0xffffff,
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
                const gltfSnapshots = [];
                data.forEach(d => {
                    if (d.type === 'gltf' || d.userData?.type === 'gltf') {
                        gltfSnapshots.push({
                            type: 'gltf',
                            name: d.name,
                            pos: d.pos,
                            rot: d.rot,
                            scl: d.scl,
                            userData: d.userData,
                        });
                        return;
                    }
                    const m = World.createObject(d.type, d.name, d.color, false);
                    if (m) {
                        m.position.copy(d.pos); m.rotation.set(d.rot._x, d.rot._y, d.rot._z);
                        m.scale.copy(d.scl); m.userData = d.userData;
                    }
                });
                TextureBridge.rehydrateScene();
                if (gltfSnapshots.length) GltfImport.spawnSnapshots(gltfSnapshots);
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
        document.getElementById('ctx-insert').onclick = () => { UI.closeCtx(); UI.openInsert(); };
        document.getElementById('ctx-clear').onclick = () => { Actions.dispatch('CLEAR_WORLD'); UI.closeCtx(); };
        document.getElementById('ctx-close').onclick = () => UI.closeCtx();

        document.getElementById('btn-mobile-insert')?.addEventListener('click', () => UI.openInsert());
        document.getElementById('btn-console-toggle')?.addEventListener('click', () => UI.toggleConsoleBar());
        document.getElementById('btn-console-restore')?.addEventListener('click', () => UI.setConsoleBarVisible(true));
        document.getElementById('btn-touch-toggle')?.addEventListener('click', () => UI.toggleTouchControls());
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
        document.getElementById('insert-gltf-btn')?.addEventListener('click', () => UI.insertGltfFromPanel());
        document.getElementById('insert-gltf-manifest-btn')?.addEventListener('click', () => UI.insertGltfFromManifest());
        document.getElementById('import-player-file')?.addEventListener('change', (e) => UI.importPlayerFile(e));

        document.getElementById('btn-copy-link')?.addEventListener('click', () => UI.copySessionLink());
        document.getElementById('btn-host-pause')?.addEventListener('click', () => UI.togglePause());
        document.getElementById('btn-env-toggle')?.addEventListener('click', () => UI.toggleEnvPanel());
        document.getElementById('btn-env-close')?.addEventListener('click', () => UI.setEnvPanelVisible(false));
        document.getElementById('btn-toolbar-more')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.getElementById('toolbar-more-menu');
            menu?.classList.toggle('open');
            if (menu?.classList.contains('open')) this.positionMoreMenu();
        });
        document.addEventListener('click', () => {
            document.getElementById('toolbar-more-menu')?.classList.remove('open');
        });
        window.addEventListener('resize', () => this.positionMoreMenu());
        window.addEventListener('orientationchange', () => setTimeout(() => this.positionMoreMenu(), 200));
        document.getElementById('btn-load-model')?.addEventListener('click', () => UI.loadPlayerModel());

        document.querySelectorAll('.insp-tab').forEach((tab) => {
            tab.addEventListener('click', () => UI.switchInspTab(tab.dataset.inspTab));
        });
        ['insp-name', 'insp-color', 'insp-rough', 'insp-metal', 'insp-emissive', 'insp-emissive-int',
            'insp-physics', 'insp-mass', 'insp-friction', 'insp-restitution', 'insp-sound-freq', 'insp-sound-type',
            'insp-sound-mode', 'insp-sound-clip', 'insp-sound-trigger'
        ].forEach((id) => {
            document.getElementById(id)?.addEventListener('input', () => UI.applyInspectorFromUi());
            document.getElementById(id)?.addEventListener('change', () => {
                if (id === 'insp-sound-mode') UI.syncSoundInspectorMode();
                UI.applyInspectorFromUi();
            });
        });
        document.getElementById('insp-test-sound')?.addEventListener('click', () => UI.testObjectSound());
        document.getElementById('insp-record-sound')?.addEventListener('click', () => {
            const obj = State.selectedObject;
            if (obj) SoundPrompt.offerForObject(obj, obj.userData?.name || 'Object', 'collision');
        });

        SoundPrompt.init();
        SoundLibrary.init().then(() => UI.renderSoundLibrary());
        window.addEventListener('sound-library-change', () => UI.renderSoundLibrary());
        TextureLibrary.init();
        window.addEventListener('texture-library-change', () => {
            if (State.selectedObject) UI.syncTextureInspector(State.selectedObject);
        });
        document.getElementById('insp-texture-albedo')?.addEventListener('click', () => UI.importTextureSlot('albedo'));
        document.getElementById('insp-texture-rough')?.addEventListener('click', () => UI.importTextureSlot('roughness'));
        document.getElementById('insp-texture-metal')?.addEventListener('click', () => UI.importTextureSlot('metalness'));
        document.getElementById('insp-texture-normal')?.addEventListener('click', () => UI.importTextureSlot('normal'));
        document.getElementById('insp-texture-clear')?.addEventListener('click', () => UI.clearTextureMaps());
        document.getElementById('insp-texture-gimp')?.addEventListener('click', () => UI.syncGimpManifest());

        let sfxRecording = false;
        document.getElementById('sfx-record-btn')?.addEventListener('click', async () => {
            try {
                AudioSys.ensureContext();
                await SoundLibrary.startRecording();
                sfxRecording = true;
                document.getElementById('sfx-record-btn').style.display = 'none';
                document.getElementById('sfx-stop-btn').style.display = 'inline-block';
                document.getElementById('sfx-record-status').textContent = 'Recording…';
            } catch (e) {
                UI.status(e.message || 'Mic denied');
            }
        });
        document.getElementById('sfx-stop-btn')?.addEventListener('click', async () => {
            if (!sfxRecording) return;
            const blob = await SoundLibrary.stopRecording();
            sfxRecording = false;
            document.getElementById('sfx-record-btn').style.display = 'inline-block';
            document.getElementById('sfx-stop-btn').style.display = 'none';
            document.getElementById('sfx-record-status').textContent = 'Saved to library';
            const name = document.getElementById('sfx-record-name')?.value?.trim() || `Sound ${Date.now().toString(36).slice(-4)}`;
            await SoundLibrary.saveClip(name, blob, { context: 'library' });
            UI.renderSoundLibrary();
        });
        document.getElementById('btn-reload-skin')?.addEventListener('click', () => UI.reloadPlayerSkin());
        document.getElementById('btn-player-code')?.addEventListener('click', () => UI.openPlayerCodeRef());

        document.getElementById('ctx-edit-inspect').onclick = () => { if (State.selectedObject) UI.selectObject(State.selectedObject); UI.closeCtx(); };
        document.getElementById('ctx-edit-delete').onclick = () => { World.deleteObject(State.selectedObject); UI.closeCtx(); };

        document.getElementById('btn-lock').onclick = () => this.toggleLock();
        document.getElementById('btn-delete').onclick = () => World.deleteObject(State.selectedObject);
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
        document.getElementById('bindings-profile')?.addEventListener('change', (e) => UI.renderBindingsEditor(e.target.value));
        document.getElementById('bindings-reset')?.addEventListener('click', () => UI.resetBindingsProfile());
        document.querySelectorAll('.bindings-device-tab').forEach((tab) => {
            tab.addEventListener('click', () => UI.switchBindingsTab(tab.dataset.bindingsTab));
        });
        document.getElementById('bindings-list')?.addEventListener('click', (e) => {
            const bindBtn = e.target.closest('[data-bind]');
            const clearBtn = e.target.closest('[data-clear-kb]');
            if (bindBtn && !bindBtn.disabled) UI.startKeyboardBinding(bindBtn.dataset.bind);
            if (clearBtn) UI.clearKeyboardBinding(clearBtn.dataset.clearKb);
        });
        document.getElementById('gamepad-bindings-list')?.addEventListener('click', (e) => {
            const bindBtn = e.target.closest('[data-gpad-bind]');
            const clearBtn = e.target.closest('[data-clear-gp]');
            if (bindBtn && !bindBtn.disabled) UI.startGamepadBinding(bindBtn.dataset.gpadBind);
            if (clearBtn) UI.clearGamepadBinding(clearBtn.dataset.clearGp);
        });
        document.getElementById('btn-host-panel')?.addEventListener('click', () => UI.openHostPanel());
        document.getElementById('host-copy-link')?.addEventListener('click', () => UI.copySessionLink());
        document.getElementById('host-panel-close')?.addEventListener('click', () => UI.closeHostPanel());
        document.getElementById('host-panel-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'host-panel-modal') UI.closeHostPanel();
        });
        document.getElementById('host-auto-coding-pause')?.addEventListener('change', (e) => {
            Session.setAutoCodingPause(e.target.checked);
        });
        document.getElementById('host-push-bindings')?.addEventListener('click', () => {
            Controls.saveHostAndBroadcast();
            UI.status('Host keyboard + controller profiles pushed to all players');
        });
        document.getElementById('world-list')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-world-code]');
            if (btn) UI.loadWorldByCode(btn.dataset.worldCode);
        });

        document.getElementById('btn-export-game')?.addEventListener('click', () => {
            document.getElementById('toolbar-more-menu')?.classList.remove('open');
            ExportWizard.open();
        });
        ExportWizard.bindOnce();
        document.getElementById('btn-restart-walkthrough')?.addEventListener('click', () => {
            document.getElementById('toolbar-more-menu')?.classList.remove('open');
            Walkthrough.restart();
        });
        document.getElementById('agent-attach-npc')?.addEventListener('click', () => UI.attachNpcAgent());
        document.getElementById('agent-npc-talk')?.addEventListener('click', () => UI.talkToNpcAgent());
        document.getElementById('agent-dev-suggest')?.addEventListener('click', () => UI.devAgentSuggest());
        document.getElementById('agent-dev-apply')?.addEventListener('click', () => UI.devAgentApply());
        document.getElementById('agent-local-save')?.addEventListener('click', () => UI.saveLocalAgent());
        window.addEventListener('agent-config-change', () => UI.syncAgentPanel());

        UI.syncAgentPanel();

        UI.updateControlMode();
        UI.updateSimMode();
        UI.initViewToggles();
        initPanelDrag();
        SceneDock.init();
        CreativeWatch.init();
    },
    updateModeDisplay: function (idx) {
        const el = document.getElementById('mode-display');
        if (el && Modes[idx]) el.textContent = Modes[idx].name;
    },
    selectObject: function (obj) {
        if (State.selectedObject === obj) return;
        State.selectedObject = obj;
        if (obj.userData?.isPlayer) {
            if (SimMode.isPlay()) SceneDock.openTab('skin');
            else SceneDock.closeTab();
            Engine.transformControl.detach();
            return;
        }
        if (!SimMode.canEditObject(obj)) {
            UI.status('PLAY mode — world locked. Pause to edit objects.');
            Engine.transformControl.detach();
            return;
        }
        SceneDock.openTab('inspect');
        this.loadInspectorFromObject(obj);
        document.getElementById('btn-lock').innerText = obj.userData.locked ? 'LOCKED' : 'UNLOCK';
        if (!obj.userData.locked && SimMode.isEdit()) Engine.transformControl.attach(obj);
        else Engine.transformControl.detach();
    },
    deselectObject: function () {
        State.selectedObject = null;
        Engine.transformControl.detach();
        if (SimMode.isPlay() && SimMode.canEditPlayerSkin()) {
            SceneDock.openTab('skin');
        } else {
            SceneDock.closeTab();
        }
    },
    switchInspTab: function (tab) {
        document.querySelectorAll('.insp-tab').forEach((t) => t.classList.toggle('active', t.dataset.inspTab === tab));
        document.querySelectorAll('.insp-panel').forEach((p) => p.classList.toggle('active', p.dataset.inspPanel === tab));
    },
    loadInspectorFromObject: function (obj) {
        if (!obj) return;
        document.getElementById('insp-name').value = obj.userData.name || '';
        const mat = obj.material;
        if (mat?.color) document.getElementById('insp-color').value = '#' + mat.color.getHexString();
        if (mat) {
            document.getElementById('insp-rough').value = mat.roughness ?? 0.5;
            document.getElementById('insp-metal').value = mat.metalness ?? 0.5;
            document.getElementById('insp-emissive').value = '#' + (mat.emissive?.getHexString?.() || '000000');
            document.getElementById('insp-emissive-int').value = mat.emissiveIntensity ?? 0;
        }
        document.getElementById('insp-physics').checked = !!obj.userData.hasPhysics;
        document.getElementById('insp-mass').value = obj.userData.mass ?? 1;
        document.getElementById('insp-friction').value = obj.userData.friction ?? 0.3;
        document.getElementById('insp-restitution').value = obj.userData.restitution ?? 0.5;
        document.getElementById('insp-sound-freq').value = obj.userData.soundFreq ?? 440;
        document.getElementById('insp-sound-type').value = obj.userData.soundType || 'sine';
        document.getElementById('insp-sound-mode').value = obj.userData.soundMode || 'tone';
        document.getElementById('insp-sound-trigger').value = obj.userData.soundTrigger || 'collision';
        this.populateSoundClipSelect(obj.userData.soundClipId || '');
        this.syncSoundInspectorMode();
        this.syncTextureInspector(obj);
    },
    syncTextureInspector: async function (obj) {
        const status = document.getElementById('insp-texture-status');
        const preview = document.getElementById('insp-texture-preview');
        if (!obj?.material) {
            if (status) status.textContent = 'Select a mesh object to import textures.';
            if (preview) preview.hidden = true;
            return;
        }
        const textures = obj.userData?.textures || {};
        if (status) {
            status.textContent = TextureBridge.formatSlotStatus(
                textures,
                obj.userData?.textureHint,
                obj.userData?.textureHilod?.activeBySlot
            );
        }
        if (preview) {
            const url = await TextureBridge.previewUrlForSlot(textures, 'albedo');
            if (url) {
                preview.src = url;
                preview.hidden = false;
            } else {
                preview.removeAttribute('src');
                preview.hidden = true;
            }
        }
    },
    importTextureSlot: async function (slot) {
        const obj = State.selectedObject;
        if (!obj || !SimMode.canEditObject(obj)) {
            UI.status('Select an object in EDIT mode to import textures');
            return;
        }
        if (!obj.material) {
            UI.status('This object has no material — pick a primitive mesh');
            return;
        }
        try {
            const record = await TextureBridge.pickAndApplyToObject(obj, slot);
            if (!record) return;
            UI.syncTextureInspector(obj);
            UI.status(`${slot} map applied — ${record.name}`);
        } catch (e) {
            UI.status(e.message || 'Texture import failed');
        }
    },
    clearTextureMaps: function () {
        const obj = State.selectedObject;
        if (!obj || !SimMode.canEditObject(obj)) return;
        TextureBridge.clearMaps(obj);
        UI.syncTextureInspector(obj);
        UI.status('Texture maps cleared');
    },
    syncGimpManifest: async function () {
        const obj = State.selectedObject;
        if (!obj || !SimMode.canEditObject(obj)) {
            UI.status('Select an object in EDIT mode — name must match GIMP Object name');
            return;
        }
        if (!obj.material) {
            UI.status('This object has no material — pick a primitive mesh');
            return;
        }
        try {
            const result = await TextureBridge.pickAndApplyGimpManifest(obj);
            if (!result) return;
            UI.syncTextureInspector(obj);
            UI.status(result.message || 'GIMP manifest synced');
        } catch (e) {
            UI.status(e.message || 'GIMP manifest sync failed');
        }
    },
    applyInspectorFromUi: function () {
        const obj = State.selectedObject;
        if (!obj || !SimMode.canEditObject(obj)) return;
        obj.userData.name = document.getElementById('insp-name').value;
        const mat = obj.material;
        if (mat) {
            mat.color.set(document.getElementById('insp-color').value);
            mat.roughness = parseFloat(document.getElementById('insp-rough').value);
            mat.metalness = parseFloat(document.getElementById('insp-metal').value);
            if (!mat.emissive) mat.emissive = new THREE.Color();
            mat.emissive.set(document.getElementById('insp-emissive').value);
            mat.emissiveIntensity = parseFloat(document.getElementById('insp-emissive-int').value);
            mat.needsUpdate = true;
        }
        const wantPhys = document.getElementById('insp-physics').checked;
        obj.userData.mass = parseFloat(document.getElementById('insp-mass').value);
        obj.userData.friction = parseFloat(document.getElementById('insp-friction').value);
        obj.userData.restitution = parseFloat(document.getElementById('insp-restitution').value);
        obj.userData.soundFreq = parseInt(document.getElementById('insp-sound-freq').value, 10);
        obj.userData.soundType = document.getElementById('insp-sound-type').value;
        obj.userData.soundMode = document.getElementById('insp-sound-mode').value;
        obj.userData.soundTrigger = document.getElementById('insp-sound-trigger').value;
        obj.userData.soundClipId = document.getElementById('insp-sound-clip').value || null;
        UI.syncObjectPhysics(obj, wantPhys);
    },
    syncObjectPhysics: function (obj, enabled) {
        const entry = State.physicsObjects.find((p) => p.mesh === obj);
        if (enabled && !obj.userData.hasPhysics) {
            const body = obj.userData.type === 'gltf'
                ? Physics.addBodyFromObject(obj, obj.userData.mass ?? 1)
                : Physics.addBody(obj, obj.userData.type || 'cube');
            body.mass = obj.userData.mass ?? 1;
            State.physicsObjects.push({ mesh: obj, body });
            obj.userData.hasPhysics = true;
        } else if (!enabled && entry) {
            Physics.world.removeBody(entry.body);
            State.physicsObjects = State.physicsObjects.filter((p) => p.mesh !== obj);
            obj.userData.hasPhysics = false;
        } else if (entry?.body) {
            entry.body.mass = obj.userData.mass ?? entry.body.mass;
        }
    },
    testObjectSound: function () {
        const obj = State.selectedObject;
        if (!obj) return;
        AudioSys.playObjectSound(obj, 'test');
    },
    populateSoundClipSelect: function (selectedId = '') {
        const sel = document.getElementById('insp-sound-clip');
        if (!sel) return;
        const clips = SoundLibrary.list();
        sel.innerHTML = '<option value="">— pick recording —</option>'
            + clips.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
        if (selectedId) sel.value = selectedId;
    },
    syncSoundInspectorMode: function () {
        const mode = document.getElementById('insp-sound-mode')?.value || 'tone';
        document.querySelectorAll('.insp-sound-tone').forEach((el) => {
            el.style.display = mode === 'tone' ? '' : 'none';
        });
        document.querySelectorAll('.insp-sound-clip').forEach((el) => {
            el.style.display = mode === 'clip' ? '' : 'none';
        });
        if (mode === 'clip') this.populateSoundClipSelect(document.getElementById('insp-sound-clip')?.value);
    },
    renderSoundLibrary: function () {
        const list = document.getElementById('sfx-library-list');
        if (!list) return;
        const clips = SoundLibrary.list();
        this.populateSoundClipSelect(document.getElementById('insp-sound-clip')?.value);
        if (!clips.length) {
            list.innerHTML = '<p class="insert-hint" style="margin:0;">No sounds yet — record one above.</p>';
            return;
        }
        list.innerHTML = clips.map((c) => `
            <div class="sfx-item" data-sfx-id="${c.id}">
                <span class="sfx-item-name">${c.name}</span>
                <button type="button" class="btn-sm sfx-play" data-sfx-play="${c.id}">▶</button>
                <button type="button" class="btn-sm sfx-del" data-sfx-del="${c.id}">✕</button>
            </div>
        `).join('');
        list.querySelectorAll('[data-sfx-play]').forEach((btn) => {
            btn.addEventListener('click', () => AudioSys.playClip(btn.dataset.sfxPlay));
        });
        list.querySelectorAll('[data-sfx-del]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                await SoundLibrary.deleteClip(btn.dataset.sfxDel);
                UI.renderSoundLibrary();
            });
        });
    },
    positionMoreMenu: function () {
        const menu = document.getElementById('toolbar-more-menu');
        const trigger = document.getElementById('btn-toolbar-more');
        if (!menu?.classList.contains('open') || !trigger || window.innerWidth >= 900) return;
        const r = trigger.getBoundingClientRect();
        menu.style.top = `${r.bottom + 4}px`;
        menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))}px`;
    },
    reloadPlayerSkin: function () {
        if (!PlayerController.spawned) { this.status('Spawn a player first'); return; }
        if (PlayerController.group?.userData?.isGltf) {
            this.status('GLTF model active — colors apply to procedural mesh only');
            return;
        }
        const bodyHex = parseInt(document.getElementById('skin-body-color').value.replace('#', ''), 16);
        const headHex = parseInt(document.getElementById('skin-head-color').value.replace('#', ''), 16);
        const rough = parseFloat(document.getElementById('skin-rough').value);
        PlayerController.applySkin({ bodyColor: bodyHex, headColor: headHex, roughness: rough });
        this.status('Skin reloaded');
    },
    openPlayerCodeRef: function () {
        document.querySelector('[data-target="view-compiler"]')?.click();
        setTimeout(() => {
            window.Compiler?.loadReference?.('players', 'player_skin_reload');
        }, 100);
    },
    updateSimMode: function () {
        const badge = document.getElementById('sim-mode-badge');
        const layer = document.getElementById('ui-layer');
        const edit = SimMode.isEdit();
        if (badge) {
            badge.textContent = edit ? 'EDIT' : 'PLAY';
            badge.classList.toggle('edit', edit);
            badge.classList.toggle('play', !edit);
        }
        if (layer) layer.classList.toggle('play-mode', !edit);
        document.body.classList.toggle('play-mode', !edit);
        if (!edit) {
            Engine.transformControl.detach();
            SceneDock.closeTab();
            if (SimMode.canEditPlayerSkin()) SceneDock.openTab('skin');
        } else {
            SceneDock.closeTab();
        }
    },
    initViewToggles: function () {
        const mobile = window.innerWidth < 900;
        const consoleVisible = ViewPrefs.get('consoleVisible', !mobile);
        this.setConsoleBarVisible(consoleVisible, false);
        this.updateTouchToggle();
    },
    exportGamePackage: function () {
        ExportWizard.open();
    },
    syncAgentPanel: function () {
        const npcCfg = AgentHub.getConfig('grok_npc');
        const localCfg = AgentHub.getConfig('local');
        const persona = document.getElementById('agent-npc-persona');
        const interval = document.getElementById('agent-local-interval');
        const script = document.getElementById('agent-local-script');
        if (persona) persona.value = npcCfg.persona || '';
        if (interval) interval.value = localCfg.intervalMs || 0;
        if (script) script.value = localCfg.script || '';
    },
    attachNpcAgent: function () {
        const persona = document.getElementById('agent-npc-persona')?.value?.trim();
        if (!AgentHub.attachNpcAgent(persona)) {
            this.status('Select an NPC (not player) in EDIT → inspect first');
            return;
        }
        SceneDock.openTab('agents');
        this.status('Grok NPC agent attached — use NPC TALK');
    },
    talkToNpcAgent: async function () {
        const npc = AgentHub.getActiveNpc() || State.objects.find((o) => o.userData?.agentType === 'grok_npc');
        if (!npc) {
            this.status('Attach agent to an NPC first');
            return;
        }
        const msg = document.getElementById('agent-npc-input')?.value?.trim() || 'Hello';
        const replyEl = document.getElementById('agent-npc-reply');
        if (replyEl) replyEl.textContent = 'Thinking...';
        try {
            const { line } = await NpcAgent.talk(npc, msg);
            if (replyEl) replyEl.textContent = `${npc.userData.name}: ${line}`;
            this.status(`${npc.userData.name} replied`);
        } catch (e) {
            if (replyEl) replyEl.textContent = '';
            this.status(e.message || 'NPC talk failed');
        }
    },
    devAgentSuggest: async function () {
        try {
            const code = await DevAgent.suggestFromCompiler();
            const out = document.getElementById('comp-output');
            if (out) out.value = code;
            document.querySelector('[data-target="view-compiler"]')?.click();
            this.status('Grok Dev suggestion in Compiler output');
        } catch (e) {
            this.status(e.message || 'Dev agent failed');
        }
    },
    devAgentApply: async function () {
        try {
            await DevAgent.applySuggestion();
            document.querySelector('[data-target="view-compiler"]')?.click();
            this.status('Grok Dev applied to Compiler');
        } catch (e) {
            this.status(e.message || 'Dev agent apply failed');
        }
    },
    saveLocalAgent: function () {
        const script = document.getElementById('agent-local-script')?.value || '';
        const intervalMs = parseInt(document.getElementById('agent-local-interval')?.value, 10) || 0;
        AgentHub.setConfig('local', { enabled: intervalMs > 0 && script.trim(), script, intervalMs });
        this.status(intervalMs > 0 ? 'Local agent saved — running on interval' : 'Local agent disabled');
    },

    setConsoleBarVisible: function (visible, persist = true) {
        document.body.classList.toggle('console-visible', visible);
        document.body.classList.toggle('console-hidden', !visible);
        const btn = document.getElementById('btn-console-toggle');
        if (btn) {
            btn.classList.toggle('active', visible);
            btn.title = visible ? 'Hide command console' : 'Show command console';
        }
        if (persist) ViewPrefs.set('consoleVisible', visible);
    },
    toggleConsoleBar: function () {
        this.setConsoleBarVisible(document.body.classList.contains('console-hidden'));
    },
    toggleTouchControls: function () {
        TouchControls.toggle();
    },
    updateTouchToggle: function () {
        const btn = document.getElementById('btn-touch-toggle');
        if (!btn) return;
        const on = TouchControls.enabled;
        btn.textContent = on ? 'TOUCH' : 'TOUCH';
        btn.classList.toggle('active', on);
        btn.title = on ? 'Hide on-screen touch controls' : 'Show on-screen touch controls';
    },
    toggleEnvPanel: function () {
        SceneDock.toggleTab('env');
        document.getElementById('env-panel')?.classList.toggle('mobile-open', true);
    },
    setEnvPanelVisible: function (visible) {
        if (visible) SceneDock.openTab('env');
        else SceneDock.closeTab();
    },
    loadPlayerModel: async function () {
        const url = document.getElementById('skin-model-url')?.value?.trim();
        if (!url) {
            this.status('Enter a GLTF/GLB URL first');
            return;
        }
        if (!PlayerController.spawned) {
            this.status('Spawn as player first');
            return;
        }
        try {
            await PlayerController.applyModelUrl(url);
            this.status('GLTF model loaded');
            if (PlayerController.group) {
                setTimeout(() => SoundPrompt.offerForObject(PlayerController.group, 'Avatar / emote', 'emote'), 500);
            }
        } catch (e) {
            this.status('Model load failed: ' + e.message);
        }
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
        document.getElementById('json-modal')?.classList.add('open');
        ensurePanelVisible('#json-modal');
        document.getElementById('json-editor').value = JSON.stringify(State.selectedObject.userData, null, 2);
    },
    applyJson: function () { try { State.selectedObject.userData = JSON.parse(document.getElementById('json-editor').value); this.closeModal(); this.selectObject(State.selectedObject); } catch (e) { alert("Invalid JSON"); } },
    closeModal: function () { document.getElementById('json-modal')?.classList.remove('open'); },
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
        ensurePanelVisible('#insert-sheet');
    },
    closeInsert: function () {
        document.getElementById('insert-modal')?.classList.remove('open');
    },
    switchInsertTab: function (tab) {
        document.querySelectorAll('.insert-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
        document.querySelectorAll('.insert-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === tab));
    },
    insertGltfFromPanel: async function () {
        const name = document.getElementById('insert-gltf-name')?.value?.trim() || 'GLTF Model';
        const usePhysics = !!document.getElementById('insert-gltf-physics')?.checked;
        const url = document.getElementById('insert-gltf-url')?.value?.trim();
        const file = document.getElementById('insert-gltf-file')?.files?.[0];
        const pos = World.getCursorPos();

        if (file) {
            try {
                await GltfImport.insertAtCursor({ file, name, usePhysics, pos: null });
                UI.closeInsert();
                UI.status(`Inserted GLTF: ${name}`);
            } catch (e) {
                UI.status(e.message || 'GLTF insert failed');
            }
            return;
        }

        if (url) {
            Actions.dispatch('INSERT_GLTF', { url, name, usePhysics, pos });
            UI.closeInsert();
            return;
        }

        if (ThresholdShell.isNative) {
            const path = await ThresholdShell.pickFile([
                { name: 'GLTF Models', extensions: ['glb', 'gltf'] },
            ]);
            if (!path) return;
            Actions.dispatch('INSERT_GLTF', { path, name, usePhysics, pos });
            UI.closeInsert();
            return;
        }

        UI.status('Pick a .glb file, enter a URL, or use BLENDER MANIFEST');
    },
    insertGltfFromManifest: async function () {
        const name = document.getElementById('insert-gltf-name')?.value?.trim();
        if (!name) {
            UI.status('Enter Object name matching Blender export');
            return;
        }
        try {
            await GltfImport.pickAndInsertFromManifest(name);
            UI.closeInsert();
            UI.status(`Inserted from Blender manifest: ${name}`);
        } catch (e) {
            UI.status(e.message || 'Blender manifest insert failed');
        }
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
        if (hint && Controls) {
            hint.textContent = Controls.getHint();
            hint.title = 'Right-click or hold for scene menu';
        }
    },
    updateGamepadStatus: function () {
        const el = document.getElementById('gamepad-status');
        if (!el) return;
        el.textContent = Controls.gamepad
            ? `Controller: ${Controls.gamepadName.slice(0, 40)}`
            : 'Controller: none (plug in gamepad)';
    },
    togglePause: function (reason) {
        if (Network.mode === 'guest') {
            this.status('Only the host can pause');
            return;
        }
        const paused = !State.isPaused;
        const pauseReason = paused ? (reason || 'Paused') : '';
        Actions.dispatch('PAUSE', { paused, reason: pauseReason });
        State.isPaused = paused;
        Session.isPaused = paused;
        Session.pauseReason = pauseReason;
        Session.updateUi();
        this.status(paused ? `Paused${pauseReason ? `: ${pauseReason}` : ''}` : 'Scene resumed');
    },
    setCodingPause: function (on) {
        if (!Permissions.canPause() || !Session.autoCodingPause) return;
        if (on) {
            if (!State.isPaused) this.togglePause('Host editing code');
        } else if (Session.pauseReason === 'Host editing code') {
            this.togglePause('');
        }
    },
    openHostPanel: function () {
        this.renderHostPanel();
        document.getElementById('host-panel-modal')?.classList.add('open');
        ensurePanelVisible('#host-panel-sheet');
    },
    closeHostPanel: function () {
        document.getElementById('host-panel-modal')?.classList.remove('open');
    },
    renderHostPanel: function () {
        const list = document.getElementById('host-player-list');
        const roleEl = document.getElementById('host-panel-role');
        const panelModal = document.getElementById('host-panel-modal');
        const linkEl = document.getElementById('session-share-link');
        if (!list) return;

        const isHost = Network.mode === 'host';
        panelModal?.classList.toggle('host-view', isHost);
        if (linkEl) linkEl.value = isHost ? Network.getShareUrl() : '';
        if (roleEl) {
            if (Network.mode === 'spectate') roleEl.textContent = 'You are SPECTATING — read-only orbit camera';
            else if (isHost) roleEl.textContent = 'You are HOST — manage players & permissions';
            else roleEl.textContent = Session.isAdmin(Session.playerKey)
                ? 'You are GUEST (Admin)' : 'You are GUEST — personal bindings only';
        }

        const players = isHost ? Network.getPlayerList() : [
            { key: Session.playerKey, name: Session.playerName, admin: Session.isAdmin(Session.playerKey), self: true }
        ];

        list.innerHTML = players.map((p) => `
            <div class="host-player-row">
                <span>${p.name} <code>${p.key}</code>${p.spectator ? ' 👁' : ''}${p.self ? ' (you)' : ''}</span>
                ${isHost && !p.self ? `
                    <label class="host-admin-toggle">
                        <input type="checkbox" data-admin-key="${p.key}" ${p.admin ? 'checked' : ''}> Admin
                    </label>
                ` : `<span class="host-badge">${p.admin ? 'Admin' : 'Player'}</span>`}
            </div>
        `).join('');

        list.querySelectorAll('[data-admin-key]').forEach((cb) => {
            cb.onchange = () => Network.setPlayerAdmin(cb.dataset.adminKey, cb.checked);
        });

        const codingCb = document.getElementById('host-auto-coding-pause');
        if (codingCb) codingCb.checked = Session.autoCodingPause;
    },
    openBindingsModal: function () {
        const profile = Controls.getProfile();
        const select = document.getElementById('bindings-profile');
        if (select) select.value = profile;
        this.renderBindingsEditor(profile);
        this.updateGamepadStatus();
        document.getElementById('bindings-modal')?.classList.add('open');
        ensurePanelVisible('#bindings-sheet');
    },
    closeBindingsModal: function () {
        Controls._rebind = null;
        Controls._rebindGamepad = null;
        document.getElementById('bindings-modal')?.classList.remove('open');
        this.updateControlsHint();
    },
    switchBindingsTab: function (tab) {
        document.querySelectorAll('.bindings-device-tab').forEach((t) => {
            t.classList.toggle('active', t.dataset.bindingsTab === tab);
        });
        document.getElementById('bindings-panel-keyboard')?.classList.toggle('active', tab === 'keyboard');
        document.getElementById('bindings-panel-gamepad')?.classList.toggle('active', tab === 'gamepad');
    },
    renderBindingsEditor: function (profile) {
        const p = profile || document.getElementById('bindings-profile')?.value || Controls.getProfile();
        Controls.renderEditor(p);
    },
    resetBindingsProfile: function () {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        Controls.resetProfile(profile);
        this.renderBindingsEditor(profile);
        this.status(`${profile === 'host' ? 'Host' : 'Guest'} keyboard + controller reset`);
    },
    startKeyboardBinding: function (action) {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        const btn = document.querySelector(`[data-bind="${action}"]`);
        if (btn) btn.textContent = 'Press key… (Esc cancel)';
        Controls.startKeyboardRebind(profile, action, (ok) => {
            this.renderBindingsEditor(profile);
            if (ok) this.status(`Key bound: ${CONTROL_ACTIONS[action]?.label || action}`);
        });
    },
    startGamepadBinding: function (action) {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        const btn = document.querySelector(`[data-gpad-bind="${action}"]`);
        if (btn) btn.textContent = 'Press button… (Esc cancel)';
        Controls.startGamepadRebind(profile, action, (ok, idx) => {
            this.renderBindingsEditor(profile);
            if (ok) this.status(`Controller bound: ${Controls.formatGamepadButton(idx)} → ${CONTROL_ACTIONS[action]?.label || action}`);
            else if (ok === false) this.renderBindingsEditor(profile);
        });
    },
    clearKeyboardBinding: function (action) {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        Controls.clearKeyboardBinding(profile, action);
        this.renderBindingsEditor(profile);
    },
    clearGamepadBinding: function (action) {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        Controls.clearGamepadBinding(profile, action);
        this.renderBindingsEditor(profile);
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
        ensurePanelVisible('#world-sheet');
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
        import('../shared/steamBridge.js').then(({ SteamBridge }) => {
            SteamBridge.unlock('WORLD_SAVED');
        }).catch(() => {});
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