/** Phase 18.1b — Wardenclyffe exterior: brick lab, lattice tower, field, project-build intro */

export const EXTERIOR_SPAWN = { x: -32, y: 0, z: 12 };
export const BUILDING_CENTER = { x: -32, y: 0, z: 0 };
export const TOWER_BASE = { x: -22, y: 0, z: -5 };

function addStaticBox(Physics, C, half, pos, surfaceType = 'concrete') {
    if (C && Physics?.addStaticBox) {
        Physics.addStaticBox(new C.Vec3(half.x, half.y, half.z), pos, 'ground', surfaceType);
    }
}

function addLatticeSide(group, THREE, woodMat, width, height, depth, x, z, rotY = 0) {
    const seg = 7;
    const step = height / seg;
    for (let i = 0; i <= seg; i += 1) {
        const y = i * step;
        const taper = 1 - (i / seg) * 0.55;
        const w = width * taper;
        const horiz = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), woodMat);
        horiz.position.set(x, y + 0.03, z);
        horiz.rotation.y = rotY;
        group.add(horiz);
        if (i < seg) {
            const diagA = new THREE.Mesh(new THREE.BoxGeometry(0.05, step * 1.05, 0.05), woodMat);
            diagA.position.set(x - w * 0.22, y + step * 0.5, z);
            diagA.rotation.z = 0.55;
            diagA.rotation.y = rotY;
            const diagB = diagA.clone();
            diagB.position.set(x + w * 0.22, y + step * 0.5, z);
            diagB.rotation.z = -0.55;
            group.add(diagA, diagB);
        }
    }
    const vert = new THREE.Mesh(new THREE.BoxGeometry(0.07, height, 0.07), woodMat);
    vert.position.set(x, height * 0.5, z);
    vert.rotation.y = rotY;
    group.add(vert);
}

export function buildStarterTeslaExterior18() {
    const Engine = window.Engine;
    const State = window.State;
    const Physics = window.Physics;
    const THREE = window.THREE;
    const C = window.CANNON;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'starter_tesla_exterior')) {
        return null;
    }

    const SM = window.StarterMaterials;
    const mats = SM?.createStarterMaterials?.(THREE);
    const brickMat = new THREE.MeshStandardMaterial({
        color: 0xa85840,
        roughness: 0.9,
        metalness: 0.02,
        envMapIntensity: 0.24,
    });
    brickMat.userData = { name: 'Tesla Brick Wall' };
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a2830, roughness: 0.82, metalness: 0.06 });
    const woodMat = mats?.wood?.clone?.() || new THREE.MeshStandardMaterial({ color: 0x6a5038, roughness: 0.84, metalness: 0.03 });
    const fieldMat = new THREE.MeshStandardMaterial({ color: 0x4a8a42, roughness: 0.92, metalness: 0.01 });
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 0.95, metalness: 0.02 });
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2e6838, roughness: 0.88, metalness: 0.01 });
    const windowMat = new THREE.MeshStandardMaterial({
        color: 0x88a8c8,
        roughness: 0.12,
        metalness: 0.08,
        emissive: 0x203040,
        emissiveIntensity: 0.04,
        transparent: true,
        opacity: 0.72,
    });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.72, metalness: 0.04 });
    const cageMat = new THREE.MeshStandardMaterial({
        color: 0x3a3028,
        roughness: 0.45,
        metalness: 0.35,
        emissive: 0x1a1008,
        emissiveIntensity: 0.08,
    });

    const root = new THREE.Group();
    root.name = 'starter_tesla_exterior';

    // —— Field + path ——
    const field = new THREE.Mesh(new THREE.BoxGeometry(52, 0.08, 44), fieldMat.clone());
    field.position.set(-28, 0.04, 2);
    field.receiveShadow = true;
    field.userData = { name: 'Tesla Field', surfaceType: 'grass' };
    root.add(field);
    addStaticBox(Physics, C, { x: 26, y: 0.04, z: 22 }, { x: -28, y: 0.04, z: 2 }, 'grass');

    const path = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 16), pathMat.clone());
    path.position.set(BUILDING_CENTER.x, 0.05, 8);
    path.receiveShadow = true;
    path.userData = { name: 'Tesla Field', surfaceType: 'gravel' };
    root.add(path);

    const connector = new THREE.Mesh(new THREE.BoxGeometry(14, 0.05, 2.2), pathMat.clone());
    connector.position.set(-20, 0.05, 3);
    connector.rotation.y = -0.18;
    root.add(connector);

    // —— Tree line ——
    for (let i = 0; i < 14; i += 1) {
        const tx = -48 + i * 3.6;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 5), woodMat.clone());
        trunk.position.set(tx, 0.8, -16);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.9 + (i % 3) * 0.15, 2.4, 6), treeMat.clone());
        crown.position.set(tx, 2.5, -16);
        root.add(trunk, crown);
    }

    // —— Brick laboratory building ——
    const building = new THREE.Group();
    building.name = 'starter_tesla_building';
    const bw = 12;
    const bd = 5.2;
    const bh = 3.6;

    const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.14, bd), brickMat.clone());
    floorSlab.position.set(0, 0.07, 0);
    floorSlab.userData = { name: 'Tesla Brick Wall' };
    building.add(floorSlab);

    const walls = [
        { sx: bw, sz: 0.22, px: 0, pz: bd / 2, name: 'south' },
        { sx: bw, sz: 0.22, px: 0, pz: -bd / 2, name: 'north' },
        { sx: 0.22, sz: bd, px: -bw / 2, pz: 0, name: 'west' },
        { sx: 0.22, sz: bd, px: bw / 2, pz: 0, name: 'east' },
    ];
    walls.forEach((w) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.sx, bh, w.sz), brickMat.clone());
        mesh.position.set(w.px, bh / 2 + 0.14, w.pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { name: 'Tesla Brick Wall', surfaceType: 'concrete' };
        building.add(mesh);
        addStaticBox(Physics, C, { x: w.sx / 2, y: bh / 2, z: w.sz / 2 }, {
            x: BUILDING_CENTER.x + w.px,
            y: bh / 2 + 0.14,
            z: BUILDING_CENTER.z + w.pz,
        });
    });

    const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, 0.35, bd + 0.4), roofMat.clone());
    roof.position.set(0, bh + 0.32, 0);
    building.add(roof);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 0.9), brickMat.clone());
    chimney.position.set(-bw / 2 + 1.1, bh + 1.5, -bd / 2 + 0.8);
    chimney.castShadow = true;
    chimney.userData = { name: 'Tesla Brick Wall' };
    building.add(chimney);

    const windowMeshes = [];
    [-4.2, -2.1, 0, 2.1, 4.2].forEach((xOff, i) => {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.65, 0.08), brickMat.clone());
        frame.position.set(xOff, 1.85, bd / 2 + 0.1);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.35, 0.05), windowMat.clone());
        glass.position.set(xOff, 1.9, bd / 2 + 0.14);
        glass.userData.labWindow = true;
        glass.userData.windowPhase = i * 0.9;
        windowMeshes.push(glass);
        building.add(frame, glass);
    });

    const signTex = SM?.makeBillboardTex?.(THREE, 'THRESHOLD', 'RESEARCH LAB');
    const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 0.55),
        new THREE.MeshStandardMaterial({
            map: signTex || null,
            color: 0xf0e8d0,
            emissive: signTex ? 0x604020 : 0x806030,
            emissiveMap: signTex || null,
            emissiveIntensity: 0.05,
            roughness: 0.7,
            side: THREE.DoubleSide,
        })
    );
    sign.position.set(0, 3.35, bd / 2 + 0.16);
    sign.userData.labSign = true;
    building.add(sign);

    const doorGroup = new THREE.Group();
    doorGroup.name = 'starter_tesla_exterior_door';
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.25, 0.14), brickMat.clone());
    doorFrame.position.set(0, 1.2, bd / 2 + 0.08);
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.05, 0.06), doorMat.clone());
    doorL.position.set(-0.34, 1.1, bd / 2 + 0.18);
    doorL.userData.doorSide = 'left';
    const doorR = doorL.clone();
    doorR.position.set(0.34, 1.1, bd / 2 + 0.18);
    doorR.userData.doorSide = 'right';
    doorGroup.add(doorFrame, doorL, doorR);
    building.add(doorGroup);

    building.position.set(BUILDING_CENTER.x, 0, BUILDING_CENTER.z);
    root.add(building);

    doorGroup.userData = {
        id: 'starter_tesla_exterior_door',
        name: 'Lab Entrance',
        type: 'prop',
        locked: true,
        interactAction: 'rp',
        interactLabel: 'Lab Entrance',
        interactHint: 'Enter Threshold Research Lab',
        interactRadius: 2.8,
        soundMode: 'clip',
        soundClipId: 'starter_interior_door_creak',
        soundTrigger: 'interact',
        doorMeshes: [doorL, doorR],
        doorOpen: 0,
    };

    // —— Lattice transmission tower ——
    const tower = new THREE.Group();
    tower.name = 'starter_tesla_tower';
    const towerH = 17.5;
    const basePad = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 4.2), woodMat.clone());
    basePad.position.y = 0.1;
    tower.add(basePad);
    addLatticeSide(tower, THREE, woodMat.clone(), 3.6, towerH, 0.08, -1.6, -1.6, 0);
    addLatticeSide(tower, THREE, woodMat.clone(), 3.6, towerH, 0.08, 1.6, -1.6, 0);
    addLatticeSide(tower, THREE, woodMat.clone(), 3.6, towerH, 0.08, -1.6, 1.6, Math.PI / 2);
    addLatticeSide(tower, THREE, woodMat.clone(), 3.6, towerH, 0.08, 1.6, 1.6, Math.PI / 2);

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.18, 12), woodMat.clone());
    platform.position.y = towerH + 0.1;
    tower.add(platform);

    const cage = new THREE.Mesh(new THREE.SphereGeometry(1.05, 10, 8), cageMat.clone());
    cage.position.y = towerH + 1.35;
    cage.userData.towerCage = true;
    tower.add(cage);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.07, 6, 16), cageMat.clone());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = towerH + 0.55;
    ring.userData.towerRing = true;
    tower.add(ring);

    for (let i = 0; i < 8; i += 1) {
        const ang = (i / 8) * Math.PI * 2;
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.8, 4), cageMat.clone());
        wire.position.set(Math.cos(ang) * 0.9, towerH + 1.8, Math.sin(ang) * 0.9);
        wire.rotation.x = 0.35;
        wire.rotation.y = ang;
        tower.add(wire);
    }

    tower.position.set(TOWER_BASE.x, 0, TOWER_BASE.z);
    root.add(tower);
    addStaticBox(Physics, C, { x: 2.1, y: 0.1, z: 2.1 }, { x: TOWER_BASE.x, y: 0.1, z: TOWER_BASE.z }, 'wood');

    // —— Project-build scaffolding ——
    const scaffold = new THREE.Group();
    scaffold.name = 'starter_tesla_scaffold';
    [[-1.8, 0, 2.2], [1.8, 0, 2.2], [-1.8, 0, -2.2], [1.8, 0, -2.2]].forEach(([x, y, z]) => {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.2, 0.1), woodMat.clone());
        pole.position.set(x, 2.1, z);
        scaffold.add(pole);
    });
    [0, 1.4, 2.8].forEach((y) => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.08, 0.08), woodMat.clone());
        bar.position.set(0, y + 0.5, 2.2);
        scaffold.add(bar);
    });
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xe86820, roughness: 0.72 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 6), coneMat);
    cone.position.set(2.6, 0.21, 3.2);
    scaffold.add(cone);
    scaffold.position.set(TOWER_BASE.x, 0, TOWER_BASE.z);
    root.add(scaffold);

    root.position.set(0, 0, 0);
    root.userData = {
        id: 'starter_tesla_exterior',
        name: 'Tesla Exterior',
        type: 'prop',
        locked: true,
        animProjectBuild: true,
        projectBuildT: 0,
        projectBuildDone: false,
        windows: windowMeshes,
        signMesh: sign,
        towerCage: cage,
        towerRing: ring,
        scaffold,
        building,
        tower,
    };
    Engine.scene.add(root);
    State.objects.push(root);
    State.objects.push(building);
    State.objects.push(tower);
    State.objects.push(doorGroup);

    return { root, building, tower, door: doorGroup };
}

export const StarterTeslaExterior18 = {
    wireAnims() {
        const ext = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_exterior');
        const door = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_exterior_door');
        if (!ext?.userData?.animProjectBuild) return;

        const windows = ext.userData.windows || [];
        const sign = ext.userData.signMesh;
        const cage = ext.userData.towerCage;
        const ring = ext.userData.towerRing;
        const scaffold = ext.userData.scaffold;

        window.StarterAnim?.registerStarterAnim?.((t, dt) => {
            if (!ext.userData.projectBuildDone) {
                ext.userData.projectBuildT = Math.min(28, (ext.userData.projectBuildT || 0) + dt);
                const p = ext.userData.projectBuildT;
                if (scaffold) {
                    const fade = Math.max(0, 1 - p / 12);
                    scaffold.scale.setScalar(0.65 + fade * 0.35);
                    scaffold.visible = fade > 0.05;
                }
                if (p > 4 && p < 4.2) window.UI?.status?.('THRESHOLD LAB — lattice tower online');
                if (p > 9 && p < 9.2) window.UI?.status?.('THRESHOLD LAB — facade power sync');
                if (p > 16 && p < 16.2) window.UI?.status?.('THRESHOLD LAB — project ready · enter the annex');
                if (p >= 28) ext.userData.projectBuildDone = true;
            }

            const build = Math.min(1, (ext.userData.projectBuildT || 0) / 18);
            windows.forEach((win) => {
                if (!win?.material) return;
                const phase = win.userData.windowPhase || 0;
                win.material.emissiveIntensity = build * 0.35 + Math.sin(t * 2.2 + phase) * 0.04;
            });
            if (sign?.material) {
                sign.material.emissiveIntensity = 0.05 + build * 0.42 + Math.sin(t * 1.8) * 0.06;
            }
            if (cage?.material) {
                cage.material.emissiveIntensity = 0.06 + build * 0.55 + Math.sin(t * 5.5) * 0.12;
            }
            if (ring?.material) {
                ring.material.emissiveIntensity = 0.04 + build * 0.28;
            }
        });

        if (door?.userData?.doorMeshes) {
            const leaves = door.userData.doorMeshes;
            window.StarterAnim?.registerStarterAnim?.((_t, dt) => {
                const open = door.userData.doorOpen ?? 0;
                if (open > 0) door.userData.doorOpen = Math.max(0, open - dt * 0.4);
                const swing = door.userData.doorOpen * 0.85;
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
        const PC = window.PlayerController;
        const labDoor = { x: -4.2, y: 0, z: 2.5 };
        if (PC?.spawned && PC.group) {
            PC.body?.position?.set?.(labDoor.x, PC.body.position.y, labDoor.z);
            PC.group.position.set(labDoor.x, PC.group.position.y, labDoor.z);
            PC._camYaw = -Math.PI / 2;
            PC._camPitch = 0.22;
        }
        window.UI?.status?.('Inside annex — coil hum ahead · plaza east');
    },
};

window.EXTERIOR_SPAWN = EXTERIOR_SPAWN;
window.StarterTeslaExterior18 = StarterTeslaExterior18;
window.buildStarterTeslaExterior18 = buildStarterTeslaExterior18;