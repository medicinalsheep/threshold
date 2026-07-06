#!/usr/bin/env node
/** Wardenclyffe building shell + wood liner + exterior door GLB (Phase 19.2) */
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

const BUILDING = { w: 12, d: 5.2, h: 3.6, wall: 0.22, floorY: 0.14, southZ: 2.6, doorW: 1.55 };

const IDS = ['wardenclyffe_building', 'lab_wood_liner', 'wardenclyffe_door'];

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

const BRICK = () => mat(0xa85840, { r: 0.9, m: 0.02 });
const ROOF = () => mat(0x2a2830, { r: 0.82, m: 0.06 });
const WOOD = () => mat(0x5a4838, { r: 0.84, m: 0.03 });
const DOOR_WOOD = () => mat(0xe8e4dc, { r: 0.72, m: 0.04 });

function buildingGrp(lv = 0) {
    const g = new THREE.Group();
    g.name = lv ? `Wardenclyffe Building_L${lv}` : 'Wardenclyffe Building';
    const { w: bw, d: bd, h: bh, wall: wt, floorY, southZ, doorW } = BUILDING;
    const wallY = bh / 2 + floorY;

    if (lv >= 2) {
        part(g, new THREE.BoxGeometry(bw, bh + 0.5, bd), BRICK(), { y: floorY + bh / 2 }, null, 'shell_lod2');
        return g;
    }

    if (lv >= 1) {
        part(g, new THREE.BoxGeometry(bw, 0.14, bd), BRICK(), { y: floorY - 0.07 }, null, 'floor_slab');
        part(g, new THREE.BoxGeometry(bw + 0.2, 0.28, bd + 0.2), ROOF(), { y: floorY + bh + 0.18 }, null, 'roof');
        part(g, new THREE.BoxGeometry(bw, bh, bd), BRICK(), { y: wallY }, null, 'shell_lod1');
        return g;
    }

    part(g, new THREE.BoxGeometry(bw, 0.14, bd), BRICK(), { y: floorY - 0.07 }, null, 'floor_slab');
    const northZ = -bd / 2;
    part(g, new THREE.BoxGeometry(bw, bh, wt), BRICK(), { y: wallY, z: northZ }, null, 'wall_north');
    part(g, new THREE.BoxGeometry(wt, bh, bd), BRICK(), { x: -bw / 2, y: wallY }, null, 'wall_west');
    part(g, new THREE.BoxGeometry(wt, bh, bd), BRICK(), { x: bw / 2, y: wallY }, null, 'wall_east');

    const doorHalf = doorW / 2;
    const segW = (bw - doorW) / 2;
    part(g, new THREE.BoxGeometry(segW, bh, wt), BRICK(), { x: -(doorHalf + segW / 2), y: wallY, z: southZ }, null, 'wall_south_l');
    part(g, new THREE.BoxGeometry(segW, bh, wt), BRICK(), { x: doorHalf + segW / 2, y: wallY, z: southZ }, null, 'wall_south_r');
    part(g, new THREE.BoxGeometry(doorW, bh * 0.22, wt), BRICK(), { y: floorY + bh * 0.89, z: southZ }, null, 'wall_south_header');

    part(g, new THREE.BoxGeometry(bw + 0.4, 0.35, bd + 0.4), ROOF(), { y: floorY + bh + 0.18 }, null, 'roof');
    part(g, new THREE.BoxGeometry(0.9, 2.6, 0.9), BRICK(), { x: -bw / 2 + 1.1, y: floorY + bh + 1.5, z: -bd / 2 + 0.8 }, null, 'chimney');

    [-4.2, -2.1, 2.1, 4.2].forEach((xOff, i) => {
        part(g, new THREE.BoxGeometry(1.05, 1.65, 0.08), BRICK(), { x: xOff, y: floorY + 1.85, z: southZ + 0.1 }, null, `window_frame_${i}`);
    });

    return g;
}

function linerGrp() {
    const g = new THREE.Group();
    g.name = 'Lab Wood Liner';
    const { w: bw, d: bd, h: bh, wall: wt, floorY } = BUILDING;
    const linerInset = 0.12;
    const linerH = bh - 0.25;
    const linerY = floorY + linerH / 2 + 0.05;
    const innerW = bw - wt * 2 - linerInset * 2;
    const innerD = bd - wt * 2 - linerInset * 2;

    [
        { sx: innerW, sz: 0.06, px: 0, pz: -bd / 2 + wt + linerInset, n: 'liner_north' },
        { sx: innerW, sz: 0.06, px: 0, pz: bd / 2 - wt - linerInset, n: 'liner_south' },
        { sx: 0.06, sz: innerD, px: -bw / 2 + wt + linerInset, pz: 0, n: 'liner_west' },
        { sx: 0.06, sz: innerD, px: bw / 2 - wt - linerInset, pz: 0, n: 'liner_east' },
    ].forEach((seg) => {
        part(g, new THREE.BoxGeometry(seg.sx, linerH, seg.sz), WOOD(), { x: seg.px, y: linerY, z: seg.pz }, null, seg.n);
    });
    part(g, new THREE.BoxGeometry(bw - 0.35, 0.1, bd - 0.35), WOOD(), { y: floorY + bh - 0.08 }, null, 'liner_ceiling');
    return g;
}

function exteriorDoorGrp() {
    const g = new THREE.Group();
    g.name = 'Wardenclyffe Door';
    const { floorY, southZ } = BUILDING;

    part(g, new THREE.BoxGeometry(1.55, 2.25, 0.14), BRICK(), { y: floorY + 1.2, z: southZ + 0.08 }, null, 'door_frame');

    const leftPivot = new THREE.Group();
    leftPivot.name = 'door_left';
    leftPivot.position.set(-0.34, floorY + 1.1, southZ + 0.18);
    const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.05, 0.06), DOOR_WOOD());
    leftLeaf.name = 'door_leaf_left';
    leftLeaf.position.set(0.31, 0, 0);
    leftPivot.add(leftLeaf);

    const rightPivot = new THREE.Group();
    rightPivot.name = 'door_right';
    rightPivot.position.set(0.34, floorY + 1.1, southZ + 0.18);
    const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.05, 0.06), DOOR_WOOD());
    rightLeaf.name = 'door_leaf_right';
    rightLeaf.position.set(-0.31, 0, 0);
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
    const swing = 0.85;
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

async function buildingLod(spec) {
    const lods = [];
    for (const lv of [0, 1, 2]) {
        const slug = lv ? `${spec.slug}_l${lv}` : spec.slug;
        const fn = `${slug}.glb`;
        await exportGlb(buildingGrp(lv), path.join(IMPORT, fn));
        lods.push({ level: lv, file: fn, path: `import/${fn}`, distance: LOD[lv] ?? LOD.at(-1) });
        console.log(`[gen-starter-building] ${fn}`);
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
        tcEd: 'starter-building',
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
    console.log(`[gen-starter-building] ${fn}${clipOut ? ' + door_open clip' : ''}`);
    return {
        id: spec.slug,
        objectName: spec.nm,
        file: fn,
        path: `import/${fn}`,
        lods: [{ level: 0, file: fn, path: `import/${fn}`, distance: 0 }],
        lodDistances: [0],
        hasPhysics: false,
        mass: 0,
        tcEd: 'starter-building',
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
            man.models = (man.models || []).filter((m) => !IDS.includes(m.id));
        } catch { /* fresh */ }
    }
    man.models.push(await buildingLod({ slug: 'wardenclyffe_building', nm: 'Wardenclyffe Building' }));
    man.models.push(await singleGlb({ slug: 'lab_wood_liner', nm: 'Lab Wood Liner' }, linerGrp));
    man.models.push(await singleGlb({ slug: 'wardenclyffe_door', nm: 'Wardenclyffe Door' }, exteriorDoorGrp));
    man.exportDir = 'import';
    man.exportedAt = new Date().toISOString();
    fs.writeFileSync(MAN, JSON.stringify(man, null, 2));
    fs.copyFileSync(MAN, path.join(PUB, 'threshold_blender_manifest.json'));
    console.log('[gen-starter-building] manifest updated');
}

main().catch((e) => { console.error(e); process.exit(1); });