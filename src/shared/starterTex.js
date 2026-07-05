import { AssetBundle } from './assetBundle.js';
import { TextureManifest } from './textureManifest.js';

const MAN = 'textures/threshold_manifest.json';

export async function wireStarterTextures() {
    const TB = window.TextureBridge;
    if (!TB) return { n: 0, err: 'no TextureBridge' };

    let manifest;
    try {
        const res = await fetch(AssetBundle.getUrl(MAN));
        if (!res.ok) return { n: 0, err: 'no manifest' };
        manifest = TextureManifest.parse(await res.json());
    } catch (e) {
        return { n: 0, err: e.message };
    }

    let wired = 0;
    let maps = 0;
    for (const obj of window.State?.objects || []) {
        const name = obj.userData?.name;
        if (!name) continue;
        const entries = TextureManifest.entriesForObject(manifest, name);
        if (!entries.length) continue;

        const mesh = obj.isMesh ? obj : null;
        const targets = mesh ? [mesh] : [];
        obj.traverse?.((c) => {
            if (c.isMesh && c.material) targets.push(c);
        });
        if (!targets.length) continue;

        for (const entry of entries) {
            const filePath = entry.path || `textures/${entry.file}`;
            try {
                await TB.applyPathToObject(targets[0], entry.slot, filePath);
                maps += 1;
            } catch (e) {
                console.warn('[starter-tex]', name, entry.slot, e);
            }
        }
        wired += 1;
    }
    return { n: wired, maps };
}

window.StarterTex = { wireStarterTextures };