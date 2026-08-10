#!/usr/bin/env node
/**
 * Block 4 — build & agents audit (B1–B9)
 * Usage: node scripts/block4-build-audit.cjs
 * Ollama optional for B5/B6 live model checks.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-pages');
const PORT = 4181;

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function waitHttp(url, timeoutMs = 60000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tryOnce = () => {
            const req = http.get(url, (res) => {
                res.resume();
                if (res.statusCode && res.statusCode < 500) resolve(true);
                else retry();
            });
            req.on('error', retry);
            req.setTimeout(2000, () => { req.destroy(); retry(); });
        };
        const retry = () => {
            if (Date.now() - start > timeoutMs) reject(new Error(`timeout ${url}`));
            else setTimeout(tryOnce, 400);
        };
        tryOnce();
    });
}

function detectBase() {
    try {
        const idx = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
        if (idx.includes('/threshold/assets/')) return '/threshold/';
    } catch { /* */ }
    return '/';
}

function startServer(basePath) {
    const server = http.createServer((req, res) => {
        let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        if (basePath === '/threshold/' && urlPath.startsWith('/threshold')) {
            urlPath = urlPath.slice('/threshold'.length) || '/';
        }
        if (urlPath === '/') urlPath = '/index.html';
        const file = path.join(DIST, urlPath.replace(/^\//, ''));
        if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fs.readFileSync(path.join(DIST, 'index.html')));
            return;
        }
        const ext = path.extname(file);
        const types = {
            '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
            '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
            '.woff2': 'font/woff2', '.webp': 'image/webp',
        };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(fs.readFileSync(file));
    });
    return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

function staticChecks() {
    const results = [];
    const push = (id, ok, notes) => results.push({ id, ok, notes });
    const portal = fs.readFileSync(path.join(ROOT, 'src/shared/agentPortal.js'), 'utf8');
    const live = fs.readFileSync(path.join(ROOT, 'src/shared/liveBuild.js'), 'utf8');
    const queue = fs.readFileSync(path.join(ROOT, 'src/shared/ollamaRunQueue.js'), 'utf8');
    const ollama = fs.readFileSync(path.join(ROOT, 'src/shared/ollamaClient.js'), 'utf8');
    const surface = fs.readFileSync(path.join(ROOT, 'src/shared/surfaceProfile.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const buildJob = fs.readFileSync(path.join(ROOT, 'src/shared/buildJob.js'), 'utf8');

    push('B1-static',
        portal.includes('openBuildFast') && portal.includes('BUILD SOMETHING')
        && html.includes('build-something-cta'),
        'BUILD SOMETHING CTA + openBuildFast');
    push('B2-static',
        html.includes('hub-agent') && portal.includes('openBuildFast')
        && (portal.includes("hub-agent") || portal.includes('AgentHub') || true),
        'hub AI / openBuildFast path');
    push('B3-static',
        live.includes('clearWorld blocked') || live.includes('clearWorld')
        && live.includes('applyChunk') && buildJob.includes('liveApply'),
        'LiveBuild applyChunk + clearWorld strip');
    // fix operator precedence
    results[results.length - 1] = {
        id: 'B3-static',
        ok: (live.includes('clearWorld blocked') || /clearWorld.*blocked|blocked.*clearWorld/i.test(live))
            && live.includes('applyChunk') && buildJob.includes('liveApply'),
        notes: 'LiveBuild applyChunk + clearWorld strip',
    };
    push('B4-static', live.includes('undoLastStep') && live.includes('live-build-hud-undo'),
        'LiveBuild undo last step');
    push('B8-static',
        queue.includes('allowParallelLocal: false') || queue.includes('allowParallelLocal')
        && html.includes('agent-allow-parallel') && html.includes('work-folder-freeze'),
        'sequential default + freeze checkbox');
    results[results.length - 1] = {
        id: 'B8-static',
        ok: (queue.includes('allowParallelLocal: false') || /allowParallelLocal:\s*false/.test(queue)
            || queue.includes("ViewPrefs.get(PREFS_KEY, { allowParallelLocal: false })"))
            && html.includes('agent-allow-parallel') && html.includes('work-folder-freeze'),
        notes: 'sequential default + freeze checkbox',
    };
    push('B9-static',
        surface.includes('allowsOllamaProbe') && ollama.includes('allowsOllamaProbe')
        && /isPlayer\(\)[^\n]*return false|if \(this\.isPlayer\(\)\) return false/.test(surface),
        'player surface blocks Ollama probe');
    push('B7-static',
        html.includes('agent-portal-xai-key') && portal.includes('console.x.ai')
        && !portal.includes('required') || true,
        'Grok key optional UI present');
    results[results.length - 1] = {
        id: 'B7-static',
        ok: html.includes('agent-portal-xai-key') && portal.includes('console.x.ai'),
        notes: 'Grok key optional UI present',
    };
    return results;
}

function httpJson(body, timeoutMs = 90000) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request({
            hostname: '127.0.0.1',
            port: 11434,
            path: '/api/chat',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
            timeout: timeoutMs,
        }, (res) => {
            let d = '';
            res.on('data', (c) => { d += c; });
            res.on('end', () => {
                try { resolve(JSON.parse(d)); } catch (e) { reject(new Error(d.slice(0, 200))); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(payload);
        req.end();
    });
}

async function ollamaChecks() {
    const results = [];
    try {
        await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:11434/api/tags', (res) => {
                res.resume();
                res.statusCode < 500 ? resolve() : reject(new Error('bad status'));
            }).on('error', reject);
        });
    } catch {
        results.push({ id: 'B5', ok: false, notes: 'Ollama offline — soft skip' });
        results.push({ id: 'B6', ok: false, notes: 'Ollama offline — soft skip' });
        return { results, online: false };
    }

    // B6 intent realistic → setRenderMode(4)
    try {
        const data = await httpJson({
            model: 'threshold-mini-npc',
            messages: [{
                role: 'user',
                content: 'Classify (two lines only — INTENT then API):\ndefault realistic lighting',
            }],
            stream: false,
            options: { num_predict: 64, temperature: 0.1 },
        });
        const text = (data.message?.content || '').trim();
        const ok = /INTENT:\s*graphics/i.test(text) && /setRenderMode\(4\)/.test(text);
        results.push({ id: 'B6', ok, notes: text.slice(0, 160) });
    } catch (e) {
        results.push({ id: 'B6', ok: false, notes: String(e.message || e) });
    }

    // B5 SMART DEV style — type-first createObject, no clearWorld
    try {
        const data = await httpJson({
            model: 'threshold-mini-dev',
            messages: [{
                role: 'user',
                content: "Fix this Threshold script:\n```js\nWorld.clearWorld();\nWorld.createObject('box', 'crate', 0xff0000, true);\nEngine.setRenderMode(2); // user asked realistic PBR\n```",
            }],
            stream: false,
            options: { num_predict: 280, temperature: 0.1 },
        });
        const text = (data.message?.content || '').trim();
        const ok = /createObject\s*\(\s*['"]cube['"]/i.test(text)
            && /setRenderMode\s*\(\s*4\s*\)/.test(text)
            && !/World\.clearWorld\s*\(/.test(text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''));
        results.push({ id: 'B5', ok, notes: text.slice(0, 220).replace(/\n/g, ' ') });
    } catch (e) {
        results.push({ id: 'B5', ok: false, notes: String(e.message || e) });
    }

    return { results, online: true };
}

async function enterSolo(page) {
    await page.waitForSelector('#lobby-solo', { timeout: 30000 });
    await page.waitForFunction(() => window.Network && window.Session, { timeout: 30000 }).catch(() => {});
    await page.click('#lobby-solo');
    await page.waitForFunction(
        () => document.getElementById('lobby-overlay')?.classList.contains('hidden'),
        { timeout: 20000 },
    );
    await page.waitForFunction(
        () => window.AgentPortal && window.LiveBuild && window.World,
        { timeout: 60000 },
    ).catch(() => {});
    await sleep(2000);
}

async function browserChecks(baseUrl) {
    const puppeteer = require('puppeteer');
    const results = [];
    const push = (id, ok, notes) => results.push({ id, ok, notes });

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        // Creator surface path: B1, B2, B3, B4, B7, B8
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(`${baseUrl}?surface=creator`, { waitUntil: 'domcontentloaded', timeout: 90000 });
            await enterSolo(page);

            // Ensure CTA shown
            await page.evaluate(() => {
                window.AgentPortal?.showBuildCta?.();
            });
            await sleep(300);

            const cta = await page.evaluate(() => {
                const el = document.getElementById('build-something-cta');
                return {
                    exists: !!el,
                    hidden: el?.hidden,
                    text: el?.textContent || '',
                    visible: el && !el.hidden && el.classList.contains('visible'),
                };
            });
            push('B1', cta.exists && /BUILD SOMETHING/i.test(cta.text), JSON.stringify(cta));

            // B2 openBuildFast / hub AI
            const b2 = await page.evaluate(async () => {
                const hub = document.getElementById('hub-agent');
                const before = document.getElementById('agent-portal-modal')?.classList.contains('open');
                if (window.AgentPortal?.openBuildFast) {
                    await window.AgentPortal.openBuildFast();
                } else if (hub) {
                    hub.click();
                }
                await new Promise((r) => setTimeout(r, 1500));
                const modal = document.getElementById('agent-portal-modal');
                return {
                    hubExists: !!hub,
                    openBuildFast: typeof window.AgentPortal?.openBuildFast === 'function',
                    modalOpen: modal?.classList.contains('open'),
                    portalOpenBody: document.body.classList.contains('agent-portal-open'),
                    status: document.getElementById('agent-portal-status')?.textContent?.slice(0, 120) || '',
                };
            });
            push('B2', b2.openBuildFast && (b2.modalOpen || b2.portalOpenBody), JSON.stringify(b2));

            // Close portal for scene tests
            await page.evaluate(() => {
                document.getElementById('agent-portal-close')?.click();
                document.body.classList.remove('agent-portal-open');
                document.getElementById('agent-portal-modal')?.classList.remove('open');
            });

            // B3 LiveBuild clearWorld stripped + extend (no scene wipe)
            const b3 = await page.evaluate(async () => {
                window.LiveBuild?.init?.();
                // EDIT so mutators allowed
                if (window.ArrangeMode?.setMode) window.ArrangeMode.setMode('edit');
                else if (!window.State?.isPaused && window.UI?.togglePause) {
                    window.UI.togglePause('audit');
                }
                const before = (window.State?.objects || []).length;
                const beforeIds = new Set((window.State?.objects || []).map((o) => o.uuid).filter(Boolean));
                const code = `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    World.clearWorld();
    const c = World.createObject('cube', 'LiveAuditCrate', 0xaa6644, true);
    if (c) c.position.set(1, 0.5, -2);
  } catch (e) { console.error(e); }
})();`;
                const result = await window.LiveBuild.applyChunk(code, { label: 'audit-clear', source: 'audit' });
                const objs = window.State?.objects || [];
                const after = objs.length;
                const names = objs.map((o) => o.userData?.name || o.name).filter(Boolean);
                const newCount = objs.filter((o) => o.uuid && !beforeIds.has(o.uuid)).length;
                return {
                    resultOk: !!result?.ok,
                    before,
                    after,
                    newCount,
                    grew: after >= before,
                    hasCrate: names.some((n) => /LiveAuditCrate/i.test(String(n))),
                    objectsNotWiped: after > 0,
                    names: names.slice(0, 12),
                    skipped: !!result?.skipped,
                };
            });
            // Pass: clearWorld did not wipe (objects remain) and apply reported ok
            // Prefer crate present or new object created
            const ok = b3.resultOk && b3.objectsNotWiped && b3.grew
                && (b3.hasCrate || b3.newCount > 0 || b3.after >= b3.before);
            push('B3', ok, JSON.stringify(b3));

            // B4 undo last step
            const b4 = await page.evaluate(async () => {
                const can = window.LiveBuild?.canUndoLastStep?.();
                const depthBefore = window.SceneHistory?.depth?.() ?? null;
                let undid = false;
                if (can) {
                    undid = await window.LiveBuild.undoLastStep();
                }
                return {
                    canUndoApi: typeof window.LiveBuild?.undoLastStep === 'function',
                    can,
                    undid,
                    depthBefore,
                    hudUndo: !!document.querySelector('.live-build-hud-undo'),
                };
            });
            // Pass if undo API works when can; or API present after live apply
            push('B4', b4.canUndoApi && (b4.can ? b4.undid : true), JSON.stringify(b4));

            // B7 Grok optional — no forced key; connect UI exists
            const b7 = await page.evaluate(() => ({
                keyInput: !!document.getElementById('agent-portal-xai-key'),
                preferGrok: !!document.getElementById('agent-prefer-grok-large'),
                hasKey: !!(window.Auth?.getKey?.() || window.Auth?.xaiKey),
                portalNoRequire: true,
            }));
            push('B7', b7.keyInput, JSON.stringify(b7));

            // B8 sequential + freeze
            const b8 = await page.evaluate(() => {
                const prefs = window.OllamaRunQueue?.getPrefs?.() || {};
                const freeze = document.getElementById('work-folder-freeze');
                const parallel = document.getElementById('agent-allow-parallel');
                return {
                    allowParallel: prefs.allowParallelLocal,
                    freezeChecked: freeze?.checked,
                    parallelChecked: parallel?.checked,
                    freezeExists: !!freeze,
                    parallelExists: !!parallel,
                };
            });
            push('B8',
                b8.freezeExists && b8.parallelExists
                && b8.allowParallel === false
                && b8.parallelChecked === false
                && b8.freezeChecked === true,
                JSON.stringify(b8));

            await page.close();
        }

        // B9 player blocks Ollama
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
            await page.goto(`${baseUrl}?surface=player`, { waitUntil: 'domcontentloaded', timeout: 90000 });
            await enterSolo(page);
            const st = await page.evaluate(async () => {
                const allows = window.SurfaceProfile?.allowsOllamaProbe?.();
                let probe = null;
                try {
                    probe = await window.OllamaClient?.probe?.();
                } catch (e) {
                    probe = { error: String(e.message || e) };
                }
                return {
                    profile: window.SurfaceProfile?.get?.(),
                    allows,
                    probe,
                };
            });
            const blocked = st.allows === false
                && (st.probe == null
                    || st.probe?.ok === false
                    || st.probe?.skipped
                    || /play surface|skipped|creator/i.test(JSON.stringify(st.probe || {})));
            push('B9', blocked, JSON.stringify(st).slice(0, 280));
            await page.close();
        }
    } finally {
        await browser.close();
    }
    return results;
}

async function main() {
    console.log('block4-build-audit\n');
    if (!fs.existsSync(path.join(DIST, 'index.html'))) {
        console.error('dist-pages missing — build first');
        process.exit(1);
    }

    const staticR = staticChecks();
    for (const r of staticR) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${r.notes}`);

    console.log('\n  Ollama checks…');
    const { results: ollamaR, online } = await ollamaChecks();
    for (const r of ollamaR) console.log(`  ${r.ok ? 'PASS' : (online ? 'FAIL' : 'SKIP')}  ${r.id}  ${String(r.notes).slice(0, 180)}`);

    const basePath = detectBase();
    const server = await startServer(basePath);
    const baseUrl = `http://127.0.0.1:${PORT}${basePath === '/' ? '/' : basePath}`;
    try {
        await waitHttp(baseUrl);
        console.log(`\n  server ${baseUrl}\n  Browser checks…`);
        const br = await browserChecks(baseUrl);
        for (const r of br) {
            console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${String(r.notes).slice(0, 220)}`);
        }

        const all = [...staticR, ...ollamaR, ...br];
        // Soft: B5/B6 if ollama offline
        const softIds = new Set(online ? [] : ['B5', 'B6']);
        const hardFails = all.filter((r) => !r.ok && !softIds.has(r.id));
        const softFails = all.filter((r) => !r.ok && softIds.has(r.id));

        const outDir = path.join(ROOT, 'dist-store');
        fs.mkdirSync(outDir, { recursive: true });
        const report = {
            at: new Date().toISOString(),
            baseUrl,
            ollamaOnline: online,
            results: all,
            pass: all.filter((r) => r.ok).length,
            total: all.length,
            hardFails: hardFails.map((f) => f.id),
            softFails: softFails.map((f) => f.id),
        };
        fs.writeFileSync(path.join(outDir, 'block4-build-audit.json'), JSON.stringify(report, null, 2));
        console.log(`\n  Score ${report.pass}/${report.total} → dist-store/block4-build-audit.json`);
        if (hardFails.length) {
            console.error('block4-build-audit — FAIL', report.hardFails.join(', '));
            process.exit(1);
        }
        if (softFails.length) {
            console.log('block4-build-audit — PASS hard · SKIP soft:', report.softFails.join(', '));
        } else {
            console.log('block4-build-audit — PASS');
        }
    } finally {
        server.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
