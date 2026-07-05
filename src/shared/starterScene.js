export function bootstrapStarterScene() {
    const World = window.World;
    const Engine = window.Engine;
    const State = window.State;
    const HumanMesh = window.HumanMesh;
    const THREE = window.THREE;
    if (!World || !Engine?.scene) return;

    if (State.objects.length > 1) return;

    const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(3.5, 3.8, 0.35, 32),
        new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.55, metalness: 0.25 })
    );
    platform.position.set(0, 0.17, 0);
    platform.receiveShadow = true;
    platform.castShadow = true;
    platform.userData = { id: 'starter_platform', name: 'Welcome Platform', type: 'platform', locked: true };
    Engine.scene.add(platform);
    State.objects.push(platform);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.2, 0.06, 12, 48),
        new THREE.MeshStandardMaterial({ color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 0.45, roughness: 0.3 })
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
        beacon.material.emissiveIntensity = 0.6;
    }

    const crate = World.createObject('cube', 'Build Zone', 0x4455aa, true);
    if (crate) {
        crate.position.set(2.4, 0.5, -1.6);
        crate.scale.set(0.9, 0.9, 0.9);
        crate.userData.soundTrigger = 'collision';
        crate.userData.mass = 2.5;
        crate.userData.friction = 0.45;
        crate.userData.restitution = 0.2;
    }

    const depthLayers = [0x888888, 0x555555, 0x333333];
    depthLayers.forEach((col, i) => {
        const m = World.createObject('cube', `Depth_${i}`, col, false);
        if (m) {
            m.position.set(-3.5 + i * 1.2, 1.2, -4 - i * 2.5);
            m.scale.set(0.7, 1.4, 0.5);
            m.material.emissive.setHex(col);
            m.material.emissiveIntensity = 0.12;
        }
    });

    const guide = HumanMesh.build({ bodyColor: 0x39ff14, pantsColor: 0x222233, skinColor: 0xffd4b8 });
    if (guide) {
        guide.position.set(-1.2, 0, 2.8);
        guide.rotation.y = Math.PI * 0.85;
        guide.userData = {
            id: 'guide_npc',
            name: 'Guide',
            type: 'human',
            isHuman: true,
            isCharacter: true,
            locked: false,
            idleSeed: 1.2,
        };
        Engine.scene.add(guide);
        State.objects.push(guide);
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
        PlayerController.spawn(pos.x, Math.max(pos.y, 1.2), pos.z + 1.8);
        State.controlMode = 'walk';
        window.UI?.updateControlMode?.();
        window.UI?.status('You spawned on the platform — WASD walk, Space jump, PLAY to test physics');
    }, delay);
}

window.bootstrapStarterScene = bootstrapStarterScene;