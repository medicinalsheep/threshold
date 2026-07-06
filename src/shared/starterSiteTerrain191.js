/** Phase 19.1 — unified site terrain: grass field, gravel courtyard, approach path */

import { SITE, court, BUILDING } from './starterSiteLayout.js';

function addGroundBox(Physics, C, half, pos, surfaceType) {
    if (C && Physics?.addStaticBox) {
        Physics.addStaticBox(new C.Vec3(half.x, half.y, half.z), pos, 'ground', surfaceType);
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
        envMapIntensity: 0.26,
    });
    grassMat.userData = { name: 'Tesla Field' };
    const gravelMat = mats?.path || new THREE.MeshStandardMaterial({
        color: 0x8a7a62,
        roughness: 0.95,
        metalness: 0.02,
        envMapIntensity: 0.16,
    });
    gravelMat.userData = { name: 'Tesla Field', surfaceType: 'gravel' };
    const courtMat = new THREE.MeshStandardMaterial({
        color: 0x5a5e62,
        roughness: 0.82,
        metalness: 0.06,
        envMapIntensity: 0.32,
    });

    const root = new THREE.Group();
    root.name = 'starter_site_terrain';

    const grass = new THREE.Mesh(
        new THREE.BoxGeometry(SITE.field.w, 0.06, SITE.field.d),
        grassMat
    );
    grass.position.set(SITE.field.x, 0.03, SITE.field.z);
    grass.receiveShadow = true;
    root.add(grass);
    addGroundBox(Physics, C, { x: SITE.field.w / 2, y: 0.03, z: SITE.field.d / 2 }, { x: SITE.field.x, y: 0.03, z: SITE.field.z }, 'grass');

    const courtCenter = court(0, 0);
    const courtyard = new THREE.Mesh(new THREE.BoxGeometry(18, 0.05, 14), courtMat);
    courtyard.position.set(courtCenter.x, 0.055, courtCenter.z);
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

    const path = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 14), gravelMat.clone());
    path.position.set(SITE.building.x, 0.052, 11);
    path.receiveShadow = true;
    path.userData = { name: 'Tesla Field', surfaceType: 'gravel' };
    root.add(path);
    addGroundBox(Physics, C, { x: 1.3, y: 0.02, z: 7 }, { x: SITE.building.x, y: 0.052, z: 11 }, 'gravel');

    const apron = new THREE.Mesh(new THREE.BoxGeometry(8, 0.04, 3.2), gravelMat.clone());
    apron.position.set(SITE.building.x, 0.052, BUILDING.southZ + 1.85);
    apron.receiveShadow = true;
    apron.userData = { name: 'Tesla Field', surfaceType: 'gravel' };
    root.add(apron);
    addGroundBox(Physics, C, { x: 4, y: 0.02, z: 1.6 }, { x: SITE.building.x, y: 0.052, z: BUILDING.southZ + 1.85 }, 'gravel');

    const threshold = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.035, 2.0), gravelMat.clone());
    threshold.position.set(SITE.courtyardEntry.x, 0.05, SITE.courtyardEntry.z);
    threshold.receiveShadow = true;
    threshold.userData = {
        id: 'starter_tesla_threshold',
        name: 'Lab Threshold',
        type: 'platform',
        locked: true,
        surfaceType: 'gravel',
    };
    root.add(threshold);
    addGroundBox(Physics, C, { x: 1.2, y: 0.018, z: 1.0 }, { x: SITE.courtyardEntry.x, y: 0.05, z: SITE.courtyardEntry.z }, 'gravel');

    root.userData = {
        id: 'starter_site_terrain',
        name: 'Wardenclyffe Terrain',
        type: 'prop',
        locked: true,
    };
    Engine.scene.add(root);
    State.objects.push(root);
    State.objects.push(courtyard);
    State.objects.push(threshold);

    return root;
}

window.buildStarterSiteTerrain191 = buildStarterSiteTerrain191;