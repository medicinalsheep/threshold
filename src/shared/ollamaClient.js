/** Ollama browser client — localhost uses /ollama Vite proxy; GitHub Pages needs OLLAMA_ORIGINS on serve. */

const STORAGE_MODEL_KEY = 'threshold_ollama_model';
const DEFAULT_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b';

let probeInflight = null;

function isLocalPage() {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
}

function resolveBaseUrl() {
    const explicit = (import.meta.env.VITE_OLLAMA_URL || '').trim();
    const forceDirect = import.meta.env.VITE_OLLAMA_DIRECT === '1';

    // Local dev/preview: same-origin proxy avoids Ollama CORS 403 on refresh
    if (!forceDirect && isLocalPage()) {
        return '/ollama';
    }

    if (explicit) return explicit;
    return 'http://127.0.0.1:11434';
}

export function ollamaCorsHelp(status) {
    if (status !== 403) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'your-page-origin';
    return `Ollama CORS blocked (403). Stop ollama, then run:\n`
        + `  npm run ollama:serve\n`
        + `Or: set OLLAMA_ORIGINS=${origin},* && ollama serve`;
}

export const OllamaClient = {
    get baseUrl() {
        return resolveBaseUrl().replace(/\/$/, '');
    },

    get defaultModel() {
        return sessionStorage.getItem(STORAGE_MODEL_KEY) || DEFAULT_MODEL;
    },

    setPreferredModel(name) {
        const m = String(name || '').trim();
        if (m) sessionStorage.setItem(STORAGE_MODEL_KEY, m);
    },

    async probe(timeoutMs = 2000) {
        if (probeInflight) return probeInflight;
        probeInflight = this._probeOnce(timeoutMs).finally(() => {
            probeInflight = null;
        });
        return probeInflight;
    },

    async _probeOnce(timeoutMs) {
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`, {
                signal: AbortSignal.timeout(timeoutMs),
            });
            if (!res.ok) {
                const cors = ollamaCorsHelp(res.status);
                return {
                    ok: false,
                    models: [],
                    error: cors ? 'CORS 403 — run: npm run ollama:serve' : `HTTP ${res.status}`,
                    corsBlocked: res.status === 403,
                    corsHelp: cors,
                };
            }
            const data = await res.json();
            const models = (data.models || []).map((m) => m.name || m.model).filter(Boolean);
            return { ok: true, models, error: null, corsBlocked: false };
        } catch (e) {
            return { ok: false, models: [], error: e.message || 'offline', corsBlocked: false };
        }
    },

    async generate(prompt, options = {}) {
        const model = options.model || this.defaultModel;
        const res = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: { temperature: options.temperature ?? 0.35, num_predict: options.maxTokens ?? 2048 },
            }),
            signal: AbortSignal.timeout(options.timeoutMs ?? 120000),
        });
        if (!res.ok) {
            const t = await res.text();
            const hint = ollamaCorsHelp(res.status);
            throw new Error(hint || `Ollama error (${res.status}): ${t.slice(0, 120)}`);
        }
        const data = await res.json();
        return (data.response || '').trim();
    },

    async chat(system, user, options = {}) {
        const model = options.model || this.defaultModel;
        const res = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user },
                ],
                stream: false,
                options: {
                    temperature: options.temperature ?? 0.35,
                    num_predict: options.maxTokens ?? 1024,
                },
            }),
            signal: AbortSignal.timeout(options.timeoutMs ?? 120000),
        });
        if (!res.ok) {
            const t = await res.text();
            const hint = ollamaCorsHelp(res.status);
            throw new Error(hint || `Ollama chat (${res.status}): ${t.slice(0, 120)}`);
        }
        const data = await res.json();
        return (data.message?.content || '').trim();
    },
};

window.OllamaClient = OllamaClient;