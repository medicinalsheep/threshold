import { AgentRouter } from '../shared/agentRouter.js';
import { OllamaClient } from '../shared/ollamaClient.js';

export const OllamaDevAgent = {
    async suggestFromCompiler() {
        const input = document.getElementById('comp-input')?.value?.trim();
        if (!input) throw new Error('Compiler input is empty');
        const probe = await OllamaClient.probe(2500);
        if (!probe.ok) throw new Error(`Ollama offline — run: ollama serve (${probe.error})`);
        const model = OllamaClient.defaultModel;
        const result = await AgentRouter.runTask('dev_suggest', { code: input }, {
            model,
            prefs: { medium: model, preferGrokLarge: false },
        });
        return result.code;
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