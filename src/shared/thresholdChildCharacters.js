/**
 * Threshold Child characters — original HumanMesh NPCs (R3).
 */

import { HumanMesh } from '../engine/humanMesh.js';
import {
    buildChildUserData,
    CHILD_CHARACTERS_META,
    getChildCharacterSpecs,
} from './thresholdChildMeta.js';

function addToScene(group) {
    const Engine = window.Engine;
    const State = window.State;
    if (!Engine?.scene || !group) return null;
    Engine.scene.add(group);
    State.objects.push(group);
    return group;
}

export function spawnChildCharacter(spec) {
    const group = HumanMesh.build({
        bodyColor: spec.mesh?.bodyColor,
        pantsColor: spec.mesh?.pantsColor,
        skinColor: spec.mesh?.skinColor,
        hairColor: spec.mesh?.hairColor,
        roughness: 0.68,
    });

    group.position.set(spec.pos.x, spec.pos.y, spec.pos.z);
    if (spec.rotY != null) group.rotation.y = spec.rotY;
    group.userData.idleSeed = spec.id.length * 0.31;

    const meta = buildChildUserData({
        id: spec.id,
        label: spec.label,
        type: spec.type,
        kind: spec.kind,
        hasPhysics: false,
        locked: false,
    }, CHILD_CHARACTERS_META);

    Object.assign(group.userData, meta, {
        isHuman: true,
        isCharacter: true,
        isGltf: false,
        agentType: 'local',
        agentPersona: spec.agentPersona || '',
        soundMode: 'clip',
        soundTrigger: 'ambient',
    });

    return addToScene(group);
}

export function spawnThresholdChildCharacters() {
    let spawned = 0;
    getChildCharacterSpecs().forEach((spec) => {
        if (spawnChildCharacter(spec)) spawned += 1;
    });
    return { spawned, edition: CHILD_CHARACTERS_META.edition, version: CHILD_CHARACTERS_META.version };
}

export function getChildCharacterCreditEntries() {
    return getChildCharacterSpecs().map((spec) => ({
        id: spec.id,
        label: spec.label,
        kind: spec.kind,
        license: CHILD_CHARACTERS_META.license,
        author: CHILD_CHARACTERS_META.author,
        source: 'Threshold Child edition — HumanMesh procedural',
        storeSku: `childcharacters.${spec.kind}.${spec.id.replace(/^child_/, '')}`,
        registryUri: `threshold://${CHILD_CHARACTERS_META.bundleId}/asset/${spec.id.replace(/^child_/, '')}`,
    }));
}

window.ThresholdChildCharacters = {
    spawnThresholdChildCharacters,
    spawnChildCharacter,
    getChildCharacterCreditEntries,
};