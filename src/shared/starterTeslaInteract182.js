/** Phase 18.2 — lab interactables: rotary switch, vacuum tubes, Leyden jars, journal */

import { labPos } from './starterSiteLayout.js';

function glassJarMat(THREE, tint = 0xc8dce8) {
    return new THREE.MeshPhysicalMaterial({
        color: tint,
        roughness: 0.04,
        metalness: 0.02,
        transmission: 0.82,
        transparent: true,
        opacity: 0.55,
        thickness: 0.35,
        ior: 1.48,
        envMapIntensity: 0.45,
    });
}

export function buildStarterTeslaInteract182() {
    const Engine = window.Engine;
    const State = window.State;
    const THREE = window.THREE;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'starter_tesla_rotary')) {
        return null;
    }

    const SM = window.StarterMaterials;
    const mats = SM?.createStarterMaterials?.(THREE);
    const woodMat = mats?.wood?.clone?.() || new THREE.MeshStandardMaterial({ color: 0x5a4838, roughness: 0.82, metalness: 0.04 });
    const copperMat = new THREE.MeshStandardMaterial({
        color: 0xb86830,
        roughness: 0.28,
        metalness: 0.88,
        emissive: 0x401808,
        emissiveIntensity: 0.05,
        envMapIntensity: 0.5,
    });
    const brassMat = new THREE.MeshStandardMaterial({
        color: 0xc8a060,
        roughness: 0.32,
        metalness: 0.78,
        envMapIntensity: 0.48,
    });
    const paperMat = new THREE.MeshStandardMaterial({
        color: 0xe8dcc8,
        roughness: 0.92,
        metalness: 0.01,
        emissive: 0x201810,
        emissiveIntensity: 0.04,
        side: THREE.DoubleSide,
    });

    // —— Rotary switch (crank + contacts) ——
    const rotaryGroup = new THREE.Group();
    rotaryGroup.name = 'starter_tesla_rotary';
    const switchBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.28), brassMat.clone());
    switchBase.position.y = 0.06;
    switchBase.castShadow = true;
    switchBase.userData = { name: 'Tesla Coil', surfaceType: 'metal' };
    const switchPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 6), brassMat.clone());
    switchPost.position.y = 0.23;
    const crank = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.05), copperMat.clone());
    crank.position.set(0.14, 0.38, 0);
    crank.userData.switchCrank = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), copperMat.clone());
    knob.position.set(0.28, 0.38, 0);
    knob.userData.switchKnob = true;
    rotaryGroup.add(switchBase, switchPost, crank, knob);
    const rotaryPos = labPos(-4.2, -0.85);
    rotaryGroup.position.set(rotaryPos.x, rotaryPos.y, rotaryPos.z);
    rotaryGroup.rotation.y = 0.35;
    rotaryGroup.userData = {
        id: 'starter_tesla_rotary',
        name: 'Rotary Switch',
        type: 'prop',
        locked: true,
        interactAction: 'rp',
        interactLabel: 'Rotary Switch',
        interactHint: 'Crank the switch — arc discharge',
        interactRadius: 2.1,
        soundMode: 'clip',
        soundClipId: 'starter_tesla_spark',
        soundTrigger: 'interact',
        crankMesh: crank,
        knobMesh: knob,
        crankTarget: 0,
        crankAngle: 0,
    };
    Engine.scene.add(rotaryGroup);
    State.objects.push(rotaryGroup);

    // —— Vacuum tube rack ——
    const tubeGroup = new THREE.Group();
    tubeGroup.name = 'starter_tesla_tubes';
    const rackBack = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.72, 0.08), woodMat.clone());
    rackBack.position.set(0, 1.15, -0.04);
    rackBack.userData = { name: 'Tesla Bench', surfaceType: 'wood' };
    const rackShelf = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.05, 0.22), woodMat.clone());
    rackShelf.position.set(0, 0.78, 0.06);
    tubeGroup.add(rackBack, rackShelf);

    const tubeMeshes = [];
    const tubeGlow = [];
    [-0.48, -0.16, 0.16, 0.48].forEach((xOff, i) => {
        const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.06, 6), brassMat.clone());
        socket.position.set(xOff, 0.72, 0.1);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), new THREE.MeshStandardMaterial({
            color: 0x2a2018,
            roughness: 0.35,
            metalness: 0.15,
            emissive: 0x401808,
            emissiveIntensity: 0.02,
            transparent: true,
            opacity: 0.9,
        }));
        bulb.position.set(xOff, 0.92, 0.1);
        bulb.userData.vacuumTube = true;
        bulb.userData.tubeIndex = i;
        const filament = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4), new THREE.MeshStandardMaterial({
            color: 0xffa060,
            emissive: 0xff6020,
            emissiveIntensity: 0.04,
            roughness: 0.4,
        }));
        filament.position.set(xOff, 0.88, 0.1);
        filament.userData.tubeFilament = true;
        tubeMeshes.push(bulb);
        tubeGlow.push(filament);
        tubeGroup.add(socket, bulb, filament);
    });
    const tubePos = labPos(4.5, 0.9);
    tubeGroup.position.set(tubePos.x, tubePos.y, tubePos.z);
    tubeGroup.rotation.y = -0.08;
    tubeGroup.userData = {
        id: 'starter_tesla_tubes',
        name: 'Vacuum Tube Rack',
        type: 'prop',
        locked: true,
        animVacuumTubes: true,
        tubeMeshes,
        tubeFilaments: tubeGlow,
        tubeWarmth: 0.12,
        tubeWarmTarget: 0.12,
    };
    Engine.scene.add(tubeGroup);
    State.objects.push(tubeGroup);

    // —— Leyden jar shelf ——
    const leydenGroup = new THREE.Group();
    leydenGroup.name = 'starter_tesla_leyden';
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.28), woodMat.clone());
    shelf.position.y = 0.72;
    shelf.userData = { name: 'Tesla Bench', surfaceType: 'wood' };
    leydenGroup.add(shelf);

    const jarMeshes = [];
    const foilBands = [];
    [-0.28, 0, 0.28].forEach((xOff, i) => {
        const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.32, 10), glassJarMat(THREE));
        jar.position.set(xOff, 0.92, 0);
        jar.castShadow = true;
        jar.userData.leydenJar = true;
        jar.userData.jarIndex = i;
        const foil = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.115, 0.08, 10), copperMat.clone());
        foil.position.set(xOff, 1.02, 0);
        foil.userData.jarFoil = true;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), brassMat.clone());
        cap.position.set(xOff, 1.1, 0);
        jarMeshes.push(jar);
        foilBands.push(foil);
        leydenGroup.add(jar, foil, cap);
    });
    const leydenPos = labPos(-4.6, 0.5);
    leydenGroup.position.set(leydenPos.x, leydenPos.y, leydenPos.z);
    leydenGroup.rotation.y = 0.22;
    leydenGroup.userData = {
        id: 'starter_tesla_leyden',
        name: 'Leyden Jars',
        type: 'prop',
        locked: true,
        animLeydenJars: true,
        jarMeshes,
        foilBands,
        jarCharge: 0.08,
        jarChargeTarget: 0.08,
    };
    Engine.scene.add(leydenGroup);
    State.objects.push(leydenGroup);

    // —— Lab journal (PromptGen) ——
    const journalGroup = new THREE.Group();
    journalGroup.name = 'starter_tesla_journal';
    const lectern = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.78, 0.34), woodMat.clone());
    lectern.position.y = 0.39;
    lectern.castShadow = true;
    lectern.userData = { name: 'Tesla Bench', surfaceType: 'wood' };
    const journalTex = SM?.makeRegisterTex?.(THREE);
    const journal = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.2),
        new THREE.MeshStandardMaterial({
            map: journalTex || null,
            color: 0xe8dcc8,
            emissive: journalTex ? 0x403020 : 0x604830,
            emissiveMap: journalTex || null,
            emissiveIntensity: 0.18,
            roughness: 0.78,
            side: THREE.DoubleSide,
        })
    );
    journal.position.set(0, 0.82, 0.12);
    journal.rotation.x = -0.55;
    journal.userData.journalPage = true;
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 4), brassMat.clone());
    pen.position.set(0.12, 0.86, 0.18);
    pen.rotation.z = 0.4;
    journalGroup.add(lectern, journal, pen);
    const journalPos = labPos(3.8, 1.1);
    journalGroup.position.set(journalPos.x, journalPos.y, journalPos.z);
    journalGroup.rotation.y = -0.55;
    journalGroup.userData = {
        id: 'starter_tesla_journal',
        name: 'Lab Journal',
        type: 'prop',
        locked: true,
        interactAction: 'prompter',
        interactLabel: 'Lab Journal',
        interactHint: 'Read notes — opens PromptGen',
        interactRadius: 2.2,
        journalMesh: journal,
        journalFlash: 0,
    };
    Engine.scene.add(journalGroup);
    State.objects.push(journalGroup);

    return { rotary: rotaryGroup, tubes: tubeGroup, leyden: leydenGroup, journal: journalGroup };
}

export const StarterTeslaInteract182 = {
    wireAnims() {
        const THREE = window.THREE;
        const rotary = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_rotary');
        const tubes = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_tubes');
        const leyden = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_leyden');
        const journal = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_journal');

        if (rotary?.userData?.crankMesh) {
            const crank = rotary.userData.crankMesh;
            const knob = rotary.userData.knobMesh;
            window.StarterAnim?.registerStarterAnim?.((_t, dt) => {
                const target = rotary.userData.crankTarget ?? 0;
                const cur = rotary.userData.crankAngle ?? 0;
                const next = THREE.MathUtils.lerp(cur, target, Math.min(1, dt * 5.5));
                rotary.userData.crankAngle = next;
                if (crank) crank.rotation.z = next;
                if (knob) knob.rotation.z = next;
                if (target > 0.1) {
                    rotary.userData.crankTarget = Math.max(0, target - dt * 0.35);
                }
            });
        }

        if (tubes?.userData?.animVacuumTubes) {
            const bulbs = tubes.userData.tubeMeshes || [];
            const filaments = tubes.userData.tubeFilaments || [];
            window.StarterAnim?.registerStarterAnim?.((t, dt) => {
                const warmth = tubes.userData.tubeWarmth ?? 0;
                const warmTarget = tubes.userData.tubeWarmTarget ?? warmth;
                tubes.userData.tubeWarmth = THREE.MathUtils.lerp(warmth, warmTarget, Math.min(1, dt * 1.8));
                const base = 0.08 + tubes.userData.tubeWarmth * 0.75;
                bulbs.forEach((bulb, i) => {
                    if (!bulb?.material) return;
                    const flicker = Math.sin(t * 4.5 + i * 1.3) * 0.06;
                    bulb.material.emissiveIntensity = base * 0.35 + flicker;
                    bulb.material.emissive.setHex(0xff6020);
                });
                filaments.forEach((fil, i) => {
                    if (!fil?.material) return;
                    fil.material.emissiveIntensity = base + Math.sin(t * 6 + i) * 0.08;
                });
                tubes.userData.tubeWarmTarget = Math.max(0.12, tubes.userData.tubeWarmTarget - dt * 0.04);
            });
        }

        if (leyden?.userData?.animLeydenJars) {
            const jars = leyden.userData.jarMeshes || [];
            const foils = leyden.userData.foilBands || [];
            window.StarterAnim?.registerStarterAnim?.((t, dt) => {
                const charge = leyden.userData.jarCharge ?? 0;
                const chargeTarget = leyden.userData.jarChargeTarget ?? charge;
                leyden.userData.jarCharge = THREE.MathUtils.lerp(charge, chargeTarget, Math.min(1, dt * 2.2));
                jars.forEach((jar, i) => {
                    if (!jar?.material?.emissive) return;
                    const pulse = Math.sin(t * 3.2 + i * 0.8) * 0.04 * leyden.userData.jarCharge;
                    jar.material.emissive.setHex(0x88c8e8);
                    jar.material.emissiveIntensity = leyden.userData.jarCharge * 0.22 + pulse;
                });
                foils.forEach((foil, i) => {
                    if (!foil?.material) return;
                    foil.material.emissiveIntensity = 0.04 + leyden.userData.jarCharge * 0.35 + Math.sin(t * 5 + i) * 0.05;
                });
                leyden.userData.jarChargeTarget = Math.max(0.08, leyden.userData.jarChargeTarget - dt * 0.05);
            });
        }

        if (journal?.userData?.journalMesh?.material) {
            const page = journal.userData.journalMesh;
            window.StarterAnim?.registerStarterAnim?.((t, dt) => {
                if (journal.userData.journalFlash > 0) {
                    journal.userData.journalFlash = Math.max(0, journal.userData.journalFlash - dt);
                }
                const flash = journal.userData.journalFlash > 0;
                page.material.emissiveIntensity = flash ? 0.65 : 0.14 + Math.sin(t * 2.4) * 0.05;
            });
        }
    },

    onRotaryInteract(rotary) {
        if (!rotary?.userData) return;
        const step = (rotary.userData.crankTarget || 0) + Math.PI * 0.45;
        rotary.userData.crankTarget = step;
        rotary.userData.crankAngle = rotary.userData.crankAngle ?? 0;

        const tubes = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_tubes');
        const leyden = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_leyden');
        const coil = window.State?.objects?.find((o) => o.userData?.id === 'starter_tesla_coil');
        if (tubes?.userData) tubes.userData.tubeWarmTarget = Math.min(1, (tubes.userData.tubeWarmTarget || 0) + 0.35);
        if (leyden?.userData) leyden.userData.jarChargeTarget = Math.min(1, (leyden.userData.jarChargeTarget || 0) + 0.4);

        if (coil?.userData) {
            coil.userData.sparkCooldown = 0;
            const arc = coil.userData.arcMesh;
            if (arc?.material) arc.material.emissiveIntensity = 1.8;
        }

        void window.TeslaLabAmbient?.playSpark?.();
        void window.AudioSys?.playClip?.('starter_tesla_spark', 0.48);
        window.UI?.status?.('Rotary switch — discharge routed to coil + tube rack');
    },

    onJournalInteract(journal) {
        if (!journal?.userData) return;
        journal.userData.journalFlash = 0.7;
    },
};

window.StarterTeslaInteract182 = StarterTeslaInteract182;
window.buildStarterTeslaInteract182 = buildStarterTeslaInteract182;