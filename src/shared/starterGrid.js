/** Blank grid — default entry. AI Build Station for agent portal. */

import { SITE } from './starterSiteLayout.js';
import { spawnAiTerminal } from './aiTerminal.js';

export async function buildStarterGrid() {
    const Engine = window.Engine;
    const State = window.State;
    const Physics = window.Physics;
    const THREE = window.THREE;
    const C = window.CANNON;
    if (!Engine?.scene || !THREE || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'starter_grid_pad')) return null;

    const pad = new THREE.Mesh(
        new THREE.BoxGeometry(32, 0.06, 32),
        new THREE.MeshStandardMaterial({
            color: 0x1a1c20,
            roughness: 0.92,
            metalness: 0.02,
            envMapIntensity: 0.2,
        })
    );
    pad.position.set(0, 0.03, 0);
    pad.receiveShadow = true;
    pad.userData = {
        id: 'starter_grid_pad',
        name: 'Starter Ground',
        type: 'platform',
        locked: true,
        surfaceType: 'concrete',
    };
    Engine.scene.add(pad);
    State.objects.push(pad);

    if (C && Physics?.addStaticBox) {
        Physics.addStaticBox(new C.Vec3(16, 0.03, 16), { x: 0, y: 0.03, z: 0 }, 'ground', 'concrete');
    }

    State.gridVisible = true;
    if (Engine.gridHelper) Engine.gridHelper.visible = true;
    const gridBtn = document.getElementById('btn-grid');
    if (gridBtn) gridBtn.textContent = 'ON';

    State.env.timeOfDay = 14;
    State.env.fogDensity = 0.004;
    State.env.atmosphereEnabled = false;
    window.Environment?.setTimeOfDay?.(14);
    window.Environment?.setFog?.(0.004);

    State.introPlaying = false;
    State.ctxTargetPos.set(0, 0, 0);
    State.templateId = 'grid';

    if (Engine.camera && Engine.controls) {
        const cam = SITE.cameraSpawn || { x: 6, y: 2.2, z: 6 };
        const tgt = SITE.cameraTarget || { x: 0, y: 0, z: 0 };
        Engine.camera.position.set(cam.x, cam.y, cam.z);
        Engine.controls.target.set(tgt.x, tgt.y, tgt.z);
    }

    if (!State.objects.some((o) => o.userData?.id === 'starter_ai_terminal')) {
        spawnAiTerminal({
            id: 'starter_ai_terminal',
            pos: { x: -2.8, y: 0, z: 2.4 },
            rotY: 0.35,
            showcase: false,
            name: 'AI Build Station',
            interactLabel: 'AI Build Station',
            interactHint: 'Connect agents — Grok · Ollama · build assistant',
        });
    }

    window.StarterTex?.wireStarterTextures?.().catch(() => {});

    return pad;
}

window.buildStarterGrid = buildStarterGrid;