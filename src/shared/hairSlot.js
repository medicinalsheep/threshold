/** Hair slot — attach manifest hair GLB to body anchor (R8.2) */

import { AssetBundle } from './assetBundle.js';
import { GltfImport } from './gltfImport.js';
import { AvatarManifest } from './avatarManifest.js';

function findAttachPoint(root, names = []) {
    let hit = null;
    root.traverse((c) => {
        if (!hit && names.includes(c.name)) hit = c;
    });
    return hit || root;
}

function disposeHair(node) {
    if (!node) return;
    node.traverse((c) => {
        c.geometry?.dispose?.();
        if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
            else c.material.dispose?.();
        }
    });
}

export const HairSlot = {
    detach(group) {
        const prev = group?.userData?._hairNode;
        if (prev?.parent) prev.parent.remove(prev);
        disposeHair(prev);
        group.userData._hairNode = null;
        const parts = group.userData?.humanParts;
        if (parts?.hairCap) parts.hairCap.visible = true;
    },

    async attach(group, profile) {
        if (!group) return null;
        this.detach(group);

        const hairId = profile?.hairId || 'none';
        const spec = AvatarManifest.hair(hairId);
        if (!spec || spec.procedural || hairId === 'none') {
            return null;
        }

        let file = profile?.customHairGlb || spec.glb;
        if (!file) return null;

        const url = file.startsWith('http') ? file : AssetBundle.getUrl(`import/${file.replace(/^import\//, '')}`);
        const scene = await GltfImport.loadFromUrl(url);
        scene.traverse((c) => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });
        scene.userData.hairSlot = true;
        scene.name = hairId;

        const anchors = AvatarManifest.attachPointNames('hair');
        const attach = findAttachPoint(group, anchors);
        attach.add(scene);
        group.userData._hairNode = scene;

        const parts = group.userData?.humanParts;
        if (parts?.hairCap) parts.hairCap.visible = false;

        return scene;
    },

    setFirstPersonVisible(group, visible) {
        const hair = group?.userData?._hairNode;
        if (hair) hair.visible = visible;
        group?.traverse?.((c) => {
            if (c.userData?.hairSlot || c.name?.startsWith?.('hair_')) {
                c.visible = visible;
            }
        });
    },
};

window.HairSlot = HairSlot;