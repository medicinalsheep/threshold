/** Shared Threshold Child metadata — procedural + GLB editions */

export const CHILD_LITE_META = {
    edition: 'threshold-child-lite',
    version: '1.1',
    license: 'Original — Threshold Child edition',
    author: 'Threshold',
};

export const CHILD_VEHICLES_META = {
    edition: 'threshold-child-vehicles',
    version: '1.0',
    license: 'Original — Threshold Child edition',
    author: 'Threshold',
    bundleId: 'com.threshold.childvehicles',
};

export const CHILD_REALISM = {
    tier: 'lite',
    review: 'Honest realism pass — proportions, PBR materials, bbox physics, LOD, export metadata',
};

export function buildChildUserData(spec, editionMeta = CHILD_LITE_META) {
    const bundleId = editionMeta.bundleId || 'com.threshold.childlite';
    const slug = spec.id.replace(/^child_/, '');
    const prefix = editionMeta.edition.includes('vehicles') ? 'childvehicles' : 'childlite';
    return {
        id: spec.id,
        name: spec.label,
        type: spec.type,
        assetKind: spec.kind,
        isThresholdChild: true,
        childEdition: editionMeta.edition,
        childVersion: editionMeta.version,
        childRealism: CHILD_REALISM.tier,
        license: editionMeta.license,
        author: editionMeta.author,
        creditSource: 'Threshold Child edition (bundled)',
        registryUri: spec.registryUri || `threshold://${bundleId}/asset/${slug}`,
        storeSku: spec.storeSku || `${prefix}.${spec.kind}.${slug}`,
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

export function getChildVehicleSpecs() {
    return [
        {
            id: 'child_runner',
            label: 'Threshold Runner',
            objectName: 'Threshold Runner',
            slug: 'threshold_child_runner',
            type: 'gltf',
            kind: 'vehicle',
            hasPhysics: true,
            mass: 3.4,
            friction: 0.36,
            restitution: 0.14,
            soundFreq: 220,
            soundType: 'square',
            pos: { x: -3.5, y: 0, z: 1 },
        },
        {
            id: 'child_hauler',
            label: 'Threshold Hauler',
            objectName: 'Threshold Hauler',
            slug: 'threshold_child_hauler',
            type: 'gltf',
            kind: 'vehicle',
            hasPhysics: true,
            mass: 5.8,
            friction: 0.44,
            restitution: 0.1,
            soundFreq: 140,
            soundType: 'sawtooth',
            pos: { x: 3.5, y: 0, z: -1 },
        },
    ];
}