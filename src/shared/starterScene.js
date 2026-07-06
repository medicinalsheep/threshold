import { spawnAiTerminal } from './aiTerminal.js';
import { seedStarterSounds, wireStarterSounds } from './starterSfx.js';
import { wireStarterTextures } from './starterTex.js';
import { NpcPatrol } from './npcPatrol.js';
import { spawnHumanWithAvatar } from './avatarLoader.js';

function addSurfacePad({ id, name, surfaceType, pos, size, color, matOpts = {} }) {
    const Engine = window.Engine;
    const State = window.State;
    const Physics = window.Physics;
    const THREE = window.THREE;
    const C = window.CANNON;
    if (!Engine?.scene || !THREE) return null;

    const mat = new THREE.MeshStandardMaterial({
        color: color ?? 0x444448,
        roughness: matOpts.roughness ?? 0.86,
        metalness: matOpts.metalness ?? 0.04,
        envMapIntensity: 0.22,
        ...matOpts,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.userData = {
        id,
        name,
        type: 'platform',
        locked: true,
        surfaceType,
    };
    Engine.scene.add(mesh);
    State.objects.push(mesh);
    if (C && Physics?.addStaticBox) {
        Physics.addStaticBox(
            new C.Vec3(size.x / 2, size.y / 2, size.z / 2),
            { x: pos.x, y: pos.y, z: pos.z },
            'ground',
            surfaceType
        );
    }
    return mesh;
}

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
        new THREE.CylinderGeometry(3.5, 3.8, 0.35, 16),
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
        new THREE.TorusGeometry(3.2, 0.06, 8, 24),
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
    const targetPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.1, 6), targetMat);
    targetPost.position.y = 0.55;
    const targetDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 12), targetMat);
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

    addSurfacePad({
        id: 'starter_grass_patch',
        name: 'Grass Patch',
        surfaceType: 'grass',
        pos: { x: -4.2, y: 0.04, z: 2.4 },
        size: { x: 2.4, y: 0.08, z: 2.4 },
        color: 0x3a6e32,
    });
    addSurfacePad({
        id: 'starter_wood_deck',
        name: 'Wood Deck',
        surfaceType: 'wood',
        pos: { x: 4.2, y: 0.05, z: 2.2 },
        size: { x: 2.6, y: 0.1, z: 2.0 },
        color: 0x6e5238,
        matOpts: { roughness: 0.82 },
    });
    addSurfacePad({
        id: 'starter_gravel_path',
        name: 'Gravel Path',
        surfaceType: 'gravel',
        pos: { x: -4.0, y: 0.035, z: -2.8 },
        size: { x: 2.8, y: 0.07, z: 1.6 },
        color: 0x6a6864,
    });
    addSurfacePad({
        id: 'starter_asphalt_lane',
        name: 'Asphalt Lane',
        surfaceType: 'asphalt',
        pos: { x: 4.0, y: 0.035, z: -2.6 },
        size: { x: 2.6, y: 0.07, z: 1.8 },
        color: 0x2a2c30,
    });
    addSurfacePad({
        id: 'starter_metal_grate',
        name: 'Metal Grate',
        surfaceType: 'metal',
        pos: { x: 2.2, y: 0.04, z: 0.6 },
        size: { x: 1.2, y: 0.08, z: 1.2 },
        color: 0x5a5e66,
        matOpts: { metalness: 0.55, roughness: 0.42 },
    });

    const bannerMat = new THREE.MeshStandardMaterial({
        color: 0x6a5888,
        roughness: 0.92,
        metalness: 0.02,
        side: THREE.DoubleSide,
        envMapIntensity: 0.18,
    });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), bannerMat);
    banner.position.set(-5.8, 1.35, -1.2);
    banner.rotation.y = Math.PI / 2;
    banner.castShadow = true;
    banner.receiveShadow = true;
    banner.userData = { id: 'starter_banner', name: 'Fabric Banner', type: 'decor', locked: true };
    Engine.scene.add(banner);
    State.objects.push(banner);

    const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.78, metalness: 0.05 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.42, 0.45), benchMat);
    bench.position.set(-2.8, 0.21, -0.6);
    bench.castShadow = true;
    bench.receiveShadow = true;
    bench.userData = { id: 'starter_bench', name: 'Starter Bench', type: 'prop', locked: true };
    Engine.scene.add(bench);
    State.objects.push(bench);

    const SM = window.StarterMaterials;
    const starterMats = SM?.createStarterMaterials?.(THREE);
    const stripeMat = starterMats?.stripe || new THREE.MeshStandardMaterial({
        color: 0xdaba44,
        roughness: 0.75,
        metalness: 0.04,
    });
    [-2.6, 0, 2.6].forEach((x, i) => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 2.8), stripeMat);
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
    const highwayMat = starterMats?.asphalt || new THREE.MeshStandardMaterial({
        color: 0x24262a, roughness: 0.92, metalness: 0.02, envMapIntensity: 0.18,
    });
    const highway = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.08, 3.2), highwayMat);
    highway.position.set(6.2, 0.04, -3.0);
    highway.receiveShadow = true;
    highway.userData = { id: 'starter_highway', name: 'Highway Strip', type: 'platform', locked: true, surfaceType: 'asphalt' };
    Engine.scene.add(highway);
    State.objects.push(highway);
    if (C) Physics?.addStaticBox?.(new C.Vec3(2.75, 0.04, 1.6), { x: 6.2, y: 0.04, z: -3.0 }, 'ground', 'asphalt');

    const dashMat = starterMats?.dash || new THREE.MeshStandardMaterial({
        color: 0xe8d070, roughness: 0.7, emissive: 0x3a3010, emissiveIntensity: 0.1,
    });
    const dashGeo = SM?.cachedGeo?.('dash_box', () => new THREE.BoxGeometry(0.45, 0.015, 0.12))
        || new THREE.BoxGeometry(0.45, 0.015, 0.12);
    const dashMesh = new THREE.InstancedMesh(dashGeo, dashMat, 2);
    dashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dashDummy = new THREE.Object3D();
    [-0.8, 1.4].forEach((zOff, i) => {
        dashDummy.position.set(6.2 + (i % 2 ? 0.3 : -0.3), 0.09, -3.8 + zOff);
        dashDummy.updateMatrix();
        dashMesh.setMatrixAt(i, dashDummy.matrix);
    });
    dashMesh.instanceMatrix.needsUpdate = true;
    dashMesh.userData = { id: 'starter_highway_dashes', name: 'Highway Marking', type: 'decor', locked: true, animDash: true };
    Engine.scene.add(dashMesh);
    State.objects.push(dashMesh);

    const lampGroup = new THREE.Group();
    lampGroup.name = 'street_lamp';
    const poleMat = starterMats?.pole || new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.4, metalness: 0.55 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 6), poleMat);
    pole.position.y = 1.6;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), poleMat);
    arm.position.set(0.25, 3.1, 0);
    const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfff0d8, emissive: 0xffe8c0, emissiveIntensity: 0.55, roughness: 0.3,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), bulbMat);
    bulb.position.set(0.52, 3.05, 0);
    const lampLight = new THREE.PointLight(0xffe8c8, 0.9, 12, 1.6);
    lampLight.position.set(0.52, 2.9, 0);
    lampGroup.add(pole, arm, bulb, lampLight);
    lampGroup.position.set(8.2, 0, -2.2);
    lampGroup.userData = { id: 'starter_lamp', name: 'Street Lamp', type: 'prop', locked: true, animLamp: true, bulbMesh: bulb };
    Engine.scene.add(lampGroup);
    State.objects.push(lampGroup);

    const windmill = new THREE.Group();
    windmill.name = 'starter_windmill';
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.4, 6), poleMat);
    tower.position.y = 1.2;
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), poleMat);
    hub.position.y = 2.45;
    const bladeMat = starterMats?.blade || new THREE.MeshStandardMaterial({
        color: 0x6a7078, roughness: 0.55, metalness: 0.25,
    });
    const bladeGeo = SM?.cachedGeo?.('wind_blade', () => new THREE.BoxGeometry(0.08, 0.9, 0.04))
        || new THREE.BoxGeometry(0.08, 0.9, 0.04);
    const blades = new THREE.Group();
    blades.position.y = 2.45;
    for (let b = 0; b < 3; b += 1) {
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.45;
        blade.rotation.z = (b / 3) * Math.PI * 2;
        blades.add(blade);
    }
    windmill.add(tower, hub, blades);
    windmill.position.set(-7.5, 0, -4.5);
    windmill.userData = { id: 'starter_windmill', name: 'Wind Turbine', type: 'decor', locked: true, bladeGroup: blades };
    Engine.scene.add(windmill);
    State.objects.push(windmill);

    const birdMat = starterMats?.bird || new THREE.MeshStandardMaterial({ color: 0x2a2828, roughness: 0.82 });
    const birdGeo = SM?.cachedGeo?.('bird_cone', () => new THREE.ConeGeometry(0.06, 0.18, 4))
        || new THREE.ConeGeometry(0.06, 0.18, 4);
    const birdBases = [
        { x: -2.5, y: 3.2, z: -5.5 },
        { x: -1.4, y: 3.35, z: -5.8 },
        { x: -0.3, y: 3.5, z: -6.1 },
        { x: 0.8, y: 3.65, z: -6.4 },
    ];
    birdBases.forEach((base, b) => {
        const bird = new THREE.Mesh(birdGeo, birdMat);
        bird.rotation.x = Math.PI;
        bird.position.set(base.x, base.y, base.z);
        bird.userData = { id: `starter_bird_${b}`, name: 'Bird', type: 'decor', locked: true, animBird: true };
        Engine.scene.add(bird);
        State.objects.push(bird);
    });

    const barrier = new THREE.Group();
    barrier.name = 'starter_barrier';
    const barrierMatUse = starterMats?.barrier || barrierMat;
    const postGeo = SM?.cachedGeo?.('barrier_post', () => new THREE.CylinderGeometry(0.06, 0.07, 0.95, 6))
        || new THREE.CylinderGeometry(0.06, 0.07, 0.95, 6);
    const postL = new THREE.Mesh(postGeo, barrierMatUse);
    postL.position.set(-0.55, 0.48, -3.45);
    const postR = postL.clone();
    postR.position.x = 0.55;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.07), barrierMatUse);
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

    window.StarterAudio?.ensureStarterAudio?.({
        weatherDelay: 3200,
        weatherIntensity: 0.48,
    }).then((seed) => {
        if (seed?.skipped && seed.reason === 'manifest') {
            window.UI?.status?.('Starter audio ready (cached)');
        }
    });
    wireStarterTextures().then((tex) => {
        if (tex.maps) window.UI?.status?.(`Starter textures applied (${tex.maps} maps)`);
    });
    window.buildStarterEnv14?.();
    window.buildStarterWildlife15?.();
    window.buildStarterUrban16?.();
    window.buildStarterInterior17?.();
    window.buildStarterTeslaExterior18?.();
    window.buildStarterTeslaLab18?.();
    window.buildStarterTeslaInteract182?.();
    void window.spawnTeslaGuideNpc?.();
    window.StarterAnim?.wireScene?.();
    window.StarterEnv14?.wireAnims?.();
    window.StarterWildlife15?.wireAnims?.();
    window.StarterUrban16?.wireAnims?.();
    window.StarterInterior17?.wireAnims?.();
    window.StarterTeslaExterior18?.wireAnims?.();
    window.StarterTeslaLab18?.wireAnims?.();
    window.StarterTeslaInteract182?.wireAnims?.();

    if (terminal && modelKiosk) {
        window.UI?.status?.('Nikola patrols the lab — intro captions · coil radio zone west');
    }

    State.ctxTargetPos.set(0, 0, 0);
    State.introFrom = { x: -20, y: 26, z: -12 };
    State.introTo = { x: -32, y: 1.75, z: 10.5 };
    State.introTarget = { x: -32, y: 1.6, z: 1.5 };
    State.introStart = performance.now();
    State.introDuration = 6200;
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
        const spawn = window.EXTERIOR_SPAWN || { x: -32, y: 0, z: 12 };
        PlayerController.spawn(spawn.x, Math.max(spawn.y, 1.2), spawn.z).then(() => {
            PlayerController._inheritLookFromCamera?.();
            PlayerController._syncWalkOrbit?.();
        }).catch(() => {});
        State.controlMode = 'walk';
        State.viewMode = 'tps';
        window.UI?.updateControlMode?.();
        window.ThirdEye?.updateHud?.();
        window.UI?.status('Project site — WASD move · click canvas to look · F interact · enter lab doors');
    }, delay);
}

window.bootstrapStarterScene = bootstrapStarterScene;