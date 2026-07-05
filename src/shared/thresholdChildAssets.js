/**
 * Threshold Child assets — original in-engine content only.
 * Procedural meshes tuned for Hyper PBR + retro render modes + export/physics compatibility.
 */

const CHILD_META = {
    edition: 'threshold-child-lite',
    version: '1.1',
    license: 'Original — Threshold Child edition',
    author: 'Threshold',
};

const CHILD_REALISM = {
    tier: 'lite',
    review: 'Honest realism pass — proportions, PBR materials, bbox physics, export metadata',
};

function stdMat(color, opts = {}) {
    const THREE = window.THREE;
    const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.45,
        metalness: opts.metalness ?? 0.35,
    });
    if (opts.emissive != null) {
        mat.emissive.setHex(opts.emissive);
        mat.emissiveIntensity = opts.emissiveIntensity ?? 0.25;
    }
    return mat;
}

function glassMat() {
    return stdMat(0x0a1525, { roughness: 0.08, metalness: 0.65 });
}

function addPart(group, geometry, material, position, rotation) {
    const mesh = new THREE.Mesh(geometry, material);
    if (position) mesh.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
    if (rotation) mesh.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
}

function addWheel(group, x, y, z, radius = 0.34, width = 0.24) {
    const THREE = window.THREE;
    const tire = addPart(
        group,
        new THREE.CylinderGeometry(radius, radius, width, 18),
        stdMat(0x141414, { roughness: 0.92, metalness: 0.05 }),
        { x, y, z },
        { z: Math.PI / 2 }
    );
    const hub = addPart(
        group,
        new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.02, 12),
        stdMat(0x8899aa, { roughness: 0.35, metalness: 0.7 }),
        { x, y, z },
        { z: Math.PI / 2 }
    );
    return { tire, hub };
}

function buildChildUserData(spec) {
    const bundleId = 'com.threshold.childlite';
    const slug = spec.id.replace(/^child_/, '');
    return {
        id: spec.id,
        name: spec.label,
        type: spec.type,
        assetKind: spec.kind,
        isThresholdChild: true,
        childEdition: CHILD_META.edition,
        childVersion: CHILD_META.version,
        childRealism: CHILD_REALISM.tier,
        license: CHILD_META.license,
        author: CHILD_META.author,
        creditSource: 'Threshold Child edition (bundled)',
        registryUri: `threshold://${bundleId}/asset/${slug}`,
        storeSku: `childlite.${spec.kind}.${slug}`,
        hasPhysics: spec.hasPhysics ?? false,
        mass: spec.mass ?? 1,
        friction: spec.friction ?? 0.4,
        restitution: spec.restitution ?? 0.2,
        soundTrigger: spec.soundTrigger || 'collision',
        soundFreq: spec.soundFreq ?? 180,
        soundType: spec.soundType || 'sine',
        locked: !!spec.locked,
        renderModeHint: 4,
    };
}

function addToScene(mesh) {
    const Engine = window.Engine;
    const State = window.State;
    if (!Engine?.scene || !mesh) return null;
    Engine.scene.add(mesh);
    State.objects.push(mesh);
    return mesh;
}

function attachPhysics(mesh, { static: isStatic = false } = {}) {
    const Physics = window.Physics;
    const State = window.State;
    if (!Physics || !State || !mesh?.userData) return null;

    const ud = mesh.userData;
    const mass = isStatic ? 0 : (ud.mass ?? 1);
    if (!isStatic && mass <= 0) return null;

    const existing = State.physicsObjects.find((p) => p.mesh === mesh);
    if (existing) return existing.body;

    const body = Physics.addBodyFromObject(mesh, mass);
    if (!body) return null;

    if (!isStatic) {
        body.mass = mass;
        body.updateMassProperties?.();
    }

    State.physicsObjects.push({ mesh, body });
    ud.hasPhysics = true;
    return body;
}

function spawnRunner(pos) {
    const THREE = window.THREE;
    if (!THREE) return null;

    const group = new THREE.Group();
    const bodyMat = stdMat(0x1a2a44, { roughness: 0.32, metalness: 0.58 });
    const trimMat = stdMat(0x0d1520, { roughness: 0.38, metalness: 0.42 });
    const accentMat = stdMat(0x39ff14, { roughness: 0.18, metalness: 0.2, emissive: 0x39ff14, emissiveIntensity: 0.4 });

    addPart(group, new THREE.BoxGeometry(1.75, 0.38, 3.5), bodyMat, { y: 0.32 });
    addPart(group, new THREE.BoxGeometry(1.55, 0.22, 2.8), trimMat, { y: 0.52, z: 0.15 });
    addPart(group, new THREE.BoxGeometry(1.35, 0.42, 1.35), glassMat(), { y: 0.78, z: -0.35 });
    addPart(group, new THREE.BoxGeometry(1.76, 0.06, 3.52), accentMat, { y: 0.54 });
    addPart(group, new THREE.BoxGeometry(0.35, 0.12, 0.55), trimMat, { y: 0.62, z: 1.55 });
    addPart(group, new THREE.BoxGeometry(1.5, 0.08, 0.35), trimMat, { y: 0.88, z: -1.45 });

    [[-0.82, 0.28, 1.05], [0.82, 0.28, 1.05]].forEach(([x, y, z]) => {
        addPart(
            group,
            new THREE.SphereGeometry(0.1, 10, 10),
            stdMat(0xffffee, { emissive: 0xffffcc, emissiveIntensity: 0.55, roughness: 0.1 }),
            { x, y, z }
        );
    });
    addPart(
        group,
        new THREE.SphereGeometry(0.08, 8, 8),
        stdMat(0xff3344, { emissive: 0xaa1122, emissiveIntensity: 0.45 }),
        { y: 0.42, z: -1.72 }
    );

    [[-0.88, 0.3, 1.15], [0.88, 0.3, 1.15], [-0.88, 0.3, -1.15], [0.88, 0.3, -1.15]].forEach(([x, y, z]) => {
        addWheel(group, x, y, z, 0.32, 0.22);
    });

    group.position.set(pos.x, pos.y, pos.z);
    group.userData = buildChildUserData({
        id: 'child_runner',
        label: 'Threshold Runner',
        type: 'vehicle',
        kind: 'vehicle',
        hasPhysics: true,
        mass: 3.4,
        friction: 0.36,
        restitution: 0.14,
        soundFreq: 220,
        soundType: 'square',
    });

    attachPhysics(group);
    return addToScene(group);
}

function spawnHauler(pos) {
    const THREE = window.THREE;
    if (!THREE) return null;

    const group = new THREE.Group();
    const bedMat = stdMat(0x2d4a35, { roughness: 0.52, metalness: 0.22 });
    const cabMat = stdMat(0x3a5a48, { roughness: 0.42, metalness: 0.28 });
    const railMat = stdMat(0x00ffaa, { roughness: 0.25, metalness: 0.15, emissive: 0x00aa66, emissiveIntensity: 0.3 });

    addPart(group, new THREE.BoxGeometry(2.15, 0.85, 2.6), bedMat, { y: 0.52, z: -0.55 });
    addPart(group, new THREE.BoxGeometry(2.05, 0.05, 2.5), stdMat(0x1a2820, { roughness: 0.75 }), { y: 0.92, z: -0.55 });
    addPart(group, new THREE.BoxGeometry(1.65, 1.05, 1.45), cabMat, { y: 0.78, z: 1.35 });
    addPart(group, new THREE.BoxGeometry(1.45, 0.48, 1.1), glassMat(), { y: 1.05, z: 1.42 });
    addPart(group, new THREE.BoxGeometry(2.12, 0.07, 3.65), railMat, { y: 1.02, z: 0.1 });
    addPart(group, new THREE.BoxGeometry(0.4, 0.55, 0.12), cabMat, { y: 0.55, z: 2.05 });

    [[-0.95, 0.34, 1.35], [0.95, 0.34, 1.35], [-0.95, 0.34, -1.35], [0.95, 0.34, -1.35]].forEach(([x, y, z]) => {
        addWheel(group, x, y, z, 0.38, 0.28);
    });

    group.position.set(pos.x, pos.y, pos.z);
    group.userData = buildChildUserData({
        id: 'child_hauler',
        label: 'Threshold Hauler',
        type: 'vehicle',
        kind: 'vehicle',
        hasPhysics: true,
        mass: 5.8,
        friction: 0.44,
        restitution: 0.1,
        soundFreq: 140,
        soundType: 'sawtooth',
    });

    attachPhysics(group);
    return addToScene(group);
}

function spawnCircuitSpan(pos) {
    const THREE = window.THREE;
    if (!THREE) return null;

    const group = new THREE.Group();
    const deckMat = stdMat(0x222233, { roughness: 0.48, metalness: 0.38 });
    const curbMat = stdMat(0x333344, { roughness: 0.55, metalness: 0.3 });
    const railMat = stdMat(0x39ff14, { roughness: 0.28, metalness: 0.2, emissive: 0x39ff14, emissiveIntensity: 0.22 });
    const pylonMat = stdMat(0x1a1a28, { roughness: 0.65, metalness: 0.45 });

    addPart(group, new THREE.BoxGeometry(10, 0.14, 2.6), deckMat, { y: 0.07 });
    [-1.15, 1.15].forEach((x) => {
        addPart(group, new THREE.BoxGeometry(0.14, 0.28, 10), curbMat, { x, y: 0.22 });
        addPart(group, new THREE.BoxGeometry(0.07, 0.38, 10), railMat, { x: x > 0 ? x + 0.1 : x - 0.1, y: 0.32 });
    });

    for (let z = -4; z <= 4; z += 1.2) {
        addPart(
            group,
            new THREE.BoxGeometry(0.35, 0.04, 0.55),
            stdMat(0xffffff, { emissive: 0xcccccc, emissiveIntensity: 0.15 }),
            { y: 0.15, z }
        );
    }

    [-3.2, 0, 3.2].forEach((z) => {
        addPart(group, new THREE.BoxGeometry(0.35, 1.1, 0.35), pylonMat, { y: -0.48, z });
    });

    const checkMat = stdMat(0xffffff, { roughness: 0.4 });
    const checkDark = stdMat(0x111111, { roughness: 0.4 });
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 2; j++) {
            addPart(
                group,
                new THREE.BoxGeometry(0.32, 0.03, 0.32),
                (i + j) % 2 === 0 ? checkMat : checkDark,
                { x: -0.8 + i * 0.32, y: 0.15, z: 4.85 }
            );
        }
    }

    group.position.set(pos.x, pos.y, pos.z);
    group.userData = buildChildUserData({
        id: 'child_circuit_span',
        label: 'Threshold Circuit Span',
        type: 'scene',
        kind: 'scene',
        hasPhysics: true,
        mass: 0,
        locked: true,
        soundFreq: 90,
    });

    attachPhysics(group, { static: true });
    return addToScene(group);
}

export const THRESHOLD_CHILD_LITE = {
    id: 'threshold-child-lite',
    label: 'Threshold Child Lite',
    version: CHILD_META.version,
    license: CHILD_META.license,
    realism: CHILD_REALISM,
    models: [
        { spawn: spawnRunner, pos: { x: -3.5, y: 0, z: 1 } },
        { spawn: spawnHauler, pos: { x: 3.5, y: 0, z: -1 } },
        { spawn: spawnCircuitSpan, pos: { x: 0, y: 0, z: -8 } },
    ],
};

export function spawnThresholdChildLite() {
    let spawned = 0;
    THRESHOLD_CHILD_LITE.models.forEach(({ spawn, pos }) => {
        if (spawn(pos)) spawned += 1;
    });
    if (spawned) {
        const Engine = window.Engine;
        if (Engine?.setRenderMode && (window.State?.renderMode ?? 0) < 4) {
            Engine.setRenderMode(4);
        }
        window.UI?.status?.(
            `Threshold Child Lite v${CHILD_META.version}: ${spawned} asset(s) — Hyper PBR · physics · EXPORT → SCENE / CREDITS / PACKS`
        );
    }
    return { spawned, edition: THRESHOLD_CHILD_LITE.id, version: CHILD_META.version };
}

export function getChildCreditEntries() {
    return [
        {
            id: 'child_runner',
            label: 'Threshold Runner',
            kind: 'vehicle',
            license: CHILD_META.license,
            author: CHILD_META.author,
            source: 'Threshold Child edition (bundled)',
            storeSku: 'childlite.vehicle.runner',
            registryUri: 'threshold://com.threshold.childlite/asset/runner',
        },
        {
            id: 'child_hauler',
            label: 'Threshold Hauler',
            kind: 'vehicle',
            license: CHILD_META.license,
            author: CHILD_META.author,
            source: 'Threshold Child edition (bundled)',
            storeSku: 'childlite.vehicle.hauler',
            registryUri: 'threshold://com.threshold.childlite/asset/hauler',
        },
        {
            id: 'child_circuit_span',
            label: 'Threshold Circuit Span',
            kind: 'scene',
            license: CHILD_META.license,
            author: CHILD_META.author,
            source: 'Threshold Child edition (bundled)',
            storeSku: 'childlite.scene.circuit_span',
            registryUri: 'threshold://com.threshold.childlite/asset/circuit_span',
        },
    ];
}

window.ThresholdChildAssets = {
    spawnThresholdChildLite,
    getChildCreditEntries,
    THRESHOLD_CHILD_LITE,
    CHILD_META,
};