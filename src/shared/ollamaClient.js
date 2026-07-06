const DEFAULT_BASE = import.meta.env.VITE_OLLAMA_URL || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b';
const STORAGE_MODEL_KEY = 'threshold_ollama_model';

export const OllamaClient = {
    get baseUrl() {
        return DEFAULT_BASE.replace(/\/$/, '');
    },

    get defaultModel() {
        return sessionStorage.getItem(STORAGE_MODEL_KEY) || DEFAULT_MODEL;
    },

    setPreferredModel(name) {
        const m = String(name || '').trim();
        if (m) sessionStorage.setItem(STORAGE_MODEL_KEY, m);
    },

    async probe(timeoutMs = 2000) {
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`, {
                signal: AbortSignal.timeout(timeoutMs),
            });
            if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` };
            const data = await res.json();
            const models = (data.models || []).map((m) => m.name || m.model).filter(Boolean);
            return { ok: true, models, error: null };
        } catch (e) {
            return { ok: false, models: [], error: e.message || 'offline' };
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
            throw new Error(`Ollama error (${res.status}): ${t.slice(0, 120)}`);
        }
        const data = await res.json();
        return (data.response || '').trim();
    },
};

window.OllamaClient = OllamaClient;