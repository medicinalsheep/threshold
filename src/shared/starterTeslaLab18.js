/** Phase 18.1 — Tesla lab annex: shell, coil, bench, bulbs, door + collisions */

const LAB_ORIGIN = { x: -9, y: 0, z: 2 };
const DOOR_POS = { x: -4.2, y: 0, z: 2 };

function addStaticBox(Physics, C, half, pos, surfaceType = 'wood') {
    if (C && Physics?.addStaticBox) {
        Physics.addStaticBox(new C.Vec3(half.x, half.y, half.z), pos, 'ground', surfaceType);
    }
}

export function buildStarterTeslaLab18() {
    const Engine = window.Engine;
    const State = window.State;
    const Physics = window.Physics;
    const THREE = window.THREE;
    const C = window.CANNON;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'starter_tesla_coil')) {
        return null;
    }

    const SM = window.StarterMaterials;
    const mats = SM?.createStarterMaterials?.(THREE);
    const woodMat = mats?.wood?.clone?.() || new THREE.MeshStandardMaterial({ color: 0x5a4838, roughness: 0.82, metalness: 0.04 });
    const wallMat = mats?.wall?.clone?.() || new THREE.MeshStandardMaterial({ color: 0x4a4e54, roughness: 0.78, metalness: 0.03 });
    const copperMat = new THREE.MeshStandardMaterial({
        color: 0xb86830,
        roughness: 0.28,
        metalness: 0.88,
        emissive: 0x401808,
        emissiveIntensity: 0.06,
        envMapIntensity: 0.55,
    });
    const brickMat = new THREE.MeshStandardMaterial({
        color: 0x8a5040,
        roughness: 0.88,
        metalness: 0.02,
        envMapIntensity: 0.22,
    });
    const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfff0c8,
        emissive: 0xffc860,
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.05,
        transparent: true,
        opacity: 0.92,
    });
    const arcMat = new THREE.MeshStandardMaterial({
        color: 0xa8e8ff,
        emissive: 0x48c8ff,
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.75,
    });

    const labGroup = new THREE.Group();
    labGroup.name = 'starter_tesla_lab';
    labGroup.position.set(LAB_ORIGIN.x, LAB_ORIGIN.y, LAB_ORIGIN.z);

    // —— Floor ——
    const floor = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 4.0), woodMat.clone());
    floor.position.set(0, 0.05, 0);
    floor.receiveShadow = true;
    floor.userData = { name: 'Tesla Lab Floor', surfaceType: 'wood' };
    labGroup.add(floor);
    addStaticBox(Physics, C, { x: 2.5, y: 0.05, z: 2.0 }, { x: LAB_ORIGIN.x, y: 0.05, z: LAB_ORIGIN.z }, 'wood');

    // —— Walls ——
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.0, 4.0), wallMat.clone());
    westWall.position.set(-2.41, 1.5, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    westWall.userData = { name: 'Tesla Lab Floor', surfaceType: 'wood' };
    labGroup.add(westWall);
    addStaticBox(Physics, C, { x: 0.09, y: 1.5, z: 2.0 }, { x: LAB_ORIGIN.x - 2.41, y: 1.5, z: LAB_ORIGIN.z });

    const northWall = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.0, 0.18), brickMat.clone());
    northWall.position.set(0, 1.5, 2.09);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    northWall.userData = { name: 'Tesla Brick Wall', surfaceType: 'concrete' };
    labGroup.add(northWall);
    addStaticBox(Physics, C, { x: 2.5, y: 1.5, z: 0.09 }, { x: LAB_ORIGIN.x, y: 1.5, z: LAB_ORIGIN.z + 2.09 });

    const southWall = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.0, 0.18), woodMat.clone());
    southWall.position.set(0, 1.5, -2.09);
    southWall.castShadow = true;
    southWall.userData = { name: 'Tesla Lab Floor', surfaceType: 'wood' };
    labGroup.add(southWall);
    addStaticBox(Physics, C, { x: 2.5, y: 1.5, z: 0.09 }, { x: LAB_ORIGIN.x, y: 1.5, z: LAB_ORIGIN.z - 2.09 });

    const eastNorth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.0, 1.35), wallMat.clone());
    eastNorth.position.set(2.41, 1.5, 1.32);
    eastNorth.castShadow = true;
    eastNorth.userData = { name: 'Tesla Lab Floor', surfaceType: 'wood' };
    labGroup.add(eastNorth);
    addStaticBox(Physics, C, { x: 0.09, y: 1.5, z: 0.675 }, { x: LAB_ORIGIN.x + 2.41, y: 1.5, z: LAB_ORIGIN.z + 1.32 });

    const eastSouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.0, 1.35), wallMat.clone());
    eastSouth.position.set(2.41, 1.5, -1.32);
    eastSouth.castShadow = true;
    labGroup.add(eastSouth);
    addStaticBox(Physics, C, { x: 0.09, y: 1.5, z: 0.675 }, { x: LAB_ORIGIN.x + 2.41, y: 1.5, z: LAB_ORIGIN.z - 1.32 });

    const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 1.3), wallMat.clone());
    doorHeader.position.set(2.41, 2.78, 0);
    labGroup.add(doorHeader);

    // —— Instrument bench (north wall) ——
    const benchGroup = new THREE.Group();
    benchGroup.name = 'starter_tesla_bench';
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.65), woodMat.clone());
    benchTop.position.set(0, 0.82, 0);
    benchTop.castShadow = true;
    benchTop.userData = { name: 'Tesla Bench', surfaceType: 'wood' };
    const benchLegL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), woodMat.clone());
    benchLegL.position.set(-0.95, 0.4, -0.22);
    const benchLegR = benchLegL.clone();
    benchLegR.position.set(0.95, 0.4, -0.22);
    const gauge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.04, 8),
        copperMat.clone()
    );
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(-0.55, 0.9, 0.08);
    gauge.userData = { name: 'Tesla Coil', surfaceType: 'metal' };
    const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.28, 8),
        new THREE.MeshStandardMaterial({ color: 0xd8e8f0, roughness: 0.08, metalness: 0.02, transparent: true, opacity: 0.55 })
    );
    jar.position.set(0.15, 0.98, 0.05);
    const switchBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.14), copperMat.clone());
    switchBox.position.set(0.65, 0.92, 0.02);
    switchBox.userData = { name: 'Tesla Coil', surfaceType: 'metal' };
    benchGroup.add(benchTop, benchLegL, benchLegR, gauge, jar, switchBox);
    benchGroup.position.set(0.4, 0, 1.55);
    benchGroup.rotation.y = -0.12;
    labGroup.add(benchGroup);
    addStaticBox(Physics, C, { x: 1.1, y: 0.41, z: 0.33 }, { x: LAB_ORIGIN.x + 0.4, y: 0.41, z: LAB_ORIGIN.z + 1.55 }, 'wood');

    // —— Tesla coil ——
    const coilGroup = new THREE.Group();
    coilGroup.name = 'starter_tesla_coil';
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.22, 8), woodMat.clone());
    base.position.y = 0.11;
    base.castShadow = true;
    base.userData = { name: 'Tesla Bench', surfaceType: 'wood' };
    const primary = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 6, 16), copperMat.clone());
    primary.rotation.x = Math.PI / 2;
    primary.position.y = 0.38;
    primary.userData = { name: 'Tesla Coil', surfaceType: 'metal', coilPart: true };
    const secondary = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.65, 8), copperMat.clone());
    secondary.position.y = 1.15;
    secondary.castShadow = true;
    secondary.userData = { name: 'Tesla Coil', surfaceType: 'metal', coilPart: true };
    const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 14), copperMat.clone());
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 2.05;
    topRing.userData = { name: 'Tesla Coil', surfaceType: 'metal', coilPart: true };
    const arcSphere = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), arcMat.clone());
    arcSphere.position.set(0, 2.18, 0);
    arcSphere.userData.arcCore = true;
    const cableA = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 4), copperMat.clone());
    cableA.position.set(-0.35, 1.6, 0.15);
    cableA.rotation.z = 0.35;
    const cableB = cableA.clone();
    cableB.position.set(0.32, 1.55, -0.12);
    cableB.rotation.z = -0.28;
    coilGroup.add(base, primary, secondary, topRing, arcSphere, cableA, cableB);
    coilGroup.position.set(-0.35, 0, -0.45);
    labGroup.add(coilGroup);

    const bulbs = [];
    [[-1.4, 2.55, 0.6], [-0.4, 2.62, -0.5], [0.6, 2.58, 0.35], [1.3, 2.52, -0.2]].forEach(([x, y, z], i) => {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 4), copperMat.clone());
        cord.position.set(x, y + 0.18, z);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), bulbMat.clone());
        bulb.position.set(x, y, z);
        bulb.userData.labBulb = true;
        bulb.userData.bulbPhase = i * 1.7;
        bulbs.push(bulb);
        labGroup.add(cord, bulb);
    });

    labGroup.userData = {
        id: 'starter_tesla_lab',
        name: 'Tesla Lab',
        type: 'prop',
        locked: true,
        ambientZone: 'tesla',
    };
    Engine.scene.add(labGroup);
    State.objects.push(labGroup);

    coilGroup.userData = {
        id: 'starter_tesla_coil',
        name: 'Tesla Coil',
        type: 'prop',
        locked: true,
        animTeslaCoil: true,
        arcMesh: arcSphere,
        coilParts: [primary, secondary, topRing],
        bulbs,
        sparkT: 0,
        sparkCooldown: 0,
    };
    State.objects.push(coilGroup);

    benchGroup.userData = {
        id: 'starter_tesla_bench',
        name: 'Tesla Bench',
        type: 'prop',
        locked: true,
    };
    State.objects.push(benchGroup);

    // —— Double doors to plaza ——
    const doorGroup = new THREE.Group();
    doorGroup.name = 'starter_tesla_door';
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.15, 1.35), wallMat.clone());
    frame.position.set(-0.52, 1.08, 0);
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, 0.58), woodMat.clone());
    doorL.position.set(-0.12, 1.0, -0.3);
    doorL.castShadow = true;
    doorL.userData.doorLeaf = true;
    doorL.userData.doorSide = 'left';
    const doorR = doorL.clone();
    doorR.position.set(-0.12, 1.0, 0.3);
    doorR.userData.doorSide = 'right';
    doorGroup.add(frame, doorL, doorR);
    doorGroup.position.set(DOOR_POS.x, DOOR_POS.y, DOOR_POS.z);
    doorGroup.rotation.y = Math.PI / 2;
    doorGroup.userData = {
        id: 'starter_tesla_door',
        name: 'Tesla Lab Door',
        type: 'prop',
        locked: true,
        interactAction: 'rp',
        interactLabel: 'Lab Doors',
        interactHint: 'Push double doors — exit to plaza',
        interactRadius: 2.4,
        soundMode: 'clip',
        soundClipId: 'starter_interior_door_creak',
        soundTrigger: 'interact',
        doorMeshes: [doorL, doorR],
        doorOpen: 0,
        surfaceType: 'wood',
    };
    Engine.scene.add(doorGroup);
    State.objects.push(doorGroup);
    addStaticBox(Physics, C, { x: 0.07, y: 1.08, z: 0.675 }, { x: DOOR_POS.x - 0.52, y: 1.08, z: DOOR_POS.z });

    // —— Transition pad (plaza side) ——
    const pad = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.06, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.9, metalness: 0.02 })
    );
    pad.position.set(-2.8, 0.03, 2);
    pad.receiveShadow = true;
    pad.userData = { id: 'starter_tesla_threshold', name: 'Lab Threshold', type: 'platform', locked: true, surfaceType: 'concrete' };
    Engine.scene.add(pad);
    State.objects.push(pad);
    addStaticBox(Physics, C, { x: 0.9, y: 0.03, z: 0.8 }, { x: -2.8, y: 0.03, z: 2 }, 'concrete');

    return { lab: labGroup, coil: coilGroup, bench: benchGroup, door: doorGroup };
}

export const StarterTeslaLab18 = {
    wireAnims() {
        const coil = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_coil');
        const door = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_door');

        if (coil?.userData?.animTeslaCoil) {
            const arc = coil.userData.arcMesh;
            const parts = coil.userData.coilParts || [];
            const bulbs = coil.userData.bulbs || [];
            window.StarterAnim?.registerStarterAnim?.((t, dt) => {
                const pulse = 0.55 + Math.sin(t * 8.5) * 0.25 + Math.sin(t * 23.0) * 0.12;
                if (arc?.material) {
                    arc.material.emissiveIntensity = pulse * 1.1;
                    arc.scale.setScalar(0.85 + Math.sin(t * 14) * 0.18);
                }
                parts.forEach((mesh, i) => {
                    if (!mesh?.material) return;
                    mesh.material.emissiveIntensity = 0.04 + Math.sin(t * 6 + i) * 0.03;
                });
                bulbs.forEach((bulb) => {
                    if (!bulb?.material) return;
                    const phase = bulb.userData.bulbPhase || 0;
                    bulb.material.emissiveIntensity = 0.42 + Math.sin(t * 3.2 + phase) * 0.12 + (Math.random() > 0.992 ? 0.35 : 0);
                });
                coil.userData.sparkCooldown = Math.max(0, (coil.userData.sparkCooldown || 0) - dt);
                if (coil.userData.sparkCooldown <= 0 && Math.random() > 0.985) {
                    coil.userData.sparkCooldown = 0.35 + Math.random() * 1.2;
                    window.TeslaLabAmbient?.playSpark?.();
                }
            });
        }

        if (door?.userData?.doorMeshes) {
            const leaves = door.userData.doorMeshes;
            window.StarterAnim?.registerStarterAnim?.((t, dt) => {
                const open = door.userData.doorOpen ?? 0;
                if (open > 0) {
                    door.userData.doorOpen = Math.max(0, open - dt * 0.45);
                }
                const swing = door.userData.doorOpen * 0.72;
                leaves.forEach((leaf) => {
                    const side = leaf.userData.doorSide === 'left' ? 1 : -1;
                    leaf.rotation.y = side * swing;
                });
            });
        }
    },

    onDoorInteract(door) {
        if (!door?.userData) return;
        door.userData.doorOpen = 1;
    },
};

window.StarterTeslaLab18 = StarterTeslaLab18;
window.buildStarterTeslaLab18 = buildStarterTeslaLab18;