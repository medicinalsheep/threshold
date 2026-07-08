import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { State, IS_TOUCH_DEVICE } from './state.js';
import { GraphicsProfile } from '../shared/graphicsProfile.js';
import { Engine } from './engineCore.js';

/** Dry play slab half-extent (m). Water moat sits outside this. */
export const FLOOR_HALF = 24;
/** Water basin surface Y — below the concrete deck (deck top ≈ 0.06). */
export const WATER_SURFACE_Y = -0.18;
export const MOAT_OUTER_HALF = 56;
export const MOAT_INNER_HALF = FLOOR_HALF + 2;

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
    waterBasePositions: null,
    waterGroup: null,
    floorGroup: null,

    init: function () {
        this.ensureFloorDeck();
        this.bindUi();
        this.setTimeOfDay(State.env.timeOfDay);
        this.setFog(State.env.fogDensity);
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

    /** Opaque concrete deck — always visible; water never replaces this. */
    ensureFloorDeck: function () {
        if (this.floorGroup) return;
        this.floorGroup = new THREE.Group();
        this.floorGroup.name = 'threshold-floor';

        const deckMat = new THREE.MeshStandardMaterial({
            color: 0x1a1c1e,
            roughness: 0.88,
            metalness: 0.03,
            envMapIntensity: 0.22,
        });
        const deck = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_HALF * 2, 0.12, FLOOR_HALF * 2),
            deckMat,
        );
        deck.position.y = 0;
        deck.receiveShadow = true;
        deck.castShadow = false;
        deck.renderOrder = 3;
        deck.userData = {
            id: 'engine_floor_deck',
            name: 'Concrete deck',
            isFloor: true,
            surfaceType: 'concrete',
            locked: true,
        };
        this.floorGroup.add(deck);

        if (Engine.groundPlane) {
            Engine.groundPlane.visible = false;
            Engine.groundPlane.userData._replacedByFloorDeck = true;
        }

        Engine.scene.add(this.floorGroup);
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
            this.waterGroup.renderOrder = 0;
            Engine.scene.add(this.waterGroup);
        }

        const tier = State.graphicsTier || 'realistic';
        const tierPreset = GraphicsProfile.getTier(tier);
        const texSize = tierPreset.waterTexSize || (IS_TOUCH_DEVICE ? 512 : 1024);
        const ringGeo = createMoatRingGeometry(MOAT_OUTER_HALF, MOAT_INNER_HALF, IS_TOUCH_DEVICE ? 32 : 56);

        this.waterReflector = new Reflector(ringGeo, {
            clipBias: 0.003,
            textureWidth: texSize,
            textureHeight: texSize,
            color: 0x0c2230,
        });
        this.waterReflector.position.y = WATER_SURFACE_Y;
        this.waterReflector.receiveShadow = true;
        this.waterReflector.renderOrder = 0;
        this.waterGroup.add(this.waterReflector);

        const rippleSegs = IS_TOUCH_DEVICE ? 12 : 24;
        const denseRipple = createMoatRingGeometry(MOAT_OUTER_HALF, MOAT_INNER_HALF, rippleSegs);
        this.waterBasePositions = denseRipple.attributes.position.array.slice();

        const rippleMat = new THREE.MeshStandardMaterial({
            color: 0x2a7a92,
            transparent: true,
            opacity: 0.72,
            metalness: 0.35,
            roughness: 0.12,
            depthWrite: true,
            envMapIntensity: 0.55,
            side: THREE.DoubleSide,
        });
        this.waterMesh = new THREE.Mesh(denseRipple, rippleMat);
        this.waterMesh.position.y = WATER_SURFACE_Y + 0.04;
        this.waterMesh.renderOrder = 1;
        this.waterGroup.add(this.waterMesh);
    },

    removeWater: function () {
        if (this.waterReflector) {
            this.waterGroup?.remove(this.waterReflector);
            this.waterReflector.geometry.dispose();
            this.waterReflector.material.dispose();
            this.waterReflector = null;
        }
        if (this.waterMesh) {
            this.waterGroup?.remove(this.waterMesh);
            this.waterMesh.geometry.dispose();
            this.waterMesh.material.dispose();
            this.waterMesh = null;
        }
        this.waterBasePositions = null;
        if (this.waterGroup && this.waterGroup.children.length === 0) {
            Engine.scene.remove(this.waterGroup);
            this.waterGroup = null;
        }
    },

    updateWater: function (time) {
        if (!this.waterMesh || !this.waterBasePositions) return;
        const pos = this.waterMesh.geometry.attributes.position;
        const t = time * 0.001;
        for (let i = 0; i < pos.count; i++) {
            const x = this.waterBasePositions[i * 3];
            const z = this.waterBasePositions[i * 3 + 2];
            pos.setY(i,
                Math.sin(x * 0.18 + t * 1.2) * 0.08
                + Math.cos(z * 0.15 + t * 0.9) * 0.06
                + Math.sin((x + z) * 0.1 + t * 1.6) * 0.04,
            );
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
    },
};