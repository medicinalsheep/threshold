import { Auth } from '../auth/main.js';
import { getSceneContext } from '../shared/sceneContext.js';
import { getSoundContext } from '../shared/soundContext.js';
import { API_URL, MODEL } from './client.js';

async function suggest(system, user) {
    if (!Auth.isLoggedIn()) {
        throw new Error('Grok login required for Dev Agent');
    }
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Auth.apiKey}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
            temperature: 0.35,
            max_tokens: 2048,
        }),
    });
    if (!response.ok) {
        const t = await response.text();
        throw new Error(`Grok Dev error (${response.status}): ${t.slice(0, 120)}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
}

export const DevAgent = {
    async suggestFromCompiler() {
        const input = document.getElementById('comp-input')?.value?.trim();
        if (!input) throw new Error('Compiler input is empty');

        const system = `You are a Threshold Engine dev agent. Improve or extend the user's JavaScript.
Return ONLY executable JavaScript (IIFE ok). Use World, THREE, PlayerController, Physics APIs.
${getSceneContext()}
${getSoundContext()}`;

        const user = `Improve or complete this script:\n\`\`\`js\n${input}\n\`\`\``;
        return suggest(system, user);
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