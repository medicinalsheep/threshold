/** Phase 18.4 — annex weather: skylight rain, thunder flash, exterior marquee */

const LAB_ORIGIN = { x: -9, y: 0, z: 2 };

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

    const skylight = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 1.5), paneMat.clone());
    skylight.position.set(0, 2.92, 0);
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
    frameN.position.set(0, 2.95, 0.78);
    const frameS = frameN.clone();
    frameS.position.z = -0.78;
    const frameE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.58), frameMat);
    frameE.position.set(1.22, 2.95, 0);
    const frameW = frameE.clone();
    frameW.position.x = -1.22;

    group.add(skylight, frameN, frameS, frameE, frameW);
    group.position.set(LAB_ORIGIN.x, 0, LAB_ORIGIN.z);
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
    marquee.position.set(-32, 4.2, 2.85);
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

    window.WeatherSystem?.registerWetGlass?.(skylight);
    return { skylight: group, marquee };
}

export const StarterTeslaWeather184 = {
    _flashT: 0,
    _flashPower: 0,

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
            const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
            if (skylight?.material) {
                const m = skylight.material;
                const dryR = m.userData?._dryRoughness ?? 0.06;
                const dryO = m.userData?._dryOpacity ?? 0.42;
                const dryT = m.userData?._dryTransmission ?? 0.78;
                m.roughness = dryR + rain * 0.38;
                m.opacity = Math.max(0.28, dryO - rain * 0.08);
                m.transmission = Math.max(0.45, dryT - rain * 0.22);
            }

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