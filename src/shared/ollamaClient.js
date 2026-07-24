/** Ollama browser client — Vite /ollama proxy locally; Pages uses :11435 PNA proxy. */

const STORAGE_MODEL_KEY = 'threshold_ollama_model';
const DEFAULT_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b';
/** Cap context on mid-range GPUs (e.g. RTX 2060 6GB) so large tags don't thrash VRAM. */
const DEFAULT_NUM_CTX = Number(import.meta.env.VITE_OLLAMA_NUM_CTX) || 4096;

/** Local proxy with CORS + Access-Control-Allow-Private-Network (npm run ollama:serve) */
const PAGES_PROXY_URL = (import.meta.env.VITE_OLLAMA_URL || '').trim()
    || 'http://127.0.0.1:11435';
const DIRECT_URL = 'http://127.0.0.1:11434';

let probeInflight = null;
let resolvedBase = null;

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

function isPagesHost() {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h.includes('github.io') || h.includes('github.dev');
}

function candidateBases() {
    const forceDirect = import.meta.env.VITE_OLLAMA_DIRECT === '1';
    const explicit = (import.meta.env.VITE_OLLAMA_URL || '').trim();
    if (explicit) return [explicit.replace(/\/$/, '')];

    if (forceDirect) return [DIRECT_URL];

    if (isLocalPage()) {
        // Vite dev/preview same-origin proxy first, then PNA proxy, then raw
        return ['/ollama', PAGES_PROXY_URL, DIRECT_URL];
    }
    // GitHub Pages / remote HTTPS: ONLY the local CORS proxy.
    // Never probe :11434 from a public origin — browsers log a hard CORS
    // error even when JS catches the failure (looks like "serious" red noise).
    return [PAGES_PROXY_URL];
}

function resolveBaseUrl() {
    if (resolvedBase) return resolvedBase;
    const list = candidateBases();
    return list[0];
}

export function ollamaCorsHelp(status) {
    if (status !== 403) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'your-page-origin';
    return `Ollama CORS blocked (403). Stop plain ollama, then from the Threshold repo:\n`
        + `  npm run ollama:serve\n`
        + `(starts Ollama + proxy on :11435 for Pages)\n`
        + `Or: set OLLAMA_ORIGINS=${origin},* && ollama serve`;
}

function classifyFetchError(err) {
    const msg = String(err?.message || err || 'offline');
    const name = err?.name || '';
    if (name === 'TimeoutError' || /aborted|timeout/i.test(msg)) {
        return {
            error: 'timeout — Ollama busy or not running (npm run ollama:serve)',
            hint: 'timeout',
        };
    }
    if (/Failed to fetch|NetworkError|Load failed|Network request failed/i.test(msg)) {
        if (isPagesHost() || (typeof window !== 'undefined' && window.isSecureContext && !isLocalPage())) {
            return {
                error: 'blocked from this page — run: npm run ollama:serve (opens :11435 proxy for GitHub Pages)',
                hint: 'pna_or_mixed',
                corsBlocked: true,
            };
        }
        return {
            error: 'unreachable — start Ollama: npm run ollama:serve',
            hint: 'offline',
        };
    }
    return { error: msg, hint: 'unknown' };
}

async function probeUrl(base, timeoutMs) {
    const url = `${base.replace(/\/$/, '')}/api/tags`;
    const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        mode: 'cors',
        cache: 'no-store',
    });
    if (!res.ok) {
        const cors = ollamaCorsHelp(res.status);
        return {
            ok: false,
            models: [],
            error: cors ? 'CORS 403 — run: npm run ollama:serve' : `HTTP ${res.status}`,
            corsBlocked: res.status === 403,
            corsHelp: cors,
            baseUrl: base,
        };
    }
    const data = await res.json();
    const models = (data.models || []).map((m) => m.name || m.model).filter(Boolean);
    return {
        ok: true,
        models,
        error: null,
        corsBlocked: false,
        baseUrl: base,
    };
}

export const OllamaClient = {
    get baseUrl() {
        return resolveBaseUrl().replace(/\/$/, '');
    },

    /** Forget cached base after ollama:serve restart */
    resetBase() {
        resolvedBase = null;
    },

    get defaultModel() {
        return sessionStorage.getItem(STORAGE_MODEL_KEY) || DEFAULT_MODEL;
    },

    setPreferredModel(name) {
        const m = String(name || '').trim();
        if (m) sessionStorage.setItem(STORAGE_MODEL_KEY, m);
    },

    async probe(timeoutMs = 4000) {
        if (probeInflight) return probeInflight;
        probeInflight = this._probeOnce(timeoutMs).finally(() => {
            probeInflight = null;
        });
        return probeInflight;
    },

    async _probeOnce(timeoutMs) {
        // Player surface: no localhost Ollama probes (avoids Pages CORS noise on phones)
        if (window.SurfaceProfile && !window.SurfaceProfile.allowsOllamaProbe()) {
            return {
                ok: false,
                models: [],
                error: 'Ollama skipped on play surface — switch to Creator tools to use local models',
                corsBlocked: false,
                skippedSurface: true,
                tried: [],
                errors: [],
            };
        }

        const bases = candidateBases();
        const errors = [];

        for (const base of bases) {
            try {
                const result = await probeUrl(base, timeoutMs);
                if (result.ok) {
                    resolvedBase = base.replace(/\/$/, '');
                    return result;
                }
                errors.push(`${base}: ${result.error}`);
                // 403 on one base — try next (proxy may still work)
                if (!result.corsBlocked) {
                    // keep trying other bases
                }
            } catch (e) {
                const c = classifyFetchError(e);
                errors.push(`${base}: ${c.error}`);
            }
        }

        const last = errors[errors.length - 1] || 'offline';
        const anyPna = errors.some((e) => /blocked from this page|pna|CORS|11435/i.test(e));
        const pagesNeedsProxy = isPagesHost() || (!isLocalPage() && typeof window !== 'undefined' && window.isSecureContext);
        const offlineProxy = pagesNeedsProxy || bases.every((b) => String(b).includes('11435'));
        return {
            ok: false,
            models: [],
            error: offlineProxy
                ? 'Ollama proxy not reachable — on this PC run: node scripts/ollama-cors-proxy.cjs (or npm run ollama:serve), keep it open, then RE-SCAN'
                : anyPna
                    ? 'Pages blocked raw Ollama — run npm run ollama:serve (proxy :11435), then RE-SCAN'
                    : last.replace(/^[^:]+:\s*/, ''),
            corsBlocked: anyPna || offlineProxy,
            corsHelp: offlineProxy || anyPna
                ? ollamaCorsHelp(403)
                : `Tried: ${bases.join(', ')}. Keep "npm run ollama:serve" running, then RE-SCAN.`,
            tried: bases,
            errors,
        };
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
        const cleaned = stripOllamaThinking(content);
        if (cleaned) return cleaned;
        if (thinking && options.allowThinkingFallback) return stripOllamaThinking(thinking);
        return cleaned;
    },

    /**
     * Pull a model into local Ollama (requires ollama serve reachable from this tab).
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
        options.onProgress?.({ status: 'success', percent: 100 });
        return { ok: true, model, last };
    },
};

window.OllamaClient = OllamaClient;
