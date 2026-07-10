#!/usr/bin/env node
/**
 * Threshold Ollama stack for Agent Portal:
 *  1) Ensure ollama is reachable on :11434 (start with OLLAMA_ORIGINS if needed)
 *  2) Run local CORS/PNA proxy on :11435 (required for GitHub Pages → localhost)
 *
 * Usage: npm run ollama:serve
 */
const { spawn, spawnSync } = require('child_process');
const http = require('http');
const path = require('path');

const origins = [
    'https://medicinalsheep.github.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    '*',
].join(',');

const env = { ...process.env, OLLAMA_ORIGINS: origins };
const children = [];

function ollamaUp(timeoutMs = 1500) {
    return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
            res.resume();
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            resolve(false);
        });
    });
}

function start(cmd, args, opts = {}) {
    const child = spawn(cmd, args, {
        env: opts.env || env,
        stdio: opts.stdio || 'inherit',
        shell: process.platform === 'win32',
        ...opts,
    });
    children.push(child);
    child.on('exit', (code, signal) => {
        if (opts.exitOnClose) {
            shutdown(code ?? (signal ? 1 : 0));
        }
    });
    return child;
}

function shutdown(code = 0) {
    for (const c of children) {
        try { c.kill(); } catch { /* ignore */ }
    }
    process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
    console.log('Threshold Ollama — Agent Portal connectivity\n');
    console.log('OLLAMA_ORIGINS=', origins);

    const up = await ollamaUp();
    if (up) {
        console.log('✓ Ollama already running on :11434');
    } else {
        console.log('Starting ollama serve with Threshold CORS origins…');
        // Don't exit when ollama exits if user already had issues — still run proxy
        start('ollama', ['serve'], { env, exitOnClose: false });
        // Wait for ready
        let ready = false;
        for (let i = 0; i < 20; i++) {
            await new Promise((r) => setTimeout(r, 500));
            ready = await ollamaUp();
            if (ready) break;
        }
        if (!ready) {
            console.warn('⚠ Ollama not responding yet on :11434 — is it installed? https://ollama.com');
            console.warn('  Keep this process running; proxy will return 502 until Ollama is up.');
        } else {
            console.log('✓ Ollama ready on :11434');
        }
    }

    const proxyScript = path.join(__dirname, 'ollama-cors-proxy.cjs');
    console.log('\nStarting CORS/PNA proxy on :11435 (needed for GitHub Pages)…');
    start(process.execPath, [proxyScript], { env, exitOnClose: true, shell: false });

    console.log(`
────────────────────────────────────────
Agent Portal:
  • GitHub Pages → uses http://127.0.0.1:11435 (this proxy)
  • Local vite  → uses /ollama same-origin proxy

Keep this terminal open. Then RE-SCAN in the portal.
────────────────────────────────────────
`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
