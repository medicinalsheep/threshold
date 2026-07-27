/**
 * Terminal void grid — default ENTER baseline (10.15+).
 * No pad, no kit, no AI kiosk. Content is opt-in via INSERT / later phases.
 */

import { SITE } from './starterSiteLayout.js';

/**
 * @param {{ style?: 'terminal' | 'workspace' }} [opts]
 * workspace = legacy polished pad (not default)
 */
export async function buildStarterGrid(opts = {}) {
    const Engine = window.Engine;
    const State = window.State;
    if (!Engine?.scene || !State) return null;

    if (State.starterGridBuilt) {
        return State.objects.find((o) => o.userData?.id === 'engine_ground'
            || o.userData?.id === 'engine_floor_deck') || null;
    }
    State.starterGridBuilt = true;
    State.enterStyle = opts.style === 'workspace' ? 'workspace' : 'terminal';

    if (State.enterStyle === 'workspace') {
        const { FLOOR_HALF } = await import('../engine/environment.js');
        await window.Environment?.useWorkspacePad?.(FLOOR_HALF);
    } else {
        // Terminal: plain ground + high-contrast grid (pad/kit/AI not auto)
        window.Environment?.clearFloorDeck?.();
        window.Environment?.useSimpleGround?.();
        const plane = Engine.groundPlane;
        if (plane?.material?.color) {
            plane.material.color.setHex(0x0c0e10);
            plane.material.roughness = 0.92;
            plane.material.metalness = 0.02;
            plane.material.envMapIntensity = 0.12;
            plane.material.needsUpdate = true;
        }
        // Terminal grid colors (accent major / dim minor)
        if (Engine.gridHelper) {
            Engine.scene.remove(Engine.gridHelper);
            Engine.gridHelper.geometry?.dispose?.();
            Engine.gridHelper.material?.dispose?.();
        }
        const THREE = window.THREE;
        if (THREE) {
            Engine.gridHelper = new THREE.GridHelper(80, 80, 0x2a6b3a, 0x1a1f1c);
            Engine.gridHelper.position.y = 0.07;
            Engine.scene.add(Engine.gridHelper);
        }
    }

    State.gridVisible = true;
    if (Engine.gridHelper) Engine.gridHelper.visible = true;
    const gridBtn = document.getElementById('btn-grid');
    if (gridBtn) gridBtn.textContent = 'ON';

    // Hard terminal atmosphere — low fog, dark sky, no soft daylight pad
    State.env.timeOfDay = 22;
    State.env.fogDensity = 0.018;
    State.env.atmosphereEnabled = false;
    window.Environment?.setTimeOfDay?.(22);
    window.Environment?.setFog?.(0.018);
    const Env = window.Environment;
    if (Env?.hemiLight) Env.hemiLight.visible = false;
    const atmoBtn = document.getElementById('env-atmo-toggle');
    if (atmoBtn) {
        atmoBtn.textContent = 'OFF';
        atmoBtn.classList.remove('active');
    }
    // Dim ambient for terminal feel (sun still exists for PBR readability)
    if (Env?.sunLight) {
        Env.sunLight.intensity = 0.85;
        Env.sunLight.color?.setHex?.(0xc8d4e0);
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

    // No auto kit / AI station — INSERT: PHYSICS KIT / AI STATION when ready

    return State.objects.find((o) => o.userData?.id === 'engine_ground'
        || o.userData?.id === 'engine_floor_deck') || null;
}

window.buildStarterGrid = buildStarterGrid;
