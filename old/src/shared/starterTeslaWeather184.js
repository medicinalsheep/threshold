/** Phase 18.4 / 19.4 — annex weather: skylight + south façade wet glass, thunder, marquee */

import { LAB_ORIGIN, BUILDING, BUILDING_CENTER } from './starterSiteLayout.js';

function storeDryGlass(material) {
    if (!material) return;
    material.userData = material.userData || {};
    if (material.userData._dryRoughness == null) material.userData._dryRoughness = material.roughness ?? 0.06;
    if (material.userData._dryOpacity == null) material.userData._dryOpacity = material.opacity ?? 1;
    if (material.userData._dryTransmission == null) material.userData._dryTransmission = material.transmission ?? 0.78;
}

function registerSouthLabWindows() {
    const ext = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_exterior');
    const windows = ext?.userData?.windows || [];
    windows.forEach((mesh) => {
        if (!mesh?.userData?.labWindow) return;
        mesh.userData.wetGlass = true;
        mesh.userData.surfaceType = 'glass';
        storeDryGlass(mesh.material);
        window.WeatherSystem?.registerWetGlass?.(mesh);
    });
    return windows.length;
}

function skylightGlassMat(THREE) {
    return new THREE.MeshPhysicalMaterial({
        color: 0xb8d0e0,
        roughness: 0.06,
        metalness: 0.04,
        transmission: 0.78,
        transparent: true,
        opacity: 0.42,
        thickness: 0.12,
        ior: 1.52,
        envMapIntensity: 0.55,
    });
}

export function buildStarterTeslaWeather184() {
    const Engine = window.Engine;
    const State = window.State;
    const THREE = window.THREE;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'starter_tesla_skylight')) {
        return null;
    }

    const SM = window.StarterMaterials;
    const group = new THREE.Group();
    group.name = 'starter_tesla_weather_annex';

    const paneMat = skylightGlassMat(THREE);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.72, metalness: 0.12 });

    const skylight = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.04, 2.4), paneMat.clone());
    skylight.position.set(0, BUILDING.h - 0.12, 0);
    skylight.userData = {
        wetGlass: true,
        isSkylight: true,
        surfaceType: 'glass',
    };
    if (skylight.material) {
        skylight.material.userData = skylight.material.userData || {};
        skylight.material.userData._dryRoughness = skylight.material.roughness;
        skylight.material.userData._dryOpacity = skylight.material.opacity;
        skylight.material.userData._dryTransmission = skylight.material.transmission;
    }

    const frameN = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.08), frameMat);
    const skyY = BUILDING.h - 0.09;
    frameN.position.set(0, skyY, 1.22);
    const frameS = frameN.clone();
    frameS.position.z = -1.22;
    const frameE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.48), frameMat);
    frameE.position.set(2.12, skyY, 0);
    const frameW = frameE.clone();
    frameW.position.x = -2.12;

    group.add(skylight, frameN, frameS, frameE, frameW);
    group.position.set(LAB_ORIGIN.x, LAB_ORIGIN.y, LAB_ORIGIN.z);
    group.userData = {
        id: 'starter_tesla_skylight',
        name: 'Lab Skylight',
        type: 'prop',
        locked: true,
        animSkylight: true,
        skylightMesh: skylight,
    };
    Engine.scene.add(group);
    State.objects.push(group);

    const ext = State.objects.find((o) => o.userData?.id === 'starter_tesla_exterior');
    const sign = ext?.userData?.signMesh;
    if (sign) {
        sign.userData.weatherMarquee = true;
        if (sign.material) {
            sign.material.userData = sign.material.userData || {};
            sign.material.userData._dryEmissive = sign.material.emissiveIntensity ?? 0.05;
        }
    }

    const marqueeTex = SM?.makeBillboardTex?.(THREE, 'THRESHOLD', 'LAB');
    const marquee = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 0.85),
        new THREE.MeshStandardMaterial({
            map: marqueeTex || null,
            color: 0xfff0d8,
            emissive: marqueeTex ? 0xa06020 : 0xc08030,
            emissiveMap: marqueeTex || null,
            emissiveIntensity: 0.12,
            roughness: 0.65,
            side: THREE.DoubleSide,
        })
    );
    marquee.position.set(BUILDING_CENTER.x, BUILDING.floorY + 4.2, BUILDING.southZ + 0.25);
    marquee.rotation.y = Math.PI;
    if (marquee.material) {
        marquee.material.userData = marquee.material.userData || {};
        marquee.material.userData._dryEmissive = 0.12;
    }
    marquee.userData = {
        id: 'starter_tesla_marquee',
        name: 'Threshold Lab Marquee',
        type: 'prop',
        locked: true,
        weatherMarquee: true,
        marqueeMesh: marquee,
    };
    Engine.scene.add(marquee);
    State.objects.push(marquee);

    storeDryGlass(skylight.material);
    window.WeatherSystem?.registerWetGlass?.(skylight);
    registerSouthLabWindows();
    return { skylight: group, marquee };
}

export const StarterTeslaWeather184 = {
    _flashT: 0,
    _flashPower: 0,
    registerSouthLabWindows,

    wireAnims() {
        const annex = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_skylight');
        const skylight = annex?.userData?.skylightMesh;
        const coil = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_coil');
        const arc = coil?.userData?.arcMesh;
        const ext = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_exterior');
        const towerCage = ext?.userData?.towerCage;
        const sign = ext?.userData?.signMesh;
        const marquee = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_marquee');

        window.StarterAnim?.registerStarterAnim?.((t, dt) => {
            if (this._flashT > 0) {
                this._flashT = Math.max(0, this._flashT - dt);
            }
            const flash = this._flashT > 0 ? (this._flashT / 0.35) * this._flashPower : 0;

            if (arc?.material) {
                const base = 0.55 + Math.sin(t * 8.5) * 0.25;
                arc.material.emissiveIntensity = base * 1.1 + flash * 1.4;
            }
            if (towerCage?.material) {
                towerCage.material.emissiveIntensity = 0.06 + flash * 0.9;
            }
            [sign, marquee?.userData?.marqueeMesh || marquee].forEach((mesh) => {
                if (!mesh?.material) return;
                const dry = mesh.material.userData?._dryEmissive ?? 0.12;
                const build = ext?.userData?.projectBuildT ? Math.min(1, ext.userData.projectBuildT / 18) : 0;
                mesh.material.emissiveIntensity = dry + build * 0.35 + flash * 0.85 + Math.sin(t * 1.6) * 0.04;
            });

            const bulbs = coil?.userData?.bulbs || [];
            bulbs.forEach((bulb, i) => {
                if (!bulb?.material) return;
                bulb.material.emissiveIntensity = 0.42 + flash * 0.5 + Math.sin(t * 3.2 + i) * 0.1;
            });
        });
    },

    onThunderFlash({ near = false, intensity = 0.5 } = {}) {
        this._flashPower = near ? 1 : 0.55;
        this._flashT = 0.28 + intensity * 0.18;
        void window.TeslaLabAmbient?.playSpark?.();
    },
};

window.StarterTeslaWeather184 = StarterTeslaWeather184;
window.buildStarterTeslaWeather184 = buildStarterTeslaWeather184;