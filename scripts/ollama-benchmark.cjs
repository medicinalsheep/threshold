#!/usr/bin/env node
/**
 * Benchmark installed Ollama models against Threshold workflow probes.
 * Writes dist-store/ollama-benchmark.json and prints ranked table.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
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

function httpJson(method, urlPath, body, timeoutMs = 120000) {
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

function buildPrompt(probe) {
    const p = probe.payload || {};
    switch (probe.task) {
        case 'npc_chat':
            return {
                system: `You are ${p.npcName || 'NPC'}. Persona: ${p.persona || 'guide'}. Reply in 1-2 sentences.`,
                user: p.message || 'Hello',
            };
        case 'intent_classify':
            return {
                system: 'Reply ONE line: INTENT: spawn|edit|other  API: World.createObject if spawn',
                user: p.message || 'spawn a box',
            };
        case 'dev_patch':
        case 'dev_suggest':
            return {
                system: 'Threshold dev agent. Return ONLY JavaScript. Fix or extend code.',
                user: `Code:\n\`\`\`js\n${p.code || '// empty'}\n\`\`\``,
            };
        case 'scene_script':
            return {
                system: 'Threshold architect. Return ONLY JavaScript IIFE using World.createObject.',
                user: `Script for: ${p.idea || 'extend scene'}`,
            };
        default:
            return { system: 'Assistant', user: 'Hello' };
    }
}

function scoreProbe(probe, text) {
    const raw = String(text || '');
    const lower = raw.toLowerCase();
    let score = 0;
    if (raw.length >= (probe.minLength || 1)) score += 1;
    const hits = (probe.expectPatterns || []).filter((x) => lower.includes(x.toLowerCase()));
    if (hits.length) score += 2;
    if (probe.requireJs && /World\.|PlayerController|function|=>/.test(raw)) score += 2;
    return score;
}

function tierForProbe(probe) {
    return probe.tier || tasks.tasks[probe.task]?.tier || 'medium';
}

function pickModels(allModels, tier) {
    const tierCfg = tasks.tiers[tier];
    const preferred = tierCfg?.ollamaModels || [];
    const picked = [];
    for (const p of preferred) {
        const m = allModels.find((x) => x === p || x.startsWith(p.split(':')[0] + ':'));
        if (m && !picked.includes(m)) picked.push(m);
    }
    return picked.length ? picked : allModels;
}

async function chatModel(model, system, user, maxTokens, temperature) {
    const t0 = Date.now();
    const data = await httpJson('POST', '/api/chat', {
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        stream: false,
        options: { num_predict: maxTokens, temperature },
    });
    return { text: data.message?.content || '', ms: Date.now() - t0 };
}

async function main() {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    console.log(`ollama:benchmark — v${pkg.version} workflow probes\n`);

    let tags;
    try {
        tags = await httpJson('GET', '/api/tags', null, 5000);
    } catch (e) {
        console.error(`Ollama offline at ${BASE}: ${e.message}`);
        console.error('Start: ollama serve — then re-run npm run ollama:benchmark');
        process.exit(2);
    }

    const allModels = (tags.models || []).map((m) => m.name || m.model).filter(Boolean);
    console.log(`Models: ${allModels.join(', ')}\n`);

    const modelScores = {};
    const detailed = [];

    for (const probe of bench.probes) {
        const tier = tierForProbe(probe);
        const tierCfg = tasks.tiers[tier] || {};
        const models = pickModels(allModels, tier);
        const { system, user } = buildPrompt(probe);

        console.log(`── ${probe.id} (${tier}) ──`);
        for (const model of models) {
            try {
                const { text, ms } = await chatModel(model, system, user, tierCfg.maxTokens || 512, tierCfg.temperature ?? 0.35);
                const score = scoreProbe(probe, text);
                const max = probe.requireJs ? 5 : 3;
                console.log(`  ${model.padEnd(22)} ${score}/${max}  ${ms}ms  ${text.slice(0, 50).replace(/\n/g, ' ')}`);
                if (!modelScores[model]) modelScores[model] = { score: 0, max: 0, ms: 0, runs: 0 };
                modelScores[model].score += score;
                modelScores[model].max += max;
                modelScores[model].ms += ms;
                modelScores[model].runs += 1;
                detailed.push({ probe: probe.id, tier, model, score, max, ms, preview: text.slice(0, 120) });
            } catch (e) {
                console.log(`  ${model.padEnd(22)} ERR   ${e.message}`);
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
        }))
        .sort((a, b) => b.pct - a.pct || a.avgMs - b.avgMs);

    console.log('── Ranking (workflow fit) ──');
    ranking.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.model} — ${r.pct}% (${r.score}/${r.max}) avg ${r.avgMs}ms`);
    });

    const suggested = {
        small: ranking.find((r) => /3b|4b|mini/i.test(r.model))?.model || ranking[ranking.length - 1]?.model,
        medium: ranking.find((r) => /coder|7b/i.test(r.model))?.model || ranking[0]?.model,
        large: ranking.find((r) => /8b|7b/i.test(r.model))?.model || ranking[0]?.model,
    };
    console.log('\nSuggested tier defaults:', suggested);

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const report = {
        format: 'threshold-ollama-benchmark',
        version: 1,
        ranAt: new Date().toISOString(),
        models: allModels,
        ranking,
        suggested,
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