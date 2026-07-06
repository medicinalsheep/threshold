/** Phase 18.5 — Tesla lab GLB + LOD upgrade (coil, bench, door) */

import { AssetBundle } from './assetBundle.js';
import { BlenderManifest } from './blenderManifest.js';
import { GltfImport } from './gltfImport.js';
import { MeshLod } from './meshLod.js';
import { LOD_DISTANCES } from './lodConfig.js';

const MAN = 'import/threshold_blender_manifest.json';
const LAB_IDS = ['starter_tesla_coil', 'starter_tesla_bench', 'starter_tesla_door'];

function disposeNode(node) {
    node.traverse((c) => {
        c.geometry?.dispose?.();
        if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
            else c.material.dispose?.();
        }
    });
}

function clearChildren(group) {
    while (group.children.length) {
        const ch = group.children[0];
        group.remove(ch);
        disposeNode(ch);
    }
}

function findByName(root, name) {
    let hit = null;
    root.traverse((c) => {
        if (!hit && c.name === name) hit = c;
    });
    return hit;
}

function findMeshes(root, names) {
    const out = [];
    root.traverse((c) => {
        if (c.isMesh && names.includes(c.name)) out.push(c);
    });
    return out;
}

async function fetchMan() {
    const res = await fetch(AssetBundle.getUrl(MAN));
    if (!res.ok) return null;
    return BlenderManifest.parse(await res.json());
}

function lodsWithUrls(model, man) {
    return BlenderManifest.resolveLodPaths('import', model, man).map((l) => ({
        ...l,
        url: AssetBundle.getUrl(l.path),
    }));
}

async function loadScene(url) {
    const scene = await GltfImport.loadFromUrl(url);
    scene.traverse((c) => {
        if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
        }
    });
    return scene;
}

async function upgradeCoil(coilGroup, model, man) {
    const lods = lodsWithUrls(model, man);
    const lod0 = await loadScene(lods[0].url);
    const saved = { ...coilGroup.userData };
    clearChildren(coilGroup);
    coilGroup.add(lod0);
    if (lods.length > 1) {
        await MeshLod.initChain(coilGroup, lod0, lods, {
            distances: BlenderManifest.lodDistances(model) || LOD_DISTANCES,
        });
    }
    const arcMesh = findByName(coilGroup, 'arc_core');
    const coilParts = findMeshes(coilGroup, ['coil_primary', 'coil_secondary', 'coil_top']);
    coilGroup.userData = {
        ...saved,
        glb185: true,
        glbPath: lods[0].path,
        glbFile: lods[0].file,
        lodPaths: lods,
        lodDistances: BlenderManifest.lodDistances(model) || LOD_DISTANCES,
        arcMesh: arcMesh || saved.arcMesh,
        coilParts: coilParts.length ? coilParts : saved.coilParts,
    };
    return true;
}

async function upgradeBench(benchGroup, model, man) {
    const path = BlenderManifest.resolveModelPath('import', model, man);
    const url = AssetBundle.getUrl(path);
    const scene = await loadScene(url);
    const saved = { ...benchGroup.userData };
    clearChildren(benchGroup);
    benchGroup.add(scene);
    benchGroup.userData = {
        ...saved,
        glb185: true,
        glbPath: path,
        glbFile: model.file,
    };
    return true;
}

async function upgradeDoor(doorGroup, model, man) {
    const path = BlenderManifest.resolveModelPath('import', model, man);
    const url = AssetBundle.getUrl(path);
    const scene = await loadScene(url);
    const saved = { ...doorGroup.userData };
    clearChildren(doorGroup);
    doorGroup.add(scene);
    const doorL = findByName(doorGroup, 'door_left');
    const doorR = findByName(doorGroup, 'door_right');
    const leaves = [];
    if (doorL) {
        doorL.userData.doorLeaf = true;
        doorL.userData.doorSide = 'left';
        leaves.push(doorL);
    }
    if (doorR) {
        doorR.userData.doorLeaf = true;
        doorR.userData.doorSide = 'right';
        leaves.push(doorR);
    }
    doorGroup.userData = {
        ...saved,
        glb185: true,
        glbPath: path,
        glbFile: model.file,
        doorMeshes: leaves.length ? leaves : saved.doorMeshes,
        doorOpen: saved.doorOpen ?? 0,
    };
    return true;
}

export async function upgradeTeslaLabGlb185() {
    const State = window.State;
    if (!State?.objects) return { ok: false, reason: 'no-state' };
    const coil = State.objects.find((o) => o.userData?.id === 'starter_tesla_coil');
    if (!coil) return { ok: false, reason: 'no-lab' };
    if (coil.userData?.glb185) return { ok: true, skipped: true };

    const bench = State.objects.find((o) => o.userData?.id === 'starter_tesla_bench');
    const door = State.objects.find((o) => o.userData?.id === 'starter_tesla_door');
    if (!bench || !door) return { ok: false, reason: 'missing-props' };

    const man = await fetchMan();
    if (!man) return { ok: false, reason: 'no-manifest' };

    const coilModel = BlenderManifest.modelForObject(man, 'Tesla Coil');
    const benchModel = BlenderManifest.modelForObject(man, 'Lab Bench');
    const doorModel = BlenderManifest.modelForObject(man, 'Lab Door');
    if (!coilModel || !benchModel || !doorModel) return { ok: false, reason: 'manifest-models' };

    let n = 0;
    try {
        if (await upgradeCoil(coil, coilModel, man)) n += 1;
        if (await upgradeBench(bench, benchModel, man)) n += 1;
        if (await upgradeDoor(door, doorModel, man)) n += 1;
    } catch (e) {
        console.warn('[tesla-lab-glb]', e);
        return { ok: false, reason: 'load-failed', err: String(e) };
    }

    if (n) window.UI?.status?.(`Tesla lab GLB+LOD (${n} props)`);
    return { ok: true, n };
}

export const TeslaLabGlb185 = {
    upgrade: upgradeTeslaLabGlb185,
    labIds: LAB_IDS,
};

window.TeslaLabGlb185 = TeslaLabGlb185;
window.upgradeTeslaLabGlb185 = upgradeTeslaLabGlb185;