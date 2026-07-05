#!/usr/bin/env node
/** TC character GLB + LOD — abbreviated mesh export */
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

function mat(c) {
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.72 });
}

function part(g, geo, ma, y, x = 0, z = 0) {
    const m = new THREE.Mesh(geo, ma);
    m.position.set(x, y, z);
    g.add(m);
}

function chrGrp(nm, slug, lv, cols) {
    const g = new THREE.Group();
    g.name = lv ? `${nm}_L${lv}` : nm;
    if (lv >= 2) {
        part(g, new THREE.BoxGeometry(0.5, 1.7, 0.35), mat(cols.shirt), 0.85);
        return g;
    }
    part(g, new THREE.BoxGeometry(0.44, 0.24, 0.28), mat(cols.pants), 0.9);
    part(g, new THREE.BoxGeometry(0.5, 0.64, 0.28), mat(cols.shirt), 1.34);
    if (!lv) {
        part(g, new THREE.SphereGeometry(0.21, 14, 12), mat(cols.skin), 1.78);
        part(g, new THREE.BoxGeometry(0.12, 0.12, 0.04), mat(0x39ff14), 1.42, 0, 0.16);
    }
    part(g, new THREE.BoxGeometry(0.15, 0.5, 0.15), mat(cols.skin), 1.1, -0.34);
    part(g, new THREE.BoxGeometry(0.15, 0.5, 0.15), mat(cols.skin), 1.1, 0.34);
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

async function chr(spec) {
    const lods = [];
    for (const lv of [0, 1, 2]) {
        const slug = lv ? `${spec.slug}_l${lv}` : spec.slug;
        const fn = `${slug}.glb`;
        await exportGlb(chrGrp(spec.nm, spec.slug, lv, spec.cols), path.join(IMPORT, fn));
        lods.push({ level: lv, file: fn, path: `import/${fn}`, distance: LOD[lv] ?? LOD.at(-1) });
        console.log(`[tc-gen-chr] ${fn}`);
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
        tcEd: 'tc-chr',
        license: 'Original — TC',
    };
}

async function main() {
    let man = { format: 'threshold-blender-manifest', formatVersion: 1, engineVersion: '5.8.0', models: [] };
    if (fs.existsSync(MAN)) {
        try {
            man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
            man.models = (man.models || []).filter((m) => !['tc_msh', 'tc_mec'].includes(m.id));
        } catch { /* fresh */ }
    }
    const specs = [
        { slug: 'tc_msh', nm: 'TC Marshal', cols: { shirt: 0x1a2a44, pants: 0x111822, skin: 0xffd4b8 } },
        { slug: 'tc_mec', nm: 'TC Mechanic', cols: { shirt: 0xcc6622, pants: 0x333344, skin: 0xe8b896 } },
    ];
    for (const s of specs) man.models.push(await chr(s));
    man.exportDir = 'import';
    man.exportedAt = new Date().toISOString();
    man.tcEd = 'tc-show';
    delete man.childEdition;
    fs.writeFileSync(MAN, JSON.stringify(man, null, 2));
    fs.copyFileSync(MAN, path.join(PUB, 'threshold_blender_manifest.json'));
}

main().catch((e) => { console.error(e); process.exit(1); });