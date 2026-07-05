/**
 * Threshold Child showcase — full export demo world (R3).
 * Vehicles (GLB+LOD) + Circuit Span + Characters + Audio + checkpoint beacon.
 */

import { spawnThresholdChildVehicles } from './thresholdChildVehicles.js';
import { spawnThresholdChildCharacters } from './thresholdChildCharacters.js';
import { seedThresholdChildAudio, wireChildAudioToScene } from './thresholdChildAudio.js';
import { spawnCircuitSpan } from './thresholdChildAssets.js';
import { buildChildUserData, CHILD_SHOWCASE_META } from './thresholdChildMeta.js';

function spawnCheckpointBeacon() {
    const THREE = window.THREE;
    const Engine = window.Engine;
    const State = window.State;
    if (!THREE || !Engine?.scene) return null;

    const group = new THREE.Group();
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 1.6, 12),
        new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5, metalness: 0.4 })
    );
    pole.position.y = 0.8;
    group.add(pole);

    const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 16),
        new THREE.MeshStandardMaterial({
            color: 0x39ff14,
            emissive: 0x39ff14,
            emissiveIntensity: 0.55,
            roughness: 0.2,
        })
    );
    beacon.position.y = 1.65;
    group.add(beacon);

    group.position.set(0, 0, -5.5);
    group.userData = buildChildUserData({
        id: 'child_checkpoint',
        label: 'Threshold Checkpoint',
        type: 'prop',
        kind: 'scene',
        hasPhysics: false,
        locked: false,
    }, CHILD_SHOWCASE_META);
    group.userData.isRotating = true;

    Engine.scene.add(group);
    State.objects.push(group);
    return group;
}

export async function spawnThresholdChildShowcase() {
    const vehicles = await spawnThresholdChildVehicles();
    const characters = spawnThresholdChildCharacters();
    const checkpoint = spawnCheckpointBeacon() ? 1 : 0;

    const audio = await seedThresholdChildAudio();
    const wired = await wireChildAudioToScene();

    const spawned = (vehicles.spawned || 0) + (characters.spawned || 0) + checkpoint;

    if (spawned) {
        const Engine = window.Engine;
        if (Engine?.setRenderMode && (window.State?.renderMode ?? 0) < 4) {
            Engine.setRenderMode(4);
        }
        window.UI?.status?.(
            `Threshold Child Showcase v${CHILD_SHOWCASE_META.version}: ${spawned} objects · ${audio.seeded} SFX · EXPORT → SCENE / CREDITS / PACKS`
        );
    }

    return {
        spawned,
        edition: CHILD_SHOWCASE_META.edition,
        version: CHILD_SHOWCASE_META.version,
        vehicles: vehicles.spawned,
        characters: characters.spawned,
        audio: audio.seeded,
        wired,
    };
}

export function getChildShowcaseCreditEntries() {
    return [
        {
            id: 'child_checkpoint',
            label: 'Threshold Checkpoint',
            kind: 'scene',
            license: CHILD_SHOWCASE_META.license,
            author: CHILD_SHOWCASE_META.author,
            source: 'Threshold Child edition — showcase prop',
            storeSku: 'childshowcase.scene.checkpoint',
            registryUri: 'threshold://com.threshold.childshowcase/asset/checkpoint',
        },
    ];
}

window.ThresholdChildShowcase = {
    spawnThresholdChildShowcase,
    getChildShowcaseCreditEntries,
};