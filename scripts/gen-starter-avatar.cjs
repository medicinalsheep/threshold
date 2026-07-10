#!/usr/bin/env node
/**
 * Starter avatar GLBs — moderate-poly human forms + hair + walk clip.
 * Male / female body presets (formed proportions). Run: npm run avatar:gen
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
const IMPORT = path.join(ROOT, 'import');
const PUB = path.join(ROOT, 'public', 'bundle', 'import');

/** Radial segments for limbs / torso rings — moderate poly (~3–6k tris/body). */
const SEG = 12;
const HEAD_W = 24;
const HEAD_H = 20;

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

function castShadow(root) {
    root.traverse((c) => {
        if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
        }
    });
}

/**
 * Formed body proportions (meters-ish before export scale).
 * Shared detailed topology; scales differ for male / female.
 */
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
        hipH: 0.24,
        torsoH: 0.56,
        neckR: 0.09,
        headR: 0.175,
        headScale: [1.0, 1.06, 0.94],
        thighTop: 0.11,
        thighBot: 0.095,
        calfTop: 0.085,
        calfBot: 0.07,
        armTop: 0.065,
        armBot: 0.05,
        legLen: 0.86,
        armLen: 0.52,
        shoulderY: 1.56,
        hipY: 0.9,
        shoe: [0.2, 0.09, 0.3],
        bust: 0,
        hipOut: 0.12,
        armOut: 0.34,
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
        hipH: 0.24,
        torsoH: 0.52,
        neckR: 0.075,
        headR: 0.165,
        headScale: [0.96, 1.04, 0.92],
        thighTop: 0.105,
        thighBot: 0.09,
        calfTop: 0.08,
        calfBot: 0.065,
        armTop: 0.055,
        armBot: 0.045,
        legLen: 0.82,
        armLen: 0.48,
        shoulderY: 1.5,
        hipY: 0.88,
        shoe: [0.18, 0.08, 0.26],
        bust: 0.06,
        hipOut: 0.13,
        armOut: 0.28,
    },
};

function buildBody(cols, formKey = 'male') {
    const f = FORMS[formKey] || FORMS.male;
    const root = new THREE.Group();
    root.name = f.rootName;

    const matSkin = mat(cols.skin, { r: 0.62 });
    const matShirt = mat(cols.shirt, { r: 0.78 });
    const matPants = mat(cols.pants, { r: 0.88 });
    const matShoe = mat(cols.shoe ?? 0x141414, { r: 0.68, m: 0.08 });
    const matHair = mat(cols.hair ?? 0x2a1810, { r: 0.96 });
    const matEye = mat(0x151515, { r: 0.35 });

    // ── Hips / pelvis ──
    const hips = new THREE.Mesh(
        new THREE.BoxGeometry(f.hipW, f.hipH, f.hipD, 1, 1, 1),
        matPants
    );
    hips.position.y = f.hipY;
    hips.name = 'hips';
    // Soften with slight taper via scale
    hips.scale.set(1, 1, 1);
    root.add(hips);

    // ── Torso (shirt) — stacked volumes for waist→chest ──
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torso';
    torsoGroup.position.y = f.hipY + f.hipH * 0.5 + f.torsoH * 0.5;

    const waist = new THREE.Mesh(
        new THREE.CylinderGeometry(f.waistW * 0.48, f.hipW * 0.42, f.torsoH * 0.35, SEG),
        matShirt
    );
    waist.position.y = -f.torsoH * 0.28;
    waist.name = 'torso_waist';

    const chest = new THREE.Mesh(
        new THREE.CylinderGeometry(f.chestW * 0.5, f.waistW * 0.48, f.torsoH * 0.55, SEG),
        matShirt
    );
    chest.position.y = f.torsoH * 0.08;
    chest.scale.z = f.chestD / (f.chestW * 0.55);
    chest.name = 'torso_chest';

    torsoGroup.add(waist, chest);

    if (f.bust > 0) {
        const bustL = new THREE.Mesh(new THREE.SphereGeometry(f.bust, 10, 8), matShirt);
        bustL.position.set(-f.chestW * 0.18, f.torsoH * 0.12, f.chestD * 0.38);
        bustL.scale.set(1, 0.85, 0.75);
        bustL.name = 'torso_bust_l';
        const bustR = bustL.clone();
        bustR.position.x = -bustL.position.x;
        bustR.name = 'torso_bust_r';
        torsoGroup.add(bustL, bustR);
    }

    root.add(torsoGroup);

    // ── Shoulders + collar ──
    const shoulders = new THREE.Mesh(
        new THREE.BoxGeometry(f.shoulderW, 0.12, f.chestD * 0.95),
        matShirt
    );
    shoulders.position.y = f.shoulderY;
    shoulders.name = 'shoulders';
    root.add(shoulders);

    const collar = new THREE.Mesh(
        new THREE.BoxGeometry(f.chestW * 0.72, 0.055, f.chestD * 0.9),
        matShirt
    );
    collar.position.set(0, f.shoulderY + 0.07, 0.02);
    collar.name = 'collar';
    root.add(collar);

    // ── Neck + head ──
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(f.neckR * 0.92, f.neckR, 0.12, SEG),
        matSkin
    );
    neck.position.y = f.shoulderY + 0.14;
    neck.name = 'neck';
    root.add(neck);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(f.headR, HEAD_W, HEAD_H),
        matSkin
    );
    head.position.y = f.shoulderY + 0.28;
    head.scale.set(f.headScale[0], f.headScale[1], f.headScale[2]);
    head.name = 'head';
    root.add(head);

    // Ears
    const earGeo = new THREE.SphereGeometry(f.headR * 0.22, 8, 6);
    const earL = new THREE.Mesh(earGeo, matSkin);
    earL.position.set(-f.headR * 0.92, head.position.y, 0);
    earL.scale.set(0.45, 1, 0.7);
    earL.name = 'ear_l';
    const earR = earL.clone();
    earR.position.x = -earL.position.x;
    earR.name = 'ear_r';
    root.add(earL, earR);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.022, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, matEye);
    eyeL.position.set(-0.055, head.position.y + 0.02, f.headR * 0.82);
    eyeL.name = 'eye_l';
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.055;
    eyeR.name = 'eye_r';
    root.add(eyeL, eyeR);

    // Nose hint
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), matSkin);
    nose.position.set(0, head.position.y - 0.01, f.headR * 0.88);
    nose.scale.set(0.7, 0.9, 1.1);
    nose.name = 'nose';
    root.add(nose);

    // Hair anchor (HairSlot)
    const hairAnchor = new THREE.Group();
    hairAnchor.name = 'hair_anchor';
    hairAnchor.position.y = head.position.y + f.headR * 0.55;
    root.add(hairAnchor);

    // Default short hair cap on body (can be replaced by hair GLB)
    const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(f.headR * 1.08, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        matHair
    );
    hairCap.position.y = head.position.y + f.headR * 0.12;
    hairCap.name = 'hairCap';
    root.add(hairCap);

    // ── Legs (pivot groups for walk) ──
    function buildLeg(side) {
        const sign = side === 'L' ? -1 : 1;
        const g = new THREE.Group();
        g.name = side === 'L' ? 'legL' : 'legR';

        const thigh = new THREE.Mesh(
            new THREE.CylinderGeometry(f.thighBot, f.thighTop, f.legLen * 0.48, SEG),
            matPants
        );
        thigh.position.y = -f.legLen * 0.24;
        thigh.name = `thigh_${side}`;

        const calf = new THREE.Mesh(
            new THREE.CylinderGeometry(f.calfBot, f.calfTop, f.legLen * 0.42, SEG),
            matPants
        );
        calf.position.y = -f.legLen * 0.66;
        calf.name = `calf_${side}`;

        const shoe = new THREE.Mesh(
            new THREE.BoxGeometry(f.shoe[0], f.shoe[1], f.shoe[2]),
            matShoe
        );
        shoe.position.set(0, -f.legLen * 0.92, f.shoe[2] * 0.12);
        shoe.name = `shoe_${side}`;

        g.add(thigh, calf, shoe);
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

        const upper = new THREE.Mesh(
            new THREE.CylinderGeometry(f.armBot * 1.05, f.armTop, f.armLen * 0.52, SEG),
            matSkin
        );
        upper.position.y = -f.armLen * 0.26;
        upper.name = `upper_arm_${side}`;

        const lower = new THREE.Mesh(
            new THREE.CylinderGeometry(f.armBot * 0.9, f.armBot * 1.05, f.armLen * 0.42, SEG),
            matSkin
        );
        lower.position.y = -f.armLen * 0.68;
        lower.name = `forearm_${side}`;

        const hand = new THREE.Mesh(
            new THREE.BoxGeometry(0.07, 0.1, 0.045),
            matSkin
        );
        hand.position.y = -f.armLen * 0.95;
        hand.name = `hand_${side}`;

        g.add(upper, lower, hand);
        g.position.set(sign * f.armOut, f.shoulderY - 0.02, 0);
        // slight rest angle outward
        g.rotation.z = sign * 0.08;
        return g;
    }

    const armL = buildArm('L');
    const armR = buildArm('R');
    root.add(armL, armR);

    castShadow(root);

    // For walk clip, limb groups must be named legL/legR/armL/armR
    return { root, legL, legR, armL, armR, form: f };
}

function buildHairShort(cols) {
    const g = new THREE.Group();
    g.name = 'hair_short_m';
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.195, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
        mat(cols.hair || 0x2a1810, { r: 0.96 })
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
        c
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
        c
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

const AVATARS = [
    {
        file: 'starter_avatar.glb',
        form: 'male',
        cols: { shirt: 0x3d5a80, pants: 0x232830, skin: 0xe8b896, hair: 0x2a1810 },
    },
    {
        file: 'starter_avatar_female.glb',
        form: 'female',
        cols: { shirt: 0x6a4a6a, pants: 0x2a2838, skin: 0xe8b896, hair: 0x3a2818 },
    },
    {
        file: 'starter_npc_guard.glb',
        form: 'male',
        cols: { shirt: 0x2a3d52, pants: 0x1a2028, skin: 0xd4a882, hair: 0x1a1210 },
    },
    {
        file: 'starter_npc_mech.glb',
        form: 'male',
        cols: { shirt: 0x6b4428, pants: 0x2a2830, skin: 0xc99872, hair: 0x3a2818 },
    },
];

const HAIR = [
    { file: 'hair_short_m.glb', build: buildHairShort, cols: { hair: 0x2a1810 } },
    { file: 'hair_long_f.glb', build: buildHairLong, cols: { hair: 0x3a2818 } },
    { file: 'hair_bun_f.glb', build: buildHairBun, cols: { hair: 0x4a3828 } },
];

async function main() {
    for (const spec of AVATARS) {
        const { root, legL, legR, armL, armR } = buildBody(spec.cols, spec.form);
        const clip = walkClip(legL, legR, armL, armR);
        const out = path.join(IMPORT, spec.file);
        await exportGlb(root, clip, out);
        const kb = (fs.statSync(out).size / 1024).toFixed(1);
        const tris = countTris(root);
        console.log(`[gen-starter-avatar] ${spec.file} (${spec.form}) ${kb} KB · ~${tris} tris + walk`);
    }
    for (const spec of HAIR) {
        const root = spec.build(spec.cols);
        const out = path.join(IMPORT, spec.file);
        await exportGlb(root, null, out);
        const kb = (fs.statSync(out).size / 1024).toFixed(1);
        console.log(`[gen-starter-avatar] ${spec.file} (${kb} KB)`);
    }
    console.log('[gen-starter-avatar] done — import/ + public/bundle/import/');
}

main().catch((e) => { console.error(e); process.exit(1); });
