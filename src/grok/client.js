import { Auth } from '../auth/main.js';

export const API_URL = import.meta.env.VITE_XAI_API_URL || 'https://api.x.ai/v1/chat/completions';
export const MODEL = import.meta.env.VITE_XAI_MODEL || 'grok-build-0.1';

export async function generateScript(systemPrompt, userIdea) {
    const { AgentRouter } = await import('../shared/agentRouter.js');
    const result = await AgentRouter.runTask('prompter_generate', {
        idea: userIdea || 'extend current scene',
        systemOverride: systemPrompt,
    });
    return result.code;
}