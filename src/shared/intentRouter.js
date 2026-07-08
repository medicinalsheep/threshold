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
    { intent: 'texture', re: /\b(gimp|texture|textures|albedo|normal\s*map)\b/i },
    { intent: 'edit', re: /\b(rain|fog|weather|sun|atmosphere|environment|env)\b/i },
    { intent: 'spawn', re: /\b(spawn|add|create|place|put)\b.+\b(box|crate|object|prop|mesh|sphere|cube|wall|floor)\b/i },
    { intent: 'spawn', re: /\b(spawn|create)\b/i },
    { intent: 'graphics', re: /\b(realistic|default\s*lighting|pbr\s*lighting|render\s*mode\s*4)\b/i },
    { intent: 'style', re: /\b(retro|terminal|pixel|toon|shader\s*mode|green\s*screen)\b/i },
    { intent: 'texture', re: /\b(pbr|material)\b/i },
    { intent: 'sound', re: /\b(sound|audio|sfx|music|ambient)\b/i },
    { intent: 'physics', re: /\b(physics|collision|gravity|rigid\s*body|cannon)\b/i },
];

export function parseIntentResponse(text) {
    const lines = String(text || '').trim().split('\n');
    let intent = 'other';
    let api = null;
    for (const line of lines) {
        const im = line.match(/^INTENT:\s*(\w+)/i);
        const am = line.match(/^API:\s*(.+)/i);
        if (im) intent = im[1].toLowerCase();
        if (am) api = am[1].trim();
    }
    if (!VALID_INTENTS.has(intent)) intent = 'other';
    return { intent, api, raw: text };
}

export function keywordClassify(message) {
    const msg = String(message || '').trim();
    if (!msg) return null;
    for (const rule of KEYWORD_RULES) {
        if (rule.re.test(msg)) {
            return { intent: rule.intent, api: null, source: 'keyword' };
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
            const mode = api?.match(/setRenderMode\((\d+)\)/i)?.[1] || '4';
            window.Engine?.setRenderMode?.(Number(mode));
            result.actions.push(`render-mode-${mode}`);
            result.message = `Render mode ${mode} (realistic PBR)`;
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
                ...parseIntentResponse(result.text),
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