import { spawnAiTerminal } from './aiTerminal.js';
import { seedStarterSounds, wireStarterSounds } from './starterSfx.js';
import { wireStarterTextures } from './starterTex.js';
import { NpcPatrol } from './npcPatrol.js';
import { spawnHumanWithAvatar } from './avatarLoader.js';

async function spawnStarterNpc({
    id, name, pos, rotY = 0, appearance = {}, interact = {}, waypoints = [], patrolSpeed = 1.1,
}) {
    const Engine = window.Engine;
    const State = window.State;
    if (!Engine?.scene) return null;

    const npc = await spawnHumanWithAvatar({ id, appearance });
    npc.position.set(pos.x, pos.y ?? 0, pos.z);
    npc.rotation.y = rotY;
    npc.userData = {
        id,
        name,
        type: 'human',
        isHuman: true,
        isCharacter: true,
        locked: false,
        idleSeed: Math.random() * 4,
        thirdEyeTarget: true,
        ...interact,
    };
    Engine.scene.add(npc);
    State.objects.push(npc);
    if (waypoints.length > 1) NpcPatrol.register(npc, waypoints, patrolSpeed);
    return npc;
}

export function bootstrapStarterScene() {
    const World = window.World;
    const Engine = window.Engine;
    const State = window.State;
    const Physics = window.Physics;
    const THREE = window.THREE;
    if (!World || !Engine?.scene) return;

    if (State.objects.length > 1) return;

    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x2e3034,
        roughness: 0.88,
        metalness: 0.04,
        envMapIntensity: 0.22,
    });
    const groundSlab = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, 14), groundMat);
    groundSlab.position.set(0, 0.06, 0);
    groundSlab.receiveShadow = true;
    groundSlab.userData = { id: 'starter_ground', name: 'Starter Ground', type: 'platform', locked: true };
    Engine.scene.add(groundSlab);
    State.objects.push(groundSlab);
    const C = window.CANNON;
    if (C) {
        Physics?.addStaticBox?.(new C.Vec3(7, 0.06, 7), { x: 0, y: 0.06, z: 0 }, 'ground', 'concrete');
    }

    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x3a3e44,
        roughness: 0.82,
        metalness: 0.03,
        envMapIntensity: 0.2,
    });
    const backdrop = new THREE.Mesh(new THREE.BoxGeometry(16, 4.8, 0.4), wallMat);
    backdrop.position.set(0, 2.4, -7.2);
    backdrop.receiveShadow = true;
    backdrop.castShadow = true;
    backdrop.userData = { id: 'starter_wall', name: 'Starter Wall', type: 'prop', locked: true };
    Engine.scene.add(backdrop);
    State.objects.push(backdrop);

    const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(3.5, 3.8, 0.35, 32),
        new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.82, metalness: 0.06, envMapIntensity: 0.25 })
    );
    platform.position.set(0, 0.17, 0);
    platform.receiveShadow = true;
    platform.castShadow = true;
    platform.userData = { id: 'starter_platform', name: 'Welcome Platform', type: 'platform', locked: true };
    Engine.scene.add(platform);
    State.objects.push(platform);
    if (C) Physics?.addStaticBox?.(new C.Vec3(3.8, 0.175, 3.8), { x: 0, y: 0.175, z: 0 }, 'ground', 'concrete');

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.2, 0.06, 12, 48),
        new THREE.MeshStandardMaterial({ color: 0x2a8844, emissive: 0x1a4428, emissiveIntensity: 0.1, roughness: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.36, 0);
    ring.userData = { id: 'starter_ring', name: 'Portal Ring', type: 'decor', locked: true, isRotating: true };
    Engine.scene.add(ring);
    State.objects.push(ring);

    const beacon = World.createObject('sphere', 'Starter Beacon', 0x00ffaa, false);
    if (beacon) {
        beacon.position.set(-2.2, 1.2, 1.8);
        beacon.scale.setScalar(0.55);
        beacon.material.emissive.setHex(0x00ffaa);
        beacon.material.emissiveIntensity = 0.18;
    }

    const crate = World.createObject('cube', 'Build Zone', 0x4455aa, true);
    if (crate) {
        crate.position.set(2.4, 0.5, -1.6);
        crate.scale.set(0.9, 0.9, 0.9);
        crate.userData.id = 'starter_crate';
        crate.userData.soundTrigger = 'collision';
        crate.userData.mass = 8;
        crate.userData.friction = 0.5;
        crate.userData.restitution = 0.08;
        const entry = State.physicsObjects.find((p) => p.mesh === crate);
        if (entry?.body) {
            entry.body.mass = 8;
            entry.body.updateMassProperties();
        }
    }

    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xa8c8dd,
        roughness: 0.06,
        metalness: 0.02,
        transmission: 0.82,
        transparent: true,
        opacity: 0.42,
        envMapIntensity: 0.35,
    });
    const glassPane = World.addCustom(
        new THREE.BoxGeometry(1.35, 0.85, 0.045),
        glassMat,
        'Glass Pane',
        true
    );
    if (glassPane) {
        glassPane.position.set(-1.15, 1.05, -2.75);
        const glassBody = State.physicsObjects.find((p) => p.mesh === glassPane)?.body;
        if (glassBody) {
            glassBody.position.set(glassPane.position.x, glassPane.position.y, glassPane.position.z);
            glassBody.velocity.set(0, 0, 0);
            glassBody.mass = 0.5;
            glassBody.updateMassProperties();
        }
        Object.assign(glassPane.userData, {
            id: 'glass_pane',
            name: 'Glass Pane',
            type: 'prop',
            locked: false,
            fragile: true,
            soundTrigger: 'collision',
            mass: 0.5,
            friction: 0.32,
            restitution: 0.04,
        });
    }

    const targetMat = new THREE.MeshStandardMaterial({
        color: 0x8899aa,
        roughness: 0.38,
        metalness: 0.72,
        envMapIntensity: 0.4,
    });
    const gunTarget = new THREE.Group();
    gunTarget.name = 'gun_target';
    const targetPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.1, 10), targetMat);
    targetPost.position.y = 0.55;
    const targetDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 20), targetMat);
    targetDisc.position.y = 1.15;
    targetDisc.rotation.x = Math.PI / 2;
    gunTarget.add(targetPost, targetDisc);
    gunTarget.position.set(3.15, 0, -2.15);
    gunTarget.userData = {
        id: 'gun_target',
        name: 'Shooting Target',
        type: 'prop',
        locked: true,
        soundTrigger: 'collision',
    };
    Engine.scene.add(gunTarget);
    State.objects.push(gunTarget);

    const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.78, metalness: 0.05 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.42, 0.45), benchMat);
    bench.position.set(-2.8, 0.21, -0.6);
    bench.castShadow = true;
    bench.receiveShadow = true;
    bench.userData = { id: 'starter_bench', name: 'Starter Bench', type: 'prop', locked: true };
    Engine.scene.add(bench);
    State.objects.push(bench);

    const stripeMat = new THREE.MeshStandardMaterial({
        color: 0xdaba44,
        roughness: 0.75,
        metalness: 0.04,
    });
    [-2.6, 0, 2.6].forEach((x, i) => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 2.8), stripeMat.clone());
        stripe.position.set(x, 0.355, -3.15 + i * 0.04);
        stripe.rotation.y = i * 0.02;
        stripe.receiveShadow = true;
        stripe.userData = { id: `starter_stripe_${i}`, name: 'Starter Stripe', type: 'decor', locked: true };
        Engine.scene.add(stripe);
        State.objects.push(stripe);
    });

    const barrierMat = new THREE.MeshStandardMaterial({
        color: 0x5a6068,
        roughness: 0.45,
        metalness: 0.35,
        envMapIntensity: 0.35,
    });
    const barrier = new THREE.Group();
    barrier.name = 'starter_barrier';
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.95, 10), barrierMat);
    postL.position.set(-0.55, 0.48, -3.45);
    const postR = postL.clone();
    postR.position.x = 0.55;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.07), barrierMat);
    rail.position.set(0, 0.82, -3.45);
    const rail2 = rail.clone();
    rail2.position.y = 0.58;
    barrier.add(postL, postR, rail, rail2);
    barrier.userData = { id: 'starter_barrier', name: 'Starter Barrier', type: 'prop', locked: true };
    Engine.scene.add(barrier);
    State.objects.push(barrier);

    const terminal = spawnAiTerminal({
        pos: { x: 2.6, y: 0, z: 0.8 },
        rotY: -0.65,
        interactHint: 'AI Build — Grok · agents · local model',
    });

    const modelKiosk = spawnAiTerminal({
        id: 'model_kiosk',
        name: 'Model Kiosk',
        pos: { x: -2.4, y: 0, z: 1.6 },
        rotY: 0.75,
        interactAction: 'skin',
        interactLabel: 'Model Kiosk',
        interactHint: 'Assign local avatar / GLTF skin',
    });

    void spawnStarterNpc({
        id: 'guide_npc',
        name: 'Alex',
        pos: { x: 1.6, y: 0, z: 2.2 },
        rotY: Math.PI * 0.95,
        appearance: {
            bodyColor: 0x3d4f66,
            pantsColor: 0x232830,
            skinColor: 0xe8b896,
            hairColor: 0x2a1810,
        },
        interact: {
            interactAction: 'prompter',
            interactLabel: 'Alex — build guide',
            interactHint: 'Talk to Alex — open PromptGen',
            interactRadius: 2.2,
        },
    });

    void spawnStarterNpc({
        id: 'guard_npc',
        name: 'Jordan',
        pos: { x: 2.8, y: 0, z: -1.8 },
        rotY: -0.4,
        appearance: {
            bodyColor: 0x2a3d52,
            pantsColor: 0x1a2028,
            skinColor: 0xd4a882,
            hairColor: 0x121010,
        },
        interact: {
            interactAction: 'insert',
            interactLabel: 'Jordan — range officer',
            interactHint: 'Jordan — try the shooting lane (G)',
            interactRadius: 2.4,
        },
        waypoints: [
            { x: 2.8, z: -1.8 },
            { x: 3.4, z: -2.5 },
            { x: 2.2, z: -2.8 },
            { x: 1.8, z: -1.6 },
        ],
        patrolSpeed: 1.05,
    });

    void spawnStarterNpc({
        id: 'mechanic_npc',
        name: 'Sam',
        pos: { x: -1.2, y: 0, z: 0.4 },
        rotY: 0.5,
        appearance: {
            bodyColor: 0x6b4428,
            pantsColor: 0x2a2830,
            skinColor: 0xc99872,
            hairColor: 0x3a2818,
        },
        interact: {
            interactAction: 'agents',
            interactLabel: 'Sam — mechanic',
            interactHint: 'Sam — vehicles & drive tips',
            interactRadius: 2.3,
        },
        waypoints: [
            { x: -1.2, z: 0.4 },
            { x: -2.2, z: 1.2 },
            { x: -2.6, z: 0.2 },
            { x: -1.6, z: -0.5 },
        ],
        patrolSpeed: 0.95,
    });

    seedStarterSounds().then(() => {
        wireStarterSounds();
    });
    wireStarterTextures().then((tex) => {
        if (tex.maps) window.UI?.status?.(`Starter textures applied (${tex.maps} maps)`);
    });

    if (terminal && modelKiosk) {
        window.UI?.status?.('TPS walk — E interact · G shoot · V view · T Third Eye · Shift sprint');
    }

    State.ctxTargetPos.set(0, 0, 0);
    State.introFrom = { x: 0, y: 18, z: 22 };
    State.introTo = { x: 8, y: 7, z: 10 };
    State.introTarget = { x: 0, y: 1.2, z: 0 };
    State.introStart = performance.now();
    State.introDuration = 2800;
    State.introPlaying = true;

    if (Engine.camera && Engine.controls) {
        Engine.camera.position.set(State.introFrom.x, State.introFrom.y, State.introFrom.z);
        Engine.controls.target.set(State.introTarget.x, State.introTarget.y, State.introTarget.z);
    }

    scheduleStarterPlayerSpawn();
}

function scheduleStarterPlayerSpawn() {
    const Network = window.Network;
    const Session = window.Session;
    const PlayerController = window.PlayerController;
    const State = window.State;
    if (!PlayerController || !State) return;
    if (Network?.mode === 'spectate' || Session?.isSpectator) return;

    const delay = (State.introDuration || 2800) + 350;
    setTimeout(() => {
        if (PlayerController.spawned) return;
        const pos = State.introTarget || { x: 0, y: 1.2, z: 0 };
        PlayerController.spawn(pos.x, Math.max(pos.y, 1.2), pos.z + 1.8).catch(() => {});
        State.controlMode = 'walk';
        State.viewMode = 'tps';
        window.UI?.updateControlMode?.();
        window.ThirdEye?.updateHud?.();
        window.UI?.status('Spawned — action controls ready (V FPS/TPS · T Third Eye)');
    }, delay);
}

window.bootstrapStarterScene = bootstrapStarterScene;