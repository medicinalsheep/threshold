import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BlenderManifest } from './blenderManifest.js';
import { ThresholdShell } from './thresholdShell.js';
import { MeshLod } from './meshLod.js';
import { CREATIVE_WATCH_URL } from '../config.js';

const loader = new GLTFLoader();
const GLTF_FILTERS = [
    { name: 'GLTF Models', extensions: ['glb', 'gltf'] },
];
const MANIFEST_FILTERS = [
    { name: 'Threshold Blender Manifest', extensions: ['json'] },
];

function mimeFromPath(filePath = '') {
    return filePath.toLowerCase().endsWith('.gltf') ? 'model/gltf+json' : 'model/gltf-binary';
}

function slugify(name = '') {
    return String(name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'model';
}

function disposeObject3D(root) {
    root.traverse((c) => {
        if (c.geometry) c.geometry.dispose?.();
        if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
            else c.material.dispose?.();
        }
    });
}

function findGltfTargets(event = {}) {
    const State = window.State;
    if (!State?.objects) return [];
    const file = event.file || event.path?.split(/[/\\]/).pop() || '';
    const slug = event.slug || slugify(file.replace(/\.(glb|gltf)$/i, ''));
    return State.objects.filter((obj) => {
        if (obj.userData?.type !== 'gltf') return false;
        if (slug && slugify(obj.userData?.name) === slug) return true;
        if (file && (obj.userData?.gltfFile === file || obj.userData?.gltfPath?.includes(file))) return true;
        return false;
    });
}

function removeGltfFromWorld(root) {
    const State = window.State;
    const Engine = window.Engine;
    const Physics = window.Physics;
    if (!root || !State || !Engine) return;

    if (State.selectedObject === root) window.UI?.deselectObject?.();
    const physIdx = State.physicsObjects.findIndex((p) => p.mesh === root);
    if (physIdx >= 0) {
        Physics?.world?.removeBody(State.physicsObjects[physIdx].body);
        State.physicsObjects.splice(physIdx, 1);
    }
    Engine.scene.remove(root);
    State.objects = State.objects.filter((o) => o !== root);
    MeshLod.dispose(root);
    disposeObject3D(root);
}

function applySnapshotTransform(root, snapshot) {
    if (!root || !snapshot) return;
    if (snapshot.pos) root.position.set(snapshot.pos.x, snapshot.pos.y, snapshot.pos.z);
    if (snapshot.rot) root.rotation.set(snapshot.rot.x, snapshot.rot.y, snapshot.rot.z);
    if (snapshot.scl) root.scale.set(snapshot.scl.x, snapshot.scl.y, snapshot.scl.z);
}

function groundAndScale(root, targetHeight = null) {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (targetHeight && size.y > 0) {
        root.scale.multiplyScalar(targetHeight / size.y);
        box.setFromObject(root);
    }
    root.position.y -= box.min.y;
    return root;
}

export const GltfImport = {
    async loadFromUrl(url) {
        const gltf = await loader.loadAsync(url);
        return gltf.scene;
    },

    async loadFromFile(file) {
        const url = URL.createObjectURL(file);
        try {
            const scene = await this.loadFromUrl(url);
            scene.userData._blobUrl = url;
            return { scene, url, fileName: file.name };
        } catch (e) {
            URL.revokeObjectURL(url);
            throw e;
        }
    },

    async loadFromPath(filePath) {
        if (!ThresholdShell.isNative) {
            throw new Error('Load from disk path requires Threshold desktop (Electron) build');
        }
        const buf = await ThresholdShell.readBinary(filePath);
        if (!buf) throw new Error('Could not read GLTF file');
        const mime = mimeFromPath(filePath);
        const blob = new Blob([buf], { type: mime });
        const file = new File([blob], filePath.split(/[/\\]/).pop(), { type: mime });
        const loaded = await this.loadFromFile(file);
        loaded.filePath = filePath;
        return loaded;
    },

    async registerRoot(root, options = {}) {
        const World = window.World;
        const State = window.State;
        const Engine = window.Engine;
        const Physics = window.Physics;
        if (!World || !State || !Engine) return null;

        const {
            name = 'GLTF Model',
            usePhysics = false,
            pos = null,
            meta = {},
        } = options;

        root.traverse((c) => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });

        if (options.skipAutoPlacement) {
            if (pos) root.position.set(pos.x, pos.y, pos.z);
            if (options.rot) root.rotation.set(options.rot.x, options.rot.y, options.rot.z);
            if (options.scl) root.scale.set(options.scl.x, options.scl.y, options.scl.z);
        } else {
            groundAndScale(root, meta.targetHeight ?? null);
            const p = State.ctxTargetPos;
            root.position.x = p.x;
            root.position.z = p.z;
            root.position.y = (root.position.y || 0) + (p.y || 0) + 0.05;
        }

        let registry = root;
        const lodPaths = meta.lodPaths || meta.lods;
        if (lodPaths?.length > 1) {
            const container = new THREE.Group();
            const wp = new THREE.Vector3();
            const wq = new THREE.Quaternion();
            const ws = new THREE.Vector3();
            root.updateMatrixWorld(true);
            root.matrixWorld.decompose(wp, wq, ws);
            container.position.copy(wp);
            container.quaternion.copy(wq);
            container.scale.copy(ws);
            root.position.set(0, 0, 0);
            root.rotation.set(0, 0, 0);
            root.scale.set(1, 1, 1);
            container.add(root);
            await MeshLod.initChain(container, root, lodPaths, {
                distances: meta.lodDistances,
            });
            registry = container;
        }

        registry.userData = {
            ...meta,
            id: meta.id || Date.now().toString(36),
            name,
            type: 'gltf',
            locked: false,
            isRotating: false,
            hasPhysics: usePhysics,
            mass: meta.mass ?? 1,
            friction: meta.friction ?? 0.3,
            restitution: meta.restitution ?? 0.5,
            gltfUrl: meta.gltfUrl || null,
            gltfPath: meta.gltfPath || null,
            gltfFile: meta.gltfFile || null,
            lodPaths: lodPaths || meta.lodPaths || null,
            lodDistances: meta.lodDistances || MeshLod.DEFAULT_DISTANCES,
            lodActive: 0,
            blenderManifestPath: meta.blenderManifestPath || null,
        };

        Engine.scene.add(registry);
        State.objects.push(registry);

        if (usePhysics && Physics?.addBodyFromObject) {
            const body = Physics.addBodyFromObject(
                MeshLod.physicsSource(registry),
                registry.userData.mass
            );
            State.physicsObjects.push({ mesh: registry, body });
        }

        window.AudioSys?.playTone?.(360, 'triangle');
        return registry;
    },

    async insertAtCursor(payload = {}) {
        const {
            url,
            path,
            file,
            name = 'GLTF Model',
            usePhysics = true,
            mass = 1,
            friction = 0.3,
            restitution = 0.5,
            pos,
            lodPaths = null,
            lodDistances = null,
        } = payload;

        let scene;
        let meta = { mass, friction, restitution };

        if (file) {
            const loaded = await this.loadFromFile(file);
            scene = loaded.scene;
            meta = {
                ...meta,
                gltfUrl: loaded.url,
                gltfFile: loaded.fileName,
            };
        } else if (path) {
            const loaded = await this.loadFromPath(path);
            scene = loaded.scene;
            meta = {
                ...meta,
                gltfUrl: loaded.url,
                gltfPath: loaded.filePath,
                gltfFile: loaded.fileName,
            };
        } else if (url) {
            scene = await this.loadFromUrl(url);
            meta = { ...meta, gltfUrl: url };
        } else {
            throw new Error('No GLTF source — pick a file, path, or URL');
        }

        return await this.registerRoot(scene, {
            name,
            usePhysics,
            pos,
            skipAutoPlacement: !!pos,
            meta: {
                ...meta,
                lodPaths,
                lodDistances,
            },
        });
    },

    async spawnSnapshot(snapshot) {
        const ud = snapshot.userData || {};
        const source = ud.gltfPath || ud.gltfUrl;
        if (!source) {
            console.warn('GLTF snapshot missing gltfPath/gltfUrl', snapshot.name);
            return null;
        }

        let scene;
        let meta = { ...ud };

        try {
            if (ud.gltfPath && ThresholdShell.isNative) {
                const loaded = await this.loadFromPath(ud.gltfPath);
                scene = loaded.scene;
                meta.gltfUrl = loaded.url;
            } else {
                scene = await this.loadFromUrl(ud.gltfUrl);
            }
        } catch (e) {
            console.warn('GLTF rehydrate failed:', snapshot.name, e);
            return null;
        }

        const root = await this.registerRoot(scene, {
            name: snapshot.name || ud.name || 'GLTF Model',
            usePhysics: !!ud.hasPhysics,
            pos: snapshot.pos,
            skipAutoPlacement: true,
            meta: {
                ...meta,
                lodPaths: ud.lodPaths || meta.lodPaths,
                lodDistances: ud.lodDistances || meta.lodDistances,
            },
        });
        applySnapshotTransform(root, snapshot);
        if (snapshot.userData) root.userData = { ...root.userData, ...snapshot.userData };
        return root;
    },

    async spawnSnapshots(snapshots = []) {
        const tasks = snapshots.map((s) => this.spawnSnapshot(s));
        return Promise.all(tasks);
    },

    async pickAndInsertFromManifest(objectName) {
        let text;
        let manifestDir;
        let manifestPath;

        if (ThresholdShell.isNative) {
            manifestPath = await ThresholdShell.pickFile(MANIFEST_FILTERS);
            if (!manifestPath) return null;
            text = await ThresholdShell.readText(manifestPath);
            manifestDir = manifestPath.replace(/\\/g, '/').replace(/\/[^/]+$/, '');
        } else {
            const input = document.getElementById('insert-gltf-manifest');
            if (!input) return null;
            const file = await new Promise((resolve) => {
                const onChange = () => {
                    input.removeEventListener('change', onChange);
                    resolve(input.files?.[0] || null);
                    input.value = '';
                };
                input.addEventListener('change', onChange);
                input.click();
            });
            if (!file) return null;
            text = await file.text();
            manifestPath = file.name;
            manifestDir = '';
        }

        const manifest = BlenderManifest.parse(text);
        const model = BlenderManifest.modelForObject(manifest, objectName);
        if (!model) {
            throw new Error(`No model in manifest for "${objectName}"`);
        }

        const lodPaths = BlenderManifest.resolveLodPaths(manifestDir, model, manifest);
        const lod0 = lodPaths[0];

        if (ThresholdShell.isNative) {
            const root = await this.insertAtCursor({
                path: lod0.path,
                name: model.objectName || objectName,
                usePhysics: model.hasPhysics !== false,
                mass: model.mass,
                friction: model.friction,
                restitution: model.restitution,
                lodPaths,
                lodDistances: BlenderManifest.lodDistances(model),
            });
            if (root) root.userData.blenderManifestPath = manifestPath;
            return root;
        }

        throw new Error(
            `Manifest loaded for "${model.objectName}" — use GLTF file picker or URL (desktop app loads paths automatically)`
        );
    },

    async hotReloadFromWatch(event = {}) {
        const targets = findGltfTargets(event);
        if (!targets.length) {
            return { applied: 0, message: `No GLTF matched ${event.file || event.path}` };
        }
        if (!event.watchUrl) {
            window.UI?.status?.('GLTF hot-reload requires npm run textures:watch');
            return { applied: 0 };
        }

        const scene = await this.loadFromUrl(`${event.watchUrl}${event.watchUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
        let applied = 0;

        for (const old of targets) {
            const ud = { ...old.userData };
            const transform = {
                pos: { x: old.position.x, y: old.position.y, z: old.position.z },
                rot: { x: old.rotation.x, y: old.rotation.y, z: old.rotation.z },
                scl: { x: old.scale.x, y: old.scale.y, z: old.scale.z },
            };
            removeGltfFromWorld(old);

            const clone = scene.clone(true);
            await this.registerRoot(clone, {
                name: ud.name,
                usePhysics: !!ud.hasPhysics,
                skipAutoPlacement: true,
                pos: transform.pos,
                rot: transform.rot,
                scl: transform.scl,
                meta: {
                    ...ud,
                    gltfUrl: event.watchUrl,
                    gltfPath: event.path || ud.gltfPath,
                    gltfFile: event.file || ud.gltfFile,
                },
            });
            applied += 1;
        }

        const msg = `Hot-reloaded GLTF ${event.file || ''} on ${applied} object(s)`;
        window.UI?.status?.(msg.trim());
        return { applied, message: msg };
    },

    async hotReloadManifestFromWatch(event = {}) {
        if (!event.watchUrl) return null;
        try {
            const res = await fetch(`${event.watchUrl}?t=${Date.now()}`);
            const manifest = BlenderManifest.parse(await res.text());
            const base = CREATIVE_WATCH_URL.replace(/\/$/, '');
            let applied = 0;
            for (const model of manifest.models || []) {
                const assetPath = (model.path || `import/${model.file}`).replace(/\\/g, '/');
                const result = await this.hotReloadFromWatch({
                    type: 'gltf',
                    file: model.file,
                    path: assetPath,
                    slug: model.id,
                    objectName: model.objectName,
                    watchUrl: `${base}/asset?path=${encodeURIComponent(assetPath)}`,
                });
                applied += result?.applied || 0;
            }
            if (applied) window.UI?.status?.(`Blender manifest hot-reload: ${applied} model(s)`);
            return { applied };
        } catch (e) {
            window.UI?.status?.(e.message || 'Blender manifest hot-reload failed');
            return null;
        }
    },
};

window.GltfImport = GltfImport;