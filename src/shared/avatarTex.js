/** Avatar PBR textures — skin / fabric / hair HILOD (R8.2.4) */

import { TextureHilod } from './textureHilod.js';
import { normalizeProfile, resolveSkinSlug } from './appearanceProfile.js';
import { finishMaterial } from './starterTex.js';

const SKIN_REGION = ['head', 'neck', 'arm', 'skin'];
const SHIRT_REGION = ['torso', 'shoulder', 'collar', 'shirt', 'body'];
const PANTS_REGION = ['hip', 'leg', 'pant'];
const HAIR_REGION = ['hair'];

const AVATAR_FINISH = { uvRepeat: [1, 1], normalScale: 1.05, envMapIntensity: 0.38 };
const SKIN_FINISH = { uvRepeat: [1, 1], normalScale: 0.55, envMapIntensity: 0.28 };
const FABRIC_FINISH = { uvRepeat: [2.2, 2.2], normalScale: 0.9, envMapIntensity: 0.34 };

function hexToNum(hex) {
    if (typeof hex === 'number') return hex;
    const n = parseInt(String(hex || '').replace('#', ''), 16);
    return Number.isFinite(n) ? n : 0xffffff;
}

function classifyMesh(mesh) {
    const n = (mesh.name || '').toLowerCase();
    if (HAIR_REGION.some((k) => n.includes(k))) return 'hair';
    if (SKIN_REGION.some((k) => n.includes(k))) return 'skin';
    if (PANTS_REGION.some((k) => n.includes(k))) return 'pants';
    if (SHIRT_REGION.some((k) => n.includes(k))) return 'shirt';
    return null;
}

function collectMeshes(root) {
    const out = [];
    root.traverse((c) => {
        if (c.isMesh && c.material) out.push(c);
    });
    return out;
}

async function applySlug(mesh, slug, slots, TB) {
    let n = 0;
    for (const slot of slots) {
        const path = `textures/${slug}_${slot}.png`;
        try {
            await TB.applyPathToObject(mesh, slot, path);
            n += 1;
        } catch (e) {
            console.warn('[avatar-tex]', slug, slot, e.message || e);
        }
    }
    return n;
}

function tintMaterial(mesh, hex, useMap = true) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
        if (!m) return;
        if (useMap && m.map) m.color.setHex(0xffffff);
        else m.color.setHex(hexToNum(hex));
        m.needsUpdate = true;
    });
}

function setupHairMaterial(mesh) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
        if (!m) return;
        m.transparent = true;
        m.alphaTest = 0.28;
        m.depthWrite = true;
        m.side = window.THREE?.DoubleSide ?? m.side;
        m.needsUpdate = true;
    });
}

export const AvatarTex = {
    async apply(group, profile) {
        const TB = window.TextureBridge;
        if (!group || !TB) return { maps: 0 };

        const p = normalizeProfile(profile);
        const skinSlug = resolveSkinSlug(p);
        const fabricSlug = p.textures?.shirt || 'starter_fabric';
        const hairSlug = p.textures?.hair || 'hair_alpha';

        const meshes = collectMeshes(group);
        const hairNode = group.userData?._hairNode;
        if (hairNode) {
            hairNode.traverse((c) => {
                if (c.isMesh && !meshes.includes(c)) meshes.push(c);
            });
        }

        let maps = 0;
        const tracked = [];

        for (const mesh of meshes) {
            const region = classifyMesh(mesh);
            if (!region) continue;

            if (region === 'skin') {
                maps += await applySlug(mesh, skinSlug, ['albedo', 'roughness', 'normal'], TB);
                tintMaterial(mesh, p.colors.skin, true);
                finishMaterial(mesh, SKIN_FINISH);
            } else if (region === 'shirt') {
                maps += await applySlug(mesh, fabricSlug, ['albedo', 'roughness', 'normal'], TB);
                tintMaterial(mesh, p.colors.shirt, true);
                finishMaterial(mesh, FABRIC_FINISH);
            } else if (region === 'pants') {
                maps += await applySlug(mesh, fabricSlug, ['albedo', 'roughness', 'normal'], TB);
                tintMaterial(mesh, p.colors.pants, true);
                finishMaterial(mesh, FABRIC_FINISH);
            } else if (region === 'hair') {
                maps += await applySlug(mesh, hairSlug, ['albedo'], TB);
                tintMaterial(mesh, p.colors.hair, true);
                setupHairMaterial(mesh);
                finishMaterial(mesh, AVATAR_FINISH);
            } else {
                finishMaterial(mesh, AVATAR_FINISH);
            }

            tracked.push(mesh);
        }

        group.userData.avatarTex = true;
        group.userData.avatarTexMeshes = tracked;
        // Include all LOD scene meshes for HILOD / refresh
        const scenes = group.userData?._lodScenes;
        if (scenes?.length) {
            for (const sc of scenes) {
                sc.traverse((c) => {
                    if (c.isMesh && c.material && !tracked.includes(c)) tracked.push(c);
                });
            }
        }
        group.userData.avatarTexProfile = {
            skin: skinSlug,
            shirt: fabricSlug,
            hair: hairSlug,
        };

        await TextureHilod.discoverVariantsFromBundle(tracked[0] || group);
        return { maps, meshes: tracked.length };
    },

    async refreshGroup(group) {
        if (!group?.userData?.avatarTexProfile) return;
        return this.apply(group, group.userData.appearanceProfile || {});
    },

    /** After LOD switch — ensure active body meshes have maps */
    async refreshActive(group, profile) {
        if (!group) return;
        const p = profile || group.userData?.appearanceProfile;
        if (!p) return this.refreshGroup(group);
        return this.apply(group, p);
    },
};

window.AvatarTex = AvatarTex;