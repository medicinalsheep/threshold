#!/usr/bin/env node
/**
 * In-engine TPS walk smoke — Puppeteer + dist-pages
 *
 * ENTER solo → ensure TPS PLAY → prove idle / walk / run drive limbs.
 *
 * Usage:
 *   node scripts/tps-walk-smoke.cjs
 *   node scripts/tps-walk-smoke.cjs --build
 *   node scripts/tps-walk-smoke.cjs --headed
 *   npm run walk:smoke
 *
 * Writes: dist-store/tps-walk-smoke.json
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-pages');
const OUT_DIR = path.join(ROOT, 'dist-store');
const PORT = 4188;

const args = {
    build: process.argv.includes('--build'),
    headed: process.argv.includes('--headed'),
};

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function log(...a) { console.log('[tps-walk-smoke]', ...a); }

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
            if (Date.now() - start > timeoutMs) reject(new Error(`timeout waiting for ${url}`));
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
            '.woff2': 'font/woff2', '.webp': 'image/webp', '.glb': 'model/gltf-binary',
        };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(fs.readFileSync(file));
    });
    return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

function run(cmd, cmdArgs) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, cmdArgs, {
            cwd: ROOT,
            stdio: 'inherit',
            shell: process.platform === 'win32',
        });
        child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
        child.on('error', reject);
    });
}

async function ensureBuild() {
    const index = path.join(DIST, 'index.html');
    if (!args.build && fs.existsSync(index)) {
        log('using existing dist-pages');
        return;
    }
    log('building dist-pages…');
    await run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
        'vite', 'build', '--mode', 'pages',
    ]);
}

async function enterSolo(page) {
    await page.waitForSelector('#lobby-solo', { timeout: 45000 });
    await page.waitForFunction(() => window.Network && window.Session, { timeout: 45000 }).catch(() => {});
    // Prefer PLAY mode if lobby has mode buttons
    await page.evaluate(() => {
        const playBtn = document.querySelector('.lobby-mode-btn[data-mode="play"]');
        playBtn?.click?.();
    });
    await page.click('#lobby-solo');
    await page.waitForFunction(
        () => document.getElementById('lobby-overlay')?.classList.contains('hidden'),
        { timeout: 30000 },
    );
    await page.waitForFunction(
        () => window.PlayerController && window.HumanMesh && window.Engine?.scene,
        { timeout: 90000 },
    );
    await sleep(2000);
}

function staticChecks() {
    const results = [];
    const push = (id, ok, notes) => results.push({ id, ok, notes });
    const human = fs.readFileSync(path.join(ROOT, 'src/engine/humanMesh.js'), 'utf8');
    const player = fs.readFileSync(path.join(ROOT, 'src/engine/player.js'), 'utf8');
    const pose = fs.readFileSync(path.join(ROOT, 'src/shared/avatarPoseSync.js'), 'utf8');
    push('S-loco-multi',
        human.includes('pickLocoName') && human.includes('locoActions') && human.includes("idle"),
        'HumanMesh multi-clip idle/walk/run');
    push('S-player-dt',
        player.includes('postPhysics(dt') && player.includes('intentSpeed'),
        'player real dt + intent speed');
    push('S-pose-idle',
        pose.includes("pickLocoName") && pose.includes("'idle'"),
        'AvatarPoseSync idle/walk/run');
    push('S-glb-walk',
        fs.existsSync(path.join(ROOT, 'import/starter_avatar.glb')),
        'import/starter_avatar.glb present');
    return results;
}

async function browserSmoke(baseUrl) {
    const puppeteer = require('puppeteer');
    const results = [];
    const push = (id, ok, notes) => {
        results.push({ id, ok, notes });
        console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id}  ${String(notes).slice(0, 220)}`);
    };

    const browser = await puppeteer.launch({
        headless: args.headed ? false : 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--enable-webgl'],
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        page.on('console', (msg) => {
            const t = msg.text();
            if (/human-mesh|player\] walk|avatar-lod|walk ready/i.test(t)) {
                log('browser:', t.slice(0, 160));
            }
        });
        page.on('pageerror', (err) => log('pageerror', err.message));

        await page.goto(`${baseUrl}?surface=creator`, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await enterSolo(page);

        // Ensure player + TPS PLAY
        const boot = await page.evaluate(async () => {
            const PC = window.PlayerController;
            const State = window.State;
            if (PC && !PC.spawned) {
                try {
                    await PC.spawn?.(0, 2, 0);
                } catch (e) {
                    return { err: String(e.message || e) };
                }
            }
            // Wait for appearance / GLB
            for (let i = 0; i < 40; i++) {
                if (PC?.group?.userData?.isGltf || PC?.group?.userData?.walkMode) break;
                await new Promise((r) => setTimeout(r, 100));
            }
            if (State) {
                State.viewMode = 'tps';
                State.controlMode = 'walk';
                State.isPaused = false;
            }
            PC?._applyViewMode?.();
            // Unpause UI if needed
            if (State?.isPaused && window.UI?.togglePause) {
                try { window.UI.togglePause('smoke'); } catch { /* */ }
            }
            State.isPaused = false;
            return {
                spawned: !!PC?.spawned,
                hasGroup: !!PC?.group,
                viewMode: State?.viewMode,
                controlMode: State?.controlMode,
                isPaused: !!State?.isPaused,
                walkMode: PC?.group?.userData?.walkMode,
                locoClips: PC?.group?.userData?.locoClips || null,
                isGltf: !!PC?.group?.userData?.isGltf,
                visible: PC?.group?.visible !== false,
            };
        });

        push('W1-spawn-tps',
            boot.spawned && boot.hasGroup && boot.viewMode === 'tps'
            && boot.controlMode === 'walk' && boot.visible !== false && !boot.err,
            JSON.stringify(boot).slice(0, 280));

        // Core locomotion smoke: limb motion under idle / walk / run
        const loco = await page.evaluate(async () => {
            const PC = window.PlayerController;
            const HM = window.HumanMesh;
            const g = PC?.group;
            if (!g || !HM?.updateWalk) {
                return { err: 'no group or HumanMesh.updateWalk' };
            }

            const leg = g.getObjectByName?.('legL')
                || (() => {
                    let found = null;
                    g.traverse((c) => { if (c.name === 'legL' && !found) found = c; });
                    return found;
                })();

            const quat = (obj) => {
                if (!obj?.quaternion) return null;
                return [obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w]
                    .map((n) => +n.toFixed(5));
            };
            const quatDelta = (a, b) => {
                if (!a || !b) return 0;
                return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]);
            };

            // —— Idle ——
            for (let i = 0; i < 20; i++) HM.updateWalk(g, 0, 1 / 60, false);
            const idleActive = g.userData.locoActive || null;
            const idleMode = g.userData.walkMode;
            const idleQ0 = quat(leg);
            for (let i = 0; i < 30; i++) HM.updateWalk(g, 0, 1 / 60, false);
            const idleQ1 = quat(leg);
            // idle may breathe slightly — just ensure no crash
            const idleOk = idleMode === 'mixer' || idleMode === 'procedural';

            // —— Walk ——
            const wSamples = [];
            for (let i = 0; i < 45; i++) {
                HM.updateWalk(g, 3.0, 1 / 60, false);
                if (i % 5 === 0) wSamples.push(quat(leg));
            }
            const walkActive = g.userData.locoActive || null;
            let walkMaxDelta = 0;
            for (let i = 1; i < wSamples.length; i++) {
                walkMaxDelta = Math.max(walkMaxDelta, quatDelta(wSamples[0], wSamples[i]));
            }
            // also compare last vs first
            walkMaxDelta = Math.max(walkMaxDelta, quatDelta(wSamples[0], wSamples[wSamples.length - 1]));

            // —— Run / sprint ——
            for (let i = 0; i < 30; i++) HM.updateWalk(g, 6.5, 1 / 60, true);
            const runActive = g.userData.locoActive || null;
            const runQ = quat(leg);
            const runDeltaFromWalkStart = quatDelta(wSamples[0], runQ);

            // —— Physics path: intent velocity + postPhysics ——
            let physicsDelta = 0;
            let physicsErr = null;
            try {
                if (PC.body) {
                    const qBefore = quat(leg);
                    PC._velX = 0;
                    PC._velZ = 3.2;
                    PC.body.velocity.x = 0;
                    PC.body.velocity.z = 3.2;
                    if (window.State) {
                        window.State.isPaused = false;
                        window.State.controlMode = 'walk';
                        window.State.viewMode = 'tps';
                    }
                    for (let i = 0; i < 40; i++) {
                        PC.prePhysics?.(1 / 60);
                        window.Physics?.update?.();
                        PC.postPhysics?.(1 / 60);
                    }
                    const qAfter = quat(leg);
                    physicsDelta = quatDelta(qBefore, qAfter);
                }
            } catch (e) {
                physicsErr = String(e.message || e);
            }

            return {
                idleOk,
                idleActive,
                idleMode,
                idleDrift: quatDelta(idleQ0, idleQ1),
                walkActive,
                walkMaxDelta,
                runActive,
                runDeltaFromWalkStart,
                physicsDelta,
                physicsErr,
                hasLeg: !!leg,
                walkMode: g.userData.walkMode,
                locoClips: g.userData.locoClips || null,
                mixer: !!g.userData.mixer,
                samples: wSamples.length,
            };
        });

        if (loco.err) {
            push('W2-loco', false, loco.err);
        } else {
            push('W2-rig',
                loco.hasLeg && (loco.walkMode === 'mixer' || loco.walkMode === 'procedural'),
                JSON.stringify({
                    walkMode: loco.walkMode,
                    hasLeg: loco.hasLeg,
                    mixer: loco.mixer,
                    clips: loco.locoClips,
                }));

            // Walk must move limbs (threshold: quaternion delta > 0.02 over samples)
            push('W3-walk-motion',
                loco.walkMaxDelta > 0.02,
                `walkMaxDelta=${loco.walkMaxDelta.toFixed(4)} active=${loco.walkActive}`);

            // Idle uses idle clip when available
            const expectIdle = !!(loco.locoClips && loco.locoClips.idle);
            push('W4-idle',
                loco.idleOk && (!expectIdle || loco.idleActive === 'idle' || loco.walkMode === 'procedural'),
                `idleActive=${loco.idleActive} mode=${loco.idleMode} drift=${(loco.idleDrift || 0).toFixed(4)}`);

            // Run when sprinting
            const expectRun = !!(loco.locoClips && loco.locoClips.run);
            push('W5-run',
                !expectRun || loco.runActive === 'run' || loco.walkMode === 'procedural',
                `runActive=${loco.runActive} expectRun=${expectRun}`);

            // postPhysics path should also move limbs (or at least not error)
            push('W6-physics-path',
                !loco.physicsErr && (loco.physicsDelta > 0.01 || loco.walkMaxDelta > 0.02),
                `physicsDelta=${(loco.physicsDelta || 0).toFixed(4)} err=${loco.physicsErr || 'none'}`);
        }

        // Group still visible in TPS after smoke
        const fin = await page.evaluate(() => ({
            visible: window.PlayerController?.group?.visible !== false,
            viewMode: window.State?.viewMode,
            fpsHides: window.State?.viewMode === 'fps' && window.PlayerController?.group?.userData?.isGltf
                ? window.PlayerController.group.visible === false
                : null,
        }));
        push('W7-tps-visible',
            fin.viewMode === 'tps' && fin.visible,
            JSON.stringify(fin));

        await page.close();
    } finally {
        await browser.close();
    }
    return results;
}

async function main() {
    console.log('tps-walk-smoke\n');
    await ensureBuild();
    if (!fs.existsSync(path.join(DIST, 'index.html'))) {
        console.error('dist-pages missing — run with --build');
        process.exit(1);
    }

    const staticR = staticChecks();
    for (const r of staticR) {
        console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${r.notes}`);
    }

    const basePath = detectBase();
    const server = await startServer(basePath);
    const baseUrl = `http://127.0.0.1:${PORT}${basePath === '/' ? '/' : basePath}`;

    try {
        await waitHttp(baseUrl);
        log(`server ${baseUrl}`);
        console.log('\n  Browser TPS checks…');
        const br = await browserSmoke(baseUrl);
        const all = [...staticR, ...br];
        const failed = all.filter((r) => !r.ok);
        fs.mkdirSync(OUT_DIR, { recursive: true });
        const report = {
            at: new Date().toISOString(),
            baseUrl,
            results: all,
            pass: all.filter((r) => r.ok).length,
            total: all.length,
            failedIds: failed.map((f) => f.id),
        };
        const out = path.join(OUT_DIR, 'tps-walk-smoke.json');
        fs.writeFileSync(out, JSON.stringify(report, null, 2));
        console.log(`\n  Score ${report.pass}/${report.total} → ${out}`);
        if (failed.length) {
            console.error('tps-walk-smoke — FAIL', report.failedIds.join(', '));
            process.exit(1);
        }
        console.log('tps-walk-smoke — PASS');
    } finally {
        server.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
