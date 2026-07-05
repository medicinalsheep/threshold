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

export const CHILD_CHARACTERS_META = {
    edition: 'threshold-child-characters',
    version: '1.0',
    license: 'Original — Threshold Child edition',
    author: 'Threshold',
    bundleId: 'com.threshold.childcharacters',
};

export const CHILD_AUDIO_META = {
    edition: 'threshold-child-audio',
    version: '1.0',
    license: 'Original — Threshold Child edition',
    author: 'Threshold',
    bundleId: 'com.threshold.childaudio',
};

export const CHILD_SHOWCASE_META = {
    edition: 'threshold-child-showcase',
    version: '1.0',
    license: 'Original — Threshold Child edition',
    author: 'Threshold',
    bundleId: 'com.threshold.childshowcase',
};

export const CHILD_REALISM = {
    tier: 'lite',
    review: 'Honest realism pass — proportions, PBR materials, bbox physics, LOD, export metadata',
};

export function buildChildUserData(spec, editionMeta = CHILD_LITE_META) {
    const bundleId = editionMeta.bundleId || 'com.threshold.childlite';
    const slug = spec.id.replace(/^child_/, '');
    const prefix = editionMeta.edition.includes('vehicles') ? 'childvehicles'
        : editionMeta.edition.includes('characters') ? 'childcharacters'
            : editionMeta.edition.includes('audio') ? 'childaudio'
                : editionMeta.edition.includes('showcase') ? 'childshowcase'
                    : 'childlite';
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

export function getChildCharacterSpecs() {
    return [
        {
            id: 'child_marshal',
            label: 'Threshold Marshal',
            type: 'human',
            kind: 'character',
            pos: { x: -1.5, y: 0, z: -6 },
            rotY: 0.4,
            mesh: {
                bodyColor: 0x1a2a44,
                pantsColor: 0x111822,
                skinColor: 0xffd4b8,
                hairColor: 0x1a1010,
            },
            agentPersona: 'Circuit official — welcomes drivers, explains EXPORT walkthrough.',
        },
        {
            id: 'child_mechanic',
            label: 'Threshold Mechanic',
            type: 'human',
            kind: 'character',
            pos: { x: 5, y: 0, z: 0 },
            rotY: -1.2,
            mesh: {
                bodyColor: 0xcc6622,
                pantsColor: 0x333344,
                skinColor: 0xe8b896,
                hairColor: 0x3d2817,
            },
            agentPersona: 'Garage tech — tunes vehicle mass/friction, collision audio.',
        },
    ];
}

export function getChildAudioSpecs() {
    return [
        {
            id: 'child_sfx_vehicle_impact',
            label: 'Child Vehicle Impact',
            kind: 'sound',
            trigger: 'collision',
            targetIds: ['child_runner', 'child_hauler'],
            synth: { type: 'square', freq: 120, duration: 0.18, decay: 0.08 },
        },
        {
            id: 'child_sfx_footstep',
            label: 'Child Footstep',
            kind: 'sound',
            trigger: 'ambient',
            targetIds: ['child_marshal', 'child_mechanic'],
            synth: { type: 'triangle', freq: 280, duration: 0.06, decay: 0.04 },
        },
        {
            id: 'child_sfx_engine_idle',
            label: 'Child Engine Idle',
            kind: 'sound',
            trigger: 'ambient',
            targetIds: ['child_hauler'],
            synth: { type: 'sawtooth', freq: 55, duration: 0.45, decay: 0.2 },
        },
        {
            id: 'child_sfx_checkpoint',
            label: 'Child Checkpoint',
            kind: 'sound',
            trigger: 'interact',
            targetIds: ['child_checkpoint'],
            synth: { type: 'sine', freq: 660, duration: 0.12, decay: 0.06 },
        },
        {
            id: 'child_sfx_start_beep',
            label: 'Child Start Beep',
            kind: 'sound',
            trigger: 'interact',
            targetIds: ['child_circuit_span'],
            synth: { type: 'sine', freq: 880, duration: 0.2, decay: 0.1 },
        },
    ];
}