#!/usr/bin/env node
/** Tesla lab GLB + LOD — Node fallback when Blender unavailable (Phase 18.5) */
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
const LOD = require('../config/lod-distances.json').distances;
const MAN = path.join(IMPORT, 'threshold_blender_manifest.json');
const REALISM = 'r5';

function mat(c, o = {}) {
    const m = new THREE.MeshStandardMaterial({
        color: c,
        roughness: o.r ?? 0.45,
        metalness: o.m ?? 0.35,
    });
    if (o.e != null) {
        m.emissive.setHex(o.e);
        m.emissiveIntensity = o.ei ?? 0.25;
    }
    if (o.transparent) {
        m.transparent = true;
        m.opacity = o.op ?? 0.75;
    }
    return m;
}

function part(g, geo, ma, p, r, name) {
    const m = new THREE.Mesh(geo, ma);
    if (name) m.name = name;
    if (p) m.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
    if (r) m.rotation.set(r.x ?? 0, r.y ?? 0, r.z ?? 0);
    g.add(m);
    return m;
}

const WOOD = () => mat(0x5a4838, { r: 0.82, m: 0.04 });
const COPPER = () => mat(0xb86830, { r: 0.28, m: 0.88, e: 0x401808, ei: 0.06 });
const ARC = () => mat(0xa8e8ff, { r: 0.2, m: 0.1, e: 0x48c8ff, ei: 0.85, transparent: true, op: 0.75 });
const WALL = () => mat(0x4a4e54, { r: 0.78, m: 0.03 });
const GLASS = () => mat(0xd8e8f0, { r: 0.08, m: 0.02, transparent: true, op: 0.55 });

function coilGrp(lv = 0) {
    const g = new THREE.Group();
    g.name = lv ? `Tesla Coil_L${lv}` : 'Tesla Coil';
    if (lv >= 2) {
        part(g, new THREE.BoxGeometry(1.1, 2.2, 1.1), COPPER(), { y: 1.1 });
        return g;
    }
    const segs = lv ? 8 : 16;
    part(g, new THREE.CylinderGeometry(0.55, 0.62, 0.22, segs), WOOD(), { y: 0.11 });
    part(g, new THREE.TorusGeometry(0.38, 0.06, lv ? 4 : 6, segs), COPPER(), { y: 0.38 }, { x: Math.PI / 2 }, 'coil_primary');
    part(g, new THREE.CylinderGeometry(0.14, 0.18, 1.65, segs), COPPER(), { y: 1.15 }, null, 'coil_secondary');
    part(g, new THREE.TorusGeometry(0.22, 0.035, lv ? 4 : 6, lv ? 10 : 14), COPPER(), { y: 2.05 }, { x: Math.PI / 2 }, 'coil_top');
    part(g, new THREE.SphereGeometry(0.12, lv ? 6 : 8, lv ? 6 : 8), ARC(), { y: 2.18 }, null, 'arc_core');
    if (!lv) {
        part(g, new THREE.CylinderGeometry(0.012, 0.012, 1.1, 4), COPPER(), { x: -0.35, y: 1.6, z: 0.15 }, { z: 0.35 });
        part(g, new THREE.CylinderGeometry(0.012, 0.012, 1.1, 4), COPPER(), { x: 0.32, y: 1.55, z: -0.12 }, { z: -0.28 });
    }
    return g;
}

function benchGrp() {
    const g = new THREE.Group();
    g.name = 'Lab Bench';
    part(g, new THREE.BoxGeometry(2.2, 0.08, 0.65), WOOD(), { y: 0.82 }, null, 'bench_top');
    part(g, new THREE.BoxGeometry(0.08, 0.8, 0.08), WOOD(), { x: -0.95, y: 0.4, z: -0.22 }, null, 'bench_leg_l');
    part(g, new THREE.BoxGeometry(0.08, 0.8, 0.08), WOOD(), { x: 0.95, y: 0.4, z: -0.22 }, null, 'bench_leg_r');
    const gauge = part(g, new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), COPPER(), { x: -0.55, y: 0.9, z: 0.08 }, { x: Math.PI / 2 }, 'bench_gauge');
    part(g, new THREE.CylinderGeometry(0.1, 0.12, 0.28, 10), GLASS(), { x: 0.15, y: 0.98, z: 0.05 }, null, 'bench_jar');
    part(g, new THREE.BoxGeometry(0.22, 0.18, 0.14), COPPER(), { x: 0.65, y: 0.92, z: 0.02 }, null, 'bench_switch');
    return g;
}

function doorGrp() {
    const g = new THREE.Group();
    g.name = 'Lab Door';
    part(g, new THREE.BoxGeometry(0.14, 2.15, 1.35), WALL(), { x: -0.52, y: 1.08 }, null, 'door_frame');

    const leftPivot = new THREE.Group();
    leftPivot.name = 'door_left';
    leftPivot.position.set(-0.12, 1.0, -0.3);
    const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, 0.58), WOOD());
    leftLeaf.name = 'door_leaf_left';
    leftLeaf.position.set(0, 0, -0.29);
    leftPivot.add(leftLeaf);

    const rightPivot = new THREE.Group();
    rightPivot.name = 'door_right';
    rightPivot.position.set(-0.12, 1.0, 0.3);
    const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, 0.58), WOOD());
    rightLeaf.name = 'door_leaf_right';
    rightLeaf.position.set(0, 0, 0.29);
    rightPivot.add(rightLeaf);

    g.add(leftPivot, rightPivot);
    return { root: g, leftPivot, rightPivot };
}

function quatYTrack(nodeName, times, angles) {
    const axis = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    const values = [];
    angles.forEach((a) => {
        q.setFromAxisAngle(axis, a);
        values.push(q.x, q.y, q.z, q.w);
    });
    return new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, values);
}

function doorOpenClip(leftPivot, rightPivot) {
    const d = 1.2;
    const t = [0, d * 0.35, d * 0.7, d];
    const swing = 0.72;
    return new THREE.AnimationClip('door_open', d, [
        quatYTrack(leftPivot.name, t, [0, swing, swing, 0]),
        quatYTrack(rightPivot.name, t, [0, -swing, -swing, 0]),
    ]);
}

function exportGlb(grp, out, clip = null) {
    return new Promise((res, rej) => {
        const sc = new THREE.Scene();
        sc.add(grp);
        new GLTFExporter().parse(sc, (r) => {
            fs.mkdirSync(path.dirname(out), { recursive: true });
            fs.writeFileSync(out, Buffer.from(r));
            fs.mkdirSync(PUB, { recursive: true });
            fs.copyFileSync(out, path.join(PUB, path.basename(out)));
            res(out);
        }, rej, { binary: true, animations: clip ? [clip] : [] });
    });
}

async function coilLod(spec) {
    const lods = [];
    for (const lv of [0, 1, 2]) {
        const slug = lv ? `${spec.slug}_l${lv}` : spec.slug;
        const fn = `${slug}.glb`;
        await exportGlb(coilGrp(lv), path.join(IMPORT, fn));
        lods.push({ level: lv, file: fn, path: `import/${fn}`, distance: LOD[lv] ?? LOD.at(-1) });
        console.log(`[gen-starter-lab] ${fn}`);
    }
    return {
        id: spec.slug,
        objectName: spec.nm,
        file: lods[0].file,
        path: lods[0].path,
        lods,
        lodDistances: LOD,
        hasPhysics: false,
        mass: 0,
        tcEd: 'starter-lab',
        license: 'Original — Threshold',
        realism: REALISM,
    };
}

async function singleGlb(spec, builder, clip = null) {
    const fn = `${spec.slug}.glb`;
    const built = builder();
    const root = built.root || built;
    const clipOut = clip || (built.leftPivot ? doorOpenClip(built.leftPivot, built.rightPivot) : null);
    await exportGlb(root, path.join(IMPORT, fn), clipOut);
    console.log(`[gen-starter-lab] ${fn}${clipOut ? ' + door_open clip' : ''}`);
    return {
        id: spec.slug,
        objectName: spec.nm,
        file: fn,
        path: `import/${fn}`,
        lods: [{ level: 0, file: fn, path: `import/${fn}`, distance: 0 }],
        lodDistances: [0],
        hasPhysics: false,
        mass: 0,
        tcEd: 'starter-lab',
        license: 'Original — Threshold',
        realism: REALISM,
        animations: clipOut ? ['door_open'] : undefined,
    };
}

async function main() {
    let man = { format: 'threshold-blender-manifest', formatVersion: 1, engineVersion: '5.10.0', models: [] };
    if (fs.existsSync(MAN)) {
        try {
            man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
            man.models = (man.models || []).filter((m) => !['tesla_coil', 'lab_bench', 'lab_door'].includes(m.id));
        } catch { /* fresh */ }
    }
    man.models.push(await coilLod({ slug: 'tesla_coil', nm: 'Tesla Coil' }));
    man.models.push(await singleGlb({ slug: 'lab_bench', nm: 'Lab Bench' }, benchGrp));
    man.models.push(await singleGlb({ slug: 'lab_door', nm: 'Lab Door' }, doorGrp));
    man.exportDir = 'import';
    man.exportedAt = new Date().toISOString();
    man.tcEd = 'starter-lab';
    man.realism = REALISM;
    fs.writeFileSync(MAN, JSON.stringify(man, null, 2));
    fs.copyFileSync(MAN, path.join(PUB, 'threshold_blender_manifest.json'));
    console.log('[gen-starter-lab] manifest updated');
}

main().catch((e) => { console.error(e); process.exit(1); });