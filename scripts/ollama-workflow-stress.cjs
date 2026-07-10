#!/usr/bin/env node
/**
 * Live workflow stress: real Threshold agent prompts × models side-by-side.
 * Usage: node scripts/ollama-workflow-stress.cjs
 *        node scripts/ollama-workflow-stress.cjs --models llama3.2:3B,qwen2.5:latest
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const CTX = 4096;

const MODELS = (() => {
    const i = process.argv.indexOf('--models');
    if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1].split(',').map((s) => s.trim());
    return ['llama3.2:3B', 'qwen2.5:latest'];
})();

// Mirrors src/shared/agentPrompts.js + intentRouter / portal usage (no DOM scene context)
const WORKFLOWS = [
    {
        id: 'portal_npc',
        label: 'Portal / chat NPC',
        task: 'npc_chat',
        maxTokens: 256,
        temperature: 0.5,
        system: `You are Nikola, an NPC in Threshold Engine (Three.js).
Persona: eccentric inventor at Wardenclyffe
Reply in 1-3 short sentences, in character. Optional: [ACTION: brief action].`,
        user: 'How do I start building with AI?',
        score(text) {
            const t = text.toLowerCase();
            let s = 0;
            if (text.length >= 20 && text.length < 500) s += 2;
            if (/build|station|portal|ai|f\b|generate|describe/i.test(t)) s += 2;
            if (/\[action:/i.test(t)) s += 1;
            if (t.includes('```') || t.length > 800) s -= 1;
            return Math.max(0, Math.min(5, s));
        },
    },
    {
        id: 'chat_intent',
        label: 'Game chat intent (T)',
        task: 'intent_classify',
        maxTokens: 128,
        temperature: 0.3,
        system: `Classify Threshold Engine user intent. Reply exactly two lines:
INTENT: spawn|edit|physics|sound|texture|export|graphics|style|other
API: primary API (e.g. World.createObject, ExportWizard, Engine.setRenderMode(4), State.env)`,
        user: 'spawn a red box in the scene',
        score(text) {
            const t = text.toLowerCase();
            let s = 0;
            if (/intent:\s*spawn/i.test(t)) s += 2;
            if (/world\.createobject|createobject/i.test(t)) s += 2;
            if ((text.match(/\n/g) || []).length <= 4 && text.length < 200) s += 1;
            return Math.max(0, Math.min(5, s));
        },
    },
    {
        id: 'compiler_patch',
        label: 'Compiler patch',
        task: 'dev_patch',
        maxTokens: 512,
        temperature: 0.35,
        system: `You are Threshold Engine dev agent (medium task). Fix or extend JavaScript.
Return ONLY executable JavaScript. Minimal change preferred for patches.
Use World, THREE, PlayerController, Physics. Default realistic PBR (render mode 4, MeshStandardMaterial).`,
        user: `Improve or complete:\n\`\`\`js\nWorld.createObject({ nam: 'crate', type: 'box', color: 0xff0000 });\n\`\`\``,
        score(text) {
            const cleaned = stripFences(text);
            let s = 0;
            if (/createObject/i.test(cleaned)) s += 2;
            if (/\bname\s*:/i.test(cleaned) && !/\bnam\s*:/i.test(cleaned)) s += 2;
            if (/hasPhysics|0xff0000|box/i.test(cleaned)) s += 1;
            if (/```/.test(cleaned) || /sorry|cannot|as an ai/i.test(cleaned)) s -= 1;
            return Math.max(0, Math.min(5, s));
        },
    },
    {
        id: 'compiler_suggest',
        label: 'Compiler suggest (spin sphere)',
        task: 'dev_suggest',
        maxTokens: 768,
        temperature: 0.35,
        system: `You are Threshold Engine dev agent (medium task). Fix or extend JavaScript.
Return ONLY executable JavaScript. Minimal change preferred for patches.
Use World, THREE, PlayerController, Physics.`,
        user: `Improve or complete:\n\`\`\`js\n// add a spinning green sphere at y=2\n\`\`\``,
        score(text) {
            const cleaned = stripFences(text);
            let s = 0;
            if (/createObject|sphere/i.test(cleaned)) s += 2;
            if (/rotation|rotate|onTick|spin/i.test(cleaned)) s += 2;
            if (/0x|green|33cc|00ff/i.test(cleaned) || /y\s*[=:]\s*2|position\.set\([^)]*2/i.test(cleaned)) s += 1;
            return Math.max(0, Math.min(5, s));
        },
    },
    {
        id: 'portal_scene',
        label: 'Portal full scene script',
        task: 'scene_script',
        maxTokens: 1024,
        temperature: 0.4,
        system: `You are Threshold Engine architect (large task). Generate a complete playable script.
Return ONLY executable JavaScript wrapped in an IIFE with try/catch inside.
Extend the live scene — do NOT call World.clearWorld() unless asked.
Always call Engine.setRenderMode(4) once.
Use World.createObject, PlayerController.spawnPlayer when needed.`,
        user: `Generate a Threshold Engine script for:
Two colored crates on the grid and spawn the player if missing.

Return ONLY the IIFE — no markdown, no explanation.`,
        score(text) {
            const cleaned = stripFences(text);
            let s = 0;
            if (/\(function\s*\(|=>\s*\{/.test(cleaned) || /try\s*\{/.test(cleaned)) s += 1;
            if (/createObject/i.test(cleaned)) s += 2;
            if (/setRenderMode\s*\(\s*4\s*\)/i.test(cleaned)) s += 1;
            if (/spawnPlayer|PlayerController/i.test(cleaned)) s += 1;
            if (/clearWorld/i.test(cleaned)) s -= 2;
            return Math.max(0, Math.min(5, s));
        },
    },
];

function stripFences(text) {
    let t = String(text || '').trim();
    t = t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const fenced = t.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
    if (fenced) t = fenced[1].trim();
    return t.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
}

function isThinkingModel(name) {
    return /qwen3|gemma4|deepseek-r1|r1-tool|thinking|reason/i.test(String(name || ''));
}

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

async function chat(model, system, user, maxTokens, temperature) {
    const body = {
        model,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        stream: false,
        keep_alive: '3m',
        options: { num_predict: maxTokens, temperature, num_ctx: CTX },
    };
    if (isThinkingModel(model)) body.think = false;
    const t0 = Date.now();
    const data = await httpJson('POST', '/api/chat', body);
    const ms = Date.now() - t0;
    const text = (data.message?.content || '').trim();
    const tps = data.eval_count && data.eval_duration
        ? Math.round((data.eval_count / data.eval_duration) * 1e9 * 10) / 10
        : null;
    return { text, ms, tps };
}

async function main() {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    console.log(`ollama:workflow-stress — v${pkg.version}`);
    console.log(`models: ${MODELS.join(' vs ')} · num_ctx=${CTX}\n`);

    let tags;
    try {
        tags = await httpJson('GET', '/api/tags', null, 5000);
    } catch (e) {
        console.error(`Ollama offline: ${e.message}`);
        process.exit(2);
    }
    const installed = (tags.models || []).map((m) => m.name || m.model);
    const models = MODELS.map((want) => {
        const hit = installed.find((m) => m === want || m.toLowerCase() === want.toLowerCase()
            || m.toLowerCase().startsWith(want.split(':')[0].toLowerCase() + ':'));
        return hit || want;
    }).filter((m, i, a) => a.indexOf(m) === i);

    for (const m of models) {
        if (!installed.some((x) => x.toLowerCase() === m.toLowerCase())) {
            console.error(`Missing model: ${m}. Installed: ${installed.join(', ')}`);
            process.exit(1);
        }
    }

    const totals = Object.fromEntries(models.map((m) => [m, { score: 0, max: 0, ms: 0, n: 0 }]));
    const rows = [];

    for (const wf of WORKFLOWS) {
        console.log(`── ${wf.label} (${wf.id}) ──`);
        for (const model of models) {
            try {
                const { text, ms, tps } = await chat(model, wf.system, wf.user, wf.maxTokens, wf.temperature);
                const cleaned = stripFences(text);
                const score = wf.score(cleaned);
                totals[model].score += score;
                totals[model].max += 5;
                totals[model].ms += ms;
                totals[model].n += 1;
                const preview = cleaned.slice(0, 90).replace(/\n/g, ' ');
                const tpsStr = tps != null ? `${tps} tok/s` : 'n/a';
                console.log(`  ${model.padEnd(18)} ${score}/5  ${String(ms).padStart(6)}ms  ${tpsStr.padStart(10)}  ${preview}`);
                rows.push({ workflow: wf.id, model, score, ms, tps, preview: cleaned.slice(0, 240) });
            } catch (e) {
                console.log(`  ${model.padEnd(18)} ERR  ${e.message}`);
                rows.push({ workflow: wf.id, model, error: e.message });
            }
        }
        console.log('');
    }

    console.log('── Head-to-head ──');
    for (const model of models) {
        const t = totals[model];
        const pct = t.max ? Math.round((100 * t.score) / t.max) : 0;
        const avg = t.n ? Math.round(t.ms / t.n) : 0;
        console.log(`  ${model}: ${pct}% (${t.score}/${t.max}) · avg ${avg}ms`);
    }

    // Winner: quality then speed
    const ranked = models.slice().sort((a, b) => {
        const ta = totals[a];
        const tb = totals[b];
        const pa = ta.max ? ta.score / ta.max : 0;
        const pb = tb.max ? tb.score / tb.max : 0;
        if (pb !== pa) return pb - pa;
        return (ta.ms / (ta.n || 1)) - (tb.ms / (tb.n || 1));
    });
    console.log(`\nWinner (quality then speed): ${ranked[0]}`);
    if (ranked[1]) {
        const fast = models.slice().sort((a, b) => (totals[a].ms / (totals[a].n || 1)) - (totals[b].ms / (totals[b].n || 1)))[0];
        if (fast !== ranked[0]) console.log(`Fastest average: ${fast}`);
    }

    const outDir = path.join(ROOT, 'dist-store');
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, 'ollama-workflow-stress.json');
    fs.writeFileSync(out, JSON.stringify({
        format: 'threshold-ollama-workflow-stress',
        version: 1,
        ranAt: new Date().toISOString(),
        models,
        totals,
        winner: ranked[0],
        rows,
    }, null, 2));
    console.log(`\nWrote ${path.relative(ROOT, out)}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
