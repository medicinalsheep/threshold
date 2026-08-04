/** AvatarComposer — manifest-driven body + hair + colors (R8.2) */

import { AssetBundle } from './assetBundle.js';
import { HumanMesh } from '../engine/humanMesh.js';
import { AvatarManifest } from './avatarManifest.js';
import { HairSlot } from './hairSlot.js';
import {
    normalizeProfile,
    profileFromLegacyAppearance,
    profileToMeshOpts,
    defaultHeightForBody,
} from './appearanceProfile.js';
import { AvatarTex } from './avatarTex.js';
import { AvatarLod } from './avatarLod.js';
import { AvatarMod } from './avatarMod.js';

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

        // Load GLB at body preset height; continuous shape applied after (avoids double height scale)
        const bodyHeight = body.heightM || defaultHeightForBody(profile.bodyId);

        // Reset shape capture so re-apply rebuilds clean base scales
        delete group.userData._shapeBaseScales;
        delete group.userData._shapeBaseGltf;
        delete group.userData._shapeBaseRootScale;

        let usedGlb = false;
        try {
            await HumanMesh.loadGltf(group, url, { heightM: bodyHeight });
            group.userData.avatarGlb = body.file;
            usedGlb = true;
            // Distance LOD chain (lod1/lod2 GLBs) when manifest lists tiers
            try {
                await AvatarLod.setup(group, body);
            } catch (lodErr) {
                console.warn('[avatar-composer] lod', lodErr.message || lodErr);
            }
        } catch (e) {
            console.warn('[avatar-composer] body GLB fallback', body.file, e.message || e);
            const meshOpts = profileToMeshOpts(profile);
            const built = HumanMesh.build(meshOpts);
            while (group.children.length) group.remove(group.children[0]);
            group.add(...built.children);
            group.userData.humanParts = built.userData.humanParts;
            group.userData.walkPhase = built.userData.walkPhase;
            group.userData.idlePhase = built.userData.idlePhase;
            group.userData.isGltf = false;
            group.scale.set(1, 1, 1);
        }

        this.applyColors(group, profile);

        // Soft shape on GLB (procedural already baked proportions into build)
        if (usedGlb) {
            HumanMesh.applyShape(group, profile, {
                bodyId: profile.bodyId,
                defaultHeightM: bodyHeight,
            });
        } else if (profile.shape?.heightM != null) {
            // Procedural: only overall height vs form default (sliders baked in meshOpts)
            HumanMesh.applyShape(group, {
                ...profile,
                shape: {
                    ...profile.shape,
                    shoulders: 0.5,
                    chest: 0.5,
                    waist: 0.5,
                    hips: 0.5,
                    muscle: 0.5,
                    weight: 0.5,
                },
            }, {
                bodyId: profile.bodyId,
                defaultHeightM: defaultHeightForBody(profile.bodyId),
            });
        }

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
            await AvatarMod.apply(group, profile);
        } catch (e) {
            console.warn('[avatar-composer] mods', e.message || e);
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

    /**
     * Live shape tweak. GLB: soft scale/morphs. Procedural: full re-apply (shape baked into mesh).
     * Re-applies MOD layer so gear tracks new proportions.
     */
    async applyShapeOnly(group, profileOrOptions = {}) {
        if (!group) return null;
        const profile = this.resolveProfile(
            typeof profileOrOptions === 'object' ? profileOrOptions : { profile: profileOrOptions },
        );
        // Procedural mesh has shape baked at build — full recompose is correct
        if (!group.userData?.isGltf) {
            return this.apply(group, profile);
        }
        const body = AvatarManifest.resolveBodyGlb(profile, null);
        HumanMesh.applyShape(group, profile, {
            bodyId: profile.bodyId,
            defaultHeightM: body.heightM || defaultHeightForBody(profile.bodyId),
        });
        try {
            await AvatarMod.apply(group, profile);
        } catch (e) {
            console.warn('[avatar-composer] shape mods', e.message || e);
        }
        group.userData.appearanceProfile = profile;
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