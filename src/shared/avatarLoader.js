import { HumanMesh } from '../engine/humanMesh.js';
import { AssetBundle } from './assetBundle.js';

const GLB_MAP = {
    player: 'starter_avatar.glb',
    guide_npc: 'starter_avatar.glb',
    guard_npc: 'starter_npc_guard.glb',
    mechanic_npc: 'starter_npc_mech.glb',
};

export function avatarGlbForId(id) {
    return GLB_MAP[id] || GLB_MAP.player;
}

export async function tryLoadAvatarGroup(group, glbFile) {
    if (!group || !glbFile) return false;
    const url = AssetBundle.getUrl(`import/${glbFile}`);
    try {
        await HumanMesh.loadGltf(group, url);
        group.userData.avatarGlb = glbFile;
        return true;
    } catch (e) {
        console.warn('[avatar-loader]', glbFile, e.message || e);
        return false;
    }
}

export async function spawnHumanWithAvatar(options = {}) {
    const group = HumanMesh.build(options.appearance || {});
    const glb = options.glb || avatarGlbForId(options.id);
    await tryLoadAvatarGroup(group, glb);
    return group;
}

window.AvatarLoader = { tryLoadAvatarGroup, spawnHumanWithAvatar, avatarGlbForId };