import { copyFromElement } from '../utils/clipboard.js';
import { IS_GROK_EDITION } from '../config.js';
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
CONTEXT:
You are an expert developer for "THRESHOLD ENGINE", a 3D sandbox using Three.js, Cannon-ES physics, and retro/hyper render modes.

GLOBAL ACCESS: World, State, Engine, THREE, Physics, Utils, AudioSys, Runtime, Session

API:
- World.createObject(type, name, colorHex, usePhysics) — cube|sphere|cone|torus
- World.addCustom(geometry, material, name, usePhysics)
- Engine.setRenderMode(0-4)
- State.objects, State.env (time, fog, water, atmosphere)

RULES:
- Prefer extending the CURRENT SCENE unless user asks to clear.
- Wrap new scripts in an IIFE when replacing the whole scene.
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