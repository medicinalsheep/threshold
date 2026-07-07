import { getSceneContext } from './sceneContext.js';
import { getSoundContext } from './soundContext.js';
import { getSceneApiPrompt } from './sceneApiPrompt.js';

/** Compact scene slice for small-tier prompts (lower token cost). */
export function getSceneContextBrief() {
    const full = getSceneContext();
    if (full.length <= 600) return full;
    return `${full.slice(0, 550)}… [truncated]`;
}

export function buildTaskPrompt(taskId, payload = {}) {
    switch (taskId) {
        case 'npc_chat': {
            if (payload.systemOverride) {
                const user = payload.context
                    ? `${payload.context}\n\nUser: ${payload.message || 'Hello'}`
                    : (payload.message || 'Hello');
                return { system: payload.systemOverride, user };
            }
            const name = payload.npcName || 'NPC';
            const persona = payload.persona || 'Friendly guide';
            const system = `You are ${name}, an NPC in Threshold Engine (Three.js).
Persona: ${persona}
Reply in 1-3 short sentences, in character. Optional: [ACTION: brief action].
${getSceneContextBrief()}`;
            return { system, user: payload.message || 'Hello' };
        }

        case 'intent_classify': {
            const system = `Classify Threshold Engine user intent. Reply ONE line only:
INTENT: spawn|edit|physics|sound|texture|export|other
API: primary API if spawn/edit (e.g. World.createObject)`;
            return { system, user: payload.message || 'spawn a box' };
        }

        case 'dev_patch':
        case 'dev_suggest': {
            const system = `You are Threshold Engine dev agent (medium task). Fix or extend JavaScript.
Return ONLY executable JavaScript. Minimal change preferred for patches.
Use World, THREE, PlayerController, Physics. Default realistic PBR (render mode 4, MeshStandardMaterial).
Use userData.textures for GIMP PBR. Retro render modes only if user explicitly asked.
${getSceneContextBrief()}
${getSoundContext()}`;
            const user = payload.code
                ? `Improve or complete:\n\`\`\`js\n${payload.code}\n\`\`\``
                : 'Add a small scene improvement as an IIFE.';
            return { system, user };
        }

        case 'prompt_snippet': {
            const system = `Threshold PromptGen assistant (medium). Return a short JS snippet (≤30 lines) for the idea.
Use World.createObject / PlayerController. No World.clearWorld().
${getSceneContextBrief()}`;
            return { system, user: payload.idea || 'add ambient detail to scene' };
        }

        case 'scene_script':
        case 'prompter_generate': {
            const system = payload.systemOverride || `You are Threshold Engine architect (large task). Generate a complete playable script.
Return ONLY executable JavaScript wrapped in an IIFE with try/catch inside.
Extend the live scene — do NOT call World.clearWorld() unless asked.
Always call Engine.setRenderMode(4) once. Guard world edits: if (!State.isPaused) { UI.status('Pause (EDIT)'); return; }

${getSceneApiPrompt()}

${getSceneContext()}
${getSoundContext()}`;
            const idea = payload.idea || 'extend current scene';
            return {
                system,
                user: payload.userOverride || `Generate a Threshold Engine script for:\n${idea}\n\nReturn ONLY the IIFE — no markdown, no explanation.`,
            };
        }

        default:
            return { system: 'You are a helpful assistant.', user: payload.message || 'Hello' };
    }
}

export function extractNpcReply(raw) {
    const text = String(raw || '').trim();
    const actionMatch = text.match(/\[ACTION:\s*([^\]]+)\]/i);
    const line = text.replace(/\[ACTION:[^\]]+\]/gi, '').trim();
    return { line: line || '...', action: actionMatch?.[1]?.trim() || null };
}

export function stripCodeFences(text) {
    let t = String(text || '').trim();
    const fenced = t.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
    if (fenced) t = fenced[1].trim();
    return t.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
}