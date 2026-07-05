import { copyFromElement } from '../utils/clipboard.js';
import { IS_GROK_EDITION, APP_URL, VERSION } from '../config.js';
import { Auth } from '../auth/main.js';
import { generateScript } from '../grok/client.js';
import { getSceneContext } from '../shared/sceneContext.js';

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

You are an expert developer for THRESHOLD — a browser-based 3D sandbox (Engine + Compiler + PromptGen tabs).
Stack: Three.js, Cannon-ES physics, 5 retro/hyper render modes, optional multiplayer sessions.

HOW TO DELIVER CODE:
1. Output executable JavaScript only (no markdown fences unless the user prefers them).
2. The user pastes your code into the COMPILER tab → clicks RUN IN ENGINE, or runs it in the Engine command bar (type "allow pasting" first for long snippets).
3. Open the tool at ${APP_URL} to test. Multiplayer: create session → share ?room=CODE link.

GLOBAL ACCESS (already on window): World, State, Engine, THREE, CANNON, Physics, PlayerController, Persistence, Runtime, Session, Network, Environment, Utils, AudioSys

SCENE API:
- World.createObject(type, name, colorHex, usePhysics) — types: cube|sphere|cone|torus
- World.addCustom(geometry, material, name, usePhysics)
- World.spawnCharacter() — static NPC human (body cube + head sphere, userData.isHuman)
- World.spawnPlayablePlayer() — spawns walkable player at cursor
- World.clearWorld() — only when user wants a fresh scene
- Engine.setRenderMode(0-4) — 0 Threshold, 1 1-Bit, 2 Terminal, 3 SMPTE, 4 Hyper (physics+bloom)
- State.objects, State.env (timeOfDay, fogDensity, waterEnabled, atmosphereEnabled)
- State.controlMode — 'walk' (third-person human) or 'fly' (free camera)

HUMAN CHARACTER REFERENCE (for NPCs and playable avatars):
Static NPC pattern (World.spawnCharacter):
  - Body: scaled cube (0.55×1.1×0.35), color 0x3366cc, userData.isCharacter + isHuman
  - Head: scaled sphere (0.45), skin 0xffcc99
Playable human (PlayerController.spawn(x,y,z)):
  - Full mesh: torso, head, arms, legs (THREE.Group, userData.isPlayer/isHuman)
  - Cannon cylinder body (mass 70, fixedRotation) — WASD walk relative to camera, Space jump
  - Third-person camera follow in walk mode; toggle fly with UI or despawn
Custom humans: build a THREE.Group with MeshStandardMaterial limbs, optional Physics.addBody for ragdoll props

PERSISTENCE API:
- Persistence.saveWorld(name) — saves full scene to IndexedDB (+ cloud if configured), returns {code, name}
- Persistence.loadWorld(code) — restores scene; share URL: ${APP_URL}?world=CODE
- Persistence.getShareUrl(code), Persistence.listLocal(), Persistence.exportFile(record)

RULES:
- Prefer extending the CURRENT SCENE unless the user asks to clear.
- Use physics (usePhysics: true) for interactive/droppable objects in Hyper mode.
- Wrap full scene replacements in an IIFE when appropriate.
`,

    buildPrompt: function () {
        const idea = document.getElementById('prompt-idea').value;
        const complexity = document.getElementById('prompt-complexity').value;
        const style = document.getElementById('prompt-style').value;
        const resolution = document.getElementById('prompt-res').value;
        const colorScheme = document.getElementById('prompt-color').value;
        const useScene = document.getElementById('prompt-use-scene')?.checked;

        const instructions = [];

        if (complexity === 'simple') instructions.push('Create a static scene layout.');
        else if (complexity === 'anim') instructions.push('Add animation via userData.isRotating or physics.');
        else if (complexity === 'algo') instructions.push('Use procedural/math-based generation.');

        if (resolution === 'low') instructions.push('Use low-poly geometry.');
        else if (resolution === 'high') instructions.push('Use high-poly smooth geometry.');
        else instructions.push('Balanced geometry.');

        if (colorScheme === 'neon') instructions.push('Neon colors with emissive glow.');
        else if (colorScheme === 'mono') instructions.push('Monochrome palette.');
        else if (colorScheme === 'adaptive') instructions.push('High contrast colors for all render modes.');
        else if (colorScheme === 'realistic') instructions.push('PBR natural materials.');

        const sceneBlock = useScene ? `\n\n${getSceneContext()}\n\nIMPORTANT: Build on the current scene state above. Only call World.clearWorld() if the user explicitly wants a fresh start.` : '';

        return {
            idea,
            prompt: `
${this.apiContext}
${sceneBlock}

TASK:
${idea ? `Extend/improve the scene: "${idea}"` : 'Improve the current live scene based on the context above.'}

SPECIFICATIONS:
${instructions.map((i) => `- ${i}`).join('\n')}

OUTPUT: Return runnable JavaScript for THRESHOLD. User will paste into Compiler at ${APP_URL} and click RUN IN ENGINE.

${style === 'spec' ? 'Provide a brief plan, then code.' : 'Provide code immediately.'}
`.trim()
        };
    },

    generate: function () {
        const { prompt } = this.buildPrompt();
        document.getElementById('prompt-output').value = prompt;
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