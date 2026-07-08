import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { State, IS_TOUCH_DEVICE } from './state.js';
import { GraphicsProfile } from '../shared/graphicsProfile.js';
import { Engine } from './engineCore.js';

export const Environment = {
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
            metalness: 0.18,
            roughness: 0.48,
            depthWrite: false,
            envMapIntensity: 0.22,
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
