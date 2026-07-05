/**
 * Threshold Child vehicles — Blender-authored GLB + LOD (R2).
 * Loads from import/threshold_blender_manifest.json via AssetBundle.
 */

import { AssetBundle } from './assetBundle.js';
import { BlenderManifest } from './blenderManifest.js';
import { GltfImport } from './gltfImport.js';
import { LOD_DISTANCES } from './lodConfig.js';
import {
    buildChildUserData,
    CHILD_VEHICLES_META,
    getChildVehicleSpecs,
} from './thresholdChildMeta.js';
import { spawnCircuitSpan } from './thresholdChildAssets.js';

const MANIFEST_REL = 'import/threshold_blender_manifest.json';

function lodEntriesWithUrls(manifestDir, model, manifest) {
    return BlenderManifest.resolveLodPaths(manifestDir, model, manifest).map((lod) => ({
        ...lod,
        url: AssetBundle.getUrl(lod.path),
    }));
}

async function fetchManifest() {
    const url = AssetBundle.getUrl(MANIFEST_REL);
    const res = await fetch(url);
    if (!res.ok) return null;
    return BlenderManifest.parse(await res.json());
}

async function spawnVehicleGltf(manifest, spec) {
    const model = BlenderManifest.modelForObject(manifest, spec.objectName);
    if (!model) return null;

    const lodPaths = lodEntriesWithUrls('import', model, manifest);
    if (!lodPaths.length) return null;

    const primary = lodPaths[0];
    const root = await GltfImport.insertAtCursor({
        url: primary.url,
        name: spec.label,
        usePhysics: spec.hasPhysics !== false,
        mass: model.mass ?? spec.mass,
        friction: model.friction ?? spec.friction,
        restitution: model.restitution ?? spec.restitution,
        pos: spec.pos,
        lodPaths,
        lodDistances: BlenderManifest.lodDistances(model) || LOD_DISTANCES,
    });

    if (!root) return null;

    const childMeta = buildChildUserData(spec, CHILD_VEHICLES_META);
    Object.assign(root.userData, childMeta, {
        type: 'gltf',
        gltfPath: primary.path,
        gltfFile: primary.file,
        blenderManifestPath: MANIFEST_REL,
        lodPaths,
        lodDistances: BlenderManifest.lodDistances(model) || LOD_DISTANCES,
    });

    return root;
}

export async function spawnThresholdChildVehicles() {
    const manifest = await fetchManifest();
    if (!manifest) {
        return { spawned: 0, edition: CHILD_VEHICLES_META.edition, error: 'manifest missing' };
    }

    let spawned = 0;
    const specs = getChildVehicleSpecs();

    for (const spec of specs) {
        try {
            if (await spawnVehicleGltf(manifest, spec)) spawned += 1;
        } catch (e) {
            console.warn('[child-vehicles] spawn failed', spec.label, e);
        }
    }

    if (spawnCircuitSpan({ x: 0, y: 0, z: -8 })) spawned += 1;

    if (spawned) {
        const Engine = window.Engine;
        if (Engine?.setRenderMode && (window.State?.renderMode ?? 0) < 4) {
            Engine.setRenderMode(4);
        }
        window.UI?.status?.(
            `Threshold Child Vehicles v${CHILD_VEHICLES_META.version}: ${spawned} asset(s) — GLB+LOD · EXPORT → SCENE / CREDITS / PACKS`
        );
    }

    return { spawned, edition: CHILD_VEHICLES_META.edition, version: CHILD_VEHICLES_META.version };
}

export function getChildVehicleCreditEntries() {
    return getChildVehicleSpecs().map((spec) => ({
        id: spec.id,
        label: spec.label,
        kind: spec.kind,
        license: CHILD_VEHICLES_META.license,
        author: CHILD_VEHICLES_META.author,
        source: 'Threshold Child edition — Blender GLB + LOD',
        storeSku: spec.storeSku || `childvehicles.${spec.kind}.${spec.id.replace(/^child_/, '')}`,
        registryUri: spec.registryUri || `threshold://${CHILD_VEHICLES_META.bundleId}/asset/${spec.id.replace(/^child_/, '')}`,
    }));
}

window.ThresholdChildVehicles = {
    spawnThresholdChildVehicles,
    getChildVehicleCreditEntries,
};