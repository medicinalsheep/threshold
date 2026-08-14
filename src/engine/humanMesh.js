import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function limbGroup(mesh, pivotY, offsetX = 0) {
    const g = new THREE.Group();
    g.position.set(offsetX, pivotY, 0);
    g.add(mesh);
    return g;
}

const GLTF_PART_NAMES = ['legL', 'legR', 'armL', 'armR', 'torso', 'head', 'hips', 'shoulders', 'neck', 'collar', 'hairCap'];
/** Higher segments = smoother silhouette (realism pass) */
const SEG = 18;
const SEG_LO = 12;
/** m/s — below this we idle (was 0.25; felt frozen near stop) */
const MOVE_EPS = 0.15;
const DT_MIN = 1 / 240;
const DT_MAX = 0.08;

function clampDt(dt) {
    const n = Number(dt);
    if (!Number.isFinite(n) || n <= 0) return 1 / 60;
    return Math.min(DT_MAX, Math.max(DT_MIN, n));
}

function collectNamedParts(object) {
    const parts = {};
    if (!object) return parts;
    object.traverse((c) => {
        if (GLTF_PART_NAMES.includes(c.name) && parts[c.name] == null) parts[c.name] = c;
    });
    return parts;
}

function capturePartBases(parts) {
    if (!parts) return null;
    const base = {};
    for (const [k, obj] of Object.entries(parts)) {
        if (!obj?.position) continue;
        base[`${k}Y`] = obj.position.y;
        base[`${k}Rx`] = obj.rotation?.x ?? 0;
        base[`${k}Rz`] = obj.rotation?.z ?? 0;
    }
    // Legacy keys used by updateWalk / updateIdle
    if (parts.torso) base.torsoY = parts.torso.position.y;
    if (parts.shoulders) base.shouldersY = parts.shoulders.position.y;
    if (parts.collar) base.collarY = parts.collar.position.y;
    if (parts.neck) base.neckY = parts.neck.position.y;
    if (parts.head) base.headY = parts.head.position.y;
    if (parts.hairCap) base.hairY = parts.hairCap.position.y;
    if (parts.hips) base.hipsY = parts.hips.position.y;
    return base;
}

function avatarRootFromModel(model) {
    let skinnedRoot = null;
    model.traverse((c) => {
        if (c.isSkinnedMesh && c.skeleton?.bones?.length && !skinnedRoot) {
            skinnedRoot = c;
        }
    });
    if (skinnedRoot) return skinnedRoot;
    return model.getObjectByName('StarterAvatar')
        || model.getObjectByName('StarterAvatarFemale')
        || model.getObjectByName('StarterGuard')
        || model.getObjectByName('StarterMech')
        || model.children[0]
        || model;
}

/** Prefer root that owns named limb tracks (node anims on starter GLBs). */
function pickMixerRoots(model) {
    const roots = [];
    if (!model) return roots;
    // Scene-level first — glTF node tracks resolve relative to loaded scene
    roots.push(model);
    const named = model.getObjectByName('StarterAvatar')
        || model.getObjectByName('StarterAvatarFemale')
        || model.getObjectByName('StarterGuard')
        || model.getObjectByName('StarterMech');
    if (named && named !== model) roots.push(named);
    let skinned = null;
    model.traverse((c) => {
        if (c.isSkinnedMesh && c.skeleton?.bones?.length && !skinned) skinned = c;
    });
    if (skinned) roots.unshift(skinned); // real rigs: skinned first
    // de-dupe
    return [...new Set(roots)];
}

const WALK_CLIP_NAMES = ['walk', 'Walk', 'locomotion', 'Locomotion'];
const IDLE_CLIP_NAMES = ['idle', 'Idle', 'stand', 'Stand', 'rest'];
const RUN_CLIP_NAMES = ['run', 'Run', 'sprint', 'Sprint'];

function pickNamedClip(animations = [], names = []) {
    if (!animations?.length) return null;
    const named = animations.find((c) => names.some((n) => c.name?.includes(n)));
    return named || null;
}

function pickWalkClip(animations = []) {
    return pickNamedClip(animations, WALK_CLIP_NAMES) || animations[0] || null;
}

function pickIdleClip(animations = []) {
    return pickNamedClip(animations, IDLE_CLIP_NAMES);
}

function pickRunClip(animations = []) {
    return pickNamedClip(animations, RUN_CLIP_NAMES);
}

function makeAction(mixer, clip, { loop = true, weight = 0 } = {}) {
    if (!mixer || !clip) return null;
    const action = mixer.clipAction(clip);
    action.enabled = true;
    action.setEffectiveWeight(weight);
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.play();
    action.paused = weight <= 0;
    return action;
}

/**
 * Three returns the SAME action for the same clip — never map idle/walk/run
 * to one clip via three keys or setLoco will zero the weight on the last pass.
 */
function buildLocoActions(mixer, idleClip, walkClip, runClip) {
    if (!mixer || !walkClip) return null;
    const walk = makeAction(mixer, walkClip, { weight: 1 });
    const idle = idleClip && idleClip !== walkClip
        ? makeAction(mixer, idleClip, { weight: 0 })
        : null;
    const run = runClip && runClip !== walkClip
        ? makeAction(mixer, runClip, { weight: 0 })
        : null;
    return {
        idle,
        walk,
        run,
        /** only one real clip — pause for idle, speed up for run */
        singleClip: !idle && !run,
    };
}

/**
 * Try AnimationMixer roots until a probe clip moves legL.
 * Binds idle + walk + run on the same mixer when present.
 * @returns {{ mixer, action, root, ok: boolean, actions: object }}
 */
function bindWalkMixer(model, animationsOrWalk) {
    const anims = Array.isArray(animationsOrWalk)
        ? animationsOrWalk
        : (animationsOrWalk ? [animationsOrWalk] : []);
    const walkClip = pickWalkClip(anims);
    const idleClip = pickIdleClip(anims);
    const runClip = pickRunClip(anims);
    if (!model || !walkClip) {
        return { mixer: null, action: null, root: null, ok: false, actions: null };
    }
    const leg = model.getObjectByName('legL');
    for (const root of pickMixerRoots(model)) {
        try {
            const mixer = new THREE.AnimationMixer(root);
            const probe = makeAction(mixer, walkClip, { weight: 1 });
            probe.paused = false;
            probe.timeScale = 1;
            if (leg) {
                const q0 = leg.quaternion.clone();
                mixer.update(0.12);
                const ok = !q0.equals(leg.quaternion);
                if (!ok) {
                    mixer.stopAllAction();
                    continue;
                }
            }
            // Rebuild clean action set after probe (distinct clips only)
            mixer.stopAllAction();
            const actions = buildLocoActions(mixer, idleClip, walkClip, runClip);
            setLocoAction(actions, idleClip ? 'idle' : 'idle', { timeScale: 1 });
            return {
                mixer,
                action: actions.walk || actions.idle,
                root,
                ok: true,
                actions,
                clips: {
                    idle: idleClip?.name || null,
                    walk: walkClip?.name || null,
                    run: runClip?.name || null,
                },
            };
        } catch {
            /* try next root */
        }
    }
    return { mixer: null, action: null, root: null, ok: false, actions: null };
}

/** Weight-based locomotion switch (idle / walk / run). */
function setLocoAction(actions, name, { timeScale = 1 } = {}) {
    if (!actions) return;

    // Single walk clip: pause when idle, play walk/run with timescale
    if (actions.singleClip || (!actions.idle && !actions.run)) {
        const a = actions.walk;
        if (!a) return;
        a.enabled = true;
        a.setEffectiveWeight(1);
        a.play();
        if (name === 'idle') {
            a.paused = true;
            a.timeScale = 0;
        } else {
            a.paused = false;
            a.timeScale = name === 'run' ? Math.max(timeScale, 1.35) : timeScale;
        }
        return;
    }

    for (const key of ['idle', 'walk', 'run']) {
        const action = actions[key];
        if (!action) continue;
        const on = key === name || (name === 'run' && key === 'walk' && !actions.run)
            || (name === 'idle' && key === 'walk' && !actions.idle);
        // Prefer exact key only when present
        const exact = key === name;
        action.enabled = true;
        if (exact) {
            action.setEffectiveWeight(1);
            action.paused = false;
            action.timeScale = timeScale;
            action.play();
        } else {
            action.setEffectiveWeight(0);
            action.paused = true;
            action.timeScale = 0;
        }
    }
}

function pickLocoName(speed, sprinting) {
    if (speed <= MOVE_EPS) return 'idle';
    if (sprinting || speed > 5.2) return 'run';
    return 'walk';
}

function ensureWalkParts(group, model = null) {
    const src = model
        || group?.userData?._lodScenes?.[group.userData.lodActive || 0]
        || group?.userData?._lodScenes?.[0]
        || group;
    const parts = collectNamedParts(src);
    if (parts.legL && parts.legR) {
        if (!parts._base) parts._base = capturePartBases(parts);
        group.userData.humanParts = parts;
        return parts;
    }
    return group.userData.humanParts || null;
}

/**
 * Wire walk on a player/NPC group after GLB load (or re-bind after LOD).
 */
function setupWalkRig(group, model, animations = []) {
    if (!group) return;
    const anims = animations?.length
        ? animations
        : (model?.userData?._gltfAnimations || group.userData?._lod0Animations || []);
    const parts = ensureWalkParts(group, model);
    const walkClip = pickWalkClip(anims);
    group.userData.walkClipName = walkClip?.name || null;

    if (walkClip) {
        const bound = bindWalkMixer(model || group, anims);
        if (bound.ok) {
            group.userData.mixer = bound.mixer;
            group.userData.mixerClip = bound.action;
            group.userData.locoActions = bound.actions;
            group.userData.locoClips = bound.clips;
            group.userData.locoActive = bound.actions?.idle ? 'idle' : 'walk';
            group.userData.walkMode = 'mixer';
            group.userData.mixerRoot = bound.root;
            if (parts) group.userData.humanParts = parts;
            return 'mixer';
        }
    }

    group.userData.mixer = null;
    group.userData.mixerClip = null;
    group.userData.locoActions = null;
    group.userData.walkMode = parts?.legL ? 'procedural' : 'none';
    if (parts) {
        group.userData.humanParts = parts;
        group.userData.walkPhase = 0;
        group.userData.idlePhase = Math.random() * Math.PI * 2;
    }
    return group.userData.walkMode;
}

function applyRestPose(parts, dt = 0.016) {
    if (!parts) return;
    const b = parts._base || {};
    const k = Math.min(1, dt * 10);
    const restArm = 0.08;
    const restLeg = 0.03;
    if (parts.legL) parts.legL.rotation.x = THREE.MathUtils.lerp(parts.legL.rotation.x, restLeg, k);
    if (parts.legR) parts.legR.rotation.x = THREE.MathUtils.lerp(parts.legR.rotation.x, -restLeg * 0.5, k);
    if (parts.armL) {
        parts.armL.rotation.x = THREE.MathUtils.lerp(parts.armL.rotation.x, restArm, k);
        if (parts.armL.rotation.z != null) {
            parts.armL.rotation.z = THREE.MathUtils.lerp(parts.armL.rotation.z, 0.08, k);
        }
    }
    if (parts.armR) {
        parts.armR.rotation.x = THREE.MathUtils.lerp(parts.armR.rotation.x, restArm, k);
        if (parts.armR.rotation.z != null) {
            parts.armR.rotation.z = THREE.MathUtils.lerp(parts.armR.rotation.z, -0.08, k);
        }
    }
    if (parts.torso) {
        parts.torso.rotation.x = THREE.MathUtils.lerp(parts.torso.rotation.x, 0, k);
        parts.torso.rotation.y = THREE.MathUtils.lerp(parts.torso.rotation.y, 0, k);
        if (b.torsoY != null) parts.torso.position.y = THREE.MathUtils.lerp(parts.torso.position.y, b.torsoY, k);
    }
    if (parts.hips && b.hipsY != null) {
        parts.hips.position.y = THREE.MathUtils.lerp(parts.hips.position.y, b.hipsY, k);
    }
}

/**
 * Anthropometric base proportions (meters) for procedural fallback.
 * Male ~1.75 m · Female ~1.65 m; shoulder:hip ratio ~1.25 m / ~0.92 f.
 */
function resolveForm(options = {}) {
    const female = options.bodyId === 'female_default' || options.form === 'female';
    let base;
    if (female) {
        base = {
            form: 'female',
            // Biacromial narrower, biiliac wider (realistic female frame)
            shoulderW: 0.38,
            chestW: 0.36,
            chestD: 0.22,
            waistW: 0.28,
            hipW: 0.42,
            hipD: 0.28,
            hipH: 0.22,
            torsoH: 0.50,
            neckR: 0.055,
            neckH: 0.11,
            headR: 0.105,
            headScale: [0.92, 1.08, 0.9],
            thighTop: 0.095,
            thighBot: 0.078,
            calfTop: 0.068,
            calfBot: 0.052,
            armTop: 0.048,
            armBot: 0.038,
            legLen: 0.84,
            armLen: 0.54,
            shoulderY: 1.38,
            hipY: 0.86,
            shoe: [0.16, 0.06, 0.24],
            bust: 0.055,
            hipOut: 0.105,
            armOut: 0.22,
            // Soft rest pose — slight knee flex / arm hang
            armHang: 0.12,
            legStance: 0.02,
            torsoScale: options.torsoScale || [1, 1, 1],
            hipScale: options.hipScale || [1.04, 1, 1.02],
        };
    } else {
        base = {
            form: 'male',
            // Broader shoulders, narrower hips (realistic male frame)
            shoulderW: 0.48,
            chestW: 0.42,
            chestD: 0.26,
            waistW: 0.34,
            hipW: 0.38,
            hipD: 0.26,
            hipH: 0.22,
            torsoH: 0.54,
            neckR: 0.065,
            neckH: 0.12,
            headR: 0.11,
            headScale: [0.94, 1.06, 0.92],
            thighTop: 0.1,
            thighBot: 0.082,
            calfTop: 0.072,
            calfBot: 0.055,
            armTop: 0.058,
            armBot: 0.044,
            legLen: 0.88,
            armLen: 0.58,
            shoulderY: 1.44,
            hipY: 0.88,
            shoe: [0.18, 0.065, 0.28],
            bust: 0,
            hipOut: 0.095,
            armOut: 0.28,
            armHang: 0.1,
            legStance: 0.015,
            torsoScale: options.torsoScale || [1, 1, 1],
            hipScale: options.hipScale || [1, 1, 1],
        };
    }

    // Continuous shape factors from AppearanceProfile.profileToMeshOpts
    const sf = options._shapeFactors;
    if (!sf) return base;

    const sh = sf.shoulders || 1;
    const ch = sf.chest || 1;
    const wa = sf.waist || 1;
    const hi = sf.hips || 1;
    const mu = sf.muscle || 1;
    const wt = sf.weight || 1;
    // Soft coupling: weight fattens trunk more than extremities; muscle thickens limbs
    const trunk = 0.55 + wt * 0.45;
    const limbMu = 0.65 + mu * 0.35;
    const limbWt = 0.85 + wt * 0.15;

    return {
        ...base,
        shoulderW: base.shoulderW * sh * (0.92 + wt * 0.08),
        chestW: base.chestW * ch * trunk,
        chestD: base.chestD * (0.88 + ch * 0.12) * trunk,
        waistW: base.waistW * wa * trunk,
        hipW: base.hipW * hi * trunk,
        hipD: base.hipD * (0.9 + hi * 0.1) * trunk,
        thighTop: base.thighTop * limbMu * limbWt,
        thighBot: base.thighBot * limbMu,
        calfTop: base.calfTop * (0.9 + mu * 0.1) * limbWt,
        calfBot: base.calfBot * (0.92 + mu * 0.08),
        armTop: base.armTop * limbMu,
        armBot: base.armBot * limbMu,
        armOut: base.armOut * (0.9 + sh * 0.1),
        hipOut: base.hipOut * (0.9 + hi * 0.1),
        neckR: base.neckR * (0.94 + mu * 0.04 + wt * 0.02),
        bust: base.bust * (0.55 + ch * 0.9) * (0.9 + wt * 0.1),
        torsoScale: options.torsoScale || base.torsoScale,
        hipScale: options.hipScale || base.hipScale,
    };
}

function capturePartScale(obj) {
    if (!obj) return null;
    return { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z };
}

function setPartScale(obj, base, mx, my = 1, mz = null) {
    if (!obj || !base) return;
    const z = mz == null ? mx : mz;
    obj.scale.set(base.x * mx, base.y * my, base.z * z);
}

/** Drive morph targets if named like shoulders / chest / hips / waist / muscle / weight */
function applyMorphShape(root, shape) {
    if (!root || !shape) return false;
    let any = false;
    const targets = {
        shoulders: shape.shoulders,
        chest: shape.chest,
        waist: shape.waist,
        hips: shape.hips,
        muscle: shape.muscle,
        weight: shape.weight,
        height: shape.heightM != null ? 0.5 : 0.5,
    };
    root.traverse((c) => {
        if (!c.isMesh || !c.morphTargetDictionary || !c.morphTargetInfluences) return;
        const dict = c.morphTargetDictionary;
        Object.keys(targets).forEach((key) => {
            const idx = dict[key] ?? dict[key.charAt(0).toUpperCase() + key.slice(1)];
            if (idx == null) return;
            // morph 0–1: map slider so 0.5 → 0 influence (neutral)
            const v = targets[key];
            const influence = Math.abs(v - 0.5) * 2;
            c.morphTargetInfluences[idx] = Math.min(1, Math.max(0, influence));
            any = true;
        });
    });
    return any;
}

export const HumanMesh = {
    build(options = {}) {
        const skin = options.skinColor ?? 0xffcc99;
        const shirt = options.bodyColor ?? 0x3366cc;
        const pants = options.pantsColor ?? 0x1a2844;
        const hair = options.hairColor ?? 0x2a1810;
        const rough = options.roughness ?? 0.72;
        const f = resolveForm(options);
        const ts = f.torsoScale;
        const hs = f.hipScale;
        const neckH = f.neckH || 0.12;

        // PBR-friendly skin: slight SSS-like soft specular (low metal, mid roughness)
        const matSkin = new THREE.MeshStandardMaterial({
            color: skin,
            roughness: Math.min(0.92, rough + 0.08),
            metalness: 0.02,
            envMapIntensity: 0.35,
        });
        const matShirt = new THREE.MeshStandardMaterial({
            color: shirt,
            roughness: Math.min(0.95, rough * 0.95 + 0.05),
            metalness: 0.04,
            envMapIntensity: 0.4,
        });
        const matPants = new THREE.MeshStandardMaterial({
            color: pants,
            roughness: 0.9,
            metalness: 0.02,
            envMapIntensity: 0.3,
        });
        const matHair = new THREE.MeshStandardMaterial({
            color: hair,
            roughness: 0.94,
            metalness: 0.02,
            envMapIntensity: 0.25,
        });
        const matShoe = new THREE.MeshStandardMaterial({
            color: 0x1a1a1c,
            roughness: 0.72,
            metalness: 0.08,
        });
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1c,
            roughness: 0.25,
            metalness: 0.15,
        });
        const scleraMat = new THREE.MeshStandardMaterial({
            color: 0xf2f0ea,
            roughness: 0.45,
            metalness: 0.02,
        });

        const group = new THREE.Group();
        group.name = 'human_avatar';
        group.userData.bodyForm = f.form;
        group.userData.realismPass = '10.21';

        // Pelvis — rounded, not a flat box
        const hips = new THREE.Group();
        hips.name = 'hips';
        hips.position.y = f.hipY;
        hips.scale.set(hs[0], hs[1], hs[2]);
        const pelvis = new THREE.Mesh(
            new THREE.SphereGeometry(f.hipW * 0.48, SEG, SEG_LO),
            matPants
        );
        pelvis.scale.set(1, (f.hipH * 1.15) / (f.hipW * 0.48), f.hipD / f.hipW);
        pelvis.castShadow = true;
        pelvis.receiveShadow = true;
        hips.add(pelvis);

        // Torso — three taper rings (pelvis→waist→ribcage) for natural silhouette
        const torso = new THREE.Group();
        torso.name = 'torso';
        torso.position.y = f.hipY + f.hipH * 0.35 + f.torsoH * 0.48;
        torso.scale.set(ts[0], ts[1], ts[2]);

        const lower = new THREE.Mesh(
            new THREE.CylinderGeometry(f.waistW * 0.5, f.hipW * 0.42, f.torsoH * 0.32, SEG),
            matShirt
        );
        lower.position.y = -f.torsoH * 0.32;
        lower.castShadow = true;

        const mid = new THREE.Mesh(
            new THREE.CylinderGeometry(f.waistW * 0.52, f.waistW * 0.5, f.torsoH * 0.22, SEG),
            matShirt
        );
        mid.position.y = -f.torsoH * 0.08;
        mid.castShadow = true;

        const chest = new THREE.Mesh(
            new THREE.CylinderGeometry(f.chestW * 0.48, f.waistW * 0.52, f.torsoH * 0.48, SEG),
            matShirt
        );
        chest.position.y = f.torsoH * 0.18;
        chest.scale.z = Math.max(0.75, f.chestD / Math.max(0.12, f.chestW * 0.55));
        chest.castShadow = true;
        torso.add(lower, mid, chest);

        if (f.bust > 0.01) {
            const bustL = new THREE.Mesh(new THREE.SphereGeometry(f.bust, SEG_LO, 10), matShirt);
            bustL.position.set(-f.chestW * 0.16, f.torsoH * 0.14, f.chestD * 0.42);
            bustL.scale.set(1.05, 0.9, 0.82);
            bustL.castShadow = true;
            const bustR = bustL.clone();
            bustR.position.x = -bustL.position.x;
            torso.add(bustL, bustR);
        }

        // Shoulders — deltoid spheres + soft bar (not a hard box)
        const shoulders = new THREE.Group();
        shoulders.name = 'shoulders';
        shoulders.position.y = f.shoulderY;
        const shoulderBar = new THREE.Mesh(
            new THREE.CapsuleGeometry(
                Math.min(0.055, f.chestD * 0.22),
                Math.max(0.08, f.shoulderW - 0.12),
                6,
                SEG_LO
            ),
            matShirt
        );
        shoulderBar.rotation.z = Math.PI / 2;
        shoulderBar.castShadow = true;
        const deltoidR = 0.055 + f.armTop * 0.35;
        const delL = new THREE.Mesh(new THREE.SphereGeometry(deltoidR, SEG_LO, 10), matShirt);
        delL.position.set(-f.shoulderW * 0.42, -0.01, 0);
        delL.scale.set(1.05, 0.85, 0.95);
        delL.castShadow = true;
        const delR = delL.clone();
        delR.position.x = -delL.position.x;
        shoulders.add(shoulderBar, delL, delR);

        const collar = new THREE.Mesh(
            new THREE.CylinderGeometry(f.chestW * 0.28, f.chestW * 0.34, 0.05, SEG),
            matShirt
        );
        collar.position.set(0, f.shoulderY + 0.05, 0.01);
        collar.name = 'collar';
        collar.castShadow = true;

        // Neck — capsule taper into head
        const neck = new THREE.Mesh(
            new THREE.CylinderGeometry(f.neckR * 0.88, f.neckR * 1.05, neckH, SEG),
            matSkin
        );
        neck.position.y = f.shoulderY + 0.04 + neckH * 0.5;
        neck.name = 'neck';
        neck.castShadow = true;

        // Head — slightly egg-shaped (realistic cranial ratio)
        const head = new THREE.Mesh(new THREE.SphereGeometry(f.headR, 28, 22), matSkin);
        head.position.y = f.shoulderY + 0.04 + neckH + f.headR * 0.85;
        head.scale.set(f.headScale[0], f.headScale[1], f.headScale[2]);
        head.name = 'head';
        head.castShadow = true;

        const hairCap = new THREE.Mesh(
            new THREE.SphereGeometry(f.headR * 1.06, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
            matHair
        );
        hairCap.position.y = head.position.y + f.headR * f.headScale[1] * 0.08;
        hairCap.scale.copy(head.scale);
        hairCap.name = 'hairCap';
        hairCap.castShadow = true;

        // Eyes: sclera + iris (reads as human, not black dots)
        const eyeY = head.position.y + f.headR * 0.06;
        const eyeZ = f.headR * f.headScale[2] * 0.78;
        const eyeX = f.headR * 0.32;
        const scleraL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), scleraMat);
        scleraL.position.set(-eyeX, eyeY, eyeZ);
        scleraL.scale.set(1.15, 0.85, 0.7);
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), eyeMat);
        eyeL.position.set(-eyeX, eyeY, eyeZ + 0.008);
        const scleraR = scleraL.clone();
        scleraR.position.x = eyeX;
        const eyeR = eyeL.clone();
        eyeR.position.x = eyeX;

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), matSkin);
        nose.position.set(0, head.position.y - f.headR * 0.05, f.headR * f.headScale[2] * 0.88);
        nose.scale.set(0.65, 0.95, 1.15);

        // Legs — tapered thigh/calf + subtle natural stance
        const buildLeg = (sign) => {
            const legMesh = new THREE.Group();
            const thigh = new THREE.Mesh(
                new THREE.CylinderGeometry(f.thighBot, f.thighTop, f.legLen * 0.46, SEG),
                matPants
            );
            thigh.position.y = -f.legLen * 0.23;
            thigh.castShadow = true;
            const knee = new THREE.Mesh(new THREE.SphereGeometry(f.thighBot * 0.95, SEG_LO, 8), matPants);
            knee.position.y = -f.legLen * 0.46;
            knee.scale.set(1.05, 0.7, 1.05);
            const calf = new THREE.Mesh(
                new THREE.CylinderGeometry(f.calfBot, f.calfTop, f.legLen * 0.4, SEG),
                matPants
            );
            calf.position.y = -f.legLen * 0.66;
            calf.castShadow = true;
            const shoe = new THREE.Mesh(
                new THREE.BoxGeometry(f.shoe[0], f.shoe[1], f.shoe[2]),
                matShoe
            );
            shoe.position.set(0, -f.legLen * 0.9, f.shoe[2] * 0.1);
            // Soft toe bevel via front sphere
            const toe = new THREE.Mesh(
                new THREE.SphereGeometry(f.shoe[1] * 0.55, 8, 6),
                matShoe
            );
            toe.position.set(0, -f.legLen * 0.9, f.shoe[2] * 0.38);
            toe.scale.set(f.shoe[0] * 2.2, 1, 1.4);
            legMesh.add(thigh, knee, calf, shoe, toe);
            legMesh.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            const g = limbGroup(legMesh, f.hipY - f.hipH * 0.15, sign * f.hipOut);
            g.rotation.x = f.legStance || 0;
            return g;
        };

        const legL = buildLeg(-1);
        legL.name = 'legL';
        const legR = buildLeg(1);
        legR.name = 'legR';

        // Arms — deltoid root, natural hang, tapered forearm, soft hand
        const buildArm = (sign) => {
            const armMesh = new THREE.Group();
            const upper = new THREE.Mesh(
                new THREE.CylinderGeometry(f.armBot * 1.08, f.armTop, f.armLen * 0.48, SEG),
                matSkin
            );
            upper.position.y = -f.armLen * 0.24;
            upper.castShadow = true;
            const elbow = new THREE.Mesh(new THREE.SphereGeometry(f.armBot * 1.05, 10, 8), matSkin);
            elbow.position.y = -f.armLen * 0.48;
            const lower = new THREE.Mesh(
                new THREE.CylinderGeometry(f.armBot * 0.85, f.armBot * 1.05, f.armLen * 0.4, SEG),
                matSkin
            );
            lower.position.y = -f.armLen * 0.68;
            lower.castShadow = true;
            const hand = new THREE.Mesh(
                new THREE.SphereGeometry(0.038, 10, 8),
                matSkin
            );
            hand.position.y = -f.armLen * 0.92;
            hand.scale.set(0.85, 1.15, 0.55);
            armMesh.add(upper, elbow, lower, hand);
            armMesh.traverse((c) => { if (c.isMesh) c.castShadow = true; });
            const g = limbGroup(armMesh, f.shoulderY - 0.03, sign * f.armOut);
            g.rotation.z = sign * (f.armHang || 0.1);
            g.rotation.x = 0.06;
            return g;
        };

        const armL = buildArm(-1);
        armL.name = 'armL';
        const armR = buildArm(1);
        armR.name = 'armR';

        group.add(
            hips, torso, shoulders, collar, neck, head, hairCap,
            scleraL, eyeL, scleraR, eyeR, nose,
            legL, legR, armL, armR
        );
        group.userData.humanParts = {
            hips,
            torso,
            shoulders,
            collar,
            neck,
            head,
            hairCap,
            legL,
            legR,
            armL,
            armR,
            // base Y for animation bob
            _base: {
                torsoY: torso.position.y,
                shouldersY: shoulders.position.y,
                collarY: collar.position.y,
                neckY: neck.position.y,
                headY: head.position.y,
                hairY: hairCap.position.y,
                hipsY: hips.position.y,
            },
        };
        group.userData.walkPhase = 0;
        group.userData.idlePhase = Math.random() * Math.PI * 2;
        group.userData.walkMode = 'procedural';
        group.userData.isGltf = false;

        return group;
    },

    updateIdle(group, time, dt = 0.016) {
        if (!group) return;
        dt = clampDt(dt);
        // Prefer named parts for idle (mixer paused mid-stride looks frozen)
        const parts = group.userData?.humanParts || ensureWalkParts(group);
        if (!parts) return;
        const b = parts._base || capturePartBases(parts) || {};
        parts._base = b;

        group.userData.idlePhase = (group.userData.idlePhase || 0) + dt;
        const t = group.userData.idlePhase;
        const breathe = Math.sin(t * 1.8) * 0.016;
        const sway = Math.sin(t * 0.7) * 0.028;
        const look = Math.sin(t * 0.35 + (group.userData.idleSeed || 0)) * 0.14;

        applyRestPose(parts, dt);

        if (parts.torso) {
            parts.torso.position.y = (b.torsoY ?? parts.torso.position.y) + breathe;
            parts.torso.rotation.y = THREE.MathUtils.lerp(parts.torso.rotation.y, sway * 0.35, 0.08);
        }
        if (parts.shoulders) parts.shoulders.position.y = (b.shouldersY ?? parts.shoulders.position.y) + breathe;
        if (parts.collar) parts.collar.position.y = (b.collarY ?? parts.collar.position.y) + breathe;
        if (parts.neck) parts.neck.position.y = (b.neckY ?? parts.neck.position.y) + breathe;
        if (parts.head) {
            parts.head.position.y = (b.headY ?? parts.head.position.y) + breathe * 1.15;
            parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, look, 0.06);
        }
        if (parts.hairCap) parts.hairCap.position.y = (b.hairY ?? parts.hairCap.position.y) + breathe * 1.15;
        if (parts.armL) parts.armL.rotation.x = THREE.MathUtils.lerp(parts.armL.rotation.x, 0.08 + Math.sin(t * 1.1) * 0.05, 0.1);
        if (parts.armR) parts.armR.rotation.x = THREE.MathUtils.lerp(parts.armR.rotation.x, 0.08 - Math.sin(t * 1.1 + 0.5) * 0.05, 0.1);
        if (parts.hips) parts.hips.position.y = (b.hipsY ?? parts.hips.position.y) + Math.sin(t * 1.8) * 0.006;
    },

    setFirstPersonVisible(group, visible) {
        if (!group) return;
        const show = visible;
        const parts = group.userData?.humanParts;
        if (parts) {
            if (parts.head) parts.head.visible = show;
            if (parts.hairCap) parts.hairCap.visible = show && !group.userData?._hairNode;
            if (parts.neck) parts.neck.visible = show;
            if (parts.collar) parts.collar.visible = show;
        }
        if (group.userData?.isGltf) {
            group.traverse((c) => {
                if (c.name === 'head' || c.name === 'hairCap' || c.name === 'neck') {
                    c.visible = show;
                }
            });
        }
        window.HairSlot?.setFirstPersonVisible?.(group, show);
        window.AvatarMod?.setFirstPersonVisible?.(group, show);
    },

    updateWalk(group, horizontalSpeed, dt = 0.016, sprinting = false) {
        if (!group) return;
        dt = clampDt(dt);
        const speed = Number(horizontalSpeed) || 0;
        const moving = speed > MOVE_EPS;
        const mode = group.userData.walkMode;

        // Multi-LOD pose sync when mixers are healthy (handles idle/walk/run clips)
        if (group.userData?.avatarLod && mode !== 'procedural' && window.AvatarPoseSync?.updateAvatarLodPose) {
            if (window.AvatarPoseSync.updateAvatarLodPose(group, speed, dt, sprinting)) {
                // Procedural idle only if LOD set has no idle clip
                if (!moving && !group.userData.locoClips?.idle) {
                    const parts = group.userData?.humanParts || ensureWalkParts(group);
                    if (parts) this.updateIdle(group, 0, dt);
                }
                return;
            }
        }

        if (group.userData.mixer && mode !== 'procedural') {
            const actions = group.userData.locoActions;
            const want = pickLocoName(speed, sprinting);
            if (actions) {
                if (group.userData.locoActive !== want) {
                    group.userData.locoActive = want;
                    const ts = want === 'run'
                        ? 1
                        : want === 'walk'
                            ? Math.max(0.55, Math.min(speed / 3.2, 2.0))
                            : 1;
                    setLocoAction(actions, want, { timeScale: ts });
                } else if (want === 'walk' && actions.walk) {
                    actions.walk.timeScale = Math.max(0.55, Math.min(speed / 3.2, 2.0));
                } else if (want === 'run' && actions.run) {
                    actions.run.timeScale = sprinting ? 1.15 : 1;
                }
                group.userData.mixer.update(dt);
                // Soft procedural idle only if we lack an idle clip
                if (want === 'idle' && !group.userData.locoClips?.idle) {
                    const parts = group.userData?.humanParts || ensureWalkParts(group);
                    if (parts) this.updateIdle(group, 0, dt);
                }
            } else {
                const clip = group.userData.mixerClip;
                if (clip) {
                    if (moving) {
                        clip.paused = false;
                        clip.enabled = true;
                        clip.timeScale = sprinting ? 1.9 : Math.max(0.55, Math.min(speed / 3.2, 2.2));
                        group.userData.mixer.update(dt);
                    } else {
                        clip.paused = true;
                        clip.timeScale = 0;
                        const parts = group.userData?.humanParts || ensureWalkParts(group);
                        if (parts) this.updateIdle(group, 0, dt);
                    }
                } else {
                    group.userData.mixer.update(dt);
                }
            }
            return;
        }

        const parts = group.userData?.humanParts || ensureWalkParts(group);
        if (!parts?.legL) return;
        if (!parts._base) parts._base = capturePartBases(parts);
        const b = parts._base || {};

        group.userData.idlePhase = (group.userData.idlePhase || 0) + dt;

        if (!moving) {
            this.updateIdle(group, 0, dt);
            group.userData.walkPhase = 0;
            return;
        }

        const pace = sprinting ? 13.5 : 10;
        const amp = sprinting ? 0.78 : 0.62;
        const speedFactor = Math.min(speed / 3.2, 1.9);
        group.userData.walkPhase = (group.userData.walkPhase || 0) + dt * pace * speedFactor;
        const s = Math.sin(group.userData.walkPhase);
        const c = Math.cos(group.userData.walkPhase);

        if (parts.legL) parts.legL.rotation.x = s * amp;
        if (parts.legR) parts.legR.rotation.x = -s * amp;
        if (parts.armL) parts.armL.rotation.x = -s * (amp - 0.12);
        if (parts.armR) parts.armR.rotation.x = s * (amp - 0.12);
        if (parts.torso) {
            parts.torso.rotation.y = c * (sprinting ? 0.08 : 0.05);
            parts.torso.rotation.x = Math.abs(s) * 0.035;
        }
        if (parts.head && parts.torso) {
            parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, parts.torso.rotation.y * 0.3, 0.15);
        }

        const bob = Math.abs(s) * (sprinting ? 0.055 : 0.04);
        if (parts.torso) parts.torso.position.y = (b.torsoY ?? parts.torso.position.y) + bob;
        if (parts.shoulders) parts.shoulders.position.y = (b.shouldersY ?? parts.shoulders.position.y) + bob;
        if (parts.collar) parts.collar.position.y = (b.collarY ?? parts.collar.position.y) + bob;
        if (parts.neck) parts.neck.position.y = (b.neckY ?? parts.neck.position.y) + bob;
        if (parts.head) parts.head.position.y = (b.headY ?? parts.head.position.y) + bob * 1.1;
        if (parts.hairCap) parts.hairCap.position.y = (b.hairY ?? parts.hairCap.position.y) + bob * 1.1;
        if (parts.hips) parts.hips.position.y = (b.hipsY ?? parts.hips.position.y) + bob * 0.45;
    },

    async loadGltf(group, url, options = {}) {
        const heightM = options.heightM ?? 1.75;
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);

        if (group.userData.mixer) {
            group.userData.mixer.stopAllAction();
        }

        while (group.children.length) {
            const child = group.children[0];
            group.remove(child);
            child.traverse?.((c) => {
                if (c.geometry) c.geometry.dispose?.();
                if (c.material) {
                    if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
                    else c.material.dispose?.();
                }
            });
        }

        const model = gltf.scene;
        model.traverse((c) => { if (c.isMesh) c.castShadow = true; });

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        if (size.y > 0) {
            const scale = heightM / size.y;
            model.scale.setScalar(scale);
        }
        box.setFromObject(model);
        model.position.y -= box.min.y;

        group.add(model);
        group.userData.isGltf = true;
        group.userData.modelUrl = url;
        group.userData.mixer = null;
        group.userData.mixerClip = null;
        group.userData.walkMode = 'none';

        model.userData._gltfAnimations = gltf.animations || [];
        group.userData._lod0Animations = gltf.animations || [];

        const mode = setupWalkRig(group, model, gltf.animations || []);
        if (!group.userData._walkLogged) {
            group.userData._walkLogged = true;
            const clip = group.userData.walkClipName || '(none)';
            console.info(`[human-mesh] walk rig mode=${mode} clip=${clip} parts=${!!group.userData.humanParts?.legL}`);
        }

        return group;
    },

    /** Re-bind after LOD / appearance — public for AvatarLod */
    rebindWalk(group) {
        if (!group) return 'none';
        const scenes = group.userData?._lodScenes;
        const model = scenes?.[0]
            || group.children.find((c) => !c.userData?.hairSlot && !c.userData?.avatarMod)
            || group.children[0]
            || group;
        const anims = model?.userData?._gltfAnimations
            || group.userData?._lod0Animations
            || [];
        return setupWalkRig(group, model, anims);
    },

    applySkin(group, { bodyColor = 0x3366cc, headColor = 0xffcc99, pantsColor = 0x1a2844, roughness = 0.7 } = {}) {
        const parts = group?.userData?.humanParts;
        if (!parts) return;

        const paint = (obj, hex, r) => {
            if (!obj) return;
            obj.traverse?.((c) => {
                if (c.isMesh && c.material?.color) {
                    c.material.color.setHex(hex);
                    if (r != null) c.material.roughness = r;
                }
            });
            if (obj.isMesh && obj.material?.color) {
                obj.material.color.setHex(hex);
                if (r != null) obj.material.roughness = r;
            }
        };

        paint(parts.torso, bodyColor, roughness);
        paint(parts.shoulders, bodyColor, roughness);
        paint(parts.collar, bodyColor, roughness);
        paint(parts.neck, headColor, roughness);
        paint(parts.head, headColor, roughness);
        paint(parts.hips, pantsColor, 0.88);
        paint(parts.legL, pantsColor, 0.88);
        paint(parts.legR, pantsColor, 0.88);
        // shoes stay dark — recolor only cylinders on legs is harder; leave whole leg pants color ok for fallback
        paint(parts.armL, headColor, roughness);
        paint(parts.armR, headColor, roughness);
    },

    /**
     * Soft body shape on an already-built group (GLB or procedural).
     * Uses morph targets when present; else scales named parts relative to captured base.
     * @param {THREE.Object3D} group
     * @param {object} profileOrShape — full profile or shape object
     * @param {{ bodyId?: string, defaultHeightM?: number }} opts
     */
    applyShape(group, profileOrShape = {}, opts = {}) {
        if (!group) return false;
        const shapeRaw = profileOrShape?.shape || profileOrShape;
        const shape = {
            heightM: shapeRaw?.heightM ?? null,
            shoulders: Number(shapeRaw?.shoulders ?? 0.5),
            chest: Number(shapeRaw?.chest ?? 0.5),
            waist: Number(shapeRaw?.waist ?? 0.5),
            hips: Number(shapeRaw?.hips ?? 0.5),
            muscle: Number(shapeRaw?.muscle ?? 0.5),
            weight: Number(shapeRaw?.weight ?? 0.5),
        };
        // Prefer morphs on GLB when available
        const usedMorph = applyMorphShape(group, shape);

        // Ease curves — avoid cartoon extremes at slider edges
        const factor = (v, minM = 0.84, maxM = 1.16) => {
            const t = Math.min(1, Math.max(0, Number(v) || 0.5));
            if (t <= 0.5) return minM + (1 - minM) * (t / 0.5);
            return 1 + (maxM - 1) * ((t - 0.5) / 0.5);
        };
        const sh = factor(shape.shoulders, 0.82, 1.18);
        const ch = factor(shape.chest, 0.84, 1.16);
        const wa = factor(shape.waist, 0.8, 1.2);
        const hi = factor(shape.hips, 0.84, 1.18);
        const mu = factor(shape.muscle, 0.88, 1.14);
        const wt = factor(shape.weight, 0.9, 1.12);
        const trunk = 0.55 + wt * 0.45;
        const limbMu = 0.7 + mu * 0.3;
        const limbWt = 0.88 + wt * 0.12;
        // Female GLB soft-scale: emphasize hips/waist; male: shoulders/chest
        const female = (opts.bodyId || profileOrShape?.bodyId) === 'female_default';
        const hipBias = female ? 1.04 : 0.98;
        const shBias = female ? 0.97 : 1.03;

        if (!usedMorph) {
            const parts = group.userData?.humanParts;
            if (parts) {
                if (!group.userData._shapeBaseScales) {
                    group.userData._shapeBaseScales = {
                        hips: capturePartScale(parts.hips),
                        torso: capturePartScale(parts.torso),
                        shoulders: capturePartScale(parts.shoulders),
                        armL: capturePartScale(parts.armL),
                        armR: capturePartScale(parts.armR),
                        legL: capturePartScale(parts.legL),
                        legR: capturePartScale(parts.legR),
                        neck: capturePartScale(parts.neck),
                    };
                }
                const b = group.userData._shapeBaseScales;
                // Anatomical soft scale: trunk girth separate from limb mass
                setPartScale(parts.hips, b.hips, hi * trunk * hipBias, 1, hi * trunk * hipBias);
                setPartScale(
                    parts.torso,
                    b.torso,
                    (ch * 0.55 + wa * 0.45) * trunk * shBias,
                    1,
                    ch * trunk
                );
                setPartScale(parts.shoulders, b.shoulders, sh * shBias, 1, sh * 0.96);
                setPartScale(parts.armL, b.armL, limbMu, 1, limbMu);
                setPartScale(parts.armR, b.armR, limbMu, 1, limbMu);
                setPartScale(parts.legL, b.legL, limbMu * limbWt, 1, limbMu * limbWt);
                setPartScale(parts.legR, b.legR, limbMu * limbWt, 1, limbMu * limbWt);
                if (b.neck) setPartScale(parts.neck, b.neck, 0.96 + mu * 0.04, 1, 0.96 + mu * 0.04);
            } else if (group.userData?.isGltf) {
                // Soft scale common bone/mesh names on GLB without morphs
                if (!group.userData._shapeBaseGltf) {
                    const map = {};
                    group.traverse((c) => {
                        const n = (c.name || '').toLowerCase();
                        if (!n || !c.isObject3D) return;
                        if (/hips|pelvis|torso|spine|chest|shoulder|upperarm|thigh|leg|neck|clavicle|forearm/.test(n)) {
                            map[c.uuid] = { obj: c, scale: capturePartScale(c), name: n };
                        }
                    });
                    group.userData._shapeBaseGltf = map;
                }
                Object.values(group.userData._shapeBaseGltf || {}).forEach((entry) => {
                    const n = entry.name;
                    let mx = 1;
                    let mz = 1;
                    if (/hips|pelvis/.test(n)) { mx = hi * trunk * hipBias; mz = mx; }
                    else if (/torso|spine|chest/.test(n)) {
                        mx = (ch * 0.55 + wa * 0.45) * trunk * shBias;
                        mz = ch * trunk;
                    }
                    else if (/shoulder|clavicle/.test(n)) { mx = sh * shBias; mz = sh * 0.96; }
                    else if (/upperarm|forearm|arm/.test(n)) { mx = limbMu; mz = limbMu; }
                    else if (/thigh|leg/.test(n)) { mx = limbMu * limbWt; mz = mx; }
                    else if (/neck/.test(n)) { mx = 0.96 + mu * 0.04; mz = mx; }
                    setPartScale(entry.obj, entry.scale, mx, 1, mz);
                });
            }
        }

        // Height: mostly Y so body doesn't balloon sideways when taller/shorter
        const bodyId = opts.bodyId || profileOrShape?.bodyId || 'male_default';
        const defaultH = opts.defaultHeightM
            ?? (bodyId === 'female_default' ? 1.65 : 1.75);
        const targetH = shape.heightM != null && Number.isFinite(Number(shape.heightM))
            ? Number(shape.heightM)
            : defaultH;
        const hScale = targetH / defaultH;
        // Slight XZ compensate so tall avatars stay slender (allometric-ish)
        const xzScale = 1 + (hScale - 1) * 0.35;
        if (!group.userData._shapeBaseRootScale) {
            group.userData._shapeBaseRootScale = {
                x: group.scale.x,
                y: group.scale.y,
                z: group.scale.z,
            };
        }
        const rs = group.userData._shapeBaseRootScale;
        group.scale.set(rs.x * xzScale, rs.y * hScale, rs.z * xzScale);
        group.userData.bodyShape = { ...shape, appliedAt: Date.now(), realism: true };
        return true;
    },
};

window.HumanMesh = HumanMesh;
