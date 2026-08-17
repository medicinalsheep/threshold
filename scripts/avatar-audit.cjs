#!/usr/bin/env node
/**
 * Track C — avatar audit gate.
 *
 * Manifest contract + body/LOD/NPC clips + named limbs + mixer bind
 * + skin/fabric maps + runtime walk contracts (dt / idle-walk-run / rebind).
 *
 * Usage:
 *   node scripts/avatar-audit.cjs
 *   npm run avatar:audit
 *
 * Writes: dist-store/avatar-audit.json
 */
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');

const ROOT = path.join(__dirname, '..');
const IMPORT = path.join(ROOT, 'import');
const BUNDLE = path.join(ROOT, 'public', 'bundle', 'import');
const TEX = path.join(ROOT, 'textures');
const OUT = path.join(ROOT, 'dist-store', 'avatar-audit.json');
const MANIFEST = path.join(ROOT, 'config', 'avatar-manifest.json');

const REQUIRED_CLIPS = [
    { id: 'idle', re: /idle/i },
    { id: 'walk', re: /walk|locomotion/i },
    { id: 'run', re: /run|sprint/i },
];
const REQUIRED_LIMBS = ['legL', 'legR', 'armL', 'armR'];
const WARN_PARTS = ['torso', 'hips', 'head'];
const SKIN_TONES = [
    'starter_skin_porcelain', 'starter_skin_light', 'starter_skin_honey',
    'starter_skin_olive', 'starter_skin_medium', 'starter_skin_tan',
    'starter_skin_caramel', 'starter_skin_deep', 'starter_skin_ebony',
];

const results = [];
function pass(id, notes) { results.push({ id, ok: true, notes }); console.log(`  PASS  ${id}  ${notes}`); }
function fail(id, notes) { results.push({ id, ok: false, notes }); console.log(`  FAIL  ${id}  ${notes}`); }
function warn(id, notes) { results.push({ id, ok: true, warn: true, notes }); console.log(`  WARN  ${id}  ${notes}`); }

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function texExists(slug, slot) {
    const names = [
        `${slug}_${slot}.png`,
        `${slug}_${slot}_1k.png`,
        `${slug}_${slot}_2k.png`,
    ];
    return names.find((n) => fs.existsSync(path.join(TEX, n))) || null;
}

function pickRoots(model) {
    const roots = [model];
    for (const n of ['StarterAvatar', 'StarterAvatarFemale', 'StarterGuard', 'StarterMech']) {
        const o = model.getObjectByName(n);
        if (o) roots.push(o);
    }
    return [...new Set(roots)];
}

function collectGlbs(manifest) {
    const files = new Set();
    for (const body of Object.values(manifest.bodies || {})) {
        if (body.glb) files.add(body.glb);
        for (const lod of body.lods || []) {
            if (lod.file) files.add(lod.file);
        }
    }
    for (const role of Object.values(manifest.roles || {})) {
        if (role.glb) files.add(role.glb);
    }
    return [...files];
}

function collectHair(manifest) {
    const files = [];
    for (const [id, hair] of Object.entries(manifest.hair || {})) {
        if (hair.glb) files.push({ id, glb: hair.glb });
    }
    return files;
}

function parseGlb(abs) {
    return new Promise((resolve, reject) => {
        const buf = fs.readFileSync(abs);
        const loader = new GLTFLoader();
        loader.parse(
            buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
            '',
            (gltf) => resolve(gltf),
            (e) => reject(e),
        );
    });
}

async function auditGlb(rel, { requireClips = true } = {}) {
    const abs = path.join(IMPORT, rel);
    if (!fs.existsSync(abs)) {
        fail(`G-${rel}`, 'missing import/' + rel);
        return;
    }
    const kb = (fs.statSync(abs).size / 1024).toFixed(1);
    let gltf;
    try {
        gltf = await parseGlb(abs);
    } catch (e) {
        fail(`G-${rel}`, `parse error: ${e.message || e}`);
        return;
    }

    const names = (gltf.animations || []).map((a) => a.name);
    const model = gltf.scene;
    const notes = [`${kb} KB`, `clips=[${names.join(',') || 'none'}]`];

    if (requireClips) {
        for (const clip of REQUIRED_CLIPS) {
            if (names.some((n) => clip.re.test(n))) notes.push(`${clip.id}✓`);
            else {
                fail(`G-${rel}-${clip.id}`, `no ${clip.id} clip (${notes[1]})`);
                return;
            }
        }
        const missingLimbs = REQUIRED_LIMBS.filter((n) => !model.getObjectByName(n));
        if (missingLimbs.length) {
            fail(`G-${rel}-limbs`, `missing ${missingLimbs.join(',')}`);
            return;
        }
        notes.push('limbs✓');
        const missingSoft = WARN_PARTS.filter((n) => !model.getObjectByName(n));
        if (missingSoft.length) notes.push(`soft-missing ${missingSoft.join(',')}`);

        const walk = gltf.animations.find((a) => /walk/i.test(a.name)) || gltf.animations[0];
        const leg = model.getObjectByName('legL');
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
                    bound = true;
                    notes.push(`mixer@${root.name || root.type}`);
                    break;
                }
            }
        }
        if (!bound) {
            fail(`G-${rel}-mixer`, 'mixer does not drive legL');
            return;
        }

        let skinned = false;
        model.traverse((c) => { if (c.isSkinnedMesh) skinned = true; });
        if (!skinned) notes.push('procedural (no SkinnedMesh)');
    }

    const bundle = path.join(BUNDLE, rel);
    if (!fs.existsSync(bundle)) {
        fail(`G-${rel}-bundle`, 'missing public/bundle/import/' + rel);
        return;
    }
    const a = fs.statSync(abs).size;
    const b = fs.statSync(bundle).size;
    if (a !== b) notes.push(`bundle size drift import=${a} bundle=${b}`);

    pass(`G-${rel}`, notes.join(' · '));
}

function auditManifest(manifest) {
    if (manifest.format !== 'threshold-avatar-manifest') {
        fail('M-format', `unexpected format ${manifest.format}`);
    } else {
        pass('M-format', `v${manifest.version} preferredRoot=${manifest.preferredRoot || '—'}`);
    }

    const clips = (manifest.animationClips || []).map((s) => String(s).toLowerCase());
    const hasIdle = clips.some((n) => /idle/.test(n));
    const hasWalk = clips.some((n) => /walk|locomotion/.test(n));
    const hasRun = clips.some((n) => /run|sprint/.test(n));
    if (hasIdle && hasWalk && hasRun) pass('M-clips', (manifest.animationClips || []).join(', '));
    else fail('M-clips', `need idle+walk+run in animationClips (${clips.join(',')})`);

    const parts = new Set(manifest.namedParts || []);
    const missing = REQUIRED_LIMBS.filter((n) => !parts.has(n));
    if (missing.length) fail('M-parts', `namedParts missing ${missing.join(',')}`);
    else pass('M-parts', (manifest.namedParts || []).join(', '));

    const mods = path.join(ROOT, manifest.modsCatalog || 'config/avatar-mods.json');
    if (fs.existsSync(mods)) pass('M-mods', path.relative(ROOT, mods));
    else fail('M-mods', `modsCatalog missing ${manifest.modsCatalog}`);
}

function auditRoles(manifest) {
    const bodies = manifest.bodies || {};
    for (const [id, role] of Object.entries(manifest.roles || {})) {
        if (role.glb) {
            if (fs.existsSync(path.join(IMPORT, role.glb))) pass(`M-role-${id}`, role.glb);
            else fail(`M-role-${id}`, `glb missing ${role.glb}`);
            continue;
        }
        const body = bodies[role.bodyId];
        if (!body?.glb) {
            fail(`M-role-${id}`, `bodyId ${role.bodyId} unresolved`);
            continue;
        }
        if (fs.existsSync(path.join(IMPORT, body.glb))) {
            pass(`M-role-${id}`, `${role.bodyId} → ${body.glb}`);
        } else {
            fail(`M-role-${id}`, `body glb missing ${body.glb}`);
        }
    }
}

function auditTextures() {
    for (const slug of SKIN_TONES) {
        const albedo = texExists(slug, 'albedo');
        const rough = texExists(slug, 'roughness');
        if (albedo && rough) pass(`T-${slug}`, `${albedo} + ${rough}`);
        else fail(`T-${slug}`, `missing ${!albedo ? 'albedo' : ''} ${!rough ? 'roughness' : ''}`.trim());
    }
    const fabricA = texExists('starter_fabric', 'albedo');
    const fabricR = texExists('starter_fabric', 'roughness');
    if (fabricA && fabricR) pass('T-fabric', `${fabricA} + ${fabricR}`);
    else fail('T-fabric', 'starter_fabric albedo/roughness missing');

    const hair = texExists('hair_alpha', 'albedo');
    if (hair) pass('T-hair', hair);
    else fail('T-hair', 'hair_alpha albedo missing');
}

function auditRuntime() {
    const human = fs.readFileSync(path.join(ROOT, 'src/engine/humanMesh.js'), 'utf8');
    const player = fs.readFileSync(path.join(ROOT, 'src/engine/player.js'), 'utf8');
    const pose = fs.readFileSync(path.join(ROOT, 'src/shared/avatarPoseSync.js'), 'utf8');
    const lod = fs.readFileSync(path.join(ROOT, 'src/shared/avatarLod.js'), 'utf8');
    const core = fs.readFileSync(path.join(ROOT, 'src/engine/engineCore.js'), 'utf8');

    const checks = [
        ['R-loco', human.includes('pickLocoName') && human.includes('locoActions') && /['"]idle['"]/.test(human),
            'HumanMesh idle/walk/run picker'],
        ['R-rebind', human.includes('rebindWalk'), 'HumanMesh.rebindWalk'],
        ['R-player-dt', player.includes('postPhysics(dt') && player.includes('intentSpeed'),
            'player real dt + intent speed'],
        ['R-core-dt', /prePhysics\s*\(\s*dt/.test(core) && /postPhysics\s*\(\s*dt/.test(core),
            'engineCore passes dt'],
        ['R-pose', pose.includes('pickLocoName') && /['"]idle['"]/.test(pose),
            'AvatarPoseSync idle/walk/run'],
        ['R-lod-rebind', lod.includes('rebindWalk'), 'AvatarLod rebind after swap'],
    ];
    for (const [id, ok, notes] of checks) {
        if (ok) pass(id, notes);
        else fail(id, notes);
    }
}

async function main() {
    console.log('avatar-audit (Track C gate)\n');

    if (!fs.existsSync(MANIFEST)) {
        fail('M-file', 'config/avatar-manifest.json missing');
    } else {
        let manifest;
        try {
            manifest = readJson(MANIFEST);
            auditManifest(manifest);
            auditRoles(manifest);

            const glbs = collectGlbs(manifest);
            console.log(`\n  Bodies / LODs / NPCs (${glbs.length})`);
            for (const rel of glbs) await auditGlb(rel, { requireClips: true });

            const hair = collectHair(manifest);
            console.log(`\n  Hair (${hair.length})`);
            for (const h of hair) {
                const abs = path.join(IMPORT, h.glb);
                if (!fs.existsSync(abs)) fail(`H-${h.id}`, `missing ${h.glb}`);
                else if (!fs.existsSync(path.join(BUNDLE, h.glb))) fail(`H-${h.id}-bundle`, `bundle missing ${h.glb}`);
                else pass(`H-${h.id}`, h.glb);
            }
        } catch (e) {
            fail('M-parse', String(e.message || e));
        }
    }

    console.log('\n  Textures');
    auditTextures();

    console.log('\n  Runtime');
    auditRuntime();

    const failed = results.filter((r) => !r.ok);
    const warned = results.filter((r) => r.warn);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const report = {
        at: new Date().toISOString(),
        pass: results.filter((r) => r.ok).length,
        fail: failed.length,
        warn: warned.length,
        total: results.length,
        failedIds: failed.map((f) => f.id),
        results,
    };
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(`\n  Score ${report.pass}/${report.total}  fail=${report.fail}  warn=${report.warn}`);
    console.log(`  → ${path.relative(ROOT, OUT)}`);
    if (failed.length) {
        console.error('avatar-audit — FAIL', report.failedIds.join(', '));
        process.exit(1);
    }
    console.log('avatar-audit — PASS');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
