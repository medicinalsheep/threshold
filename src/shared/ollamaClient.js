/** Ollama browser client — localhost uses /ollama Vite proxy; GitHub Pages needs OLLAMA_ORIGINS on serve. */

const STORAGE_MODEL_KEY = 'threshold_ollama_model';
const DEFAULT_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b';
/** Cap context on mid-range GPUs (e.g. RTX 2060 6GB) so large tags don't thrash VRAM. */
const DEFAULT_NUM_CTX = Number(import.meta.env.VITE_OLLAMA_NUM_CTX) || 4096;

let probeInflight = null;

/** Models that default to chain-of-thought; disable for agent code/intent unless opted in. */
function isThinkingModel(name) {
    const n = String(name || '').toLowerCase();
    return /qwen3|gemma4|deepseek-r1|r1-tool|thinking|reason/.test(n);
}

/** Strip CoT blocks so Compiler / intent routers get usable text. */
export function stripOllamaThinking(text) {
    let t = String(text || '');
    t = t.replace(/<think>[\s\S]*?<\/think>/gi, '');
    t = t.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    t = t.replace(/<\|thinking\|>[\s\S]*?<\|\/thinking\|>/gi, '');
    t = t.replace(/^[\s\S]*?<\/think>/i, '');
    return t.trim();
}

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
        const think = options.think ?? (isThinkingModel(model) ? false : undefined);
        const body = {
            model,
            prompt,
            stream: false,
            options: {
                temperature: options.temperature ?? 0.35,
                num_predict: options.maxTokens ?? 2048,
                num_ctx: options.numCtx ?? DEFAULT_NUM_CTX,
            },
        };
        if (think !== undefined) body.think = think;
        const res = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(options.timeoutMs ?? 120000),
        });
        if (!res.ok) {
            const t = await res.text();
            const hint = ollamaCorsHelp(res.status);
            throw new Error(hint || `Ollama error (${res.status}): ${t.slice(0, 120)}`);
        }
        const data = await res.json();
        return stripOllamaThinking(data.response || '');
    },

    async chat(system, user, options = {}) {
        const model = options.model || this.defaultModel;
        // Reasoning tags (qwen3, gemma4, r1) burn num_predict on CoT — off by default for agents
        const think = options.think ?? (isThinkingModel(model) ? false : undefined);
        const body = {
            model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
            stream: false,
            options: {
                temperature: options.temperature ?? 0.35,
                num_predict: options.maxTokens ?? 1024,
                num_ctx: options.numCtx ?? DEFAULT_NUM_CTX,
            },
        };
        if (think !== undefined) body.think = think;
        const res = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(options.timeoutMs ?? 120000),
        });
        if (!res.ok) {
            const t = await res.text();
            const hint = ollamaCorsHelp(res.status);
            throw new Error(hint || `Ollama chat (${res.status}): ${t.slice(0, 120)}`);
        }
        const data = await res.json();
        const content = data.message?.content || '';
        const thinking = data.message?.thinking || '';
        // Prefer content; if model stuffed answer into thinking only, fall back carefully
        const cleaned = stripOllamaThinking(content);
        if (cleaned) return cleaned;
        if (thinking && options.allowThinkingFallback) return stripOllamaThinking(thinking);
        return cleaned;
    },

    /**
     * Pull a model into local Ollama (requires ollama serve reachable from this tab).
     * Streams NDJSON progress from POST /api/pull.
     * @param {string} name e.g. medicinalsheep/threshold-mini-npc
     * @param {{ onProgress?: (p: {status:string, completed?:number, total?:number, percent?:number}) => void, signal?: AbortSignal }} options
     */
    async pull(name, options = {}) {
        const model = String(name || '').trim();
        if (!model) throw new Error('Model name required');

        const res = await fetch(`${this.baseUrl}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: model, stream: true }),
            signal: options.signal,
        });
        if (!res.ok) {
            const t = await res.text().catch(() => '');
            const hint = ollamaCorsHelp(res.status);
            throw new Error(hint || `Ollama pull failed (${res.status}): ${t.slice(0, 160)}`);
        }

        const reader = res.body?.getReader?.();
        if (!reader) {
            // Non-streaming fallback
            const data = await res.json().catch(() => ({}));
            if (data.error) throw new Error(data.error);
            options.onProgress?.({ status: data.status || 'success', percent: 100 });
            return { ok: true, model };
        }

        const decoder = new TextDecoder();
        let buf = '';
        let last = { status: 'starting' };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() || '';
            for (const line of lines) {
                const s = line.trim();
                if (!s) continue;
                let msg;
                try {
                    msg = JSON.parse(s);
                } catch {
                    continue;
                }
                if (msg.error) throw new Error(msg.error);
                const total = Number(msg.total) || 0;
                const completed = Number(msg.completed) || 0;
                const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : undefined;
                last = {
                    status: msg.status || 'pulling',
                    completed: total ? completed : undefined,
                    total: total || undefined,
                    percent,
                    digest: msg.digest,
                };
                options.onProgress?.(last);
            }
        }
        if (buf.trim()) {
            try {
                const msg = JSON.parse(buf.trim());
                if (msg.error) throw new Error(msg.error);
            } catch (e) {
                if (e.message && !e.message.includes('JSON')) throw e;
            }
        }
        options.onProgress?.({ status: 'success', percent: 100 });
        return { ok: true, model, last };
    },
};

window.OllamaClient = OllamaClient;