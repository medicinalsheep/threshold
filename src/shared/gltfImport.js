import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BlenderManifest } from './blenderManifest.js';
import { ThresholdShell } from './thresholdShell.js';

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

    registerRoot(root, options = {}) {
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

        root.userData = {
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
            blenderManifestPath: meta.blenderManifestPath || null,
            ...meta,
        };

        Engine.scene.add(root);
        State.objects.push(root);

        if (usePhysics && Physics?.addBodyFromObject) {
            const body = Physics.addBodyFromObject(root, root.userData.mass);
            State.physicsObjects.push({ mesh: root, body });
        }

        window.AudioSys?.playTone?.(360, 'triangle');
        return root;
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

        return this.registerRoot(scene, {
            name,
            usePhysics,
            pos,
            skipAutoPlacement: !!pos,
            meta,
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

        const root = this.registerRoot(scene, {
            name: snapshot.name || ud.name || 'GLTF Model',
            usePhysics: !!ud.hasPhysics,
            pos: snapshot.pos,
            meta,
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

        if (ThresholdShell.isNative) {
            const gltfPath = BlenderManifest.resolveModelPath(manifestDir, model, manifest);
            const root = await this.insertAtCursor({
                path: gltfPath,
                name: model.objectName || objectName,
                usePhysics: model.hasPhysics !== false,
                mass: model.mass,
                friction: model.friction,
                restitution: model.restitution,
            });
            if (root) root.userData.blenderManifestPath = manifestPath;
            return root;
        }

        throw new Error(
            `Manifest loaded for "${model.objectName}" — use GLTF file picker or URL (desktop app loads paths automatically)`
        );
    },
};

window.GltfImport = GltfImport;