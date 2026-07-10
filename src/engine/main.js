import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import * as CANNON from 'cannon-es';
import { VERSION } from '../config.js';
import { Session } from '../shared/session.js';
import { Runtime } from '../shared/runtime.js';
import { Actions } from '../shared/actions.js';
import { Network } from '../shared/network.js';
import { PlayerController } from './player.js';
import { Persistence } from '../shared/persistence.js';
import { Sync } from '../shared/sync.js';
import { Controls } from '../shared/controls.js';
import { TouchControls } from '../shared/touchControls.js';
import { GraphicsProfile } from '../shared/graphicsProfile.js';
import { Cinematic } from '../shared/cinematic.js';
import { bootstrapSelectedTemplate } from '../shared/starterTemplates.js';

import '../shared/starterSiteLayout.js';
import '../shared/worldInteract.js';
import '../shared/sessionUi.js';
import '../shared/assetProductionPlan.js';
import '../shared/materialPresets.js';
import '../shared/shaderRegistry.js';
import '../shared/shaderNodeGraph.js';
import '../shared/audioZoneSystem.js';
import '../shared/immersiveReplay.js';
import '../shared/designIntake.js';
import '../shared/agentPortal.js';
import '../shared/agentReconnectChip.js';
import '../shared/cornerHub.js';
import '../shared/engineAudio.js';
import '../shared/npcPatrol.js';
import '../shared/footsteps.js';
import '../shared/fpsViewmodel.js';
import '../shared/appearanceProfile.js';
import '../shared/avatarManifest.js';
import '../shared/appearanceStore.js';
import '../shared/hairSlot.js';
import '../shared/avatarComposer.js';
import '../shared/avatarTex.js';
import '../shared/avatarLod.js';
import '../shared/avatarMod.js';
import '../shared/appearanceExport.js';
import '../shared/avatarLoader.js';
import '../shared/ambientAudio.js';
import '../shared/weatherSystem.js';
import '../shared/recordedAmbient.js';
import '../shared/creatorHud.js';
import '../shared/starterMaterials.js';
import '../shared/starterAnim.js';
import '../shared/guidedSession.js';
import '../shared/exportPreflight.js';
import '../shared/introSkip.js';
import '../shared/actionHints.js';
import '../shared/guestRebuild.js';
import '../shared/audioManifestSync.js';
import '../shared/collaborateGuard.js';
import '../shared/textureManifestSync.js';
import '../shared/guestRebuildTelemetry.js';
import '../shared/hostMigration.js';
import '../shared/tcCircuit.js';
import '../shared/tcDrive.js';
import '../shared/tcGateFx.js';

import { State } from './state.js';
import { Physics } from './physics.js';
import { AudioSys } from './audioSys.js';
import { Recorder } from './recorder.js';
import { Environment } from './environment.js';
import { Engine } from './engineCore.js';
import { World } from './world.js';
import { UI } from './ui.js';

export { State, Physics, AudioSys, Recorder, Environment, Engine, World, UI };

export function initEngine() {
    console.log(`Initializing Threshold Engine v${VERSION} (HYPER)...`);

    window.THREE = THREE;
    window.CANNON = CANNON;
    window.OrbitControls = OrbitControls;
    window.TransformControls = TransformControls;
    window.GLTFLoader = GLTFLoader;
    window.KTX2Loader = KTX2Loader;
    window.__THRESHOLD_KTX2__ = true;
    window.AudioSys = AudioSys;
    window.Engine = Engine;
    window.EffectComposer = EffectComposer;
    window.renderPass = RenderPass;
    window.ShaderPass = ShaderPass;
    window.UnrealBloomPass = UnrealBloomPass;
    window.World = World;
    window.Cinematic = Cinematic;
    window.State = State;
    window.UI = UI;
    window.Recorder = Recorder;
    window.Utils = {
        getMode: () => State.renderMode,
        isHyper: () => State.renderMode === 4,
        randomColor: () => Math.random() * 0xffffff,
    };
    window.Session = Session;
    window.Runtime = Runtime;
    window.Actions = Actions;
    window.Network = Network;
    window.Physics = Physics;
    window.PlayerController = PlayerController;
    window.Persistence = Persistence;
    window.Sync = Sync;
    window.Controls = Controls;
    Controls.init();

    window.addEventListener('theme-change', () => {
        State.darkMode = !document.body.classList.contains('light-mode');
        Engine.updateBackground();
    });

    Physics.init();
    Engine.init();
    window.Environment = Environment;
    GraphicsProfile.bootstrap();
    Environment.init();
    UI.init();
    window.initCreatorHud?.();
    window.GuidedSession?.init?.();
    window.IntroSkip?.init?.();
    window.ActionHints?.init?.();
    window.CollaborateGuard?.init?.();
    window.HostMigration?.bindOnce?.();
    Physics.createFloor();
    TouchControls.init();

    if (Network.mode === 'host') {
        document.body.classList.add('network-host');
        Network.updateUi();
    }

    window.addEventListener('threshold:pause', (e) => {
        State.isPaused = !!e.detail?.paused;
        UI.updateSimMode();
        const reason = e.detail?.reason;
        UI.status(State.isPaused
            ? (reason ? `EDIT: ${reason}` : 'EDIT mode — insert, delete, and export unlocked')
            : 'PLAY mode — tap EDIT (top-left) to build');
        Engine._releaseLookLock?.();
        PlayerController._syncWalkOrbit?.();
        if (!State.isPaused && PlayerController.spawned && State.controlMode === 'walk') {
            PlayerController._inheritLookFromCamera?.();
        }
        window.CreatorHud?.updateSync?.();
    });

    const worldCode = new URLSearchParams(window.location.search).get('world');
    if (worldCode) {
        Persistence.loadWorld(worldCode)
            .then((r) => UI.status(`Loaded world ${r.name} (${r.code})`))
            .catch((e) => UI.status(e.message));
    } else {
        setTimeout(async () => {
            const tpl = await bootstrapSelectedTemplate();
            if (tpl && tpl !== 'grid') {
                window.UI?.status?.(`Template: ${window.StarterTemplates?.STARTER_TEMPLATES?.[tpl]?.name || tpl}`);
            }
            window.SessionUi?.onSessionStart?.();
            window.DesignIntake?.init?.();
            window.AgentPortal?.init?.();
            window.AgentReconnectChip?.init?.();
            window.CornerHub?.init?.();
            import('../shared/gameChat.js').then((m) => m.GameChat.init());
            import('../shared/helpMenu.js').then((m) => m.HelpMenu.init());
            import('../shared/hubLayout.js').then((m) => m.HubLayout.init());
            import('../shared/modelStatusHud.js').then((m) => m.ModelStatusHud.init());
            // Full MOD catalog UI (avatar-mods.json)
            try {
                const mods = window.AppearanceStore?.getPlayerProfile?.()?.mods || [];
                window.AppearanceProfile?.initModPickerUi?.(mods);
            } catch { /* optional */ }
        }, 120);
    }

    window.GuidedSession?.startIfNeeded?.();

    if (import.meta.env.VITE_SURVIVAL_DEV === 'true') {
        import('../../dev/survival/bootstrap.js')
            .then((m) => m.initSurvivalDev())
            .catch((e) => console.warn('Survival dev pack failed to load:', e));
    }

    document.body.classList.add('engine-chrome');
}