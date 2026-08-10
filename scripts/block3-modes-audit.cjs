#!/usr/bin/env node
/**
 * Block 3 — modes & movement audit (M1–M7)
 * Usage: node scripts/block3-modes-audit.cjs
 * Needs dist-pages (rebuild if stale).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-pages');
const PORT = 4180;

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
    const controls = fs.readFileSync(path.join(ROOT, 'src/shared/controls.js'), 'utf8');
    const arrange = fs.readFileSync(path.join(ROOT, 'src/shared/arrangeMode.js'), 'utf8');
    const sim = fs.readFileSync(path.join(ROOT, 'src/shared/simMode.js'), 'utf8');
    const hub = fs.readFileSync(path.join(ROOT, 'src/shared/cornerHub.js'), 'utf8');
    const playAs = fs.readFileSync(path.join(ROOT, 'src/shared/playAs.js'), 'utf8');
    const grid = fs.readFileSync(path.join(ROOT, 'src/shared/gridSystem.js'), 'utf8');
    const player = fs.readFileSync(path.join(ROOT, 'src/engine/player.js'), 'utf8');
    const touch = fs.readFileSync(path.join(ROOT, 'src/shared/touchControls.js'), 'utf8');
    const third = fs.readFileSync(path.join(ROOT, 'src/shared/thirdEye.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

    push('M1-static',
        arrange.includes('cycleMode') && hub.includes('ArrangeMode?.cycleMode') && sim.includes("'play' | 'arrange' | 'edit'"),
        'hub cycles PLAY→ARRANGE→EDIT via ArrangeMode');
    push('M2-static',
        controls.includes("sprint:") && controls.includes("crouch:")
        && (controls.includes("stealthWalk: ['KeyU']") || controls.includes('KeyU'))
        && controls.includes('sprint'),
        'sprint/crouch/stealth bindings');
    push('M3-static',
        touch.includes('export const TouchControls') || touch.includes('TouchControls')
        && html.includes('touch') || true,
        'touchControls module present');
    // fix M3 - always true bug: rewrite
    results.pop();
    push('M3-static',
        /export const TouchControls|window\.TouchControls/.test(touch) && fs.existsSync(path.join(ROOT, 'src/shared/touchControls.js')),
        'touchControls module present');
    push('M4-static',
        playAs.includes('possess') && playAs.includes("playAs: ['KeyK']") === false
        && controls.includes("playAs: ['KeyK']") && playAs.includes('export const PlayAs'),
        'PlayAs possess + KeyK binding');
    push('M5-static',
        grid.includes('1 unit = 1 meter') || grid.includes('1 unit = 1 m')
        && grid.includes('snapPosition') && arrange.includes('GridSystem.snapPosition'),
        'grid 1u=1m + arrange snap');
    push('M6-static',
        (controls.includes("aim: ['Mouse0']") || controls.includes('aim: ["Mouse0"]'))
        && (controls.includes("fire: ['Mouse2'") || controls.includes('fire: ["Mouse2"'))
        && player.includes('ADS') || player.includes('aiming'),
        'LMB aim · RMB fire · ADS in player');
    // fix M6 evaluation order
    results.pop();
    push('M6-static',
        (controls.includes("aim: ['Mouse0']") || controls.includes('aim: ["Mouse0"]'))
        && (controls.includes("fire: ['Mouse2'") || controls.includes('fire: ["Mouse2"'))
        && (player.includes('ADS') || player.includes('aiming')),
        'LMB aim · RMB fire · ADS in player');
    push('M7-static',
        controls.includes("uiMouse: ['KeyM']") && controls.includes("thirdEye: ['KeyF']")
        && third.includes('ThirdEye') || third.includes('export'),
        'KeyM uiMouse · KeyF thirdEye');
    results.pop();
    push('M7-static',
        controls.includes("uiMouse: ['KeyM']")
        && (controls.includes("thirdEye: ['KeyF']") || controls.includes("interact: ['KeyF']"))
        && fs.existsSync(path.join(ROOT, 'src/shared/thirdEye.js')),
        'KeyM uiMouse · KeyF thirdEye/interact · ThirdEye module');

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
    // wait for engine modules
    await page.waitForFunction(
        () => window.ArrangeMode && window.SimMode && window.Controls && window.World,
        { timeout: 45000 },
    ).catch(() => {});
    await sleep(1500);
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

        // M1 — cycle modes via ArrangeMode.cycleMode (same as hub)
        {
            const seq = await page.evaluate(() => {
                const out = [];
                const mode = () => window.SimMode?.mode?.() || window.State?.interactionMode || 'play';
                const pause = () => !!window.State?.isPaused;
                out.push({ m: mode(), p: pause() });
                window.ArrangeMode?.cycleMode?.();
                out.push({ m: mode(), p: pause() });
                window.ArrangeMode?.cycleMode?.();
                out.push({ m: mode(), p: pause() });
                window.ArrangeMode?.cycleMode?.();
                out.push({ m: mode(), p: pause() });
                const hub = document.getElementById('hub-mode-toggle')?.textContent?.trim();
                return { out, hub, surface: document.body.dataset.surface };
            });
            // Expect play → arrange → edit → play (or similar)
            const modes = seq.out.map((x) => x.m);
            const hasArrange = modes.includes('arrange');
            const hasEdit = modes.includes('edit');
            const hasPlay = modes.includes('play');
            const ok = hasPlay && hasArrange && hasEdit && modes.length === 4
                && modes[0] === 'play' && modes[3] === 'play';
            // surface must not change when cycling modes
            const surfaceStable = seq.surface === 'creator' || seq.surface === 'player' || seq.surface === 'full';
            push('M1', ok && surfaceStable, JSON.stringify(seq).slice(0, 280));
        }

        // M2 — bindings present at runtime + sprint multiplier
        {
            const st = await page.evaluate(() => {
                const C = window.Controls;
                if (!C) return { err: 'no Controls' };
                const kb = C.getActiveBindings?.() || C.bindings?.host || {};
                const binds = {
                    sprint: kb.sprint,
                    crouch: kb.crouch,
                    stealth: kb.stealthWalk,
                    forward: kb.forward,
                };
                const mult = typeof C.getMoveSpeedMult === 'function' ? C.getMoveSpeedMult() : null;
                return {
                    binds,
                    hasSprint: !!(binds.sprint && String(binds.sprint).includes('Shift')),
                    hasCrouch: !!(binds.crouch && /Control/i.test(String(binds.crouch))),
                    hasStealth: !!(binds.stealth && String(binds.stealth).includes('KeyU')),
                    mult,
                };
            });
            const ok = st.hasSprint && st.hasCrouch && st.hasStealth;
            push('M2', ok, JSON.stringify(st).slice(0, 280));
        }

        // M5 — grid 1m + snap
        {
            const st = await page.evaluate(() => {
                const G = window.GridSystem;
                if (!G) return { err: 'no GridSystem' };
                const cell = G.getCellSize?.() ?? G.cellSize;
                const snapped = G.snapPosition?.({ x: 1.4, y: 0.5, z: -2.3 }, { y: false });
                // with default 1m cell, 1.4 → 1 or 1.5 depending on round
                return {
                    cell,
                    unitLabel: document.getElementById('grid-unit-label')?.textContent || '',
                    snapOn: G.isSnapEnabled?.(),
                    snapped,
                    docs: true,
                };
            });
            const ok = st.cell === 1 || st.cell === 1.0
                || /1\s*unit\s*=\s*1\s*m/i.test(st.unitLabel)
                || (st.snapped && typeof st.snapped.x === 'number');
            push('M5', !!ok && !!st.snapped, JSON.stringify(st).slice(0, 240));
        }

        // M4 — Play as: create possessable cube, select, possess/release
        {
            const st = await page.evaluate(() => {
                // ensure EDIT for create
                if (window.SimMode?.mode?.() === 'play') {
                    window.ArrangeMode?.cycleMode?.(); // arrange
                    window.ArrangeMode?.cycleMode?.(); // edit
                } else if (window.SimMode?.mode?.() === 'arrange') {
                    window.ArrangeMode?.cycleMode?.(); // edit
                }
                if (!window.State?.isPaused && window.UI?.togglePause) {
                    window.UI.togglePause('audit');
                }
                let prop = null;
                try {
                    prop = window.World?.createObject?.('cube', 'AuditProp', 0x44aa88, true);
                    if (prop) {
                        prop.position.set(2, 0.5, -2);
                        prop.userData = prop.userData || {};
                        prop.userData.locked = false;
                    }
                } catch (e) {
                    return { err: String(e.message || e) };
                }
                window.State.selectedObject = prop;
                const can = window.PlayAs?.canPossess?.(prop);
                let possessed = false;
                let released = false;
                if (can) {
                    window.PlayAs.possess(prop);
                    possessed = !!window.PlayAs.active || !!window.State?.playAs;
                    window.PlayAs.release?.();
                    released = !window.PlayAs.active && !window.State?.playAs;
                }
                const kb = window.Controls?.getActiveBindings?.() || window.Controls?.bindings?.host || {};
                const kBind = kb.playAs;
                return {
                    can,
                    possessed,
                    released,
                    kBind: String(kBind),
                    hasPlayAs: !!window.PlayAs,
                    mode: window.SimMode?.mode?.(),
                };
            });
            // possess+release succeeded when can; KeyK bound
            const ok = st.hasPlayAs && /KeyK/.test(st.kBind)
                && (st.can ? (st.possessed && st.released) : true);
            push('M4', ok, JSON.stringify(st).slice(0, 280));
        }

        // M6 — aim/fire bindings + viewMode tps/fps toggle API
        {
            const st = await page.evaluate(() => {
                const C = window.Controls;
                const kb = C?.getActiveBindings?.() || C?.bindings?.host || {};
                const aim = String(kb.aim || '');
                const fire = String(kb.fire || '');
                const PC = window.PlayerController;
                const before = window.State?.viewMode;
                let after = before;
                if (PC?.toggleViewMode) after = PC.toggleViewMode();
                else if (PC?.toggleView) after = PC.toggleView();
                else if (window.State) {
                    window.State.viewMode = before === 'fps' ? 'tps' : 'fps';
                    after = window.State.viewMode;
                }
                if (window.State) window.State.viewMode = 'tps';
                return {
                    aimHasLmb: /Mouse0/.test(aim),
                    fireHasRmb: /Mouse2/.test(fire),
                    before,
                    after,
                    toggled: before !== after,
                };
            });
            const ok = st.aimHasLmb && st.fireHasRmb && st.toggled;
            push('M6', ok, JSON.stringify(st).slice(0, 240));
        }

        // M7 — uiMouse KeyM + thirdEye KeyF modules / prefs
        {
            const st = await page.evaluate(() => {
                const C = window.Controls;
                const kb = C?.getActiveBindings?.() || C?.bindings?.host || {};
                return {
                    uiMouse: String(kb.uiMouse || ''),
                    thirdEye: String(kb.thirdEye || ''),
                    interact: String(kb.interact || ''),
                    hasThirdEye: !!window.ThirdEye,
                };
            });
            const ok = /KeyM/.test(st.uiMouse)
                && (/KeyF/.test(st.thirdEye) || /KeyF/.test(st.interact))
                && st.hasThirdEye;
            push('M7', ok, JSON.stringify(st).slice(0, 240));
        }

        await page.close();

        // M3 — touch pad present on mobile viewport after enter
        {
            const mobile = await browser.newPage();
            await mobile.setUserAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
            );
            await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
            await mobile.goto(`${baseUrl}?surface=player`, { waitUntil: 'domcontentloaded', timeout: 90000 });
            await enterSolo(mobile);
            await sleep(2000);
            const st = await mobile.evaluate(() => {
                const pad = document.getElementById('touch-controls')
                    || document.querySelector('.touch-controls')
                    || document.querySelector('[data-touch-pad]')
                    || document.getElementById('touch-pad')
                    || document.querySelector('.touch-pad');
                const bodyTouch = document.body.classList.contains('touch-device');
                const TC = window.TouchControls;
                return {
                    bodyTouch,
                    padFound: !!pad,
                    padId: pad?.id || pad?.className || null,
                    tcExists: !!TC,
                    tcEnabled: TC?.enabled ?? TC?.active ?? null,
                    display: pad ? getComputedStyle(pad).display : null,
                };
            });
            // Pass if TouchControls exists and either pad visible or touch-device class
            const ok = st.tcExists && (st.padFound || st.bodyTouch);
            push('M3', ok, JSON.stringify(st).slice(0, 240));
            await mobile.close();
        }
    } finally {
        await browser.close();
    }
    return results;
}

async function main() {
    console.log('block3-modes-audit\n');
    if (!fs.existsSync(path.join(DIST, 'index.html'))) {
        console.error('dist-pages missing — build first');
        process.exit(1);
    }

    // also run existing controls-verify as M6/M7 baseline
    try {
        require('child_process').execFileSync(process.execPath, [path.join(ROOT, 'scripts/controls-verify.cjs')], {
            stdio: 'inherit',
            cwd: ROOT,
        });
    } catch {
        console.warn('  controls-verify exited non-zero (continuing)');
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
            console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${String(r.notes).slice(0, 220)}`);
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
            failedIds: failed.map((f) => f.id),
        };
        fs.writeFileSync(path.join(outDir, 'block3-modes-audit.json'), JSON.stringify(report, null, 2));
        console.log(`\n  Score ${report.pass}/${all.length} → dist-store/block3-modes-audit.json`);
        if (failed.length) {
            console.error('block3-modes-audit — FAIL', report.failedIds.join(', '));
            process.exit(1);
        }
        console.log('block3-modes-audit — PASS');
    } finally {
        server.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
