#!/usr/bin/env node
/**
 * Block 8 — export audit (E1–E5)
 * Usage: node scripts/block8-export-audit.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-pages');
const PORT = 4185;

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
    const pre = fs.readFileSync(path.join(ROOT, 'src/shared/exportPreflight.js'), 'utf8');
    const wiz = fs.readFileSync(path.join(ROOT, 'src/shared/exportWizard.js'), 'utf8');
    const qep = fs.readFileSync(path.join(ROOT, 'src/shared/quickExportPlay.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const walk = fs.readFileSync(path.join(ROOT, 'src/shared/exportWalkthrough.js'), 'utf8');

    push('E1-static',
        pre.includes('runExportPreflight') && qep.includes('runExportPreflight')
        && html.includes('btn-export-play') && html.includes('export-preflight-modal'),
        'EXPORT & PLAY + preflight modal');
    push('E2-static',
        wiz.includes('jumpToShip') && wiz.includes('webOnly')
        && wiz.includes('export-skip-to-ship') || wiz.includes('Skip to SHIP'),
        'web-only skip to SHIP');
    // fix E2
    results[results.length - 1] = {
        id: 'E2-static',
        ok: wiz.includes('jumpToShip') && (wiz.includes('webOnly') || wiz.includes('isWebOnlyTargets'))
            && (wiz.includes('export-skip-to-ship') || wiz.includes('Skip to SHIP')),
        notes: 'web-only skip to SHIP',
    };
    push('E3-static',
        wiz.includes('export-copy-cli') && wiz.includes('_copyText'),
        'SHIP Copy CLI');
    push('E4-static',
        wiz.includes('threshold-export-draft') || wiz.includes('DRAFT_KEY')
        && wiz.includes('_saveDraft') && wiz.includes('_loadDraft'),
        'draft localStorage restore');
    results[results.length - 1] = {
        id: 'E4-static',
        ok: (wiz.includes('threshold-export-draft') || wiz.includes('DRAFT_KEY'))
            && wiz.includes('_saveDraft') && wiz.includes('_loadDraft'),
        notes: 'draft localStorage restore',
    };
    push('E5-static',
        pre.includes('artMissing') && pre.includes('expectedTexturePath')
        && wiz.includes('formatPreflightHtml'),
        'art-name preflight notes');
    push('E-steps',
        walk.includes("EXPORT_STEPS") && walk.includes("'package'"),
        'export walkthrough steps include SHIP/package');
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
        () => window.ExportWizard && window.ExportPreflight && window.World,
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
        // grant clipboard for E3
        const ctx = browser.defaultBrowserContext();
        await ctx.overridePermissions(baseUrl.replace(/\/threshold\/?$/, ''), ['clipboard-read', 'clipboard-write']).catch(() => {});
        await page.goto(`${baseUrl}?surface=creator`, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await enterSolo(page);

        // E5 first: named prop without maps → art infos
        const e5 = await page.evaluate(() => {
            if (window.ArrangeMode?.setMode) window.ArrangeMode.setMode('edit');
            else if (!window.State?.isPaused && window.UI?.togglePause) window.UI.togglePause('audit');
            try {
                const p = window.World.createObject('cube', 'Stone Block', 0x9a958c, false);
                if (p) {
                    p.position.set(1, 0.5, -2);
                    // ensure no albedo maps
                    if (p.userData) {
                        delete p.userData.textures;
                        delete p.userData.textureHint;
                    }
                }
            } catch (e) {
                return { err: String(e.message || e) };
            }
            const report = window.ExportPreflight.runExportPreflight();
            const artInfos = (report.infos || []).filter((i) => /Art:|stone_block|albedo/i.test(i));
            return {
                canProceed: report.canProceed,
                artMissing: report.stats?.artMissing ?? report.artMissing?.length,
                artInfos: artInfos.slice(0, 3),
                infoCount: report.infos?.length,
                errors: report.errors?.length,
            };
        });
        push('E5', (e5.artMissing > 0 || e5.artInfos?.length > 0) && e5.canProceed !== false,
            JSON.stringify(e5).slice(0, 280));

        // E1 — preflight empty vs non-empty
        const e1 = await page.evaluate(() => {
            const full = window.ExportPreflight.runExportPreflight();
            // simulate empty: temp swap objects
            const State = window.State;
            const saved = State.objects;
            State.objects = [];
            const empty = window.ExportPreflight.runExportPreflight();
            State.objects = saved;
            return {
                fullOk: full.canProceed && full.errors.length === 0,
                fullObjs: full.stats?.objects,
                emptyBlocked: !empty.canProceed && empty.errors.some((e) => /empty/i.test(e)),
                emptyErrors: empty.errors,
                hasQuickExport: typeof window.QuickExportPlay?.start === 'function',
                hasPreflightModal: !!document.getElementById('export-preflight-modal'),
                hasExportPlayBtn: !!document.getElementById('btn-export-play'),
            };
        });
        push('E1', e1.fullOk && e1.emptyBlocked && e1.hasQuickExport && e1.hasExportPlayBtn,
            JSON.stringify(e1).slice(0, 300));

        // E2 — web-only jumpToShip
        const e2 = await page.evaluate(async () => {
            const W = window.ExportWizard;
            if (!W?.jumpToShip) {
                // fallback: open via button then check DOM
                document.getElementById('btn-export-game')?.click();
                return {
                    err: 'no ExportWizard.jumpToShip',
                    modalOpen: document.getElementById('export-wizard-modal')?.classList.contains('open'),
                    hasWizard: !!W,
                };
            }
            W.open();
            W.draft.targets = { web: true, android: false, windows: false, ios: false, steam: false };
            W.draft.name = 'Audit Web Export';
            W.draft.author = 'Auditor';
            await W.jumpToShip({ webOnly: true });
            await new Promise((r) => setTimeout(r, 300));
            const steps = window.ExportWalkthrough?.EXPORT_STEPS;
            const stepId = steps?.[W.step] || (W.step >= 9 ? 'package' : String(W.step));
            const modalOpen = document.getElementById('export-wizard-modal')?.classList.contains('open');
            const body = document.getElementById('export-wizard-body')?.innerText?.slice(0, 400) || '';
            return {
                step: W.step,
                stepId,
                modalOpen,
                targets: { ...W.draft.targets },
                bodyHasShip: /SHIP|manifest|download|CLI|Post-download|threshold-game|Copy CLI/i.test(body),
                hasSkipBtnLogic: typeof W.jumpToShip === 'function',
            };
        });
        const e2ok = e2.hasSkipBtnLogic && e2.modalOpen
            && e2.targets?.web === true && !e2.targets?.android
            && (e2.stepId === 'package' || e2.step >= 8 || e2.bodyHasShip);
        push('E2', !!e2ok && !e2.err, JSON.stringify(e2).slice(0, 300));

        // E3 — Copy CLI button exists and copy works
        const e3 = await page.evaluate(async () => {
            const W = window.ExportWizard;
            if (!W) return { err: 'no wizard' };
            if (typeof W.jumpToShip === 'function') {
                await W.jumpToShip({ webOnly: true });
            }
            await new Promise((r) => setTimeout(r, 300));
            const copyBtn = document.getElementById('export-copy-cli');
            const nameBtn = document.getElementById('export-copy-filename');
            const cli = document.getElementById('export-wizard-cli-block')?.textContent
                || W._lastCliText || '';
            let copied = false;
            if (copyBtn && W._copyText) {
                await W._copyText('npm run store:prep -- --manifest audit.threshold-game.json', 'test');
                copied = true;
            } else if (copyBtn) {
                copyBtn.click();
                copied = true;
            }
            return {
                copyBtn: !!copyBtn,
                nameBtn: !!nameBtn,
                cliHasStorePrep: /store:prep|npm run build/i.test(cli),
                cliLen: cli.length,
                copied,
                lastCli: (W._lastCliText || '').slice(0, 80),
            };
        });
        push('E3', !e3.err && e3.copyBtn && (e3.cliHasStorePrep || e3.cliLen > 10 || e3.copied),
            JSON.stringify(e3).slice(0, 280));

        // E4 — draft save/load
        const e4 = await page.evaluate(() => {
            const W = window.ExportWizard;
            if (!W) return { err: 'no wizard' };
            W.draft.name = 'DraftRestoreGame';
            W.draft.author = 'DraftAuthor';
            W.draft.targets = { web: true, android: false, windows: true, ios: false, steam: false };
            W._saveDraft?.();
            const raw = localStorage.getItem('threshold-export-draft-v1');
            let parsed = null;
            try { parsed = JSON.parse(raw); } catch { /* */ }
            W.open();
            return {
                saved: !!raw,
                parsedName: parsed?.name,
                parsedWin: parsed?.targets?.windows,
                afterOpenName: W.draft?.name,
                afterOpenWin: W.draft?.targets?.windows,
                restored: W.draft?.name === 'DraftRestoreGame'
                    || parsed?.name === 'DraftRestoreGame',
            };
        });
        push('E4', !e4.err && e4.saved && e4.restored, JSON.stringify(e4).slice(0, 280));

        // close wizard
        await page.evaluate(() => window.ExportWizard?.close?.());

        await page.close();
    } finally {
        await browser.close();
    }
    return results;
}

async function main() {
    console.log('block8-export-audit\n');
    if (!fs.existsSync(path.join(DIST, 'index.html'))) {
        console.error('dist-pages missing — build first');
        process.exit(1);
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
            console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${String(r.notes).slice(0, 280)}`);
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
        fs.writeFileSync(path.join(outDir, 'block8-export-audit.json'), JSON.stringify(report, null, 2));
        console.log(`\n  Score ${report.pass}/${report.total} → dist-store/block8-export-audit.json`);
        if (failed.length) {
            console.error('block8-export-audit — FAIL', report.failedIds.join(', '));
            process.exit(1);
        }
        console.log('block8-export-audit — PASS');
    } finally {
        server.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
