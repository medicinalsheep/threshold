/**
 * Intent classify + command router — routes natural-language chat to UI actions.
 * Fast keyword path offline; optional LLM via AgentRouter.runTask('intent_classify').
 */

import { AgentRouter } from './agentRouter.js';

const VALID_INTENTS = new Set([
    'spawn', 'edit', 'physics', 'sound', 'texture', 'export', 'graphics', 'style', 'other',
]);

const KEYWORD_RULES = [
    { intent: 'export', re: /\b(export|publish|ship|deploy|play\s*store|app\s*store|itch\.io)\b/i },
    { intent: 'export', re: /\bexport\b.*\b(android|ios|windows|steam|web)\b/i },
    { intent: 'texture', re: /\b(gimp|texture|textures|albedo|normal\s*map|textures:watch|hilod|webp|tex:compress|compress\s+textures|rescale)\b/i },
    { intent: 'edit', re: /\b(rain|fog|weather|sun|atmosphere|environment|env)\b/i },
    { intent: 'spawn', re: /\b(spawn|add|create|place|put)\b.+\b(box|crate|object|prop|mesh|sphere|cube|wall|floor)\b/i },
    { intent: 'spawn', re: /\b(spawn|create)\b/i },
    // Realistic / default lighting BEFORE generic "style" so mode stays 4
    { intent: 'graphics', re: /\b(realistic|default\s*lighting|normal\s*lighting|pbr\s*lighting|render\s*mode\s*4|mode\s*4)\b/i },
    { intent: 'graphics', re: /\b(make\s+it\s+look\s+realistic|use\s+realistic|pbr\s+mode)\b/i },
    { intent: 'graphics', re: /\b(graphics\s*tier|lite\s*tier|mobile\s*tier|ultra\s*tier|graphicsProfile)\b/i },
    { intent: 'style', re: /\b(retro|terminal|pixel|toon|shader\s*mode|green\s*screen|hyper\s*neon)\b/i },
    { intent: 'texture', re: /\b(pbr|material)\b/i },
    { intent: 'sound', re: /\b(sound|audio|sfx|music|ambient)\b/i },
    { intent: 'physics', re: /\b(physics|collision|gravity|rigid\s*body|cannon)\b/i },
    { intent: 'other', re: /\b(friends?\s+join|room\s*code|invite\s+link|multiplayer\s+invite|how\s+do\s+(friends|people)\s+join)\b/i },
    { intent: 'other', re: /\b(who\s+can\s+edit|host\s+authoritative|guests?\s+edit)\b/i },
    { intent: 'other', re: /\b(production\s*plan|generate\s+blocked|validateProductionReady|pipeline\s+order|poly\s*budget)\b/i },
    { intent: 'other', re: /\b(parallel\s+ollama|sequential\s+(ollama|queue)|allow\s+parallel|ollama\s+queue)\b/i },
];

/** True when the user wants realistic/default PBR (mode 4), not stylized. */
export function wantsRealisticLighting(message) {
    const m = String(message || '');
    if (/\b(retro|terminal|toon|pixel|hyper|neon\s*style|green\s*screen)\b/i.test(m)) return false;
    return /\b(realistic|default\s*lighting|normal\s*lighting|pbr\s*lighting|render\s*mode\s*4|mode\s*4|make\s+it\s+look\s+realistic)\b/i.test(m);
}

/**
 * Parse model output; tolerate prose wrapping and fix common mode drift.
 */
export function parseIntentResponse(text, message = '') {
    const raw = String(text || '').trim();
    let intent = 'other';
    let api = null;

    const im = raw.match(/INTENT:\s*(\w+)/i);
    const am = raw.match(/API:\s*(.+)/i);
    if (im) intent = im[1].toLowerCase();
    if (am) api = am[1].trim().split(/\n/)[0].trim();

    // Prose-only fallback: never treat NPC dialogue as a successful classify
    if (!im && !am) {
        // If model answered in sentences, force keyword path result shape
        const kw = keywordClassify(message);
        if (kw) return { ...kw, api: kw.api, raw, repaired: 'prose-fallback' };
        return { intent: 'other', api: null, raw, repaired: 'prose-empty' };
    }

    if (!VALID_INTENTS.has(intent)) intent = 'other';

    // Render-mode drift: realistic wording must not stick on 0-3
    if (wantsRealisticLighting(message)) {
        intent = 'graphics';
        api = 'Engine.setRenderMode(4)';
    } else if (intent === 'graphics' && api && /setRenderMode\s*\(\s*[0-3]\s*\)/i.test(api) && !/\b(retro|terminal|toon|pixel|hyper)\b/i.test(message)) {
        api = 'Engine.setRenderMode(4)';
    }

    // Texture wording misclassified as style
    if (intent === 'style' && /\b(gimp|texture|textures|albedo|normal\s*map)\b/i.test(message)) {
        intent = 'texture';
        if (!api || /shader|render\s*mode/i.test(api)) api = 'userData.textures + textures:watch';
    }

    return { intent, api, raw };
}

export function keywordClassify(message) {
    const msg = String(message || '').trim();
    if (!msg) return null;
    for (const rule of KEYWORD_RULES) {
        if (rule.re.test(msg)) {
            let api = null;
            if (rule.intent === 'graphics') {
                if (/\b(lite|mobile|ultra|tier|graphicsProfile)\b/i.test(msg) && !wantsRealisticLighting(msg)) {
                    if (/\blite\b/i.test(msg)) api = 'graphicsProfile Lite';
                    else if (/\bmobile\b/i.test(msg)) api = 'graphicsProfile Mobile';
                    else if (/\bultra\b/i.test(msg)) api = 'graphicsProfile Ultra';
                    else api = 'graphicsProfile';
                } else {
                    api = 'Engine.setRenderMode(4)';
                }
            } else if (rule.intent === 'style') {
                if (/\bterminal\b/i.test(msg)) api = 'Engine.setRenderMode(2)';
                else if (/\btoon\b/i.test(msg)) api = 'Engine.setRenderMode(1)';
                else if (/\bpixel\b/i.test(msg)) api = 'Engine.setRenderMode(0)';
                else if (/\bhyper\b/i.test(msg)) api = 'Engine.setRenderMode(3)';
            } else if (rule.intent === 'texture') {
                if (/\b(hilod|rescale)\b/i.test(msg)) api = 'textures:hilod';
                else if (/\b(webp|compress)\b/i.test(msg)) api = 'tex:compress + WebP';
                else api = 'userData.textures + textures:watch';
            } else if (rule.intent === 'spawn') {
                api = 'World.createObject';
            } else if (rule.intent === 'export') {
                api = 'ExportWizard';
            } else if (rule.intent === 'other' && /\b(join|invite|room\s*code|friends?)\b/i.test(msg)) {
                api = 'Lobby invite + room codes';
            } else if (rule.intent === 'other' && /\b(production\s*plan|pipeline|generate\s+blocked)\b/i.test(msg)) {
                api = 'assetProductionPlan';
            } else if (rule.intent === 'other' && /\b(parallel|sequential)\b/i.test(msg)) {
                api = 'OllamaRunQueue';
            }
            return { intent: rule.intent, api, source: 'keyword' };
        }
    }
    return null;
}

export function dispatchIntent(classification, message = '') {
    const { intent, api } = classification;
    const result = { intent, api, actions: [], message: '' };

    switch (intent) {
        case 'export':
            window.ExportWizard?.open?.();
            result.actions.push('export-wizard');
            result.message = 'Opened export wizard';
            window.UI?.status?.('Export wizard — web-first, native targets optional');
            break;

        case 'texture':
            window.SceneDock?.setFullyHidden?.(false, true);
            window.SceneDock?.openTab?.('setup');
            result.actions.push('setup-textures');
            result.message = 'Textures: save to textures/ · npm run textures:watch for GIMP hot-reload';
            window.UI?.status?.(result.message);
            break;

        case 'spawn':
        case 'edit': {
            if (!window.State?.isPaused) {
                window.UI?.togglePause?.(`Intent: ${intent}`);
                result.actions.push('pause');
            }
            window.AgentPortal?.show?.({ step: 'build' });
            window.AgentPortal?.prefillChat?.(message);
            result.actions.push('agent-portal');
            result.message = intent === 'spawn'
                ? 'Paused → AI Build Station (spawn)'
                : 'Paused → AI Build Station (edit)';
            window.UI?.status?.(result.message);
            break;
        }

        case 'graphics': {
            // Always mode 4 for graphics intent unless API explicitly asks 0-3 AND message is stylized
            let mode = api?.match(/setRenderMode\((\d+)\)/i)?.[1] || '4';
            if (wantsRealisticLighting(message) || !/\b(retro|terminal|toon|pixel|hyper)\b/i.test(message)) {
                if (Number(mode) !== 4 && !/\b(retro|terminal|toon|pixel|hyper)\b/i.test(message)) mode = '4';
            }
            window.Engine?.setRenderMode?.(Number(mode));
            result.actions.push(`render-mode-${mode}`);
            result.message = Number(mode) === 4
                ? 'Render mode 4 (realistic PBR)'
                : `Render mode ${mode}`;
            window.UI?.status?.(result.message);
            break;
        }

        case 'style': {
            const mode = api?.match(/setRenderMode\((\d+)\)/i)?.[1];
            if (mode) {
                window.Engine?.setRenderMode?.(Number(mode));
                result.actions.push(`render-mode-${mode}`);
                result.message = `Render mode ${mode}`;
            } else {
                window.GraphicsPrompt?.show?.();
                result.actions.push('graphics-prompt');
                result.message = 'Graphics style picker';
            }
            window.UI?.status?.(result.message);
            break;
        }

        case 'sound':
            document.querySelector('[data-target="view-prompter"]')?.click();
            result.actions.push('prompter');
            result.message = 'Opened PromptGen for audio';
            window.UI?.status?.(result.message);
            break;

        case 'physics':
            document.querySelector('[data-target="view-compiler"]')?.click();
            result.actions.push('compiler');
            result.message = 'Opened Compiler for physics scripts';
            window.UI?.status?.(result.message);
            break;

        default:
            result.fallbackNpc = true;
            break;
    }

    return result;
}

export async function classifyAndRoute(message, options = {}) {
    const { useLlm = true, skipDispatch = false } = options;
    let classification = keywordClassify(message);
    let routeMeta = { provider: 'keyword', model: null, ms: 0 };

    if (!classification && useLlm && window.AgentPortal?.isConnected?.()) {
        try {
            const result = await AgentRouter.runTask('intent_classify', { message });
            classification = {
                ...parseIntentResponse(result.text, message),
                source: 'llm',
            };
            routeMeta = { provider: result.provider, model: result.model, ms: result.ms };
        } catch {
            classification = { intent: 'other', api: null, source: 'fallback' };
        }
    }

    if (!classification) {
        classification = { intent: 'other', api: null, source: 'fallback' };
    }

    const dispatch = skipDispatch ? null : dispatchIntent(classification, message);
    return { classification, dispatch, ...routeMeta };
}

export const IntentRouter = {
    parseIntentResponse,
    keywordClassify,
    dispatchIntent,
    classifyAndRoute,
};

window.IntentRouter = IntentRouter;