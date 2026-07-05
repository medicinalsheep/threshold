/** Phase 15 — wildlife scene props: dog bowl near Sam, alley cat */

export function buildStarterWildlife15() {
    const Engine = window.Engine;
    const State = window.State;
    const THREE = window.THREE;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'starter_wildlife_cat')) {
        return null;
    }

    const bowlMat = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.72, metalness: 0.12 });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.06, 14), bowlMat);
    bowl.position.set(-0.55, 0.03, 0.75);
    bowl.receiveShadow = true;
    bowl.userData = {
        id: 'starter_dog_bowl',
        name: 'Dog Bowl',
        type: 'prop',
        locked: true,
        wildlifeHint: 'dog',
    };
    Engine.scene.add(bowl);
    State.objects.push(bowl);

    const catGroup = new THREE.Group();
    catGroup.name = 'starter_wildlife_cat';
    const fur = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.88, metalness: 0.02 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.55), fur);
    body.position.y = 0.18;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), fur);
    head.position.set(0, 0.28, 0.28);
    head.scale.set(1, 0.9, 0.85);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), fur);
    earL.position.set(-0.08, 0.38, 0.3);
    const earR = earL.clone();
    earR.position.x = 0.08;
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.32, 6), fur);
    tail.position.set(0, 0.22, -0.32);
    tail.rotation.x = 0.6;
    tail.userData.animCatTail = true;
    catGroup.add(body, head, earL, earR, tail);
    catGroup.position.set(-6.65, 0, -5.05);
    catGroup.rotation.y = 0.55;
    catGroup.userData = {
        id: 'starter_wildlife_cat',
        name: 'Alley Cat',
        type: 'prop',
        locked: true,
        wildlifeHint: 'cat',
        animCat: true,
        tailMesh: tail,
    };
    Engine.scene.add(catGroup);
    State.objects.push(catGroup);

    return { bowl, cat: catGroup };
}

export const StarterWildlife15 = {
    wireAnims() {
        const cat = window.State?.objects?.find((o) => o.userData?.id === 'starter_wildlife_cat');
        const tail = cat?.userData?.tailMesh;
        if (!tail) return;
        window.StarterAnim?.registerStarterAnim?.((t) => {
            tail.rotation.z = 0.55 + Math.sin(t * 3.2) * 0.35;
        });
    },
};

window.StarterWildlife15 = StarterWildlife15;
window.buildStarterWildlife15 = buildStarterWildlife15;