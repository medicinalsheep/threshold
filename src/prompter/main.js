import { copyFromElement } from '../utils/clipboard.js';
import { IS_GROK_EDITION, APP_URL, VERSION } from '../config.js';
import { Auth } from '../auth/main.js';
import { generateScript } from '../grok/client.js';
import { getSceneContext } from '../shared/sceneContext.js';
import { getReferencePromptBlock } from '../shared/referenceLibrary.js';

export function initPrompter() {
    console.log('Initializing Prompter...');
    document.getElementById('btn-prompt-gen').addEventListener('click', () => Prompter.generate());
    document.getElementById('btn-prompt-copy').addEventListener('click', () => Prompter.copy());

    const grokBtn = document.getElementById('btn-prompt-grok');
    if (grokBtn) {
        grokBtn.style.display = IS_GROK_EDITION ? 'inline-block' : 'none';
        grokBtn.addEventListener('click', () => Prompter.generateWithGrok());
    }
}

const Prompter = {
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

RENDER MODES (parallel depth-layer grids):
- 0 Threshold, 1 1-Bit, 2 Terminal (green bands), 3 SMPTE, 4 Hyper (physics+bloom)
- Space objects on Z-axis / luminance for readable retro depth

${getReferencePromptBlock()}
`,

    buildPrompt() {
        const idea = document.getElementById('prompt-idea').value;
        const taskType = document.getElementById('prompt-task')?.value || 'extend';
        const useScene = document.getElementById('prompt-use-scene')?.checked;

        const taskLines = {
            extend: idea ? `Extend the live world: "${idea}"` : 'Extend the current live world.',
            player: idea ? `Create/improve player type: "${idea}"` : 'Design a playable or NPC player type.',
            world: idea ? `Build world layout: "${idea}"` : 'Design a world layout from current scene.',
            workflow: idea ? `Follow workflow / game design: "${idea}"` : 'Describe a complete workflow from lobby to playable game.',
            audit: 'Audit current scene — list what is editable in EDIT mode vs locked in PLAY mode.'
        };

        const sceneBlock = useScene ? `\n\n${getSceneContext()}\n\nBuild on this scene. World.clearWorld() only if explicitly requested.` : '';

        return {
            idea,
            prompt: `
${this.apiContext}
${sceneBlock}

TASK: ${taskLines[taskType] || taskLines.extend}

OUTPUT REQUIREMENTS:
- Describe how changes interact with EDIT vs PLAY modes
- Reference Compiler library patterns (players/worlds/techniques) where applicable
- Return runnable JS for COMPILER at ${APP_URL}
- Note which inspector panels users will use (Texture/Collision/Audio)
`.trim()
        };
    },

    generate() {
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