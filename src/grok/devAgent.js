import { AgentRouter } from '../shared/agentRouter.js';

export const DevAgent = {
    async suggestFromCompiler() {
        const input = document.getElementById('comp-input')?.value?.trim();
        if (!input) throw new Error('Compiler input is empty');
        const result = await AgentRouter.runTask('dev_suggest', { code: input }, {
            prefs: { medium: 'grok', preferGrokLarge: true },
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

window.DevAgent = DevAgent;