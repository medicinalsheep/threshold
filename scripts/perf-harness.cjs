#!/usr/bin/env node
/**
 * Headless perf harness — Puppeteer + vite preview + PerfHarness.runScenario
 *
 * Usage:
 *   npm run perf:harness
 *   npm run perf:harness -- --cubes 200 --seconds 4 --tier compatibility
 *   npm run perf:harness -- --compare   # Neg LOD on vs force-off
 *
 * Writes: dist-store/perf-<stamp>.json
 * Requires: puppeteer (devDependency), built dist-pages (or --build)
 *
 * @see docs/PERF_NEXT.md
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-pages');
const OUT_DIR = path.join(ROOT, 'dist-store');

function parseArgs(argv) {
    const out = {
        cubes: 200,
        seconds: 5,
        warm: 1,
        tier: 'compatibility',
        port: 4177,
        build: false,
        compare: false,
        base: process.env.PERF_BASE || '/',
        url: process.env.PERF_URL || '',
        headless: true,
    };
    for (let i = 0; i < argv.length; i += 1) {
        const a = argv[i];
        const n = argv[i + 1];
        if (a === '--cubes' && n) { out.cubes = parseInt(n, 10); i += 1; }
        else if (a === '--seconds' && n) { out.seconds = parseFloat(n); i += 1; }
        else if (a === '--warm' && n) { out.warm = parseFloat(n); i += 1; }
        else if (a === '--tier' && n) { out.tier = n; i += 1; }
        else if (a === '--port' && n) { out.port = parseInt(n, 10); i += 1; }
        else if (a === '--base' && n) { out.base = n; i += 1; }
        else if (a === '--url' && n) { out.url = n; i += 1; }
        else if (a === '--build') out.build = true;
        else if (a === '--compare') out.compare = true;
        else if (a === '--headed') out.headless = false;
    }
    if (!out.base.endsWith('/')) out.base += '/';
    // Effective measure window always includes warm time
    if (out.seconds < out.warm + 2) out.seconds = out.warm + 3;
    return out;
}

function log(...a) { console.log('[perf-harness]', ...a); }
function fail(msg) {
    console.error('[perf-harness] FAIL', msg);
    process.exit(1);
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
            if (Date.now() - start > timeoutMs) reject(new Error(`timeout waiting for ${url}`));
            else setTimeout(tryOnce, 400);
        };
        tryOnce();
    });
}

function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            cwd: ROOT,
            stdio: opts.silent ? 'ignore' : 'inherit',
            shell: process.platform === 'win32',
            env: { ...process.env, ...opts.env },
        });
        child.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
        });
        child.on('error', reject);
    });
}

async function ensureBuild(args) {
    const index = path.join(DIST, 'index.html');
    if (!args.build && fs.existsSync(index)) {
        log('using existing dist-pages');
        return;
    }
    log('building pages (base=/)…');
    await run('npx', ['vite', 'build', '--mode', 'pages'], {
        env: { VITE_BASE_PATH: args.base === '/' ? '/' : args.base },
    });
}

function startPreview(port) {
    log(`vite preview :${port}`);
    const child = spawn(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['vite', 'preview', '--outDir', 'dist-pages', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
        {
            cwd: ROOT,
            stdio: 'pipe',
            shell: process.platform === 'win32',
            env: { ...process.env },
        },
    );
    child.stdout?.on('data', (d) => {
        if (process.env.PERF_VERBOSE) process.stdout.write(d);
    });
    child.stderr?.on('data', (d) => {
        if (process.env.PERF_VERBOSE) process.stderr.write(d);
    });
    return child;
}

async function loadPuppeteer() {
    try {
        // eslint-disable-next-line import/no-extraneous-dependencies
        return require('puppeteer');
    } catch {
        fail('puppeteer not installed — run: npm i -D puppeteer');
    }
}

async function enterEngine(page) {
    await page.waitForSelector('#lobby-solo', { timeout: 30000 });
    // Creator surface so tools/World work
    await page.evaluate(() => {
        window.SurfaceProfile?.set?.('creator');
        window.ViewPrefs?.set?.('graphicsTierPrompted', true);
        window.ViewPrefs?.set?.('graphicsTier', 'compatibility');
    });
    await page.click('#lobby-solo');
    await page.waitForFunction(
        () => !!(window.Engine?.renderer && window.World?.createObject && window.PerfHarness?.runScenario),
        { timeout: 45000 },
    );
    // dismiss portal if open
    await page.evaluate(() => {
        window.AgentPortal?.hide?.();
        document.getElementById('agent-portal-modal')?.classList.remove('open');
        document.body.classList.remove('agent-portal-open');
    });
    // warm
    await new Promise((r) => setTimeout(r, 800));
}

async function runOne(page, scenario) {
    return page.evaluate(async (opts) => {
        const result = await window.PerfHarness.runScenario(opts);
        return result;
    }, scenario);
}

function writeReport(payload) {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(OUT_DIR, `perf-${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    const latest = path.join(OUT_DIR, 'perf-latest.json');
    fs.writeFileSync(latest, JSON.stringify(payload, null, 2));
    log('wrote', path.relative(ROOT, file));
    log('wrote', path.relative(ROOT, latest));
    return file;
}

function summarize(result) {
    if (!result) return 'no result';
    const neg = result.end?.negativeLod || {};
    const vis = result.end?.visibility || {};
    return [
        `${result.label}`,
        `fps avg ${result.fpsAvg} · 1%low ${result.fps1pctLow}`,
        `p50 ${result.frameMs?.p50} · p95 ${result.frameMs?.p95} · p99 ${result.frameMs?.p99} ms`,
        `objs ${result.end?.scene?.objects} · draw ${result.end?.scene?.draws}`,
        `neg flat ${neg.flat}/${neg.registered} · vis A${vis.A}/C${vis.C}/E${vis.E} mode=${vis.spatialMode}`,
    ].join(' | ');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    let preview = null;
    let browser = null;

    try {
        if (!args.url) {
            await ensureBuild(args);
            preview = startPreview(args.port);
            const origin = `http://127.0.0.1:${args.port}`;
            const basePath = args.base === '/' ? '/' : args.base;
            const home = origin + (basePath === '/' ? '/' : basePath);
            log('waiting', home);
            await waitHttp(home);
            args.url = home;
        }

        const puppeteer = await loadPuppeteer();
        browser = await puppeteer.launch({
            headless: args.headless ? 'new' : false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--use-gl=angle',
                '--enable-webgl',
                '--ignore-gpu-blocklist',
            ],
        });
        const page = await browser.newPage();
        page.setDefaultTimeout(60000);
        await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

        log('goto', args.url);
        await page.goto(args.url, { waitUntil: 'networkidle2', timeout: 60000 });
        await enterEngine(page);

        const durationMs = Math.round(args.seconds * 1000);
        const warmMs = Math.round(args.warm * 1000);
        const baseScenario = {
            cubes: args.cubes,
            tier: args.tier,
            durationMs,
            warmMs,
            orbit: true,
            clearProps: true,
        };

        const results = [];
        if (args.compare) {
            log('scenario Neg LOD ON…');
            const on = await runOne(page, {
                ...baseScenario,
                negLod: true,
                label: `cubes${args.cubes}_neg_on_${args.tier}`,
            });
            results.push(on);
            log(summarize(on));

            log('scenario Neg LOD OFF…');
            const off = await runOne(page, {
                ...baseScenario,
                negLod: false,
                label: `cubes${args.cubes}_neg_off_${args.tier}`,
            });
            results.push(off);
            log(summarize(off));

            const p95on = on.frameMs?.p95 || 0;
            const p95off = off.frameMs?.p95 || 0;
            const deltaP95 = p95off - p95on;
            const pct = p95off > 0 ? ((deltaP95 / p95off) * 100) : 0;
            log(`compare p95: on ${p95on}ms · off ${p95off}ms · Δ ${deltaP95.toFixed(2)}ms (${pct.toFixed(1)}% lower with Neg LOD when positive)`);
            log(`compare fps:  on ${on.fpsAvg} · off ${off.fpsAvg}`);
        } else {
            log('scenario…');
            const one = await runOne(page, {
                ...baseScenario,
                negLod: true,
                label: `cubes${args.cubes}_neg_${args.tier}`,
            });
            results.push(one);
            log(summarize(one));
        }

        const payload = {
            format: 'threshold-perf-harness',
            version: 2,
            generatedAt: new Date().toISOString(),
            args: {
                cubes: args.cubes,
                seconds: args.seconds,
                warm: args.warm,
                tier: args.tier,
                compare: args.compare,
                url: args.url,
            },
            results,
            ua: await page.evaluate(() => navigator.userAgent),
        };
        writeReport(payload);

        // Soft gate: measure must return enough post-warm frames
        const ok = results.every((r) => r && r.frames > 30 && r.frameMs?.p95 > 0);
        if (!ok) fail('invalid measure results (too few frames — try --seconds 5)');
        log('OK');
    } finally {
        try { await browser?.close?.(); } catch { /* ignore */ }
        if (preview) {
            try { preview.kill(); } catch { /* ignore */ }
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
