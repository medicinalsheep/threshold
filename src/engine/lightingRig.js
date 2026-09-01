/**
 * Photoreal key / fill / rim + IBL + cheap contact shadows.
 *
 * Look target: cinematic 3-point lighting (key/fill/rim, bounce, skin/fabric
 * that is not plastic). Engine lighting - not NVIDIA DLSS / neural filters.
 *
 * Heavy extras (rim, contact shadows, larger shadow maps, stronger IBL) are
 * gated to Realistic / Ultra graphics tiers so Lite / Mobile stay cheap.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const TIER_LIGHTING = {
    compatibility: {
        id: 'compatibility',
        contactShadows: false,
        rim: false,
        fillDir: false,
        iblMul: 0.55,
        envBlur: 0.1,
        shadowMapSize: 1024,
        shadowRadius: 2.4,
        shadowHalf: 16,
        exposure: 0.88,
        ambient: 0.34,
        keyMul: 0.82,
        fillMul: 0,
        rimMul: 0,
        contactRes: 0,
        contactSize: 0,
    },
    balanced: {
        id: 'balanced',
        contactShadows: false,
        rim: false,
        fillDir: true,
        iblMul: 0.82,
        envBlur: 0.08,
        shadowMapSize: 2048,
        shadowRadius: 1.5,
        shadowHalf: 20,
        exposure: 0.96,
        ambient: 0.22,
        keyMul: 0.95,
        fillMul: 0.9,
        rimMul: 0,
        contactRes: 0,
        contactSize: 0,
    },
    realistic: {
        id: 'realistic',
        contactShadows: true,
        rim: true,
        fillDir: true,
        iblMul: 1.18,
        envBlur: 0.06,
        shadowMapSize: 2048,
        shadowRadius: 0.65,
        shadowHalf: 26,
        exposure: 1.06,
        ambient: 0.12,
        keyMul: 1.08,
        fillMul: 1,
        rimMul: 1,
        contactRes: 512,
        contactSize: 18,
    },
    ultra: {
        id: 'ultra',
        contactShadows: true,
        rim: true,
        fillDir: true,
        iblMul: 1.32,
        envBlur: 0.05,
        shadowMapSize: 4096,
        shadowRadius: 0.38,
        shadowHalf: 28,
        exposure: 1.1,
        ambient: 0.1,
        keyMul: 1.12,
        fillMul: 1.08,
        rimMul: 1.1,
        contactRes: 1024,
        contactSize: 20,
    },
};

/** Lighting-preset look. Intensities are base; tier key/fill/rim mul scale them. */
export const PRESET_LOOK = {
    terminal: {
        keyIntensity: 0.9,
        keyColor: 0xc8d4e0,
        fillIntensity: 0.22,
        fillColor: 0x8aa0b8,
        rimIntensity: 0.16,
        rimColor: 0xb8c4d4,
        hemiIntensity: 0.22,
        hemiSky: 0x6a7888,
        hemiGround: 0x0c0e10,
        ambient: 0.26,
        exposure: 0.84,
        iblMul: 0.55,
    },
    day: {
        keyIntensity: 2.2,
        keyColor: 0xfff1dc,
        fillIntensity: 0.74,
        fillColor: 0xb7c9e4,
        rimIntensity: 0.88,
        rimColor: 0xe8f2ff,
        hemiIntensity: 0.5,
        hemiSky: 0x9ec8f0,
        hemiGround: 0x3d2e1c,
        ambient: 0.1,
        exposure: 1.08,
        iblMul: 1.22,
    },
    soft: {
        keyIntensity: 1.38,
        keyColor: 0xffd4a8,
        fillIntensity: 0.72,
        fillColor: 0xffe8d0,
        rimIntensity: 0.95,
        rimColor: 0xffc8a0,
        hemiIntensity: 0.5,
        hemiSky: 0xffe8d0,
        hemiGround: 0x2a2418,
        ambient: 0.16,
        exposure: 1.02,
        iblMul: 1.08,
    },
    night: {
        keyIntensity: 0.3,
        keyColor: 0x8899bb,
        fillIntensity: 0.34,
        fillColor: 0x4a5a78,
        rimIntensity: 0.58,
        rimColor: 0xa8c0e8,
        hemiIntensity: 0.3,
        hemiSky: 0x1a2840,
        hemiGround: 0x0a0c10,
        ambient: 0.14,
        exposure: 0.92,
        iblMul: 0.72,
    },
};

function getTierId() {
    const id = window.State?.graphicsTier || 'realistic';
    if (id === 'custom') return 'realistic';
    return TIER_LIGHTING[id] ? id : 'realistic';
}

function getTier() {
    return TIER_LIGHTING[getTierId()] || TIER_LIGHTING.realistic;
}

function getPresetId() {
    return window.State?.env?.lightingPreset || 'terminal';
}

function getPresetLook() {
    return PRESET_LOOK[getPresetId()] || PRESET_LOOK.terminal;
}

const _follow = new THREE.Vector3();

export const LightingRig = {
    ambLight: null,
    fillLight: null,
    rimLight: null,
    contact: null,
    engine: null,
    env: null,
    _envBlur: null,
    _frame: 0,
    _baseEnv: new WeakMap(),

    init(Engine, Environment) {
        this.engine = Engine;
        this.env = Environment;

        let amb = Environment.ambientLight || Environment.ambLight;
        if (!amb) {
            Engine.scene.traverse((o) => {
                if (o.isAmbientLight) amb = o;
            });
        }
        if (!amb) {
            amb = new THREE.AmbientLight(0x3a3d42, 0.12);
            Engine.scene.add(amb);
        }
        this.ambLight = amb;
        Environment.ambLight = amb;
        Environment.ambientLight = amb;

        const sun = Environment.sunLight;
        if (sun) {
            this._setupSunShadow(sun, getTier());
            if (sun.target && !sun.target.parent) Engine.scene.add(sun.target);
        }

        if (!this.fillLight) {
            this.fillLight = new THREE.DirectionalLight(0xb7c9e4, 0.5);
            this.fillLight.name = 'threshold-fill';
            this.fillLight.castShadow = false;
            Engine.scene.add(this.fillLight);
            Environment.fillLight = this.fillLight;
        }
        if (!this.rimLight) {
            this.rimLight = new THREE.DirectionalLight(0xe8f2ff, 0.4);
            this.rimLight.name = 'threshold-rim';
            this.rimLight.castShadow = false;
            Engine.scene.add(this.rimLight);
            Environment.rimLight = this.rimLight;
        }

        if (Engine.renderer) {
            Engine.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            if (Engine.renderer.outputColorSpace != null) {
                Engine.renderer.outputColorSpace = THREE.SRGBColorSpace;
            }
        }

        this.applyQuality(getTierId(), { silent: true });
        this.applyLook(getPresetId(), { silent: true });
        window.LightingRig = this;
        return this;
    },

    _setupSunShadow(sun, tier) {
        const half = tier.shadowHalf || 24;
        sun.castShadow = true;
        sun.shadow.mapSize.set(tier.shadowMapSize, tier.shadowMapSize);
        sun.shadow.radius = tier.shadowRadius;
        sun.shadow.bias = -0.00025;
        sun.shadow.normalBias = 0.035;
        const cam = sun.shadow.camera;
        cam.left = -half;
        cam.right = half;
        cam.top = half;
        cam.bottom = -half;
        cam.near = 0.5;
        cam.far = 120;
        cam.updateProjectionMatrix();
        if (sun.shadow.map) {
            sun.shadow.map.dispose();
            sun.shadow.map = null;
        }
    },

    setupImageBasedLighting(Engine, blurOverride) {
        const host = Engine || this.engine || window.Engine;
        if (!host?.renderer) return;
        const tier = getTier();
        const blur = blurOverride != null ? blurOverride : tier.envBlur;
        if (this._envBlur === blur && host._envMap) {
            host.scene.environment = host._envMap;
            return;
        }
        if (host._envMap) {
            host._envMap.dispose?.();
            host._envMap = null;
        }
        const pmrem = new THREE.PMREMGenerator(host.renderer);
        pmrem.compileEquirectangularShader();
        host._envMap = pmrem.fromScene(new RoomEnvironment(), blur).texture;
        host.scene.environment = host._envMap;
        pmrem.dispose();
        this._envBlur = blur;
        this._applyEnvMapIntensity();
    },

    _rememberBaseEnv(mat) {
        if (!mat?.isMeshStandardMaterial && !mat?.isMeshPhysicalMaterial) return;
        if (!this._baseEnv.has(mat)) {
            const v = mat.userData?.baseEnvMapIntensity;
            this._baseEnv.set(mat, v != null ? v : (mat.envMapIntensity ?? 0.5));
        }
    },

    _applyEnvMapIntensity() {
        const Engine = this.engine || window.Engine;
        const look = getPresetLook();
        const tier = getTier();
        const mul = look.iblMul * tier.iblMul;
        const applyMat = (mat) => {
            if (!mat) return;
            const list = Array.isArray(mat) ? mat : [mat];
            for (const m of list) {
                if (!m?.isMeshStandardMaterial && !m?.isMeshPhysicalMaterial) continue;
                this._rememberBaseEnv(m);
                const base = this._baseEnv.get(m);
                m.envMapIntensity = Math.min(1.85, base * mul);
            }
        };
        Engine?.scene?.traverse((obj) => {
            if (obj.isMesh || obj.isSkinnedMesh) applyMat(obj.material);
        });
    },

    applyQuality(tierId, opts = {}) {
        const id = tierId === 'custom' ? 'realistic' : (TIER_LIGHTING[tierId] ? tierId : getTierId());
        const tier = TIER_LIGHTING[id] || TIER_LIGHTING.realistic;
        const Engine = this.engine || window.Engine;
        const Environment = this.env || window.Environment;
        const sun = Environment?.sunLight;
        if (sun) this._setupSunShadow(sun, tier);
        this._syncIntensities();
        if (Engine?.renderer) {
            Engine.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            Engine.renderer.toneMappingExposure = this._exposure();
        }
        this.setupImageBasedLighting(Engine);
        this._setContactEnabled(!!tier.contactShadows, tier);
        this._placeKeyFillRim();
        if (!opts.silent) {
            window.UI?.status?.(`Lighting quality: ${id} - contact ${tier.contactShadows ? 'on' : 'off'}`);
        }
    },

    applyLook(presetId, opts = {}) {
        const look = PRESET_LOOK[presetId] || PRESET_LOOK.terminal;
        const Environment = this.env || window.Environment;
        const Engine = this.engine || window.Engine;
        if (Environment?.sunLight && look.keyColor != null && presetId !== 'day') {
            Environment.sunLight.color.setHex(look.keyColor);
        }
        if (this.fillLight && look.fillColor != null) this.fillLight.color.setHex(look.fillColor);
        if (this.rimLight && look.rimColor != null) this.rimLight.color.setHex(look.rimColor);
        if (Environment?.hemiLight) {
            if (look.hemiSky != null) Environment.hemiLight.color.setHex(look.hemiSky);
            if (look.hemiGround != null) Environment.hemiLight.groundColor.setHex(look.hemiGround);
        }
        this._syncIntensities();
        if (Engine?.renderer) {
            Engine.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            Engine.renderer.toneMappingExposure = this._exposure();
        }
        this._applyEnvMapIntensity();
        this._placeKeyFillRim();
        if (!opts.silent) {
            // QualityLadder prints the user-facing status.
        }
    },

    _exposure() {
        const look = getPresetLook();
        const tier = getTier();
        return look.exposure * (0.88 + 0.12 * (tier.exposure / 1.06));
    },

    _syncIntensities() {
        const look = getPresetLook();
        const tier = getTier();
        const preset = getPresetId();
        const Environment = this.env || window.Environment;
        let key = look.keyIntensity * tier.keyMul;
        if (preset === 'day') {
            const hours = window.State?.env?.timeOfDay ?? 14;
            const sunHeight = Math.sin((hours / 24 - 0.25) * Math.PI * 2);
            key *= 0.42 + 0.58 * Math.max(0, sunHeight);
        }
        if (Environment?.sunLight) Environment.sunLight.intensity = key;
        if (this.fillLight) {
            this.fillLight.intensity = look.fillIntensity * (tier.fillMul || 0);
            this.fillLight.visible = !!tier.fillDir;
        }
        if (this.rimLight) {
            this.rimLight.intensity = look.rimIntensity * (tier.rimMul || 0);
            this.rimLight.visible = !!tier.rim;
        }
        if (this.ambLight) {
            const ambScale = tier.ambient / TIER_LIGHTING.realistic.ambient;
            this.ambLight.intensity = look.ambient * ambScale;
        }
        if (Environment?.hemiLight && Environment.hemiLight.visible) {
            Environment.hemiLight.intensity = look.hemiIntensity;
        }
    },

    _placeKeyFillRim() {
        const Environment = this.env || window.Environment;
        const sun = Environment?.sunLight;
        if (!sun) return;
        if (this.fillLight) {
            this.fillLight.position.set(
                -sun.position.x * 0.85,
                Math.max(6, sun.position.y * 0.45),
                -sun.position.z * 0.85,
            );
        }
        if (this.rimLight) {
            this.rimLight.position.set(
                -sun.position.x * 0.55,
                Math.max(12, sun.position.y + 10),
                sun.position.z * 0.35,
            );
        }
        if (sun.target) {
            sun.target.position.set(0, 0, 0);
            sun.target.updateMatrixWorld();
        }
        sun.shadow?.camera?.updateProjectionMatrix();
    },

    onTimeOfDay() {
        this._placeKeyFillRim();
        this._syncIntensities();
    },

    onRenderMode(idx) {
        const Engine = this.engine || window.Engine;
        const isRealistic = idx === 4;
        if (Engine?.renderer) {
            Engine.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            Engine.renderer.toneMappingExposure = isRealistic ? this._exposure() : Math.min(this._exposure(), 0.84);
        }
        this._applyEnvMapIntensity();
        if (isRealistic) this._syncIntensities();
        else if (this.rimLight) this.rimLight.intensity *= 0.35;
    },

    _setContactEnabled(on, tier) {
        const Engine = this.engine || window.Engine;
        if (!on || !Engine?.scene) {
            if (this.contact?.group) this.contact.group.visible = false;
            return;
        }
        if (!this.contact) this.contact = createContactShadow(THREE, tier);
        else this.contact.resize(tier);
        if (this.contact.group.parent !== Engine.scene) Engine.scene.add(this.contact.group);
        this.contact.group.visible = true;
    },

    tick() {
        this._frame += 1;
        if (this._frame % 40 === 0) this._applyEnvMapIntensity();
        if (!this.contact?.group?.visible) return;
        const Engine = this.engine || window.Engine;
        const ultra = getTierId() === 'ultra';
        if (!ultra && (this._frame % 2)) return;
        const cam = Engine?.camera;
        if (cam) _follow.set(cam.position.x, 0, cam.position.z);
        else _follow.set(0, 0, 0);
        this.contact.render(Engine.renderer, Engine.scene, _follow);
    },

    refreshMaterials() {
        this._applyEnvMapIntensity();
    },
};

function createContactShadow(THREE, tier) {
    const size = tier.contactSize || 18;
    const res = tier.contactRes || 512;
    const group = new THREE.Group();
    group.name = 'threshold-contact-shadows';
    group.userData.skipSave = true;
    group.userData.isHelper = true;

    const rt = new THREE.WebGLRenderTarget(res, res, { depthBuffer: true });
    rt.texture.generateMipmaps = false;
    rt.texture.minFilter = THREE.LinearFilter;
    rt.texture.magFilter = THREE.LinearFilter;

    const shadowCam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0.02, 8);
    shadowCam.up.set(0, 0, -1);

    const depthMaterial = new THREE.ShaderMaterial({
        uniforms: { darkness: { value: 1.2 } },
        vertexShader: `
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float darkness;
            void main() {
                float d = 1.0 - gl_FragCoord.z;
                gl_FragColor = vec4(0.0, 0.0, 0.0, pow(max(d, 0.0), 0.62) * darkness);
            }
        `,
        depthTest: true,
        depthWrite: true,
    });

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({
            map: rt.texture,
            transparent: true,
            depthWrite: false,
            opacity: 0.7,
        }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.085;
    plane.renderOrder = 2;
    plane.castShadow = false;
    plane.receiveShadow = false;
    plane.frustumCulled = false;
    plane.name = 'threshold-contact-plane';
    group.add(plane);

    const state = { group, rt, shadowCam, depthMaterial, plane, size, res };

    state.resize = (nextTier) => {
        const nSize = nextTier.contactSize || state.size;
        const nRes = nextTier.contactRes || state.res;
        if (nRes !== state.res) {
            state.rt.setSize(nRes, nRes);
            state.res = nRes;
        }
        if (nSize !== state.size) {
            plane.geometry.dispose();
            plane.geometry = new THREE.PlaneGeometry(nSize, nSize);
            shadowCam.left = -nSize / 2;
            shadowCam.right = nSize / 2;
            shadowCam.top = nSize / 2;
            shadowCam.bottom = -nSize / 2;
            shadowCam.updateProjectionMatrix();
            state.size = nSize;
        }
    };

    state.render = (renderer, scene, follow) => {
        if (!renderer || !scene) return;
        group.position.set(follow.x, 0, follow.z);
        shadowCam.position.set(follow.x, 4.2, follow.z);
        shadowCam.lookAt(follow.x, 0, follow.z);
        shadowCam.updateMatrixWorld();

        const hidden = [];
        const hide = (obj) => {
            if (obj.visible) {
                hidden.push(obj);
                obj.visible = false;
            }
        };
        hide(plane);
        scene.traverse((o) => {
            if (o === group || o === plane) return;
            if (o.isLight || o.isGridHelper || o.isCamera || o.isTransformControls) {
                hide(o);
                return;
            }
            if (o.userData?.isFloor || o.userData?.negativeLodFloor || o.userData?.isHelper) hide(o);
        });

        const prevOverride = scene.overrideMaterial;
        const prevBg = scene.background;
        const prevEnv = scene.environment;
        const prevClear = renderer.autoClear;
        const prevTarget = renderer.getRenderTarget();
        const prevShadow = renderer.shadowMap.enabled;

        scene.overrideMaterial = depthMaterial;
        scene.background = null;
        scene.environment = null;
        renderer.autoClear = true;
        renderer.shadowMap.enabled = false;
        renderer.setRenderTarget(state.rt);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(scene, shadowCam);

        scene.overrideMaterial = prevOverride;
        scene.background = prevBg;
        scene.environment = prevEnv;
        renderer.autoClear = prevClear;
        renderer.shadowMap.enabled = prevShadow;
        renderer.setRenderTarget(prevTarget);
        for (let i = 0; i < hidden.length; i++) hidden[i].visible = true;
    };

    return state;
}

window.LightingRig = LightingRig;
