/**
 * Threshold Child assets — original in-engine content only.
 * Procedural meshes authored for Threshold; not third-party GLB drops.
 */

const CHILD_META = {
    edition: 'threshold-child-lite',
    license: 'Original — Threshold Child edition',
    author: 'Threshold',
};

function addToScene(mesh) {
    const Engine = window.Engine;
    const State = window.State;
    if (!Engine?.scene || !mesh) return null;
    Engine.scene.add(mesh);
    State.objects.push(mesh);
    return mesh;
}

function spawnRunner(pos) {
    const World = window.World;
    const THREE = window.THREE;
    if (!World || !THREE) return null;

    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.45, 3.6),
        new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.35, metalness: 0.55 })
    );
    body.position.y = 0.35;
    group.add(body);

    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.5, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x0d1520, roughness: 0.4, metalness: 0.3 })
    );
    cabin.position.set(0, 0.75, -0.4);
    group.add(cabin);

    const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.82, 0.08, 3.62),
        new THREE.MeshStandardMaterial({
            color: 0x39ff14,
            emissive: 0x39ff14,
            emissiveIntensity: 0.35,
            roughness: 0.2,
        })
    );
    stripe.position.y = 0.55;
    group.add(stripe);

    [[-0.9, 0.28, 1.1], [0.9, 0.28, 1.1], [-0.9, 0.28, -1.1], [0.9, 0.28, -1.1]].forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16),
            new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 })
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        group.add(wheel);
    });

    group.position.set(pos.x, pos.y, pos.z);
    group.userData = {
        id: 'child_runner',
        name: 'Threshold Runner',
        type: 'vehicle',
        isThresholdChild: true,
        childEdition: CHILD_META.edition,
        license: CHILD_META.license,
        author: CHILD_META.author,
        hasPhysics: true,
        mass: 3.2,
        friction: 0.38,
        restitution: 0.15,
        soundTrigger: 'collision',
    };

    attachPhysics(group);
    return addToScene(group);
}

function attachPhysics(mesh) {
    const Physics = window.Physics;
    const State = window.State;
    if (!Physics || !State) return;
    mesh.position.y = mesh.position.y || 0.5;
    const body = Physics.addBody(mesh, 'box');
    State.physicsObjects.push({ mesh, body });
}

function spawnHauler(pos) {
    const World = window.World;
    const THREE = window.THREE;
    if (!World || !THREE) return null;

    const group = new THREE.Group();
    const bed = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.9, 3.8),
        new THREE.MeshStandardMaterial({ color: 0x2d4a35, roughness: 0.55, metalness: 0.2 })
    );
    bed.position.y = 0.55;
    group.add(bed);

    const cab = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 1.1, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x3a5a48, roughness: 0.45, metalness: 0.25 })
    );
    cab.position.set(0, 0.75, 2.1);
    group.add(cab);

    const rack = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.06, 3.7),
        new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00aa66, emissiveIntensity: 0.25 })
    );
    rack.position.y = 1.05;
    group.add(rack);

    [[-1, 0.32, 1.4], [1, 0.32, 1.4], [-1, 0.32, -1.4], [1, 0.32, -1.4]].forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16),
            new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 })
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        group.add(wheel);
    });

    group.position.set(pos.x, pos.y, pos.z);
    group.userData = {
        id: 'child_hauler',
        name: 'Threshold Hauler',
        type: 'vehicle',
        isThresholdChild: true,
        childEdition: CHILD_META.edition,
        license: CHILD_META.license,
        author: CHILD_META.author,
        hasPhysics: true,
        mass: 5.5,
        friction: 0.42,
        restitution: 0.1,
        soundTrigger: 'collision',
    };

    attachPhysics(group);
    return addToScene(group);
}

function spawnCircuitSpan(pos) {
    const World = window.World;
    const THREE = window.THREE;
    if (!World || !THREE) return null;

    const group = new THREE.Group();
    const deck = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.12, 2.4),
        new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.5, metalness: 0.35 })
    );
    deck.position.y = 0.06;
    deck.receiveShadow = true;
    group.add(deck);

    const railMat = new THREE.MeshStandardMaterial({
        color: 0x39ff14,
        emissive: 0x39ff14,
        emissiveIntensity: 0.2,
        roughness: 0.3,
    });
    [-1.1, 1.1].forEach((x) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 8), railMat);
        rail.position.set(x, 0.28, 0);
        group.add(rail);
    });

    group.position.set(pos.x, pos.y, pos.z);
    group.userData = {
        id: 'child_circuit_span',
        name: 'Threshold Circuit Span',
        type: 'scene',
        isThresholdChild: true,
        childEdition: CHILD_META.edition,
        license: CHILD_META.license,
        author: CHILD_META.author,
        locked: false,
    };

    return addToScene(group);
}

export const THRESHOLD_CHILD_LITE = {
    id: 'threshold-child-lite',
    label: 'Threshold Child Lite',
    license: CHILD_META.license,
    models: [
        { spawn: spawnRunner, pos: { x: -4, y: 0, z: 0 } },
        { spawn: spawnHauler, pos: { x: 4, y: 0, z: -2 } },
        { spawn: spawnCircuitSpan, pos: { x: 0, y: 0, z: -7 } },
    ],
};

export function spawnThresholdChildLite() {
    let spawned = 0;
    THRESHOLD_CHILD_LITE.models.forEach(({ spawn, pos }) => {
        if (spawn(pos)) spawned += 1;
    });
    if (spawned) {
        window.UI?.status?.(`Threshold Child Lite: ${spawned} original asset(s) — EXPORT → SCENE / CREDITS`);
    }
    return { spawned, edition: THRESHOLD_CHILD_LITE.id };
}

export function getChildCreditEntries() {
    return [
        { id: 'child_runner', label: 'Threshold Runner', kind: 'vehicle', license: CHILD_META.license, author: CHILD_META.author },
        { id: 'child_hauler', label: 'Threshold Hauler', kind: 'vehicle', license: CHILD_META.license, author: CHILD_META.author },
        { id: 'child_circuit_span', label: 'Threshold Circuit Span', kind: 'scene', license: CHILD_META.license, author: CHILD_META.author },
    ];
}

window.ThresholdChildAssets = {
    spawnThresholdChildLite,
    getChildCreditEntries,
    THRESHOLD_CHILD_LITE,
};