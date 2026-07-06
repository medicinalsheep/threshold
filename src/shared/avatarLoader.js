import { HumanMesh } from '../engine/humanMesh.js';
import { AvatarComposer } from './avatarComposer.js';
import { AppearanceStore } from './appearanceStore.js';
import { AvatarManifest } from './avatarManifest.js';
import { profileToMeshOpts } from './appearanceProfile.js';

const GLB_MAP = {
    player: 'starter_avatar.glb',
    guide_npc: 'starter_avatar.glb',
    guard_npc: 'starter_npc_guard.glb',
    mechanic_npc: 'starter_npc_mech.glb',
};

export function avatarGlbForId(id) {
    const role = AvatarManifest.role(id);
    if (role?.glb) return role.glb;
    const body = AvatarManifest.body(role?.bodyId || 'male_default');
    return body?.glb || GLB_MAP[id] || GLB_MAP.player;
}

export async function tryLoadAvatarGroup(group, glbFile, options = {}) {
    if (!group) return false;
    const profile = options.profile || AvatarComposer.resolveProfile({
        id: options.id,
        appearance: options.appearance,
        glb: glbFile,
        customBodyGlb: glbFile,
    });
    try {
        await AvatarComposer.apply(group, profile, options.id || null);
        return true;
    } catch (e) {
        console.warn('[avatar-loader]', glbFile, e.message || e);
        return false;
    }
}

export async function spawnHumanWithAvatar(options = {}) {
    const profile = AvatarComposer.resolveProfile(options);
    const meshOpts = profileToMeshOpts(profile);
    const group = HumanMesh.build(meshOpts);
    await AvatarComposer.apply(group, profile, options.id || null);
    return group;
}

export async function applyPlayerAppearance(group, profile) {
    const p = profile || AppearanceStore.getPlayerProfile();
    await AvatarComposer.apply(group, p, 'player');
    group.userData.appearanceProfile = p;
    return group;
}

window.AvatarLoader = {
    tryLoadAvatarGroup,
    spawnHumanWithAvatar,
    avatarGlbForId,
    applyPlayerAppearance,
};