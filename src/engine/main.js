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
        getMode: () => State.renderMode, // 0-4
        isHyper: () => State.renderMode === 4,
        randomColor: () => Math.random() * 0xffffff
    };

    window.addEventListener('theme-change', () => {
        State.darkMode = !document.body.classList.contains('light-mode');
        Engine.updateBackground();
    });

    Physics.init(); // NEW: Start Physics
    Engine.init();
    UI.init();

    // Create a floor for physics
    Physics.createFloor();

    // Spawn a physics cube
    World.createObject('cube', 'physics_box', 0xff3366, true);
}

// --- GLOBAL STATE ---
const State = {
    selectedObject: null,
    audioEnabled: false,
    darkMode: true,
    gridVisible: true,
    renderMode: 4,
    objects: [], // Visual Meshes
    physicsObjects: [], // { mesh: THREE.Mesh, body: CANNON.Body }
    keys: {},
    clipboardAllowed: false,
    ctxTargetPos: new THREE.Vector3(),
    isRecording: false
};

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
        const dir = new THREE.DirectionalLight(0xffffff, 2.0);
        dir.position.set(10, 20, 10);
        dir.castShadow = true; // SHADOWS!
        dir.shadow.mapSize.width = 2048;
        dir.shadow.mapSize.height = 2048;
        this.scene.add(dir);
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
        this.setRenderMode(4); // Default to Hyper/Compat
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('keydown', (e) => {
            State.keys[e.code] = true;
            if (e.code === 'Delete') World.deleteObject(State.selectedObject);
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
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        // 1. UNREAL BLOOM (The Glow)
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        this.bloomPass.enabled = false; // Off by default until Hyper mode
        this.composer.addPass(this.bloomPass);
        // 2. THRESHOLD SHADER (The Retro)
        const ThresholdShader = {
            uniforms: { "tDiffuse": { value: null }, "mode": { value: 0 }, "time": { value: 0 } },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `
                uniform sampler2D tDiffuse; uniform int mode; uniform float time; varying vec2 vUv;
                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                   
                    if (mode == 4) { // HYPER MODE (Passthrough)
                        gl_FragColor = texel;
                        return;
                    }
                   
                    float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
                    vec3 outColor;
                    if (mode == 0) { // 5-BAND
                        float q = 0.0; if (luma>0.8) q=1.0; else if (luma>0.6) q=0.75; else if (luma>0.4) q=0.5; else if (luma>0.2) q=0.25;
                        outColor = vec3(q);
                    }
                    else if (mode == 1) { // 1-BIT
                        outColor = (luma > 0.4) ? vec3(1.0) : vec3(0.0);
                    }
                    else if (mode == 2) { // TERMINAL
                        float q = (luma > 0.5) ? 1.0 : ((luma > 0.2) ? 0.3 : 0.0); outColor = vec3(0.0, q, 0.0);
                        if (mod(gl_FragCoord.y, 4.0) < 2.0) outColor *= 0.8;
                    }
                    else if (mode == 3) { // SMPTE
                        outColor = floor(texel.rgb * 4.0) / 4.0;
                    }
                    gl_FragColor = vec4(outColor, 1.0);
                }
            `
        };
        this.shaderPass = new ShaderPass(ThresholdShader);
        this.composer.addPass(this.shaderPass);
    },
    setRenderMode: function (idx) {
        State.renderMode = idx;
        this.shaderPass.uniforms.mode.value = idx;
        // Enable Bloom only in HYPER mode (4)
        if (idx === 4) {
            this.bloomPass.enabled = true;
            this.bloomPass.strength = 1.5;
            this.bloomPass.radius = 0.5;
        } else {
            this.bloomPass.enabled = false;
        }
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
    },
    animate: function (time) {
        requestAnimationFrame((t) => this.animate(t));
        Physics.update(); // Step Physics
        if (this.shaderPass) this.shaderPass.uniforms.time.value = time * 0.001;
        // Camera Logic (OrbitControls handles mouse, we handle keys)
        const speed = 0.2;
        const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
        const rgt = new THREE.Vector3(); rgt.crossVectors(fwd, this.camera.up).normalize();
        if (State.keys['KeyW']) { this.camera.position.addScaledVector(fwd, speed); this.controls.target.addScaledVector(fwd, speed); }
        if (State.keys['KeyS']) { this.camera.position.addScaledVector(fwd, -speed); this.controls.target.addScaledVector(fwd, -speed); }
        if (State.keys['KeyA']) { this.camera.position.addScaledVector(rgt, -speed); this.controls.target.addScaledVector(rgt, -speed); }
        if (State.keys['KeyD']) { this.camera.position.addScaledVector(rgt, speed); this.controls.target.addScaledVector(rgt, speed); }
        if (State.keys['KeyQ']) { this.camera.position.y += speed; this.controls.target.y += speed; }
        if (State.keys['KeyE']) { this.camera.position.y -= speed; this.controls.target.y -= speed; }
        this.controls.update();
        // Visual Rotation (Only for non-physics objects or purely visual effect)
        State.objects.forEach(obj => {
            if (obj.userData.isRotating && !obj.userData.locked && !obj.userData.hasPhysics) obj.rotation.y += 0.02;
        });
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
        // Spawn with physics by default on right click
        const mesh = this.createObject(type, type, Math.random() * 0xffffff, true);
        if (mesh) {
            // Need to update physics body position, not just mesh
            const body = State.physicsObjects.find(o => o.mesh === mesh).body;
            body.position.set(State.ctxTargetPos.x, State.ctxTargetPos.y + 2, State.ctxTargetPos.z);
            body.velocity.set(0, 0, 0);
        }
        UI.closeCtx();
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
    clearWorld: function () {
        // Clear Physics
        State.physicsObjects.forEach(p => Physics.world.removeBody(p.body));
        State.physicsObjects = [];
        State.objects.forEach(o => Engine.scene.remove(o));
        State.objects = [];
        Engine.transformControl.detach();
        UI.deselectObject();
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

        document.getElementById('ctx-spawn-cube').onclick = () => World.spawnAtCursor('cube');
        document.getElementById('ctx-spawn-sphere').onclick = () => World.spawnAtCursor('sphere');
        document.getElementById('ctx-spawn-cone').onclick = () => World.spawnAtCursor('cone');
        document.getElementById('ctx-spawn-torus').onclick = () => World.spawnAtCursor('torus');
        document.getElementById('ctx-record').onclick = () => Recorder.toggle();
        document.getElementById('ctx-close').onclick = () => UI.closeCtx();

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

        // Additional UI handlers from your snippet
        document.getElementById('btn-mode').onclick = () => {
            const next = (State.renderMode + 1) % Modes.length;
            Engine.setRenderMode(next);
            document.getElementById('mode-display').innerText = `RENDER: ${Modes[next].name}`;
        };
        document.getElementById('btn-grid').onclick = () => {
            const vis = Engine.toggleGrid();
            document.getElementById('btn-grid').innerText = vis ? "GRID: ON" : "GRID: OFF";
        };
        document.getElementById('btn-save').onclick = () => IO.exportScene();
        document.getElementById('btn-load').onclick = () => IO.importScene();
        document.getElementById('file-input').addEventListener('change', (e) => IO.handleFileSelect(e));
        document.getElementById('btn-audio').onclick = () => AudioSys.toggle();
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
        const spawnGroup = document.getElementById('ctx-group-spawn');
        const editGroup = document.getElementById('ctx-group-edit');
        menu.style.display = 'flex'; menu.style.left = x + 'px'; menu.style.top = y + 'px';
        if (contextType === 'object' && targetObj) {
            State.selectedObject = targetObj;
            if (header) header.innerText = "EDIT: " + (targetObj.userData.name || "Object");
            spawnGroup.style.display = 'none'; editGroup.style.display = 'flex'; editGroup.style.flexDirection = 'column';
        } else {
            if (header) header.innerText = "SPAWN NEW (PHYSICS)";
            spawnGroup.style.display = 'flex'; spawnGroup.style.flexDirection = 'column'; editGroup.style.display = 'none';
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
        if (raw.toLowerCase() === 'allow pasting') { State.clipboardAllowed = true; input.value = ''; this.status("Pasting Allowed"); return; }
        if (!State.clipboardAllowed && raw.length > 50) { this.status("Type 'allow pasting' first."); return; }
        try { const result = eval(raw); this.status("Executed"); input.classList.add('cmd-success'); setTimeout(() => input.classList.remove('cmd-success'), 300); input.value = ''; }
        catch (e) { console.error(e); this.status("Error"); input.classList.add('cmd-error'); setTimeout(() => input.classList.remove('cmd-error'), 300); }
    }
};