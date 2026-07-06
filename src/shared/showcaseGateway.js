/** Polished visitor gateway — replaces blocky courtyard toy props */

import { SITE, court } from './starterSiteLayout.js';

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
        envMapIntensity: 0.28,
    });
    const copperMat = mats?.copper || new THREE.MeshStandardMaterial({
        color: 0xb87848,
        roughness: 0.38,
        metalness: 0.72,
        envMapIntensity: 0.45,
    });
    const woodMat = mats?.wood || new THREE.MeshStandardMaterial({
        color: 0x5a4838,
        roughness: 0.82,
        metalness: 0.04,
    });

    const root = new THREE.Group();
    root.name = 'showcase_gateway';

    const postGeo = new THREE.CylinderGeometry(0.14, 0.16, 2.35, 12);
    const capGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.12, 12);
    [-3.8, 3.8].forEach((lx) => {
        const post = new THREE.Mesh(postGeo, stoneMat);
        post.position.set(lx, 1.18, 0);
        post.castShadow = true;
        const cap = new THREE.Mesh(capGeo, copperMat);
        cap.position.set(lx, 2.42, 0);
        root.add(post, cap);
    });

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.22, 0.38), stoneMat);
    lintel.position.set(0, 2.28, 0);
    lintel.castShadow = true;
    root.add(lintel);

    const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.9, 0.08),
        woodMat
    );
    signBoard.position.set(0, 1.55, 0.22);
    const signPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1, 0.55),
        new THREE.MeshStandardMaterial({
            color: 0xe8dcc8,
            emissive: 0x806040,
            emissiveIntensity: 0.18,
            roughness: 0.72,
            metalness: 0.02,
            side: THREE.DoubleSide,
        })
    );
    signPlane.position.set(0, 1.58, 0.28);
    root.add(signBoard, signPlane);

    const lampMat = new THREE.MeshStandardMaterial({
        color: 0xfff0d0,
        emissive: 0xffd8a0,
        emissiveIntensity: 0.55,
        roughness: 0.35,
    });
    [-3.2, 3.2].forEach((lx) => {
        const fixture = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), lampMat);
        fixture.position.set(lx, 2.05, 0.18);
        const light = new THREE.PointLight(0xffe8c8, 0.65, 9, 1.8);
        light.position.set(lx, 1.95, 0.18);
        root.add(fixture, light);
    });

    const inlay = new THREE.Mesh(
        new THREE.PlaneGeometry(7.2, 2.4),
        new THREE.MeshStandardMaterial({
            color: 0x6a6458,
            roughness: 0.92,
            metalness: 0.02,
        })
    );
    inlay.rotation.x = -Math.PI / 2;
    inlay.position.set(0, 0.062, 0.4);
    inlay.receiveShadow = true;
    root.add(inlay);

    root.position.set(court(0, 4.2).x, 0, court(0, 4.2).z);
    root.userData = {
        id: 'showcase_gateway',
        name: 'Visitor Gateway',
        type: 'prop',
        locked: true,
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

window.buildShowcaseGateway = buildShowcaseGateway;