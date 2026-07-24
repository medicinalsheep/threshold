/** Workspace pad — default ENTER environment. AI station + starter kit. */

import { SITE } from './starterSiteLayout.js';
import { spawnAiTerminal } from './aiTerminal.js';
import { spawnStarterKit } from './starterKit.js';
import { FLOOR_HALF } from '../engine/environment.js';

export async function buildStarterGrid() {
    const Engine = window.Engine;
    const State = window.State;
    if (!Engine?.scene || !State) return null;

    if (State.starterGridBuilt) {
        return State.objects.find((o) => o.userData?.id === 'engine_floor_deck'
            || o.userData?.id === 'engine_ground') || null;
    }
    State.starterGridBuilt = true;

    // Polished concrete pad + matching collider (not dark void plane alone)
    await window.Environment?.useWorkspacePad?.(FLOOR_HALF);

    State.gridVisible = true;
    if (Engine.gridHelper) Engine.gridHelper.visible = true;
    const gridBtn = document.getElementById('btn-grid');
    if (gridBtn) gridBtn.textContent = 'ON';

    // Soft daylight — readable pad + light-baked Neg LOD
    State.env.timeOfDay = 14;
    State.env.fogDensity = 0.01;
    State.env.atmosphereEnabled = true;
    window.Environment?.setTimeOfDay?.(14);
    window.Environment?.setFog?.(0.01);
    const Env = window.Environment;
    if (Env) {
        if (!Env.hemiLight) {
            const THREE = window.THREE;
            if (THREE && Engine.scene) {
                Env.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x1a2a12, 0.55);
                Engine.scene.add(Env.hemiLight);
            }
        }
        if (Env.hemiLight) Env.hemiLight.visible = true;
        const btn = document.getElementById('env-atmo-toggle');
        if (btn) {
            btn.textContent = 'ON';
            btn.classList.add('active');
        }
    }
    window.NegativeLod?.notifyEnvChange?.();

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

    try {
        await spawnStarterKit();
    } catch (e) {
        console.warn('[starter-grid] kit', e);
    }

    window.StarterTex?.wireStarterTextures?.().catch(() => {});

    return State.objects.find((o) => o.userData?.id === 'engine_floor_deck'
        || o.userData?.id === 'engine_ground') || null;
}

window.buildStarterGrid = buildStarterGrid;
