/**
 * Keep avatar LOD tiers posed in sync so zoom LOD swaps don't "hop".
 * - Walk mixers on every LOD that has a clip (shared time)
 * - Named-part rotation copy LOD0 → active when lower LODs lack clips
 */
import * as THREE from 'three';

const WALK_CLIP_NAMES = ['walk', 'Walk', 'locomotion', 'Locomotion'];
const PART_NAMES = ['legL', 'legR', 'armL', 'armR', 'torso', 'head', 'hips', 'shoulders', 'neck'];

function pickWalkClip(animations = []) {
    if (!animations?.length) return null;
    const named = animations.find((c) => WALK_CLIP_NAMES.some((n) => c.name?.includes(n)));
    return named || animations[0];
}

function avatarRootFromModel(model) {
    let skinnedRoot = null;
    model.traverse((c) => {
        if (c.isSkinnedMesh && c.skeleton?.bones?.length && !skinnedRoot) skinnedRoot = c;
    });
    if (skinnedRoot) return skinnedRoot;
    return model.getObjectByName('StarterAvatar')
        || model.getObjectByName('StarterAvatarFemale')
        || model.children[0]
        || model;
}

function collectNamedParts(object) {
    const parts = {};
    object.traverse((c) => {
        if (PART_NAMES.includes(c.name) && parts[c.name] == null) parts[c.name] = c;
    });
    return parts;
}

/**
 * After MeshLod.initChain — create a walk mixer per LOD scene that has clips.
 * LOD0 may already have mixer from HumanMesh.loadGltf; reuse or rebuild consistently.
 */
export function setupAvatarLodMixers(group) {
    if (!group) return;
    const scenes = group.userData?._lodScenes;
    if (!scenes?.length) return;

    // Tear down prior multi-mixers (keep safe)
    if (group.userData.avatarLodMixers) {
        for (const row of group.userData.avatarLodMixers) {
            try { row.mixer?.stopAllAction?.(); } catch { /* */ }
        }
    }

    const rows = [];
    scenes.forEach((scene, i) => {
        const anims = scene.userData?._gltfAnimations
            || (i === 0 ? group.userData?._lod0Animations : null)
            || [];
        const walk = pickWalkClip(anims);
        const parts = collectNamedParts(scene);
        scene.userData._lodParts = parts;

        if (walk) {
            const root = avatarRootFromModel(scene);
            const mixer = new THREE.AnimationMixer(root);
            const action = mixer.clipAction(walk);
            action.play();
            action.paused = true;
            rows.push({ mixer, action, scene, index: i });
        }
    });

    group.userData.avatarLodMixers = rows;
    if (rows[0]) {
        group.userData.mixer = rows[0].mixer;
        group.userData.mixerClip = rows[0].action;
        group.userData.humanParts = null;
    } else if (scenes[0]?.userData?._lodParts?.legL) {
        group.userData.humanParts = scenes[0].userData._lodParts;
    }
}

/**
 * Advance all LOD walk mixers with the same dt / timeScale so hidden LODs stay posed.
 * Copy named rotations from LOD0 when active LOD has no mixer.
 */
export function updateAvatarLodPose(group, horizontalSpeed, dt = 0.016, sprinting = false) {
    if (!group) return false;
    const rows = group.userData?.avatarLodMixers;
    const scenes = group.userData?._lodScenes;
    if (!rows?.length && !scenes?.length) return false;

    const moving = horizontalSpeed > 0.25;
    const timeScale = sprinting ? 1.9 : Math.max(0.55, horizontalSpeed / 3.2);

    if (rows?.length) {
        // Shared clock so swaps don't jump mid-stride
        let sharedTime = rows[0].action?.time ?? 0;
        for (const row of rows) {
            if (row.action) {
                row.action.paused = !moving;
                row.action.timeScale = moving ? timeScale : 0;
                if (moving && row !== rows[0] && rows[0].action) {
                    row.action.time = rows[0].action.time;
                }
            }
            row.mixer.update(dt);
            if (row === rows[0] && row.action) sharedTime = row.action.time;
        }
        // Align non-primary after update
        for (let i = 1; i < rows.length; i += 1) {
            if (rows[i].action && Number.isFinite(sharedTime)) {
                rows[i].action.time = sharedTime;
                rows[i].mixer.update(0);
            }
        }
    }

    // Named-part fallback for LODs without clips
    const active = group.userData?.lodActive ?? 0;
    if (scenes?.length > 1 && active > 0) {
        const srcParts = scenes[0]?.userData?._lodParts || collectNamedParts(scenes[0]);
        const dst = scenes[active];
        const hasMixer = rows?.some((r) => r.scene === dst);
        if (!hasMixer && srcParts && dst) {
            const dstParts = dst.userData?._lodParts || collectNamedParts(dst);
            for (const name of PART_NAMES) {
                const a = srcParts[name];
                const b = dstParts[name];
                if (a && b) {
                    b.quaternion.copy(a.quaternion);
                    b.rotation.copy(a.rotation);
                }
            }
        }
    }

    return !!(rows?.length);
}

export function disposeAvatarLodMixers(group) {
    if (!group?.userData?.avatarLodMixers) return;
    for (const row of group.userData.avatarLodMixers) {
        try { row.mixer?.stopAllAction?.(); } catch { /* */ }
    }
    group.userData.avatarLodMixers = null;
}

window.AvatarPoseSync = {
    setupAvatarLodMixers,
    updateAvatarLodPose,
    disposeAvatarLodMixers,
};
