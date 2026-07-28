import { AssetBundle } from './assetBundle.js';
import { TextureManifest } from './textureManifest.js';
import starterTexCfg from '../../config/starter-textures.json';

const MAN = 'textures/threshold_manifest.json';

export function finishMaterial(mesh, settings = {}) {
    const mat = mesh?.material;
    if (!mat) return;
    const rep = settings.uvRepeat || starterTexCfg.defaults?.uvRepeat || [2, 2];
    const ns = settings.normalScale ?? starterTexCfg.defaults?.normalScale ?? 1;
    const env = settings.envMapIntensity ?? starterTexCfg.defaults?.envMapIntensity;

    const maps = ['map', 'roughnessMap', 'metalnessMap', 'normalMap'];
    maps.forEach((prop) => {
        const tex = mat[prop];
        if (tex) {
            tex.wrapS = window.THREE?.RepeatWrapping ?? tex.wrapS;
            tex.wrapT = window.THREE?.RepeatWrapping ?? tex.wrapT;
            tex.repeat.set(rep[0], rep[1]);
            tex.needsUpdate = true;
        }
    });
    if (mat.normalScale) mat.normalScale.set(ns, ns);
    if (env != null && 'envMapIntensity' in mat) mat.envMapIntensity = env;
    mat.needsUpdate = true;
}

export function resolveFinishSettings(obj) {
    const name = obj.userData?.name;
    const byName = name && starterTexCfg.objects?.[name];
    if (byName) return byName;
    const id = obj.userData?.id;
    const aliasName = id && starterTexCfg.aliases?.[id];
    if (aliasName && starterTexCfg.objects?.[aliasName]) {
        return starterTexCfg.objects[aliasName];
    }
    return starterTexCfg.defaults || {};
}

/**
 * Prefer explicit HILOD tier over bare master (same res often — thrash flash).
 * Order: _2k → _1k → bare.
 */
export function preferTierPath(entry) {
    if (!entry) return null;
    const variants = entry.variants || [];
    const pick = (suf) => variants.find((v) => (v.suffix || '').toLowerCase() === suf);
    const v2 = pick('_2k');
    if (v2) return v2.path || `textures/${v2.file}`;
    const v1 = pick('_1k');
    if (v1) return v1.path || `textures/${v1.file}`;
    return entry.path || (entry.file ? `textures/${entry.file}` : null);
}

export async function applyEntriesToMesh(mesh, entries, TB) {
    let maps = 0;
    for (const entry of entries) {
        const filePath = preferTierPath(entry);
        if (!filePath) continue;
        try {
            await TB.applyPathToObject(mesh, entry.slot, filePath, {
                skipBareMaster: true,
                lockHilod: true,
            });
            maps += 1;
        } catch (e) {
            console.warn('[starter-tex]', mesh.userData?.name, entry.slot, e);
        }
    }
    // Hand-painted / starter maps: freeze HILOD after apply (anti-glitch)
    if (mesh?.userData) {
        mesh.userData.noTextureHilod = true;
        if (mesh.userData.isMaterialExample) {
            mesh.userData.negativeLodExempt = true;
        }
    }
    finishMaterial(mesh, resolveFinishSettings(mesh));
    return maps;
}

export async function wireStarterTextures() {
    const TB = window.TextureBridge;
    if (!TB) return { n: 0, err: 'no TextureBridge' };

    let manifest;
    try {
        const blob = await AssetBundle.fetchBlob(MAN, { retries: 2 });
        if (!blob) {
            console.warn('[starter-tex] manifest missing at', AssetBundle.getUrl(MAN));
            return { n: 0, err: 'no manifest' };
        }
        const text = await blob.text();
        manifest = TextureManifest.parse(text);
    } catch (e) {
        console.warn('[starter-tex] manifest', e);
        return { n: 0, err: e.message };
    }

    let wired = 0;
    let maps = 0;

    for (const obj of window.State?.objects || []) {
        const name = obj.userData?.name;
        if (!name) continue;

        let entries = TextureManifest.entriesForObject(manifest, name);
        if (!entries.length) {
            const aliasTarget = starterTexCfg.aliases?.[obj.userData?.id];
            if (aliasTarget) {
                entries = TextureManifest.entriesForObject(manifest, aliasTarget);
            }
        }
        if (!entries.length) continue;

        const targets = [];
        if (obj.isMesh && obj.material) targets.push(obj);
        obj.traverse?.((c) => {
            if (c.isMesh && c.material) targets.push(c);
        });
        if (!targets.length) continue;

        for (const mesh of targets) {
            maps += await applyEntriesToMesh(mesh, entries, TB);
        }
        wired += 1;
    }

    return { n: wired, maps };
}

window.StarterTex = {
    wireStarterTextures,
    finishMaterial,
    resolveFinishSettings,
    preferTierPath,
    applyEntriesToMesh,
};