import * as THREE from 'three';
import { VERSION } from '../config.js';
import { State } from './state.js';
import { GraphicsProfile } from '../shared/graphicsProfile.js';
import { Engine } from './engineCore.js';

export const FLOOR_HALF = 24;

export const Environment = {
    sunLight: null,
    hemiLight: null,
    floorGroup: null,
    waterReflector: null,
    waterMesh: null,

    init: function () {
        State.env.waterEnabled = false;
        this.removeWater();
        this.useSimpleGround();
        this.bindUi();
        this.setTimeOfDay(State.env.timeOfDay);
        this.setFog(State.env.fogDensity);
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

    useSimpleGround: function () {
        this.clearFloorDeck();
        const plane = Engine.groundPlane;
        if (!plane) return;

        plane.visible = true;
        plane.userData.id = 'engine_ground';
        plane.userData.name = 'Starter Ground';
        plane.userData.isFloor = true;
        plane.userData.negativeLodFloor = true; // path B: far/high camera → unlit
        plane.userData.surfaceType = 'concrete';

        if (!State.objects.includes(plane)) {
            State.objects.push(plane);
        }

        window.StarterTex?.wireStarterTextures?.().catch(() => {});
    },

    /**
     * Polished workspace pad — instanced concrete slabs + curb + matching pad collider.
     * Preferred default for ENTER (play/build).
     */
    useWorkspacePad: async function (halfSize = FLOOR_HALF) {
        this.clearFloorDeck();
        const plane = Engine.groundPlane;
        if (plane) {
            // Hide infinite dark plane under deck (physics plane remains as safety net)
            plane.visible = false;
            State.objects = State.objects.filter((o) => o !== plane);
        }

        try {
            const { createConcreteSlabDeck, wireDeckTextures } = await import('./floorDeck.js');
            const deck = createConcreteSlabDeck(halfSize);
            this.floorGroup = deck.group;
            this.floorTextureTarget = deck.textureTarget;
            Engine.scene.add(deck.group);
            if (!State.objects.includes(deck.group)) {
                State.objects.push(deck.group);
            }
            // Path C target on instanced mesh
            if (deck.instanced && !State.objects.includes(deck.instanced)) {
                State.objects.push(deck.instanced);
            }
            await wireDeckTextures(deck.textureTarget);
            window.Physics?.setPadCollider?.(halfSize, 0.06, 'concrete');
            return deck;
        } catch (e) {
            console.warn('[Environment] workspace pad fallback', e);
            this.useSimpleGround();
            window.Physics?.setPadCollider?.(halfSize, 0.06, 'concrete');
            return null;
        }
    },

    clearFloorDeck: function () {
        if (!this.floorGroup) return;

        const disposeMesh = (mesh) => {
            mesh.geometry?.dispose?.();
            if (mesh.material?.dispose) mesh.material.dispose();
        };

        this.floorGroup.traverse((child) => {
            if (child.isMesh || child.isInstancedMesh) disposeMesh(child);
            if (child.isLine) child.geometry?.dispose?.();
        });

        Engine.scene.remove(this.floorGroup);
        State.objects = State.objects.filter(
            (o) => o !== this.floorGroup
                && o.userData?.id !== 'engine_floor_deck'
                && o !== this.floorGroup,
        );
        // Drop instanced deck meshes that were registered separately
        State.objects = State.objects.filter((o) => !o?.userData?.floorPathC || o.parent);
        this.floorGroup = null;
        this.floorTextureTarget = null;

        const plane = Engine.groundPlane;
        if (plane) plane.visible = true;
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
        // Far flats re-sample fog/hemi/sun tint
        window.NegativeLod?.notifyEnvChange?.();
    },

    setFog: function (density) {
        State.env.fogDensity = density;
        if (Engine.scene?.fog) Engine.scene.fog.density = density;
        window.NegativeLod?.notifyEnvChange?.();
    },

    createWater: function () {
        State.env.waterEnabled = false;
    },

    removeWater: function () {
        const group = Engine.scene?.getObjectByName?.('threshold-water');
        if (!group) {
            this.waterReflector = null;
            this.waterMesh = null;
            return;
        }

        const disposeMesh = (mesh) => {
            mesh.geometry?.dispose?.();
            if (mesh.material?.dispose) mesh.material.dispose();
        };

        group.traverse((child) => {
            if (child.isMesh) disposeMesh(child);
        });
        Engine.scene.remove(group);
        this.waterReflector = null;
        this.waterMesh = null;
    },

    updateWater: function () {},

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