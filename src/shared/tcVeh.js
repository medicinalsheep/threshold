import { AssetBundle } from './assetBundle.js';
import { BlenderManifest } from './blenderManifest.js';
import { GltfImport } from './gltfImport.js';
import { LOD_DISTANCES } from './lodConfig.js';
import { buildTcUd, getTcVehSpecs, TC_META, TC_LIC, TC_AUTH, tcSku, tcUri } from './tcMeta.js';
import { spawnTcSpan } from './tcLite.js';

const MAN = 'import/threshold_blender_manifest.json';

function lodsWithUrls(mdir, model, man) {
    return BlenderManifest.resolveLodPaths(mdir, model, man).map((l) => ({ ...l, url: AssetBundle.getUrl(l.path) }));
}

async function fetchMan() {
    const res = await fetch(AssetBundle.getUrl(MAN));
    if (!res.ok) return null;
    return BlenderManifest.parse(await res.json());
}

async function spawnGltf(man, spec) {
    const model = BlenderManifest.modelForObject(man, spec.objectName);
    if (!model) return null;
    const lods = lodsWithUrls('import', model, man);
    const p = lods[0];
    const root = await GltfImport.insertAtCursor({
        url: p.url,
        name: spec.nm,
        usePhysics: spec.phys !== false,
        mass: model.mass ?? spec.mass,
        friction: model.friction ?? spec.fric,
        restitution: model.restitution ?? spec.rest,
        pos: spec.pos,
        lodPaths: lods,
        lodDistances: BlenderManifest.lodDistances(model) || LOD_DISTANCES,
    });
    if (!root) return null;
    Object.assign(root.userData, buildTcUd(spec, TC_META.veh), {
        typ: 'gltf',
        gltfPath: p.path,
        gltfFile: p.file,
        blenderManifestPath: MAN,
        lodPaths: lods,
    });
    return root;
}

export async function spawnTcVeh() {
    const man = await fetchMan();
    if (!man) return { n: 0, ed: TC_META.veh.ed, err: 'no manifest' };
    let n = 0;
    for (const spec of getTcVehSpecs()) {
        try { if (await spawnGltf(man, spec)) n += 1; } catch (e) { console.warn('[tc-veh]', spec.id, e); }
    }
    if (spawnTcSpan({ x: 0, y: 0, z: -8 })) n += 1;
    if (n) {
        window.Engine?.setRenderMode?.(4);
        window.UI?.status?.(`TC veh v${TC_META.veh.ver}: ${n} — EXPORT SCENE/CREDITS`);
    }
    return { n, ed: TC_META.veh.ed, ver: TC_META.veh.ver };
}

export function getTcVehCredits() {
    return getTcVehSpecs().map((s) => ({
        id: s.id, label: s.nm, kind: s.k, license: TC_LIC, author: TC_AUTH,
        source: 'TC GLB+LOD', storeSku: tcSku(s.k, s.slug), registryUri: tcUri(s.slug),
    }));
}

window.TcVeh = { spawnTcVeh, getTcVehCredits };