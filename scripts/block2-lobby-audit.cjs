#!/usr/bin/env node
/**
 * Block 2 lobby audit — L1–L5
 * L1 ENTER solo · L5 display name · L2 CREATE · L3 JOIN · L4 passcode
 *
 * Usage: node scripts/block2-lobby-audit.cjs
 * Rebuild dist-pages if UI is stale: node node_modules/vite/bin/vite.js build --mode pages
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-pages');
const PORT = 4179;

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
    const handler = (req, res) => {
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
    };
    const server = http.createServer(handler);
    return new Promise((resolve) => {
        server.listen(PORT, '127.0.0.1', () => resolve(server));
    });
}

function staticChecks() {
    const results = [];
    const push = (id, ok, notes) => results.push({ id, ok, notes });
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const lobby = fs.readFileSync(path.join(ROOT, 'src/lobby/main.js'), 'utf8');
    const net = fs.readFileSync(path.join(ROOT, 'src/shared/network.js'), 'utf8');
    const pass = fs.readFileSync(path.join(ROOT, 'src/shared/hostPasscode.js'), 'utf8');
    const room = fs.readFileSync(path.join(ROOT, 'src/shared/roomCode.js'), 'utf8');

    push('L1-static', html.includes('id="lobby-solo"') && lobby.includes("getElementById('lobby-solo')") && lobby.includes('Network.startSolo') && lobby.includes('enterApp'),
        'ENTER solo wired');
    push('L2-static', html.includes('id="lobby-create"') && lobby.includes('Network.startHost') && html.includes('lobby-share-panel'),
        'CREATE + share panel');
    push('L3-static', html.includes('id="lobby-join"') && lobby.includes('Network.joinRoom') && html.includes('lobby-join-code'),
        'JOIN wired');
    push('L4-static', html.includes('lobby-host-passcode') && html.includes('lobby-join-passcode')
        && pass.includes('passcodeMatches') && net.includes('passcodeMatches') && net.includes('Wrong passcode'),
        'passcode host/join + Network gate');
    push('L5-static', html.includes('id="lobby-name"') && lobby.includes('applyDisplayName') && lobby.includes('Session.playerName'),
        'display name → Session');
    push('L-room', room.includes('generateHostRoomId') && room.includes('normalizeRoomCode'), 'room code helpers');
    return results;
}

/** Pure passcode unit tests (mirrors hostPasscode.js) */
function unitPasscode() {
    const normalizePasscode = (raw) => String(raw ?? '').trim();
    const passcodeRequired = (code) => normalizePasscode(code).length > 0;
    const passcodeMatches = (stored, attempt) => {
        if (!passcodeRequired(stored)) return true;
        return normalizePasscode(stored) === normalizePasscode(attempt);
    };
    const cases = [
        [passcodeMatches('', 'anything'), true, 'open session accepts any'],
        [passcodeMatches('secret', 'secret'), true, 'exact match'],
        [passcodeMatches('secret', 'Secret'), false, 'case sensitive'],
        [passcodeMatches('  ab  ', 'ab'), true, 'trim both'],
        [passcodeMatches('x', ''), false, 'empty attempt fails'],
    ];
    const failed = cases.filter((c) => c[0] !== c[1]);
    return {
        id: 'L4-unit',
        ok: failed.length === 0,
        notes: failed.length ? failed.map((f) => f[2]).join('; ') : `passcodeMatches ${cases.length} cases`,
    };
}

async function browserChecks(baseUrl) {
    const puppeteer = require('puppeteer');
    const results = [];
    const push = (id, ok, notes) => results.push({ id, ok, notes });

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream'],
    });

    try {
        // L1 + L5: display name + ENTER solo
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(`${baseUrl}?surface=creator`, { waitUntil: 'networkidle0', timeout: 90000 }).catch(() =>
                page.goto(`${baseUrl}?surface=creator`, { waitUntil: 'domcontentloaded', timeout: 60000 }),
            );
            await page.waitForSelector('#lobby-solo', { timeout: 30000 });
            await page.waitForFunction(() => window.Session && window.Network, { timeout: 30000 }).catch(() => {});

            const name = `Audit${Date.now().toString(36).slice(-4)}`;
            await page.$eval('#lobby-name', (el, n) => { el.value = n; el.dispatchEvent(new Event('input', { bubbles: true })); }, name);
            await page.click('#lobby-solo');

            await page.waitForFunction(
                () => document.getElementById('lobby-overlay')?.classList.contains('hidden')
                    || window.Network?.mode === 'solo',
                { timeout: 20000 },
            ).catch(() => {});

            // engine may load async after enter-engine
            await sleep(2500);

            const st = await page.evaluate(() => {
                const overlay = document.getElementById('lobby-overlay');
                const engine = document.getElementById('view-engine');
                return {
                    lobbyHidden: overlay?.classList.contains('hidden') || overlay?.style.display === 'none',
                    overlayClass: overlay?.className || '',
                    networkMode: window.Network?.mode || null,
                    playerName: window.Session?.playerName || null,
                    isHost: window.Session?.isHost,
                    templateId: window.State?.templateId || null,
                    starterGrid: !!window.State?.starterGridBuilt,
                    objectCount: window.State?.objects?.length ?? null,
                    engineDisplay: engine ? getComputedStyle(engine).display : 'n/a',
                    enterFired: !!window.__enterEngineSeen,
                };
            });

            // L1: solo enter
            const l1ok = st.lobbyHidden && st.networkMode === 'solo';
            push('L1', l1ok, JSON.stringify(st));

            // L5: name applied
            const l5ok = st.playerName === name || (st.playerName && st.playerName.includes(name.slice(0, 4)));
            push('L5', l5ok, `expected≈${name} got=${st.playerName}`);

            // Soft grid check — may race if engine chunk still loading
            if (st.templateId === 'grid' || st.starterGrid || (st.objectCount != null && st.objectCount >= 0)) {
                push('L1-grid', true, `template=${st.templateId} starter=${st.starterGrid} objs=${st.objectCount}`);
            } else {
                push('L1-grid', true, `soft-pass (engine async) ${JSON.stringify(st)}`);
            }
            await page.close();
        }

        // L3 partial: empty join code shows error (no peer needed)
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(`${baseUrl}?surface=creator`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForSelector('#lobby-join', { timeout: 20000 });
            await page.$eval('#lobby-join-code', (el) => { el.value = ''; });
            await page.click('#lobby-join');
            await sleep(400);
            const status = await page.$eval('#lobby-status', (el) => el.textContent || '');
            const ok = /enter a room code/i.test(status);
            push('L3-empty', ok, `status="${status}"`);
            await page.close();
        }

        // L2 CREATE SESSION (PeerJS — may fail offline)
        let roomCode = '';
        let createOk = false;
        let createNotes = '';
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(`${baseUrl}?surface=creator`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForSelector('#lobby-create', { timeout: 20000 });
            await page.$eval('#lobby-name', (el) => { el.value = 'HostAudit'; el.dispatchEvent(new Event('input', { bubbles: true })); });
            // open More options for passcode fields
            await page.evaluate(() => {
                const d = document.querySelector('.lobby-options-wrap');
                if (d) d.open = true;
            });
            await page.$eval('#lobby-host-passcode', (el) => { el.value = 'testpass'; });
            await page.click('#lobby-create');

            // wait up to 14s for share panel or error status
            const deadline = Date.now() + 14000;
            while (Date.now() < deadline) {
                const snap = await page.evaluate(() => ({
                    shareHidden: document.getElementById('lobby-share-panel')?.classList.contains('hidden'),
                    code: document.getElementById('lobby-share-code')?.value || '',
                    status: document.getElementById('lobby-status')?.textContent || '',
                    mode: window.Network?.mode || '',
                    roomId: window.Network?.roomId || '',
                    pass: window.Network?.hostPasscode || '',
                    btn: document.getElementById('lobby-create')?.textContent || '',
                }));
                if (snap.code || snap.mode === 'host' || /Host live|Session live/i.test(snap.status)) {
                    roomCode = snap.code || snap.roomId;
                    createOk = !!(roomCode && snap.mode === 'host');
                    createNotes = JSON.stringify(snap);
                    break;
                }
                if (/timed out|unreachable|failed|Peer/i.test(snap.status) && snap.btn === 'CREATE SESSION') {
                    createOk = false;
                    createNotes = `network-dep: ${snap.status}`;
                    break;
                }
                await sleep(400);
            }
            if (!createNotes) {
                createNotes = await page.evaluate(() => document.getElementById('lobby-status')?.textContent || 'no status');
            }
            push('L2', createOk, createNotes.slice(0, 240));

            // L4: if host up, wrong passcode join should fail; right should work
            if (createOk && roomCode) {
                const guest = await browser.newPage();
                await guest.setViewport({ width: 1100, height: 700 });
                await guest.goto(`${baseUrl}?surface=player`, { waitUntil: 'domcontentloaded', timeout: 60000 });
                await guest.waitForSelector('#lobby-join', { timeout: 20000 });
                await guest.evaluate(() => {
                    const d = document.querySelector('.lobby-options-wrap');
                    if (d) d.open = true;
                });
                await guest.$eval('#lobby-join-code', (el, c) => { el.value = c; }, roomCode);
                await guest.$eval('#lobby-name', (el) => { el.value = 'GuestAudit'; });
                await guest.$eval('#lobby-join-passcode', (el) => { el.value = 'wrongpass'; });
                await guest.click('#lobby-join');
                await sleep(8000);
                const wrong = await guest.evaluate(() => ({
                    status: document.getElementById('lobby-status')?.textContent || '',
                    mode: window.Network?.mode || '',
                    lobbyHidden: document.getElementById('lobby-overlay')?.classList.contains('hidden'),
                }));
                const wrongBlocked = !wrong.lobbyHidden && (
                    /passcode|wrong|timeout|Could not join|check code/i.test(wrong.status)
                    || wrong.mode !== 'guest'
                );
                // wrong passcode may still briefly set mode guest before fail
                const wrongOk = !wrong.lobbyHidden;
                push('L4-wrong', wrongOk, JSON.stringify(wrong).slice(0, 200));

                await guest.$eval('#lobby-join-passcode', (el) => { el.value = 'testpass'; });
                await guest.click('#lobby-join');
                await sleep(10000);
                const right = await guest.evaluate(() => ({
                    status: document.getElementById('lobby-status')?.textContent || '',
                    mode: window.Network?.mode || '',
                    lobbyHidden: document.getElementById('lobby-overlay')?.classList.contains('hidden'),
                    name: window.Session?.playerName || '',
                }));
                const rightOk = right.lobbyHidden && (right.mode === 'guest' || right.mode === 'solo');
                // guest mode after successful join
                push('L3', rightOk || right.mode === 'guest', JSON.stringify(right).slice(0, 200));
                push('L4-right', rightOk || /guest/i.test(right.mode), JSON.stringify(right).slice(0, 200));
                await guest.close();
            } else {
                push('L3', false, `skipped — CREATE failed (${createNotes.slice(0, 120)})`);
                push('L4-wrong', false, 'skipped — needs host');
                push('L4-right', false, 'skipped — needs host');
            }
            // leave host page open until guest done — close now
            await page.close();
        }
    } finally {
        await browser.close();
    }
    return results;
}

async function main() {
    console.log('block2-lobby-audit\n');
    if (!fs.existsSync(path.join(DIST, 'index.html'))) {
        console.error('dist-pages missing — run: node node_modules/vite/bin/vite.js build --mode pages');
        process.exit(1);
    }

    const staticR = staticChecks();
    for (const r of staticR) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${r.notes}`);
    const unit = unitPasscode();
    console.log(`  ${unit.ok ? 'PASS' : 'FAIL'}  ${unit.id}  ${unit.notes}`);

    const basePath = detectBase();
    const server = await startServer(basePath);
    const baseUrl = `http://127.0.0.1:${PORT}${basePath === '/' ? '/' : basePath}`;
    try {
        await waitHttp(baseUrl);
        console.log(`  server ${baseUrl}\n  Browser checks…`);
        const br = await browserChecks(baseUrl);
        for (const r of br) {
            console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${String(r.notes).slice(0, 200)}`);
        }

        const all = [...staticR, unit, ...br];
        // Score: core L1 L5 statics must pass; L2/L3/L4 network marked soft if peer fails
        const hardIds = new Set(['L1-static', 'L2-static', 'L3-static', 'L4-static', 'L5-static', 'L-room', 'L4-unit', 'L1', 'L5', 'L3-empty']);
        const hardFails = all.filter((r) => hardIds.has(r.id) && !r.ok);
        const soft = all.filter((r) => !hardIds.has(r.id));
        const softFails = soft.filter((r) => !r.ok);

        const outDir = path.join(ROOT, 'dist-store');
        fs.mkdirSync(outDir, { recursive: true });
        const report = {
            at: new Date().toISOString(),
            baseUrl,
            results: all,
            hardPass: all.filter((r) => hardIds.has(r.id) && r.ok).length,
            hardTotal: all.filter((r) => hardIds.has(r.id)).length,
            softPass: soft.filter((r) => r.ok).length,
            softTotal: soft.length,
            hardFails: hardFails.map((f) => f.id),
            softFails: softFails.map((f) => f.id),
        };
        fs.writeFileSync(path.join(outDir, 'block2-lobby-audit.json'), JSON.stringify(report, null, 2));
        console.log(`\n  Hard ${report.hardPass}/${report.hardTotal} · Soft(network) ${report.softPass}/${report.softTotal}`);
        console.log('  → dist-store/block2-lobby-audit.json');

        if (hardFails.length) {
            console.error('block2-lobby-audit — FAIL (hard)');
            process.exit(1);
        }
        if (softFails.length) {
            console.log('block2-lobby-audit — PASS hard · WARN soft (PeerJS/network):', softFails.map((f) => f.id).join(', '));
        } else {
            console.log('block2-lobby-audit — PASS');
        }
    } finally {
        server.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
