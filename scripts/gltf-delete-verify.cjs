#!/usr/bin/env node
/**
 * Browser smoke: insert GLTF in EDIT mode, delete via root + child mesh, assert removal.
 * Requires: npm run dev on :5173, puppeteer (npx -y puppeteer installs on first run).
 */
const http = require('http');

const DEV_URL = process.env.THRESHOLD_DEV_URL || 'http://127.0.0.1:5173';
const GLTF_URL = '/import/lab_bench.glb';
const TEST_NAME = 'Delete Test GLTF';

async function waitForServer(url, ms = 60000) {
    const start = Date.now();
    while (Date.now() - start < ms) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(url, (res) => {
                    res.resume();
                    resolve(res.statusCode);
                });
                req.on('error', reject);
                req.setTimeout(2000, () => { req.destroy(); reject(new Error('timeout')); });
            });
            return;
        } catch {
            await new Promise((r) => setTimeout(r, 500));
        }
    }
    throw new Error(`Dev server not reachable at ${url}`);
}

async function main() {
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch {
        console.error('Install puppeteer: npx -y puppeteer (or npm install --no-save puppeteer)');
        process.exit(1);
    }

    await waitForServer(DEV_URL);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
    });

    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(90000);

        await page.goto(DEV_URL, { waitUntil: 'networkidle2' });

        await page.click('#lobby-solo');
        await page.waitForFunction(
            () => window.Engine?.scene && window.State && window.GltfImport && window.World,
            { timeout: 60000 }
        );

        // Dismiss overlays that steal focus
        await page.evaluate(() => {
            document.getElementById('agent-portal-modal')?.classList.remove('open');
            document.body.classList.remove('agent-portal-open');
            document.getElementById('engine-walkthrough')?.classList.add('hidden');
        });

        const insertResult = await page.evaluate(async (gltfUrl, testName) => {
            if (!window.State.isPaused) {
                window.UI?.togglePause?.('test');
            }
            const before = window.State.objects.length;
            const root = await window.GltfImport.insertAtCursor({
                url: gltfUrl,
                name: testName,
                usePhysics: false,
                pos: { x: 3, y: 0, z: 3 },
            });
            let childMesh = null;
            root?.traverse?.((c) => {
                if (c.isMesh && !childMesh) childMesh = c;
            });
            return {
                editMode: !!window.State.isPaused,
                before,
                afterInsert: window.State.objects.length,
                hasRoot: !!root,
                rootInList: window.State.objects.includes(root),
                childMesh: !!childMesh,
                resolvedChild: window.Engine.resolveRegistryObject(childMesh) === root,
                rootName: root?.userData?.name,
                rootType: root?.userData?.type,
            };
        }, GLTF_URL, TEST_NAME);

        if (!insertResult.editMode) {
            throw new Error('Expected EDIT mode (State.isPaused === true)');
        }
        if (!insertResult.hasRoot || !insertResult.rootInList) {
            throw new Error(`GLTF insert failed: ${JSON.stringify(insertResult)}`);
        }
        if (!insertResult.childMesh || !insertResult.resolvedChild) {
            throw new Error(`Child mesh / resolveRegistryObject failed: ${JSON.stringify(insertResult)}`);
        }
        if (insertResult.afterInsert <= insertResult.before) {
            throw new Error('Object count did not increase after insert');
        }

        const deleteViaChild = await page.evaluate(async (testName) => {
            const root = window.State.objects.find((o) => o.userData?.name === testName);
            if (!root) return { ok: false, step: 'find-root' };
            let childMesh = null;
            root.traverse((c) => {
                if (c.isMesh && !childMesh) childMesh = c;
            });
            window.UI.selectObject(childMesh);
            const selectedRoot = window.Engine.resolveRegistryObject(window.State.selectedObject);
            window.World.deleteObject(window.State.selectedObject);
            const stillListed = window.State.objects.some((o) => o.userData?.name === testName);
            let stillInScene = false;
            window.Engine.scene.traverse((o) => {
                if (o.userData?.name === testName) stillInScene = true;
            });
            return {
                ok: !stillListed && !stillInScene,
                selectedRootOk: selectedRoot === root,
                stillListed,
                stillInScene,
                objectCount: window.State.objects.length,
            };
        }, TEST_NAME);

        if (!deleteViaChild.ok) {
            throw new Error(`Delete via child mesh failed: ${JSON.stringify(deleteViaChild)}`);
        }

        // Second insert + delete via root + Delete key
        await page.evaluate(async (gltfUrl, testName) => {
            await window.GltfImport.insertAtCursor({
                url: gltfUrl,
                name: testName + ' 2',
                usePhysics: false,
                pos: { x: -2, y: 0, z: -2 },
            });
        }, GLTF_URL, TEST_NAME);

        const deleteViaKey = await page.evaluate(async (testName) => {
            const name2 = testName + ' 2';
            const root = window.State.objects.find((o) => o.userData?.name === name2);
            window.UI.selectObject(root);
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Delete', bubbles: true }));
            const stillListed = window.State.objects.some((o) => o.userData?.name === name2);
            return { ok: !stillListed, stillListed };
        }, TEST_NAME);

        if (!deleteViaKey.ok) {
            throw new Error(`Delete via Delete key failed: ${JSON.stringify(deleteViaKey)}`);
        }

        console.log('PASS gltf-delete-verify');
        console.log('  insert:', insertResult);
        console.log('  delete-child:', deleteViaChild);
        console.log('  delete-key:', deleteViaKey);
    } finally {
        await browser.close();
    }
}

main().catch((e) => {
    console.error('FAIL gltf-delete-verify:', e.message || e);
    process.exit(1);
});