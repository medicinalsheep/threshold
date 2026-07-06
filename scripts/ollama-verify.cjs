#!/usr/bin/env node
/** Sprint X — Ollama local agent smoke (optional; passes if offline with warning) */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
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

function postGenerate(model, prompt, timeoutMs = 90000) {
    return new Promise((resolve, reject) => {
        const url = new URL('/api/generate', BASE);
        const payload = JSON.stringify({
            model,
            prompt,
            stream: false,
            options: { num_predict: 32 },
        });
        const req = http.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
            timeout: timeoutMs,
        }, (res) => {
            let body = '';
            res.on('data', (c) => { body += c; });
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 120)}`));
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

    const pick = models.includes(MODEL) ? MODEL : models[0];
    if (!pick) {
        fail('No models pulled — run: ollama pull llama3.2:3b');
        process.exit(1);
    }

    const t0 = Date.now();
    try {
        const data = await postGenerate(pick, 'Reply with exactly: THRESHOLD_OK');
        const text = (data.response || '').trim();
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