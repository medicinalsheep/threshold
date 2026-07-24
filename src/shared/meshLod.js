import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThresholdShell } from './thresholdShell.js';
import { AssetBundle } from './assetBundle.js';
import { LOD_DISTANCES, pickLodLevel } from './lodConfig.js';
import { waitWhileLoadSuspended, isLoadSuspended } from './aiMemoryFreeze.js';

const loader = new GLTFLoader();
const DEFAULT_DISTANCES = LOD_DISTANCES;
const _camPos = new THREE.Vector3();
const _objPos = new THREE.Vector3();

function mimeFromPath(filePath = '') {
    return filePath.toLowerCase().endsWith('.gltf') ? 'model/gltf+json' : 'model/gltf-binary';
}

function attachGltfMeta(gltf) {
    const scene = gltf.scene;
    scene.userData._gltfAnimations = gltf.animations || [];
    return scene;
}

async function loadGltfSource(source) {
    if (source.url) {
        const gltf = await loader.loadAsync(source.url);
        return attachGltfMeta(gltf);
    }
    if (source.path && ThresholdShell.isNative) {
        let buf = await ThresholdShell.readBinary(source.path);
        if (!buf) buf = await AssetBundle.readBinary(source.path);
        if (!buf) throw new Error(`LOD file not found: ${source.path}`);
        const blob = new Blob([buf], { type: mimeFromPath(source.path) });
        const url = URL.createObjectURL(blob);
        try {
            const gltf = await loader.loadAsync(url);
            return attachGltfMeta(gltf);
        } finally {
            URL.revokeObjectURL(url);
        }
    }
    if (source.path) {
        const file = await AssetBundle.loadFile(source.path, source.file);
        if (!file) throw new Error(`LOD bundle missing: ${source.path}`);
        const url = URL.createObjectURL(file);
        try {
            const gltf = await loader.loadAsync(url);
            return attachGltfMeta(gltf);
        } finally {
            URL.revokeObjectURL(url);
        }
    }
    throw new Error('LOD source requires url or path');
}

const _c0 = new THREE.Vector3();
const _cN = new THREE.Vector3();

/**
 * Match height, feet (Y), and XZ centroid so LOD swaps don't hop sideways.
 */
function alignLodScene(scene, lod0Scene) {
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);
    scene.scale.set(1, 1, 1);
    scene.updateMatrixWorld(true);
    const box0 = new THREE.Box3().setFromObject(lod0Scene);
    const boxN = new THREE.Box3().setFromObject(scene);
    if (box0.isEmpty() || boxN.isEmpty()) return scene;
    const size0 = new THREE.Vector3();
    const sizeN = new THREE.Vector3();
    box0.getSize(size0);
    boxN.getSize(sizeN);
    if (sizeN.y > 0 && size0.y > 0) {
        const s = size0.y / sizeN.y;
        scene.scale.setScalar(s);
        scene.updateMatrixWorld(true);
    }
    let boxN2 = new THREE.Box3().setFromObject(scene);
    // Feet to same ground plane
    scene.position.y += box0.min.y - boxN2.min.y;
    scene.updateMatrixWorld(true);
    boxN2 = new THREE.Box3().setFromObject(scene);
    // XZ center — prevents lateral hop when LODs have different AABB (face/detail drop)
    box0.getCenter(_c0);
    boxN2.getCenter(_cN);
    scene.position.x += _c0.x - _cN.x;
    scene.position.z += _c0.z - _cN.z;
    scene.updateMatrixWorld(true);
    // Re-feet after XZ shift
    boxN2 = new THREE.Box3().setFromObject(scene);
    scene.position.y += box0.min.y - boxN2.min.y;
    return scene;
}

/**
 * Hysteresis so zooming near a threshold doesn't thrash LOD levels.
 * @param {number} band meters of stickiness (default 1.5)
 */
export function pickLodLevelHysteresis(distance, distances, current = 0, band = 1.5) {
    const raw = pickLodLevel(distance, distances);
    if (!distances?.length) return raw;
    const cur = Math.max(0, Math.min(current ?? 0, distances.length - 1));
    if (raw === cur) return cur;
    if (raw > cur) {
        // Going farther — only step up when past threshold + band
        const thr = distances[raw] ?? 0;
        return distance >= thr + band ? raw : cur;
    }
    // Coming closer — only step down when below current rung − band
    const thr = distances[cur] ?? 0;
    return distance <= thr - band ? raw : cur;
}

export const MeshLod = {
    DEFAULT_DISTANCES,

    distancesFor(userData = {}) {
        return userData.lodDistances?.length
            ? userData.lodDistances
            : DEFAULT_DISTANCES;
    },

    pickLevel(distance, distances = DEFAULT_DISTANCES, current = 0, opts = {}) {
        if (opts.hysteresis || opts.band) {
            return pickLodLevelHysteresis(distance, distances, current, opts.band ?? 1.5);
        }
        return pickLodLevel(distance, distances);
    },

    physicsSource(root) {
        const scenes = root?.userData?._lodScenes;
        if (scenes?.length) return scenes[0];
        return root;
    },

    setActiveLevel(root, level) {
        const scenes = root?.userData?._lodScenes;
        if (!scenes?.length) return;
        const idx = Math.max(0, Math.min(level, scenes.length - 1));
        scenes.forEach((scene, i) => {
            scene.visible = i === idx;
        });
        root.userData.lodActive = idx;
    },
    // AvatarLod may wrap setActiveLevel after load for hair/mod rebind

    async initChain(container, lod0Scene, lodEntries = [], options = {}) {
        if (!lodEntries.length || lodEntries.length < 2) {
            container.userData._lodScenes = [lod0Scene];
            container.userData.lodActive = 0;
            return container;
        }

        const scenes = [lod0Scene];
        lod0Scene.visible = true;

        const extras = lodEntries
            .filter((e) => (e.level ?? 0) > 0)
            .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

        for (const entry of extras) {
            await waitWhileLoadSuspended();
            try {
                const scene = await loadGltfSource({
                    url: entry.url,
                    path: entry.path,
                    file: entry.file,
                });
                alignLodScene(scene, lod0Scene);
                scene.visible = false;
                container.add(scene);
                scenes.push(scene);
            } catch (e) {
                console.warn('[mesh-lod] failed to load', entry.file || entry.path, e);
            }
        }

        container.userData._lodScenes = scenes;
        container.userData.lodPaths = lodEntries;
        container.userData.lodDistances = options.distances
            || lodEntries.map((e) => e.distance ?? 0)
            || DEFAULT_DISTANCES;
        container.userData.lodActive = 0;
        return container;
    },

    update(camera = window.Engine?.camera) {
        if (isLoadSuspended()) return;
        const State = window.State;
        if (!camera || !State?.objects) return;
        camera.getWorldPosition(_camPos);
        const Vis = window.VisibilitySystem;

        for (const obj of State.objects) {
            const scenes = obj.userData?._lodScenes;
            if (!scenes || scenes.length < 2) continue;
            // E1: skip off-screen (D/E) mesh LOD evaluation
            if (Vis && !Vis.shouldProcessLod(obj)) continue;
            obj.getWorldPosition(_objPos);
            const dist = Number.isFinite(obj.userData?._visDist)
                ? obj.userData._visDist
                : _camPos.distanceTo(_objPos);
            const distances = this.distancesFor(obj.userData);
            const cur = obj.userData.lodActive ?? 0;
            // Avatars: hysteresis to stop zoom thrash; world props soft band
            const level = this.pickLevel(dist, distances, cur, {
                hysteresis: true,
                band: obj.userData?.avatarLod ? 1.75 : 1.25,
            });
            if (level !== cur) {
                this.setActiveLevel(obj, level);
            }
        }
    },

    dispose(root) {
        const scenes = root?.userData?._lodScenes;
        if (!scenes) return;
        scenes.forEach((scene, i) => {
            if (i === 0) return;
            scene.traverse((c) => {
                c.geometry?.dispose?.();
                if (c.material) {
                    if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
                    else c.material.dispose?.();
                }
            });
        });
        delete root.userData._lodScenes;
    },
};

window.MeshLod = MeshLod;