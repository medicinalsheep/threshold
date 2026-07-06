/** Phase 18.1b / 19 — Wardenclyffe exterior: brick lab, lattice tower, unified site */

import {
    SITE, BUILDING, EXTERIOR_SPAWN, BUILDING_CENTER, TOWER_BASE,
} from './starterSiteLayout.js';

export { EXTERIOR_SPAWN, BUILDING_CENTER, TOWER_BASE };

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
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2e6838, roughness: 0.88, metalness: 0.01 });
    const linerMat = mats?.wood?.clone?.() || new THREE.MeshStandardMaterial({ color: 0x5a4838, roughness: 0.84, metalness: 0.03 });
    const windowMat = new THREE.MeshPhysicalMaterial({
        color: 0x88a8c8,
        roughness: 0.08,
        metalness: 0.06,
        transmission: 0.72,
        transparent: true,
        opacity: 0.58,
        thickness: 0.08,
        ior: 1.52,
        emissive: 0x203040,
        emissiveIntensity: 0.04,
        envMapIntensity: 0.45,
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

    // —— Tree line (north property edge) ——
    for (let i = 0; i < 16; i += 1) {
        const tx = -28 + i * 3.6;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 5), woodMat.clone());
        trunk.position.set(tx, 0.8, SITE.treeLineZ);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.9 + (i % 3) * 0.15, 2.4, 6), treeMat.clone());
        crown.position.set(tx, 2.5, SITE.treeLineZ);
        root.add(trunk, crown);
    }

    // —— Brick laboratory building ——
    const building = new THREE.Group();
    building.name = 'starter_tesla_building';
    const { w: bw, d: bd, h: bh, wall: wt, floorY, southZ, doorW } = BUILDING;
    const wallY = bh / 2 + floorY;

    const shellGroup = new THREE.Group();
    shellGroup.name = 'starter_tesla_building_shell';
    shellGroup.userData = { id: 'starter_tesla_building_shell', buildingShell: true };

    const linerGroup = new THREE.Group();
    linerGroup.name = 'starter_tesla_building_liner';
    linerGroup.userData = { id: 'starter_tesla_building_liner', buildingLiner: true };

    const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.14, bd), brickMat.clone());
    floorSlab.position.set(0, floorY - 0.07, 0);
    floorSlab.userData = { name: 'Tesla Brick Wall' };
    shellGroup.add(floorSlab);

    const addWall = (sx, sy, sz, px, py, pz, parent = shellGroup) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), brickMat.clone());
        mesh.position.set(px, py, pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { name: 'Tesla Brick Wall', surfaceType: 'concrete' };
        parent.add(mesh);
        return mesh;
    };

    const northZ = -bd / 2;
    addWall(bw, bh, wt, 0, wallY, northZ);
    addWall(wt, bh, bd, -bw / 2, wallY, 0);
    addWall(wt, bh, bd, bw / 2, wallY, 0);

    const doorHalf = doorW / 2;
    const segW = (bw - doorW) / 2;
    addWall(segW, bh, wt, -(doorHalf + segW / 2), wallY, southZ);
    addWall(segW, bh, wt, doorHalf + segW / 2, wallY, southZ);
    addWall(doorW, bh * 0.22, wt, 0, floorY + bh * 0.89, southZ);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, 0.35, bd + 0.4), roofMat.clone());
    roof.position.set(0, floorY + bh + 0.18, 0);
    shellGroup.add(roof);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 0.9), brickMat.clone());
    chimney.position.set(-bw / 2 + 1.1, floorY + bh + 1.5, -bd / 2 + 0.8);
    chimney.castShadow = true;
    chimney.userData = { name: 'Tesla Brick Wall' };
    shellGroup.add(chimney);

    const linerInset = 0.12;
    const linerH = bh - 0.25;
    const linerY = floorY + linerH / 2 + 0.05;
    const innerW = bw - wt * 2 - linerInset * 2;
    const innerD = bd - wt * 2 - linerInset * 2;
    [
        { sx: innerW, sz: 0.06, px: 0, pz: -bd / 2 + wt + linerInset },
        { sx: innerW, sz: 0.06, px: 0, pz: bd / 2 - wt - linerInset },
        { sx: 0.06, sz: innerD, px: -bw / 2 + wt + linerInset, pz: 0 },
        { sx: 0.06, sz: innerD, px: bw / 2 - wt - linerInset, pz: 0 },
    ].forEach((seg) => {
        const liner = new THREE.Mesh(new THREE.BoxGeometry(seg.sx, linerH, seg.sz), linerMat.clone());
        liner.position.set(seg.px, linerY, seg.pz);
        liner.receiveShadow = true;
        liner.userData = { name: 'Tesla Lab Floor', surfaceType: 'wood' };
        linerGroup.add(liner);
    });

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.35, 0.1, bd - 0.35), linerMat.clone());
    ceiling.position.set(0, floorY + bh - 0.08, 0);
    ceiling.receiveShadow = true;
    ceiling.userData = { name: 'Tesla Lab Floor', surfaceType: 'wood' };
    linerGroup.add(ceiling);

    building.add(shellGroup, linerGroup);
    addStaticBox(Physics, C, { x: bw / 2, y: bh / 2, z: bd / 2 }, {
        x: BUILDING_CENTER.x,
        y: wallY,
        z: BUILDING_CENTER.z,
    });

    const windowMeshes = [];
    [-4.2, -2.1, 2.1, 4.2].forEach((xOff, i) => {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.65, 0.08), brickMat.clone());
        frame.position.set(xOff, floorY + 1.85, southZ + 0.1);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.35, 0.05), windowMat.clone());
        glass.position.set(xOff, floorY + 1.9, southZ + 0.14);
        glass.userData.labWindow = true;
        glass.userData.wetGlass = true;
        glass.userData.surfaceType = 'glass';
        glass.userData.windowPhase = i * 0.9;
        if (glass.material) {
            glass.material.userData = glass.material.userData || {};
            glass.material.userData._dryRoughness = glass.material.roughness;
            glass.material.userData._dryOpacity = glass.material.opacity;
            glass.material.userData._dryTransmission = glass.material.transmission;
        }
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
    sign.position.set(0, floorY + 3.35, southZ + 0.16);
    sign.userData.labSign = true;
    building.add(sign);

    const doorGroup = new THREE.Group();
    doorGroup.name = 'starter_tesla_exterior_door';
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.25, 0.14), brickMat.clone());
    doorFrame.position.set(0, floorY + 1.2, southZ + 0.08);
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.05, 0.06), doorMat.clone());
    doorL.position.set(-0.34, floorY + 1.1, southZ + 0.18);
    doorL.userData.doorSide = 'left';
    const doorR = doorL.clone();
    doorR.position.set(0.34, floorY + 1.1, southZ + 0.18);
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
        interactHint: 'Enter Threshold Research Lab — walk inside',
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
    State.objects.push(shellGroup);
    State.objects.push(linerGroup);
    State.objects.push(tower);
    State.objects.push(doorGroup);

    window.StarterTeslaWeather184?.registerSouthLabWindows?.();

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
        const entry = SITE.interiorEntry;
        if (PC?.spawned && PC.group) {
            const py = Math.max(1.2, BUILDING.floorY + 1.06);
            PC.body?.position?.set?.(entry.x, py, entry.z);
            PC.group.position.set(entry.x, py, entry.z);
            PC._camYaw = Math.PI;
            PC._camPitch = 0.18;
        }
        window.UI?.status?.('Inside the lab — coil hum ahead · courtyard south');
    },
};
window.StarterTeslaExterior18 = StarterTeslaExterior18;
window.buildStarterTeslaExterior18 = buildStarterTeslaExterior18;