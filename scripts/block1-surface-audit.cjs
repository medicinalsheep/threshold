#!/usr/bin/env node
/**
 * Block 1 surface audit — S1–S5 via Puppeteer (+ static gates).
 * Usage: node scripts/block1-surface-audit.cjs
 * Optional: --port 4178 --url http://127.0.0.1:5173/  (skip local server)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-pages');

function parseArgs() {
    const out = { port: 4178, url: '', headless: true };
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--port' && argv[i + 1]) { out.port = parseInt(argv[++i], 10); }
        else if (argv[i] === '--url' && argv[i + 1]) { out.url = argv[++i]; }
        else if (argv[i] === '--headed') out.headless = false;
    }
    return out;
}

function waitHttp(url, timeoutMs = 90000) {
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

function staticChecks() {
    const results = [];
    const push = (id, ok, notes) => results.push({ id, ok, notes });
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'src/css/surface.css'), 'utf8');
    const mod = fs.readFileSync(path.join(ROOT, 'src/shared/surfaceProfile.js'), 'utf8');
    const ollama = fs.readFileSync(path.join(ROOT, 'src/shared/ollamaClient.js'), 'utf8');

    push('S4-static', mod.includes('cycle()') && html.includes('surface-profile-badge'), 'badge + cycle()');
    push('S5-static',
        html.includes('data-surface-set="player"')
        && html.includes('data-surface-set="creator"')
        && html.includes('setup-surface-hint')
        && mod.includes('setup-surface-hint'),
        'lobby + SETUP chips/hints');
    push('S1-css', css.includes('body.surface-player') && css.includes('[data-surface="creator"]'), 'player hides creator');
    push('S9-gate', mod.includes('allowsOllamaProbe') && ollama.includes('allowsOllamaProbe'), 'ollama gated');
    return results;
}

async function browserChecks(baseUrl, headless) {
    const puppeteer = require('puppeteer');
    const results = [];
    const push = (id, ok, notes) => results.push({ id, ok, notes });

    const browser = await puppeteer.launch({
        headless: headless ? 'new' : false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        // S2 creator URL
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(`${baseUrl}?surface=creator`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForFunction(() => window.SurfaceProfile?.get?.(), { timeout: 20000 }).catch(() => {});
            const st = await page.evaluate(() => ({
                profile: window.SurfaceProfile?.get?.() || document.body.dataset.surface,
                body: document.body.className,
                dataset: document.body.dataset.surface,
                badge: document.getElementById('surface-profile-badge')?.textContent?.trim(),
                allowsOllama: window.SurfaceProfile?.allowsOllamaProbe?.(),
            }));
            const ok = st.profile === 'creator' && /surface-creator/.test(st.body) && st.allowsOllama === true;
            push('S2', ok, JSON.stringify(st));
            await page.close();
        }

        // S3 full URL
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(`${baseUrl}?surface=full`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForFunction(() => window.SurfaceProfile?.get?.(), { timeout: 20000 }).catch(() => {});
            const st = await page.evaluate(() => ({
                profile: window.SurfaceProfile?.get?.() || document.body.dataset.surface,
                body: document.body.className,
                badge: document.getElementById('surface-profile-badge')?.textContent?.trim(),
            }));
            const ok = st.profile === 'full' && /surface-full/.test(st.body);
            push('S3', ok, JSON.stringify(st));
            await page.close();
        }

        // S1 player URL + mobile UA default path
        {
            const page = await browser.newPage();
            await page.setUserAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            );
            await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
            await page.goto(`${baseUrl}?surface=player`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForFunction(() => window.SurfaceProfile?.get?.(), { timeout: 20000 }).catch(() => {});
            const st = await page.evaluate(() => {
                const creatorEl = document.querySelector('[data-surface="creator"]');
                const style = creatorEl ? getComputedStyle(creatorEl) : null;
                return {
                    profile: window.SurfaceProfile?.get?.() || document.body.dataset.surface,
                    body: document.body.className,
                    allowsOllama: window.SurfaceProfile?.allowsOllamaProbe?.(),
                    allowsDev: window.SurfaceProfile?.allowsDevChrome?.(),
                    badge: document.getElementById('surface-profile-badge')?.textContent?.trim(),
                    lobbyHint: document.getElementById('surface-profile-hint')?.textContent || '',
                    creatorDisplay: style?.display || 'n/a',
                };
            });
            const ok = st.profile === 'player'
                && /surface-player/.test(st.body)
                && st.allowsOllama === false
                && st.allowsDev === false
                && st.badge === 'PLAY';
            push('S1', ok, JSON.stringify(st));
            await page.close();
        }

        // S4 badge cycle (start creator, click badge twice → full then player or cycle order)
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(`${baseUrl}?surface=player`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForFunction(() => window.SurfaceProfile?.get?.() === 'player', { timeout: 20000 }).catch(() => {});
            // Clear query lock by cycling via API (badge set() clears _fromQuery)
            const sequence = await page.evaluate(async () => {
                const out = [];
                out.push(window.SurfaceProfile.get());
                // force cycle without query lock
                window.SurfaceProfile._fromQuery = false;
                window.SurfaceProfile.cycle();
                out.push(window.SurfaceProfile.get());
                window.SurfaceProfile.cycle();
                out.push(window.SurfaceProfile.get());
                window.SurfaceProfile.cycle();
                out.push(window.SurfaceProfile.get());
                const badge = document.getElementById('surface-profile-badge');
                badge?.click();
                out.push(window.SurfaceProfile.get());
                return {
                    out,
                    body: document.body.dataset.surface,
                    setupHint: document.getElementById('setup-surface-hint')?.textContent || '',
                    lobbyHint: document.getElementById('surface-profile-hint')?.textContent || '',
                };
            });
            const expectedStart = sequence.out[0] === 'player'
                && sequence.out[1] === 'creator'
                && sequence.out[2] === 'full'
                && sequence.out[3] === 'player';
            const ok = expectedStart && sequence.lobbyHint.includes('Play surface');
            push('S4', ok, JSON.stringify(sequence));
            await page.close();
        }

        // S5 chips set profile + hints
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(`${baseUrl}?surface=player`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForFunction(() => window.SurfaceProfile?.get?.(), { timeout: 20000 }).catch(() => {});
            const st = await page.evaluate(() => {
                window.SurfaceProfile._fromQuery = false;
                const creatorBtn = document.querySelector('[data-surface-set="creator"]');
                creatorBtn?.click();
                return {
                    profile: window.SurfaceProfile.get(),
                    lobbyHint: document.getElementById('surface-profile-hint')?.textContent || '',
                    setupHint: document.getElementById('setup-surface-hint')?.textContent || '',
                    activeCreator: document.querySelector('[data-surface-set="creator"]')?.classList.contains('active'),
                    allowsOllama: window.SurfaceProfile.allowsOllamaProbe(),
                };
            });
            const ok = st.profile === 'creator'
                && st.allowsOllama === true
                && /Creator tools/i.test(st.lobbyHint)
                && (st.setupHint.includes('Creator') || st.setupHint.includes('creator') || st.setupHint === st.lobbyHint);
            push('S5', ok, JSON.stringify(st));
            await page.close();
        }
    } finally {
        await browser.close();
    }
    return results;
}

async function main() {
    const args = parseArgs();
    console.log('block1-surface-audit\n');

    const staticR = staticChecks();
    for (const r of staticR) {
        console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${r.notes}`);
    }

    let server = null;
    let baseUrl = args.url;
    try {
        if (!baseUrl) {
            if (!fs.existsSync(path.join(DIST, 'index.html'))) {
                console.log('\n  Building dist-pages (vite)…');
                const build = spawn(
                    process.platform === 'win32' ? 'node' : 'node',
                    [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'pages'],
                    { cwd: ROOT, stdio: 'inherit', shell: true },
                );
                await new Promise((res, rej) => {
                    build.on('exit', (c) => (c === 0 ? res() : rej(new Error('vite build failed'))));
                });
            }
            const handler = (req, res) => {
                let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
                if (urlPath === '/') urlPath = '/index.html';
                const file = path.join(DIST, urlPath.replace(/^\//, ''));
                if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
                    // SPA fallback for base paths
                    const index = path.join(DIST, 'index.html');
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(fs.readFileSync(index));
                    return;
                }
                const ext = path.extname(file);
                const types = {
                    '.html': 'text/html',
                    '.js': 'text/javascript',
                    '.css': 'text/css',
                    '.json': 'application/json',
                    '.png': 'image/png',
                    '.svg': 'image/svg+xml',
                    '.woff2': 'font/woff2',
                };
                res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
                res.end(fs.readFileSync(file));
            };
            server = http.createServer(handler);
            await new Promise((res) => server.listen(args.port, '127.0.0.1', res));
            // vite pages base is often /threshold/
            const pkgBase = (() => {
                try {
                    const idx = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
                    const m = idx.match(/<base href="([^"]+)"/i) || idx.match(/src="(\/[^"]*?)assets\//);
                    if (m && m[1].includes('threshold')) return '/threshold/';
                } catch { /* */ }
                // Check for absolute asset paths under /threshold/
                try {
                    const idx = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
                    if (idx.includes('/threshold/assets/')) return '/threshold/';
                } catch { /* */ }
                return '/';
            })();
            baseUrl = `http://127.0.0.1:${args.port}${pkgBase === '/' ? '/' : pkgBase}`;
            // serve under /threshold/ by rewriting
            if (pkgBase === '/threshold/') {
                server.close();
                server = http.createServer((req, res) => {
                    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
                    if (urlPath.startsWith('/threshold')) urlPath = urlPath.slice('/threshold'.length) || '/';
                    if (urlPath === '/') urlPath = '/index.html';
                    const file = path.join(DIST, urlPath.replace(/^\//, ''));
                    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(fs.readFileSync(path.join(DIST, 'index.html')));
                        return;
                    }
                    const ext = path.extname(file);
                    const types = {
                        '.html': 'text/html',
                        '.js': 'text/javascript',
                        '.css': 'text/css',
                        '.json': 'application/json',
                        '.png': 'image/png',
                        '.svg': 'image/svg+xml',
                        '.woff2': 'font/woff2',
                        '.webp': 'image/webp',
                    };
                    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
                    res.end(fs.readFileSync(file));
                });
                await new Promise((res) => server.listen(args.port, '127.0.0.1', res));
                baseUrl = `http://127.0.0.1:${args.port}/threshold/`;
            }
            await waitHttp(baseUrl);
            console.log(`  server ${baseUrl}`);
        }

        console.log('\n  Browser checks…');
        const br = await browserChecks(baseUrl, args.headless);
        for (const r of br) {
            console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${r.notes.slice(0, 180)}`);
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
            fail: failed.length,
        };
        fs.writeFileSync(path.join(outDir, 'block1-surface-audit.json'), JSON.stringify(report, null, 2));
        console.log(`\n  Score ${report.pass}/${all.length}  → dist-store/block1-surface-audit.json`);
        if (failed.length) {
            console.error('block1-surface-audit — FAIL');
            process.exit(1);
        }
        console.log('block1-surface-audit — PASS');
    } finally {
        if (server) server.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
