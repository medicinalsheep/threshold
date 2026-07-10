/**
 * Avatar LOD — distance mesh tiers for player/NPC bodies (Threshold uniqueness).
 * Uses MeshLod chains from avatar-manifest body.lods[] + re-binds hair/mods on switch.
 */

import { AssetBundle } from './assetBundle.js';
import { MeshLod } from './meshLod.js';
import { AvatarManifest } from './avatarManifest.js';
import { LOD_DISTANCES } from './lodConfig.js';

const AVATAR_LOD_DISTANCES = [0, 10, 22];

function lodEntriesFromBody(body) {
    const lods = body?.lods;
    if (!Array.isArray(lods) || lods.length < 2) return null;
    return lods
        .map((e, i) => ({
            level: e.level ?? i,
            file: e.file || e.glb || body.glb,
            distance: e.distance ?? AVATAR_LOD_DISTANCES[Math.min(i, AVATAR_LOD_DISTANCES.length - 1)],
            path: `import/${String(e.file || e.glb || body.glb).replace(/^import\//, '')}`,
            url: AssetBundle.getUrl(`import/${String(e.file || e.glb || body.glb).replace(/^import\//, '')}`),
        }))
        .sort((a, b) => a.level - b.level);
}

export const AvatarLod = {
    async setup(group, bodySpec = {}) {
        if (!group) return false;
        MeshLod.dispose(group);

        const body = bodySpec.glb
            ? bodySpec
            : AvatarManifest.body(bodySpec.bodyId || 'male_default') || bodySpec;

        const entries = lodEntriesFromBody(body);
        if (!entries || entries.length < 2) {
            group.userData.avatarLod = false;
            return false;
        }

        // lod0 is current primary child (GLB just loaded by HumanMesh.loadGltf)
        let lod0 = null;
        for (const c of group.children) {
            if (c.userData?.hairSlot || c.userData?.avatarMod || c.userData?.modLayer) continue;
            lod0 = c;
            break;
        }
        if (!lod0) lod0 = group.children[0];
        if (!lod0) return false;

        const distances = entries.map((e) => e.distance);
        try {
            await MeshLod.initChain(group, lod0, entries, {
                distances: distances.length ? distances : AVATAR_LOD_DISTANCES,
            });
            group.userData.avatarLod = true;
            group.userData.lodDistances = distances.length ? distances : [...AVATAR_LOD_DISTANCES];
            group.userData.avatarLodBodyId = body.id || bodySpec.bodyId || null;
            return true;
        } catch (e) {
            console.warn('[avatar-lod] setup failed', e.message || e);
            group.userData.avatarLod = false;
            return false;
        }
    },

    onLevelChange(root, level) {
        if (!root?.userData?.avatarLod) return;
        // Hair/mods live on anchors inside active body — re-apply slots
        const profile = root.userData.appearanceProfile;
        if (!profile) return;
        window.HairSlot?.attach?.(root, profile).catch?.(() => {});
        window.AvatarMod?.apply?.(root, profile).catch?.(() => {});
        root.userData.lodActive = level;
    },
};

// Hook MeshLod level switches for avatar roots
const _origSetActive = MeshLod.setActiveLevel.bind(MeshLod);
MeshLod.setActiveLevel = function setActiveLevelAvatarAware(root, level) {
    const prev = root?.userData?.lodActive;
    _origSetActive(root, level);
    if (root?.userData?.avatarLod && prev !== root.userData.lodActive) {
        AvatarLod.onLevelChange(root, root.userData.lodActive);
    }
};

window.AvatarLod = AvatarLod;
