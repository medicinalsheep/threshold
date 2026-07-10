/**
 * Official xAI Grok API client (OpenAI-compatible).
 *
 * SuperGrok / grok.com browser tabs cannot inject into this app (browser security).
 * Use an API key from https://console.x.ai — same model family (Grok 4.5, Imagine, etc.).
 */

import { Auth } from '../auth/main.js';
import { ViewPrefs } from '../shared/viewPrefs.js';
import catalog from '../../config/grok-models.json';

const PREFS_KEY = 'grokApiPrefs';

const BASE = (import.meta.env.VITE_XAI_API_BASE || catalog.baseUrl || 'https://api.x.ai/v1').replace(/\/$/, '');
export const API_URL = import.meta.env.VITE_XAI_API_URL || `${BASE}/chat/completions`;
export const IMAGES_URL = import.meta.env.VITE_XAI_IMAGES_URL || `${BASE}/images/generations`;

const DEFAULT_CHAT = import.meta.env.VITE_XAI_MODEL || catalog.defaultChat || 'grok-4.5';
const DEFAULT_CODE = import.meta.env.VITE_XAI_CODE_MODEL || catalog.defaultCode || 'grok-4.5';

/** @deprecated use GrokClient.getChatModel() — kept for agentRouter imports */
export const MODEL = DEFAULT_CHAT;

function loadPrefs() {
    return ViewPrefs.get(PREFS_KEY, {
        chatModel: DEFAULT_CHAT,
        codeModel: DEFAULT_CODE,
        imageModel: 'grok-imagine-image',
        preferGrokForLarge: true,
    });
}

function savePrefs(patch) {
    const next = { ...loadPrefs(), ...patch };
    ViewPrefs.set(PREFS_KEY, next);
    window.dispatchEvent(new CustomEvent('grok-config-change', { detail: next }));
    return next;
}

function requireKey() {
    if (!Auth.isLoggedIn()) {
        throw new Error('xAI API key required — paste in Agent Portal (console.x.ai). SuperGrok tab login is not readable by this app.');
    }
    return Auth.apiKey;
}

async function parseError(res) {
    const t = await res.text().catch(() => '');
    let detail = t.slice(0, 200);
    try {
        const j = JSON.parse(t);
        detail = j.error?.message || j.message || detail;
    } catch { /* plain text */ }
    if (res.status === 401 || res.status === 403) {
        return `Grok auth (${res.status}): ${detail || 'invalid key — create key at console.x.ai (API access, not SuperGrok tab cookie)'}`;
    }
    if (res.status === 429) {
        return `Grok rate limit (429): ${detail || 'slow down or check console credits'}`;
    }
    return `Grok (${res.status}): ${detail}`;
}

export const GrokClient = {
    catalog,

    getPrefs: loadPrefs,
    setPrefs: savePrefs,

    get baseUrl() {
        return BASE;
    },

    get chatUrl() {
        return API_URL;
    },

    getChatModel() {
        return loadPrefs().chatModel || DEFAULT_CHAT;
    },

    getCodeModel() {
        return loadPrefs().codeModel || DEFAULT_CODE;
    },

    getImageModel() {
        return loadPrefs().imageModel || 'grok-imagine-image';
    },

    listChatModels() {
        return (catalog.models || []).filter((m) => m.tier === 'large' || m.role === 'code' || m.role === 'chat_code' || m.role === 'reasoning' || m.role === 'agent');
    },

    listImageModels() {
        return (catalog.models || []).filter((m) => m.tier === 'image' || m.role === 'imagine');
    },

    /**
     * Chat completions — used by AgentRouter large/medium fallback.
     */
    async chat(system, user, options = {}) {
        const key = requireKey();
        const model = options.model || this.getCodeModel() || this.getChatModel();
        const timeoutMs = options.timeoutMs ?? 180000;
        const signal = options.signal
            || (typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined);

        const messages = Array.isArray(options.messages)
            ? options.messages
            : [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ];

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: options.temperature ?? 0.4,
                max_tokens: options.maxTokens ?? 4096,
            }),
            signal,
        });
        if (!res.ok) throw new Error(await parseError(res));
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    },

    /**
     * Grok Imagine — image generation (textures / concept art).
     * Returns { url, b64_json?, model }.
     */
    async imagine(prompt, options = {}) {
        const key = requireKey();
        const model = options.model || this.getImageModel();
        const timeoutMs = options.timeoutMs ?? 120000;
        const signal = options.signal
            || (typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined);

        const body = {
            model,
            prompt: String(prompt || '').trim(),
            n: options.n ?? 1,
            response_format: options.responseFormat || 'url',
        };
        if (options.size) body.size = options.size;

        const res = await fetch(IMAGES_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify(body),
            signal,
        });
        if (!res.ok) throw new Error(await parseError(res));
        const data = await res.json();
        const first = data.data?.[0] || data[0] || {};
        return {
            url: first.url || first.image_url || null,
            b64: first.b64_json || first.b64 || null,
            model,
            raw: data,
        };
    },

    /** Lightweight key check — list models or tiny chat */
    async probe(timeoutMs = 8000) {
        if (!Auth.isLoggedIn()) {
            return {
                ok: false,
                error: 'no_key',
                detail: 'Paste xAI API key from console.x.ai (not SuperGrok tab session)',
            };
        }
        try {
            // Prefer models list if available
            const res = await fetch(`${BASE}/models`, {
                headers: { Authorization: `Bearer ${Auth.apiKey}` },
                signal: AbortSignal.timeout(timeoutMs),
            });
            if (res.ok) {
                const data = await res.json();
                const models = (data.data || data.models || []).map((m) => m.id || m.name).filter(Boolean);
                return {
                    ok: true,
                    models: models.length ? models : this.listChatModels().map((m) => m.id),
                    model: this.getChatModel(),
                    via: 'models',
                };
            }
            // Fallback: tiny completion
            const text = await this.chat(
                'Reply with exactly: ok',
                'ping',
                { model: this.getChatModel(), maxTokens: 8, temperature: 0, timeoutMs }
            );
            return {
                ok: true,
                models: this.listChatModels().map((m) => m.id),
                model: this.getChatModel(),
                via: 'chat',
                ping: text.slice(0, 40),
            };
        } catch (e) {
            return {
                ok: false,
                error: e.message || 'probe_failed',
                detail: e.message,
            };
        }
    },
};

/** @deprecated use GrokClient.chat */
export async function generateScript(systemPrompt, userIdea) {
    const { AgentRouter } = await import('../shared/agentRouter.js');
    const result = await AgentRouter.runTask('prompter_generate', {
        idea: userIdea || 'extend current scene',
        systemOverride: systemPrompt,
    });
    return result.code;
}

window.GrokClient = GrokClient;
