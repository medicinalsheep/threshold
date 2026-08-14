#!/usr/bin/env node
/**
 * Offline walk-rig smoke: idle/walk/run clips + named limbs; mixer drives legL.
 * Usage: node scripts/walk-rig-verify.cjs
 */
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');

const ROOT = path.join(__dirname, '..');
const FILES = [
    'starter_avatar.glb',
    'starter_avatar_female.glb',
    'starter_npc_guard.glb',
    'starter_npc_mech.glb',
];

function pickRoots(model) {
    const roots = [model];
    for (const n of ['StarterAvatar', 'StarterAvatarFemale', 'StarterGuard', 'StarterMech']) {
        const o = model.getObjectByName(n);
        if (o) roots.push(o);
    }
    return [...new Set(roots)];
}

function checkFile(rel) {
    const file = path.join(ROOT, 'import', rel);
    return new Promise((resolve) => {
        if (!fs.existsSync(file)) {
            resolve({ file: rel, fail: 1, notes: ['missing file'] });
            return;
        }
        const buf = fs.readFileSync(file);
        const loader = new GLTFLoader();
        loader.parse(
            buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
            '',
            (gltf) => {
                const notes = [];
                let fail = 0;
                const ok = (m) => notes.push(`✓ ${m}`);
                const bad = (m) => { notes.push(`✗ ${m}`); fail += 1; };

                const names = (gltf.animations || []).map((a) => a.name);
                const hasIdle = names.some((n) => /idle/i.test(n));
                const hasWalk = names.some((n) => /walk|locomotion/i.test(n));
                const hasRun = names.some((n) => /run|sprint/i.test(n));
                if (hasIdle) ok(`idle clip`); else bad('no idle clip');
                if (hasWalk) ok(`walk clip`); else bad('no walk clip');
                if (hasRun) ok(`run clip`); else bad('no run clip');

                const model = gltf.scene;
                const leg = model.getObjectByName('legL');
                const arm = model.getObjectByName('armL');
                if (leg && arm) ok('limbs legL+armL'); else bad('missing limbs');

                const walk = gltf.animations.find((a) => /walk/i.test(a.name)) || gltf.animations[0];
                let bound = false;
                if (walk && leg) {
                    for (const root of pickRoots(model)) {
                        const mixer = new THREE.AnimationMixer(root);
                        const action = mixer.clipAction(walk);
                        action.play();
                        action.paused = false;
                        const q0 = leg.quaternion.clone();
                        for (let i = 0; i < 12; i++) mixer.update(0.05);
                        if (!q0.equals(leg.quaternion)) {
                            ok(`mixer drives legL (${root.name || root.type})`);
                            bound = true;
                            break;
                        }
                    }
                }
                if (!bound) bad('mixer does not drive legL');

                const kb = (fs.statSync(file).size / 1024).toFixed(1);
                resolve({ file: rel, fail, notes, kb, clips: names.join(',') });
            },
            (e) => resolve({ file: rel, fail: 1, notes: [String(e.message || e)] }),
        );
    });
}

async function main() {
    console.log('walk-rig-verify (Track B multi-clip)\n');
    let fails = 0;
    for (const f of FILES) {
        const r = await checkFile(f);
        console.log(`## ${r.file} (${r.kb || '?'} KB) clips=[${r.clips || ''}]`);
        (r.notes || []).forEach((n) => console.log(' ', n));
        fails += r.fail || 0;
        console.log('');
    }
    console.log(fails ? `FAIL (${fails})` : 'PASS');
    process.exit(fails ? 1 : 0);
}

main();
