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
        new THREE.MeshStandardMaterial({ color: 0xff3366, emissive: 0xff3366, emissiveIntensity: 0.45, roughness: 0.3 })
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
    }

    const guide = HumanMesh.build({ bodyColor: 0xff3366, pantsColor: 0x222233, skinColor: 0xffd4b8 });
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
}

window.bootstrapStarterScene = bootstrapStarterScene;