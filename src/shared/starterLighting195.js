/** Phase 19.5 / Sprint D — Wardenclyffe dusk lighting + warm lab interior */

import { LAB_ORIGIN, BUILDING_CENTER, BUILDING } from './starterSiteLayout.js';

const DUSK_HOURS = 18.82;
const DUSK_FOG = 0.02;
const SHOWCASE_SPAWN_HOURS = 18.82;

export function applyWardenclyffeLighting195() {
    const Engine = window.Engine;
    const State = window.State;
    const THREE = window.THREE;
    const Environment = window.Environment;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'starter_lighting_195')) {
        return null;
    }

    State.env.timeOfDay = DUSK_HOURS;
    State.env.fogDensity = DUSK_FOG;
    Environment?.setTimeOfDay?.(DUSK_HOURS);
    Environment?.setFog?.(DUSK_FOG);

    if (Environment?.hemiLight) {
        Environment.hemiLight.color.setHex(0xffd4a8);
        Environment.hemiLight.groundColor.setHex(0x1a1410);
        Environment.hemiLight.intensity = 0.48;
    }
    if (Environment?.sunLight) {
        Environment.sunLight.intensity *= 0.88;
    }

    const root = new THREE.Group();
    root.name = 'starter_lighting_195';

    const labLight = new THREE.PointLight(0xffc878, 1.35, 14, 1.6);
    labLight.position.set(LAB_ORIGIN.x, LAB_ORIGIN.y + 2.8, LAB_ORIGIN.z);
    labLight.castShadow = false;
    root.add(labLight);

    const coilAccent = new THREE.PointLight(0x88c8ff, 0.55, 8, 2);
    coilAccent.position.set(LAB_ORIGIN.x + 0.2, LAB_ORIGIN.y + 2.2, LAB_ORIGIN.z - 0.35);
    root.add(coilAccent);

    const facadeLight = new THREE.PointLight(0xffe0b0, 0.85, 22, 1.8);
    facadeLight.position.set(
        BUILDING_CENTER.x,
        BUILDING.floorY + 2.6,
        BUILDING.southZ + 2.2
    );
    root.add(facadeLight);

    const courtFill = new THREE.PointLight(0xc8d8ff, 0.42, 28, 1.5);
    courtFill.position.set(0, 3.2, 12);
    root.add(courtFill);

    const approachLight = new THREE.PointLight(0xffc890, 0.88, 18, 1.65);
    approachLight.position.set(0, 2.85, 12.8);
    root.add(approachLight);

    const gatewayFill = new THREE.PointLight(0xffe0b0, 0.62, 14, 1.7);
    gatewayFill.position.set(0, 2.4, 14.2);
    root.add(gatewayFill);

    const coil = State.objects.find((o) => o.userData?.id === 'starter_tesla_coil');
    (coil?.userData?.bulbs || []).forEach((bulb) => {
        if (!bulb?.material) return;
        bulb.material.emissive?.setHex?.(0xffc050);
        bulb.material.emissiveIntensity = 0.58;
        bulb.userData._warmBulb195 = true;
    });

    const ext = State.objects.find((o) => o.userData?.id === 'starter_tesla_exterior');
    const windows = ext?.userData?.windows || [];
    windows.forEach((win) => {
        if (!win?.material) return;
        win.material.emissive?.setHex?.(0x304860);
        win.material.emissiveIntensity = 0.12;
    });

    root.userData = {
        id: 'starter_lighting_195',
        name: 'Wardenclyffe Lighting',
        type: 'prop',
        locked: true,
        animLighting195: true,
        labLight,
        facadeLight,
        courtFill,
        coilAccent,
        approachLight,
        gatewayFill,
    };
    Engine.scene.add(root);
    State.objects.push(root);

    const envSlider = document.getElementById('env-time');
    if (envSlider) envSlider.value = String(DUSK_HOURS);

    return root;
}

export const StarterLighting195 = {
    wireAnims() {
        const root = window.State?.objects?.find((o) => o.userData?.id === 'starter_lighting_195');
        if (!root?.userData?.animLighting195) return;

        const {
            labLight, facadeLight, courtFill, coilAccent, approachLight, gatewayFill,
        } = root.userData;

        window.registerGatewayRainAnim?.();

        window.StarterAnim?.registerStarterAnim?.((t) => {
            const dusk = 0.92 + Math.sin(t * 0.45) * 0.04;
            const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
            const rainDamp = 1 - rain * 0.22;

            if (labLight) labLight.intensity = (1.2 + Math.sin(t * 2.8) * 0.12) * rainDamp;
            if (facadeLight) facadeLight.intensity = (0.75 + Math.sin(t * 1.4) * 0.1) * dusk * (1 - rain * 0.15);
            if (courtFill) courtFill.intensity = 0.38 + Math.sin(t * 0.9) * 0.06;
            if (coilAccent) coilAccent.intensity = 0.48 + Math.sin(t * 5.5) * 0.14;
            if (approachLight) {
                approachLight.intensity = (0.82 + Math.sin(t * 1.1) * 0.08) * (1 - rain * 0.28);
            }
            if (gatewayFill) {
                gatewayFill.intensity = (0.55 + Math.sin(t * 1.6) * 0.06) * (1 - rain * 0.35);
            }
        });
    },
};

export function lockShowcaseGoldenHour() {
    const State = window.State;
    const Environment = window.Environment;
    if (!State) return;
    State.env.timeOfDay = SHOWCASE_SPAWN_HOURS;
    State.env.fogDensity = DUSK_FOG;
    Environment?.setTimeOfDay?.(SHOWCASE_SPAWN_HOURS);
    Environment?.setFog?.(DUSK_FOG);
    const envSlider = document.getElementById('env-time');
    if (envSlider) envSlider.value = String(SHOWCASE_SPAWN_HOURS);
}

window.StarterLighting195 = StarterLighting195;
window.applyWardenclyffeLighting195 = applyWardenclyffeLighting195;
window.lockShowcaseGoldenHour = lockShowcaseGoldenHour;