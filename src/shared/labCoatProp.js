/** R8.2.7 — procedural lab coat prop for Nikola NPC */

export function attachLabCoat(npc, THREE) {
    if (!npc || !THREE) return null;
    if (npc.getObjectByName?.('prop_lab_coat')) return npc.getObjectByName('prop_lab_coat');

    const clothMat = new THREE.MeshStandardMaterial({
        color: 0xf2eee6,
        roughness: 0.84,
        metalness: 0.02,
        envMapIntensity: 0.28,
    });
    const collarMat = clothMat.clone();
    collarMat.color.setHex(0xffffff);

    const coat = new THREE.Group();
    coat.name = 'prop_lab_coat';

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.26), clothMat);
    torso.position.set(0, 1.04, 0.02);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.28), clothMat);
    skirt.position.set(0, 0.58, 0.01);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.24), collarMat);
    collar.position.set(0, 1.38, 0.04);
    const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.12), clothMat);
    lapelL.position.set(-0.1, 1.28, 0.1);
    lapelL.rotation.y = 0.25;
    const lapelR = lapelL.clone();
    lapelR.position.x = 0.1;
    lapelR.rotation.y = -0.25;

    coat.add(torso, skirt, collar, lapelL, lapelR);
    coat.userData = { labCoat: true, propId: 'prop_lab_coat' };
    npc.add(coat);
    return coat;
}

window.attachLabCoat = attachLabCoat;