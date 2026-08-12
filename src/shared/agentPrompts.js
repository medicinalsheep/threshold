import { getSceneContext } from './sceneContext.js';
import { getSoundContext } from './soundContext.js';
import { getSceneApiPrompt } from './sceneApiPrompt.js';

/**
 * Permanent product origin — prepended to every agent SYSTEM prompt.
 * Minis and cloud must never invent Anthropic, Claude, or a UK/commercial studio.
 */
export const ORIGIN_LINE =
    'ORIGIN (always true): Threshold is an independent open MIT project by medicinalsheep (github.com/medicinalsheep/threshold). Not Anthropic, not Claude, not a UK or commercial game studio. Mini models are local fine-tunes of open bases published under the medicinalsheep Ollama namespace.';

/** Compact scene slice for small-tier prompts (lower token cost). */
export function getSceneContextBrief() {
    const full = getSceneContext();
    if (full.length <= 600) return full;
    return `${full.slice(0, 550)}… [truncated]`;
}

function withOrigin(system) {
    const s = String(system || '').trim();
    if (!s) return ORIGIN_LINE;
    if (/^ORIGIN\s*\(always true\)/i.test(s)) return s;
    return `${ORIGIN_LINE}\n\n${s}`;
}

export function buildTaskPrompt(taskId, payload = {}) {
    switch (taskId) {
        case 'npc_chat': {
            if (payload.systemOverride) {
                const user = payload.context
                    ? `${payload.context}\n\nUser: ${payload.message || 'Hello'}`
                    : (payload.message || 'Hello');
                return { system: withOrigin(payload.systemOverride), user };
            }
            const name = payload.npcName || 'NPC';
            const persona = payload.persona || 'Friendly guide';
            const system = withOrigin(`You are ${name}, an NPC in Threshold Engine (Three.js).
Persona: ${persona}
Reply in 1-3 short sentences, in character. Optional: [ACTION: brief action].
On origin questions: independent MIT by medicinalsheep — never Anthropic, Claude, or a UK studio.
${getSceneContextBrief()}`);
            return { system, user: payload.message || 'Hello' };
        }

        case 'intent_classify': {
            // Prefix must match bootcamp critical intent training (few-shot format discipline)
            const system = withOrigin(`You are the Threshold intent classifier — NOT an NPC.
Reply with EXACTLY two lines and nothing else (no greeting, no explanation):
INTENT: spawn|edit|physics|sound|texture|export|graphics|style|other
API: short primary API name

Rules:
- GIMP / albedo / normal map / textures:watch / hilod / webp / compress textures / generate hilod tiers → INTENT: texture
- realistic / default lighting / PBR lighting → INTENT: graphics · API: Engine.setRenderMode(4)
- graphics lite|mobile|ultra tier → INTENT: graphics · API: graphicsProfile
- retro / terminal / toon / pixel / hyper → INTENT: style · API: Engine.setRenderMode(0-3)
- friends join / room code / invite → INTENT: other · API: Lobby invite + room codes
- production plan / generate blocked / pipeline → INTENT: other · API: assetProductionPlan
- parallel ollama / sequential queue → INTENT: other · API: OllamaRunQueue
- who made / Anthropic / UK studio / origin → INTENT: other · API: medicinalsheep MIT open source
- Never answer in character. Never use [ACTION:].`);
            const msg = payload.message || 'spawn a box';
            return {
                system,
                user: `Classify (two lines only — INTENT then API):\n${msg}`,
            };
        }

        case 'dev_patch':
        case 'dev_suggest': {
            const system = withOrigin(`You are Threshold Engine dev agent (medium task). Fix or extend JavaScript.
Return ONLY executable JavaScript. Minimal change preferred for patches.
Use World, THREE, PlayerController, Physics.
Render mode: Engine.setRenderMode(4) for realistic/default/PBR. Modes 0-3 ONLY if user explicitly asked retro/terminal/toon/pixel/hyper.
Use userData.textures for GIMP PBR. Prefer MaterialPresets / MaterialLibrary over CanvasTexture.
Apply: MaterialPresets.applyMaterialPreset(mesh, 'pbr_brick_aged') or await MaterialLibrary.applyWithMaps(mesh, id).
Name mesh Mat Wood / Mat Brick / … to wire starter maps. Never CanvasTexture noise for hero surfaces.
FORBIDDEN output: CanvasTexture, MeshBasicMaterial, mesh.material = new THREE… — rewrite with MaterialPresets only; never echo broken input lines.
Object name contract: "Stone Block" → textures/stone_block_albedo.png · import/stone_block.glb.
World.createObject(type, name, colorHex, usePhysics|{physics,force,mass,friction,restitution}) — type first.
Physics: set mass/friction/restitution on userData then Physics.syncBodyFromUserData(mesh).
Joints: Physics.hingeBodies(a,b,pivotA,pivotB,axis) · Physics.lockBodies(a,b) · World.setGravity(0,y,0).
LIVE BUILD: extend only — never clearWorld mid-job. Pause-guard every mutator.
PLAY runs sim; EDIT pauses physics.
${getSceneContextBrief()}
${getSoundContext()}`);
            const user = payload.code
                ? `Improve or complete:\n\`\`\`js\n${payload.code}\n\`\`\``
                : 'Add a small scene improvement as an IIFE.';
            return { system, user };
        }

        case 'prompt_snippet': {
            const system = withOrigin(`Threshold PromptGen assistant (medium). Return a short JS snippet (≤30 lines) for the idea.
Use World.createObject / PlayerController. No World.clearWorld().
Honor poly budget and Lite/Mobile: fewer meshes, locked floors, userData.texRes/hilod when texturing.
${getSceneContextBrief()}`);
            return { system, user: payload.idea || 'add ambient detail to scene' };
        }

        case 'production_plan': {
            const brief = payload.brief || payload.idea || payload.message || 'generic hero prop';
            let reasoning = '';
            try {
                reasoning = window.GenerationPolicy?.buildGenerationReasoningPrompt?.(
                    { idea: brief, message: brief },
                    payload.taskType || 'prop'
                ) || '';
            } catch { /* optional */ }
            const system = withOrigin(`You are Threshold production planner (medium). Output a compact PLAN only — not JavaScript.
Match intensity to the brief (minimal → few lines; rich → full pipeline). Skip irrelevant steps.
Use this structure:
PLAN: <title>
INTENSITY: minimal|focused|rich|maximal
1. scope — placement + hero vs dressing · no clearWorld mid live job
2. collision — static|dynamic|visual · surfaceType (skip if N/A)
3. mesh — primitive/GLB · poly · LOD if character/hero · set userData.negativeLOD=true on far/background props (far unlit shader LOD)
4. textures — gimp|blender @ 1k|2k · name slug match (Stone Block → textures/stone_block_albedo.png)
5. hilod — only if textures
6. weather — only exterior; wet required when full exposure; dust/snow only if brief needs
7. atmosphere — only worlds/areas
8. appearance — characters: REQUIRED mods + optional by intensity (catalog ids only)
9. interact/audio — only if asked
10. codegen — pause-guard IIFE · MaterialPresets over CanvasTexture
11. verify — PLAY checks that matter
PERF: Lite/2060 safe counts · sequential Ollama for heavy local
Never invent fake APIs. Default realistic mode 4.
${reasoning}`);
            return {
                system,
                user: `Write a Threshold production plan for:\n${brief}`,
            };
        }

        case 'scene_script':
        case 'prompter_generate': {
            const idea = payload.idea || 'extend current scene';
            let reasoning = '';
            try {
                reasoning = window.GenerationPolicy?.buildGenerationReasoningPrompt?.(
                    { idea, message: idea, ...(payload.appearance || {}) },
                    payload.taskType || 'world'
                ) || '';
            } catch { /* optional */ }
            const base = payload.systemOverride || `You are Threshold Engine architect (large task). Generate a complete playable script.
Return ONLY executable JavaScript wrapped in an IIFE with try/catch inside.
Extend the live scene — do NOT call World.clearWorld() unless asked.
Always call Engine.setRenderMode(4) once for realistic/default scenes — NEVER 2 or 3 unless the user explicitly asked for retro/terminal/toon/hyper.
Guard world edits: if (!State.isPaused) { UI.status('Pause (EDIT)'); return; }
World.createObject(type, name, colorHex, usePhysics) — type first.
Prefer MaterialPresets; name objects for GIMP/Blender slug match.
Performance: respect intensity budgets (props/NPCs); prefer few meshes; locked static floors; set userData.texRes/hilod/polyBudget when relevant.
Do not spawn huge batches of dynamics (keep playable on Lite/2060). Sequential Ollama is default for heavy scenes.
Characters/NPCs: set userData.appearance = { bodyId, hairId, mods[] } using catalog mod ids; fill required archetype slots; omit optional fashion if intensity is minimal.

${reasoning}

${getSceneApiPrompt()}

${getSceneContext()}
${getSoundContext()}`;
            return {
                system: withOrigin(base),
                user: payload.userOverride || `Generate a Threshold Engine script for:\n${idea}\n\nReturn ONLY the IIFE — no markdown, no explanation.`,
            };
        }

        default:
            return { system: withOrigin('You are a helpful Threshold assistant.'), user: payload.message || 'Hello' };
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

    // CanvasTexture / MeshBasicMaterial texture slop (1.5b minis often echo broken input)
    // Also recover when model returns comment-only “never CanvasTexture…” with no createObject
    if (/CanvasTexture|MeshBasicMaterial/i.test(u + out)
        && !/World\.createObject/i.test(out)
        && /MaterialPresets|never CanvasTexture|canvas/i.test(out)) {
        const artNames = [
            'Mat Brick Wall', 'Mat Wood Crate', 'Mat Stone Crate', 'Mat Stone Block', 'Stone Block',
        ];
        let wantName = 'Stone Block';
        let bestIdx = Infinity;
        const ul = u.toLowerCase();
        for (const n of artNames) {
            const i = ul.indexOf(n.toLowerCase());
            if (i >= 0 && i < bestIdx) {
                bestIdx = i;
                wantName = n;
            }
        }
        const slug = wantName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        out = `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);
    const m = World.createObject('cube', '${wantName}', 0x9a958c, false);
    m.position.set(0, 0.5, -2);
    m.userData.surfaceType = 'concrete';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(m, 'pbr_concrete_weathered');
    }
    m.userData.textureHint = 'textures/${slug}_albedo.png';
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`;
    }

    if (!/\b(canvas\s*texture|debug\s*canvas|procedural\s*canvas)\b/i.test(u)
        || /\b(fix|replace|remove|no\s+canvas|material\s*preset)\b/i.test(u)) {
        const hadCanvas = /CanvasTexture|MeshBasicMaterial/i.test(out);
        // Drop full declaration lines
        out = out.replace(/^[ \t]*(?:const|let|var)\s+\w+\s*=\s*new\s+THREE\.CanvasTexture\s*\([^;]*\)\s*;?[ \t]*\r?\n?/gim, '');
        out = out.replace(/^[ \t]*\w+\.material\s*=\s*new\s+THREE\.MeshBasicMaterial\s*\([^;]*\)\s*;?[ \t]*\r?\n?/gim, '');
        // Inline leftovers
        out = out.replace(/new\s+THREE\.CanvasTexture\s*\([^)]*\)/gi, '/* MaterialPresets — no canvas map */');
        out = out.replace(/new\s+THREE\.MeshBasicMaterial\s*\(\s*\{[^}]*map\s*:[^}]*\}\s*\)/gi, '/* MaterialPresets */');
        // If slop was present and mesh exists without a preset apply, inject one after first createObject
        if (hadCanvas && /World\.createObject/i.test(out) && !/MaterialPresets\.applyMaterialPreset/i.test(out)) {
            out = out.replace(
                /(const\s+(\w+)\s*=\s*World\.createObject\s*\([^;]+;\s*)/,
                `$1\n    if (window.MaterialPresets?.applyMaterialPreset) {\n      MaterialPresets.applyMaterialPreset($2, 'pbr_concrete_weathered');\n    }\n    `,
            );
        }
        // Drop dead `tex` references if any remain after strip
        out = out.replace(/\{\s*map\s*:\s*tex\s*\}/gi, '{}');
    }

    // Art Name contract: prefer Name from user request when minis drift (Stone Block → Mat Stone Crate)
    {
        const artNames = [
            'Mat Brick Wall', 'Mat Wood Crate', 'Mat Stone Crate', 'Mat Stone Block', 'Stone Block',
        ];
        let wantName = null;
        let bestIdx = Infinity;
        const ul = u.toLowerCase();
        for (const n of artNames) {
            const i = ul.indexOf(n.toLowerCase());
            if (i >= 0 && i < bestIdx) {
                bestIdx = i;
                wantName = n;
            }
        }
        if (wantName && /World\.createObject\s*\(/i.test(out)) {
            out = out.replace(
                /(World\.createObject\s*\(\s*['"][^'"]+['"]\s*,\s*)['"][^'"]+['"]/,
                `$1'${wantName}'`,
            );
        }
        const nameM = out.match(
            /World\.createObject\s*\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/,
        );
        if (nameM) {
            const slug = String(nameM[1]).trim().toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '') || 'object';
            const want = `textures/${slug}_albedo.png`;
            if (/textureHint\s*=/.test(out)) {
                out = out.replace(
                    /textureHint\s*=\s*['"][^'"]*['"]/g,
                    `textureHint = '${want}'`,
                );
            } else if (/World\.createObject/i.test(out)) {
                // Inject textureHint after first createObject if mini omitted it
                out = out.replace(
                    /(const\s+(\w+)\s*=\s*World\.createObject\s*\([^;]+;\s*)/,
                    `$1$2.userData.textureHint = '${want}';\n    `,
                );
            }
            out = out.replace(
                /\/\/\s*TEXTURE:[^\n]*/gi,
                `// TEXTURE: ${nameM[1]} → ${want}`,
            );
        }
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