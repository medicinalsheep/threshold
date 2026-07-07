/** Starter templates — grid default; optional modes in lobby advanced */

import { ViewPrefs } from './viewPrefs.js';
import { bootstrapStarterScene } from './starterScene.js';

import { spawnTcShow } from './tcShow.js';

export const STARTER_TEMPLATES = {
    grid: {
        id: 'grid',
        name: 'Blank Grid',
        tagline: 'Empty workspace — UI unlocks as you build',
    },
    'tc-circuit': {
        id: 'tc-circuit',
        name: 'TC Circuit',
        tagline: 'Vehicles + lap timer (optional demo)',
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
    window.ProgressiveUi?.unlock?.('toolbar', { silent: true });
    window.ProgressiveUi?.unlock?.('dock', { silent: true });
    window.ProgressiveUi?.unlock?.('compiler', { silent: true });

    scheduleTemplateSpawn({ x: 0, y: 0, z: 4 }, {
        skipIntro: true,
        status: 'TC Circuit — F claim vehicle · drive through green gate for laps',
        onSpawn: () => {
            setTimeout(() => {
                window.TcCircuit?.start?.({}, true);
                window.TcGateFx?.ensureGate?.(window.TcCircuit?.findCheckpoint?.());
            }, 600);
        },
    });
}

export function resolveTemplateId(id) {
    return STARTER_TEMPLATES[id] ? id : 'grid';
}

export function getSelectedTemplateId() {
    const urlTpl = new URLSearchParams(window.location.search).get('template');
    if (urlTpl && STARTER_TEMPLATES[urlTpl]) return urlTpl;
    return resolveTemplateId(ViewPrefs.get('starterTemplate', 'grid'));
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