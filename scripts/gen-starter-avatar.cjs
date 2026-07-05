#!/usr/bin/env node
/** Starter avatar GLBs — improved limbs + walk animation clip */
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
const IMPORT = path.join(ROOT, 'import');
const PUB = path.join(ROOT, 'public', 'bundle', 'import');

function mat(c, o = {}) {
    return new THREE.MeshStandardMaterial({
        color: c,
        roughness: o.r ?? 0.72,
        metalness: o.m ?? 0.04,
    });
}

function limb(name, mesh, pivotY, offsetX = 0) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(offsetX, pivotY, 0);
    g.add(mesh);
    return g;
}

function buildAvatar(cols) {
    const root = new THREE.Group();
    root.name = 'StarterAvatar';

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.3), mat(cols.pants, { r: 0.88 }));
    hips.position.y = 0.88;
    hips.name = 'hips';
    root.add(hips);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.24), mat(cols.shirt));
    torso.position.y = 1.3;
    torso.name = 'torso';
    root.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 18), mat(cols.skin, { r: 0.68 }));
    head.position.y = 1.8;
    head.name = 'head';
    root.add(head);

    const legLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.78, 10), mat(cols.pants, { r: 0.88 }));
    legLMesh.position.y = -0.39;
    const legL = limb('legL', legLMesh, 0.88, -0.12);

    const legRMesh = legLMesh.clone();
    legRMesh.material = legLMesh.material.clone();
    const legR = limb('legR', legRMesh, 0.88, 0.12);

    const armLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.48, 10), mat(cols.skin, { r: 0.68 }));
    armLMesh.position.y = -0.24;
    const armL = limb('armL', armLMesh, 1.44, -0.32);

    const armRMesh = armLMesh.clone();
    armRMesh.material = armLMesh.material.clone();
    const armR = limb('armR', armRMesh, 1.44, 0.32);

    root.add(legL, legR, armL, armR);
    return { root, legL, legR, armL, armR };
}

function quatXTrack(nodeName, times, angles) {
    const axis = new THREE.Vector3(1, 0, 0);
    const q = new THREE.Quaternion();
    const values = [];
    angles.forEach((a) => {
        q.setFromAxisAngle(axis, a);
        values.push(q.x, q.y, q.z, q.w);
    });
    return new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, values);
}

function walkClip(legL, legR, armL, armR) {
    const d = 0.85;
    const t = [0, d * 0.25, d * 0.5, d * 0.75, d];
    const a = 0.52;
    return new THREE.AnimationClip('walk', d, [
        quatXTrack(legL.name, t, [0, a, 0, -a, 0]),
        quatXTrack(legR.name, t, [0, -a, 0, a, 0]),
        quatXTrack(armL.name, t, [0, -a * 0.75, 0, a * 0.75, 0]),
        quatXTrack(armR.name, t, [0, a * 0.75, 0, -a * 0.75, 0]),
    ]);
}

function exportGlb(root, clip, out) {
    return new Promise((res, rej) => {
        new GLTFExporter().parse(root, (r) => {
            fs.mkdirSync(path.dirname(out), { recursive: true });
            fs.writeFileSync(out, Buffer.from(r));
            fs.mkdirSync(PUB, { recursive: true });
            fs.copyFileSync(out, path.join(PUB, path.basename(out)));
            res(out);
        }, rej, { binary: true, animations: clip ? [clip] : [] });
    });
}

const AVATARS = [
    {
        file: 'starter_avatar.glb',
        cols: { shirt: 0x3d5a80, pants: 0x232830, skin: 0xe8b896 },
    },
    {
        file: 'starter_npc_guard.glb',
        cols: { shirt: 0x2a3d52, pants: 0x1a2028, skin: 0xd4a882 },
    },
    {
        file: 'starter_npc_mech.glb',
        cols: { shirt: 0x6b4428, pants: 0x2a2830, skin: 0xc99872 },
    },
];

async function main() {
    for (const spec of AVATARS) {
        const { root, legL, legR, armL, armR } = buildAvatar(spec.cols);
        const clip = walkClip(legL, legR, armL, armR);
        const out = path.join(IMPORT, spec.file);
        await exportGlb(root, clip, out);
        const kb = (fs.statSync(out).size / 1024).toFixed(1);
        console.log(`[gen-starter-avatar] ${spec.file} (${kb} KB) + walk clip`);
    }
}

main().catch((e) => { console.error(e); process.exit(1); });