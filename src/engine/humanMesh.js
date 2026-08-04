import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function limbGroup(mesh, pivotY, offsetX = 0) {
    const g = new THREE.Group();
    g.position.set(offsetX, pivotY, 0);
    g.add(mesh);
    return g;
}

const GLTF_PART_NAMES = ['legL', 'legR', 'armL', 'armR', 'torso', 'head', 'hips'];
const SEG = 12;

function collectNamedParts(object) {
    const parts = {};
    object.traverse((c) => {
        if (GLTF_PART_NAMES.includes(c.name) && parts[c.name] == null) parts[c.name] = c;
    });
    return parts;
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
        || model.children[0]
        || model;
}

const WALK_CLIP_NAMES = ['walk', 'Walk', 'locomotion', 'Locomotion'];

function pickWalkClip(animations = []) {
    if (!animations.length) return null;
    const named = animations.find((c) => WALK_CLIP_NAMES.some((n) => c.name?.includes(n)));
    return named || animations[0];
}

/** Formed proportions for procedural fallback (matches gen-starter-avatar). */
function resolveForm(options = {}) {
    const female = options.bodyId === 'female_default' || options.form === 'female';
    let base;
    if (female) {
        base = {
            form: 'female',
            shoulderW: 0.44,
            chestW: 0.4,
            chestD: 0.24,
            waistW: 0.32,
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
            torsoScale: options.torsoScale || [0.92, 1, 0.88],
            hipScale: options.hipScale || [1.08, 1, 1.04],
        };
    } else {
        base = {
            form: 'male',
            shoulderW: 0.54,
            chestW: 0.46,
            chestD: 0.28,
            waistW: 0.38,
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
            torsoScale: options.torsoScale || [1.04, 1, 0.95],
            hipScale: options.hipScale || [1, 1, 1],
        };
    }

    // Continuous shape factors from AppearanceProfile.profileToMeshOpts
    const sf = options._shapeFactors;
    if (!sf) return base;

    return {
        ...base,
        shoulderW: base.shoulderW * (sf.shoulders || 1),
        chestW: base.chestW * (sf.chest || 1) * (sf.weight || 1),
        chestD: base.chestD * (0.92 + (sf.chest || 1) * 0.08) * (sf.weight || 1),
        waistW: base.waistW * (sf.waist || 1) * (sf.weight || 1),
        hipW: base.hipW * (sf.hips || 1) * (sf.weight || 1),
        hipD: base.hipD * (0.94 + (sf.hips || 1) * 0.06) * (sf.weight || 1),
        thighTop: base.thighTop * (sf.muscle || 1) * (sf.weight || 1),
        thighBot: base.thighBot * (sf.muscle || 1),
        calfTop: base.calfTop * (0.95 + (sf.muscle || 1) * 0.05),
        armTop: base.armTop * (sf.muscle || 1),
        armBot: base.armBot * (sf.muscle || 1),
        armOut: base.armOut * (0.92 + (sf.shoulders || 1) * 0.08),
        hipOut: base.hipOut * (0.92 + (sf.hips || 1) * 0.08),
        bust: base.bust * (0.65 + (sf.chest || 1) * 0.7),
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

        const matSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: rough, metalness: 0.02 });
        const matShirt = new THREE.MeshStandardMaterial({ color: shirt, roughness: rough * 0.95, metalness: 0.03 });
        const matPants = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.88, metalness: 0.02 });
        const matHair = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.96, metalness: 0 });
        const matShoe = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.68, metalness: 0.06 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.4 });

        const group = new THREE.Group();
        group.name = 'human_avatar';
        group.userData.bodyForm = f.form;

        const hips = new THREE.Mesh(new THREE.BoxGeometry(f.hipW, f.hipH, f.hipD), matPants);
        hips.position.y = f.hipY;
        hips.scale.set(hs[0], hs[1], hs[2]);
        hips.name = 'hips';
        hips.castShadow = true;

        const torso = new THREE.Group();
        torso.name = 'torso';
        torso.position.y = f.hipY + f.hipH * 0.5 + f.torsoH * 0.5;
        torso.scale.set(ts[0], ts[1], ts[2]);

        const waist = new THREE.Mesh(
            new THREE.CylinderGeometry(f.waistW * 0.48, f.hipW * 0.42, f.torsoH * 0.35, SEG),
            matShirt
        );
        waist.position.y = -f.torsoH * 0.28;
        waist.castShadow = true;

        const chest = new THREE.Mesh(
            new THREE.CylinderGeometry(f.chestW * 0.5, f.waistW * 0.48, f.torsoH * 0.55, SEG),
            matShirt
        );
        chest.position.y = f.torsoH * 0.08;
        chest.scale.z = f.chestD / (f.chestW * 0.55);
        chest.castShadow = true;
        torso.add(waist, chest);

        if (f.bust > 0) {
            const bustL = new THREE.Mesh(new THREE.SphereGeometry(f.bust, 10, 8), matShirt);
            bustL.position.set(-f.chestW * 0.18, f.torsoH * 0.12, f.chestD * 0.38);
            bustL.scale.set(1, 0.85, 0.75);
            bustL.castShadow = true;
            const bustR = bustL.clone();
            bustR.position.x = -bustL.position.x;
            torso.add(bustL, bustR);
        }

        const shoulders = new THREE.Mesh(
            new THREE.BoxGeometry(f.shoulderW, 0.12, f.chestD * 0.95),
            matShirt
        );
        shoulders.position.y = f.shoulderY;
        shoulders.name = 'shoulders';
        shoulders.castShadow = true;

        const collar = new THREE.Mesh(
            new THREE.BoxGeometry(f.chestW * 0.72, 0.055, f.chestD * 0.9),
            matShirt
        );
        collar.position.set(0, f.shoulderY + 0.07, 0.02);
        collar.name = 'collar';
        collar.castShadow = true;

        const neck = new THREE.Mesh(
            new THREE.CylinderGeometry(f.neckR * 0.92, f.neckR, 0.12, SEG),
            matSkin
        );
        neck.position.y = f.shoulderY + 0.14;
        neck.name = 'neck';
        neck.castShadow = true;

        const head = new THREE.Mesh(new THREE.SphereGeometry(f.headR, 24, 20), matSkin);
        head.position.y = f.shoulderY + 0.28;
        head.scale.set(f.headScale[0], f.headScale[1], f.headScale[2]);
        head.name = 'head';
        head.castShadow = true;

        const hairCap = new THREE.Mesh(
            new THREE.SphereGeometry(f.headR * 1.08, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
            matHair
        );
        hairCap.position.y = head.position.y + f.headR * 0.12;
        hairCap.name = 'hairCap';
        hairCap.castShadow = true;

        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeMat);
        eyeL.position.set(-0.055, head.position.y + 0.02, f.headR * 0.82);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.055;

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), matSkin);
        nose.position.set(0, head.position.y - 0.01, f.headR * 0.88);
        nose.scale.set(0.7, 0.9, 1.1);

        // Legs
        const buildLeg = (sign) => {
            const legMesh = new THREE.Group();
            const thigh = new THREE.Mesh(
                new THREE.CylinderGeometry(f.thighBot, f.thighTop, f.legLen * 0.48, SEG),
                matPants
            );
            thigh.position.y = -f.legLen * 0.24;
            const calf = new THREE.Mesh(
                new THREE.CylinderGeometry(f.calfBot, f.calfTop, f.legLen * 0.42, SEG),
                matPants
            );
            calf.position.y = -f.legLen * 0.66;
            const shoe = new THREE.Mesh(new THREE.BoxGeometry(f.shoe[0], f.shoe[1], f.shoe[2]), matShoe);
            shoe.position.set(0, -f.legLen * 0.92, f.shoe[2] * 0.12);
            legMesh.add(thigh, calf, shoe);
            legMesh.traverse((c) => { if (c.isMesh) c.castShadow = true; });
            return limbGroup(legMesh, f.hipY, sign * f.hipOut);
        };

        const legL = buildLeg(-1);
        legL.name = 'legL';
        const legR = buildLeg(1);
        legR.name = 'legR';

        const buildArm = (sign) => {
            const armMesh = new THREE.Group();
            const upper = new THREE.Mesh(
                new THREE.CylinderGeometry(f.armBot * 1.05, f.armTop, f.armLen * 0.52, SEG),
                matSkin
            );
            upper.position.y = -f.armLen * 0.26;
            const lower = new THREE.Mesh(
                new THREE.CylinderGeometry(f.armBot * 0.9, f.armBot * 1.05, f.armLen * 0.42, SEG),
                matSkin
            );
            lower.position.y = -f.armLen * 0.68;
            const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.045), matSkin);
            hand.position.y = -f.armLen * 0.95;
            armMesh.add(upper, lower, hand);
            armMesh.traverse((c) => { if (c.isMesh) c.castShadow = true; });
            const g = limbGroup(armMesh, f.shoulderY - 0.02, sign * f.armOut);
            g.rotation.z = sign * 0.08;
            return g;
        };

        const armL = buildArm(-1);
        armL.name = 'armL';
        const armR = buildArm(1);
        armR.name = 'armR';

        group.add(hips, torso, shoulders, collar, neck, head, hairCap, eyeL, eyeR, nose, legL, legR, armL, armR);
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

        return group;
    },

    updateIdle(group, time, dt = 0.016) {
        if (!group) return;
        if (group.userData?.isGltf && group.userData?.mixer) return;

        const parts = group.userData?.humanParts;
        if (!parts) return;
        const b = parts._base || {};

        group.userData.idlePhase = (group.userData.idlePhase || 0) + dt;
        const t = group.userData.idlePhase;
        const breathe = Math.sin(t * 1.8) * 0.016;
        const sway = Math.sin(t * 0.7) * 0.028;
        const look = Math.sin(t * 0.35 + (group.userData.idleSeed || 0)) * 0.14;

        if (parts.torso) {
            parts.torso.position.y = (b.torsoY ?? 1.3) + breathe;
            parts.torso.rotation.y = THREE.MathUtils.lerp(parts.torso.rotation.y, sway * 0.35, 0.05);
        }
        if (parts.shoulders) parts.shoulders.position.y = (b.shouldersY ?? 1.56) + breathe;
        if (parts.collar) parts.collar.position.y = (b.collarY ?? 1.62) + breathe;
        if (parts.neck) parts.neck.position.y = (b.neckY ?? 1.66) + breathe;
        if (parts.head) {
            parts.head.position.y = (b.headY ?? 1.8) + breathe * 1.15;
            parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, look, 0.06);
        }
        if (parts.hairCap) parts.hairCap.position.y = (b.hairY ?? 1.86) + breathe * 1.15;
        if (parts.armL) parts.armL.rotation.x = THREE.MathUtils.lerp(parts.armL.rotation.x, Math.sin(t * 1.1) * 0.07, 0.08);
        if (parts.armR) parts.armR.rotation.x = THREE.MathUtils.lerp(parts.armR.rotation.x, -Math.sin(t * 1.1 + 0.5) * 0.07, 0.08);
        if (parts.legL) parts.legL.rotation.x = THREE.MathUtils.lerp(parts.legL.rotation.x, 0, 0.12);
        if (parts.legR) parts.legR.rotation.x = THREE.MathUtils.lerp(parts.legR.rotation.x, 0, 0.12);
        if (parts.hips) parts.hips.position.y = (b.hipsY ?? 0.88) + Math.sin(t * 1.8) * 0.006;
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

        // Multi-LOD pose sync (all tiers advance so zoom swaps don't hop)
        if (group.userData?.avatarLod && window.AvatarPoseSync?.updateAvatarLodPose) {
            if (window.AvatarPoseSync.updateAvatarLodPose(group, horizontalSpeed, dt, sprinting)) {
                return;
            }
        }

        if (group.userData.isGltf && group.userData.mixer) {
            const clip = group.userData.mixerClip;
            if (clip) {
                const moving = horizontalSpeed > 0.25;
                clip.paused = !moving;
                clip.timeScale = sprinting ? 1.9 : Math.max(0.55, horizontalSpeed / 3.2);
            }
            group.userData.mixer.update(dt);
            return;
        }

        const parts = group.userData?.humanParts;
        if (!parts) return;
        const b = parts._base || {};

        const moving = horizontalSpeed > 0.25;
        group.userData.idlePhase = (group.userData.idlePhase || 0) + dt;

        if (!moving) {
            this.updateIdle(group, 0, dt);
            group.userData.walkPhase = 0;
            return;
        }

        const pace = sprinting ? 13.5 : 10;
        const amp = sprinting ? 0.78 : 0.62;
        const speedFactor = Math.min(horizontalSpeed / 3.2, 1.9);
        group.userData.walkPhase += dt * pace * speedFactor;
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
        if (parts.torso) parts.torso.position.y = (b.torsoY ?? 1.3) + bob;
        if (parts.shoulders) parts.shoulders.position.y = (b.shouldersY ?? 1.56) + bob;
        if (parts.collar) parts.collar.position.y = (b.collarY ?? 1.62) + bob;
        if (parts.neck) parts.neck.position.y = (b.neckY ?? 1.66) + bob;
        if (parts.head) parts.head.position.y = (b.headY ?? 1.8) + bob * 1.1;
        if (parts.hairCap) parts.hairCap.position.y = (b.hairY ?? 1.86) + bob * 1.1;
        if (parts.hips) parts.hips.position.y = (b.hipsY ?? 0.88) + bob * 0.45;
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

        const avatarRoot = avatarRootFromModel(model);
        model.userData._gltfAnimations = gltf.animations || [];
        group.userData._lod0Animations = gltf.animations || [];

        const walkClip = pickWalkClip(gltf.animations);
        if (walkClip) {
            const mixer = new THREE.AnimationMixer(avatarRoot);
            const clip = mixer.clipAction(walkClip);
            clip.play();
            group.userData.mixer = mixer;
            group.userData.mixerClip = clip;
            group.userData.humanParts = null;
        } else {
            const parts = collectNamedParts(model);
            if (parts.legL && parts.legR && parts.armL && parts.armR) {
                group.userData.humanParts = parts;
                group.userData.walkPhase = 0;
                group.userData.idlePhase = Math.random() * Math.PI * 2;
            } else {
                group.userData.humanParts = null;
            }
        }

        return group;
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

        const factor = (v, minM = 0.82, maxM = 1.18) => {
            const t = Math.min(1, Math.max(0, Number(v) || 0.5));
            if (t <= 0.5) return minM + (1 - minM) * (t / 0.5);
            return 1 + (maxM - 1) * ((t - 0.5) / 0.5);
        };
        const sh = factor(shape.shoulders, 0.78, 1.22);
        const ch = factor(shape.chest, 0.8, 1.2);
        const wa = factor(shape.waist, 0.75, 1.25);
        const hi = factor(shape.hips, 0.8, 1.22);
        const mu = factor(shape.muscle, 0.85, 1.2);
        const wt = factor(shape.weight, 0.9, 1.12);

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
                    };
                }
                const b = group.userData._shapeBaseScales;
                setPartScale(parts.hips, b.hips, hi * wt, 1, hi * wt);
                setPartScale(parts.torso, b.torso, ch * wt * (0.5 + wa * 0.5), 1, ch * wt);
                setPartScale(parts.shoulders, b.shoulders, sh, 1, sh * 0.95);
                setPartScale(parts.armL, b.armL, mu, 1, mu);
                setPartScale(parts.armR, b.armR, mu, 1, mu);
                setPartScale(parts.legL, b.legL, mu * (0.95 + wt * 0.05), 1, mu);
                setPartScale(parts.legR, b.legR, mu * (0.95 + wt * 0.05), 1, mu);
            } else if (group.userData?.isGltf) {
                // Soft scale common bone/mesh names on GLB without morphs
                if (!group.userData._shapeBaseGltf) {
                    const map = {};
                    group.traverse((c) => {
                        const n = (c.name || '').toLowerCase();
                        if (!n || !c.isObject3D) return;
                        if (/hips|pelvis|torso|spine|chest|shoulder|upperarm|thigh|leg/.test(n)) {
                            map[c.uuid] = { obj: c, scale: capturePartScale(c), name: n };
                        }
                    });
                    group.userData._shapeBaseGltf = map;
                }
                Object.values(group.userData._shapeBaseGltf || {}).forEach((entry) => {
                    const n = entry.name;
                    let mx = 1;
                    let mz = 1;
                    if (/hips|pelvis/.test(n)) { mx = hi * wt; mz = hi * wt; }
                    else if (/torso|spine|chest/.test(n)) { mx = ch * wt * (0.5 + wa * 0.5); mz = ch * wt; }
                    else if (/shoulder/.test(n)) { mx = sh; mz = sh; }
                    else if (/upperarm|arm/.test(n)) { mx = mu; mz = mu; }
                    else if (/thigh|leg/.test(n)) { mx = mu * wt; mz = mu; }
                    setPartScale(entry.obj, entry.scale, mx, 1, mz);
                });
            }
        }

        // Overall height — uniform scale vs body default
        const bodyId = opts.bodyId || profileOrShape?.bodyId || 'male_default';
        const defaultH = opts.defaultHeightM
            ?? (bodyId === 'female_default' ? 1.65 : 1.75);
        const targetH = shape.heightM != null && Number.isFinite(Number(shape.heightM))
            ? Number(shape.heightM)
            : defaultH;
        const hScale = targetH / defaultH;
        if (!group.userData._shapeBaseRootScale) {
            group.userData._shapeBaseRootScale = {
                x: group.scale.x,
                y: group.scale.y,
                z: group.scale.z,
            };
        }
        const rs = group.userData._shapeBaseRootScale;
        group.scale.set(rs.x * hScale, rs.y * hScale, rs.z * hScale);
        group.userData.bodyShape = { ...shape, appliedAt: Date.now() };
        return true;
    },
};

window.HumanMesh = HumanMesh;
