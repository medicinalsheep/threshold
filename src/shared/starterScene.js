import { SITE, court, EXTERIOR_SPAWN } from './starterSiteLayout.js';
import { spawnAiTerminal } from './aiTerminal.js';
import { wireStarterTextures } from './starterTex.js';
import { NpcPatrol } from './npcPatrol.js';
import { spawnHumanWithAvatar } from './avatarLoader.js';
import { scheduleTemplateSpawn } from './starterTemplates.js';
import { buildShowcaseGateway } from './showcaseGateway.js';

async function spawnStarterNpc({
    id, name, pos, rotY = 0, appearance = {}, interact = {}, waypoints = [], patrolSpeed = 1.1,
}) {
    const Engine = window.Engine;
    const State = window.State;
    if (!Engine?.scene) return null;

    const npc = await spawnHumanWithAvatar({ id, appearance });
    npc.position.set(pos.x, pos.y ?? 0, pos.z);
    npc.rotation.y = rotY;
    npc.userData = {
        id,
        name,
        type: 'human',
        isHuman: true,
        isCharacter: true,
        locked: false,
        idleSeed: Math.random() * 4,
        thirdEyeTarget: true,
        ...interact,
    };
    Engine.scene.add(npc);
    State.objects.push(npc);
    if (waypoints.length > 1) NpcPatrol.register(npc, waypoints, patrolSpeed);
    return npc;
}

function placeShowcaseTerminals() {
    const terminal = spawnAiTerminal({
        pos: court(2.4, 3.6),
        rotY: -0.55,
        interactHint: 'AI Build — Grok agents · local scripts · extend your game',
    });

    const modelKiosk = spawnAiTerminal({
        id: 'model_kiosk',
        name: 'Model Kiosk',
        pos: court(-2.2, 3.4),
        rotY: 0.65,
        interactAction: 'skin',
        interactLabel: 'Avatar Kiosk',
        interactHint: 'Assign player skin · GLTF body · appearance export',
    });

    const compilerKiosk = spawnAiTerminal({
        id: 'compiler_kiosk',
        name: 'Compiler Kiosk',
        pos: court(0.8, 5.8),
        rotY: Math.PI,
        interactAction: 'compiler',
        interactLabel: 'Compiler',
        interactHint: 'Run JavaScript — scene scripts · game logic',
    });

    return { terminal, modelKiosk, compilerKiosk };
}

function placeShowcaseGuides() {
    void spawnStarterNpc({
        id: 'guide_npc',
        name: 'Alex',
        pos: court(-0.6, 4.8),
        rotY: Math.PI * 0.15,
        appearance: {
            bodyColor: 0x3d4f66,
            pantsColor: 0x232830,
            skinColor: 0xe8b896,
            hairColor: 0x2a1810,
        },
        interact: {
            interactAction: 'prompter',
            interactLabel: 'Alex — creative lead',
            interactHint: 'Talk to Alex — PromptGen EXAMPLES',
            interactRadius: 2.4,
        },
        waypoints: [
            court(-0.6, 4.8),
            court(1.4, 4.2),
            court(0.2, 5.6),
            court(-1.2, 5.0),
        ],
        patrolSpeed: 0.85,
    });
}

export function bootstrapStarterScene() {
    const Engine = window.Engine;
    const State = window.State;
    if (!Engine?.scene || !State) return;

    if (State.objects.length > 1) return;

    window.buildStarterSiteTerrain191?.();
    buildShowcaseGateway();
    placeShowcaseTerminals();
    placeShowcaseGuides();

    window.StarterAudio?.ensureStarterAudio?.({
        weatherDelay: 1800,
        weatherIntensity: 0.42,
    }).then((seed) => {
        if (seed?.skipped && seed.reason === 'manifest') {
            window.UI?.status?.('Ambient audio ready');
        }
    });
    wireStarterTextures().then((tex) => {
        if (tex.maps) window.UI?.status?.(`Site textures applied (${tex.maps} maps)`);
    });

    window.buildStarterEnv14?.();
    window.buildStarterWildlife15?.();
    window.buildStarterUrban16?.();
    window.buildStarterInterior17?.();
    window.buildStarterCourtyard194?.();
    window.buildStarterTeslaExterior18?.();
    window.buildStarterTeslaLab18?.();
    void window.upgradeTeslaLabGlb185?.();
    void window.upgradeTeslaBuildingGlb192?.();
    window.buildStarterTeslaInteract182?.();
    void window.spawnTeslaGuideNpc?.();
    window.buildStarterTeslaWeather184?.();
    window.applyWardenclyffeLighting195?.();
    window.StarterAnim?.wireScene?.();
    window.StarterEnv14?.wireAnims?.();
    window.StarterWildlife15?.wireAnims?.();
    window.StarterUrban16?.wireAnims?.();
    window.StarterInterior17?.wireAnims?.();
    window.StarterCourtyard194?.wireAnims?.();
    window.StarterTeslaExterior18?.wireAnims?.();
    window.StarterTeslaLab18?.wireAnims?.();
    window.StarterTeslaInteract182?.wireAnims?.();
    window.StarterTeslaWeather184?.wireAnims?.();
    window.StarterLighting195?.wireAnims?.();
    window.applySurvivalWorldHooks?.();

    State.introPlaying = false;
    State.ctxTargetPos.set(SITE.building.x, 1.4, SITE.building.z);

    if (Engine.camera && Engine.controls) {
        const cam = SITE.cameraSpawn || { x: 0, y: 1.72, z: 13.2 };
        const tgt = SITE.cameraTarget || { x: 0, y: 1.55, z: 4.5 };
        Engine.camera.position.set(cam.x, cam.y, cam.z);
        Engine.controls.target.set(tgt.x, tgt.y, tgt.z);
    }

    scheduleTemplateSpawn(EXTERIOR_SPAWN, {
        skipIntro: true,
        status: 'Wardenclyffe showcase — PLAY to explore · BUILD to edit · F on terminals & Nikola',
    });
}

window.bootstrapStarterScene = bootstrapStarterScene;