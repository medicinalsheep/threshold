import tasksConfig from '../../config/agent-tasks.json';
import { Auth } from '../auth/main.js';
import { API_URL, MODEL as GROK_MODEL } from '../grok/client.js';
import { OllamaClient } from './ollamaClient.js';
import { ViewPrefs } from './viewPrefs.js';
import { buildTaskPrompt, stripCodeFences } from './agentPrompts.js';

const PREFS_KEY = 'agentTierModels';
const ROUTE_LOG_KEY = 'agentRouteLog';

function loadTierPrefs() {
    return ViewPrefs.get(PREFS_KEY, { small: 'auto', medium: 'auto', large: 'auto', preferGrokLarge: true }) || {};
}

function saveTierPrefs(prefs) {
    ViewPrefs.set(PREFS_KEY, prefs);
    window.dispatchEvent(new CustomEvent('agent-config-change'));
}

function pickInstalled(candidates, installed) {
    const set = new Set(installed || []);
    for (const c of candidates || []) {
        if (set.has(c)) return c;
    }
    for (const c of candidates || []) {
        const base = c.split(':')[0];
        const match = installed.find((m) => m === c || m.startsWith(`${base}:`));
        if (match) return match;
    }
    return installed[0] || null;
}

function resolveModelForTier(tierId, installed, overrides = {}) {
    const tier = tasksConfig.tiers[tierId];
    const prefs = { ...loadTierPrefs(), ...overrides.prefs };
    const pref = overrides.model || prefs[tierId] || 'auto';

    if (pref === 'grok') return { provider: 'grok', model: GROK_MODEL };
    if (pref && pref !== 'auto') return { provider: 'ollama', model: pref };

    if (tierId === 'large' && tier?.grokPreferred && prefs.preferGrokLarge !== false && Auth.isLoggedIn()) {
        return { provider: 'grok', model: GROK_MODEL };
    }

    const model = pickInstalled(tier?.ollamaModels, installed);
    if (model) return { provider: 'ollama', model };

    if (tier?.grok === 'fallback' && Auth.isLoggedIn()) {
        return { provider: 'grok', model: GROK_MODEL };
    }
    if (Auth.isLoggedIn() && tierId === 'large') {
        return { provider: 'grok', model: GROK_MODEL };
    }

    throw new Error(`No model for tier "${tierId}" — set Ollama models or xAI key`);
}

async function callGrok(system, user, options = {}) {
    if (!Auth.isLoggedIn()) throw new Error('xAI key required — paste in AGENTS panel');
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Auth.apiKey}`,
        },
        body: JSON.stringify({
            model: options.model || GROK_MODEL,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
            temperature: options.temperature ?? 0.4,
            max_tokens: options.maxTokens ?? 2048,
        }),
        signal: options.signal,
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`Grok (${res.status}): ${t.slice(0, 120)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callOllama(system, user, options = {}) {
    const probe = await OllamaClient.probe(3000);
    if (!probe.ok) throw new Error(`Ollama offline (${probe.error})`);
    return OllamaClient.chat(system, user, {
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        timeoutMs: options.timeoutMs,
    });
}

function logRoute(entry) {
    const log = ViewPrefs.get(ROUTE_LOG_KEY, []);
    log.unshift({ ...entry, at: new Date().toISOString() });
    ViewPrefs.set(ROUTE_LOG_KEY, log.slice(0, 20));
}

export const AgentRouter = {
    config: tasksConfig,

    getTierPrefs() {
        return loadTierPrefs();
    },

    setTierPrefs(patch) {
        saveTierPrefs({ ...loadTierPrefs(), ...patch });
    },

    getTask(taskId) {
        return tasksConfig.tasks[taskId] || null;
    },

    getTier(tierId) {
        return tasksConfig.tiers[tierId] || null;
    },

    resolveRoute(taskId, installedModels, overrides = {}) {
        const task = tasksConfig.tasks[taskId];
        if (!task) throw new Error(`Unknown task: ${taskId}`);
        const tier = tasksConfig.tiers[task.tier];
        const route = resolveModelForTier(task.tier, installedModels, overrides);
        return { taskId, tier: task.tier, tierLabel: tier?.label, ...route };
    },

    async runTask(taskId, payload = {}, overrides = {}) {
        const task = tasksConfig.tasks[taskId];
        if (!task) throw new Error(`Unknown task: ${taskId}`);
        const tier = tasksConfig.tiers[task.tier];
        const probe = await OllamaClient.probe(2500);
        const installed = probe.ok ? probe.models : [];
        const route = this.resolveRoute(taskId, installed, overrides);
        const { system, user } = buildTaskPrompt(taskId, payload);
        const t0 = performance.now();

        let text;
        let usedProvider = route.provider;
        try {
            if (route.provider === 'grok') {
                text = await callGrok(system, user, {
                    model: route.model,
                    temperature: tier?.temperature,
                    maxTokens: tier?.maxTokens,
                });
            } else {
                text = await callOllama(system, user, {
                    model: route.model,
                    temperature: tier?.temperature,
                    maxTokens: tier?.maxTokens,
                });
            }
        } catch (primaryErr) {
            if (route.provider === 'ollama' && tier?.grok === 'fallback' && Auth.isLoggedIn()) {
                text = await callGrok(system, user, {
                    temperature: tier?.temperature,
                    maxTokens: tier?.maxTokens,
                });
                usedProvider = 'grok';
                route.model = GROK_MODEL;
            } else {
                throw primaryErr;
            }
        }

        const ms = Math.round(performance.now() - t0);
        const codeTasks = ['dev_patch', 'dev_suggest', 'prompt_snippet', 'scene_script', 'prompter_generate'];
        const result = {
            text,
            code: codeTasks.includes(taskId) ? stripCodeFences(text) : text,
            taskId,
            tier: task.tier,
            provider: usedProvider,
            model: route.model,
            ms,
        };
        logRoute(result);
        return result;
    },

    getRouteLog() {
        return ViewPrefs.get(ROUTE_LOG_KEY, []);
    },
};

window.AgentRouter = AgentRouter;