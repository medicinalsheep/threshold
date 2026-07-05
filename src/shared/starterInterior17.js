/** Phase 17 — interior / RP props: coffee nook, door, elevator kiosk, shop counter */

export function buildStarterInterior17() {
    const Engine = window.Engine;
    const State = window.State;
    const THREE = window.THREE;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'starter_interior_coffee')) {
        return null;
    }

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4838, roughness: 0.82, metalness: 0.04 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a4e54, roughness: 0.78, metalness: 0.03 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x6a6e74, roughness: 0.38, metalness: 0.55 });

    // —— Coffee nook ——
    const coffeeGroup = new THREE.Group();
    coffeeGroup.name = 'starter_interior_coffee';
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.88, 0.55), woodMat);
    counter.position.set(0, 0.44, 0);
    counter.castShadow = true;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.1, 0.12), wallMat);
    backWall.position.set(0, 1.05, -0.32);
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 1.2), wallMat);
    sideWall.position.set(-0.95, 1.05, 0.15);
    const awning = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.06, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x8a4030, roughness: 0.72, emissive: 0x401810, emissiveIntensity: 0.08 })
    );
    awning.position.set(0, 2.15, 0.12);
    const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.28),
        new THREE.MeshStandardMaterial({
            color: 0xf0e8d8,
            emissive: 0xc8a060,
            emissiveIntensity: 0.22,
            roughness: 0.65,
            side: THREE.DoubleSide,
        })
    );
    sign.position.set(0, 1.75, 0.28);
    sign.rotation.y = 0.15;
    sign.userData.coffeeSign = true;
    coffeeGroup.add(counter, backWall, sideWall, awning, sign);
    coffeeGroup.position.set(-3.75, 0, 1.25);
    coffeeGroup.rotation.y = 0.42;
    coffeeGroup.userData = {
        id: 'starter_interior_coffee',
        name: 'Coffee Nook',
        type: 'prop',
        locked: true,
        interiorHint: 'coffee',
        ambientZone: 'coffee',
        signMesh: sign,
    };
    Engine.scene.add(coffeeGroup);
    State.objects.push(coffeeGroup);

    // —— Door (interact) ——
    const doorGroup = new THREE.Group();
    doorGroup.name = 'starter_interior_door';
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.05, 0.95), wallMat);
    frame.position.set(-0.48, 1.02, 0);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.95, 0.82), woodMat);
    door.position.set(0, 0.98, 0);
    door.castShadow = true;
    door.userData.doorLeaf = true;
    doorGroup.add(frame, door);
    doorGroup.position.set(-2.95, 0, 0.85);
    doorGroup.rotation.y = 0.35;
    doorGroup.userData = {
        id: 'starter_interior_door',
        name: 'Creaky Door',
        type: 'prop',
        locked: true,
        interactAction: 'rp',
        interactLabel: 'Creaky Door',
        interactHint: 'Push the door — RP entrance',
        interactRadius: 2.0,
        soundMode: 'clip',
        soundClipId: 'starter_interior_door_creak',
        soundTrigger: 'interact',
        doorMesh: door,
        doorOpen: 0,
    };
    Engine.scene.add(doorGroup);
    State.objects.push(doorGroup);

    // —— Elevator kiosk ——
    const elevatorGroup = new THREE.Group();
    elevatorGroup.name = 'starter_elevator_kiosk';
    const kioskBody = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.85, 0.28), metalMat);
    kioskBody.position.y = 0.92;
    const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.72, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x1a2228, emissive: 0x1a3040, emissiveIntensity: 0.15, roughness: 0.4 })
    );
    panel.position.set(0, 1.25, 0.16);
    const floorBtns = [];
    [1, 2, 3].forEach((floor, i) => {
        const btn = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.14, 0.03),
            new THREE.MeshStandardMaterial({
                color: 0x8899aa,
                emissive: 0x446688,
                emissiveIntensity: 0.12,
                roughness: 0.45,
            })
        );
        btn.position.set(-0.12 + i * 0.12, 1.05 - i * 0.18, 0.18);
        btn.userData.elevatorFloor = floor;
        floorBtns.push(btn);
        elevatorGroup.add(btn);
    });
    elevatorGroup.add(kioskBody, panel);
    elevatorGroup.position.set(-1.15, 0, -6.35);
    elevatorGroup.rotation.y = 0.05;
    elevatorGroup.userData = {
        id: 'starter_elevator_kiosk',
        name: 'Elevator Kiosk',
        type: 'prop',
        locked: true,
        interactAction: 'rp',
        interactLabel: 'Elevator',
        interactHint: 'Call elevator — floor ding',
        interactRadius: 2.2,
        soundMode: 'clip',
        soundClipId: 'starter_interior_elevator_ding',
        soundTrigger: 'interact',
        animElevator: true,
        floorButtons: floorBtns,
        activeFloor: 1,
        floorFlash: 0,
    };
    Engine.scene.add(elevatorGroup);
    State.objects.push(elevatorGroup);

    // —— Shop counter + register ——
    const shopGroup = new THREE.Group();
    shopGroup.name = 'starter_shop_counter';
    const shopCounter = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.92, 0.62), woodMat);
    shopCounter.position.y = 0.46;
    shopCounter.castShadow = true;
    const register = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.22, 0.32),
        new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.45, metalness: 0.35 })
    );
    register.position.set(0.35, 0.98, 0.05);
    const registerScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 0.12),
        new THREE.MeshStandardMaterial({
            color: 0x102820,
            emissive: 0x208850,
            emissiveIntensity: 0.35,
            roughness: 0.35,
        })
    );
    registerScreen.position.set(0.35, 1.02, 0.22);
    registerScreen.rotation.x = -0.25;
    registerScreen.userData.registerScreen = true;
    shopGroup.add(shopCounter, register, registerScreen);
    shopGroup.position.set(4.05, 0, 2.05);
    shopGroup.rotation.y = -0.55;
    shopGroup.userData = {
        id: 'starter_shop_counter',
        name: 'Corner Shop',
        type: 'prop',
        locked: true,
        interactAction: 'rp',
        interactLabel: 'Corner Shop',
        interactHint: 'Ring up purchase — cash register',
        interactRadius: 2.3,
        soundMode: 'clip',
        soundClipId: 'starter_interior_cash_register',
        soundTrigger: 'interact',
        registerScreen,
        registerFlash: 0,
    };
    Engine.scene.add(shopGroup);
    State.objects.push(shopGroup);

    return { coffee: coffeeGroup, door: doorGroup, elevator: elevatorGroup, shop: shopGroup };
}

export const StarterInterior17 = {
    wireAnims() {
        const door = window.State?.objects?.find((o) => o.userData?.id === 'starter_interior_door');
        const elevator = window.State?.objects?.find((o) => o.userData?.animElevator);
        const coffee = window.State?.objects?.find((o) => o.userData?.id === 'starter_interior_coffee');
        const shop = window.State?.objects?.find((o) => o.userData?.id === 'starter_shop_counter');

        if (door?.userData?.doorMesh) {
            const leaf = door.userData.doorMesh;
            window.StarterAnim?.registerStarterAnim?.((t, dt) => {
                const open = door.userData.doorOpen ?? 0;
                if (open > 0) {
                    door.userData.doorOpen = Math.max(0, open - dt * 0.55);
                }
                leaf.rotation.y = -door.userData.doorOpen * 0.85;
            });
        }

        if (elevator?.userData?.floorButtons) {
            const btns = elevator.userData.floorButtons;
            window.StarterAnim?.registerStarterAnim?.((t, dt) => {
                if (elevator.userData.floorFlash > 0) {
                    elevator.userData.floorFlash = Math.max(0, elevator.userData.floorFlash - dt);
                }
                const active = elevator.userData.activeFloor ?? 1;
                btns.forEach((btn) => {
                    if (!btn.material) return;
                    const lit = btn.userData.elevatorFloor === active;
                    const flash = elevator.userData.floorFlash > 0 && lit;
                    btn.material.emissiveIntensity = flash ? 0.85 : lit ? 0.35 : 0.1;
                });
            });
        }

        if (coffee?.userData?.signMesh?.material) {
            const sign = coffee.userData.signMesh;
            window.StarterAnim?.registerStarterAnim?.((t) => {
                sign.material.emissiveIntensity = 0.18 + Math.sin(t * 2.8) * 0.06;
            });
        }

        if (shop?.userData?.registerScreen?.material) {
            const screen = shop.userData.registerScreen;
            window.StarterAnim?.registerStarterAnim?.((t, dt) => {
                if (shop.userData.registerFlash > 0) {
                    shop.userData.registerFlash = Math.max(0, shop.userData.registerFlash - dt);
                }
                const flash = shop.userData.registerFlash > 0;
                screen.material.emissiveIntensity = flash ? 0.9 : 0.28 + Math.sin(t * 3.5) * 0.08;
            });
        }
    },

    onDoorInteract(door) {
        if (!door?.userData) return;
        door.userData.doorOpen = 1;
    },

    onElevatorInteract(kiosk) {
        if (!kiosk?.userData) return;
        const next = 1 + Math.floor(Math.random() * 3);
        kiosk.userData.activeFloor = next;
        kiosk.userData.floorFlash = 0.65;
    },

    onShopInteract(shop) {
        if (!shop?.userData) return;
        shop.userData.registerFlash = 0.55;
    },
};

window.StarterInterior17 = StarterInterior17;
window.buildStarterInterior17 = buildStarterInterior17;