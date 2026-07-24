/**
 * Default workspace content — physics-friendly props on the entry pad.
 * Tagged isStarterKit / isSimSample for selective clear.
 */
import * as THREE from 'three';

const TAGS = { isStarterKit: true, isSimSample: true, negativeLodSource: 'tier-auto' };

function place(mesh, x, y, z, rotY = 0) {
    if (!mesh) return null;
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    const entry = window.State?.physicsObjects?.find((p) => p.mesh === mesh);
    if (entry?.body) {
        entry.body.position.set(x, y, z);
        const C = window.CANNON;
        if (C && rotY) {
            entry.body.quaternion.setFromAxisAngle(new C.Vec3(0, 1, 0), rotY);
        }
        entry.body.velocity.set(0, 0, 0);
        entry.body.angularVelocity.set(0, 0, 0);
        entry.body.wakeUp?.();
    }
    return mesh;
}

/**
 * Spawn small prop kit for play/push/sim demos.
 * Uses force:true so it works after PLAY mode locks edit.
 */
export async function spawnStarterKit(opts = {}) {
    const World = window.World;
    const State = window.State;
    if (!World?.createObject || !State) return [];
    if (State.starterKitSpawned && !opts.force) return [];

    const spawned = [];
    const mk = (type, name, color, phys, extra = {}) => {
        const m = World.createObject(type, name, color, {
            physics: phys,
            force: true,
            silent: true,
            noAutoNeg: false,
            mass: extra.mass,
            friction: extra.friction,
            restitution: extra.restitution,
            locked: extra.locked,
            y: extra.y ?? 1,
            tags: { ...TAGS, ...(extra.tags || {}) },
        });
        if (m) spawned.push(m);
        return m;
    };

    // Dynamic crate — pushable
    const crate = mk('cube', 'Mat Brick', 0x8c4838, true, {
        mass: 8, friction: 0.55, restitution: 0.05, y: 0.55,
    });
    place(crate, 3.2, 0.55, -1.5);
    if (crate && window.MaterialPresets?.applyMaterialPreset) {
        window.MaterialPresets.applyMaterialPreset(crate, 'pbr_brick_aged');
        window.MaterialLibrary?.applyWithMaps?.(crate, 'pbr_brick_aged');
    }

    // Rolling sphere
    const ball = mk('sphere', 'Sim Sphere', 0x3a8fd6, true, {
        mass: 2, friction: 0.2, restitution: 0.45, y: 0.7,
    });
    place(ball, 4.4, 0.7, -0.4);
    if (ball && window.MaterialPresets?.applyMaterialPreset) {
        window.MaterialPresets.applyMaterialPreset(ball, 'pbr_plastic_gloss');
    }

    // Static ramp (wedge via scaled cone or custom box tilt)
    const ramp = World.addCustom(
        new THREE.BoxGeometry(2.4, 0.2, 1.6),
        new THREE.MeshStandardMaterial({
            color: 0x6a7078, roughness: 0.7, metalness: 0.15, envMapIntensity: 0.35,
        }),
        'Sim Ramp',
        true,
        { force: true, silent: true, mass: 0, friction: 0.65, restitution: 0.02, locked: true },
    );
    if (ramp) {
        ramp.userData = { ...ramp.userData, ...TAGS, surfaceType: 'metal', mass: 0 };
        ramp.rotation.z = -0.28;
        place(ramp, 2.6, 0.35, 2.2, 0.4);
        window.Physics?.setStatic?.(ramp, true);
        spawned.push(ramp);
    }

    // Hinge gate: two posts (static) + plank (dynamic) hinged on left post
    const postA = mk('cube', 'Hinge Post A', 0x5a6068, true, {
        mass: 0, friction: 0.8, restitution: 0.02, locked: true, y: 0.7,
    });
    const postB = mk('cube', 'Hinge Post B', 0x5a6068, true, {
        mass: 0, friction: 0.8, restitution: 0.02, locked: true, y: 0.7,
    });
    if (postA) {
        postA.scale.set(0.25, 1.4, 0.25);
        place(postA, -3.5, 0.7, -2.5);
        window.Physics?.setStatic?.(postA, true);
        // Rebuild collider after scale
        const entry = State.physicsObjects.find((p) => p.mesh === postA);
        if (entry) {
            window.Physics.world.removeBody(entry.body);
            State.physicsObjects = State.physicsObjects.filter((p) => p.mesh !== postA);
            const body = window.Physics.addBody(postA, 'cube');
            body.mass = 0;
            body.type = window.CANNON?.Body?.STATIC ?? 2;
            body.updateMassProperties();
            State.physicsObjects.push({ mesh: postA, body });
        }
    }
    if (postB) {
        postB.scale.set(0.25, 1.4, 0.25);
        place(postB, -1.2, 0.7, -2.5);
        window.Physics?.setStatic?.(postB, true);
        const entry = State.physicsObjects.find((p) => p.mesh === postB);
        if (entry) {
            window.Physics.world.removeBody(entry.body);
            State.physicsObjects = State.physicsObjects.filter((p) => p.mesh !== postB);
            const body = window.Physics.addBody(postB, 'cube');
            body.mass = 0;
            body.updateMassProperties();
            State.physicsObjects.push({ mesh: postB, body });
        }
    }

    const plank = mk('cube', 'Hinge Plank', 0xb8623e, true, {
        mass: 4, friction: 0.35, restitution: 0.05, y: 0.75,
    });
    if (plank) {
        plank.scale.set(2.1, 0.12, 0.9);
        place(plank, -2.35, 0.85, -2.5);
        if (window.MaterialPresets?.applyMaterialPreset) {
            window.MaterialPresets.applyMaterialPreset(plank, 'pbr_wood_snow');
        }
        // Rebuild body after scale then hinge to post A
        const entry = State.physicsObjects.find((p) => p.mesh === plank);
        if (entry) {
            window.Physics.world.removeBody(entry.body);
            State.physicsObjects = State.physicsObjects.filter((p) => p.mesh !== plank);
        }
        const body = window.Physics.addBody(plank, 'cube');
        State.physicsObjects.push({ mesh: plank, body });
        window.Physics.syncBodyFromUserData?.(plank);
        if (postA) {
            window.Physics.hingeBodies?.(
                postA,
                plank,
                { x: 0.2, y: 0.15, z: 0 },
                { x: -1.0, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 },
            );
        }
    }

    State.starterKitSpawned = true;
    window.UI?.status?.(`Workspace kit: ${spawned.length} props · push crate · hinge gate`);
    return spawned;
}

/** Extra physics lab stack (INSERT). */
export async function spawnPhysicsLabSample() {
    const World = window.World;
    const State = window.State;
    if (!World?.createObject) return [];
    window.SurfaceProfile?.set?.('creator');
    if (State && !State.isPaused) {
        State.isPaused = true;
        window.UI?.updateSimMode?.();
        window.dispatchEvent(new CustomEvent('threshold:pause', {
            detail: { paused: true, reason: 'physics-lab' },
        }));
    }

    const spawned = [];
    const baseX = 6;
    const baseZ = 3;
    for (let i = 0; i < 4; i += 1) {
        const m = World.createObject('cube', `Lab Mass ${i + 1}`, 0x9aa0a8, {
            physics: true,
            force: true,
            silent: true,
            mass: 2 + i * 3,
            friction: 0.3 + i * 0.1,
            restitution: 0.05,
            y: 0.55 + i * 1.05,
            tags: { ...TAGS, isPhysicsLab: true },
        });
        if (m) {
            m.position.set(baseX, 0.55 + i * 1.05, baseZ);
            const entry = State.physicsObjects.find((p) => p.mesh === m);
            if (entry?.body) entry.body.position.set(baseX, 0.55 + i * 1.05, baseZ);
            if (window.MaterialPresets?.applyMaterialPreset) {
                window.MaterialPresets.applyMaterialPreset(m, 'pbr_metal_brushed');
            }
            spawned.push(m);
        }
    }

    // Heavy vs light on ramp-ish positions
    const heavy = World.createObject('cube', 'Lab Heavy', 0x444850, {
        physics: true, force: true, silent: true, mass: 40, friction: 0.7, y: 1.2,
        tags: { ...TAGS, isPhysicsLab: true },
    });
    if (heavy) {
        heavy.position.set(baseX - 2, 1.2, baseZ + 2);
        const e = State.physicsObjects.find((p) => p.mesh === heavy);
        if (e?.body) e.body.position.copy(heavy.position);
        spawned.push(heavy);
    }

    window.UI?.status?.(`Physics lab: ${spawned.length} samples · PLAY to simulate · EDIT gravity in SETUP`);
    return spawned;
}

export function clearSimSamples() {
    const State = window.State;
    const World = window.World;
    if (!State?.objects) return 0;
    window.Physics?.clearConstraints?.();
    const doomed = State.objects.filter(
        (o) => o?.userData?.isSimSample || o?.userData?.isPhysicsLab || o?.userData?.isStarterKit,
    );
    for (const o of doomed) {
        try {
            if (World?.deleteObject) World.deleteObject(o, { force: true });
        } catch { /* */ }
    }
    State.starterKitSpawned = false;
    window.UI?.status?.(`Cleared ${doomed.length} sim samples`);
    return doomed.length;
}

export function initStarterKitUi() {
    document.getElementById('insert-physics-lab')?.addEventListener('click', () => {
        void spawnPhysicsLabSample();
        document.getElementById('insert-modal')?.classList.remove('open');
    });
    document.getElementById('btn-sim-samples-clear')?.addEventListener('click', () => {
        clearSimSamples();
    });
    document.getElementById('env-gravity')?.addEventListener('input', (e) => {
        const y = parseFloat(e.target.value);
        if (Number.isFinite(y)) {
            window.Physics?.setGravity?.(0, y, 0);
            const lab = document.getElementById('env-gravity-label');
            if (lab) lab.textContent = y.toFixed(2);
        }
    });
    document.getElementById('env-gravity-reset')?.addEventListener('click', () => {
        window.Physics?.resetGravity?.();
        const el = document.getElementById('env-gravity');
        if (el) el.value = '-9.82';
        const lab = document.getElementById('env-gravity-label');
        if (lab) lab.textContent = '-9.82';
        window.UI?.status?.('Gravity reset −9.82');
    });
}

window.StarterKit = {
    spawnStarterKit,
    spawnPhysicsLabSample,
    clearSimSamples,
    initStarterKitUi,
};
