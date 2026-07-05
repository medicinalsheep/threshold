#!/usr/bin/env node
/**
 * Generate Threshold Child vehicle GLBs + LOD chain (R2).
 * Original meshes — Node/Three export when Blender is unavailable.
 * With Blender: npm run child:vehicles:blender
 */
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');

global.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
        blob.arrayBuffer().then((buf) => {
            this.result = buf;
            if (this.onloadend) this.onloadend();
        });
    }
};

const ROOT = path.join(__dirname, '..');
const IMPORT_DIR = path.join(ROOT, 'import');
const PUBLIC_BUNDLE = path.join(ROOT, 'public', 'bundle', 'import');
const LOD_DISTANCES = require('../config/lod-distances.json').distances;
const MANIFEST_PATH = path.join(IMPORT_DIR, 'threshold_blender_manifest.json');
const MANIFEST_FORMAT = 'threshold-blender-manifest';

function stdMat(color, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.45,
        metalness: opts.metalness ?? 0.35,
    });
    if (opts.emissive != null) {
        mat.emissive.setHex(opts.emissive);
        mat.emissiveIntensity = opts.emissiveIntensity ?? 0.25;
    }
    return mat;
}

function addPart(group, geometry, material, position, rotation) {
    const mesh = new THREE.Mesh(geometry, material);
    if (position) mesh.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
    if (rotation) mesh.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
    group.add(mesh);
    return mesh;
}

function addWheel(group, x, y, z, radius = 0.34, width = 0.24, detailed = true) {
    addPart(
        group,
        new THREE.CylinderGeometry(radius, radius, width, detailed ? 18 : 10),
        stdMat(0x141414, { roughness: 0.92, metalness: 0.05 }),
        { x, y, z },
        { z: Math.PI / 2 }
    );
    if (detailed) {
        addPart(
            group,
            new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.02, 12),
            stdMat(0x8899aa, { roughness: 0.35, metalness: 0.7 }),
            { x, y, z },
            { z: Math.PI / 2 }
        );
    }
}

function buildRunnerGroup(level = 0) {
    const group = new THREE.Group();
    group.name = level === 0 ? 'Threshold Runner' : `Threshold Runner_LOD${level}`;

    if (level >= 2) {
        addPart(group, new THREE.BoxGeometry(1.8, 0.9, 3.8), stdMat(0x1a2a44, { roughness: 0.4, metalness: 0.5 }), { y: 0.45 });
        return group;
    }

    const bodyMat = stdMat(0x1a2a44, { roughness: 0.32, metalness: 0.58 });
    const trimMat = stdMat(0x0d1520, { roughness: 0.38, metalness: 0.42 });
    const accentMat = stdMat(0x39ff14, { roughness: 0.18, metalness: 0.2, emissive: 0x39ff14, emissiveIntensity: 0.4 });

    addPart(group, new THREE.BoxGeometry(1.75, 0.38, 3.5), bodyMat, { y: 0.32 });
    addPart(group, new THREE.BoxGeometry(1.55, 0.22, 2.8), trimMat, { y: 0.52, z: 0.15 });
    if (level === 0) {
        addPart(group, new THREE.BoxGeometry(1.35, 0.42, 1.35), stdMat(0x0a1525, { roughness: 0.08, metalness: 0.65 }), { y: 0.78, z: -0.35 });
        addPart(group, new THREE.BoxGeometry(0.35, 0.12, 0.55), trimMat, { y: 0.62, z: 1.55 });
        addPart(group, new THREE.BoxGeometry(1.5, 0.08, 0.35), trimMat, { y: 0.88, z: -1.45 });
        [[-0.82, 0.28, 1.05], [0.82, 0.28, 1.05]].forEach(([x, y, z]) => {
            addPart(group, new THREE.SphereGeometry(0.1, 10, 10), stdMat(0xffffee, { emissive: 0xffffcc, emissiveIntensity: 0.55 }), { x, y, z });
        });
    }
    addPart(group, new THREE.BoxGeometry(1.76, 0.06, 3.52), accentMat, { y: 0.54 });

    const wheelDetail = level === 0;
    [[-0.88, 0.3, 1.15], [0.88, 0.3, 1.15], [-0.88, 0.3, -1.15], [0.88, 0.3, -1.15]].forEach(([x, y, z]) => {
        addWheel(group, x, y, z, 0.32, 0.22, wheelDetail);
    });
    return group;
}

function buildHaulerGroup(level = 0) {
    const group = new THREE.Group();
    group.name = level === 0 ? 'Threshold Hauler' : `Threshold Hauler_LOD${level}`;

    if (level >= 2) {
        addPart(group, new THREE.BoxGeometry(2.2, 1.2, 4.2), stdMat(0x2d4a35, { roughness: 0.5, metalness: 0.25 }), { y: 0.6 });
        return group;
    }

    const bedMat = stdMat(0x2d4a35, { roughness: 0.52, metalness: 0.22 });
    const cabMat = stdMat(0x3a5a48, { roughness: 0.42, metalness: 0.28 });
    const railMat = stdMat(0x00ffaa, { roughness: 0.25, metalness: 0.15, emissive: 0x00aa66, emissiveIntensity: 0.3 });

    addPart(group, new THREE.BoxGeometry(2.15, 0.85, 2.6), bedMat, { y: 0.52, z: -0.55 });
    addPart(group, new THREE.BoxGeometry(2.05, 0.05, 2.5), stdMat(0x1a2820, { roughness: 0.75 }), { y: 0.92, z: -0.55 });
    addPart(group, new THREE.BoxGeometry(1.65, 1.05, 1.45), cabMat, { y: 0.78, z: 1.35 });
    if (level === 0) {
        addPart(group, new THREE.BoxGeometry(1.45, 0.48, 1.1), stdMat(0x0a1525, { roughness: 0.08, metalness: 0.65 }), { y: 1.05, z: 1.42 });
        addPart(group, new THREE.BoxGeometry(0.4, 0.55, 0.12), cabMat, { y: 0.55, z: 2.05 });
    }
    addPart(group, new THREE.BoxGeometry(2.12, 0.07, 3.65), railMat, { y: 1.02, z: 0.1 });

    const wheelDetail = level === 0;
    [[-0.95, 0.34, 1.35], [0.95, 0.34, 1.35], [-0.95, 0.34, -1.35], [0.95, 0.34, -1.35]].forEach(([x, y, z]) => {
        addWheel(group, x, y, z, 0.38, 0.28, wheelDetail);
    });
    return group;
}

function exportGlb(group, outPath) {
    return new Promise((resolve, reject) => {
        const scene = new THREE.Scene();
        scene.add(group);
        const exporter = new GLTFExporter();
        exporter.parse(
            scene,
            (result) => {
                fs.mkdirSync(path.dirname(outPath), { recursive: true });
                fs.writeFileSync(outPath, Buffer.from(result));
                resolve(outPath);
            },
            reject,
            { binary: true }
        );
    });
}

function buildModelManifest(spec, lods) {
    return {
        id: spec.slug,
        objectName: spec.objectName,
        file: lods[0].file,
        path: lods[0].path,
        lods,
        lodDistances: LOD_DISTANCES,
        hasPhysics: true,
        mass: spec.mass,
        friction: spec.friction,
        restitution: spec.restitution,
        childEdition: 'threshold-child-vehicles',
        license: 'Original — Threshold Child edition',
    };
}

async function exportVehicle(spec, builder) {
    const lods = [];
    for (const level of [0, 1, 2]) {
        const slug = level === 0 ? spec.slug : `${spec.slug}_lod${level}`;
        const file = `${slug}.glb`;
        const relPath = `import/${file}`;
        const outPath = path.join(IMPORT_DIR, file);
        const group = builder(level);
        await exportGlb(group, outPath);
        fs.mkdirSync(PUBLIC_BUNDLE, { recursive: true });
        fs.copyFileSync(outPath, path.join(PUBLIC_BUNDLE, file));
        lods.push({
            level,
            file,
            path: relPath,
            distance: LOD_DISTANCES[level] ?? LOD_DISTANCES[LOD_DISTANCES.length - 1],
        });
        console.log(`[child-vehicles] ${file} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
    }
    return buildModelManifest(spec, lods);
}

async function main() {
    fs.mkdirSync(IMPORT_DIR, { recursive: true });

    const specs = [
        {
            objectName: 'Threshold Runner',
            slug: 'threshold_child_runner',
            mass: 3.4,
            friction: 0.36,
            restitution: 0.14,
            builder: buildRunnerGroup,
        },
        {
            objectName: 'Threshold Hauler',
            slug: 'threshold_child_hauler',
            mass: 5.8,
            friction: 0.44,
            restitution: 0.1,
            builder: buildHaulerGroup,
        },
    ];

    let manifest = { format: MANIFEST_FORMAT, formatVersion: 1, engineVersion: '5.6.0', models: [] };
    if (fs.existsSync(MANIFEST_PATH)) {
        try {
            manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
            manifest.models = (manifest.models || []).filter(
                (m) => !specs.some((s) => s.objectName === m.objectName)
            );
        } catch {
            /* fresh manifest */
        }
    }

    for (const spec of specs) {
        const entry = await exportVehicle(spec, spec.builder);
        manifest.models.push(entry);
    }

    manifest.format = MANIFEST_FORMAT;
    manifest.formatVersion = 1;
    manifest.exportDir = 'import';
    manifest.exportedAt = new Date().toISOString();
    manifest.childEdition = 'threshold-child-vehicles';

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    fs.mkdirSync(PUBLIC_BUNDLE, { recursive: true });
    fs.copyFileSync(MANIFEST_PATH, path.join(PUBLIC_BUNDLE, 'threshold_blender_manifest.json'));

    console.log('[child-vehicles] manifest → import/threshold_blender_manifest.json');
    console.log('[child-vehicles] public → public/bundle/import/');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});