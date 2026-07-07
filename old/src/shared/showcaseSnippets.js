/** Sprint O — curated INSERT snippets from Wardenclyffe showcase */

import { spawnAiTerminal } from './aiTerminal.js';

function cursorPos() {
    return window.World?.getCursorPos?.() || window.State?.ctxTargetPos || { x: 0, y: 0, z: 0 };
}

function ensureEdit() {
    if (!window.SimMode?.canEditWorld?.()) {
        window.UI?.status?.('Pause (BUILD) to insert showcase snippets');
        return false;
    }
    return true;
}

function trackInsert(kind) {
    window.SceneHistory?.push?.(`before:snippet:${kind}`);
}

export function insertGatewayArch(pos = null) {
    if (!ensureEdit()) return null;
    const THREE = window.THREE;
    const Engine = window.Engine;
    const State = window.State;
    if (!THREE || !Engine?.scene || !State) return null;

    trackInsert('gateway');
    const p = pos || cursorPos();
    const SM = window.StarterMaterials;
    const mats = SM?.createStarterMaterials?.(THREE);
    const stoneMat = mats?.wall?.clone?.() || new THREE.MeshStandardMaterial({ color: 0x5a5e64, roughness: 0.78 });
    stoneMat.userData = { name: 'Starter Wall' };
    const copperMat = mats?.copper?.clone?.() || new THREE.MeshStandardMaterial({ color: 0xb87848, roughness: 0.38, metalness: 0.72 });
    const signTex = SM?.makeWardenclyffeSignTex?.(THREE);
    const signMat = new THREE.MeshStandardMaterial({
        map: signTex || null,
        color: 0xf0e8d8,
        emissive: signTex ? 0x604830 : 0x806040,
        emissiveMap: signTex || null,
        emissiveIntensity: signTex ? 0.2 : 0.14,
        roughness: 0.68,
        side: THREE.DoubleSide,
    });

    const root = new THREE.Group();
    root.name = 'snippet_gateway_arch';
    const id = `snippet_gateway_${Date.now().toString(36)}`;

    [-2.6, 2.6].forEach((lx) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.1, 12), stoneMat);
        post.position.set(lx, 1.05, 0);
        post.castShadow = true;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.1, 12), copperMat);
        cap.position.set(lx, 2.12, 0);
        root.add(post, cap);
    });

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.18, 0.32), stoneMat);
    lintel.position.set(0, 2.02, 0);
    lintel.castShadow = true;
    root.add(lintel);

    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.72), signMat);
    sign.position.set(0, 1.55, 0.18);
    root.add(sign);

    const lamp = new THREE.PointLight(0xffe0b8, 0.55, 5);
    lamp.position.set(0, 2.2, 0.4);
    root.add(lamp);

    root.position.set(p.x, p.y, p.z);
    root.userData = {
        id,
        name: 'Visitor Gateway Arch',
        type: 'prop',
        locked: false,
        showcaseSnippet: 'gateway',
        thirdEyeTarget: true,
    };

    Engine.scene.add(root);
    State.objects.push(root);
    window.UI?.status?.('Inserted gateway arch snippet — scale/rotate in SCENE → EDIT');
    return root;
}

export function insertTerminalCluster(pos = null) {
    if (!ensureEdit()) return null;
    trackInsert('terminals');
    const p = pos || cursorPos();
    const offsets = [
        { x: 0, z: 0, rotY: -0.4, id: 'snippet_terminal_a', name: 'PromptGen Terminal' },
        { x: 2.4, z: 0.6, rotY: 0.55, id: 'snippet_terminal_b', name: 'Compiler Kiosk' },
    ];
    const spawned = offsets.map((o) => spawnAiTerminal({
        pos: { x: p.x + o.x, y: p.y, z: p.z + o.z },
        rotY: o.rotY,
        id: o.id,
        name: o.name,
        showcase: true,
    })).filter(Boolean);

    window.UI?.status?.(`Inserted terminal cluster (${spawned.length}) — F interact on site`);
    return spawned;
}

export function insertSurvivalProp(kind = 'food', pos = null) {
    if (!ensureEdit()) return null;
    const THREE = window.THREE;
    const Engine = window.Engine;
    const State = window.State;
    if (!THREE || !Engine?.scene || !State) return null;

    trackInsert('survival');
    const p = pos || cursorPos();
    const SM = window.StarterMaterials;
    const mats = SM?.createStarterMaterials?.(THREE);
    const woodMat = mats?.wood?.clone?.() || new THREE.MeshStandardMaterial({ color: 0x5a4838, roughness: 0.82 });
    woodMat.userData = { name: 'Starter Wood' };

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.72, 0.62), woodMat);
    body.position.y = 0.36;
    body.castShadow = true;
    body.receiveShadow = true;

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.06, 0.66), woodMat);
    top.position.y = 0.74;

    const root = new THREE.Group();
    root.name = 'snippet_survival_prop';
    root.add(body, top);
    root.position.set(p.x, p.y, p.z);

    const hints = {
        food: 'Grab rations',
        water: 'Drink water',
        rest: 'Sit and rest',
        snack: 'Quick snack',
    };

    root.userData = {
        id: `snippet_survival_${Date.now().toString(36)}`,
        name: 'Survival Prop',
        type: 'prop',
        locked: false,
        showcaseSnippet: 'survival',
        interactAction: 'survival',
        survivalKind: kind,
        interactLabel: 'Survival Station',
        interactHint: hints[kind] || 'F interact',
        interactRadius: 2.2,
        thirdEyeTarget: true,
    };

    Engine.scene.add(root);
    State.objects.push(root);
    window.applySurvivalWorldHooks?.();
    window.UI?.status?.(`Inserted survival prop (${kind}) — PLAY + F to test`);
    return root;
}

export const ShowcaseSnippets = {
    insertGatewayArch,
    insertTerminalCluster,
    insertSurvivalProp,
};

window.ShowcaseSnippets = ShowcaseSnippets;