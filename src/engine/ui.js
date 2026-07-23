import * as THREE from 'three';
import { State, IS_TOUCH_DEVICE, Modes, OBJECT_TYPES } from './state.js';
import { Engine } from './engineCore.js';
import { World } from './world.js';
import { Physics } from './physics.js';
import { AudioSys } from './audioSys.js';
import { IO } from './io.js';
import { PlayerController } from './player.js';
import { SimMode } from '../shared/simMode.js';
import { Session } from '../shared/session.js';
import { Runtime } from '../shared/runtime.js';
import { Actions } from '../shared/actions.js';
import { Network } from '../shared/network.js';
import { Controls, CONTROL_ACTIONS } from '../shared/controls.js';
import { TouchControls } from '../shared/touchControls.js';
import { TouchActionPicker } from '../shared/touchActionPicker.js';
import { ViewPrefs } from '../shared/viewPrefs.js';
import { SceneDock } from '../shared/sceneDock.js';
import { SoundLibrary } from '../shared/soundLibrary.js';
import { SoundPrompt } from '../shared/soundPrompt.js';
import { TextureLibrary } from '../shared/textureLibrary.js';
import { TextureBridge } from '../shared/textureBridge.js';
import { GltfImport } from '../shared/gltfImport.js';
import { NegativeLod } from '../shared/negativeLod.js';
import { ThresholdShell } from '../shared/thresholdShell.js';
import { CreativeWatch } from '../shared/creativeWatch.js';
import { ThirdEye } from '../shared/thirdEye.js';
import { getSceneObjectsForSpawn } from '../shared/sceneContext.js';
import { Persistence } from '../shared/persistence.js';
import { Sync } from '../shared/sync.js';
import { Permissions } from '../shared/permissions.js';
import { ExportWizard } from '../shared/exportWizard.js';
import { QuickExportPlay } from '../shared/quickExportPlay.js';
import { SyncStory } from '../shared/syncStory.js';
import { Walkthrough } from '../shared/walkthrough.js';
import { GraphicsPrompt } from '../shared/graphicsPrompt.js';
import { AgentHub } from '../shared/agentHub.js';
import { AgentRouter } from '../shared/agentRouter.js';
import { AgentStatus } from '../shared/agentStatus.js';
import { AgentBenchmark } from '../shared/agentBenchmark.js';
import { TrainingImport } from '../shared/trainingImport.js';
import { Auth } from '../auth/main.js';
import { NpcAgent } from '../grok/npcAgent.js';
import { DevAgent } from '../grok/devAgent.js';
import { OllamaDevAgent } from '../ollama/devAgent.js';
import { initPanelDrag, ensurePanelVisible } from '../shared/panelDrag.js';

export const UI = {
    init: function () {
        // Recorder buttons
        document.getElementById('ctx-insert').onclick = () => { UI.closeCtx(); UI.openInsert(); };
        document.getElementById('ctx-clear').onclick = () => { Actions.dispatch('CLEAR_WORLD'); UI.closeCtx(); };
        document.getElementById('ctx-close').onclick = () => UI.closeCtx();

        document.getElementById('btn-mobile-insert')?.addEventListener('click', () => UI.openInsert());
        document.getElementById('btn-console-toggle')?.addEventListener('click', () => UI.toggleConsoleBar());
        document.getElementById('btn-console-restore')?.addEventListener('click', () => UI.setConsoleBarVisible(true));
        document.getElementById('btn-touch-toggle')?.addEventListener('click', () => UI.toggleTouchControls());
        document.getElementById('insert-close')?.addEventListener('click', () => UI.closeInsert());
        document.getElementById('insert-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'insert-modal') UI.closeInsert();
        });
        document.querySelectorAll('.insert-tab').forEach((tab) => {
            tab.addEventListener('click', () => UI.switchInsertTab(tab.dataset.tab));
        });
        document.getElementById('insert-character')?.addEventListener('click', () => {
            Actions.dispatch('INSERT_CHARACTER', { pos: World.getCursorPos() });
            UI.closeInsert();
        });
        document.getElementById('insert-spawn-player')?.addEventListener('click', () => {
            Actions.dispatch('SPAWN_PLAYER', { pos: World.getCursorPos() });
            UI.closeInsert();
        });
        document.getElementById('insert-player-btn')?.addEventListener('click', () => {
            const key = document.getElementById('insert-player-key')?.value;
            Actions.dispatch('INSERT_PLAYER', { key });
            UI.closeInsert();
        });
        document.getElementById('insert-saved-btn')?.addEventListener('click', () => {
            const key = document.getElementById('insert-saved-player')?.value;
            if (key) { Actions.dispatch('INSERT_SAVED', { key }); UI.closeInsert(); }
        });
        document.getElementById('save-current-player')?.addEventListener('click', () => UI.saveCurrentPlayer());
        document.getElementById('insert-code-run')?.addEventListener('click', () => {
            const code = document.getElementById('insert-custom-code')?.value;
            Actions.dispatch('INSERT_CUSTOM', { code, pos: World.getCursorPos() });
            UI.closeInsert();
        });
        document.getElementById('insert-gltf-btn')?.addEventListener('click', () => UI.insertGltfFromPanel());
        document.getElementById('insert-gltf-manifest-btn')?.addEventListener('click', () => UI.insertGltfFromManifest());
        document.getElementById('import-player-file')?.addEventListener('change', (e) => UI.importPlayerFile(e));

        document.getElementById('btn-copy-link')?.addEventListener('click', () => UI.copySessionLink());
        document.getElementById('btn-host-pause')?.addEventListener('click', () => UI.togglePause());
        document.getElementById('btn-env-toggle')?.addEventListener('click', () => UI.toggleEnvPanel());
        document.getElementById('btn-env-close')?.addEventListener('click', () => UI.setEnvPanelVisible(false));
        document.getElementById('btn-toolbar-more')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.getElementById('toolbar-more-menu');
            menu?.classList.toggle('open');
            if (menu?.classList.contains('open')) this.positionMoreMenu();
        });
        document.addEventListener('click', () => {
            document.getElementById('toolbar-more-menu')?.classList.remove('open');
        });
        window.addEventListener('resize', () => this.positionMoreMenu());
        window.addEventListener('orientationchange', () => setTimeout(() => this.positionMoreMenu(), 200));
        document.getElementById('btn-load-model')?.addEventListener('click', () => UI.loadPlayerModel());
        document.getElementById('btn-pick-model-file')?.addEventListener('click', () => {
            document.getElementById('skin-model-file')?.click();
        });
        document.getElementById('skin-model-file')?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) void UI.loadPlayerModelFile(file);
            e.target.value = '';
        });
        document.getElementById('btn-clear-custom-body')?.addEventListener('click', () => UI.clearCustomBody());
        document.getElementById('btn-export-appearance')?.addEventListener('click', () => UI.exportAppearanceJson());
        document.getElementById('btn-import-appearance')?.addEventListener('click', () => UI.importAppearanceJson());

        document.querySelectorAll('.insp-tab').forEach((tab) => {
            tab.addEventListener('click', () => UI.switchInspTab(tab.dataset.inspTab));
        });
        ['insp-name', 'insp-color', 'insp-rough', 'insp-metal', 'insp-emissive', 'insp-emissive-int',
            'insp-negative-lod', 'insp-negative-lod-dist',
            'insp-physics', 'insp-mass', 'insp-friction', 'insp-restitution', 'insp-sound-freq', 'insp-sound-type',
            'insp-sound-mode', 'insp-sound-clip', 'insp-sound-trigger',
            'insp-interact-hint'
        ].forEach((id) => {
            document.getElementById(id)?.addEventListener('input', () => UI.applyInspectorFromUi());
            document.getElementById(id)?.addEventListener('change', () => {
                if (id === 'insp-sound-mode') UI.syncSoundInspectorMode();
                UI.applyInspectorFromUi();
            });
        });
        document.getElementById('insp-test-sound')?.addEventListener('click', () => UI.testObjectSound());
        document.getElementById('insp-record-sound')?.addEventListener('click', () => {
            const obj = State.selectedObject;
            if (obj) SoundPrompt.offerForObject(obj, obj.userData?.name || 'Object', 'collision');
        });

        SoundPrompt.init();
        TouchActionPicker.init();
        SoundLibrary.init().then(async () => {
            await window.StarterSfx?.seedStarterSounds?.();
            UI.renderSoundLibrary();
        });
        window.addEventListener('sound-library-change', () => UI.renderSoundLibrary());
        TextureLibrary.init();
        window.addEventListener('texture-library-change', () => {
            if (State.selectedObject) UI.syncTextureInspector(State.selectedObject);
        });
        document.getElementById('insp-texture-albedo')?.addEventListener('click', () => UI.importTextureSlot('albedo'));
        document.getElementById('insp-texture-rough')?.addEventListener('click', () => UI.importTextureSlot('roughness'));
        document.getElementById('insp-texture-metal')?.addEventListener('click', () => UI.importTextureSlot('metalness'));
        document.getElementById('insp-texture-normal')?.addEventListener('click', () => UI.importTextureSlot('normal'));
        document.getElementById('insp-texture-clear')?.addEventListener('click', () => UI.clearTextureMaps());
        document.getElementById('insp-texture-gimp')?.addEventListener('click', () => UI.syncGimpManifest());

        let sfxRecording = false;
        document.getElementById('sfx-record-btn')?.addEventListener('click', async () => {
            try {
                AudioSys.ensureContext();
                await SoundLibrary.startRecording();
                sfxRecording = true;
                document.getElementById('sfx-record-btn').style.display = 'none';
                document.getElementById('sfx-stop-btn').style.display = 'inline-block';
                document.getElementById('sfx-record-status').textContent = 'Recording…';
            } catch (e) {
                UI.status(e.message || 'Mic denied');
            }
        });
        document.getElementById('sfx-stop-btn')?.addEventListener('click', async () => {
            if (!sfxRecording) return;
            const blob = await SoundLibrary.stopRecording();
            sfxRecording = false;
            document.getElementById('sfx-record-btn').style.display = 'inline-block';
            document.getElementById('sfx-stop-btn').style.display = 'none';
            document.getElementById('sfx-record-status').textContent = 'Saved to library';
            const name = document.getElementById('sfx-record-name')?.value?.trim() || `Sound ${Date.now().toString(36).slice(-4)}`;
            await SoundLibrary.saveClip(name, blob, { context: 'library' });
            UI.renderSoundLibrary();
        });
        document.getElementById('btn-reload-skin')?.addEventListener('click', () => UI.reloadPlayerSkin());
        document.getElementById('btn-player-code')?.addEventListener('click', () => UI.openPlayerCodeRef());

        document.getElementById('ctx-edit-inspect').onclick = () => { if (State.selectedObject) UI.selectObject(State.selectedObject); UI.closeCtx(); };
        document.getElementById('ctx-edit-delete').onclick = () => { World.deleteObject(State.selectedObject); UI.closeCtx(); };

        document.getElementById('btn-lock').onclick = () => this.toggleLock();
        document.getElementById('btn-delete').onclick = () => World.deleteObject(State.selectedObject);
        document.querySelectorAll('input[name="gizmo"]').forEach(r => r.addEventListener('change', (e) => Engine.transformControl.setMode(e.target.value)));

        document.getElementById('btn-json-cancel').onclick = () => this.closeModal();
        document.getElementById('btn-json-apply').onclick = () => this.applyJson();

        const cmd = document.getElementById('cmd-input');
        cmd?.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.runCmd(); } });

        document.getElementById('btn-grid').onclick = () => {
            const vis = Engine.toggleGrid();
            document.getElementById('btn-grid').innerText = vis ? 'ON' : 'OFF';
        };
        document.getElementById('btn-save').onclick = () => IO.exportScene();
        document.getElementById('btn-load').onclick = () => IO.importScene();
        document.getElementById('file-input').addEventListener('change', (e) => IO.handleFileSelect(e));

        document.getElementById('btn-save-world')?.addEventListener('click', () => UI.saveWorld());
        document.getElementById('btn-load-world')?.addEventListener('click', () => UI.openWorldModal());
        document.getElementById('world-close')?.addEventListener('click', () => UI.closeWorldModal());
        document.getElementById('world-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'world-modal') UI.closeWorldModal();
        });
        document.getElementById('world-load-btn')?.addEventListener('click', () => UI.loadWorldByCode());
        document.getElementById('world-copy-link')?.addEventListener('click', () => UI.copyWorldLink());
        document.getElementById('world-export-btn')?.addEventListener('click', () => UI.exportCurrentWorld());
        document.getElementById('world-import-file')?.addEventListener('change', (e) => UI.importWorldFile(e));
        document.getElementById('btn-control-mode')?.addEventListener('click', () => UI.toggleControlMode());
        document.getElementById('btn-bindings')?.addEventListener('click', () => UI.openBindingsModal());
        document.getElementById('bindings-close')?.addEventListener('click', () => UI.closeBindingsModal());
        document.getElementById('bindings-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'bindings-modal') UI.closeBindingsModal();
        });
        document.getElementById('bindings-profile')?.addEventListener('change', (e) => UI.renderBindingsEditor(e.target.value));
        document.getElementById('bindings-reset')?.addEventListener('click', () => UI.resetBindingsProfile());
        document.querySelectorAll('.bindings-device-tab').forEach((tab) => {
            tab.addEventListener('click', () => UI.switchBindingsTab(tab.dataset.bindingsTab));
        });
        document.getElementById('bindings-list')?.addEventListener('click', (e) => {
            const bindBtn = e.target.closest('[data-bind]');
            const clearBtn = e.target.closest('[data-clear-kb]');
            if (bindBtn && !bindBtn.disabled) {
                const slot = parseInt(bindBtn.dataset.slot || '0', 10);
                UI.startKeyboardBinding(bindBtn.dataset.bind, Number.isFinite(slot) ? slot : 0);
            }
            if (clearBtn) UI.clearKeyboardBinding(clearBtn.dataset.clearKb);
        });
        document.getElementById('gamepad-bindings-list')?.addEventListener('click', (e) => {
            const bindBtn = e.target.closest('[data-gpad-bind]');
            const clearBtn = e.target.closest('[data-clear-gp]');
            if (bindBtn && !bindBtn.disabled) UI.startGamepadBinding(bindBtn.dataset.gpadBind);
            if (clearBtn) UI.clearGamepadBinding(clearBtn.dataset.clearGp);
        });
        document.getElementById('btn-host-panel')?.addEventListener('click', () => UI.openHostPanel());
        document.getElementById('host-copy-link')?.addEventListener('click', () => UI.copySessionLink());
        document.getElementById('host-passcode-save')?.addEventListener('click', () => {
            const code = document.getElementById('host-passcode')?.value ?? '';
            Network.setHostPasscode(code);
        });
        document.getElementById('host-panel-close')?.addEventListener('click', () => UI.closeHostPanel());
        document.getElementById('host-panel-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'host-panel-modal') UI.closeHostPanel();
        });
        document.getElementById('host-auto-coding-pause')?.addEventListener('change', (e) => {
            Session.setAutoCodingPause(e.target.checked);
        });
        document.getElementById('voip-mute-btn')?.addEventListener('click', () => window.Voip?.toggleMute?.());
        document.getElementById('voip-deafen-btn')?.addEventListener('click', () => window.Voip?.toggleDeafen?.());
        document.getElementById('voip-discord-btn')?.addEventListener('click', () => window.Voip?.openDiscord?.());
        document.getElementById('host-push-bindings')?.addEventListener('click', () => {
            Controls.saveHostAndBroadcast();
            UI.status('Host keyboard + controller profiles pushed to all players');
        });
        document.getElementById('world-list')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-world-code]');
            if (btn) UI.loadWorldByCode(btn.dataset.worldCode);
        });

        document.getElementById('btn-export-game')?.addEventListener('click', () => {
            document.getElementById('toolbar-more-menu')?.classList.remove('open');
            ExportWizard.open();
        });
        ExportWizard.bindOnce();
        QuickExportPlay.bindOnce();
        SyncStory.bindOnce();
        document.getElementById('btn-restart-walkthrough')?.addEventListener('click', () => {
            document.getElementById('toolbar-more-menu')?.classList.remove('open');
            Walkthrough.restart();
        });
        document.getElementById('btn-restart-walkthrough-full')?.addEventListener('click', () => {
            document.getElementById('toolbar-more-menu')?.classList.remove('open');
            Walkthrough.startFull(0);
        });
        document.getElementById('agent-attach-npc')?.addEventListener('click', () => UI.attachNpcAgent());
        document.getElementById('agent-npc-talk')?.addEventListener('click', () => UI.talkToNpcAgent());
        document.getElementById('agent-smart-suggest')?.addEventListener('click', () => UI.smartDevSuggest());
        document.getElementById('agent-smart-apply')?.addEventListener('click', () => UI.smartDevApply());
        document.getElementById('agent-dev-suggest')?.addEventListener('click', () => UI.devAgentSuggest());
        document.getElementById('agent-dev-apply')?.addEventListener('click', () => UI.devAgentApply());
        document.getElementById('agent-ollama-suggest')?.addEventListener('click', () => UI.ollamaDevSuggest());
        document.getElementById('agent-ollama-apply')?.addEventListener('click', () => UI.ollamaDevApply());
        document.getElementById('agent-benchmark-run')?.addEventListener('click', () => UI.runAgentBenchmark());
        document.getElementById('agent-training-export')?.addEventListener('click', () => UI.exportTrainingPair());
        document.getElementById('agent-training-export-queue')?.addEventListener('click', () => UI.exportTrainingQueue());
        document.getElementById('agent-local-save')?.addEventListener('click', () => UI.saveLocalAgent());
        document.getElementById('agent-status-refresh')?.addEventListener('click', () => UI.refreshAgentStatus());
        document.getElementById('agent-xai-save')?.addEventListener('click', () => UI.saveAgentXaiKey());
        document.getElementById('agent-xai-clear')?.addEventListener('click', () => UI.clearAgentXaiKey());
        window.addEventListener('agent-config-change', () => UI.syncAgentPanel());

        UI.syncAgentPanel();
        UI.refreshAgentStatus();

        UI.updateControlMode();
        UI.updateSimMode();
        UI.initViewToggles();
        initPanelDrag();
        SceneDock.init();
        window.WorldInteract?.init?.();
        ThirdEye.init();
        CreativeWatch.init();
    },
    updateModeDisplay: function (idx) {
        const el = document.getElementById('mode-display');
        if (el && Modes[idx]) el.textContent = Modes[idx].name;
    },
    selectObject: function (obj) {
        if (State.selectedObject === obj) return;
        const prev = State.selectedObject;
        State.selectedObject = obj;
        // E2: selection is focus — wake shadows/physics for selected; re-eval previous
        window.VisibilitySystem?.refreshSleep?.(prev);
        window.VisibilitySystem?.refreshSleep?.(obj);
        if (obj.userData?.isPlayer) {
            if (SimMode.isPlay()) SceneDock.openTab('skin');
            else SceneDock.closeTab();
            Engine.transformControl.detach();
            return;
        }
        if (!SimMode.canEditObject(obj)) {
            UI.status('PLAY mode — world locked. Pause to edit objects.');
            Engine.transformControl.detach();
            return;
        }
        SceneDock.openTab('inspect');
        this.loadInspectorFromObject(obj);
        document.getElementById('btn-lock').innerText = obj.userData.locked ? 'LOCKED' : 'UNLOCK';
        if (!obj.userData.locked && SimMode.isEdit()) Engine.transformControl.attach(obj);
        else Engine.transformControl.detach();
    },
    deselectObject: function () {
        const prev = State.selectedObject;
        State.selectedObject = null;
        window.VisibilitySystem?.refreshSleep?.(prev);
        Engine.transformControl.detach();
        if (SimMode.isPlay() && SimMode.canEditPlayerSkin()) {
            SceneDock.openTab('skin');
        } else {
            SceneDock.closeTab();
        }
    },
    switchInspTab: function (tab) {
        document.querySelectorAll('.insp-tab').forEach((t) => t.classList.toggle('active', t.dataset.inspTab === tab));
        document.querySelectorAll('.insp-panel').forEach((p) => p.classList.toggle('active', p.dataset.inspPanel === tab));
    },
    loadInspectorFromObject: function (obj) {
        if (!obj) return;
        document.getElementById('insp-name').value = obj.userData.name || '';
        document.getElementById('insp-interact-hint').value = obj.userData.interactHint || '';
        const mat = obj.material;
        if (mat?.color) document.getElementById('insp-color').value = '#' + mat.color.getHexString();
        if (mat) {
            document.getElementById('insp-rough').value = mat.roughness ?? 0.5;
            document.getElementById('insp-metal').value = mat.metalness ?? 0.5;
            document.getElementById('insp-emissive').value = '#' + (mat.emissive?.getHexString?.() || '000000');
            document.getElementById('insp-emissive-int').value = mat.emissiveIntensity ?? 0;
        }
        document.getElementById('insp-physics').checked = !!obj.userData.hasPhysics;
        document.getElementById('insp-mass').value = obj.userData.mass ?? 1;
        document.getElementById('insp-friction').value = obj.userData.friction ?? 0.3;
        document.getElementById('insp-restitution').value = obj.userData.restitution ?? 0.5;
        document.getElementById('insp-sound-freq').value = obj.userData.soundFreq ?? 440;
        document.getElementById('insp-sound-type').value = obj.userData.soundType || 'sine';
        document.getElementById('insp-sound-mode').value = obj.userData.soundMode || 'tone';
        document.getElementById('insp-sound-trigger').value = obj.userData.soundTrigger || 'collision';
        const negEl = document.getElementById('insp-negative-lod');
        const negDist = document.getElementById('insp-negative-lod-dist');
        if (negEl) negEl.checked = !!(obj.userData.negativeLOD || obj.userData.negativeLod);
        if (negDist) negDist.value = obj.userData.negativeLodDistance ?? 40;
        this.syncNegativeLodStatus(obj);
        this.populateSoundClipSelect(obj.userData.soundClipId || '');
        this.syncSoundInspectorMode();
        this.syncTextureInspector(obj);
    },
    syncNegativeLodStatus: function (obj) {
        const el = document.getElementById('insp-negative-lod-status');
        if (!el || !obj) return;
        const on = !!(obj.userData?.negativeLOD || obj.userData?.negativeLod);
        const stats = NegativeLod.getStats?.() || {};
        const vis = obj.userData?._visClass || '—';
        const vstats = window.VisibilitySystem?.getStats?.() || {};
        const sleep = obj.userData?._visPhysicsSleep ? ' · phys sleep' : '';
        el.textContent = on
            ? `Neg LOD on · vis ${vis}${sleep} · far unlit (~${obj.userData.negativeLodDistance || 40}m) · flat ${stats.flat ?? '—'}/${stats.registered ?? '—'} · A${vstats.A ?? 0}/B${vstats.B ?? 0}/C${vstats.C ?? 0}/D${vstats.D ?? 0}/E${vstats.E ?? 0} · sh${vstats.shadowsDimmed ?? 0}/ps${vstats.physicsAsleep ?? 0}`
            : `Negative LOD off · vis ${vis}${sleep} · A${vstats.A ?? 0}/B${vstats.B ?? 0}/C${vstats.C ?? 0}/D${vstats.D ?? 0}/E${vstats.E ?? 0}`;
    },
    syncTextureInspector: async function (obj) {
        const status = document.getElementById('insp-texture-status');
        const preview = document.getElementById('insp-texture-preview');
        if (!obj?.material) {
            if (status) status.textContent = 'Select a mesh object to import textures.';
            if (preview) preview.hidden = true;
            return;
        }
        const textures = obj.userData?.textures || {};
        if (status) {
            status.textContent = TextureBridge.formatSlotStatus(
                textures,
                obj.userData?.textureHint,
                obj.userData?.textureHilod?.activeBySlot
            );
        }
        if (preview) {
            const url = await TextureBridge.previewUrlForSlot(textures, 'albedo');
            if (url) {
                preview.src = url;
                preview.hidden = false;
            } else {
                preview.removeAttribute('src');
                preview.hidden = true;
            }
        }
    },
    importTextureSlot: async function (slot) {
        const obj = State.selectedObject;
        if (!obj || !SimMode.canEditObject(obj)) {
            UI.status('Select an object in EDIT mode to import textures');
            return;
        }
        if (!obj.material) {
            UI.status('This object has no material — pick a primitive mesh');
            return;
        }
        try {
            const record = await TextureBridge.pickAndApplyToObject(obj, slot);
            if (!record) return;
            UI.syncTextureInspector(obj);
            UI.status(`${slot} map applied — ${record.name}`);
        } catch (e) {
            UI.status(e.message || 'Texture import failed');
        }
    },
    clearTextureMaps: function () {
        const obj = State.selectedObject;
        if (!obj || !SimMode.canEditObject(obj)) return;
        TextureBridge.clearMaps(obj);
        UI.syncTextureInspector(obj);
        UI.status('Texture maps cleared');
    },
    syncGimpManifest: async function () {
        const obj = State.selectedObject;
        if (!obj || !SimMode.canEditObject(obj)) {
            UI.status('Select an object in EDIT mode — name must match GIMP Object name');
            return;
        }
        if (!obj.material) {
            UI.status('This object has no material — pick a primitive mesh');
            return;
        }
        try {
            const result = await TextureBridge.pickAndApplyGimpManifest(obj);
            if (!result) return;
            UI.syncTextureInspector(obj);
            UI.status(result.message || 'GIMP manifest synced');
        } catch (e) {
            UI.status(e.message || 'GIMP manifest sync failed');
        }
    },
    applyInspectorFromUi: function () {
        const obj = State.selectedObject;
        if (!obj || !SimMode.canEditObject(obj)) return;
        obj.userData.name = document.getElementById('insp-name').value;
        const interactHint = document.getElementById('insp-interact-hint').value.trim();
        if (interactHint) obj.userData.interactHint = interactHint;
        else delete obj.userData.interactHint;
        // Edit full PBR mats — never write into pooled flat materials
        if (obj.userData?.negativeLOD || obj.userData?.negativeLod) {
            NegativeLod.ensureFullForEdit(obj);
        }
        const mat = obj.material;
        if (mat) {
            mat.color.set(document.getElementById('insp-color').value);
            if ('roughness' in mat) mat.roughness = parseFloat(document.getElementById('insp-rough').value);
            if ('metalness' in mat) mat.metalness = parseFloat(document.getElementById('insp-metal').value);
            if (!mat.emissive) mat.emissive = new THREE.Color();
            mat.emissive.set(document.getElementById('insp-emissive').value);
            mat.emissiveIntensity = parseFloat(document.getElementById('insp-emissive-int').value);
            mat.needsUpdate = true;
        }
        const wantPhys = document.getElementById('insp-physics').checked;
        obj.userData.mass = parseFloat(document.getElementById('insp-mass').value);
        obj.userData.friction = parseFloat(document.getElementById('insp-friction').value);
        obj.userData.restitution = parseFloat(document.getElementById('insp-restitution').value);
        obj.userData.soundFreq = parseInt(document.getElementById('insp-sound-freq').value, 10);
        obj.userData.soundType = document.getElementById('insp-sound-type').value;
        obj.userData.soundMode = document.getElementById('insp-sound-mode').value;
        obj.userData.soundTrigger = document.getElementById('insp-sound-trigger').value;
        obj.userData.soundClipId = document.getElementById('insp-sound-clip').value || null;
        const negOn = document.getElementById('insp-negative-lod')?.checked === true;
        const negDist = parseFloat(document.getElementById('insp-negative-lod-dist')?.value);
        if (negOn) {
            obj.userData.negativeLOD = true;
            if (Number.isFinite(negDist) && negDist > 0) obj.userData.negativeLodDistance = negDist;
            NegativeLod.enableObject(obj, {
                distance: Number.isFinite(negDist) ? negDist : undefined,
                source: 'user',
            });
        } else {
            NegativeLod.disableObject(obj, { clearFlag: true, forceOff: true });
        }
        this.syncNegativeLodStatus(obj);
        UI.syncObjectPhysics(obj, wantPhys);
    },
    syncObjectPhysics: function (obj, enabled) {
        const entry = State.physicsObjects.find((p) => p.mesh === obj);
        if (enabled && !obj.userData.hasPhysics) {
            const body = obj.userData.type === 'gltf'
                ? Physics.addBodyFromObject(obj, obj.userData.mass ?? 1)
                : Physics.addBody(obj, obj.userData.type || 'cube');
            body.mass = obj.userData.mass ?? 1;
            State.physicsObjects.push({ mesh: obj, body });
            obj.userData.hasPhysics = true;
        } else if (!enabled && entry) {
            Physics.world.removeBody(entry.body);
            State.physicsObjects = State.physicsObjects.filter((p) => p.mesh !== obj);
            obj.userData.hasPhysics = false;
        } else if (entry?.body) {
            entry.body.mass = obj.userData.mass ?? entry.body.mass;
        }
    },
    testObjectSound: function () {
        const obj = State.selectedObject;
        if (!obj) return;
        AudioSys.playObjectSound(obj, 'test');
    },
    populateSoundClipSelect: function (selectedId = '') {
        const sel = document.getElementById('insp-sound-clip');
        if (!sel) return;
        const clips = SoundLibrary.list();
        sel.innerHTML = '<option value="">— pick recording —</option>'
            + clips.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
        if (selectedId) sel.value = selectedId;
    },
    syncSoundInspectorMode: function () {
        const mode = document.getElementById('insp-sound-mode')?.value || 'tone';
        document.querySelectorAll('.insp-sound-tone').forEach((el) => {
            el.style.display = mode === 'tone' ? '' : 'none';
        });
        document.querySelectorAll('.insp-sound-clip').forEach((el) => {
            el.style.display = mode === 'clip' ? '' : 'none';
        });
        if (mode === 'clip') this.populateSoundClipSelect(document.getElementById('insp-sound-clip')?.value);
    },
    renderSoundLibrary: function () {
        const list = document.getElementById('sfx-library-list');
        if (!list) return;
        const clips = SoundLibrary.list();
        this.populateSoundClipSelect(document.getElementById('insp-sound-clip')?.value);
        if (!clips.length) {
            list.innerHTML = '<p class="insert-hint" style="margin:0;">No sounds yet — record one above.</p>';
            return;
        }
        list.innerHTML = clips.map((c) => `
            <div class="sfx-item" data-sfx-id="${c.id}">
                <span class="sfx-item-name">${c.name}</span>
                <button type="button" class="btn-sm sfx-play" data-sfx-play="${c.id}">▶</button>
                <button type="button" class="btn-sm sfx-del" data-sfx-del="${c.id}">✕</button>
            </div>
        `).join('');
        list.querySelectorAll('[data-sfx-play]').forEach((btn) => {
            btn.addEventListener('click', () => AudioSys.playClip(btn.dataset.sfxPlay));
        });
        list.querySelectorAll('[data-sfx-del]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                await SoundLibrary.deleteClip(btn.dataset.sfxDel);
                UI.renderSoundLibrary();
            });
        });
    },
    positionMoreMenu: function () {
        const menu = document.getElementById('toolbar-more-menu');
        const trigger = document.getElementById('btn-toolbar-more');
        if (!menu?.classList.contains('open') || !trigger || window.innerWidth >= 900) return;
        const r = trigger.getBoundingClientRect();
        menu.style.top = `${r.bottom + 4}px`;
        menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))}px`;
    },
    reloadPlayerSkin: async function () {
        if (!PlayerController.spawned) { this.status('Spawn a player first'); return; }
        const profile = window.AppearanceProfile.profileFromUi(window.AppearanceStore.getPlayerProfile());
        try {
            window.AppearanceStore.setPlayerProfile(profile);
            await PlayerController.applyAppearance(profile);
            window.AppearanceProfile.syncUiFromProfile(profile);
            this.status(`Appearance applied — ${profile.bodyId} · ${profile.hairId}`);
        } catch (e) {
            this.status('Appearance failed: ' + (e.message || e));
        }
    },
    clearCustomBody: async function () {
        const profile = window.AppearanceStore.getPlayerProfile();
        profile.customBodyGlb = null;
        profile.customBodyImport = null;
        const imp = document.getElementById('skin-body-import');
        const url = document.getElementById('skin-model-url');
        if (imp) imp.value = '';
        if (url) url.value = '';
        window.AppearanceStore.setPlayerProfile(profile);
        window.AppearanceProfile.syncUiFromProfile(profile);
        if (PlayerController.spawned) {
            await PlayerController.applyAppearance(profile);
        }
        this.status('Custom body cleared — using manifest default');
    },
    exportAppearanceJson: async function () {
        const profile = window.AppearanceProfile.profileFromUi(window.AppearanceStore.getPlayerProfile());
        try {
            await window.AppearanceExport.copyAppearanceToClipboard(profile);
            this.status('Appearance JSON copied to clipboard');
        } catch (e) {
            window.AppearanceExport.downloadAppearanceJson(profile);
            this.status('Clipboard blocked — downloaded threshold-appearance.json');
        }
    },
    importAppearanceJson: async function () {
        const raw = window.prompt('Paste threshold-appearance JSON:');
        if (!raw?.trim()) return;
        try {
            const profile = window.AppearanceExport.parseAppearanceJson(raw.trim());
            window.AppearanceStore.setPlayerProfile(profile);
            window.AppearanceProfile.syncUiFromProfile(profile);
            if (PlayerController.spawned) {
                await PlayerController.applyAppearance(profile);
            }
            this.status(`Appearance imported — ${profile.bodyId} · ${profile.hairId}`);
        } catch (e) {
            this.status('Import failed: ' + (e.message || e));
        }
    },
    openPlayerCodeRef: function () {
        document.querySelector('[data-target="view-compiler"]')?.click();
        setTimeout(() => {
            window.Compiler?.loadReference?.('players', 'player_skin_reload');
        }, 100);
    },
    updateSimMode: function () {
        const badge = document.getElementById('sim-mode-badge');
        const layer = document.getElementById('ui-layer');
        const edit = SimMode.isEdit();
        if (badge) {
            badge.textContent = edit ? 'EDIT' : 'PLAY';
            badge.classList.toggle('edit', edit);
            badge.classList.toggle('play', !edit);
        }
        if (layer) layer.classList.toggle('play-mode', !edit);
        document.body.classList.toggle('play-mode', !edit);
        const playHint = document.getElementById('play-mode-hint');
        if (playHint) playHint.hidden = edit;
        window.CornerHub?.onModeChange?.(edit);
        if (!edit) {
            GraphicsPrompt.maybeShowDeferred('play');
            Engine.transformControl.detach();
            SceneDock.closeTab();
            SceneDock.setFullyHidden?.(true, false);
        } else {
            SceneDock.closeTab();
            window.CornerHub?.pulseHub?.('tools');
        }
    },
    initViewToggles: function () {
        this.setConsoleBarVisible(false, false);
        this.updateTouchToggle();
    },
    exportGamePackage: function () {
        ExportWizard.open();
    },
    syncAgentPanel: function () {
        const npcCfg = AgentHub.getConfig('grok_npc');
        const localCfg = AgentHub.getConfig('local');
        const persona = document.getElementById('agent-npc-persona');
        const interval = document.getElementById('agent-local-interval');
        const script = document.getElementById('agent-local-script');
        const xaiKey = document.getElementById('agent-xai-key');
        if (persona) persona.value = npcCfg.persona || '';
        if (interval) interval.value = localCfg.intervalMs || 0;
        if (script) script.value = localCfg.script || '';
        if (xaiKey && !xaiKey.value && Auth.isLoggedIn()) {
            xaiKey.placeholder = '•••••••• (saved)';
        }
    },
    refreshAgentStatus: async function () {
        try {
            await AgentStatus.refresh();
        } catch (e) {
            this.status(e.message || 'Agent status refresh failed');
        }
    },
    saveAgentXaiKey: function () {
        const input = document.getElementById('agent-xai-key');
        if (!input?.value?.trim()) {
            this.status('Paste an xAI API key first');
            return;
        }
        if (Auth.login(input.value)) {
            input.value = '';
            input.placeholder = '•••••••• (saved)';
            this.status('xAI key saved for this tab only');
            this.refreshAgentStatus();
        }
    },
    clearAgentXaiKey: function () {
        Auth.logout();
        const input = document.getElementById('agent-xai-key');
        if (input) {
            input.value = '';
            input.placeholder = 'xai-…';
        }
        this.status('xAI key cleared');
        this.refreshAgentStatus();
    },
    attachNpcAgent: function () {
        const persona = document.getElementById('agent-npc-persona')?.value?.trim();
        if (!AgentHub.attachNpcAgent(persona)) {
            this.status('Select an NPC (not player) in EDIT → inspect first');
            return;
        }
        SceneDock.openTab('setup');
        this.status('Grok NPC agent attached — use NPC TALK');
    },
    talkToNpcAgent: async function () {
        const npc = AgentHub.getActiveNpc() || State.objects.find((o) => o.userData?.agentType === 'grok_npc');
        if (!npc) {
            this.status('Attach agent to an NPC first');
            return;
        }
        const msg = document.getElementById('agent-npc-input')?.value?.trim() || 'Hello';
        const replyEl = document.getElementById('agent-npc-reply');
        if (replyEl) replyEl.textContent = 'Thinking...';
        try {
            const { line } = await NpcAgent.talk(npc, msg);
            if (replyEl) replyEl.textContent = `${npc.userData.name}: ${line}`;
            this.status(`${npc.userData.name} replied`);
        } catch (e) {
            if (replyEl) replyEl.textContent = '';
            this.status(e.message || 'NPC talk failed');
        }
    },
    smartDevSuggest: async function () {
        try {
            const input = document.getElementById('comp-input')?.value?.trim();
            if (!input) throw new Error('Compiler input is empty');
            const result = await AgentRouter.runTask('dev_suggest', { code: input });
            const out = document.getElementById('comp-output');
            if (out) out.value = result.code;
            document.querySelector('[data-target="view-compiler"]')?.click();
            this.status(`Smart dev (${result.tier}/${result.provider}/${result.model}, ${result.ms}ms)`);
            this.refreshAgentStatus();
        } catch (e) {
            this.status(e.message || 'Smart dev failed');
        }
    },
    smartDevApply: async function () {
        try {
            const input = document.getElementById('comp-input')?.value?.trim();
            if (!input) throw new Error('Compiler input is empty');
            const result = await AgentRouter.runTask('dev_suggest', { code: input });
            if (document.getElementById('agent-training-queue')?.checked) {
                const row = TrainingImport.buildRow(input, result.code, {
                    meta: { provider: result.provider, model: result.model, source: 'smart_apply' },
                });
                if (row) {
                    TrainingImport.enqueue(row);
                    TrainingImport.syncQueueUi();
                }
            }
            const out = document.getElementById('comp-output');
            const inp = document.getElementById('comp-input');
            if (inp) inp.value = result.code;
            if (out) out.value = result.code;
            window.Compiler?.transpile?.();
            document.querySelector('[data-target="view-compiler"]')?.click();
            this.status(`Smart dev applied (${result.model})`);
            this.refreshAgentStatus();
        } catch (e) {
            this.status(e.message || 'Smart dev apply failed');
        }
    },
    exportTrainingPair: function () {
        try {
            const route = AgentRouter.getRouteLog()[0];
            const { base } = TrainingImport.captureFromCompiler({
                meta: {
                    provider: route?.provider,
                    model: route?.model,
                    source: 'manual_export',
                },
            });
            this.status(`Exported ${base}.json — move to datasets/raw/ then: ${TrainingImport.cliImportHint(base)}`);
        } catch (e) {
            this.status(e.message || 'Training export failed');
        }
    },
    exportTrainingQueue: function () {
        try {
            const n = TrainingImport.exportQueue();
            this.status(`Exported queue (${n} pairs) — import each line or split into raw JSON files`);
        } catch (e) {
            this.status(e.message || 'Queue export failed');
        }
    },
    runAgentBenchmark: async function () {
        const el = document.getElementById('agent-benchmark-results');
        if (el) el.innerHTML = '<p class="insert-hint">Running workflow benchmark…</p>';
        try {
            const summary = await AgentBenchmark.runWorkflow({
                onProgress: (msg) => {
                    if (el) el.innerHTML = `<p class="insert-hint">${msg}</p>`;
                    this.status(msg);
                },
            });
            if (el) el.innerHTML = AgentBenchmark.formatSummaryHtml(summary);
            const appliedMsg = summary.applied?.changed ? ' · tiers auto-applied' : '';
            this.status(`Benchmark ${summary.pct}% (${summary.totalScore}/${summary.totalMax})${appliedMsg}`);
            this.refreshAgentStatus();
        } catch (e) {
            if (el) el.innerHTML = `<p class="insert-hint">Benchmark failed: ${e.message}</p>`;
            this.status(e.message || 'Benchmark failed');
        }
    },
    devAgentSuggest: async function () {
        try {
            const code = await DevAgent.suggestFromCompiler();
            const out = document.getElementById('comp-output');
            if (out) out.value = code;
            document.querySelector('[data-target="view-compiler"]')?.click();
            this.status('Grok Dev suggestion in Compiler output');
        } catch (e) {
            this.status(e.message || 'Dev agent failed');
        }
    },
    devAgentApply: async function () {
        try {
            await DevAgent.applySuggestion();
            document.querySelector('[data-target="view-compiler"]')?.click();
            this.status('Grok Dev applied to Compiler');
        } catch (e) {
            this.status(e.message || 'Dev agent apply failed');
        }
    },
    ollamaDevSuggest: async function () {
        try {
            const code = await OllamaDevAgent.suggestFromCompiler();
            const out = document.getElementById('comp-output');
            if (out) out.value = code;
            document.querySelector('[data-target="view-compiler"]')?.click();
            this.status(`Ollama Dev suggestion (${AgentStatus.snapshot?.ollamaModel || 'local'})`);
            this.refreshAgentStatus();
        } catch (e) {
            this.status(e.message || 'Ollama Dev failed');
        }
    },
    ollamaDevApply: async function () {
        try {
            await OllamaDevAgent.applySuggestion();
            document.querySelector('[data-target="view-compiler"]')?.click();
            this.status('Ollama Dev applied to Compiler');
            this.refreshAgentStatus();
        } catch (e) {
            this.status(e.message || 'Ollama Dev apply failed');
        }
    },
    saveLocalAgent: function () {
        const script = document.getElementById('agent-local-script')?.value || '';
        const intervalMs = parseInt(document.getElementById('agent-local-interval')?.value, 10) || 0;
        AgentHub.setConfig('local', { enabled: intervalMs > 0 && script.trim(), script, intervalMs });
        this.status(intervalMs > 0 ? 'Local agent saved — running on interval' : 'Local agent disabled');
        this.refreshAgentStatus();
    },

    setConsoleBarVisible: function (visible, persist = true) {
        document.body.classList.toggle('console-visible', visible);
        document.body.classList.toggle('console-hidden', !visible);
        const btn = document.getElementById('btn-console-toggle');
        if (btn) {
            btn.classList.toggle('active', visible);
            btn.title = visible ? 'Hide command console' : 'Show command console';
        }
        if (persist) ViewPrefs.set('consoleVisible', visible);
    },
    toggleConsoleBar: function () {
        this.setConsoleBarVisible(document.body.classList.contains('console-hidden'));
    },
    toggleTouchControls: function () {
        TouchControls.toggle();
    },
    updateTouchToggle: function () {
        const btn = document.getElementById('btn-touch-toggle');
        if (btn) {
            const on = TouchControls.enabled;
            btn.textContent = 'TOUCH';
            btn.classList.toggle('active', on);
            btn.title = on ? 'Hide on-screen touch controls' : 'Show on-screen touch controls';
        }
        window.CornerHub?.syncTouchButton?.();
    },
    toggleEnvPanel: function () {
        SceneDock.toggleTab('env');
        document.getElementById('env-panel')?.classList.toggle('mobile-open', true);
    },
    setEnvPanelVisible: function (visible) {
        if (visible) SceneDock.openTab('env');
        else SceneDock.closeTab();
    },
    loadPlayerModel: async function () {
        const url = document.getElementById('skin-model-url')?.value?.trim();
        if (!url) {
            this.status('Enter a GLTF/GLB URL first');
            return;
        }
        if (!PlayerController.spawned) {
            this.status('Spawn as player first');
            return;
        }
        try {
            const profile = window.AppearanceStore.getPlayerProfile();
            profile.customBodyGlb = url;
            profile.customBodyImport = null;
            await PlayerController.applyAppearance(profile);
            window.AppearanceProfile.syncUiFromProfile(profile);
            this.status('URL GLB loaded — copy to import/ for persistence');
            if (PlayerController.group) {
                setTimeout(() => SoundPrompt.offerForObject(PlayerController.group, 'Avatar / emote', 'emote'), 500);
            }
        } catch (e) {
            this.status('Model load failed: ' + e.message);
        }
    },
    loadPlayerModelFile: async function (file) {
        if (!file) return;
        if (!PlayerController.spawned) {
            this.status('Spawn as player first');
            return;
        }
        try {
            const profile = window.AppearanceStore.getPlayerProfile();
            profile.customBodyGlb = URL.createObjectURL(file);
            profile.customBodyImport = null;
            const imp = document.getElementById('skin-body-import');
            if (imp && !imp.value) imp.placeholder = `copy to import/${file.name}`;
            await PlayerController.applyAppearance(profile);
            window.AppearanceProfile.syncUiFromProfile(profile);
            this.status(`Local GLB: ${file.name} — add to import/ for save across sessions`);
        } catch (e) {
            this.status('Local GLB failed: ' + (e.message || e));
        }
    },
    toggleLock: function () {
        if (!State.selectedObject) return;
        const o = State.selectedObject; o.userData.locked = !o.userData.locked;
        if (o.userData.locked) Engine.transformControl.detach(); else Engine.transformControl.attach(o);
        document.getElementById('btn-lock').innerText = o.userData.locked ? "LOCKED" : "UNLOCK";
    },
    openCtx: function (x, y, contextType, targetObj = null) {
        const menu = document.getElementById('ctx-menu');
        const header = document.getElementById('ctx-header');
        const groundGroup = document.getElementById('ctx-group-ground');
        const editGroup = document.getElementById('ctx-group-edit');
        menu.style.display = 'flex'; menu.style.left = x + 'px'; menu.style.top = y + 'px';
        if (contextType === 'object' && targetObj) {
            const root = Engine.resolveRegistryObject(targetObj) || targetObj;
            UI.selectObject(root);
            if (header) header.innerText = 'OBJECT: ' + (root.userData.name || 'Object');
            groundGroup.style.display = 'none';
            editGroup.style.display = 'flex';
            editGroup.style.flexDirection = 'column';
        } else {
            if (header) header.innerText = 'SCENE';
            groundGroup.style.display = 'flex';
            groundGroup.style.flexDirection = 'column';
            editGroup.style.display = 'none';
        }
    },
    closeCtx: function () { document.getElementById('ctx-menu').style.display = 'none'; },
    openJsonEditor: function () {
        if (!State.selectedObject) return;
        document.getElementById('json-modal')?.classList.add('open');
        ensurePanelVisible('#json-modal');
        document.getElementById('json-editor').value = JSON.stringify(State.selectedObject.userData, null, 2);
    },
    applyJson: function () { try { State.selectedObject.userData = JSON.parse(document.getElementById('json-editor').value); this.closeModal(); this.selectObject(State.selectedObject); } catch (e) { alert("Invalid JSON"); } },
    closeModal: function () { document.getElementById('json-modal')?.classList.remove('open'); },
    status: function (msg) {
        const el = document.getElementById('status-msg');
        el.innerText = `> ${msg}`; el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 3000);
    },
    runCmd: function () {
        const input = document.getElementById('cmd-input');
        const raw = input.value.trim();
        if (!raw) return;
        if (raw.toLowerCase() === 'allow pasting') { State.clipboardAllowed = true; input.value = ''; this.status('Pasting Allowed'); return; }
        if (!State.clipboardAllowed && raw.length > 50) { this.status("Type 'allow pasting' first."); return; }
        const result = Runtime.execute(raw, 'command-bar');
        if (result.ok) {
            input.classList.add('cmd-success');
            setTimeout(() => input.classList.remove('cmd-success'), 300);
            input.value = '';
        } else {
            input.classList.add('cmd-error');
            setTimeout(() => input.classList.remove('cmd-error'), 300);
        }
    },
    openInsert: function () {
        if (IS_TOUCH_DEVICE) {
            Engine.raycaster.setFromCamera(new THREE.Vector2(0, 0), Engine.camera);
            const hit = Engine.intersectFloor?.() || [];
            if (hit.length) State.ctxTargetPos.copy(hit[0].point);
        }
        Session.refreshSavedPlayerList();
        document.getElementById('insert-modal')?.classList.add('open');
        ensurePanelVisible('#insert-sheet');
    },
    closeInsert: function () {
        document.getElementById('insert-modal')?.classList.remove('open');
    },
    switchInsertTab: function (tab) {
        document.querySelectorAll('.insert-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
        document.querySelectorAll('.insert-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === tab));
    },
    insertGltfFromPanel: async function () {
        const name = document.getElementById('insert-gltf-name')?.value?.trim() || 'GLTF Model';
        const usePhysics = !!document.getElementById('insert-gltf-physics')?.checked;
        const url = document.getElementById('insert-gltf-url')?.value?.trim();
        const file = document.getElementById('insert-gltf-file')?.files?.[0];
        const pos = World.getCursorPos();

        if (file) {
            try {
                await GltfImport.insertAtCursor({ file, name, usePhysics, pos: null });
                UI.closeInsert();
                UI.status(`Inserted GLTF: ${name}`);
            } catch (e) {
                UI.status(e.message || 'GLTF insert failed');
            }
            return;
        }

        if (url) {
            Actions.dispatch('INSERT_GLTF', { url, name, usePhysics, pos });
            UI.closeInsert();
            return;
        }

        if (ThresholdShell.isNative) {
            const path = await ThresholdShell.pickFile([
                { name: 'GLTF Models', extensions: ['glb', 'gltf'] },
            ]);
            if (!path) return;
            Actions.dispatch('INSERT_GLTF', { path, name, usePhysics, pos });
            UI.closeInsert();
            return;
        }

        UI.status('Pick a .glb file, enter a URL, or use BLENDER MANIFEST');
    },
    insertGltfFromManifest: async function () {
        const name = document.getElementById('insert-gltf-name')?.value?.trim();
        if (!name) {
            UI.status('Enter Object name matching Blender export');
            return;
        }
        try {
            await GltfImport.pickAndInsertFromManifest(name);
            UI.closeInsert();
            UI.status(`Inserted from Blender manifest: ${name}`);
        } catch (e) {
            UI.status(e.message || 'Blender manifest insert failed');
        }
    },
    saveCurrentPlayer: function () {
        const name = prompt('Player name?', Session.playerName) || Session.playerName;
        const code = Runtime.runningCode || '';
        const objects = getSceneObjectsForSpawn();
        const saved = Session.savePlayer(name, code, objects);
        Session.refreshSavedPlayerList();
        const blob = new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `player_${Session.playerKey}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.status(`Saved player ${Session.playerKey} — share this file`);
    },
    importPlayerFile: function (e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (Session.importPlayer(data)) this.status(`Imported player ${data.key}`);
                else this.status('Invalid player file');
            } catch {
                this.status('Invalid player file');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },
    copySessionLink: async function () {
        const link = Network.getShareUrl();
        try {
            await navigator.clipboard.writeText(link);
            this.status('Invite link copied — send to friends');
        } catch {
            this.status(link);
        }
    },
    updateControlMode: function () {
        const btn = document.getElementById('btn-control-mode');
        let label = 'FLY';
        if (State.controlMode === 'vehicle' && window.TcDrive?.active) label = 'VEH';
        else if (State.controlMode === 'walk' && PlayerController.spawned) {
            label = State.viewMode === 'fps' ? 'FPS' : 'TPS';
        }
        if (btn) btn.textContent = label;
        this.updateControlsHint();
    },
    updateControlsHint: function () {
        const hint = document.getElementById('controls-hint');
        if (hint && Controls) {
            hint.textContent = Controls.getHint();
            hint.title = 'Right-click or hold for scene menu';
        }
    },
    updateGamepadStatus: function () {
        const el = document.getElementById('gamepad-status');
        if (!el) return;
        el.textContent = Controls.gamepad
            ? `Controller: ${Controls.gamepadName.slice(0, 40)}`
            : 'Controller: none (plug in gamepad)';
    },
    togglePause: function (reason) {
        if (Network.mode === 'guest') {
            this.status('Only the host can pause');
            return;
        }
        const paused = !State.isPaused;
        const pauseReason = paused ? (reason || 'Paused') : '';
        Actions.dispatch('PAUSE', { paused, reason: pauseReason });
        State.isPaused = paused;
        Session.isPaused = paused;
        Session.pauseReason = pauseReason;
        Session.updateUi();
        Engine._releaseLookLock?.();
        PlayerController._syncWalkOrbit?.();
        this.status(paused ? `Paused${pauseReason ? `: ${pauseReason}` : ''}` : 'Scene resumed — click canvas to aim');
    },
    setCodingPause: function (on) {
        if (!Permissions.canPause() || !Session.autoCodingPause) return;
        if (on) {
            if (!State.isPaused) this.togglePause('Host editing code');
        } else if (Session.pauseReason === 'Host editing code') {
            this.togglePause('');
        }
    },
    openHostPanel: function () {
        this.renderHostPanel();
        document.getElementById('host-panel-modal')?.classList.add('open');
        ensurePanelVisible('#host-panel-sheet');
    },
    closeHostPanel: function () {
        document.getElementById('host-panel-modal')?.classList.remove('open');
    },
    renderHostPanel: function () {
        const list = document.getElementById('host-player-list');
        const roleEl = document.getElementById('host-panel-role');
        const panelModal = document.getElementById('host-panel-modal');
        const linkEl = document.getElementById('session-share-link');
        if (!list) return;

        const isHost = Network.mode === 'host';
        panelModal?.classList.toggle('host-view', isHost);
        if (linkEl) linkEl.value = isHost ? Network.getShareUrl() : '';
        const passEl = document.getElementById('host-passcode');
        if (passEl && isHost) passEl.value = Network.hostPasscode || '';
        if (roleEl) {
            if (Network.mode === 'spectate') roleEl.textContent = 'You are SPECTATING — read-only orbit camera';
            else if (isHost) roleEl.textContent = 'You are HOST — manage players & permissions';
            else roleEl.textContent = Session.isAdmin(Session.playerKey)
                ? 'You are GUEST (Admin)' : 'You are GUEST — personal bindings only';
        }

        const players = isHost ? Network.getPlayerList() : [
            { key: Session.playerKey, name: Session.playerName, admin: Session.isAdmin(Session.playerKey), self: true }
        ];

        list.innerHTML = players.map((p) => `
            <div class="host-player-row">
                <span>${p.name} <code>${p.key}</code>${p.spectator ? ' 👁' : ''}${p.self ? ' (you)' : ''}</span>
                ${isHost && !p.self ? `
                    <label class="host-admin-toggle">
                        <input type="checkbox" data-admin-key="${p.key}" ${p.admin ? 'checked' : ''}> Admin
                    </label>
                ` : `<span class="host-badge">${p.admin ? 'Admin' : 'Player'}</span>`}
            </div>
        `).join('');

        list.querySelectorAll('[data-admin-key]').forEach((cb) => {
            cb.onchange = () => Network.setPlayerAdmin(cb.dataset.adminKey, cb.checked);
        });

        const codingCb = document.getElementById('host-auto-coding-pause');
        if (codingCb) codingCb.checked = Session.autoCodingPause;

        window.CollaborateGuard?._updateUi?.();
        window.HostMigration?.populateHandoffSelect?.();
        window.SurvivalNeedsHud?.syncGuestToggleUi?.();

        const voipEl = document.getElementById('host-voip-summary');
        if (voipEl && Network.mode !== 'solo') {
            const summary = window.VoipConfig?.summarizeVoipConfig?.(Network.voipConfig) || '';
            voipEl.textContent = summary ? `Voice: ${summary}` : '';
        } else if (voipEl) voipEl.textContent = '';
    },
    openBindingsModal: function () {
        const profile = Controls.getProfile();
        const select = document.getElementById('bindings-profile');
        if (select) select.value = profile;
        this.renderBindingsEditor(profile);
        this.updateGamepadStatus();
        document.getElementById('bindings-modal')?.classList.add('open');
        ensurePanelVisible('#bindings-sheet');
    },
    closeBindingsModal: function () {
        Controls._rebind = null;
        Controls._rebindGamepad = null;
        document.getElementById('bindings-modal')?.classList.remove('open');
        this.updateControlsHint();
    },
    switchBindingsTab: function (tab) {
        document.querySelectorAll('.bindings-device-tab').forEach((t) => {
            t.classList.toggle('active', t.dataset.bindingsTab === tab);
        });
        document.getElementById('bindings-panel-keyboard')?.classList.toggle('active', tab === 'keyboard');
        document.getElementById('bindings-panel-gamepad')?.classList.toggle('active', tab === 'gamepad');
    },
    renderBindingsEditor: function (profile) {
        const p = profile || document.getElementById('bindings-profile')?.value || Controls.getProfile();
        Controls.renderEditor(p);
    },
    resetBindingsProfile: function () {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        Controls.resetProfile(profile);
        this.renderBindingsEditor(profile);
        this.status(`${profile === 'host' ? 'Host' : 'Guest'} keyboard + controller reset`);
    },
    startKeyboardBinding: function (action, slot = 0) {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        const slotIdx = slot === 1 ? 1 : 0;
        document.querySelectorAll(`[data-bind="${action}"]`).forEach((btn) => {
            const s = parseInt(btn.dataset.slot || '0', 10);
            if (s === slotIdx) {
                btn.textContent = slotIdx === 1 ? '2nd… Esc' : 'Key… Esc';
                btn.classList.add('binding-listening');
            }
        });
        Controls.startKeyboardRebind(profile, action, (ok, code) => {
            this.renderBindingsEditor(profile);
            if (ok) {
                const label = CONTROL_ACTIONS[action]?.label || action;
                const which = slotIdx === 1 ? '2nd' : 'primary';
                this.status(`${label}: ${which} → ${Controls.formatCode(code)}`);
            }
        }, { slot: slotIdx });
    },
    startGamepadBinding: function (action) {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        const btn = document.querySelector(`[data-gpad-bind="${action}"]`);
        if (btn) btn.textContent = 'Press button… (Esc cancel)';
        Controls.startGamepadRebind(profile, action, (ok, idx) => {
            this.renderBindingsEditor(profile);
            if (ok) this.status(`Controller bound: ${Controls.formatGamepadButton(idx)} → ${CONTROL_ACTIONS[action]?.label || action}`);
            else if (ok === false) this.renderBindingsEditor(profile);
        });
    },
    clearKeyboardBinding: function (action) {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        Controls.clearKeyboardBinding(profile, action);
        this.renderBindingsEditor(profile);
    },
    clearGamepadBinding: function (action) {
        const profile = document.getElementById('bindings-profile')?.value || 'host';
        Controls.clearGamepadBinding(profile, action);
        this.renderBindingsEditor(profile);
    },
    toggleControlMode: function () {
        if (PlayerController.spawned) {
            if (State.controlMode === 'walk') {
                State.controlMode = 'fly';
                Engine._releaseLookLock?.();
                if (Engine.controls) Engine.controls.enabled = true;
                this.status('Fly camera mode');
            } else {
                State.controlMode = 'walk';
                PlayerController._inheritLookFromCamera?.();
                PlayerController._syncWalkOrbit?.();
                this.status('Walk — LMB aim · RMB shoot · F interact/third eye · click canvas to look');
            }
        } else {
            const pos = World.getCursorPos();
            PlayerController.spawn(pos.x, pos.y + 1, pos.z);
        }
        ThirdEye.updateHud();
        this.updateControlMode();
    },
    saveWorld: async function () {
        const name = prompt('World name?', `World-${Date.now().toString(36).slice(-4)}`);
        if (!name) return;
        try {
            const record = await Persistence.saveWorld(name);
            this._lastWorldCode = record.code;
            document.getElementById('world-code-input').value = record.code;
            document.getElementById('world-share-link').value = Persistence.getShareUrl(record.code);
            this.refreshWorldList();
            this.status(`World saved: ${record.name} (${record.code})`);
        } catch (e) {
            this.status('Save failed: ' + e.message);
        }
    },
    openWorldModal: function () {
        this.refreshWorldList();
        document.getElementById('world-modal')?.classList.add('open');
        ensurePanelVisible('#world-sheet');
    },
    closeWorldModal: function () {
        document.getElementById('world-modal')?.classList.remove('open');
    },
    refreshWorldList: function () {
        const list = document.getElementById('world-list');
        if (!list) return;
        const worlds = Persistence.listLocal();
        if (!worlds.length) {
            list.innerHTML = '<p class="insert-hint">No saved worlds on this device yet.</p>';
            return;
        }
        list.innerHTML = worlds.map((w) => `
            <button class="insert-action secondary world-item" data-world-code="${w.code}" type="button">
                ${w.name} <code>${w.code}</code>${w.cloud ? ' ☁' : ''}
            </button>
        `).join('');
    },
    loadWorldByCode: async function (code) {
        const input = document.getElementById('world-code-input');
        const trimmed = (code || input?.value || '').trim().toUpperCase();
        if (!trimmed) { this.status('Enter a world code'); return; }
        try {
            const record = await Persistence.loadWorld(trimmed);
            this._lastWorldCode = record.code;
            if (input) input.value = record.code;
            document.getElementById('world-share-link').value = Persistence.getShareUrl(record.code);
            this.updateControlMode();
            this.closeWorldModal();
            this.status(`Loaded world ${record.name} (${record.code})`);
        } catch (e) {
            this.status(e.message);
        }
    },
    copyWorldLink: async function () {
        const code = document.getElementById('world-code-input')?.value || this._lastWorldCode;
        if (!code) { this.status('Save or load a world first'); return; }
        const link = Persistence.getShareUrl(code);
        document.getElementById('world-share-link').value = link;
        try {
            await navigator.clipboard.writeText(link);
            this.status('World link copied');
        } catch {
            this.status(link);
        }
    },
    exportCurrentWorld: function () {
        const code = document.getElementById('world-code-input')?.value || this._lastWorldCode || 'SNAPSHOT';
        const name = prompt('Export name?', 'world-export') || 'world-export';
        const record = { code, name, data: Sync.capture(), savedAt: Date.now() };
        Persistence.exportFile(record);
        this.status('World file exported');
        import('../shared/steamBridge.js').then(({ SteamBridge }) => {
            SteamBridge.unlock('WORLD_SAVED');
        }).catch(() => {});
    },
    importWorldFile: async function (e) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const record = await Persistence.importFile(file);
            this._lastWorldCode = record.code;
            document.getElementById('world-code-input').value = record.code;
            document.getElementById('world-share-link').value = Persistence.getShareUrl(record.code);
            this.refreshWorldList();
            this.updateControlMode();
            this.status(`Imported world ${record.name || record.code}`);
        } catch (err) {
            this.status('Import failed: ' + err.message);
        }
        e.target.value = '';
    }
};
