/** Phase 19.3 — PBR + HILOD on Wardenclyffe GLB shell, liner, doors, lab props */

import { AssetBundle } from './assetBundle.js';
import { TextureManifest } from './textureManifest.js';
import { applyEntriesToMesh, finishMaterial, resolveFinishSettings } from './starterTex.js';

const MAN = 'textures/threshold_manifest.json';

const BRICK_RE = /^(wall_|floor_slab|chimney|window_frame_|shell_lod|door_frame$)/;
const WOOD_RE = /^(liner_|bench_|door_leaf)/;
const ROOF_RE = /^roof$/;
const COPPER_RE = /^(coil_|arc_core|bench_gauge|bench_switch)/;
const DOOR_RE = /^door_(left|right|leaf)/;
const GLASS_RE = /^bench_jar$/;

function textureNameForMesh(meshName = '', rootId = '') {
    const n = meshName.toLowerCase();
    if (ROOF_RE.test(n)) return 'Tesla Roof';
    if (GLASS_RE.test(n)) return null;
    if (COPPER_RE.test(n)) return 'Tesla Coil';
    if (rootId === 'starter_tesla_exterior_door') {
        if (DOOR_RE.test(n)) return 'Tesla Lab Door';
        if (n === 'door_frame') return 'Tesla Brick Wall';
    }
    if (rootId === 'starter_tesla_door') {
        if (/^door_/.test(n)) return 'Tesla Lab Door';
    }
    if (WOOD_RE.test(n)) return 'Tesla Lab Floor';
    if (BRICK_RE.test(n)) return 'Tesla Brick Wall';
    if (rootId === 'starter_tesla_bench') return 'Tesla Bench';
    if (rootId === 'starter_tesla_coil') return 'Tesla Coil';
    if (rootId === 'starter_tesla_building_liner') return 'Tesla Lab Floor';
    if (rootId === 'starter_tesla_building_shell') return 'Tesla Brick Wall';
    return null;
}

function tagGlbMeshes(root) {
    const rootId = root.userData?.id || root.name || '';
    let tagged = 0;
    root.traverse((node) => {
        if (!node.isMesh || !node.material) return;
        const texName = textureNameForMesh(node.name, rootId);
        if (!texName) return;
        node.userData.name = texName;
        node.userData.glbTex193 = true;
        tagged += 1;
    });
    return tagged;
}

const GLB_ROOT_MARKERS = [
    { id: 'starter_tesla_building_shell', flag: 'glb192' },
    { id: 'starter_tesla_building_liner', flag: 'glb192' },
    { id: 'starter_tesla_exterior_door', flag: 'glb192' },
    { id: 'starter_tesla_coil', flag: 'glb185' },
    { id: 'starter_tesla_bench', flag: 'glb185' },
    { id: 'starter_tesla_door', flag: 'glb185' },
];

export async function wireBuildingGlbTextures193() {
    const State = window.State;
    const TB = window.TextureBridge;
    if (!State?.objects || !TB) return { ok: false, reason: 'no-state' };

    let tagged = 0;
    for (const marker of GLB_ROOT_MARKERS) {
        const root = State.objects.find((o) => o.userData?.id === marker.id);
        if (!root?.userData?.[marker.flag]) continue;
        tagged += tagGlbMeshes(root);
    }
    if (!tagged) return { ok: true, skipped: true, tagged: 0 };

    let manifest;
    try {
        const res = await fetch(AssetBundle.getUrl(MAN));
        if (!res.ok) return { ok: false, reason: 'no-manifest', tagged };
        manifest = TextureManifest.parse(await res.json());
    } catch (e) {
        return { ok: false, reason: e.message, tagged };
    }

    let maps = 0;
    let meshes = 0;
    for (const marker of GLB_ROOT_MARKERS) {
        const root = State.objects.find((o) => o.userData?.id === marker.id);
        if (!root?.userData?.[marker.flag]) continue;
        const pending = [];
        root.traverse((node) => {
            if (!node.isMesh || !node.material || !node.userData?.glbTex193) return;
            const entries = TextureManifest.entriesForObject(manifest, node.userData.name);
            if (!entries.length) return;
            pending.push({ node, entries });
        });
        for (const { node, entries } of pending) {
            maps += await applyEntriesToMesh(node, entries, TB);
            meshes += 1;
            finishMaterial(node, resolveFinishSettings(node));
        }
        root.userData.glbTex193 = true;
    }

    window.UI?.status?.(`Wardenclyffe PBR (${maps} maps · ${meshes} GLB meshes · HILOD on)`);
    return { ok: true, tagged, maps, meshes };
}

export const StarterBuildingTex193 = {
    wire: wireBuildingGlbTextures193,
    tagGlbMeshes,
    textureNameForMesh,
};

window.StarterBuildingTex193 = StarterBuildingTex193;
window.wireBuildingGlbTextures193 = wireBuildingGlbTextures193;