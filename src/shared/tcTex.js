import { AssetBundle } from './assetBundle.js';
import { TextureManifest } from './textureManifest.js';
import { TextureHilod } from './textureHilod.js';

const MAN = 'textures/threshold_manifest.json';

function meshesFor(root) {
    const out = [];
    root.traverse?.((c) => {
        if (c.isMesh && c.material) out.push(c);
    });
    if (!out.length && root.material) out.push(root);
    return out;
}

function isTcObj(obj) {
    return !!(obj?.userData?.isTC || obj?.userData?.isThresholdChild);
}

async function applyBundledMaps(root, entries) {
    const TB = window.TextureBridge;
    if (!TB) return 0;
    const targets = meshesFor(root);
    if (!targets.length) return 0;
    let applied = 0;
    const mesh = targets[0];

    for (const entry of entries) {
        const filePath = entry.path || `textures/${entry.file}`;
        try {
            await TB.applyPathToObject(mesh, entry.slot, filePath);
            applied += 1;
            for (const variant of entry.variants || []) {
                const vPath = variant.path || filePath.replace(/(\.[^.]+)$/i, `${variant.suffix || ''}$1`);
                TextureHilod.registerVariant(mesh, entry.slot, vPath, null);
            }
        } catch (e) {
            console.warn('[tc-tex]', entry.slot, filePath, e);
        }
    }

    TextureHilod.registerFromManifestEntries(mesh, entries);
    await TextureHilod.discoverVariantsFromBundle(mesh);

    const albedo = entries.find((e) => e.slot === 'albedo');
    if (albedo?.path) root.userData.textureHint = albedo.path;
    if (mesh.userData.textureHilod) {
        root.userData.textureHilod = mesh.userData.textureHilod;
        root.userData.textures = { ...(mesh.userData.textures || {}) };
    }
    root.userData.gimpManifestPath = MAN;
    root.userData.tcTex = 'r6';

    if (targets.length > 1) {
        for (let i = 1; i < targets.length; i += 1) {
            const m = targets[i];
            if (mesh.userData.textures) m.userData.textures = { ...mesh.userData.textures };
            if (mesh.userData.textureHilod) m.userData.textureHilod = mesh.userData.textureHilod;
        }
    }
    return applied;
}

export async function wireTcTextures() {
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
        if (!isTcObj(obj)) continue;
        const name = obj.userData?.name;
        const entries = TextureManifest.entriesForObject(manifest, name);
        if (!entries.length) continue;
        const n = await applyBundledMaps(obj, entries);
        if (n) { wired += 1; maps += n; }
    }

    if (wired) {
        await window.TextureHilod?.refreshAll?.();
        window.UI?.status?.(`TC tex r6: ${wired} obj · ${maps} maps · HILOD`);
    }
    return { n: wired, maps, realism: 'r6' };
}

export function getTcTexCredits() {
    return [
        { id: 'tc_tex_run', label: 'TC Runner PBR', kind: 'texture', license: 'Original — TC', source: 'tc-gen-tex r6' },
        { id: 'tc_tex_haul', label: 'TC Hauler PBR', kind: 'texture', license: 'Original — TC', source: 'tc-gen-tex r6' },
        { id: 'tc_tex_msh', label: 'TC Marshal PBR', kind: 'texture', license: 'Original — TC', source: 'tc-gen-tex r6' },
        { id: 'tc_tex_mec', label: 'TC Mechanic PBR', kind: 'texture', license: 'Original — TC', source: 'tc-gen-tex r6' },
        { id: 'tc_tex_span', label: 'TC Span PBR', kind: 'texture', license: 'Original — TC', source: 'tc-gen-tex r6' },
    ];
}

window.TcTex = { wireTcTextures, getTcTexCredits };