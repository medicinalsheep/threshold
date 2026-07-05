import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function limbGroup(mesh, pivotY, offsetX = 0) {
    const g = new THREE.Group();
    g.position.set(offsetX, pivotY, 0);
    g.add(mesh);
    return g;
}

const GLTF_PART_NAMES = ['legL', 'legR', 'armL', 'armR', 'torso', 'head', 'hips'];

function collectNamedParts(object) {
    const parts = {};
    object.traverse((c) => {
        if (GLTF_PART_NAMES.includes(c.name) && parts[c.name] == null) parts[c.name] = c;
    });
    return parts;
}

function avatarRootFromModel(model) {
    return model.getObjectByName('StarterAvatar') || model.children[0] || model;
}

export const HumanMesh = {
    build(options = {}) {
        const skin = options.skinColor ?? 0xffcc99;
        const shirt = options.bodyColor ?? 0x3366cc;
        const pants = options.pantsColor ?? 0x1a2844;
        const hair = options.hairColor ?? 0x2a1810;
        const rough = options.roughness ?? 0.72;

        const matSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: rough, metalness: 0.02 });
        const matShirt = new THREE.MeshStandardMaterial({ color: shirt, roughness: rough * 0.95, metalness: 0.03 });
        const matPants = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.88, metalness: 0.02 });
        const matHair = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.96, metalness: 0 });
        const matShoe = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.68, metalness: 0.06 });

        const group = new THREE.Group();
        group.name = 'human_avatar';

        const hips = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.3), matPants);
        hips.position.y = 0.88;
        hips.castShadow = true;

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.24), matShirt);
        torso.position.y = 1.3;
        torso.scale.set(1.04, 1, 0.95);
        torso.castShadow = true;

        const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.27), matShirt);
        shoulders.position.y = 1.56;
        shoulders.castShadow = true;

        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.26), matShirt);
        collar.position.set(0, 1.62, 0.02);
        collar.castShadow = true;

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.11, 12), matSkin);
        neck.position.y = 1.66;
        neck.castShadow = true;

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 22, 20), matSkin);
        head.position.y = 1.8;
        head.scale.set(0.98, 1.05, 0.92);
        head.castShadow = true;

        const hairCap = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
            matHair
        );
        hairCap.position.y = 1.86;
        hairCap.castShadow = true;

        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.4 });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat);
        eyeL.position.set(-0.06, 1.82, 0.148);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.065;

        const legLMesh = new THREE.Group();
        const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.42, 10), matPants);
        thighL.position.y = -0.21;
        const calfL = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.38, 10), matPants);
        calfL.position.y = -0.58;
        const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.3), matShoe);
        shoeL.position.set(0, -0.82, 0.05);
        legLMesh.add(thighL, calfL, shoeL);
        legLMesh.traverse((c) => { if (c.isMesh) c.castShadow = true; });
        const legL = limbGroup(legLMesh, 0.88, -0.12);

        const legRMesh = legLMesh.clone(true);
        legRMesh.traverse((c) => {
            if (c.isMesh && c.material) c.material = c.material.clone();
        });
        const legR = limbGroup(legRMesh, 0.88, 0.12);

        const armLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.48, 10), matSkin);
        armLMesh.position.y = -0.24;
        armLMesh.castShadow = true;
        const armL = limbGroup(armLMesh, 1.44, -0.32);

        const armRMesh = armLMesh.clone();
        armRMesh.traverse((c) => {
            if (c.isMesh && c.material) c.material = c.material.clone();
        });
        const armR = limbGroup(armRMesh, 1.44, 0.32);

        group.add(hips, torso, shoulders, collar, neck, head, hairCap, eyeL, eyeR, legL, legR, armL, armR);
        group.userData.humanParts = {
            hips, torso, shoulders, collar, neck, head, hairCap, legL, legR, armL, armR,
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

        group.userData.idlePhase = (group.userData.idlePhase || 0) + dt;
        const t = group.userData.idlePhase;
        const breathe = Math.sin(t * 1.8) * 0.016;
        const sway = Math.sin(t * 0.7) * 0.028;
        const look = Math.sin(t * 0.35 + (group.userData.idleSeed || 0)) * 0.14;

        if (parts.torso) {
            parts.torso.position.y = 1.3 + breathe;
            parts.torso.rotation.y = THREE.MathUtils.lerp(parts.torso.rotation.y, sway * 0.35, 0.05);
        }
        if (parts.shoulders) parts.shoulders.position.y = 1.56 + breathe;
        if (parts.collar) parts.collar.position.y = 1.62 + breathe;
        if (parts.neck) parts.neck.position.y = 1.66 + breathe;
        if (parts.head) {
            parts.head.position.y = 1.8 + breathe * 1.15;
            parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, look, 0.06);
        }
        if (parts.hairCap) parts.hairCap.position.y = 1.86 + breathe * 1.15;
        if (parts.armL) parts.armL.rotation.x = THREE.MathUtils.lerp(parts.armL.rotation.x, Math.sin(t * 1.1) * 0.07, 0.08);
        if (parts.armR) parts.armR.rotation.x = THREE.MathUtils.lerp(parts.armR.rotation.x, -Math.sin(t * 1.1 + 0.5) * 0.07, 0.08);
        if (parts.legL) parts.legL.rotation.x = THREE.MathUtils.lerp(parts.legL.rotation.x, 0, 0.12);
        if (parts.legR) parts.legR.rotation.x = THREE.MathUtils.lerp(parts.legR.rotation.x, 0, 0.12);
        if (parts.hips) parts.hips.position.y = 0.88 + Math.sin(t * 1.8) * 0.006;
    },

    setFirstPersonVisible(group, visible) {
        if (!group) return;
        const parts = group.userData?.humanParts;
        if (!parts) return;
        const show = visible;
        if (parts.head) parts.head.visible = show;
        if (parts.hairCap) parts.hairCap.visible = show;
        if (parts.neck) parts.neck.visible = show;
        if (parts.collar) parts.collar.visible = show;
    },

    updateWalk(group, horizontalSpeed, dt = 0.016, sprinting = false) {
        if (!group) return;

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
        if (parts.torso) parts.torso.position.y = 1.3 + bob;
        if (parts.shoulders) parts.shoulders.position.y = 1.56 + bob;
        if (parts.collar) parts.collar.position.y = 1.62 + bob;
        if (parts.neck) parts.neck.position.y = 1.66 + bob;
        if (parts.head) parts.head.position.y = 1.8 + bob * 1.1;
        if (parts.hairCap) parts.hairCap.position.y = 1.86 + bob * 1.1;
        if (parts.hips) parts.hips.position.y = 0.88 + bob * 0.45;
    },

    async loadGltf(group, url) {
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
            const scale = 1.75 / size.y;
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
        if (gltf.animations?.length) {
            const mixer = new THREE.AnimationMixer(avatarRoot);
            const clip = mixer.clipAction(gltf.animations[0]);
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

        parts.torso.material.color.setHex(bodyColor);
        parts.torso.material.roughness = roughness;
        if (parts.shoulders?.material) parts.shoulders.material.color.setHex(bodyColor);
        if (parts.collar?.material) parts.collar.material.color.setHex(bodyColor);
        if (parts.neck?.material) {
            parts.neck.material.color.setHex(headColor);
            parts.neck.material.roughness = roughness;
        }
        parts.head.material.color.setHex(headColor);
        parts.head.material.roughness = roughness;
        parts.hips.material.color.setHex(pantsColor);
        [parts.legL, parts.legR].forEach((leg) => {
            leg.traverse((c) => {
                if (c.isMesh && c.material && c.geometry?.type?.includes('Cylinder')) {
                    c.material.color.setHex(pantsColor);
                }
            });
        });
        [parts.armL, parts.armR].forEach((arm) => {
            arm.traverse((c) => {
                if (c.isMesh && c.material) {
                    c.material.color.setHex(headColor);
                    c.material.roughness = roughness;
                }
            });
        });
    },
};

window.HumanMesh = HumanMesh;