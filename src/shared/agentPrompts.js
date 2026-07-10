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
            // Prefix must match bootcamp critical intent training (few-shot format discipline)
            const system = `You are the Threshold intent classifier — NOT an NPC.
Reply with EXACTLY two lines and nothing else (no greeting, no explanation):
INTENT: spawn|edit|physics|sound|texture|export|graphics|style|other
API: short primary API name

Rules:
- GIMP / albedo / normal map / textures:watch / hilod / webp / compress textures → INTENT: texture
- realistic / default lighting / PBR lighting → INTENT: graphics · API: Engine.setRenderMode(4)
- graphics lite|mobile|ultra tier → INTENT: graphics · API: graphicsProfile
- retro / terminal / toon / pixel / hyper → INTENT: style · API: Engine.setRenderMode(0-3)
- friends join / room code / invite → INTENT: other · API: Lobby invite + room codes
- production plan / generate blocked / pipeline → INTENT: other · API: assetProductionPlan
- parallel ollama / sequential queue → INTENT: other · API: OllamaRunQueue
- Never answer in character. Never use [ACTION:].`;
            const msg = payload.message || 'spawn a box';
            return {
                system,
                user: `Classify (two lines only — INTENT then API):\n${msg}`,
            };
        }

        case 'dev_patch':
        case 'dev_suggest': {
            const system = `You are Threshold Engine dev agent (medium task). Fix or extend JavaScript.
Return ONLY executable JavaScript. Minimal change preferred for patches.
Use World, THREE, PlayerController, Physics.
Render mode: Engine.setRenderMode(4) for realistic/default/PBR. Modes 0-3 ONLY if user explicitly asked retro/terminal/toon/pixel/hyper.
Use userData.textures for GIMP PBR. Prefer MaterialPresets over CanvasTexture.
World.createObject(type, name, colorHex, usePhysics) — type first (cube|sphere|cone|torus).
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
Honor poly budget and Lite/Mobile: fewer meshes, locked floors, userData.texRes/hilod when texturing.
${getSceneContextBrief()}`;
            return { system, user: payload.idea || 'add ambient detail to scene' };
        }

        case 'production_plan': {
            const system = `You are Threshold production planner (medium). Output a compact PLAN only — not JavaScript.
Use this structure:
PLAN: <title>
1. scope — placement (interior|exterior|transitional|floating)
2. collision — static|dynamic|visual · surfaceType
3. mesh — primitive/GLB · poly low|medium|high · LOD if large
4. textures — gimp|blender master @ 1k|2k (name = manifest slot)
5. hilod — textures:hilod / textures:watch → _1k/_2k + WebP for Lite/Mobile
6. weather — wet|dust|snow|wet_glass|sheltered
7. atmosphere — time/fog · audioZone
8. shaders — MaterialPresets id (no CanvasTexture slop)
9. interact — F hints / sfx if needed
10. codegen — pause-guard IIFE · World.createObject(type,name,color,physics)
11. verify — PLAY · weather · graphics Lite+Realistic
PERF: graphicsTier · ollamaQueue sequential|parallel · freeze after heavy GLB
Never invent fake APIs. Default realistic mode 4.`;
            const brief = payload.brief || payload.idea || payload.message || 'generic hero prop';
            return {
                system,
                user: `Write a Threshold production plan for:\n${brief}`,
            };
        }

        case 'scene_script':
        case 'prompter_generate': {
            const system = payload.systemOverride || `You are Threshold Engine architect (large task). Generate a complete playable script.
Return ONLY executable JavaScript wrapped in an IIFE with try/catch inside.
Extend the live scene — do NOT call World.clearWorld() unless asked.
Always call Engine.setRenderMode(4) once for realistic/default scenes — NEVER 2 or 3 unless the user explicitly asked for retro/terminal/toon/hyper.
Guard world edits: if (!State.isPaused) { UI.status('Pause (EDIT)'); return; }
World.createObject(type, name, colorHex, usePhysics) — type first.
Performance: respect poly budget; prefer few meshes; locked static floors; set userData.texRes/hilod/polyBudget when relevant.
Do not spawn huge batches of dynamics (keep playable on Lite/2060). Sequential Ollama is default for heavy scenes.

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

/**
 * Fix tiny-model render-mode drift using the user request text.
 * realistic/default/PBR → 4; terminal → 2; toon → 1; pixel → 0; hyper → 3.
 */
export function sanitizeRenderModesInCode(code, userText = '') {
    const out = String(code || '');
    const u = String(userText || '');
    if (!out || !/setRenderMode\s*\(/i.test(out)) return out;

    let target = null;
    // Stylized keywords win over "realistic" if both appear
    if (/\bterminal\b/i.test(u)) target = 2;
    else if (/\btoon\b/i.test(u)) target = 1;
    else if (/\bpixel\b/i.test(u)) target = 0;
    else if (/\bhyper\b|\bneon\s*style\b/i.test(u)) target = 3;
    else if (/\b(realistic|default\s*lighting|normal\s*lighting|pbr\s*lighting|\bpbr\b|make\s+it\s+look\s+realistic)\b/i.test(u)) {
        target = 4;
    }

    if (target == null) return out;
    return out.replace(/Engine\.setRenderMode\s*\(\s*[0-4]\s*\)/gi, `Engine.setRenderMode(${target})`);
}

/**
 * Strip dangerous / invalid patterns tiny models regurgitate.
 */
export function sanitizeAgentSlop(code, userText = '') {
    let out = String(code || '');
    const u = String(userText || '');
    if (!out) return out;

    // type alias + name-first arg order mistakes
    out = out.replace(/World\.createObject\s*\(\s*['"]box['"]/gi, "World.createObject('cube'");
    out = out.replace(/World\.createObject\s*\(\s*['"]cylinder['"]/gi, "World.createObject('cube'");
    out = out.replace(
        /World\.createObject\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"](cube|box|sphere|cone|torus)['"]\s*,/gi,
        (full, a, b) => {
            const types = new Set(['cube', 'box', 'sphere', 'cone', 'torus']);
            if (!types.has(String(a).toLowerCase()) && types.has(String(b).toLowerCase())) {
                const t = String(b).toLowerCase() === 'box' ? 'cube' : String(b).toLowerCase();
                return `World.createObject('${t}', '${a}',`;
            }
            return full;
        },
    );

    // clearWorld unless user explicitly asked
    if (!/\b(clear\s*world|wipe\s*(the\s*)?scene|reset\s*world)\b/i.test(u)) {
        out = out.replace(/^\s*World\.clearWorld\s*\([^)]*\)\s*;?\s*$/gim, '// clearWorld removed — user did not ask to wipe');
        out = out.replace(/World\.clearWorld\s*\([^)]*\)\s*;?/gi, '/* clearWorld removed */');
    }

    // blatant three.js bootstrap (cannot fully rewrite meshes — neutralize scene construction)
    if (!/\b(three\.scene|raw\s*three)\b/i.test(u)) {
        if (/new\s+THREE\.Scene\s*\(/i.test(out) || /\bscene\.add\s*\(/i.test(out)) {
            // Prefer a minimal valid Threshold stub if model fully failed
            if (!/World\.createObject/i.test(out)) {
                out = `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);
    const m = World.createObject('cube', 'prop', 0x888888, false);
    m.position.set(0, 0.5, -2);
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`;
            } else {
                out = out
                    .replace(/const\s+\w+\s*=\s*new\s+THREE\.Scene\s*\([^)]*\)\s*;?/gi, '')
                    .replace(/new\s+THREE\.WebGLRenderer\s*\([^)]*\)\s*;?/gi, '')
                    .replace(/\bscene\.add\s*\([^;]+;?/gi, '');
            }
        }
    }

    return out;
}

/** Combined post-process for agent JS. */
export function finalizeAgentCode(text, userText = '') {
    let code = stripCodeFences(text);
    code = sanitizeAgentSlop(code, userText);
    code = sanitizeRenderModesInCode(code, userText);
    return code;
}