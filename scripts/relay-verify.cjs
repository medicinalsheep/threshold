#!/usr/bin/env node
/**
 * Smoke-test relay/ health endpoint (starts server, curls /health, stops).
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const RELAY = path.join(ROOT, 'relay');
const PORT = 19001;

function waitHealth(ms = 8000) {
    const deadline = Date.now() + ms;
    return new Promise((resolve, reject) => {
        const tick = () => {
            const req = http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
                let body = '';
                res.on('data', (c) => { body += c; });
                res.on('end', () => {
                    try {
                        const j = JSON.parse(body);
                        if (j.ok && j.service === 'threshold-relay') resolve(j);
                        else reject(new Error(`bad health: ${body}`));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', () => {
                if (Date.now() > deadline) reject(new Error('health timeout'));
                else setTimeout(tick, 200);
            });
        };
        tick();
    });
}

async function main() {
    const serverJs = path.join(RELAY, 'server.js');
    const pkg = path.join(RELAY, 'package.json');
    if (!fs.existsSync(serverJs)) {
        console.error('[relay-verify] missing relay/server.js');
        process.exit(1);
    }
    if (!fs.existsSync(path.join(RELAY, 'node_modules'))) {
        console.log('[relay-verify] npm install in relay/ …');
        await new Promise((res, rej) => {
            const npm = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install'], {
                cwd: RELAY,
                stdio: 'inherit',
                shell: true,
            });
            npm.on('exit', (code) => (code === 0 ? res() : rej(new Error('npm install failed'))));
        });
    }

    const child = spawn(process.execPath, [serverJs], {
        cwd: RELAY,
        env: { ...process.env, PORT: String(PORT) },
        stdio: 'pipe',
    });

    try {
        const health = await waitHealth();
        console.log(`PASS relay-verify — ${health.service} on :${PORT}`);
        process.exit(0);
    } catch (e) {
        console.error(`[relay-verify] FAILED: ${e.message}`);
        process.exit(1);
    } finally {
        child.kill('SIGTERM');
    }
}

main();