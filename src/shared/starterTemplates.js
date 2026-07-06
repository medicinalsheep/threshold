/** Sprint C — starter world templates + lobby picker */

import { ViewPrefs } from './viewPrefs.js';
import { bootstrapStarterScene } from './starterScene.js';

import { spawnTcShow } from './tcShow.js';

export const STARTER_TEMPLATES = {
    wardenclyffe: {
        id: 'wardenclyffe',
        name: 'Wardenclyffe',
        tagline: 'Polished showcase site — lab GLBs, survival, weather, MP sync, export-ready',
    },
    minimal: {
        id: 'minimal',
        name: 'Blank Yard',
        tagline: 'Grass pad + beacon — learn walk/jump, extend with PromptGen',
    },
    'tc-circuit': {
        id: 'tc-circuit',
        name: 'TC Circuit',
        tagline: 'Vehicles, checkpoint gate, lap timer HUD',
    },
    surreal: {
        id: 'surreal',
        name: 'Surreal Seed',
        tagline: 'Floating platforms + portal — AI surrealism starter',
    },
};

const TEMPLATE_LIST = Object.values(STARTER_TEMPLATES);

function sceneEmpty() {
    const State = window.State;
    return !State?.objects?.length || State.objects.length <= 1;
}

export function scheduleTemplateSpawn(pos, opts = {}) {
    const PlayerController = window.PlayerController;
    const State = window.State;
    const Network = window.Network;
    const Session = window.Session;
    if (!PlayerController || !State) return;
    if (Network?.mode === 'spectate' || Session?.isSpectator) return;

    const skipIntro = !!opts.skipIntro;
    if (skipIntro) {
        State.introPlaying = false;
    } else if (opts.introFrom && opts.introTo) {
        State.introFrom = { ...opts.introFrom };
        State.introTo = { ...opts.introTo };
        State.introTarget = { ...(opts.introTarget || opts.introTo) };
        State.introStart = performance.now();
        State.introDuration = opts.introDuration ?? 4200;
        State.introPlaying = true;
        const Engine = window.Engine;
        if (Engine?.camera && Engine.controls) {
            Engine.camera.position.set(State.introFrom.x, State.introFrom.y, State.introFrom.z);
            Engine.controls.target.set(State.introTarget.x, State.introTarget.y, State.introTarget.z);
        }
    }

    const delay = opts.spawnDelay ?? (skipIntro ? 380 : (State.introDuration || 2800) + 350);
    setTimeout(() => {
        if (PlayerController.spawned) return;
        PlayerController.spawn(pos.x, Math.max(pos.y, 1.2), pos.z).then(() => {
            PlayerController._inheritLookFromCamera?.();
            PlayerController._syncWalkOrbit?.();
            opts.onSpawn?.();
        }).catch(() => {});
        State.controlMode = 'walk';
        State.viewMode = 'tps';
        window.UI?.updateControlMode?.();
        window.ThirdEye?.updateHud?.();
        if (opts.status) window.UI?.status(opts.status);
    }, delay);
}

function bootstrapMinimalTemplate() {
    const Engine = window.Engine;
    const State = window.State;
    const Physics = window.Physics;
    const THREE = window.THREE;
    const C = window.CANNON;
    if (!Engine?.scene || !THREE || !State || !sceneEmpty()) return;

    window.buildStarterSiteTerrain191?.();

    const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.5, 0.32, 14),
        new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.82, metalness: 0.06 })
    );
    platform.position.set(0, 0.16, 0);
    platform.receiveShadow = true;
    platform.castShadow = true;
    platform.userData = { id: 'template_minimal_platform', name: 'Training Pad', type: 'platform', locked: true };
    Engine.scene.add(platform);
    State.objects.push(platform);
    if (C) Physics?.addStaticBox?.(new C.Vec3(3.4, 0.16, 3.4), { x: 0, y: 0.16, z: 0 }, 'ground', 'concrete');

    const beacon = window.World?.createObject?.('sphere', 'Starter Beacon', 0x00ffaa, false);
    if (beacon) {
        beacon.position.set(-1.8, 1.1, 1.4);
        beacon.scale.setScalar(0.5);
        beacon.material.emissive.setHex(0x00ffaa);
        beacon.material.emissiveIntensity = 0.22;
        beacon.userData.id = 'template_minimal_beacon';
    }

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.8, 0.05, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0x3a8848, emissive: 0x1a4428, emissiveIntensity: 0.12 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.34, 0);
    ring.userData = { id: 'template_minimal_ring', name: 'Guide Ring', type: 'decor', locked: true, isRotating: true };
    Engine.scene.add(ring);
    State.objects.push(ring);

    window.StarterAnim?.wireScene?.();
    State.ctxTargetPos.set(0, 0, 0);
    State.templateId = 'minimal';
    scheduleTemplateSpawn({ x: 0, y: 0, z: 2.5 }, {
        skipIntro: true,
        status: 'Blank yard — WASD move · Space jump · PromptGen → Examples to extend',
    });
}

function bootstrapSurrealTemplate() {
    const Engine = window.Engine;
    const State = window.State;
    const THREE = window.THREE;
    if (!Engine?.scene || !THREE || !State || !sceneEmpty()) return;

    const grass = new THREE.Mesh(
        new THREE.BoxGeometry(48, 0.08, 40),
        new THREE.MeshStandardMaterial({ color: 0x2a4848, roughness: 0.94, metalness: 0.02 })
    );
    grass.position.set(0, 0.04, 0);
    grass.receiveShadow = true;
    grass.userData = { id: 'template_surreal_ground', name: 'Surreal Ground', type: 'platform', locked: true, surfaceType: 'grass' };
    Engine.scene.add(grass);
    State.objects.push(grass);

    const platMat = new THREE.MeshStandardMaterial({ color: 0x5a4088, roughness: 0.55, metalness: 0.12 });
    [
        { x: 0, y: 1.2, z: 0, sx: 4, sy: 0.35, sz: 4 },
        { x: -5, y: 2.4, z: -2, sx: 2.8, sy: 0.3, sz: 2.8 },
        { x: 5.5, y: 3.6, z: 1.5, sx: 2.2, sy: 0.28, sz: 2.2 },
    ].forEach((p, i) => {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(p.sx, p.sy, p.sz), platMat.clone());
        slab.position.set(p.x, p.y, p.z);
        slab.castShadow = true;
        slab.receiveShadow = true;
        slab.userData = { id: `template_surreal_plat_${i}`, name: 'Float Slab', type: 'platform', locked: true };
        Engine.scene.add(slab);
        State.objects.push(slab);
    });

    const portal = new THREE.Mesh(
        new THREE.TorusGeometry(1.1, 0.14, 10, 28),
        new THREE.MeshStandardMaterial({
            color: 0x88a0ff, emissive: 0x4466cc, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.35,
        })
    );
    portal.position.set(0, 2.5, 0);
    portal.rotation.x = Math.PI / 2;
    portal.userData = { id: 'template_surreal_portal', name: 'Portal Ring', type: 'decor', locked: true, isRotating: true };
    Engine.scene.add(portal);
    State.objects.push(portal);

    for (let i = 0; i < 5; i += 1) {
        const orb = new THREE.Mesh(
            new THREE.SphereGeometry(0.35 + (i % 2) * 0.12, 12, 12),
            new THREE.MeshPhysicalMaterial({
                color: 0xc8a0ff,
                emissive: 0x6040a0,
                emissiveIntensity: 0.4,
                transmission: 0.55,
                transparent: true,
                opacity: 0.75,
                roughness: 0.08,
            })
        );
        const ang = (i / 5) * Math.PI * 2;
        orb.position.set(Math.cos(ang) * 4, 1.2 + i * 0.45, Math.sin(ang) * 4);
        orb.userData = { id: `template_surreal_orb_${i}`, name: 'Glass Orb', type: 'decor', locked: true };
        Engine.scene.add(orb);
        State.objects.push(orb);
    }

    if (State.env) {
        State.env.fogDensity = 0.035;
        State.env.timeOfDay = 20;
        window.Environment?.setFog?.(0.035);
        window.Environment?.setTimeOfDay?.(20);
    }

    window.StarterAnim?.wireScene?.();
    State.ctxTargetPos.set(0, 0, 0);
    State.templateId = 'surreal';
    if (Engine.camera && Engine.controls) {
        Engine.camera.position.set(0, 1.75, 7);
        Engine.controls.target.set(0, 2, 0);
    }
    scheduleTemplateSpawn({ x: 0, y: 0, z: 3 }, {
        skipIntro: true,
        status: 'Surreal seed — try PromptGen → Examples → Surreal float island',
    });
}

async function bootstrapTcCircuitTemplate() {
    const State = window.State;
    if (!State || !sceneEmpty()) return;

    const Engine = window.Engine;
    const THREE = window.THREE;
    const C = window.CANNON;

    const asphalt = new THREE.Mesh(
        new THREE.BoxGeometry(22, 0.08, 18),
        new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.9, metalness: 0.03 })
    );
    asphalt.position.set(0, 0.04, 0);
    asphalt.receiveShadow = true;
    asphalt.userData = { id: 'template_tc_ground', name: 'Circuit Pad', type: 'platform', locked: true, surfaceType: 'asphalt' };
    Engine.scene.add(asphalt);
    State.objects.push(asphalt);
    if (C) window.Physics?.addStaticBox?.(new C.Vec3(11, 0.04, 9), { x: 0, y: 0.04, z: 0 }, 'ground', 'asphalt');

    await spawnTcShow();
    window.StarterAnim?.wireScene?.();
    State.ctxTargetPos.set(0, 0, -2);
    State.templateId = 'tc-circuit';

    scheduleTemplateSpawn({ x: 0, y: 0, z: 4 }, {
        skipIntro: true,
        status: 'TC Circuit — F claim vehicle · drive through green gate (tc_cp) for laps',
        onSpawn: () => {
            setTimeout(() => {
                window.TcCircuit?.start?.({}, true);
                window.TcGateFx?.ensureGate?.(window.TcCircuit?.findCheckpoint?.());
            }, 600);
        },
    });
}

export function resolveTemplateId(id) {
    return STARTER_TEMPLATES[id] ? id : 'wardenclyffe';
}

export function getSelectedTemplateId() {
    const urlTpl = new URLSearchParams(window.location.search).get('template');
    if (urlTpl && STARTER_TEMPLATES[urlTpl]) return urlTpl;
    return resolveTemplateId(ViewPrefs.get('starterTemplate', 'wardenclyffe'));
}

export function setSelectedTemplateId(id) {
    const resolved = resolveTemplateId(id);
    ViewPrefs.set('starterTemplate', resolved);
    return resolved;
}

export function listStarterTemplates() {
    return TEMPLATE_LIST;
}

export async function bootstrapSelectedTemplate() {
    const id = getSelectedTemplateId();
    window.State.templateId = id;

    switch (id) {
        case 'minimal':
            bootstrapMinimalTemplate();
            break;
        case 'surreal':
            bootstrapSurrealTemplate();
            break;
        case 'tc-circuit':
            await bootstrapTcCircuitTemplate();
            break;
        default:
            await bootstrapStarterScene();
            break;
    }
    return id;
}

export function initLobbyTemplatePicker() {
    const select = document.getElementById('lobby-template');
    if (!select) return;

    const current = getSelectedTemplateId();
    select.innerHTML = TEMPLATE_LIST.map((t) => (
        `<option value="${t.id}">${t.name}</option>`
    )).join('');
    select.value = current;

    const desc = document.getElementById('lobby-template-desc');
    const updateDesc = () => {
        const tpl = STARTER_TEMPLATES[select.value];
        if (desc && tpl) desc.textContent = tpl.tagline;
    };
    select.addEventListener('change', () => {
        setSelectedTemplateId(select.value);
        updateDesc();
    });
    updateDesc();

    const urlTpl = new URLSearchParams(window.location.search).get('template');
    if (urlTpl && STARTER_TEMPLATES[urlTpl]) {
        select.value = urlTpl;
        setSelectedTemplateId(urlTpl);
        updateDesc();
    }
}

window.StarterTemplates = {
    STARTER_TEMPLATES,
    listStarterTemplates,
    getSelectedTemplateId,
    setSelectedTemplateId,
    bootstrapSelectedTemplate,
    initLobbyTemplatePicker,
};