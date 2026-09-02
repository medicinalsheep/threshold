#!/usr/bin/env node
/**
 * Starter / hero avatar GLBs — H0 UV atlas + H1 profiled anatomy.
 * Male / female / guard / mech. Run: npm run avatar:gen
 */
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');
const { writePng, fillRgba } = require('./tc-png.cjs');

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
const TEMPLATE = path.join(ROOT, 'textures', '_templates');

/** UV islands (u0,v0,u1,v1) — v=0 bottom. GIMP paints to these. */
const UV = {
    HEAD: [0.02, 0.68, 0.48, 0.98],
    NECK: [0.02, 0.60, 0.18, 0.68],
    ARM_L: [0.52, 0.72, 0.74, 0.98],
    ARM_R: [0.76, 0.72, 0.98, 0.98],
    TORSO: [0.02, 0.34, 0.50, 0.60],
    HAND_L: [0.54, 0.50, 0.74, 0.70],
    HAND_R: [0.76, 0.50, 0.98, 0.70],
    HIPS: [0.02, 0.02, 0.38, 0.32],
    LEG_L: [0.42, 0.14, 0.68, 0.48],
    LEG_R: [0.70, 0.14, 0.96, 0.48],
    FOOT_L: [0.42, 0.02, 0.68, 0.13],
    FOOT_R: [0.70, 0.02, 0.96, 0.13],
};

/** Detail tiers → LOD0 high · LOD1 mid · LOD2 low */
function detailParams(detail = 'high') {
    if (detail === 'low') return { seg: 10, headW: 14, headH: 10, face: true, bust: false };
    if (detail === 'mid') return { seg: 16, headW: 22, headH: 16, face: true, bust: true };
    return { seg: 28, headW: 36, headH: 28, face: true, bust: true };
}

function mat(c, o = {}) {
    return new THREE.MeshStandardMaterial({
        color: c,
        roughness: o.r ?? 0.66,
        metalness: o.m ?? 0.04,
        envMapIntensity: o.env ?? 0.35,
    });
}

function packUv(geo, rect) {
    if (!geo.attributes.uv) return geo;
    const [u0, v0, u1, v1] = rect;
    const arr = geo.attributes.uv.array;
    let minu = Infinity;
    let minv = Infinity;
    let maxu = -Infinity;
    let maxv = -Infinity;
    for (let i = 0; i < arr.length; i += 2) {
        minu = Math.min(minu, arr[i]);
        maxu = Math.max(maxu, arr[i]);
        minv = Math.min(minv, arr[i + 1]);
        maxv = Math.max(maxv, arr[i + 1]);
    }
    const du = (maxu - minu) || 1;
    const dv = (maxv - minv) || 1;
    for (let i = 0; i < arr.length; i += 2) {
        const u = (arr[i] - minu) / du;
        const v = (arr[i + 1] - minv) / dv;
        arr[i] = u0 + u * (u1 - u0);
        arr[i + 1] = v0 + v * (v1 - v0);
    }
    geo.attributes.uv.needsUpdate = true;
    return geo;
}

function lathe(points, seg) {
    const vecs = points.map(([x, y]) => new THREE.Vector2(Math.max(0.004, x), y));
    return new THREE.LatheGeometry(vecs, Math.max(8, seg));
}

function taperCyl(rTop, rBot, h, seg) {
    return new THREE.CylinderGeometry(rTop, rBot, h, Math.max(8, seg), 3);
}

function castShadow(root) {
    root.traverse((c) => {
        if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
        }
    });
}

const FORMS = {
    male: {
        rootName: 'StarterAvatar',
        shoulderW: 0.54,
        chestW: 0.46,
        chestD: 0.28,
        waistW: 0.38,
        waistD: 0.24,
        hipW: 0.44,
        hipD: 0.28,
        hipH: 0.22,
        torsoH: 0.56,
        neckR: 0.09,
        headR: 0.175,
        headScale: [1.0, 1.06, 0.94],
        thighTop: 0.11,
        thighBot: 0.09,
        calfTop: 0.082,
        calfBot: 0.062,
        armTop: 0.068,
        armBot: 0.048,
        legLen: 0.86,
        armLen: 0.52,
        shoulderY: 1.56,
        hipY: 0.9,
        shoe: [0.11, 0.07, 0.24],
        bust: 0,
        hipOut: 0.11,
        armOut: 0.33,
        hand: [0.055, 0.09, 0.035],
    },
    female: {
        rootName: 'StarterAvatarFemale',
        shoulderW: 0.44,
        chestW: 0.4,
        chestD: 0.24,
        waistW: 0.32,
        waistD: 0.2,
        hipW: 0.48,
        hipD: 0.3,
        hipH: 0.22,
        torsoH: 0.52,
        neckR: 0.075,
        headR: 0.165,
        headScale: [0.96, 1.04, 0.92],
        thighTop: 0.105,
        thighBot: 0.086,
        calfTop: 0.076,
        calfBot: 0.056,
        armTop: 0.055,
        armBot: 0.042,
        legLen: 0.82,
        armLen: 0.48,
        shoulderY: 1.5,
        hipY: 0.88,
        shoe: [0.1, 0.065, 0.22],
        bust: 0.055,
        hipOut: 0.125,
        armOut: 0.27,
        hand: [0.048, 0.082, 0.03],
    },
};

function mesh(name, geo, material, uvRect) {
    if (uvRect) packUv(geo, uvRect);
    const m = new THREE.Mesh(geo, material);
    m.name = name;
    return m;
}

function buildBody(cols, formKey = 'male', detail = 'high', formOverride = null) {
    const f = formOverride || FORMS[formKey] || FORMS.male;
    const d = detailParams(detail);
    const SEG = d.seg;
    const root = new THREE.Group();
    root.name = f.rootName;
    root.userData.detail = detail;
    root.userData.heroUv = true;

    const matSkin = mat(cols.skin, { r: 0.58 });
    const matShirt = mat(cols.shirt, { r: 0.76 });
    const matPants = mat(cols.pants, { r: 0.86 });
    const matShoe = mat(cols.shoe ?? 0x141414, { r: 0.68, m: 0.08 });
    const matHair = mat(cols.hair ?? 0x2a1810, { r: 0.96 });
    const matEye = mat(0x151515, { r: 0.32 });
    const matSclera = mat(0xf2eee8, { r: 0.28 });

    // ── Hips / pelvis (lathe, not a brick) ──
    const hipsGeo = lathe([
        [f.hipW * 0.22, -f.hipH * 0.5],
        [f.hipW * 0.46, -f.hipH * 0.28],
        [f.hipW * 0.5, 0],
        [f.hipW * 0.44, f.hipH * 0.28],
        [f.waistW * 0.4, f.hipH * 0.5],
    ], SEG);
    hipsGeo.scale(1, 1, f.hipD / Math.max(0.12, f.hipW * 0.85));
    hipsGeo.computeVertexNormals();
    const hips = mesh('hips', hipsGeo, matPants, UV.HIPS);
    hips.position.y = f.hipY;
    root.add(hips);

    // ── Torso shirt — one lathe waist→chest→shoulder ──
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torso';
    torsoGroup.position.y = f.hipY + f.hipH * 0.48 + f.torsoH * 0.5;

    const torsoGeo = lathe([
        [f.waistW * 0.46, -f.torsoH * 0.5],
        [f.waistW * 0.48, -f.torsoH * 0.22],
        [f.chestW * 0.5, f.torsoH * 0.08],
        [f.chestW * 0.49, f.torsoH * 0.34],
        [f.shoulderW * 0.26, f.torsoH * 0.5],
    ], SEG);
    torsoGeo.scale(1, 1, f.chestD / Math.max(0.14, f.chestW * 0.9));
    torsoGeo.computeVertexNormals();
    const torsoMesh = mesh('torso_shirt', torsoGeo, matShirt, UV.TORSO);
    torsoGroup.add(torsoMesh);

    if (f.bust > 0 && d.bust) {
        const bustGeo = new THREE.SphereGeometry(f.bust, Math.max(8, SEG - 6), 10);
        const bustL = mesh('torso_bust_l', bustGeo, matShirt, UV.TORSO);
        bustL.position.set(-f.chestW * 0.16, f.torsoH * 0.1, f.chestD * 0.34);
        bustL.scale.set(1, 0.82, 0.72);
        const bustR = bustL.clone();
        bustR.name = 'torso_bust_r';
        bustR.position.x = -bustL.position.x;
        torsoGroup.add(bustL, bustR);
    }
    root.add(torsoGroup);

    // ── Shoulder yoke + deltoids ──
    const yokeGeo = new THREE.SphereGeometry(f.shoulderW * 0.22, SEG, Math.max(8, SEG / 2));
    yokeGeo.scale(f.shoulderW / (f.shoulderW * 0.44), 0.42, f.chestD * 0.85 / (f.shoulderW * 0.22));
    yokeGeo.computeVertexNormals();
    const shoulders = mesh('shoulders', yokeGeo, matShirt, UV.TORSO);
    shoulders.position.y = f.shoulderY;
    root.add(shoulders);

    const collar = mesh(
        'collar',
        taperCyl(f.neckR * 1.15, f.chestW * 0.28, 0.06, SEG),
        matShirt,
        UV.TORSO,
    );
    collar.position.y = f.shoulderY + 0.055;
    root.add(collar);

    // ── Neck + head ──
    const neck = mesh(
        'neck',
        taperCyl(f.neckR * 0.9, f.neckR, 0.13, SEG),
        matSkin,
        UV.NECK,
    );
    neck.position.y = f.shoulderY + 0.14;
    root.add(neck);

    const head = mesh(
        'head',
        new THREE.SphereGeometry(f.headR, d.headW, d.headH),
        matSkin,
        UV.HEAD,
    );
    head.position.y = f.shoulderY + 0.29;
    head.scale.set(f.headScale[0], f.headScale[1], f.headScale[2]);
    root.add(head);

    if (d.face) {
        const earGeo = new THREE.SphereGeometry(f.headR * 0.2, 8, 6);
        const earL = mesh('ear_l', earGeo, matSkin, UV.HEAD);
        earL.position.set(-f.headR * 0.9, head.position.y, 0);
        earL.scale.set(0.42, 1, 0.68);
        const earR = earL.clone();
        earR.name = 'ear_r';
        earR.position.x = -earL.position.x;
        root.add(earL, earR);

        const scleraGeo = new THREE.SphereGeometry(0.026, 8, 8);
        const scleraL = mesh('sclera_l', scleraGeo, matSclera, UV.HEAD);
        scleraL.position.set(-0.052, head.position.y + 0.018, f.headR * 0.8);
        const scleraR = scleraL.clone();
        scleraR.name = 'sclera_r';
        scleraR.position.x = 0.052;
        const eyeGeo = new THREE.SphereGeometry(0.014, 8, 8);
        const eyeL = mesh('eye_l', eyeGeo, matEye, UV.HEAD);
        eyeL.position.set(-0.052, head.position.y + 0.018, f.headR * 0.9);
        const eyeR = eyeL.clone();
        eyeR.name = 'eye_r';
        eyeR.position.x = 0.052;
        root.add(scleraL, scleraR, eyeL, eyeR);

        const nose = mesh('nose', new THREE.SphereGeometry(0.018, 8, 6), matSkin, UV.HEAD);
        nose.position.set(0, head.position.y - 0.012, f.headR * 0.9);
        nose.scale.set(0.68, 0.92, 1.15);
        root.add(nose);
    }

    const hairAnchor = new THREE.Group();
    hairAnchor.name = 'hair_anchor';
    hairAnchor.position.y = head.position.y + f.headR * 0.55;
    root.add(hairAnchor);

    const hairCap = mesh(
        'hairCap',
        new THREE.SphereGeometry(f.headR * 1.08, Math.max(12, SEG - 8), 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        matHair,
        UV.HEAD,
    );
    hairCap.position.y = head.position.y + f.headR * 0.12;
    root.add(hairCap);

    // ── Legs (group pivots keep walk clips) ──
    function buildLeg(side) {
        const sign = side === 'L' ? -1 : 1;
        const g = new THREE.Group();
        g.name = side === 'L' ? 'legL' : 'legR';
        const uvLeg = side === 'L' ? UV.LEG_L : UV.LEG_R;
        const uvFoot = side === 'L' ? UV.FOOT_L : UV.FOOT_R;
        const thighH = f.legLen * 0.46;
        const calfH = f.legLen * 0.4;

        const thigh = mesh(
            `leg_thigh_${side}`,
            taperCyl(f.thighBot, f.thighTop, thighH, SEG),
            matPants,
            uvLeg,
        );
        thigh.position.y = -thighH * 0.5;

        const knee = mesh(
            `leg_knee_${side}`,
            new THREE.SphereGeometry(f.thighBot * 1.05, Math.max(8, SEG - 8), 8),
            matPants,
            uvLeg,
        );
        knee.position.y = -thighH;

        const calf = mesh(
            `leg_calf_${side}`,
            taperCyl(f.calfBot, f.calfTop, calfH, SEG),
            matPants,
            uvLeg,
        );
        calf.position.y = -thighH - calfH * 0.5;

        const foot = mesh(
            `shoe_${side}`,
            new THREE.BoxGeometry(f.shoe[0], f.shoe[1], f.shoe[2], 1, 1, 2),
            matShoe,
            uvFoot,
        );
        foot.position.set(0, -f.legLen * 0.92, f.shoe[2] * 0.18);

        g.add(thigh, knee, calf, foot);
        g.position.set(sign * f.hipOut, f.hipY, 0);
        return g;
    }

    const legL = buildLeg('L');
    const legR = buildLeg('R');
    root.add(legL, legR);

    // ── Arms ──
    function buildArm(side) {
        const sign = side === 'L' ? -1 : 1;
        const g = new THREE.Group();
        g.name = side === 'L' ? 'armL' : 'armR';
        const uvArm = side === 'L' ? UV.ARM_L : UV.ARM_R;
        const uvHand = side === 'L' ? UV.HAND_L : UV.HAND_R;
        const upH = f.armLen * 0.5;
        const loH = f.armLen * 0.4;

        const deltoid = mesh(
            `shoulder_deltoid_${side}`,
            new THREE.SphereGeometry(f.armTop * 1.35, Math.max(8, SEG - 8), 8),
            matShirt,
            UV.TORSO,
        );
        deltoid.position.set(0, -0.02, 0);

        const upper = mesh(
            `arm_upper_${side}`,
            taperCyl(f.armBot * 1.08, f.armTop, upH, SEG),
            matSkin,
            uvArm,
        );
        upper.position.y = -upH * 0.5 - 0.02;

        const elbow = mesh(
            `arm_elbow_${side}`,
            new THREE.SphereGeometry(f.armBot * 1.08, Math.max(8, SEG - 8), 8),
            matSkin,
            uvArm,
        );
        elbow.position.y = -upH - 0.02;

        const lower = mesh(
            `arm_fore_${side}`,
            taperCyl(f.armBot * 0.88, f.armBot * 1.08, loH, SEG),
            matSkin,
            uvArm,
        );
        lower.position.y = -upH - loH * 0.5 - 0.02;

        const palm = mesh(
            `arm_hand_${side}`,
            new THREE.BoxGeometry(f.hand[0], f.hand[1] * 0.55, f.hand[2], 1, 1, 1),
            matSkin,
            uvHand,
        );
        palm.position.y = -f.armLen * 0.94;

        const finger = mesh(
            `arm_fingers_${side}`,
            new THREE.BoxGeometry(f.hand[0] * 0.92, f.hand[1] * 0.42, f.hand[2] * 0.75, 1, 1, 1),
            matSkin,
            uvHand,
        );
        finger.position.y = -f.armLen * 0.94 - f.hand[1] * 0.42;

        g.add(deltoid, upper, elbow, lower, palm, finger);
        g.position.set(sign * f.armOut, f.shoulderY - 0.02, 0);
        g.rotation.z = sign * 0.09;
        return g;
    }

    const armL = buildArm('L');
    const armR = buildArm('R');
    root.add(armL, armR);

    castShadow(root);
    const torso = root.getObjectByName('torso') || torsoGroup;
    return { root, legL, legR, armL, armR, torso, form: f };
}

function buildHairShort(cols) {
    const g = new THREE.Group();
    g.name = 'hair_short_m';
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.195, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
        mat(cols.hair || 0x2a1810, { r: 0.96 }),
    );
    cap.name = 'hair_mesh';
    g.add(cap);
    castShadow(g);
    return g;
}

function buildHairLong(cols) {
    const g = new THREE.Group();
    g.name = 'hair_long_f';
    const c = mat(cols.hair || 0x2a1810, { r: 0.94 });
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.195, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
        c,
    );
    const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.45, 10), c);
    drape.position.set(0, -0.2, -0.06);
    drape.name = 'hair_drape';
    const sideL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.28, 8), c);
    sideL.position.set(-0.12, -0.12, 0.02);
    const sideR = sideL.clone();
    sideR.position.x = 0.12;
    g.add(cap, drape, sideL, sideR);
    castShadow(g);
    return g;
}

function buildHairBun(cols) {
    const g = new THREE.Group();
    g.name = 'hair_bun_f';
    const c = mat(cols.hair || 0x4a3828, { r: 0.94 });
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.185, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.48),
        c,
    );
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), c);
    bun.position.set(0, 0.1, -0.14);
    bun.name = 'hair_bun';
    g.add(cap, bun);
    castShadow(g);
    return g;
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

function posOffsetYTrack(obj, times, deltas) {
    const p = obj.position;
    const values = [];
    for (const d of deltas) values.push(p.x, p.y + d, p.z);
    return new THREE.VectorKeyframeTrack(`${obj.name}.position`, times, values);
}

function idleClip(parts) {
    const { legL, legR, armL, armR, torso } = parts;
    const d = 2.4;
    const t = [0, d * 0.5, d];
    const tracks = [
        quatXTrack(legL.name, t, [0.04, 0.04, 0.04]),
        quatXTrack(legR.name, t, [-0.02, -0.02, -0.02]),
        quatXTrack(armL.name, t, [0.1, 0.12, 0.1]),
        quatXTrack(armR.name, t, [0.1, 0.08, 0.1]),
    ];
    if (torso) tracks.push(posOffsetYTrack(torso, t, [0, 0.012, 0]));
    return new THREE.AnimationClip('idle', d, tracks);
}

function walkClip(parts) {
    const { legL, legR, armL, armR, torso } = parts;
    const d = 0.9;
    const t = [0, d * 0.25, d * 0.5, d * 0.75, d];
    const a = 0.58;
    const tracks = [
        quatXTrack(legL.name, t, [0, a, 0, -a, 0]),
        quatXTrack(legR.name, t, [0, -a, 0, a, 0]),
        quatXTrack(armL.name, t, [0.08, -a * 0.72, 0.08, a * 0.72, 0.08]),
        quatXTrack(armR.name, t, [0.08, a * 0.72, 0.08, -a * 0.72, 0.08]),
    ];
    if (torso) tracks.push(posOffsetYTrack(torso, t, [0, 0.028, 0, 0.028, 0]));
    return new THREE.AnimationClip('walk', d, tracks);
}

function runClip(parts) {
    const { legL, legR, armL, armR, torso } = parts;
    const d = 0.55;
    const t = [0, d * 0.25, d * 0.5, d * 0.75, d];
    const a = 0.85;
    const tracks = [
        quatXTrack(legL.name, t, [0, a, 0, -a, 0]),
        quatXTrack(legR.name, t, [0, -a, 0, a, 0]),
        quatXTrack(armL.name, t, [0.15, -a * 0.9, 0.15, a * 0.9, 0.15]),
        quatXTrack(armR.name, t, [0.15, a * 0.9, 0.15, -a * 0.9, 0.15]),
    ];
    if (torso) tracks.push(posOffsetYTrack(torso, t, [0, 0.045, 0, 0.045, 0]));
    return new THREE.AnimationClip('run', d, tracks);
}

function buildLocoClips(parts) {
    return [idleClip(parts), walkClip(parts), runClip(parts)];
}

function exportGlb(root, clips, out) {
    const anims = Array.isArray(clips) ? clips.filter(Boolean) : (clips ? [clips] : []);
    return new Promise((res, rej) => {
        new GLTFExporter().parse(root, (r) => {
            fs.mkdirSync(path.dirname(out), { recursive: true });
            fs.writeFileSync(out, Buffer.from(r));
            fs.mkdirSync(PUB, { recursive: true });
            fs.copyFileSync(out, path.join(PUB, path.basename(out)));
            res(out);
        }, rej, { binary: true, animations: anims });
    });
}

function countTris(root) {
    let tris = 0;
    root.traverse((c) => {
        if (c.isMesh && c.geometry) {
            const g = c.geometry;
            const idx = g.index;
            if (idx) tris += idx.count / 3;
            else if (g.attributes.position) tris += g.attributes.position.count / 3;
        }
    });
    return Math.round(tris);
}

const FORM_BIAS = {
    male: null,
    female: null,
    guard: {
        shoulderW: 1.14,
        chestW: 1.12,
        chestD: 1.1,
        hipW: 1.06,
        thighTop: 1.12,
        armTop: 1.15,
        torsoH: 1.04,
    },
    mech: {
        shoulderW: 1.08,
        chestW: 1.1,
        waistW: 1.08,
        hipW: 1.1,
        armTop: 1.12,
        thighTop: 1.1,
        legLen: 0.96,
        armLen: 1.02,
    },
};

function applyFormBias(formKey, biasKey) {
    const base = { ...(FORMS[formKey] || FORMS.male) };
    const bias = FORM_BIAS[biasKey];
    if (!bias) return base;
    for (const [k, v] of Object.entries(bias)) {
        if (typeof base[k] === 'number' && typeof v === 'number') {
            base[k] = v > 2 ? v : base[k] * v;
        }
    }
    if (biasKey === 'guard') base.rootName = 'StarterGuard';
    if (biasKey === 'mech') base.rootName = 'StarterMech';
    return base;
}

const AVATARS = [
    {
        file: 'starter_avatar.glb',
        form: 'male',
        bias: 'male',
        cols: { shirt: 0x3d5a80, pants: 0x232830, skin: 0xe8b896, hair: 0x2a1810, shoe: 0x121218 },
    },
    {
        file: 'starter_avatar_female.glb',
        form: 'female',
        bias: 'female',
        cols: { shirt: 0x6a4a6a, pants: 0x2a2838, skin: 0xe8c4a8, hair: 0x3a2818, shoe: 0x1a1420 },
    },
    {
        file: 'starter_npc_guard.glb',
        form: 'male',
        bias: 'guard',
        cols: { shirt: 0x1e3348, pants: 0x141a22, skin: 0xd4a882, hair: 0x1a1210, shoe: 0x0e1014 },
    },
    {
        file: 'starter_npc_mech.glb',
        form: 'male',
        bias: 'mech',
        cols: { shirt: 0x7a4e2e, pants: 0x2a2830, skin: 0xc99872, hair: 0x3a2818, shoe: 0x2a2018 },
    },
];

const HAIR = [
    { file: 'hair_short_m.glb', build: buildHairShort, cols: { hair: 0x2a1810 } },
    { file: 'hair_long_f.glb', build: buildHairLong, cols: { hair: 0x3a2818 } },
    { file: 'hair_bun_f.glb', build: buildHairBun, cols: { hair: 0x4a3828 } },
];

const LOD_TIERS = [
    { detail: 'high', suffix: '' },
    { detail: 'mid', suffix: '_lod1' },
    { detail: 'low', suffix: '_lod2' },
];

const UV_COLORS = {
    HEAD: [220, 90, 90],
    NECK: [200, 70, 70],
    ARM_L: [80, 170, 220],
    ARM_R: [60, 140, 200],
    TORSO: [90, 200, 120],
    HAND_L: [80, 160, 210],
    HAND_R: [50, 130, 190],
    HIPS: [200, 170, 70],
    LEG_L: [180, 110, 220],
    LEG_R: [150, 80, 200],
    FOOT_L: [120, 120, 140],
    FOOT_R: [100, 100, 120],
};

function writeUvGuide() {
    const W = 1024;
    const H = 1024;
    const rgba = fillRgba(W, H, (x, y) => {
        const u = x / W;
        const v = 1 - y / H;
        let col = [28, 28, 32];
        for (const [key, rect] of Object.entries(UV)) {
            const [u0, v0, u1, v1] = rect;
            if (u >= u0 && u <= u1 && v >= v0 && v <= v1) {
                const cx = Math.floor(x / 16);
                const cy = Math.floor(y / 16);
                const checker = (cx + cy) % 2 === 0;
                const base = UV_COLORS[key] || [180, 180, 180];
                col = checker
                    ? base
                    : [Math.max(0, base[0] - 28), Math.max(0, base[1] - 28), Math.max(0, base[2] - 28)];
                const edge = u < u0 + 0.004 || u > u1 - 0.004 || v < v0 + 0.004 || v > v1 - 0.004;
                if (edge) col = [245, 245, 245];
                break;
            }
        }
        return [...col, 255];
    });
    fs.mkdirSync(TEMPLATE, { recursive: true });
    const out = path.join(TEMPLATE, 'hero_uv_guide.png');
    writePng(out, W, H, rgba, fs);
    const legend = Object.keys(UV).map((k) => `${k} ${UV[k].map((n) => n.toFixed(2)).join(',')}`).join('\n');
    fs.writeFileSync(path.join(TEMPLATE, 'hero_uv_guide.txt'), `${legend}\n`);
    console.log(`[gen-starter-avatar] UV guide → textures/_templates/hero_uv_guide.png`);
}

async function main() {
    console.log('[gen-starter-avatar] H0/H1 — hero UV atlas + profiled anatomy\n');
    writeUvGuide();
    for (const spec of AVATARS) {
        const wantLods = /starter_avatar(_female)?\.glb$/i.test(spec.file);
        const tiers = wantLods ? LOD_TIERS : [LOD_TIERS[0]];
        const formOver = applyFormBias(spec.form, spec.bias || spec.form);
        for (const lod of tiers) {
            const built = buildBody(spec.cols, spec.form, lod.detail, formOver);
            const { root, legL, legR, armL, armR, torso } = built;
            const clips = buildLocoClips({ legL, legR, armL, armR, torso });
            const base = spec.file.replace(/\.glb$/i, '');
            const file = lod.suffix ? `${base}${lod.suffix}.glb` : spec.file;
            const out = path.join(IMPORT, file);
            await exportGlb(root, clips, out);
            const kb = (fs.statSync(out).size / 1024).toFixed(1);
            const tris = countTris(root);
            console.log(`[gen-starter-avatar] ${file} (${spec.bias || spec.form}/${lod.detail}) ${kb} KB · ~${tris} tris · clips=${clips.map((c) => c.name).join(',')}`);
        }
    }
    for (const spec of HAIR) {
        const root = spec.build(spec.cols);
        const out = path.join(IMPORT, spec.file);
        await exportGlb(root, null, out);
        const kb = (fs.statSync(out).size / 1024).toFixed(1);
        console.log(`[gen-starter-avatar] ${spec.file} (${kb} KB)`);
    }
    console.log('[gen-starter-avatar] done — import/ + public/bundle/import/ + UV guide');
}

main().catch((e) => { console.error(e); process.exit(1); });
