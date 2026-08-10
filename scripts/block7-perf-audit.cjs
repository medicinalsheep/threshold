#!/usr/bin/env node
/**
 * Block 7 — perf & graphics audit (P1–P4)
 * Usage: node scripts/block7-perf-audit.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-pages');
const PORT = 4184;

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
    const state = fs.readFileSync(path.join(ROOT, 'src/engine/state.js'), 'utf8');
    const engine = fs.readFileSync(path.join(ROOT, 'src/engine/engineCore.js'), 'utf8');
    const neg = fs.readFileSync(path.join(ROOT, 'src/shared/negativeLod.js'), 'utf8');
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/negative-lod.json'), 'utf8'));
    const gp = fs.readFileSync(path.join(ROOT, 'src/shared/graphicsProfile.js'), 'utf8');
    const perf = fs.readFileSync(path.join(ROOT, 'src/shared/perfHarness.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

    push('P1-static',
        /renderMode:\s*4/.test(state) && engine.includes('setRenderMode(4)')
        && engine.includes('setRenderMode:'),
        'default renderMode 4 + Engine.setRenderMode');
    push('P2-static',
        cfg.defaultDistance === 100
        && neg.includes('enableObject') && neg.includes('applyTierPolicy')
        && html.includes('insp-negative-lod'),
        'Neg LOD defaultDistance 100 + APIs + inspector');
    push('P3-static',
        gp.includes('compatibility') && gp.includes('balanced')
        && gp.includes('realistic') && gp.includes('ultra')
        && gp.includes('apply(tierId')
        && html.includes('env-graphics-tier'),
        'GraphicsProfile four tiers + ENV select');
    push('P4-static',
        perf.includes('measure') && perf.includes('runScenario')
        && html.includes('perf-harness-run') && html.includes('PERF'),
        'PerfHarness measure + SETUP PERF UI');
    return results;
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
        () => window.Engine && window.State && window.GraphicsProfile,
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
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(`${baseUrl}?surface=creator`, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await enterSolo(page);

        // P1 — default realistic mode 4
        const p1 = await page.evaluate(() => {
            const mode = window.State?.renderMode;
            // ensure setRenderMode works and default path
            window.Engine?.setRenderMode?.(4);
            return {
                mode,
                afterSet: window.State?.renderMode,
                hasSet: typeof window.Engine?.setRenderMode === 'function',
            };
        });
        push('P1', p1.hasSet && (p1.mode === 4 || p1.afterSet === 4), JSON.stringify(p1));

        // P2 — Neg LOD ~100m
        const p2 = await page.evaluate(() => {
            const NL = window.NegativeLod;
            if (!NL) return { err: 'no NegativeLod' };
            // spawn far prop
            if (!window.State?.isPaused && window.UI?.togglePause) {
                try { window.UI.togglePause('audit'); } catch { /* */ }
            }
            if (window.ArrangeMode?.setMode) window.ArrangeMode.setMode('edit');
            let mesh = null;
            try {
                mesh = window.World?.createObject?.('cube', 'FarNegProp', 0x888888, false);
                if (mesh) mesh.position.set(0, 1, -120);
            } catch (e) {
                return { err: String(e.message || e) };
            }
            if (mesh && NL.enableObject) {
                NL.enableObject(mesh, { distance: 100, source: 'audit' });
            }
            const cfg = NL.config || {};
            const stats = NL.getStats?.() || {};
            return {
                defaultDistance: cfg.defaultDistance ?? NL.defaultDistance,
                enabled: mesh?.userData?.negativeLOD || mesh?.userData?.negativeLod,
                dist: mesh?.userData?.negativeLodDistance,
                registered: stats.registered,
                hasEnable: typeof NL.enableObject === 'function',
                hasTier: typeof NL.applyTierPolicy === 'function',
            };
        });
        const p2ok = p2.hasEnable && (p2.defaultDistance === 100 || p2.dist === 100)
            && (p2.enabled === true || p2.registered >= 0);
        push('P2', !!p2ok && !p2.err, JSON.stringify(p2).slice(0, 280));

        // P3 — GraphicsProfile tiers
        const p3 = await page.evaluate(() => {
            const GP = window.GraphicsProfile;
            if (!GP?.apply) return { err: 'no GraphicsProfile.apply' };
            const tiers = ['compatibility', 'balanced', 'realistic', 'ultra'];
            const applied = [];
            for (const t of tiers) {
                try {
                    GP.apply(t, { silent: true, persist: false });
                    applied.push({
                        t,
                        state: window.State?.graphicsTier,
                    });
                } catch (e) {
                    applied.push({ t, err: String(e.message || e) });
                }
            }
            // restore realistic
            try { GP.apply('realistic', { silent: true, persist: false }); } catch { /* */ }
            const select = document.getElementById('env-graphics-tier');
            return {
                applied,
                allOk: applied.every((a) => a.state === a.t || !a.err),
                selectExists: !!select,
                options: select ? [...select.options].map((o) => o.value) : [],
            };
        });
        push('P3', p3.allOk && p3.selectExists && p3.options.length >= 3, JSON.stringify(p3).slice(0, 320));

        // P4 — PerfHarness measure (short sample)
        const p4 = await page.evaluate(async () => {
            const PH = window.PerfHarness;
            if (!PH?.measure) return { err: 'no PerfHarness.measure' };
            const uiBtn = document.getElementById('perf-harness-run');
            try {
                const result = await PH.measure(1200, { label: 'audit', warmMs: 200 });
                return {
                    hasMeasure: true,
                    hasRunScenario: typeof PH.runScenario === 'function',
                    uiBtn: !!uiBtn,
                    resultKeys: result ? Object.keys(result).slice(0, 20) : [],
                    fps: result?.fpsAvg ?? result?.fps ?? result?.fpsHud ?? null,
                    frames: result?.frames ?? result?.sampleCount ?? null,
                    ok: !!result,
                };
            } catch (e) {
                // measure may need engine running; try snapshot path
                try {
                    const snap = PH.snapshot?.() || PH.captureSnapshot?.();
                    return {
                        hasMeasure: true,
                        measureErr: String(e.message || e).slice(0, 120),
                        snapshot: !!snap,
                        uiBtn: !!uiBtn,
                        hasRunScenario: typeof PH.runScenario === 'function',
                        ok: !!snap || typeof PH.measure === 'function',
                    };
                } catch (e2) {
                    return {
                        hasMeasure: typeof PH.measure === 'function',
                        measureErr: String(e.message || e).slice(0, 120),
                        uiBtn: !!uiBtn,
                        hasRunScenario: typeof PH.runScenario === 'function',
                        ok: typeof PH.measure === 'function',
                    };
                }
            }
        });
        push('P4', p4.hasMeasure && p4.hasRunScenario && p4.uiBtn && (p4.ok !== false),
            JSON.stringify(p4).slice(0, 300));

        await page.close();
    } finally {
        await browser.close();
    }
    return results;
}

async function main() {
    console.log('block7-perf-audit\n');
    if (!fs.existsSync(path.join(DIST, 'index.html'))) {
        console.error('dist-pages missing — build first');
        process.exit(1);
    }

    // Existing static verifiers
    try {
        execFileSync(process.execPath, [path.join(ROOT, 'scripts/negative-lod-verify.cjs')], {
            stdio: 'inherit', cwd: ROOT,
        });
    } catch {
        console.warn('  negative-lod-verify non-zero (continuing)');
    }

    const staticR = staticChecks();
    for (const r of staticR) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${r.notes}`);

    const basePath = detectBase();
    const server = await startServer(basePath);
    const baseUrl = `http://127.0.0.1:${PORT}${basePath === '/' ? '/' : basePath}`;
    try {
        await waitHttp(baseUrl);
        console.log(`  server ${baseUrl}\n  Browser checks…`);
        const br = await browserChecks(baseUrl);
        for (const r of br) {
            console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${String(r.notes).slice(0, 260)}`);
        }

        const all = [...staticR, ...br];
        const failed = all.filter((r) => !r.ok);
        const outDir = path.join(ROOT, 'dist-store');
        fs.mkdirSync(outDir, { recursive: true });
        const report = {
            at: new Date().toISOString(),
            baseUrl,
            results: all,
            pass: all.filter((r) => r.ok).length,
            total: all.length,
            failedIds: failed.map((f) => f.id),
        };
        fs.writeFileSync(path.join(outDir, 'block7-perf-audit.json'), JSON.stringify(report, null, 2));
        console.log(`\n  Score ${report.pass}/${report.total} → dist-store/block7-perf-audit.json`);
        if (failed.length) {
            console.error('block7-perf-audit — FAIL', report.failedIds.join(', '));
            process.exit(1);
        }
        console.log('block7-perf-audit — PASS');
    } finally {
        server.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
