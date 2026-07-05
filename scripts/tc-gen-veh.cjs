#!/usr/bin/env node
/** TC vehicle GLB + LOD generator (Node fallback when Blender unavailable) */
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

function mat(c, o = {}) {
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.45, metalness: o.m ?? 0.35 });
    if (o.e != null) { m.emissive.setHex(o.e); m.emissiveIntensity = o.ei ?? 0.25; }
    return m;
}

function part(g, geo, ma, p, r) {
    const m = new THREE.Mesh(geo, ma);
    if (p) m.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
    if (r) m.rotation.set(r.x ?? 0, r.y ?? 0, r.z ?? 0);
    g.add(m);
}

function wheel(g, x, y, z, rad = 0.32, w = 0.22, det = true) {
    part(g, new THREE.CylinderGeometry(rad, rad, w, det ? 18 : 10), mat(0x141414, { r: 0.92, m: 0.05 }), { x, y, z }, { z: Math.PI / 2 });
    if (det) part(g, new THREE.CylinderGeometry(rad * 0.55, rad * 0.55, w + 0.02, 12), mat(0x8899aa, { r: 0.35, m: 0.7 }), { x, y, z }, { z: Math.PI / 2 });
}

function runGrp(lv = 0) {
    const g = new THREE.Group();
    g.name = lv ? `TC Runner_L${lv}` : 'TC Runner';
    if (lv >= 2) { part(g, new THREE.BoxGeometry(1.8, 0.9, 3.8), mat(0x1a2a44), { y: 0.45 }); return g; }
    part(g, new THREE.BoxGeometry(1.75, 0.38, 3.5), mat(0x1a2a44, { r: 0.32, m: 0.58 }), { y: 0.32 });
    part(g, new THREE.BoxGeometry(1.55, 0.22, 2.8), mat(0x0d1520), { y: 0.52, z: 0.15 });
    if (!lv) part(g, new THREE.BoxGeometry(1.35, 0.42, 1.35), mat(0x0a1525, { r: 0.08, m: 0.65 }), { y: 0.78, z: -0.35 });
    part(g, new THREE.BoxGeometry(1.76, 0.06, 3.52), mat(0x39ff14, { r: 0.18, e: 0x39ff14, ei: 0.4 }), { y: 0.54 });
    [[-0.88, 0.3, 1.15], [0.88, 0.3, 1.15], [-0.88, 0.3, -1.15], [0.88, 0.3, -1.15]].forEach(([x, y, z]) => wheel(g, x, y, z, !lv));
    return g;
}

function haulGrp(lv = 0) {
    const g = new THREE.Group();
    g.name = lv ? `TC Hauler_L${lv}` : 'TC Hauler';
    if (lv >= 2) { part(g, new THREE.BoxGeometry(2.2, 1.2, 4.2), mat(0x2d4a35), { y: 0.6 }); return g; }
    part(g, new THREE.BoxGeometry(2.15, 0.85, 2.6), mat(0x2d4a35), { y: 0.52, z: -0.55 });
    part(g, new THREE.BoxGeometry(1.65, 1.05, 1.45), mat(0x3a5a48), { y: 0.78, z: 1.35 });
    part(g, new THREE.BoxGeometry(2.12, 0.07, 3.65), mat(0x00ffaa, { e: 0x00aa66, ei: 0.3 }), { y: 1.02, z: 0.1 });
    [[-0.95, 0.34, 1.35], [0.95, 0.34, 1.35], [-0.95, 0.34, -1.35], [0.95, 0.34, -1.35]].forEach(([x, y, z]) => wheel(g, x, y, z, 0.38, 0.28, !lv));
    return g;
}

function exportGlb(grp, out) {
    return new Promise((res, rej) => {
        const sc = new THREE.Scene();
        sc.add(grp);
        new GLTFExporter().parse(sc, (r) => {
            fs.mkdirSync(path.dirname(out), { recursive: true });
            fs.writeFileSync(out, Buffer.from(r));
            fs.mkdirSync(PUB, { recursive: true });
            fs.copyFileSync(out, path.join(PUB, path.basename(out)));
            res(out);
        }, rej, { binary: true });
    });
}

async function veh(spec, builder) {
    const lods = [];
    for (const lv of [0, 1, 2]) {
        const slug = lv ? `${spec.slug}_l${lv}` : spec.slug;
        const fn = `${slug}.glb`;
        await exportGlb(builder(lv), path.join(IMPORT, fn));
        lods.push({ level: lv, file: fn, path: `import/${fn}`, distance: LOD[lv] ?? LOD.at(-1) });
        console.log(`[tc-gen-veh] ${fn}`);
    }
    return {
        id: spec.slug,
        objectName: spec.nm,
        file: lods[0].file,
        path: lods[0].path,
        lods,
        lodDistances: LOD,
        hasPhysics: true,
        mass: spec.mass,
        friction: spec.fric,
        restitution: spec.rest,
        tcEd: 'tc-veh',
        license: 'Original — TC',
    };
}

async function main() {
    let man = { format: 'threshold-blender-manifest', formatVersion: 1, engineVersion: '5.8.0', models: [] };
    if (fs.existsSync(MAN)) {
        try {
            man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
            man.models = (man.models || []).filter((m) => !['tc_run', 'tc_haul', 'threshold_child_runner', 'threshold_child_hauler'].includes(m.id));
        } catch { /* fresh */ }
    }
    const specs = [
        { slug: 'tc_run', nm: 'TC Runner', mass: 3.4, fric: 0.36, rest: 0.14, b: runGrp },
        { slug: 'tc_haul', nm: 'TC Hauler', mass: 5.8, fric: 0.44, rest: 0.1, b: haulGrp },
    ];
    for (const s of specs) man.models.push(await veh(s, s.b));
    man.exportDir = 'import';
    man.exportedAt = new Date().toISOString();
    man.tcEd = 'tc-veh';
    delete man.childEdition;
    fs.writeFileSync(MAN, JSON.stringify(man, null, 2));
    fs.copyFileSync(MAN, path.join(PUB, 'threshold_blender_manifest.json'));
}

main().catch((e) => { console.error(e); process.exit(1); });