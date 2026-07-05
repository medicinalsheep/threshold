/** Phase 14 — creek, power lines, fence chain, dirt mound + dust */

let dustPoints = null;
let dustVel = null;
let dustData = null;

export function buildStarterEnv14() {
    const Engine = window.Engine;
    const State = window.State;
    const Physics = window.Physics;
    const THREE = window.THREE;
    const C = window.CANNON;
    if (!Engine?.scene || !THREE || !State) return { creek: null, fence: null, mound: null, power: null };

    const SM = window.StarterMaterials;
    const mats = SM?.createStarterMaterials?.(THREE);
    const poleMat = mats?.pole || new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.42, metalness: 0.48 });

    // —— Creek / river ——
    const creekGroup = new THREE.Group();
    creekGroup.name = 'starter_creek';
    const creekBed = new THREE.Mesh(
        new THREE.BoxGeometry(4.8, 0.06, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.92, metalness: 0.02 })
    );
    creekBed.position.y = 0.01;
    creekBed.receiveShadow = true;
    const creekWater = new THREE.Mesh(
        new THREE.PlaneGeometry(4.6, 0.95),
        new THREE.MeshPhysicalMaterial({
            color: 0x2a6a78,
            roughness: 0.12,
            metalness: 0.02,
            transmission: 0.55,
            transparent: true,
            opacity: 0.72,
            envMapIntensity: 0.35,
        })
    );
    creekWater.rotation.x = -Math.PI / 2;
    creekWater.position.y = 0.045;
    creekGroup.add(creekBed, creekWater);
    creekGroup.position.set(-5.4, 0, 0.6);
    creekGroup.userData = {
        id: 'starter_creek',
        name: 'Creek',
        type: 'prop',
        locked: true,
        animCreek: true,
        creekWaterMesh: creekWater,
        ambientZone: 'creek',
    };
    Engine.scene.add(creekGroup);
    State.objects.push(creekGroup);
    if (C) Physics?.addStaticBox?.(new C.Vec3(2.4, 0.03, 0.55), { x: -5.4, y: 0.03, z: 0.6 }, 'ground', 'concrete');

    // —— Power lines ——
    const powerGroup = new THREE.Group();
    powerGroup.name = 'starter_power_lines';
    const cables = [];
    const polePositions = [
        { x: -3.8, z: -6.1 },
        { x: 3.6, z: -6.0 },
    ];
    polePositions.forEach((p, i) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.2, 6), poleMat);
        pole.position.set(p.x, 2.6, p.z);
        pole.castShadow = true;
        powerGroup.add(pole);
        const cross = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), poleMat);
        cross.position.set(p.x + (i === 0 ? 0.35 : -0.35), 4.9, p.z);
        powerGroup.add(cross);
    });
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.35, metalness: 0.65 });
    for (let c = 0; c < 3; c += 1) {
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 7.6, 6), cableMat);
        cable.rotation.z = Math.PI / 2;
        cable.rotation.y = 0.04;
        cable.position.set(0, 4.55 - c * 0.22, -6.05);
        cable.userData.swayPhase = c * 1.4;
        cables.push(cable);
        powerGroup.add(cable);
    }
    powerGroup.userData = {
        id: 'starter_power_lines',
        name: 'Power Lines',
        type: 'prop',
        locked: true,
        animPowerLines: true,
        cableMeshes: cables,
        ambientZone: 'power_hum',
    };
    Engine.scene.add(powerGroup);
    State.objects.push(powerGroup);

    // —— Chain fence ——
    const fenceGroup = new THREE.Group();
    fenceGroup.name = 'starter_fence';
    const fenceMat = mats?.metal || new THREE.MeshStandardMaterial({ color: 0x6a6e72, roughness: 0.38, metalness: 0.72 });
    const postGeo = new THREE.CylinderGeometry(0.035, 0.04, 1.05, 6);
    [-1.8, -0.6, 0.6, 1.8].forEach((xOff) => {
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(xOff, 0.52, -1.15);
        post.castShadow = true;
        fenceGroup.add(post);
    });
    for (let row = 0; row < 4; row += 1) {
        const wire = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.025, 0.025), fenceMat);
        wire.position.set(0, 0.35 + row * 0.18, -1.15);
        wire.userData.fenceWire = true;
        fenceGroup.add(wire);
    }
    fenceGroup.position.set(-4.8, 0, 0);
    fenceGroup.userData = {
        id: 'starter_fence',
        name: 'Chain Fence',
        type: 'prop',
        locked: true,
        animFence: true,
        fenceWires: fenceGroup.children.filter((c) => c.userData?.fenceWire),
    };
    Engine.scene.add(fenceGroup);
    State.objects.push(fenceGroup);

    // —— Dirt mound ——
    const moundMat = new THREE.MeshStandardMaterial({
        color: 0x6e5840,
        roughness: 0.94,
        metalness: 0.02,
        envMapIntensity: 0.2,
        roughnessMap: mats?.noise || null,
    });
    if (moundMat.roughnessMap) {
        moundMat.roughnessMap.wrapS = THREE.RepeatWrapping;
        moundMat.roughnessMap.wrapT = THREE.RepeatWrapping;
        moundMat.roughnessMap.repeat.set(3, 3);
    }
    const mound = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.38, 1.6), moundMat);
    mound.position.set(-3.4, 0.19, 3.6);
    mound.scale.set(1, 1, 0.85);
    mound.rotation.y = 0.35;
    mound.castShadow = true;
    mound.receiveShadow = true;
    mound.userData = {
        id: 'starter_dirt_mound',
        name: 'Dirt Mound',
        type: 'platform',
        locked: true,
        surfaceType: 'dirt',
        animDust: true,
    };
    Engine.scene.add(mound);
    State.objects.push(mound);
    if (C) Physics?.addStaticBox?.(new C.Vec3(1.1, 0.19, 0.8), { x: -3.4, y: 0.19, z: 3.6 }, 'ground', 'dirt');

    _ensureDustParticles(THREE, Engine);

    return { creek: creekGroup, fence: fenceGroup, mound, power: powerGroup };
}

function _ensureDustParticles(THREE, Engine) {
    if (dustPoints) return;
    const count = 140;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = -3.4 + (Math.random() - 0.5) * 2;
        pos[i * 3 + 1] = 0.35 + Math.random() * 0.5;
        pos[i * 3 + 2] = 3.6 + (Math.random() - 0.5) * 1.4;
        vel[i] = 0.4 + Math.random() * 0.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
        color: 0x9a8068,
        size: 0.06,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
    });
    dustPoints = new THREE.Points(geo, mat);
    dustPoints.visible = false;
    dustPoints.userData = { id: 'starter_dust_particles', type: 'weather', locked: true };
    dustVel = vel;
    dustData = pos;
    Engine.scene.add(dustPoints);
}

export const StarterEnv14 = {
    _dustBurst: 0,
    _fenceRattleCooldown: 0,

    wireAnims() {
        const State = window.State;
        const objects = State?.objects || [];
        const creek = objects.find((o) => o.userData?.animCreek);
        const power = objects.find((o) => o.userData?.animPowerLines);
        const fence = objects.find((o) => o.userData?.animFence);
        const mound = objects.find((o) => o.userData?.animDust);

        if (creek?.userData?.creekWaterMesh) {
            const water = creek.userData.creekWaterMesh;
            window.StarterAnim?.registerStarterAnim?.((t) => {
                if (water.material) {
                    const flow = t * 0.35;
                    water.material.opacity = 0.68 + Math.sin(t * 2.1) * 0.06;
                    if (water.material.map) {
                        water.material.map.offset.x = flow % 1;
                        water.material.map.offset.y = Math.sin(t * 0.8) * 0.02;
                    }
                }
            });
        }

        if (power?.userData?.cableMeshes) {
            const cables = power.userData.cableMeshes;
            const rain = () => window.WeatherSystem?.getIntensity?.() ?? 0;
            window.StarterAnim?.registerStarterAnim?.((t, dt) => {
                const wind = 0.04 + rain() * 0.12;
                cables.forEach((cable, i) => {
                    const phase = cable.userData.swayPhase ?? 0;
                    cable.rotation.x = Math.sin(t * 1.1 + phase) * wind;
                    cable.position.y = 4.55 - i * 0.22 + Math.sin(t * 0.9 + phase) * 0.04 * (1 + rain());
                });
            });
        }

        if (fence?.userData?.fenceWires) {
            const wires = fence.userData.fenceWires;
            window.StarterAnim?.registerStarterAnim?.((t) => {
                const gust = window.WeatherSystem?.getIntensity?.() ?? 0;
                const amp = 0.008 + gust * 0.025;
                wires.forEach((wire, i) => {
                    wire.rotation.z = Math.sin(t * 2.4 + i * 0.7) * amp;
                });
            });
        }

        if (mound) {
            window.StarterAnim?.registerStarterAnim?.((t, dt) => {
                StarterEnv14._tickDust(t, dt, mound);
            });
        }
    },

    _tickDust(t, dt, mound) {
        if (!dustPoints || !dustData) return;
        const PC = window.PlayerController;
        const listener = PC?.spawned && PC.group ? PC.group.position : window.Engine?.camera?.position;
        if (!listener) return;

        const dx = listener.x - mound.position.x;
        const dz = listener.z - mound.position.z;
        const near = Math.hypot(dx, dz) < 5.5;
        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        const active = near && (this._dustBurst > 0 || rain > 0.25);

        dustPoints.visible = active;
        if (!active) return;

        const pos = dustData;
        const vel = dustVel;
        const wind = Math.sin(t * 1.3) * 0.4 + rain * 0.5;
        const burst = this._dustBurst > 0 ? 1.8 : 1;
        for (let i = 0; i < vel.length; i++) {
            pos[i * 3] += wind * dt * 0.35 * burst;
            pos[i * 3 + 1] += vel[i] * dt * 0.12 * burst;
            pos[i * 3 + 2] += Math.sin(t + i) * dt * 0.08;
            if (pos[i * 3 + 1] > 0.9 || pos[i * 3] > mound.position.x + 1.2) {
                pos[i * 3] = mound.position.x + (Math.random() - 0.5) * 1.8;
                pos[i * 3 + 1] = mound.position.y + 0.2 + Math.random() * 0.15;
                pos[i * 3 + 2] = mound.position.z + (Math.random() - 0.5) * 1.2;
            }
        }
        dustPoints.geometry.attributes.position.needsUpdate = true;
        if (dustPoints.material) {
            dustPoints.material.opacity = 0.22 + rain * 0.2 + Math.min(0.35, this._dustBurst);
        }
        if (this._dustBurst > 0) this._dustBurst = Math.max(0, this._dustBurst - dt);
    },

    onWindGust() {
        const now = performance.now();
        if (now < this._fenceRattleCooldown) return;
        this._fenceRattleCooldown = now + 2200 + Math.random() * 3000;

        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        if (rain < 0.28) return;

        const fence = window.State?.objects?.find((o) => o.userData?.id === 'starter_fence');
        if (!fence) return;

        const PC = window.PlayerController;
        const pos = PC?.spawned && PC.group ? PC.group.position : window.Engine?.camera?.position;
        if (pos) {
            const dx = pos.x - fence.position.x;
            const dz = pos.z - fence.position.z;
            if (Math.hypot(dx, dz) > 14) return;
        }

        window.AudioSys?.playClipVariation?.('starter_fence_rattle', {
            volume: 0.22 + rain * 0.28 + Math.random() * 0.12,
            playbackRate: 0.88 + Math.random() * 0.2,
        });

        this._dustBurst = 0.85;
    },
};

window.StarterEnv14 = StarterEnv14;
window.buildStarterEnv14 = buildStarterEnv14;