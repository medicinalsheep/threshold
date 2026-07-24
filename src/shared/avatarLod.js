/**
 * Avatar LOD — distance mesh tiers for player/NPC bodies (Threshold uniqueness).
 * Uses MeshLod chains from avatar-manifest body.lods[] + re-binds hair/mods on switch.
 * Pose continuity: AvatarPoseSync multi-mixer + part copy (no hop on zoom).
 */

import { AssetBundle } from './assetBundle.js';
import { MeshLod } from './meshLod.js';
import { AvatarManifest } from './avatarManifest.js';
import { setupAvatarLodMixers, disposeAvatarLodMixers } from './avatarPoseSync.js';

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
        disposeAvatarLodMixers(group);
        MeshLod.dispose(group);

        const body = bodySpec.glb
            ? bodySpec
            : AvatarManifest.body(bodySpec.bodyId || 'male_default') || bodySpec;

        const entries = lodEntriesFromBody(body);
        if (!entries || entries.length < 2) {
            group.userData.avatarLod = false;
            return false;
        }

        let lod0 = null;
        for (const c of group.children) {
            if (c.userData?.hairSlot || c.userData?.avatarMod || c.userData?.modLayer) continue;
            lod0 = c;
            break;
        }
        if (!lod0) lod0 = group.children[0];
        if (!lod0) return false;

        // Preserve LOD0 walk clips from primary load if present on mixer root
        if (group.userData.mixerClip?._clip) {
            lod0.userData._gltfAnimations = [group.userData.mixerClip.getClip?.() || group.userData.mixerClip._clip].filter(Boolean);
        }

        const distances = entries.map((e) => e.distance);
        try {
            await MeshLod.initChain(group, lod0, entries, {
                distances: distances.length ? distances : AVATAR_LOD_DISTANCES,
            });
            group.userData.avatarLod = true;
            group.userData.lodDistances = distances.length ? distances : [...AVATAR_LOD_DISTANCES];
            group.userData.avatarLodBodyId = body.id || bodySpec.bodyId || null;
            setupAvatarLodMixers(group);
            return true;
        } catch (e) {
            console.warn('[avatar-lod] setup failed', e.message || e);
            group.userData.avatarLod = false;
            return false;
        }
    },

    async onLevelChange(root, level) {
        if (!root?.userData?.avatarLod) return;
        root.userData.lodActive = level;

        // Rebind accessories to anchors on the newly visible body (await to avoid empty frame)
        const profile = root.userData.appearanceProfile;
        if (profile) {
            try {
                await window.HairSlot?.attach?.(root, profile);
            } catch { /* optional */ }
            try {
                await window.AvatarMod?.apply?.(root, profile);
            } catch { /* optional */ }
        }

        // Ensure newly shown LOD has maps if compose only hit LOD0 once
        try {
            if (window.AvatarTex?.refreshActive) {
                await window.AvatarTex.refreshActive(root, profile);
            }
        } catch { /* optional */ }
    },
};

// Patch once (module can be imported from composer + main)
if (!MeshLod._avatarLodPatched) {
    MeshLod._avatarLodPatched = true;
    const _origSetActive = MeshLod.setActiveLevel.bind(MeshLod);
    MeshLod.setActiveLevel = function setActiveLevelAvatarAware(root, level) {
        const prev = root?.userData?.lodActive;
        _origSetActive(root, level);
        if (root?.userData?.avatarLod && prev !== root.userData.lodActive) {
            void AvatarLod.onLevelChange(root, root.userData.lodActive);
        }
    };
}

window.AvatarLod = AvatarLod;
