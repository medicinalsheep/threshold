import { copyFromElement } from '../utils/clipboard.js';
import { IS_GROK_EDITION, APP_URL, VERSION } from '../config.js';
import { Auth } from '../auth/main.js';
import { generateScript } from '../grok/client.js';
import { getSceneContext } from '../shared/sceneContext.js';
import { getSoundContext } from '../shared/soundContext.js';
import { getReferencePromptBlock } from '../shared/referenceLibrary.js';
import { getRenderModePromptBlock } from '../shared/renderModes.js';
import { SoundLibrary } from '../shared/soundLibrary.js';

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
        grokBtn.style.display = IS_GROK_EDITION ? 'inline-block' : 'none';
        grokBtn.addEventListener('click', () => Prompter.generateWithGrok());
    }

    Prompter.syncSoundPanel();
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
Stack: Three.js, Cannon-ES, layered retro render modes (depth-band grids preserve 3D), multiplayer.

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
- Dev CLI: npm run textures:watch (hot-reload) + npm run blender:export -- --blend file.blend --object "Name"

RENDER MODES (all remain true 3D — post-process stylizes, depth bands preserve space):
${getRenderModePromptBlock()}

LEGO FIT: extend live scene via World.createObject — no clearWorld. Snap props with offsets from World.getCursorPos(). Set userData mass/friction/restitution for Collision panel. Hyper(4) default for realism.

SPECTATE: guests can watch via lobby SPECTATE or nav SPECTATE tab (read-only orbit).

${getReferencePromptBlock()}
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

        const sceneBlock = useScene ? `\n\n${getSceneContext()}\n\nBuild on this scene. World.clearWorld() only if explicitly requested.` : '';
        const soundBlock = useSounds
            ? `\n\n${getSoundContext(this.getSelectedSoundIds())}\n\nWhen generated features need audio, reference clip IDs above or leave soundClipId null for user to record later.`
            : '';

        return {
            idea,
            prompt: `
${this.apiContext}
${sceneBlock}
${soundBlock}

TASK: ${taskLines[taskType] || taskLines.extend}

OUTPUT REQUIREMENTS:
- Describe how changes interact with EDIT vs PLAY modes
- Reference Compiler library patterns (players/worlds/techniques) where applicable
- Return runnable JS for COMPILER at ${APP_URL}
- Note which inspector panels users will use (Texture/Collision/Audio)
- If sounds are listed, wire userData.soundClipId + soundTrigger on matching objects
- If textures are listed, set userData.textureHint paths (textures/slug_albedo.png); user runs GIMP export then ENGINE GIMP SYNC
- For 3D props, reference Blender GLB path (import/slug.glb) and userData.hasPhysics/mass/friction — INSERT → GLTF in Engine
`.trim()
        };
    },

    generate() {
        this.syncSoundPanel();
        document.getElementById('prompt-output').value = this.buildPrompt().prompt;
    },

    generateWithGrok: async function () {
        if (!Auth.isLoggedIn()) {
            document.getElementById('auth-overlay')?.style.setProperty('display', 'flex');
            return;
        }

        const { idea, prompt } = this.buildPrompt();
        const outputBox = document.getElementById('prompt-output');
        const grokBtn = document.getElementById('btn-prompt-grok');
        const flash = document.getElementById('prompt-flash');

        outputBox.value = prompt;
        grokBtn.disabled = true;
        grokBtn.textContent = 'GENERATING...';

        try {
            const script = await generateScript(prompt, idea || 'extend current scene');
            outputBox.value = script;
            flash.textContent = 'SCRIPT GENERATED';
            flash.style.opacity = 1;
            setTimeout(() => { flash.style.opacity = 0; }, 2000);
        } catch (err) {
            outputBox.value = `${prompt}\n\n/* GROK ERROR: ${err.message} */`;
            flash.textContent = 'ERROR';
            flash.style.opacity = 1;
            setTimeout(() => { flash.style.opacity = 0; }, 3000);
        } finally {
            grokBtn.disabled = false;
            grokBtn.textContent = 'RUN WITH GROK';
        }
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