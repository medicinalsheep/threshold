import { HumanMesh } from '../engine/humanMesh.js';
import { AssetBundle } from './assetBundle.js';
import { BlenderManifest } from './blenderManifest.js';
import { GltfImport } from './gltfImport.js';
import { LOD_DISTANCES } from './lodConfig.js';
import { buildTcUd, getTcChrSpecs, TC_META, TC_LIC, TC_AUTH, tcSku, tcUri } from './tcMeta.js';

const MAN = 'import/threshold_blender_manifest.json';

async function tryGltf(spec, man) {
    const model = BlenderManifest.modelForObject(man, spec.nm);
    if (!model) return null;
    const lods = BlenderManifest.resolveLodPaths('import', model, man).map((l) => ({
        ...l, url: AssetBundle.getUrl(l.path),
    }));
    const p = lods[0];
    const root = await GltfImport.insertAtCursor({
        url: p.url,
        name: spec.nm,
        usePhysics: false,
        pos: spec.pos,
        lodPaths: lods,
        lodDistances: BlenderManifest.lodDistances(model) || LOD_DISTANCES,
    });
    if (!root) return null;
    Object.assign(root.userData, buildTcUd(spec, TC_META.chr), {
        typ: 'gltf',
        isHuman: true,
        isCharacter: true,
        gltfPath: p.path,
        agentType: 'local',
        agentPersona: spec.persona || '',
    });
    if (spec.rotY != null) root.rotation.y = spec.rotY;
    return root;
}

function spawnMesh(spec) {
    const g = HumanMesh.build({
        bodyColor: spec.mesh?.bodyColor,
        pantsColor: spec.mesh?.pantsColor,
        skinColor: spec.mesh?.skinColor,
        hairColor: spec.mesh?.hairColor,
        roughness: 0.68,
    });
    g.position.set(spec.pos.x, spec.pos.y, spec.pos.z);
    if (spec.rotY != null) g.rotation.y = spec.rotY;
    g.userData.idleSeed = spec.id.length * 0.31;
    Object.assign(g.userData, buildTcUd(spec, TC_META.chr), {
        isHuman: true,
        isCharacter: true,
        agentType: 'local',
        agentPersona: spec.persona || '',
        soundMode: 'clip',
        soundTrigger: 'ambient',
    });
    window.Engine?.scene?.add(g);
    window.State?.objects?.push(g);
    return g;
}

export async function spawnTcChr(opts = {}) {
    let man = null;
    if (!opts.meshOnly) {
        try {
            const res = await fetch(AssetBundle.getUrl(MAN));
            if (res.ok) man = BlenderManifest.parse(await res.json());
        } catch { /* mesh fallback */ }
    }
    let n = 0;
    for (const spec of getTcChrSpecs()) {
        try {
            if (man && await tryGltf(spec, man)) { n += 1; continue; }
        } catch (e) { console.warn('[tc-chr] gltf', spec.id, e); }
        if (spawnMesh(spec)) n += 1;
    }
    return { n, ed: TC_META.chr.ed, ver: TC_META.chr.ver };
}

export function getTcChrCredits() {
    return getTcChrSpecs().map((s) => ({
        id: s.id, label: s.nm, kind: s.k, license: TC_LIC, author: TC_AUTH,
        source: 'TC GLB or HumanMesh', storeSku: tcSku(s.k, s.id.replace(/^tc_/, '')), registryUri: tcUri(s.id.replace(/^tc_/, '')),
    }));
}

window.TcChr = { spawnTcChr, getTcChrCredits };