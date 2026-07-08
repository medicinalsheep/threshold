import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { VERSION } from '../config.js';
import { State, IS_TOUCH_DEVICE } from './state.js';
import { GraphicsProfile } from '../shared/graphicsProfile.js';
import { Engine } from './engineCore.js';
import { createConcreteSlabDeck, wireDeckTextures, FLOOR_HALF } from './floorDeck.js';
import {
    createWaterShaderMaterial,
    createFoamRingMaterial,
    bindWaterEnvMap,
    updateWaterShaderMaterials,
    attachReflectorHooks,
} from './waterSurface.js';

/** Dry play slab half-extent (m). Water moat sits outside this. */
export { FLOOR_HALF };
/** Water basin surface Y — below the concrete deck (deck top ≈ 0.06). */
export const WATER_SURFACE_Y = -0.18;
export const MOAT_OUTER_HALF = 48;
export const MOAT_INNER_HALF = FLOOR_HALF + 0.85;

function createMoatRingGeometry(outerHalf, innerHalf, segments = 48) {
    const shape = new THREE.Shape();
    shape.moveTo(-outerHalf, -outerHalf);
    shape.lineTo(outerHalf, -outerHalf);
    shape.lineTo(outerHalf, outerHalf);
    shape.lineTo(-outerHalf, outerHalf);
    shape.closePath();

    const hole = new THREE.Path();
    hole.moveTo(-innerHalf, -innerHalf);
    hole.lineTo(-innerHalf, innerHalf);
    hole.lineTo(innerHalf, innerHalf);
    hole.lineTo(innerHalf, -innerHalf);
    hole.closePath();
    shape.holes.push(hole);

    const geo = new THREE.ShapeGeometry(shape, segments);
    geo.rotateX(-Math.PI / 2);
    return geo;
}

export const Environment = {
    sunLight: null,
    hemiLight: null,
    waterMesh: null,
    waterReflector: null,
    waterShaderMat: null,
    waterFoamMesh: null,
    waterFoamMat: null,
    waterGroup: null,
    floorGroup: null,
    floorTextureTarget: null,

    init: function () {
        this.ensureFloorDeck();
        this.bindUi();
        this.setTimeOfDay(State.env.timeOfDay);
        this.setFog(State.env.fogDensity);
        setTimeout(() => {
            const tier = State.graphicsTier || 'realistic';
            const tierLabel = GraphicsProfile.getTier(tier).label;
            if (State.env.waterEnabled) {
                window.UI?.status?.(`v${VERSION} · slab deck + moat water · ${tierLabel} · pan to pad edge`);
            } else {
                window.UI?.status?.(`v${VERSION} · slab deck ready · water OFF (${tierLabel}) — ENV → Realistic`);
            }
        }, 400);
        if (State.env.waterEnabled) {
            this.createWater();
            const btn = document.getElementById('env-water-toggle');
            if (btn) { btn.textContent = 'ON'; btn.classList.add('active'); }
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

    ensureFloorDeck: function () {
        if (this.floorGroup) return;
        const deck = createConcreteSlabDeck(FLOOR_HALF);
        this.floorGroup = deck.group;
        this.floorTextureTarget = deck.textureTarget;
        this.floorGroup.renderOrder = 3;
        Engine.scene.add(this.floorGroup);

        if (Engine.groundPlane) {
            Engine.groundPlane.visible = false;
            Engine.groundPlane.userData._replacedByFloorDeck = true;
        }

        if (!State.objects.some((o) => o.userData?.id === 'engine_floor_deck')) {
            State.objects.push(this.floorGroup);
        }

        const instanced = this.floorGroup.children.find((c) => c.isInstancedMesh);
        if (instanced) window.WeatherSystem?.registerMesh?.(instanced);

        wireDeckTextures(this.floorTextureTarget).then((r) => {
            if (r.maps) window.UI?.status?.(`Floor PBR · ${r.maps} maps (slab deck)`);
        }).catch(() => {});
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
        window.dispatchEvent(new CustomEvent('threshold:timeofday', { detail: { hours } }));
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
        } else {
            this.removeWater();
            if (btn) { btn.textContent = 'OFF'; btn.classList.remove('active'); }
        }
    },

    createWater: function () {
        if (this.waterReflector) return;
        this.ensureFloorDeck();

        if (!this.waterGroup) {
            this.waterGroup = new THREE.Group();
            this.waterGroup.name = 'threshold-water';
            Engine.scene.add(this.waterGroup);
        }

        const tier = State.graphicsTier || 'realistic';
        const tierPreset = GraphicsProfile.getTier(tier);
        const texSize = tierPreset.waterTexSize || (IS_TOUCH_DEVICE ? 512 : 1024);
        const ringSegs = IS_TOUCH_DEVICE ? 40 : 72;
        const ringGeo = createMoatRingGeometry(MOAT_OUTER_HALF, MOAT_INNER_HALF, ringSegs);

        this.waterReflector = new Reflector(ringGeo, {
            clipBias: 0.003,
            textureWidth: texSize,
            textureHeight: texSize,
            color: 0x061820,
        });
        this.waterReflector.position.y = WATER_SURFACE_Y;
        this.waterReflector.receiveShadow = true;
        this.waterReflector.renderOrder = 0;
        this.waterGroup.add(this.waterReflector);

        const rippleSegs = IS_TOUCH_DEVICE ? 16 : 36;
        const rippleGeo = createMoatRingGeometry(MOAT_OUTER_HALF, MOAT_INNER_HALF, rippleSegs);
        this.waterShaderMat = createWaterShaderMaterial(MOAT_INNER_HALF, 1.6);
        bindWaterEnvMap(this.waterShaderMat, Engine.scene);

        this.waterMesh = new THREE.Mesh(rippleGeo, this.waterShaderMat);
        this.waterMesh.position.y = WATER_SURFACE_Y + 0.02;
        this.waterMesh.renderOrder = 1;
        this.waterGroup.add(this.waterMesh);

        const foamGeo = new THREE.RingGeometry(MOAT_INNER_HALF - 0.15, MOAT_INNER_HALF + 1.1, IS_TOUCH_DEVICE ? 48 : 96);
        foamGeo.rotateX(-Math.PI / 2);
        this.waterFoamMat = createFoamRingMaterial();
        this.waterFoamMesh = new THREE.Mesh(foamGeo, this.waterFoamMat);
        this.waterFoamMesh.position.y = WATER_SURFACE_Y + 0.05;
        this.waterFoamMesh.renderOrder = 2;
        this.waterGroup.add(this.waterFoamMesh);

        attachReflectorHooks(this);
    },

    removeWater: function () {
        const disposeMesh = (mesh) => {
            if (!mesh) return;
            this.waterGroup?.remove(mesh);
            mesh.geometry?.dispose();
            if (mesh.material?.dispose) mesh.material.dispose();
        };
        disposeMesh(this.waterReflector);
        disposeMesh(this.waterMesh);
        disposeMesh(this.waterFoamMesh);
        this.waterReflector = null;
        this.waterMesh = null;
        this.waterFoamMesh = null;
        this.waterShaderMat = null;
        this.waterFoamMat = null;
        this._reflectorHooks = false;
        if (this.waterGroup && this.waterGroup.children.length === 0) {
            Engine.scene.remove(this.waterGroup);
            this.waterGroup = null;
        }
    },

    updateWater: function (time) {
        if (!this.waterMesh) return;
        updateWaterShaderMaterials(this, time, Engine.scene);
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
    },
};