import { AgentRouter } from '../shared/agentRouter.js';
import { extractNpcReply } from '../shared/agentPrompts.js';

export const NpcAgent = {
    async talk(npc, playerMessage = 'Hello') {
        const result = await AgentRouter.runTask('npc_chat', {
            npcName: npc?.userData?.name || 'NPC',
            persona: npc?.userData?.agentPersona || 'Friendly guide',
            message: playerMessage,
        });
        const { line, action } = extractNpcReply(result.text);
        const name = npc?.userData?.name || 'NPC';
        if (action && window.UI?.status) {
            window.UI.status(`${name}: ${line}`);
        }
        return { line, action, npc, route: { provider: result.provider, model: result.model, ms: result.ms } };
    },
};

window.NpcAgent = NpcAgent;