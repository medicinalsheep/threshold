/** Phase 19.4 — Wardenclyffe visitor courtyard prop density (period yard clutter) */

import { court } from './starterSiteLayout.js';

function addProp(group, mesh, pos, rotY = 0) {
    mesh.position.set(pos.x, pos.y ?? 0, pos.z);
    if (rotY) mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
}

function barrel(THREE, mat, scale = 1) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.32 * scale, 0.72 * scale, 10), mat);
    body.position.y = 0.36 * scale;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.3 * scale, 0.018, 6, 12), mat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.52 * scale;
    g.add(body, band);
    return g;
}

function spool(THREE, woodMat, metalMat) {
    const g = new THREE.Group();
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.55, 12), woodMat);
    drum.position.y = 0.42;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.62, 8), metalMat);
    hub.position.y = 0.42;
    const standL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), woodMat);
    standL.position.set(-0.38, 0.25, 0);
    const standR = standL.clone();
    standR.position.x = 0.38;
    g.add(drum, hub, standL, standR);
    return g;
}

function crateStack(THREE, woodMat, n = 2) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i += 1) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), woodMat);
        c.position.set((i % 2) * 0.55, 0.31 + Math.floor(i / 2) * 0.62, (i % 3) * 0.08);
        c.rotation.y = i * 0.22;
        g.add(c);
    }
    return g;
}

function gasLamp(THREE, poleMat, bulbMat) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 2.6, 6), poleMat);
    pole.position.y = 1.3;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), poleMat);
    head.position.y = 2.72;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), bulbMat);
    bulb.position.y = 2.58;
    bulb.userData.courtLampBulb = true;
    const light = new THREE.PointLight(0xffe4c0, 0.45, 8, 1.8);
    light.position.y = 2.5;
    g.add(pole, head, bulb, light);
    g.userData.lampBulb = bulb;
    return g;
}

export function buildStarterCourtyard194() {
    const Engine = window.Engine;
    const State = window.State;
    const THREE = window.THREE;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'starter_courtyard_props')) {
        return null;
    }

    const SM = window.StarterMaterials;
    const mats = SM?.createStarterMaterials?.(THREE);
    const woodMat = mats?.wood?.clone?.() || new THREE.MeshStandardMaterial({ color: 0x5a4838, roughness: 0.84, metalness: 0.03 });
    const metalMat = mats?.metal?.clone?.() || new THREE.MeshStandardMaterial({ color: 0x5a5e64, roughness: 0.42, metalness: 0.58 });
    const poleMat = mats?.pole?.clone?.() || new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.45, metalness: 0.5 });
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.78, metalness: 0.12 });
    const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfff0d0, emissive: 0xffd8a0, emissiveIntensity: 0.42, roughness: 0.32,
    });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 0.9, metalness: 0.02 });

    const root = new THREE.Group();
    root.name = 'starter_courtyard_props';

    const lampBulbs = [];

    // West yard — cable spools, barrels (creek side)
    [
        { lx: -7.4, lz: 0.8, ry: 0.5 },
        { lx: -7.1, lz: -2.4, ry: -0.35 },
    ].forEach((p) => {
        const sp = spool(THREE, woodMat, metalMat);
        const wp = court(p.lx, p.lz);
        sp.position.set(wp.x, 0, wp.z);
        sp.rotation.y = p.ry;
        sp.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        root.add(sp);
    });
    [
        { lx: -6.6, lz: 3.1, ry: 0.2, sc: 0.92 },
        { lx: -5.9, lz: 3.5, ry: -0.15, sc: 1.02 },
        { lx: -6.2, lz: 2.6, ry: 0.55, sc: 0.96 },
    ].forEach((p) => {
        const b = barrel(THREE, barrelMat, p.sc ?? 1);
        const wp = court(p.lx, p.lz);
        b.position.set(wp.x, 0, wp.z);
        b.rotation.y = p.ry;
        b.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        root.add(b);
    });

    // East yard — crates, coil stand (highway side)
    [
        { lx: 6.4, lz: 1.6, ry: -0.4 },
        { lx: 7.0, lz: -0.8, ry: 0.25 },
    ].forEach((p) => {
        const cs = crateStack(THREE, woodMat, 2 + (p.lz > 0 ? 1 : 0));
        const wp = court(p.lx, p.lz);
        cs.position.set(wp.x, 0, wp.z);
        cs.rotation.y = p.ry;
        cs.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        root.add(cs);
    });

    const coilStand = new THREE.Group();
    const coilPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 6), metalMat);
    coilPost.position.y = 0.55;
    const coilRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 14), metalMat);
    coilRing.rotation.x = Math.PI / 2;
    coilRing.position.y = 1.05;
    coilStand.add(coilPost, coilRing);
    const coilPos = court(5.8, -4.8);
    coilStand.position.set(coilPos.x, 0, coilPos.z);
    coilStand.rotation.y = -0.2;
    root.add(coilStand);

    // South approach — lamps, signage, rope stanchions
    [
        { lx: -4.2, lz: 5.8 },
        { lx: 4.2, lz: 5.8 },
        { lx: 0, lz: 6.4 },
    ].forEach((p, i) => {
        const lamp = gasLamp(THREE, poleMat, bulbMat.clone());
        const wp = court(p.lx, p.lz);
        lamp.position.set(wp.x, 0, wp.z);
        lamp.rotation.y = i === 2 ? Math.PI : (i === 0 ? 0.35 : -0.35);
        root.add(lamp);
        if (lamp.userData.lampBulb) lampBulbs.push(lamp.userData.lampBulb);
    });

    const signTex = SM?.makeBillboardTex?.(THREE, 'VISITOR', 'COURTYARD');
    const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.42),
        new THREE.MeshStandardMaterial({
            map: signTex || null,
            color: 0xe8dcc8,
            emissive: signTex ? 0x604020 : 0x806030,
            emissiveMap: signTex || null,
            emissiveIntensity: 0.08,
            roughness: 0.78,
            side: THREE.DoubleSide,
        })
    );
    const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.35, 6), woodMat);
    signPost.position.y = 0.68;
    const signGrp = new THREE.Group();
    sign.position.set(0, 1.35, 0);
    signGrp.add(signPost, sign);
    const signPos = court(-3.2, 5.2);
    signGrp.position.set(signPos.x, 0, signPos.z);
    signGrp.rotation.y = 0.25;
    root.add(signGrp);

    const stanchionGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.85, 6);
    [-2.4, -0.8, 0.8, 2.4].forEach((lx, i) => {
        const post = new THREE.Mesh(stanchionGeo, metalMat);
        const wp = court(lx, 5.5);
        post.position.set(wp.x, 0.42, wp.z);
        root.add(post);
        if (i < 3) {
            const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.55, 4), ropeMat);
            rope.rotation.z = Math.PI / 2;
            const mid = court(lx + 0.8, 5.5);
            rope.position.set(mid.x, 0.72, mid.z);
            root.add(rope);
        }
    });

    // North edge — work bench, tool cart, storage (lab apron)
    const bench = new THREE.Group();
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.65), woodMat);
    benchTop.position.y = 0.78;
    const legGeo = new THREE.BoxGeometry(0.07, 0.78, 0.07);
    [[-0.78, -0.24], [0.78, -0.24], [-0.78, 0.24], [0.78, 0.24]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, woodMat);
        leg.position.set(x, 0.39, z);
        bench.add(leg);
    });
    bench.add(benchTop);
    const vise = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.22), metalMat);
    vise.position.set(0.55, 0.9, 0);
    bench.add(vise);
    const benchPos = court(-5.6, -5.2);
    bench.position.set(benchPos.x, 0, benchPos.z);
    bench.rotation.y = 0.15;
    root.add(bench);

    const cart = new THREE.Group();
    const cartBed = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.55), woodMat);
    cartBed.position.y = 0.42;
    const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 10);
    [[-0.32, 0.2], [0.32, 0.2], [-0.32, -0.2], [0.32, -0.2]].forEach(([x, z]) => {
        const w = new THREE.Mesh(wheelGeo, woodMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, 0.14, z);
        cart.add(w);
    });
    cart.add(cartBed);
    const cartBarrel = barrel(THREE, barrelMat, 0.75);
    cartBarrel.position.set(0, 0.5, 0);
    cart.add(cartBarrel);
    const cartPos = court(5.4, -5.0);
    cart.position.set(cartPos.x, 0, cartPos.z);
    cart.rotation.y = -0.45;
    root.add(cart);

    // Perimeter lamps — west / east colonnade
    [
        { lx: -8.2, lz: -1.5, ry: 0.6 },
        { lx: 8.2, lz: -1.2, ry: -0.55 },
        { lx: -7.8, lz: 4.0, ry: 0.3 },
        { lx: 7.6, lz: 3.8, ry: -0.28 },
    ].forEach((p) => {
        const lamp = gasLamp(THREE, poleMat, bulbMat.clone());
        const wp = court(p.lx, p.lz);
        lamp.position.set(wp.x, 0, wp.z);
        lamp.rotation.y = p.ry;
        root.add(lamp);
        if (lamp.userData.lampBulb) lampBulbs.push(lamp.userData.lampBulb);
    });

    // Scattered yard debris — wire coils, coal sacks
    const wireCoil = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 12), metalMat);
    addProp(root, wireCoil, court(-3.8, -4.6), 0.4);
    const wireCoil2 = wireCoil.clone();
    addProp(root, wireCoil2, court(3.6, -4.2), -0.6);

    const sackMat = new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 0.92, metalness: 0.02 });
    [-2.2, 2.5].forEach((lx, i) => {
        const sack = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), sackMat);
        sack.scale.set(1.1, 0.75, 0.9);
        addProp(root, sack, court(lx, -5.6), i * 0.5);
    });

    root.userData = {
        id: 'starter_courtyard_props',
        name: 'Courtyard Props',
        type: 'prop',
        locked: true,
        animCourtLamps: true,
        lampBulbs,
        signMesh: sign,
    };
    Engine.scene.add(root);
    State.objects.push(root);

    return root;
}

export const StarterCourtyard194 = {
    wireAnims() {
        const props = window.State?.objects?.find((o) => o.userData?.id === 'starter_courtyard_props');
        const bulbs = props?.userData?.lampBulbs || [];
        const sign = props?.userData?.signMesh;
        if (!bulbs.length && !sign) return;

        window.StarterAnim?.registerStarterAnim?.((t) => {
            const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
            const dusk = 0.38 + Math.sin(t * 0.35) * 0.04;
            bulbs.forEach((bulb, i) => {
                if (!bulb?.material) return;
                const flicker = Math.sin(t * 4.2 + i * 1.7) * 0.06;
                bulb.material.emissiveIntensity = dusk + flicker - rain * 0.08;
            });
            if (sign?.material) {
                sign.material.emissiveIntensity = 0.06 + Math.sin(t * 1.2) * 0.03;
            }
        });
    },
};

window.StarterCourtyard194 = StarterCourtyard194;
window.buildStarterCourtyard194 = buildStarterCourtyard194;