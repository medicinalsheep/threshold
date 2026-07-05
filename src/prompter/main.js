import { copyFromElement } from '../utils/clipboard.js';
import { IS_GROK_EDITION } from '../config.js';
import { Auth } from '../auth/main.js';
import { generateScript } from '../grok/client.js';

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
You are an expert developer for "THRESHOLD ENGINE", a limitless 3D sandbox tool blending Three.js for rendering, Cannon-ES for realistic physics, and Unreal Bloom for hyper-glow effects.

GLOBAL ACCESS:
- World, State, THREE, Physics, Utils, AudioSys, Engine

API REFERENCE:
1. World.createObject(type, name, colorHex, usePhysics); // Types: 'cube', 'sphere', 'cone', 'torus'
2. World.addCustom(geometry, material, name, usePhysics);
3. World.importModule(modulePath, alias); // Async dynamic imports
4. Utils.isHyper() -> True in Bloom/Glow mode
5. AudioSys.playTone(freq, type='sine', dur=0.5);
6. Physics.addBody(mesh, shapeType);
7. Engine.setRenderMode(idx); // 0-4: Threshold, 1-Bit, Terminal, SMPTE, Hyper
8. State.objects;

COMPATIBILITY RULES:
- Use THREE.Scene.add(group) for hierarchies; add lights and fog for atmosphere.
- Use addCustom for procedural geometry; import GLTFLoader for models.
- Custom materials: THREE.MeshPhysicalMaterial with roughness/metalness/emissive for neon.
- Physics: usePhysics=true for interactive objects.
- Always wrap code in an IIFE: (() => { World.clearWorld(); /* code */ })();
`,

    buildPrompt: function () {
        const idea = document.getElementById('prompt-idea').value;
        const complexity = document.getElementById('prompt-complexity').value;
        const style = document.getElementById('prompt-style').value;
        const resolution = document.getElementById('prompt-res').value;
        const colorScheme = document.getElementById('prompt-color').value;

        const instructions = [];

        if (complexity === 'simple') instructions.push('Create a static scene layout with basic objects.');
        else if (complexity === 'anim') instructions.push('Animate objects using loops, userData.isRotating, or physics simulations.');
        else if (complexity === 'algo') instructions.push('Use procedural generation or advanced physics for emergent scenes.');

        if (resolution === 'low') instructions.push('OPTIMIZATION: Use low-poly geometry (16 segments or less).');
        else if (resolution === 'high') instructions.push('QUALITY: Use high-poly geometry (64 segments) for smooth details.');
        else instructions.push('Use standard geometry settings for balanced visuals.');

        if (colorScheme === 'neon') instructions.push('COLORS: High-saturation neon with emissive intensity > 1.0.');
        else if (colorScheme === 'mono') instructions.push('COLORS: Black, white, and grays only.');
        else if (colorScheme === 'adaptive') instructions.push('COLORS: Bright contrasting colors that work in all render modes.');
        else if (colorScheme === 'realistic') instructions.push('COLORS: Natural earth tones with PBR materials.');

        instructions.push('Combine objects into groups, add DirectionalLights and fog for depth.');
        instructions.push('Optionally use AudioSys.playTone on spawn or collision events.');

        return {
            idea,
            prompt: `
${this.apiContext}

TASK:
Write a script to generate: "${idea}" – a beautiful, immersive 3D experience in Threshold's sandbox.

SPECIFICATIONS:
${instructions.map((i) => `- ${i}`).join('\n')}

${style === 'spec' ? 'Provide a logic plan first, then the code.' : 'Provide the code immediately.'}
Ensure code is wrapped in an IIFE and starts with World.clearWorld().
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
            const script = await generateScript(prompt, idea || 'abstract generative scene');
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