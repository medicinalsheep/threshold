/** Phase 19.1 / Sprint L — site terrain + approach curbs + PBR names */

import { SITE, court, BUILDING } from './starterSiteLayout.js';

function addGroundBox(Physics, C, half, pos, surfaceType) {
    if (C && Physics?.addStaticBox) {
        Physics.addStaticBox(new C.Vec3(half.x, half.y, half.z), pos, 'ground', surfaceType);
    }
}

function addPathCurbs(root, THREE, mat, pathX, pathHalfW, zMin, zMax) {
    const step = 1.1;
    const curbGeo = new THREE.BoxGeometry(0.18, 0.11, 0.5);
    for (let z = zMin; z <= zMax; z += step) {
        [-1, 1].forEach((side) => {
            const curb = new THREE.Mesh(curbGeo, mat);
            curb.position.set(pathX + side * (pathHalfW + 0.14), 0.078, z);
            curb.castShadow = true;
            curb.receiveShadow = true;
            curb.userData = { name: 'Approach Curb', surfaceType: 'stone' };
            root.add(curb);
        });
    }
}

export function buildStarterSiteTerrain191() {
    const Engine = window.Engine;
    const State = window.State;
    const Physics = window.Physics;
    const THREE = window.THREE;
    const C = window.CANNON;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'starter_site_terrain')) {
        return null;
    }

    const SM = window.StarterMaterials;
    const mats = SM?.createStarterMaterials?.(THREE);
    const grassMat = new THREE.MeshStandardMaterial({
        color: 0x4a8a42,
        roughness: 0.88,
        metalness: 0.02,
        envMapIntensity: 0.28,
    });
    grassMat.userData = { name: 'Tesla Field' };

    const gravelMat = mats?.path?.clone?.() || new THREE.MeshStandardMaterial({
        color: 0x8a7a62,
        roughness: 0.92,
        metalness: 0.02,
        envMapIntensity: 0.22,
    });
    gravelMat.userData = { name: 'Gravel Path', surfaceType: 'gravel' };

    const courtMat = mats?.asphalt?.clone?.() || new THREE.MeshStandardMaterial({
        color: 0x5a5e62,
        roughness: 0.8,
        metalness: 0.08,
        envMapIntensity: 0.34,
    });
    courtMat.userData = { name: 'Visitor Courtyard', surfaceType: 'concrete' };

    const curbMat = mats?.wall?.clone?.() || new THREE.MeshStandardMaterial({
        color: 0x5a5e64,
        roughness: 0.78,
        metalness: 0.06,
        envMapIntensity: 0.3,
    });
    curbMat.userData = { name: 'Approach Curb' };

    const root = new THREE.Group();
    root.name = 'starter_site_terrain';

    const grass = new THREE.Mesh(
        new THREE.BoxGeometry(SITE.field.w, 0.06, SITE.field.d),
        grassMat
    );
    grass.position.set(SITE.field.x, 0.03, SITE.field.z);
    grass.receiveShadow = true;
    grass.userData = { name: 'Tesla Field', surfaceType: 'grass' };
    root.add(grass);
    addGroundBox(Physics, C, { x: SITE.field.w / 2, y: 0.03, z: SITE.field.d / 2 }, { x: SITE.field.x, y: 0.03, z: SITE.field.z }, 'grass');

    const courtCenter = court(0, 0);
    const courtyard = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 14, 6, 4),
        courtMat
    );
    courtyard.rotation.x = -Math.PI / 2;
    courtyard.position.set(courtCenter.x, 0.058, courtCenter.z);
    courtyard.receiveShadow = true;
    courtyard.userData = {
        id: 'starter_ground',
        name: 'Visitor Courtyard',
        type: 'platform',
        locked: true,
        surfaceType: 'concrete',
    };
    root.add(courtyard);
    addGroundBox(Physics, C, { x: 9, y: 0.025, z: 7 }, { x: courtCenter.x, y: 0.055, z: courtCenter.z }, 'concrete');

    const pathMat = gravelMat.clone();
    pathMat.userData = { name: 'Approach Path', surfaceType: 'gravel' };
    const path = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 14, 2, 8),
        pathMat
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(SITE.building.x, 0.054, 11);
    path.receiveShadow = true;
    path.userData = {
        id: 'starter_approach_path',
        name: 'Approach Path',
        type: 'platform',
        locked: true,
        surfaceType: 'gravel',
    };
    root.add(path);
    addGroundBox(Physics, C, { x: 1.3, y: 0.02, z: 7 }, { x: SITE.building.x, y: 0.052, z: 11 }, 'gravel');
    addPathCurbs(root, THREE, curbMat, SITE.building.x, 1.3, 4.5, 17.5);

    const apronMat = gravelMat.clone();
    apronMat.userData = { name: 'Lab Threshold', surfaceType: 'gravel' };
    const apron = new THREE.Mesh(
        new THREE.PlaneGeometry(8.2, 3.4, 4, 2),
        apronMat
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(SITE.building.x, 0.054, BUILDING.southZ + 1.85);
    apron.receiveShadow = true;
    apron.userData = {
        id: 'starter_lab_apron',
        name: 'Lab Threshold',
        type: 'platform',
        locked: true,
        surfaceType: 'gravel',
    };
    root.add(apron);
    addGroundBox(Physics, C, { x: 4.1, y: 0.02, z: 1.7 }, { x: SITE.building.x, y: 0.052, z: BUILDING.southZ + 1.85 }, 'gravel');

    const thresholdMat = gravelMat.clone();
    thresholdMat.userData = { name: 'Lab Threshold', surfaceType: 'gravel' };
    const threshold = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 2.1, 2, 2),
        thresholdMat
    );
    threshold.rotation.x = -Math.PI / 2;
    threshold.position.set(SITE.courtyardEntry.x, 0.052, SITE.courtyardEntry.z);
    threshold.receiveShadow = true;
    threshold.userData = {
        id: 'starter_tesla_threshold',
        name: 'Lab Threshold',
        type: 'platform',
        locked: true,
        surfaceType: 'gravel',
    };
    root.add(threshold);
    addGroundBox(Physics, C, { x: 1.25, y: 0.018, z: 1.05 }, { x: SITE.courtyardEntry.x, y: 0.05, z: SITE.courtyardEntry.z }, 'gravel');

    root.userData = {
        id: 'starter_site_terrain',
        name: 'Wardenclyffe Terrain',
        type: 'prop',
        locked: true,
    };
    Engine.scene.add(root);
    State.objects.push(root);
    State.objects.push(courtyard);
    State.objects.push(path);
    State.objects.push(threshold);

    return root;
}

window.buildStarterSiteTerrain191 = buildStarterSiteTerrain191;