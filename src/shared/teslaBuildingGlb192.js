/** Phase 19.2 — Wardenclyffe building shell + wood liner + exterior door GLB + LOD */

import { AssetBundle } from './assetBundle.js';
import { BlenderManifest } from './blenderManifest.js';
import { GltfImport } from './gltfImport.js';
import { MeshLod } from './meshLod.js';
import { LOD_DISTANCES } from './lodConfig.js';

const MAN = 'import/threshold_blender_manifest.json';

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

async function upgradeShell(shellGroup, buildingGroup, model, man) {
    const lods = lodsWithUrls(model, man);
    const lod0 = await loadScene(lods[0].url);
    clearChildren(shellGroup);
    shellGroup.add(lod0);
    if (lods.length > 1) {
        await MeshLod.initChain(shellGroup, lod0, lods, {
            distances: BlenderManifest.lodDistances(model) || LOD_DISTANCES,
        });
    }
    shellGroup.userData = {
        ...shellGroup.userData,
        glb192: true,
        glbPath: lods[0].path,
        lodPaths: lods,
        lodDistances: BlenderManifest.lodDistances(model) || LOD_DISTANCES,
    };
    if (buildingGroup?.userData) {
        buildingGroup.userData.glb192Shell = true;
        buildingGroup.userData.lodPaths = lods;
        buildingGroup.userData.lodDistances = BlenderManifest.lodDistances(model) || LOD_DISTANCES;
    }
    return true;
}

async function upgradeLiner(linerGroup, model, man) {
    const path = BlenderManifest.resolveModelPath('import', model, man);
    const scene = await loadScene(AssetBundle.getUrl(path));
    clearChildren(linerGroup);
    linerGroup.add(scene);
    linerGroup.userData = {
        ...linerGroup.userData,
        glb192: true,
        glbPath: path,
    };
    return true;
}

async function upgradeExteriorDoor(doorGroup, model, man) {
    const path = BlenderManifest.resolveModelPath('import', model, man);
    const scene = await loadScene(AssetBundle.getUrl(path));
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
        glb192: true,
        glbPath: path,
        doorMeshes: leaves.length ? leaves : saved.doorMeshes,
        doorOpen: saved.doorOpen ?? 0,
    };
    return true;
}

export async function upgradeTeslaBuildingGlb192() {
    const State = window.State;
    if (!State?.objects) return { ok: false, reason: 'no-state' };

    const building = State.objects.find((o) => o.name === 'starter_tesla_building');
    const shell = State.objects.find((o) => o.userData?.id === 'starter_tesla_building_shell');
    const liner = State.objects.find((o) => o.userData?.id === 'starter_tesla_building_liner');
    const door = State.objects.find((o) => o.userData?.id === 'starter_tesla_exterior_door');
    if (!building || !shell || !liner || !door) return { ok: false, reason: 'no-building' };
    if (shell.userData?.glb192) return { ok: true, skipped: true };

    const man = await fetchMan();
    if (!man) return { ok: false, reason: 'no-manifest' };

    const shellModel = BlenderManifest.modelForObject(man, 'Wardenclyffe Building');
    const linerModel = BlenderManifest.modelForObject(man, 'Lab Wood Liner');
    const doorModel = BlenderManifest.modelForObject(man, 'Wardenclyffe Door');
    if (!shellModel || !linerModel || !doorModel) return { ok: false, reason: 'manifest-models' };

    let n = 0;
    try {
        if (await upgradeShell(shell, building, shellModel, man)) n += 1;
        if (await upgradeLiner(liner, linerModel, man)) n += 1;
        if (await upgradeExteriorDoor(door, doorModel, man)) n += 1;
    } catch (e) {
        console.warn('[tesla-building-glb]', e);
        return { ok: false, reason: 'load-failed', err: String(e) };
    }

    if (n) {
        await window.wireBuildingGlbTextures193?.();
    }
    return { ok: true, n };
}

export const TeslaBuildingGlb192 = {
    upgrade: upgradeTeslaBuildingGlb192,
};

window.TeslaBuildingGlb192 = TeslaBuildingGlb192;
window.upgradeTeslaBuildingGlb192 = upgradeTeslaBuildingGlb192;