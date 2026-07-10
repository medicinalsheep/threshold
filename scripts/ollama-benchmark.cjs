#!/usr/bin/env node
/**
 * Benchmark installed Ollama models against Threshold workflow probes.
 * Writes dist-store/ollama-benchmark.json and prints ranked table.
 *
 * Usage:
 *   npm run ollama:benchmark           # preferred models per tier (agent-tasks)
 *   npm run ollama:benchmark -- --all  # every installed model on every probe
 *   npm run ollama:benchmark -- --all --ctx 4096
 *
 * 2060-class laptops: default num_ctx=4096 keeps VRAM sane; large models may CPU-offload.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const ALL = process.argv.includes('--all');
const CTX = (() => {
    const i = process.argv.indexOf('--ctx');
    if (i >= 0 && process.argv[i + 1]) return Math.max(512, parseInt(process.argv[i + 1], 10) || 4096);
    return 4096;
})();
const ONLY = (() => {
    const i = process.argv.indexOf('--only');
    if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean);
    return null;
})();

function loadLocalHost() {
    const envLocal = path.join(ROOT, '.env.local');
    if (fs.existsSync(envLocal)) {
        const m = fs.readFileSync(envLocal, 'utf8').match(/VITE_OLLAMA_URL=(.+)/);
        if (m) return m[1].trim();
    }
    return process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
}

const BASE = loadLocalHost();
const OUT = path.join(ROOT, 'dist-store', 'ollama-benchmark.json');

const tasks = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/agent-tasks.json'), 'utf8'));
const bench = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/agent-benchmark.json'), 'utf8'));

function httpJson(method, urlPath, body, timeoutMs = 300000) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE);
        const payload = body ? JSON.stringify(body) : null;
        const req = http.request(url, {
            method,
            headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {},
            timeout: timeoutMs,
        }, (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 120)}`));
                    return;
                }
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        if (payload) req.write(payload);
        req.end();
    });
}

/** Strip thinking blocks from reasoning models (qwen3, gemma4, r1, etc.) */
function stripThinking(text) {
    let t = String(text || '');
    t = t.replace(/<think>[\s\S]*?<\/think>/gi, '');
    t = t.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    t = t.replace(/<\|thinking\|>[\s\S]*?<\|\/thinking\|>/gi, '');
    // Unclosed think at start (stream aborted mid-reason)
    t = t.replace(/^[\s\S]*?<\/think>/i, '');
    return t.trim();
}

function buildPrompt(probe) {
    const p = probe.payload || {};
    switch (probe.task) {
        case 'npc_chat':
            return {
                system: `You are ${p.npcName || 'NPC'}. Persona: ${p.persona || 'guide'}. Reply in 1-2 sentences. No markdown.`,
                user: p.message || 'Hello',
            };
        case 'intent_classify':
            return {
                system: 'Threshold intent router. Reply EXACTLY two lines:\nINTENT: spawn|edit|texture|export|style|sound|physics|graphics|other\nAPI: World.createObject|ExportWizard|State.env|…\nNo explanation.',
                user: p.message || 'spawn a box',
            };
        case 'dev_patch':
        case 'dev_suggest':
            return {
                system: 'Threshold dev agent. Return ONLY valid JavaScript. No markdown fences. No thinking out loud. Fix or extend the code using World.createObject / PlayerController when relevant.',
                user: `Code:\n\`\`\`js\n${p.code || '// empty'}\n\`\`\``,
            };
        case 'scene_script':
            return {
                system: 'Threshold architect. Return ONLY a JavaScript IIFE. Use World.createObject({ name, type, color, position }). No markdown. No prose.',
                user: `Script for: ${p.idea || 'extend scene'}`,
            };
        default:
            return { system: 'Assistant', user: 'Hello' };
    }
}

function scoreProbe(probe, text) {
    const raw = stripThinking(text);
    const lower = raw.toLowerCase();
    let score = 0;
    if (raw.length >= (probe.minLength || 1)) score += 1;
    const hits = (probe.expectPatterns || []).filter((x) => lower.includes(x.toLowerCase()));
    if (hits.length) score += 2;
    if (probe.requireJs && /World\.|PlayerController|function|=>|createObject/.test(raw)) score += 2;
    // Penalty: pure thinking dump with no useful body
    if (!raw && String(text || '').length > 20) score = 0;
    return { score, cleaned: raw, hits: hits.length };
}

function tierForProbe(probe) {
    return probe.tier || tasks.tasks[probe.task]?.tier || 'medium';
}

function pickModels(allModels, tier) {
    if (ALL) {
        let list = [...allModels];
        if (ONLY) list = list.filter((m) => ONLY.some((o) => m === o || m.startsWith(o)));
        return list;
    }
    const tierCfg = tasks.tiers[tier];
    const preferred = tierCfg?.ollamaModels || [];
    const picked = [];
    for (const p of preferred) {
        const m = allModels.find((x) => {
            if (x === p) return true;
            const base = p.split(':')[0];
            // case-insensitive tag match (llama3.2:3b vs llama3.2:3B)
            if (x.toLowerCase() === p.toLowerCase()) return true;
            if (x.toLowerCase().startsWith(base.toLowerCase() + ':')) return true;
            return false;
        });
        if (m && !picked.includes(m)) picked.push(m);
    }
    // Always include unmatched installed models when few preferred hits (local testing)
    if (picked.length < 2) {
        for (const m of allModels) {
            if (!picked.includes(m)) picked.push(m);
        }
    }
    return picked.length ? picked : allModels;
}

function modelSizeHint(name) {
    const n = name.toLowerCase();
    if (/1\.5b|3b|mini|4b/.test(n)) return 'small';
    if (/7b|8b|qwen2\.5:|gemma4/.test(n)) return 'large-ish';
    return 'mid';
}

function isThinkingModel(name) {
    return /qwen3|gemma4|deepseek-r1|r1-tool|thinking|reason/i.test(String(name || ''));
}

async function chatModel(model, system, user, maxTokens, temperature) {
    const t0 = Date.now();
    const body = {
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        stream: false,
        keep_alive: '2m',
        options: {
            num_predict: maxTokens,
            temperature,
            num_ctx: CTX,
        },
    };
    // Match OllamaClient: disable CoT so code/intent probes get usable text
    if (isThinkingModel(model)) body.think = false;
    const data = await httpJson('POST', '/api/chat', body, Math.max(300000, (tasks.tiers.large?.timeoutMs || 300000)));
    return {
        text: data.message?.content || '',
        ms: Date.now() - t0,
        evalCount: data.eval_count,
        promptEvalCount: data.prompt_eval_count,
        evalDuration: data.eval_duration,
    };
}

function tokensPerSec(evalCount, evalDurationNs) {
    if (!evalCount || !evalDurationNs) return null;
    return Math.round((evalCount / evalDurationNs) * 1e9 * 10) / 10;
}

async function main() {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    console.log(`ollama:benchmark — v${pkg.version} workflow probes`);
    console.log(`  mode: ${ALL ? 'ALL installed models' : 'tier preferred (+ fill)'}`);
    console.log(`  num_ctx: ${CTX} (2060-friendly default 4096)`);
    if (ONLY) console.log(`  only: ${ONLY.join(', ')}`);
    console.log('');

    let tags;
    try {
        tags = await httpJson('GET', '/api/tags', null, 5000);
    } catch (e) {
        console.error(`Ollama offline at ${BASE}: ${e.message}`);
        console.error('Start: ollama serve — then re-run npm run ollama:benchmark');
        process.exit(2);
    }

    const allModels = (tags.models || []).map((m) => m.name || m.model).filter(Boolean);
    const sizes = Object.fromEntries((tags.models || []).map((m) => [m.name || m.model, m.size]));
    console.log(`Models (${allModels.length}): ${allModels.join(', ')}\n`);

    const modelScores = {};
    const detailed = [];
    const tierFit = { small: {}, medium: {}, large: {} };

    for (const probe of bench.probes) {
        const tier = tierForProbe(probe);
        const tierCfg = tasks.tiers[tier] || {};
        const models = pickModels(allModels, tier);
        const { system, user } = buildPrompt(probe);
        // Cap tokens for laptop: medium/large probes still need room for JS
        const maxTok = Math.min(tierCfg.maxTokens || 512, tier === 'large' ? 1024 : tier === 'medium' ? 768 : 256);

        console.log(`── ${probe.id} (${tier}, max_tok=${maxTok}) ──`);
        for (const model of models) {
            const sizeGb = sizes[model] ? (sizes[model] / 1e9).toFixed(1) : '?';
            try {
                const { text, ms, evalCount, evalDuration } = await chatModel(
                    model, system, user, maxTok, tierCfg.temperature ?? 0.35,
                );
                const { score, cleaned, hits } = scoreProbe(probe, text);
                const max = probe.requireJs ? 5 : 3;
                const tps = tokensPerSec(evalCount, evalDuration);
                const preview = cleaned.slice(0, 60).replace(/\n/g, ' ') || '(empty after think-strip)';
                const tpsStr = tps != null ? `${tps} tok/s` : 'n/a tok/s';
                console.log(`  ${model.padEnd(20)} ${score}/${max}  ${String(ms).padStart(6)}ms  ${tpsStr.padStart(12)}  ${sizeGb}GB  ${preview}`);

                if (!modelScores[model]) modelScores[model] = { score: 0, max: 0, ms: 0, runs: 0, tps: [] };
                modelScores[model].score += score;
                modelScores[model].max += max;
                modelScores[model].ms += ms;
                modelScores[model].runs += 1;
                if (tps != null) modelScores[model].tps.push(tps);

                if (!tierFit[tier][model]) tierFit[tier][model] = { score: 0, max: 0, ms: 0, n: 0 };
                tierFit[tier][model].score += score;
                tierFit[tier][model].max += max;
                tierFit[tier][model].ms += ms;
                tierFit[tier][model].n += 1;

                detailed.push({
                    probe: probe.id,
                    tier,
                    model,
                    score,
                    max,
                    ms,
                    tps,
                    hits,
                    sizeGb: Number(sizeGb) || null,
                    sizeHint: modelSizeHint(model),
                    preview: cleaned.slice(0, 200),
                    rawPreview: String(text || '').slice(0, 80),
                });
            } catch (e) {
                console.log(`  ${model.padEnd(20)} ERR   ${e.message}`);
                detailed.push({ probe: probe.id, tier, model, error: e.message });
            }
        }
        console.log('');
    }

    const ranking = Object.entries(modelScores)
        .map(([model, s]) => ({
            model,
            pct: s.max ? Math.round((100 * s.score) / s.max) : 0,
            score: s.score,
            max: s.max,
            avgMs: s.runs ? Math.round(s.ms / s.runs) : 0,
            avgTps: s.tps.length ? Math.round((s.tps.reduce((a, b) => a + b, 0) / s.tps.length) * 10) / 10 : null,
            sizeHint: modelSizeHint(model),
        }))
        .sort((a, b) => b.pct - a.pct || a.avgMs - b.avgMs);

    console.log('── Ranking (workflow fit) ──');
    ranking.forEach((r, i) => {
        const tps = r.avgTps != null ? ` · ${r.avgTps} tok/s` : '';
        console.log(`  ${i + 1}. ${r.model} — ${r.pct}% (${r.score}/${r.max}) avg ${r.avgMs}ms${tps} [${r.sizeHint}]`);
    });

    // Per-tier best: quality first, then speed (prefer models that fit the tier size)
    function bestForTier(tierId) {
        const rows = Object.entries(tierFit[tierId] || {}).map(([model, s]) => ({
            model,
            pct: s.max ? (100 * s.score) / s.max : 0,
            avgMs: s.n ? s.ms / s.n : 999999,
            score: s.score,
            max: s.max,
        }));
        if (!rows.length) return ranking[0]?.model || null;
        rows.sort((a, b) => b.pct - a.pct || a.avgMs - b.avgMs);
        return rows[0].model;
    }

    const suggested = {
        small: bestForTier('small'),
        medium: bestForTier('medium'),
        large: bestForTier('large'),
    };

    // Laptop note: if large model avgMs > 45s, suggest medium winner as practical large
    const largeRow = ranking.find((r) => r.model === suggested.large);
    const practical = { ...suggested };
    if (largeRow && largeRow.avgMs > 45000) {
        const faster = ranking.filter((r) => r.avgMs < 20000 && r.pct >= 40).sort((a, b) => b.pct - a.pct)[0];
        if (faster) practical.largeNote = `${suggested.large} is slow (${largeRow.avgMs}ms avg) — consider ${faster.model} for interactive large on 2060`;
    }

    console.log('\nSuggested tier defaults (quality@tier):', suggested);
    if (practical.largeNote) console.log('2060 note:', practical.largeNote);

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const report = {
        format: 'threshold-ollama-benchmark',
        version: 2,
        ranAt: new Date().toISOString(),
        deviceHint: 'RTX 2060 laptop class — num_ctx capped for VRAM',
        numCtx: CTX,
        mode: ALL ? 'all' : 'preferred',
        models: allModels,
        ranking,
        suggested,
        practical,
        tierFit,
        detailed,
        probes: bench.probes.map((p) => p.id),
    };
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(`\nWrote ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
