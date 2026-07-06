/** Polished visitor gateway — Sprint L showcase arch */

import { SITE, court } from './starterSiteLayout.js';

function addStoneCurb(root, x, z, mat, THREE) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.42), mat);
    curb.position.set(x, 0.08, z);
    curb.castShadow = true;
    curb.receiveShadow = true;
    curb.userData = { name: 'Approach Curb', surfaceType: 'stone' };
    root.add(curb);
}

export function buildShowcaseGateway() {
    const Engine = window.Engine;
    const State = window.State;
    const Physics = window.Physics;
    const THREE = window.THREE;
    const C = window.CANNON;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'showcase_gateway')) return null;

    const SM = window.StarterMaterials;
    const mats = SM?.createStarterMaterials?.(THREE);
    const stoneMat = mats?.wall || new THREE.MeshStandardMaterial({
        color: 0x5a5e64,
        roughness: 0.78,
        metalness: 0.06,
        envMapIntensity: 0.32,
    });
    stoneMat.userData = { name: 'Starter Wall' };
    const copperMat = mats?.copper || new THREE.MeshStandardMaterial({
        color: 0xb87848,
        roughness: 0.38,
        metalness: 0.72,
        envMapIntensity: 0.48,
    });
    const woodMat = mats?.wood || new THREE.MeshStandardMaterial({
        color: 0x5a4838,
        roughness: 0.82,
        metalness: 0.04,
        envMapIntensity: 0.28,
    });
    woodMat.userData = { name: 'Visitor Gateway' };

    const signTex = SM?.makeWardenclyffeSignTex?.(THREE);
    const signMat = new THREE.MeshStandardMaterial({
        map: signTex || null,
        color: 0xf0e8d8,
        emissive: signTex ? 0x604830 : 0x806040,
        emissiveMap: signTex || null,
        emissiveIntensity: signTex ? 0.22 : 0.16,
        roughness: 0.68,
        metalness: 0.03,
        side: THREE.DoubleSide,
    });

    const root = new THREE.Group();
    root.name = 'showcase_gateway';

    const postGeo = new THREE.CylinderGeometry(0.14, 0.16, 2.35, 16);
    const capGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.12, 16);
    const gatewayLamps = [];
    const lampFixtures = [];

    [-3.8, 3.8].forEach((lx) => {
        const post = new THREE.Mesh(postGeo, stoneMat);
        post.position.set(lx, 1.18, 0);
        post.castShadow = true;
        post.userData = { name: 'Starter Wall' };
        const cap = new THREE.Mesh(capGeo, copperMat);
        cap.position.set(lx, 2.42, 0);
        const basePad = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.06, 16), stoneMat);
        basePad.position.set(lx, 0.03, 0);
        basePad.receiveShadow = true;
        root.add(post, cap, basePad);
    });

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.22, 0.38), stoneMat);
    lintel.position.set(0, 2.28, 0);
    lintel.castShadow = true;
    lintel.userData = { name: 'Starter Wall' };
    root.add(lintel);

    const signFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.95, 0.1), woodMat);
    signFrame.position.set(0, 1.55, 0.2);
    signFrame.castShadow = true;
    const signPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 0.82), signMat);
    signPlane.position.set(0, 1.58, 0.27);
    signPlane.userData = { gatewaySign: true };
    root.add(signFrame, signPlane);

    const lampMat = new THREE.MeshStandardMaterial({
        color: 0xfff0d0,
        emissive: 0xffd8a0,
        emissiveIntensity: 0.55,
        roughness: 0.35,
    });
    [-3.2, 3.2].forEach((lx) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.28), copperMat);
        arm.position.set(lx, 2.08, 0.12);
        const fixture = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), lampMat);
        fixture.position.set(lx, 2.02, 0.22);
        const light = new THREE.PointLight(0xffe0b8, 0.72, 10, 1.75);
        light.position.set(lx, 1.92, 0.2);
        gatewayLamps.push(light);
        lampFixtures.push(fixture);
        root.add(arm, fixture, light);
    });

    const gravelMat = mats?.path?.clone?.() || new THREE.MeshStandardMaterial({
        color: 0x8a7a62,
        roughness: 0.92,
        metalness: 0.02,
        envMapIntensity: 0.22,
    });
    gravelMat.userData = { name: 'Approach Path' };

    const inlay = new THREE.Mesh(
        new THREE.PlaneGeometry(7.4, 2.6, 4, 2),
        gravelMat
    );
    inlay.rotation.x = -Math.PI / 2;
    inlay.position.set(0, 0.064, 0.35);
    inlay.receiveShadow = true;
    inlay.userData = { name: 'Approach Path', surfaceType: 'gravel' };
    root.add(inlay);

    const curbMat = stoneMat.clone();
    curbMat.userData = { name: 'Approach Curb' };
    for (let z = -1.0; z <= 1.2; z += 0.55) {
        addStoneCurb(root, -3.55, z, curbMat, THREE);
        addStoneCurb(root, 3.55, z, curbMat, THREE);
    }

    root.position.set(court(0, 4.2).x, 0, court(0, 4.2).z);
    root.userData = {
        id: 'showcase_gateway',
        name: 'Visitor Gateway',
        type: 'prop',
        locked: true,
        animGateway: true,
        gatewayLamps,
        lampFixtures,
        signMesh: signPlane,
        gatewayLampBase: 0.72,
    };
    Engine.scene.add(root);
    State.objects.push(root);

    if (C && Physics?.addStaticBox) {
        [-3.8, 3.8].forEach((lx) => {
            Physics.addStaticBox(
                new C.Vec3(0.16, 1.18, 0.16),
                { x: court(lx, 4.2).x, y: 1.18, z: court(0, 4.2).z },
                'ground',
                'stone'
            );
        });
    }

    return root;
}

export function registerGatewayRainAnim() {
    window.StarterAnim?.registerStarterAnim?.((t) => {
        const gw = window.State?.objects?.find((o) => o.userData?.id === 'showcase_gateway');
        if (!gw?.userData?.gatewayLamps) return;
        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        const base = gw.userData.gatewayLampBase ?? 0.72;
        const flicker = 0.94 + Math.sin(t * 2.2) * 0.04;
        const damp = (1 - rain * 0.38) * flicker;
        gw.userData.gatewayLamps.forEach((light, i) => {
            light.intensity = base * damp * (i === 0 ? 1 : 0.92);
            light.color.setHex(rain > 0.35 ? 0xffd0a0 : 0xffe0b8);
        });
        gw.userData.lampFixtures?.forEach((fx) => {
            if (fx?.material?.emissiveIntensity != null) {
                fx.material.emissiveIntensity = 0.42 + (1 - rain) * 0.18;
            }
        });
    });
}

window.buildShowcaseGateway = buildShowcaseGateway;
window.registerGatewayRainAnim = registerGatewayRainAnim;