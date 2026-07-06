import { OllamaClient } from '../shared/ollamaClient.js';
import { getSceneContext } from '../shared/sceneContext.js';
import { getSoundContext } from '../shared/soundContext.js';

export const OllamaDevAgent = {
    async suggestFromCompiler() {
        const input = document.getElementById('comp-input')?.value?.trim();
        if (!input) throw new Error('Compiler input is empty');

        const probe = await OllamaClient.probe(2500);
        if (!probe.ok) {
            throw new Error(`Ollama offline — run: ollama serve (${probe.error || 'no response'})`);
        }

        const system = `You are a Threshold Engine dev agent. Improve or extend the user's JavaScript.
Return ONLY executable JavaScript (IIFE ok). Use World, THREE, PlayerController, Physics APIs.
${getSceneContext()}
${getSoundContext()}`;

        const prompt = `${system}\n\nImprove or complete this script:\n\`\`\`js\n${input}\n\`\`\``;
        return OllamaClient.generate(prompt, { model: OllamaClient.defaultModel });
    },

    async applySuggestion() {
        const code = await this.suggestFromCompiler();
        const out = document.getElementById('comp-output');
        const inp = document.getElementById('comp-input');
        if (inp) inp.value = code;
        if (out) out.value = code;
        window.Compiler?.transpile?.();
        return code;
    },
};

window.OllamaDevAgent = OllamaDevAgent;