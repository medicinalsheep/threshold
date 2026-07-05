/** Phase 16 — urban highway props: traffic lights, billboard, construction zone */

function makeBillboardTexture(THREE) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const bands = ['#1a4a6a', '#2a6a8a', '#e8c040', '#c84830', '#1a4a6a'];
    const bandH = size / bands.length;
    bands.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, i * bandH, size, bandH);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 28px system-ui,sans-serif';
    ctx.fillText('THRESHOLD', 24, 52);
    ctx.font = '18px system-ui,sans-serif';
    ctx.fillText('HIGHWAY 16', 24, 82);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1.2, 1);
    return tex;
}

export function buildStarterUrban16() {
    const Engine = window.Engine;
    const State = window.State;
    const THREE = window.THREE;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'starter_traffic_lights')) {
        return null;
    }

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.42, metalness: 0.48 });

    // —— Junction traffic lights ——
    const lightsGroup = new THREE.Group();
    lightsGroup.name = 'starter_traffic_lights';
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 8), poleMat);
    pole.position.y = 1.7;
    const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.72, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.55, metalness: 0.35 })
    );
    housing.position.y = 3.5;

    const lightSpecs = [
        { color: 0xff2020, emissive: 0xff1010, y: 0.22, phase: 'red' },
        { color: 0xffc820, emissive: 0xffa800, y: 0, phase: 'yellow' },
        { color: 0x30e850, emissive: 0x18c838, y: -0.22, phase: 'green' },
    ];
    const bulbs = {};
    lightSpecs.forEach((spec) => {
        const mat = new THREE.MeshStandardMaterial({
            color: spec.color,
            emissive: spec.emissive,
            emissiveIntensity: 0.02,
            roughness: 0.35,
            metalness: 0.1,
        });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), mat);
        bulb.position.y = spec.y;
        bulb.userData.trafficPhase = spec.phase;
        bulbs[spec.phase] = bulb;
        housing.add(bulb);
    });

    lightsGroup.add(pole, housing);
    lightsGroup.position.set(7.8, 0, -3.6);
    lightsGroup.rotation.y = -0.35;
    lightsGroup.userData = {
        id: 'starter_traffic_lights',
        name: 'Traffic Lights',
        type: 'prop',
        locked: true,
        animTrafficLights: true,
        trafficBulbs: bulbs,
        trafficPhase: 'green',
        trafficPhaseT: 0,
    };
    Engine.scene.add(lightsGroup);
    State.objects.push(lightsGroup);

    // —— Billboard ——
    const billboardGroup = new THREE.Group();
    billboardGroup.name = 'starter_billboard';
    const bbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.2, 8), poleMat);
    bbPole.position.y = 2.1;
    const bbTex = makeBillboardTexture(THREE);
    const bbFace = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 1.35),
        new THREE.MeshStandardMaterial({
            map: bbTex,
            emissive: 0x406080,
            emissiveMap: bbTex,
            emissiveIntensity: 0.35,
            roughness: 0.65,
            metalness: 0.05,
            side: THREE.DoubleSide,
        })
    );
    bbFace.position.set(0, 4.0, 0);
    billboardGroup.add(bbPole, bbFace);
    billboardGroup.position.set(9.4, 0, -4.2);
    billboardGroup.rotation.y = -0.55;
    billboardGroup.userData = {
        id: 'starter_billboard',
        name: 'Billboard',
        type: 'prop',
        locked: true,
        animBillboard: true,
        billboardMesh: bbFace,
        billboardTex: bbTex,
    };
    Engine.scene.add(billboardGroup);
    State.objects.push(billboardGroup);

    // —— Construction zone ——
    const constructionGroup = new THREE.Group();
    constructionGroup.name = 'starter_construction';
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xe86820, roughness: 0.72, metalness: 0.05 });
    const tapeMat = new THREE.MeshStandardMaterial({
        color: 0xf0d030,
        emissive: 0xc0a010,
        emissiveIntensity: 0.12,
        roughness: 0.6,
    });
    [-0.55, 0, 0.55].forEach((xOff, i) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 8), coneMat);
        cone.position.set(xOff, 0.19, 0);
        cone.castShadow = true;
        constructionGroup.add(cone);
        if (i < 2) {
            const tape = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.04), tapeMat);
            tape.position.set(xOff + 0.32, 0.28 + i * 0.12, 0);
            constructionGroup.add(tape);
        }
    });
    const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.55, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.48, metalness: 0.32 })
    );
    barrier.position.set(0, 0.28, -0.35);
    constructionGroup.add(barrier);
    constructionGroup.position.set(5.4, 0, -1.35);
    constructionGroup.rotation.y = 0.25;
    constructionGroup.userData = {
        id: 'starter_construction',
        name: 'Construction Zone',
        type: 'prop',
        locked: true,
        urbanHint: 'construction',
        ambientZone: 'construction',
    };
    Engine.scene.add(constructionGroup);
    State.objects.push(constructionGroup);

    return { lights: lightsGroup, billboard: billboardGroup, construction: constructionGroup };
}

const TRAFFIC_CYCLE = [
    { phase: 'green', duration: 5 },
    { phase: 'yellow', duration: 1.2 },
    { phase: 'red', duration: 4 },
];

export const StarterUrban16 = {
    wireAnims() {
        const lights = window.State?.objects?.find((o) => o.userData?.animTrafficLights);
        const billboard = window.State?.objects?.find((o) => o.userData?.animBillboard);

        if (lights?.userData?.trafficBulbs) {
            const bulbs = lights.userData.trafficBulbs;
            let cycleIdx = 0;
            let phaseElapsed = 0;
            window.StarterAnim?.registerStarterAnim?.((t, dt) => {
                phaseElapsed += dt;
                const step = TRAFFIC_CYCLE[cycleIdx];
                if (phaseElapsed >= step.duration) {
                    phaseElapsed = 0;
                    cycleIdx = (cycleIdx + 1) % TRAFFIC_CYCLE.length;
                    lights.userData.trafficPhase = TRAFFIC_CYCLE[cycleIdx].phase;
                }
                const active = lights.userData.trafficPhase;
                ['red', 'yellow', 'green'].forEach((p) => {
                    const bulb = bulbs[p];
                    if (!bulb?.material) return;
                    const on = p === active;
                    bulb.material.emissiveIntensity = on ? (p === 'yellow' ? 0.75 : 0.95) : 0.02;
                });
            });
        }

        if (billboard?.userData?.billboardTex) {
            const tex = billboard.userData.billboardTex;
            const mesh = billboard.userData.billboardMesh;
            window.StarterAnim?.registerStarterAnim?.((t) => {
                tex.offset.x = (t * 0.08) % 1;
                if (mesh?.material) {
                    mesh.material.emissiveIntensity = 0.28 + Math.sin(t * 2.4) * 0.08;
                }
            });
        }
    },
};

window.StarterUrban16 = StarterUrban16;
window.buildStarterUrban16 = buildStarterUrban16;