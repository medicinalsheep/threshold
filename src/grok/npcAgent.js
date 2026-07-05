import { Auth } from '../auth/main.js';
import { getSceneContext } from '../shared/sceneContext.js';
import { API_URL, MODEL } from './client.js';

async function chat(system, user) {
    if (!Auth.isLoggedIn()) {
        throw new Error('Grok login required — use auth overlay or Grok edition');
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
            temperature: 0.6,
            max_tokens: 512,
        }),
    });
    if (!response.ok) {
        const t = await response.text();
        throw new Error(`Grok NPC error (${response.status}): ${t.slice(0, 120)}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '...';
}

export const NpcAgent = {
    async talk(npc, playerMessage = 'Hello') {
        const persona = npc?.userData?.agentPersona || 'A helpful NPC in a 3D world';
        const name = npc?.userData?.name || 'NPC';
        const system = `You are ${name}, an NPC in Threshold Engine (Three.js).
Persona: ${persona}
Reply in 1-3 short sentences, in character. Optional: end with [ACTION: brief action] if the NPC should do something visible.
${getSceneContext()}`;

        const reply = await chat(system, playerMessage);
        const actionMatch = reply.match(/\[ACTION:\s*([^\]]+)\]/i);
        const line = reply.replace(/\[ACTION:[^\]]+\]/gi, '').trim();

        if (actionMatch && window.UI?.status) {
            window.UI.status(`${name}: ${line}`);
        }

        return { line, action: actionMatch?.[1]?.trim() || null, npc };
    },
};

window.NpcAgent = NpcAgent;