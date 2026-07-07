#!/usr/bin/env node
/** Live GitHub Pages smoke — honest flow checks on medicinalsheep.github.io/threshold */
const LIVE = process.env.THRESHOLD_LIVE_URL || 'https://medicinalsheep.github.io/threshold/';

async function main() {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
    });
    const report = { url: LIVE, checks: [], issues: [], notes: [] };

    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(90000);
        await page.setViewport({ width: 1440, height: 900 });

        const resp = await page.goto(LIVE, { waitUntil: 'networkidle2' });
        report.checks.push({ name: 'page-load', ok: resp?.ok(), status: resp?.status() });

        const head = await page.evaluate(() => ({
            title: document.title,
            favicon: !!document.querySelector('link[rel="icon"]'),
            ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
            themeColor: document.querySelector('meta[name="theme-color"]')?.content || null,
            version: window.VERSION || document.querySelector('#lobby-release-strip')?.textContent?.trim() || null,
        }));
        report.checks.push({ name: 'head-meta', ...head });

        // Solo enter
        await page.click('#lobby-solo');
        await page.waitForFunction(() => window.Engine?.scene && window.State, { timeout: 60000 });
        report.checks.push({ name: 'solo-enter', ok: true });

        const engineBoot = await page.evaluate(() => ({
            version: window.VERSION || null,
            isPaused: window.State?.isPaused,
            simLabel: window.SimMode?.label?.(),
            objectCount: window.State?.objects?.length,
            hasCornerHubs: !!document.getElementById('corner-hubs'),
            portalOpen: document.getElementById('agent-portal-modal')?.classList.contains('open'),
            walkthroughVisible: !document.getElementById('engine-walkthrough')?.classList.contains('hidden'),
            gridVisible: window.Engine?.gridHelper?.visible,
        }));
        report.checks.push({ name: 'engine-boot', ...engineBoot });

        // Dismiss portal + walkthrough for testing
        await page.evaluate(() => {
            document.getElementById('agent-portal-modal')?.classList.remove('open');
            document.body.classList.remove('agent-portal-open');
            document.getElementById('engine-walkthrough')?.classList.add('hidden');
        });

        // GLTF insert + delete on live bundle
        const gltfTest = await page.evaluate(async () => {
            const out = { insertOk: false, deleteOk: false, editMode: !!window.State?.isPaused };
            try {
                const root = await window.GltfImport.insertAtCursor({
                    url: '/threshold/import/lab_bench.glb',
                    name: 'Live Review GLTF',
                    usePhysics: false,
                    pos: { x: 4, y: 0, z: 4 },
                });
                out.insertOk = !!root && window.State.objects.includes(root);
                let child = null;
                root?.traverse?.((c) => { if (c.isMesh && !child) child = c; });
                window.UI.selectObject(child || root);
                window.World.deleteObject(window.State.selectedObject);
                out.deleteOk = !window.State.objects.some((o) => o.userData?.name === 'Live Review GLTF');
            } catch (e) {
                out.error = e.message;
            }
            return out;
        });
        report.checks.push({ name: 'gltf-delete-live', ...gltfTest });

        // PLAY toggle
        const playToggle = await page.evaluate(() => {
            const wasPaused = window.State.isPaused;
            window.UI?.togglePause?.('review');
            const nowPaused = window.State.isPaused;
            window.UI?.togglePause?.('review');
            return { wasPaused, toggled: wasPaused !== nowPaused, restored: window.State.isPaused === wasPaused };
        });
        report.checks.push({ name: 'play-edit-toggle', ...playToggle });

        // Hub menus exist
        const hubs = await page.evaluate(() => ({
            modeToggle: !!document.getElementById('hub-mode-toggle'),
            toolsToggle: !!document.getElementById('hub-tools-toggle'),
            sceneToggle: !!document.getElementById('hub-scene-toggle'),
            touchQuick: !!document.getElementById('hub-touch-quick'),
            setupTab: !!document.querySelector('[data-dock-tab="setup"]'),
            deleteBtn: !!document.getElementById('btn-delete'),
            chatInput: !!document.getElementById('game-chat-input'),
        }));
        report.checks.push({ name: 'hub-ui', ...hubs });

        // Primitive insert
        const cubeTest = await page.evaluate(() => {
            const n = window.State.objects.length;
            const m = window.World.createObject('cube', 'Live Cube', 0xff0000, false);
            m.position.set(0, 1, 0);
            window.UI.selectObject(m);
            window.World.deleteObject(m);
            return { created: !!m, deleted: !window.State.objects.includes(m), count: window.State.objects.length };
        });
        report.checks.push({ name: 'primitive-delete', ...cubeTest });

        // Check assets
        const assets = await page.evaluate(async () => {
            const paths = [
                '/threshold/icons/favicon.ico',
                '/threshold/icons/appicon512.png',
                '/threshold/manifest.webmanifest',
                '/threshold/import/lab_bench.glb',
            ];
            const results = {};
            for (const p of paths) {
                try {
                    const r = await fetch(p, { method: 'HEAD' });
                    results[p] = r.status;
                } catch (e) {
                    results[p] = 'fail';
                }
            }
            return results;
        });
        report.checks.push({ name: 'asset-head', ...assets });

        // Logic flags from code review on live state
        if (!engineBoot.isPaused) report.issues.push('Default should be EDIT (paused) on enter — got PLAY');
        if (!gltfTest.deleteOk) report.issues.push(`GLTF delete failed on live: ${gltfTest.error || 'unknown'}`);
        if (!cubeTest.deleted) report.issues.push('Primitive delete failed on live');
        if (head.version && !String(head.version).includes('10.8')) {
            report.notes.push(`Live version string may lag repo (saw: ${head.version})`);
        }

        console.log(JSON.stringify(report, null, 2));
    } finally {
        await browser.close();
    }
}

main().catch((e) => {
    console.error('FAIL', e.message);
    process.exit(1);
});