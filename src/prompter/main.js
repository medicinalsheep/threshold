import { copyFromElement } from '../utils/clipboard.js';
import { IS_GROK_EDITION, APP_URL, VERSION } from '../config.js';
import { Auth } from '../auth/main.js';
import { generateScript } from '../grok/client.js';
import { getSceneContext, getAssetContext } from '../shared/sceneContext.js';
import { getSoundContext } from '../shared/soundContext.js';
import { getReferencePromptBlock } from '../shared/referenceLibrary.js';
import { getRenderModePromptBlock } from '../shared/renderModes.js';
import { GraphicsProfile } from '../shared/graphicsProfile.js';
import { getGraphicsExportBlock } from '../shared/graphicsExportProfiles.js';
import { SoundLibrary } from '../shared/soundLibrary.js';
import { PROMPT_COOKBOOK } from '../shared/promptCookbook.js';
import { ViewPrefs } from '../shared/viewPrefs.js';
import { buildProductionPlan, buildProductionReviewPrompt } from '../shared/assetProductionPlan.js';
import { getMaterialPresetPromptBlock } from '../shared/materialPresets.js';
import { getShaderHookPromptBlock } from '../shared/shaderRegistry.js';
import { getShaderGraphPromptBlock } from '../shared/shaderNodeGraph.js';

function renderSoundPicker() {
    const list = document.getElementById('prompt-sound-list');
    if (!list) return;
    const clips = SoundLibrary.list();
    if (!clips.length) {
        list.innerHTML = '<p class="prompt-sound-empty">No recordings yet — use ENGINE → SFX tab to record sounds.</p>';
        return;
    }
    list.innerHTML = clips.map((c) => `
        <label class="prompt-sound-item">
            <input type="checkbox" class="prompt-sound-check" value="${c.id}" checked>
            <span>${c.name}</span>
            <code>${c.id}</code>
        </label>
    `).join('');
}

export function initPrompter() {
    console.log('Initializing Prompter...');
    document.getElementById('btn-prompt-gen').addEventListener('click', () => Prompter.generate());
    document.getElementById('btn-prompt-copy').addEventListener('click', () => Prompter.copy());
    document.getElementById('prompt-use-sounds')?.addEventListener('change', () => Prompter.syncSoundPanel());
    document.getElementById('prompt-sound-all')?.addEventListener('click', () => {
        document.querySelectorAll('.prompt-sound-check').forEach((el) => { el.checked = true; });
    });
    document.getElementById('prompt-sound-none')?.addEventListener('click', () => {
        document.querySelectorAll('.prompt-sound-check').forEach((el) => { el.checked = false; });
    });

    SoundLibrary.init().then(() => renderSoundPicker());
    window.addEventListener('sound-library-change', renderSoundPicker);

    const grokBtn = document.getElementById('btn-prompt-grok');
    if (grokBtn) {
        grokBtn.addEventListener('click', () => Prompter.generateWithGrok());
    }

    Prompter.syncSoundPanel();
    Prompter.renderCookbook();
}

const Prompter = {
    getSelectedSoundIds() {
        return [...document.querySelectorAll('.prompt-sound-check:checked')].map((el) => el.value);
    },

    syncSoundPanel() {
        const on = document.getElementById('prompt-use-sounds')?.checked;
        const panel = document.getElementById('prompt-sound-panel');
        if (panel) panel.style.display = on ? 'block' : 'none';
    },

    apiContext: `
TOOL: THRESHOLD SUITE v${VERSION}
LIVE APP: ${APP_URL}

You are an expert for THRESHOLD (Engine + Compiler reference library + PromptGen).
Stack: Three.js, Cannon-ES, realistic PBR default (MeshStandard + GIMP/Blender textures), multiplayer.

DELIVER CODE:
1. Executable JavaScript — user pastes into COMPILER → CHECK CODE READY → RUN IN ENGINE
2. Tool URL: ${APP_URL}

EDIT vs PLAY (critical):
- PAUSED = EDIT MODE: host/admin can edit world objects, textures, collision, audio, run world code
- RUNNING = PLAY MODE: world/map LOCKED; players only edit their player skin/code (Player Skin panel)
- Inspector panels in EDIT: General, Texture, Collision, Audio per selected object
- Use Compiler reference library for player types, worlds, techniques

GLOBAL API: World, State, Engine, THREE, Physics, PlayerController, Persistence, Runtime, Session, Network, Controls, SimMode, UI

OBJECT EDIT METADATA (set in code for inspector):
- material: color, roughness, metalness, emissive, emissiveIntensity
- userData: hasPhysics, mass, friction, restitution, soundFreq, soundType, isHuman, isPlayer
- userData: soundMode ('clip'|'tone'), soundClipId (from user library), soundTrigger (collision|interact|emote|ambient)
- userData: textures ({ albedo, roughness, metalness } clip IDs from Texture tab), textureHint (local path string for GIMP/Blender export)
- GIMP: plugins/threshold-gimp/threshold_export.py writes textures/* + threshold_manifest.json — Engine GIMP SYNC matches objectName
- Blender: plugins/threshold-blender exports import/*.glb + threshold_blender_manifest.json — Engine INSERT → GLTF or BLENDER MANIFEST
- Dev CLI: npm run textures:watch (hot-reload) + npm run blender:export -- --blend file.blend --object "Name" [--lod]
- Mesh LOD: name Blender duplicates {Object}_LOD1 / _LOD2 — manifest models[].lods[] — Engine distance switch
- Cinematic: video/*.mp4|webm → await World.playCutscene('video/intro.mp4', { skippable: true, onComplete: fn }) — HTML5 VideoTexture

VISUAL STYLE (default realistic PBR — retro only when user asks):
${getRenderModePromptBlock()}

GRAPHICS TIERS (device performance — all tiers stay realistic PBR; SCENE → ENV):
${GraphicsProfile.getPromptBlock()}
- Default: realistic materials, PBR textures (albedo/roughness/metalness), render mode 4
- Retro Threshold/1-Bit/Terminal/SMPTE: ONLY when user explicitly requests retro / gallery / nostalgia
- Lite/Mobile tiers reduce texture resolution & effects — not retro shaders

TARGETED GRAPHICS EXPORT (Phase J — ship per store from one manifest):
${Object.entries(getGraphicsExportBlock().profiles).map(([id, p]) => `- ${id}: tier=${p.tier}, textureMax=${p.textureMax} — ${p.notes}`).join('\n')}
- CLI: npm run export:graphics -- --profile android — prunes _512/_1k/_2k texture variants into dist-export/

LEGO FIT: extend live scene via World.createObject — no clearWorld. Use MeshStandardMaterial defaults (roughness ~0.5, envMapIntensity ~0.45). Assign userData.textures from GIMP exports. Render mode 4 unless user asked for retro.

SPECTATE: guests can watch via lobby SPECTATE or nav SPECTATE tab (read-only orbit).

ASSET OUTPUT (when scene uses textures/GLTF/video):
- Include ASSETS comment block in generated JS listing paths: textures/{slug}_albedo.png, import/{slug}.glb, video/intro.mp4
- Object display name must match GIMP/Blender export name (e.g. "Stone Block" → stone_block_*)
- After RUN: user GIMP SYNC / INSERT GLTF / or textures:watch in dev — blobs are local until native bundle (Phase E)

${getReferencePromptBlock()}

PRODUCTION PLAN (when SETUP design brief exists — follow pipeline order strictly):
Use ViewPrefs designBriefDraft if present; otherwise infer placement/weather from the idea.

${getMaterialPresetPromptBlock()}

${getShaderHookPromptBlock()}

${getShaderGraphPromptBlock()}
`,

    buildPrompt() {
        const idea = document.getElementById('prompt-idea').value;
        const taskType = document.getElementById('prompt-task')?.value || 'extend';
        const useScene = document.getElementById('prompt-use-scene')?.checked;
        const useSounds = document.getElementById('prompt-use-sounds')?.checked;

        const taskLines = {
            extend: idea ? `Extend the live world: "${idea}"` : 'Extend the current live world.',
            player: idea ? `Create/improve player type: "${idea}"` : 'Design a playable or NPC player type.',
            world: idea ? `Build world layout: "${idea}"` : 'Design a world layout from current scene.',
            workflow: idea ? `Follow workflow / game design: "${idea}"` : 'Describe a complete workflow from lobby to playable game.',
            audit: 'Audit current scene — list what is editable in EDIT mode vs locked in PLAY mode.'
        };

        const sceneBlock = useScene
            ? `\n\n${getSceneContext()}\n\n${getAssetContext()}\n\nBuild on this scene. World.clearWorld() only if explicitly requested.`
            : '';
        const soundBlock = useSounds
            ? `\n\n${getSoundContext(this.getSelectedSoundIds())}\n\nWhen generated features need audio, reference clip IDs above or leave soundClipId null for user to record later.`
            : '';

        const brief = ViewPrefs.get('designBriefDraft', null);
        const planBlock = brief?.answers?.production
            ? `\n\n${buildProductionReviewPrompt(buildProductionPlan(brief))}`
            : '\n\nIf building exterior surfaces: set userData.surfaceType, weather variants (wet/dust/snow), and MaterialPresets before codegen.';

        return {
            idea,
            prompt: `
${this.apiContext}
${sceneBlock}
${soundBlock}
${planBlock}

TASK: ${taskLines[taskType] || taskLines.extend}

OUTPUT REQUIREMENTS:
- Describe how changes interact with EDIT vs PLAY modes
- Reference Compiler library patterns (players/worlds/techniques) where applicable
- Return runnable JS for COMPILER at ${APP_URL}
- Note which inspector panels users will use (Texture/Collision/Audio)
- If sounds are listed, wire userData.soundClipId + soundTrigger on matching objects
- If textures are listed, set userData.textureHint paths (textures/slug_albedo.png); user runs GIMP export then ENGINE GIMP SYNC
- For 3D props, reference Blender GLB path (import/slug.glb) and userData.hasPhysics/mass/friction — INSERT → GLTF in Engine
- List all assets in a // ASSETS: comment block so EXPORT walkthrough (CREDITS step) and manifest can attribute licenses
`.trim()
        };
    },

    generate() {
        this.syncSoundPanel();
        document.getElementById('prompt-output').value = this.buildPrompt().prompt;
    },

    generateWithGrok: async function () {
        const { idea, prompt } = this.buildPrompt();
        const outputBox = document.getElementById('prompt-output');
        const grokBtn = document.getElementById('btn-prompt-grok');
        const flash = document.getElementById('prompt-flash');

        outputBox.value = prompt;
        if (grokBtn) {
            grokBtn.disabled = true;
            grokBtn.textContent = 'GENERATING...';
        }

        try {
            const script = await generateScript(prompt, idea || 'extend current scene');
            outputBox.value = script;
            flash.textContent = 'SCRIPT GENERATED';
            flash.style.opacity = 1;
            setTimeout(() => { flash.style.opacity = 0; }, 2000);
        } catch (err) {
            if (!Auth.isLoggedIn() && IS_GROK_EDITION) {
                document.getElementById('auth-overlay')?.style.setProperty('display', 'flex');
            }
            outputBox.value = `${prompt}\n\n/* AGENT ERROR: ${err.message} */`;
            flash.textContent = 'ERROR';
            flash.style.opacity = 1;
            setTimeout(() => { flash.style.opacity = 0; }, 3000);
        } finally {
            if (grokBtn) {
                grokBtn.disabled = false;
                grokBtn.textContent = 'RUN AGENT (tiered)';
            }
        }
    },

    renderCookbook() {
        const list = document.getElementById('prompt-cookbook-list');
        if (!list) return;
        list.innerHTML = PROMPT_COOKBOOK.map((entry) => `
            <button type="button" class="prompt-cookbook-item" data-cookbook-id="${entry.id}" title="${entry.hint || ''}">
                <strong>${entry.title}</strong>
                <span>${entry.hint || entry.task}</span>
            </button>
        `).join('');
        list.querySelectorAll('[data-cookbook-id]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const entry = PROMPT_COOKBOOK.find((e) => e.id === btn.dataset.cookbookId);
                if (!entry) return;
                const task = document.getElementById('prompt-task');
                const idea = document.getElementById('prompt-idea');
                if (task) task.value = entry.task;
                if (idea) idea.value = entry.idea;
                const flash = document.getElementById('prompt-flash');
                if (flash) {
                    flash.textContent = entry.title.toUpperCase();
                    flash.style.opacity = 1;
                    setTimeout(() => { flash.style.opacity = 0; }, 1600);
                }
            });
        });
    },

    copy: async function () {
        const el = document.getElementById('prompt-output');
        try {
            await copyFromElement(el);
            const msg = document.getElementById('prompt-flash');
            msg.textContent = 'COPIED';
            msg.style.opacity = 1;
            setTimeout(() => { msg.style.opacity = 0; }, 1500);
        } catch {
            el.select();
        }
    }
};