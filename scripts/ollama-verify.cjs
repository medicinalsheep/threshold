#!/usr/bin/env node
/** Sprint X — Ollama local agent smoke (optional; passes if offline with warning) */
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
const MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
let failed = 0;

function ok(msg) {
    console.log(`  ✓ ${msg}`);
}

function warn(msg) {
    console.log(`  ⚠ ${msg}`);
}

function fail(msg) {
    console.error(`  ✗ ${msg}`);
    failed += 1;
}

function getJson(urlPath, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE);
        const req = http.get(url, { timeout: timeoutMs }, (res) => {
            let body = '';
            res.on('data', (c) => { body += c; });
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('timeout'));
        });
    });
}

function isThinkingModel(name) {
    return /qwen3|gemma4|deepseek-r1|r1-tool|thinking|reason/i.test(String(name || ''));
}

function pickSmokeModel(models, preferred) {
    const lower = (s) => String(s || '').toLowerCase();
    const pref = lower(preferred);
    const exact = models.find((m) => lower(m) === pref);
    if (exact) return exact;
    const base = pref.split(':')[0];
    const tag = models.find((m) => lower(m).startsWith(`${base}:`));
    if (tag) return tag;
    // Prefer non-reasoning tags for smoke (qwen3 may empty with tiny num_predict)
    const plain = models.find((m) => !isThinkingModel(m));
    return plain || models[0];
}

function postGenerate(model, prompt, timeoutMs = 90000) {
    return new Promise((resolve, reject) => {
        const url = new URL('/api/generate', BASE);
        const body = {
            model,
            prompt,
            stream: false,
            options: { num_predict: 48, num_ctx: 2048 },
        };
        if (isThinkingModel(model)) body.think = false;
        const payload = JSON.stringify(body);
        const req = http.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
            timeout: timeoutMs,
        }, (res) => {
            let bodyText = '';
            res.on('data', (c) => { bodyText += c; });
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`HTTP ${res.statusCode}: ${bodyText.slice(0, 120)}`));
                    return;
                }
                try {
                    resolve(JSON.parse(bodyText));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('generate timeout'));
        });
        req.write(payload);
        req.end();
    });
}

async function main() {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    console.log(`ollama:verify — v${pkg.version} local LLM smoke\n`);

    const clientPath = path.join(ROOT, 'src/shared/ollamaClient.js');
    if (fs.existsSync(clientPath)) {
        ok('src/shared/ollamaClient.js present');
    } else {
        fail('ollamaClient.js missing');
    }

    const devPath = path.join(ROOT, 'src/ollama/devAgent.js');
    if (fs.existsSync(devPath)) {
        ok('src/ollama/devAgent.js present');
    } else {
        fail('ollama devAgent missing');
    }

    let tags;
    try {
        tags = await getJson('/api/tags', 4000);
    } catch (e) {
        warn(`Ollama offline at ${BASE} (${e.message}) — skip generate smoke`);
        console.log('\nollama:verify — WARN (offline, files OK)');
        process.exit(0);
    }

    const models = (tags.models || []).map((m) => m.name || m.model).filter(Boolean);
    ok(`Ollama reachable — ${models.length} model(s)`);

    const pick = pickSmokeModel(models, MODEL);
    if (!pick) {
        fail('No models pulled — run: ollama pull llama3.2:3b');
        process.exit(1);
    }

    const t0 = Date.now();
    try {
        const data = await postGenerate(pick, 'Reply with exactly: THRESHOLD_OK');
        let text = (data.response || '').trim();
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        if (text.length < 2) {
            fail(`Empty response from ${pick}`);
        } else {
            ok(`Generate ${pick} (${((Date.now() - t0) / 1000).toFixed(1)}s) — ${text.slice(0, 40)}`);
        }
    } catch (e) {
        warn(`Generate failed: ${e.message} — tags probe passed; retry when model is loaded`);
    }

    console.log(failed ? '\nollama:verify — FAIL' : '\nollama:verify — PASS');
    process.exit(failed ? 1 : 0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});