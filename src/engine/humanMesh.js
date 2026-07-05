import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function limbGroup(mesh, pivotY, offsetX = 0) {
    const g = new THREE.Group();
    g.position.set(offsetX, pivotY, 0);
    g.add(mesh);
    return g;
}

export const HumanMesh = {
    build(options = {}) {
        const skin = options.skinColor ?? 0xffcc99;
        const shirt = options.bodyColor ?? 0x3366cc;
        const pants = options.pantsColor ?? 0x1a2844;
        const hair = options.hairColor ?? 0x2a1810;
        const rough = options.roughness ?? 0.72;

        const matSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: rough });
        const matShirt = new THREE.MeshStandardMaterial({ color: shirt, roughness: rough * 0.9, metalness: 0.05 });
        const matPants = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.88 });
        const matHair = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.95 });
        const matShoe = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
        const matAccent = new THREE.MeshStandardMaterial({ color: 0x39ff14, roughness: 0.4, emissive: 0x112211, emissiveIntensity: 0.35 });

        const group = new THREE.Group();
        group.name = 'human_avatar';

        const hips = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.24, 0.28), matPants);
        hips.position.y = 0.9;
        hips.castShadow = true;

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.64, 0.28), matShirt);
        torso.position.y = 1.34;
        torso.castShadow = true;

        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.3), matShirt);
        collar.position.y = 1.62;
        collar.castShadow = true;

        const chestBadge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), matAccent);
        chestBadge.position.set(0, 1.42, 0.16);
        chestBadge.castShadow = true;

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 18), matSkin);
        head.position.y = 1.78;
        head.castShadow = true;

        const hairCap = new THREE.Mesh(
            new THREE.SphereGeometry(0.215, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
            matHair
        );
        hairCap.position.y = 1.84;
        hairCap.castShadow = true;

        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        eyeL.position.set(-0.07, 1.8, 0.17);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.07;

        const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.74, 0.19), matPants);
        legLMesh.position.y = -0.37;
        legLMesh.castShadow = true;
        const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.28), matShoe);
        shoeL.position.set(0, -0.42, 0.04);
        legLMesh.add(shoeL);
        const legL = limbGroup(legLMesh, 0.9, -0.13);

        const legRMesh = legLMesh.clone();
        legRMesh.traverse((c) => {
            if (c.isMesh && c.material) c.material = c.material.clone();
        });
        const legR = limbGroup(legRMesh, 0.9, 0.13);

        const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), matSkin);
        armLMesh.position.y = -0.25;
        armLMesh.castShadow = true;
        const armL = limbGroup(armLMesh, 1.48, -0.34);

        const armRMesh = armLMesh.clone();
        armRMesh.traverse((c) => {
            if (c.isMesh && c.material) c.material = c.material.clone();
        });
        const armR = limbGroup(armRMesh, 1.48, 0.34);

        group.add(hips, torso, collar, chestBadge, head, hairCap, eyeL, eyeR, legL, legR, armL, armR);
        group.userData.humanParts = { hips, torso, collar, head, hairCap, legL, legR, armL, armR, chestBadge };
        group.userData.walkPhase = 0;
        group.userData.idlePhase = Math.random() * Math.PI * 2;

        return group;
    },

    updateIdle(group, time, dt = 0.016) {
        if (!group || group.userData?.isGltf) return;

        const parts = group.userData?.humanParts;
        if (!parts) return;

        group.userData.idlePhase = (group.userData.idlePhase || 0) + dt;
        const t = group.userData.idlePhase;
        const breathe = Math.sin(t * 1.8) * 0.018;
        const sway = Math.sin(t * 0.7) * 0.03;
        const look = Math.sin(t * 0.35 + (group.userData.idleSeed || 0)) * 0.12;

        parts.torso.position.y = 1.34 + breathe;
        parts.collar.position.y = 1.62 + breathe;
        parts.chestBadge.position.y = 1.42 + breathe;
        parts.head.position.y = 1.78 + breathe * 1.2;
        parts.hairCap.position.y = 1.84 + breathe * 1.2;
        parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, look, 0.06);
        parts.torso.rotation.y = THREE.MathUtils.lerp(parts.torso.rotation.y, sway * 0.4, 0.05);
        parts.armL.rotation.x = THREE.MathUtils.lerp(parts.armL.rotation.x, Math.sin(t * 1.1) * 0.08, 0.08);
        parts.armR.rotation.x = THREE.MathUtils.lerp(parts.armR.rotation.x, -Math.sin(t * 1.1 + 0.5) * 0.08, 0.08);
        parts.armL.rotation.z = THREE.MathUtils.lerp(parts.armL.rotation.z, 0.06, 0.05);
        parts.armR.rotation.z = THREE.MathUtils.lerp(parts.armR.rotation.z, -0.06, 0.05);
        parts.legL.rotation.x = THREE.MathUtils.lerp(parts.legL.rotation.x, 0, 0.12);
        parts.legR.rotation.x = THREE.MathUtils.lerp(parts.legR.rotation.x, 0, 0.12);
        parts.hips.position.y = 0.9 + Math.sin(t * 1.8) * 0.008;
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
        const amp = sprinting ? 0.82 : 0.68;
        const speedFactor = Math.min(horizontalSpeed / 3.2, 1.9);
        group.userData.walkPhase += dt * pace * speedFactor;
        const s = Math.sin(group.userData.walkPhase);
        const c = Math.cos(group.userData.walkPhase);

        parts.legL.rotation.x = s * amp;
        parts.legR.rotation.x = -s * amp;
        parts.armL.rotation.x = -s * (amp - 0.15);
        parts.armR.rotation.x = s * (amp - 0.15);
        parts.armL.rotation.z = THREE.MathUtils.lerp(parts.armL.rotation.z, s * 0.04, 0.2);
        parts.armR.rotation.z = THREE.MathUtils.lerp(parts.armR.rotation.z, -s * 0.04, 0.2);
        parts.torso.rotation.y = c * (sprinting ? 0.09 : 0.055);
        parts.torso.rotation.x = Math.abs(s) * 0.04;
        parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, parts.torso.rotation.y * 0.35, 0.15);

        const bob = Math.abs(s) * (sprinting ? 0.06 : 0.045);
        parts.torso.position.y = 1.34 + bob;
        parts.collar.position.y = 1.62 + bob;
        parts.chestBadge.position.y = 1.42 + bob;
        parts.head.position.y = 1.78 + bob * 1.15;
        parts.hairCap.position.y = 1.84 + bob * 1.15;
        parts.hips.position.y = 0.9 + bob * 0.5;
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
        group.userData.humanParts = null;
        group.userData.isGltf = true;
        group.userData.modelUrl = url;

        if (gltf.animations?.length) {
            const mixer = new THREE.AnimationMixer(model);
            const clip = mixer.clipAction(gltf.animations[0]);
            clip.play();
            group.userData.mixer = mixer;
            group.userData.mixerClip = clip;
        }

        return group;
    },

    applySkin(group, { bodyColor = 0x3366cc, headColor = 0xffcc99, pantsColor = 0x1a2844, roughness = 0.7 } = {}) {
        const parts = group?.userData?.humanParts;
        if (!parts) return;

        parts.torso.material.color.setHex(bodyColor);
        parts.torso.material.roughness = roughness;
        parts.collar.material.color.setHex(bodyColor);
        parts.head.material.color.setHex(headColor);
        parts.head.material.roughness = roughness;
        parts.hips.material.color.setHex(pantsColor);
        [parts.legL, parts.legR].forEach((leg) => {
            leg.traverse((c) => {
                if (c.isMesh && c.material && c.geometry?.type === 'BoxGeometry' && c.position.y < 0) {
                    c.material.color.setHex(pantsColor);
                }
            });
        });
        [parts.armL, parts.armR].forEach((arm) => {
            arm.traverse((c) => {
                if (c.isMesh && c.material && !c.material.color.equals(parts.head.material.color)) {
                    c.material.color.setHex(headColor);
                    c.material.roughness = roughness;
                }
            });
        });
    },
};

window.HumanMesh = HumanMesh;