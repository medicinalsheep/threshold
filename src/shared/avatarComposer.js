/** AvatarComposer — manifest-driven body + hair + colors (R8.2) */

import { AssetBundle } from './assetBundle.js';
import { HumanMesh } from '../engine/humanMesh.js';
import { AvatarManifest } from './avatarManifest.js';
import { HairSlot } from './hairSlot.js';
import {
    normalizeProfile,
    profileFromLegacyAppearance,
    profileToMeshOpts,
} from './appearanceProfile.js';
import { AvatarTex } from './avatarTex.js';

function hexToNum(hex) {
    if (typeof hex === 'number') return hex;
    const n = parseInt(String(hex || '').replace('#', ''), 16);
    return Number.isFinite(n) ? n : 0xffffff;
}

export const AvatarComposer = {
    resolveProfile(options = {}) {
        if (options.profile) return normalizeProfile(options.profile);
        if (options.appearance) return profileFromLegacyAppearance(options.appearance);
        if (options.id) {
            const role = AvatarManifest.resolveProfileForRole(options.id, options.appearance || {});
            return profileFromLegacyAppearance({ ...role, ...(options.appearance || {}) });
        }
        return normalizeProfile(options);
    },

    applyColors(group, profile) {
        const p = normalizeProfile(profile);
        const rough = p.roughness ?? 0.72;
        const opts = {
            bodyColor: hexToNum(p.colors.shirt),
            headColor: hexToNum(p.colors.skin),
            pantsColor: hexToNum(p.colors.pants),
            hairColor: hexToNum(p.colors.hair),
            roughness: rough,
        };

        if (group.userData?.humanParts) {
            HumanMesh.applySkin(group, opts);
            const parts = group.userData.humanParts;
            if (parts.hairCap?.material) {
                parts.hairCap.material.color.setHex(opts.hairColor);
            }
            return;
        }

        if (group.userData?.isGltf) {
            group.traverse((c) => {
                if (!c.isMesh || !c.material) return;
                const n = (c.name || '').toLowerCase();
                const m = Array.isArray(c.material) ? c.material[0] : c.material;
                if (!m?.color) return;
                if (n.includes('head') || n.includes('neck') || n.includes('arm') || n.includes('skin')) {
                    m.color.setHex(opts.headColor);
                } else if (n.includes('hair')) {
                    m.color.setHex(opts.hairColor);
                } else if (n.includes('hip') || n.includes('leg') || n.includes('pant')) {
                    m.color.setHex(opts.pantsColor);
                } else if (n.includes('torso') || n.includes('shirt') || n.includes('body')) {
                    m.color.setHex(opts.bodyColor);
                }
                m.roughness = rough;
            });
        }
    },

    async apply(group, profileOrOptions = {}, roleId = null) {
        const profile = typeof profileOrOptions === 'object' && profileOrOptions.bodyId
            ? normalizeProfile(profileOrOptions)
            : this.resolveProfile(typeof profileOrOptions === 'object' ? profileOrOptions : { profile: profileOrOptions });

        const role = roleId || profileOrOptions?.id || null;
        const body = AvatarManifest.resolveBodyGlb(profile, role);
        const custom = profile.customBodyGlb;
        const url = custom && (custom.startsWith('http') || custom.startsWith('blob:'))
            ? custom
            : AssetBundle.getUrl(`import/${body.file.replace(/^import\//, '')}`);

        try {
            await HumanMesh.loadGltf(group, url, { heightM: body.heightM });
            group.userData.avatarGlb = body.file;
        } catch (e) {
            console.warn('[avatar-composer] body GLB fallback', body.file, e.message || e);
            const meshOpts = profileToMeshOpts(profile);
            if (!group.userData?.humanParts) {
                const built = HumanMesh.build(meshOpts);
                while (group.children.length) group.remove(group.children[0]);
                group.add(...built.children);
                group.userData.humanParts = built.userData.humanParts;
                group.userData.walkPhase = built.userData.walkPhase;
                group.userData.idlePhase = built.userData.idlePhase;
            }
        }

        this.applyColors(group, profile);

        const hairSpec = AvatarManifest.hair(profile.hairId);
        if (hairSpec?.procedural || profile.hairId === 'none') {
            HairSlot.detach(group);
            const parts = group.userData?.humanParts;
            if (parts?.hairCap) {
                parts.hairCap.visible = true;
                if (parts.hairCap.material) {
                    parts.hairCap.material.color.setHex(hexToNum(profile.colors.hair));
                }
            }
        } else {
            try {
                await HairSlot.attach(group, profile);
            } catch (e) {
                console.warn('[avatar-composer] hair attach', profile.hairId, e.message || e);
            }
        }

        try {
            const tex = await AvatarTex.apply(group, profile);
            if (tex?.maps) group.userData.avatarTexMaps = tex.maps;
        } catch (e) {
            console.warn('[avatar-composer] textures', e.message || e);
        }

        group.userData.appearanceProfile = profile;
        group.userData.glbR82 = true;
        return group;
    },

    async compose(options = {}) {
        const profile = this.resolveProfile(options);
        const meshOpts = profileToMeshOpts(profile);
        const group = HumanMesh.build(meshOpts);
        await this.apply(group, profile, options.id || null);
        return group;
    },
};

window.AvatarComposer = AvatarComposer;