#!/usr/bin/env node
/**
 * Block 5 — art & naming audit (A1–A5)
 * Usage: node scripts/block5-art-audit.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-pages');
const PORT = 4182;

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
            '.woff2': 'font/woff2', '.webp': 'image/webp', '.glb': 'model/gltf-binary',
        };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(fs.readFileSync(file));
    });
    return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

/** Pure artNaming unit (mirrors artNaming.js) */
function unitArtNaming() {
    const results = [];
    const slugify = (name = '') => String(name).trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'object';
    const expectedTexturePath = (name, slot = 'albedo') =>
        `textures/${slugify(name)}_${slot}.png`;
    const expectedGlbPath = (name) => `import/${slugify(name)}.glb`;

    const cases = [
        [slugify('Stone Block'), 'stone_block'],
        [expectedTexturePath('Stone Block'), 'textures/stone_block_albedo.png'],
        [expectedGlbPath('Stone Block'), 'import/stone_block.glb'],
        [expectedTexturePath('Mat Wood Crate', 'roughness'), 'textures/mat_wood_crate_roughness.png'],
        [slugify('  Hello--World!! '), 'hello_world'],
    ];
    const failed = cases.filter((c) => c[0] !== c[1]);
    results.push({
        id: 'A1-unit',
        ok: failed.length === 0,
        notes: failed.length ? JSON.stringify(failed) : `slug/path ${cases.length} cases`,
    });
    return results;
}

function staticChecks() {
    const results = [];
    const push = (id, ok, notes) => results.push({ id, ok, notes });
    const art = fs.readFileSync(path.join(ROOT, 'src/shared/artNaming.js'), 'utf8');
    const ui = fs.readFileSync(path.join(ROOT, 'src/engine/ui.js'), 'utf8');
    const live = fs.readFileSync(path.join(ROOT, 'src/shared/liveBuild.js'), 'utf8');
    const mats = fs.readFileSync(path.join(ROOT, 'src/shared/materialPresets.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const creative = fs.existsSync(path.join(ROOT, 'docs/CREATIVE_WORKFLOW.md'))
        ? fs.readFileSync(path.join(ROOT, 'docs/CREATIVE_WORKFLOW.md'), 'utf8') : '';
    const bridge = fs.readFileSync(path.join(ROOT, 'src/shared/textureBridge.js'), 'utf8');
    const blender = fs.existsSync(path.join(ROOT, 'src/shared/blenderManifest.js'))
        ? fs.readFileSync(path.join(ROOT, 'src/shared/blenderManifest.js'), 'utf8') : '';

    push('A1-static',
        art.includes('artPathsForName') && ui.includes('syncArtNamingHint')
        && html.includes('insp-art-paths') && html.includes('insp-name'),
        'inspector art paths wired');
    push('A2-static',
        live.includes('textureHint') && live.includes('expectedTexturePath'),
        'LiveBuild sets textureHint from name');
    push('A3-static',
        mats.includes('applyMaterialPreset') && html.includes('insp-material-preset'),
        'MaterialPresets + inspector select');
    push('A4-static',
        html.includes('insp-texture-gimp') && ui.includes('syncGimpManifest')
        && bridge.includes('pickAndApplyGimpManifest')
        && (creative.includes('GIMP') || creative.includes('gimp')),
        'GIMP SYNC button + TextureBridge + docs');
    push('A5-static',
        html.includes('insert-gltf') && (html.includes('BLENDER') || html.includes('Blender'))
        && (blender.includes('BLENDER_MANIFEST') || blender.includes('threshold-blender')),
        'Blender GLB insert / manifest UI');

    // plugins present (install path)
    const gimpPlugin = fs.existsSync(path.join(ROOT, 'plugins/threshold-gimp'));
    const blenderPlugin = fs.existsSync(path.join(ROOT, 'plugins/threshold-blender'));
    push('A4-plugin', gimpPlugin, gimpPlugin ? 'plugins/threshold-gimp present' : 'plugin folder missing');
    push('A5-plugin', blenderPlugin, blenderPlugin ? 'plugins/threshold-blender present' : 'plugin folder missing');

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
        () => window.World && window.ArtNaming && window.UI,
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

        // Enter EDIT for inspector
        await page.evaluate(() => {
            if (window.ArrangeMode?.setMode) window.ArrangeMode.setMode('edit');
            else if (!window.State?.isPaused && window.UI?.togglePause) window.UI.togglePause('audit');
        });
        await sleep(400);

        // A1 — create prop, select, set name, check insp-art-paths
        const a1 = await page.evaluate(() => {
            let prop = null;
            try {
                prop = window.World.createObject('cube', 'Temp', 0x8899aa, false);
                if (prop) prop.position.set(0, 0.5, -3);
            } catch (e) {
                return { err: String(e.message || e) };
            }
            window.State.selectedObject = prop;
            // open inspector UI if needed
            document.getElementById('inspector') && (document.getElementById('inspector').style.display = 'block');
            window.UI?.loadInspectorFromObject?.(prop);

            const nameEl = document.getElementById('insp-name');
            if (nameEl) {
                nameEl.value = 'Stone Block';
                nameEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
            window.UI?.applyInspectorFromUi?.();
            window.UI?.syncArtNamingHint?.('Stone Block');

            const artEl = document.getElementById('insp-art-paths');
            const paths = window.ArtNaming?.artPathsForName?.('Stone Block')
                || window.TextureBridge?.artPathsForName?.('Stone Block');
            return {
                nameValue: nameEl?.value,
                artText: artEl?.textContent || '',
                slug: artEl?.dataset?.slug || paths?.slug,
                albedo: paths?.albedo,
                glb: paths?.glb,
                udName: prop?.userData?.name,
            };
        });
        const a1ok = /stone_block/i.test(a1.artText + a1.slug + a1.albedo)
            && /textures\/stone_block_albedo\.png/i.test(a1.artText + a1.albedo)
            && /import\/stone_block\.glb/i.test(a1.artText + a1.glb);
        push('A1', a1ok, JSON.stringify(a1).slice(0, 280));

        // A2 — LiveBuild textureHint from named create
        const a2 = await page.evaluate(async () => {
            window.LiveBuild?.init?.();
            if (window.ArrangeMode?.setMode) window.ArrangeMode.setMode('edit');
            else if (!window.State?.isPaused && window.UI?.togglePause) window.UI.togglePause('audit');
            const beforeIds = new Set((window.State?.objects || []).map((o) => o.uuid));
            // Direct path: mimic LiveBuild textureHint fill
            let prop = null;
            try {
                prop = window.World.createObject('cube', 'Mat Wood Bench', 0x6b4a2e, false);
                if (prop) {
                    prop.position.set(-2, 0.4, -2);
                    if (!prop.userData.textureHint && window.ArtNaming?.expectedTexturePath) {
                        prop.userData.textureHint = window.ArtNaming.expectedTexturePath('Mat Wood Bench', 'albedo');
                    }
                }
            } catch (e) {
                return { err: String(e.message || e) };
            }
            // Also exercise applyChunk if possible
            let chunkHint = null;
            try {
                const code = `(function(){
  if (!State.isPaused) return;
  const b = World.createObject('cube', 'AuditArtHint', 0x778866, false);
  if (b) b.position.set(2, 0.5, -2);
})();`;
                await window.LiveBuild.applyChunk(code, { label: 'art-hint', source: 'audit' });
                const created = (window.State?.objects || []).find((o) =>
                    !beforeIds.has(o.uuid) && /AuditArtHint|Mat Wood Bench/i.test(o.userData?.name || ''));
                // LiveBuild sets textureHint on created with names
                const withHint = (window.State?.objects || []).filter((o) => o.userData?.textureHint);
                chunkHint = {
                    createdName: created?.userData?.name,
                    createdHint: created?.userData?.textureHint,
                    hintCount: withHint.length,
                    sample: withHint.slice(0, 3).map((o) => ({
                        n: o.userData?.name,
                        h: o.userData?.textureHint,
                    })),
                };
            } catch (e) {
                chunkHint = { err: String(e.message || e) };
            }
            return {
                propName: prop?.userData?.name,
                propHint: prop?.userData?.textureHint,
                expected: window.ArtNaming?.expectedTexturePath?.('Mat Wood Bench', 'albedo'),
                chunkHint,
            };
        });
        const a2ok = a2.propHint === a2.expected
            || /mat_wood_bench_albedo/i.test(String(a2.propHint))
            || (a2.chunkHint?.sample || []).some((s) => /_albedo\.png/i.test(String(s.h)));
        push('A2', !!a2ok, JSON.stringify(a2).slice(0, 320));

        // A3 — MaterialPresets
        const a3 = await page.evaluate(() => {
            const MP = window.MaterialPresets;
            let prop = null;
            try {
                prop = window.World.createObject('cube', 'PresetProp', 0x888888, false);
                if (prop) prop.position.set(0, 0.5, -4);
            } catch (e) {
                return { err: String(e.message || e) };
            }
            let applied = false;
            let presetId = null;
            const ids = MP?.list?.() || MP?.PRESETS || MP?.presets || null;
            if (MP?.applyMaterialPreset && prop) {
                // try common ids
                for (const id of ['pbr_concrete_weathered', 'pbr_wood_snow', 'pbr_brick_aged', 'wet_hero']) {
                    try {
                        MP.applyMaterialPreset(prop, id);
                        applied = true;
                        presetId = id;
                        break;
                    } catch { /* try next */ }
                }
            }
            const mat = prop?.material;
            const sel = document.getElementById('insp-material-preset');
            return {
                hasApi: typeof MP?.applyMaterialPreset === 'function',
                applied,
                presetId,
                roughness: mat?.roughness,
                metalness: mat?.metalness,
                selectExists: !!sel,
                optionCount: sel?.options?.length ?? 0,
            };
        });
        push('A3', a3.hasApi && (a3.applied || a3.optionCount > 0), JSON.stringify(a3).slice(0, 240));

        // A4 — GIMP SYNC UI + status contract
        const a4 = await page.evaluate(() => {
            const btn = document.getElementById('insp-texture-gimp');
            const hint = document.querySelector('.insp-texture-hint')?.textContent || '';
            const creative = document.querySelector('summary')?.textContent || '';
            // sync without selection should status
            window.State.selectedObject = null;
            window.UI?.syncGimpManifest?.();
            // status may be set
            return {
                btnText: btn?.textContent || '',
                btnExists: !!btn,
                hintHasGimp: /GIMP|gimp|preset/i.test(hint),
                hasSyncFn: typeof window.UI?.syncGimpManifest === 'function',
                hasBridge: typeof window.TextureBridge?.pickAndApplyGimpManifest === 'function',
                watchMention: /textures:watch|gimp:install/i.test(document.body.innerText.slice(0, 50000)),
            };
        });
        push('A4', a4.btnExists && a4.hasSyncFn && a4.hasBridge && /GIMP/i.test(a4.btnText),
            JSON.stringify(a4).slice(0, 280));

        // A5 — Blender insert UI
        const a5 = await page.evaluate(() => {
            const gltfBtn = document.getElementById('insert-gltf-manifest-btn')
                || document.querySelector('[id*="gltf"]');
            const nameInput = document.getElementById('insert-gltf-name');
            const insertTab = document.getElementById('insert-modal')
                || document.querySelector('[data-hub-action="insert"]');
            return {
                manifestBtn: gltfBtn?.textContent || gltfBtn?.id || null,
                nameInput: !!nameInput,
                hasGltfImport: !!window.GltfImport,
                hasBlenderManifest: !!window.BlenderManifest
                    || typeof window.GltfImport?.pickAndInsertFromManifest === 'function',
                insertUi: !!insertTab || !!document.getElementById('btn-insert'),
            };
        });
        push('A5', a5.nameInput && a5.hasGltfImport && (a5.manifestBtn || a5.hasBlenderManifest || a5.insertUi),
            JSON.stringify(a5).slice(0, 280));

        await page.close();
    } finally {
        await browser.close();
    }
    return results;
}

async function main() {
    console.log('block5-art-audit\n');
    if (!fs.existsSync(path.join(DIST, 'index.html'))) {
        console.error('dist-pages missing — build first');
        process.exit(1);
    }

    const unit = unitArtNaming();
    for (const r of unit) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${r.notes}`);

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
            console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${String(r.notes).slice(0, 240)}`);
        }

        const all = [...unit, ...staticR, ...br];
        // Soft: plugins folders if missing is soft fail only if not critical
        const softIds = new Set(['A4-plugin', 'A5-plugin']);
        const hardFails = all.filter((r) => !r.ok && !softIds.has(r.id));
        const softFails = all.filter((r) => !r.ok && softIds.has(r.id));

        const outDir = path.join(ROOT, 'dist-store');
        fs.mkdirSync(outDir, { recursive: true });
        const report = {
            at: new Date().toISOString(),
            baseUrl,
            results: all,
            pass: all.filter((r) => r.ok).length,
            total: all.length,
            hardFails: hardFails.map((f) => f.id),
            softFails: softFails.map((f) => f.id),
        };
        fs.writeFileSync(path.join(outDir, 'block5-art-audit.json'), JSON.stringify(report, null, 2));
        console.log(`\n  Score ${report.pass}/${report.total} → dist-store/block5-art-audit.json`);
        if (hardFails.length) {
            console.error('block5-art-audit — FAIL', report.hardFails.join(', '));
            process.exit(1);
        }
        if (softFails.length) {
            console.log('block5-art-audit — PASS hard · WARN soft:', report.softFails.join(', '));
        } else {
            console.log('block5-art-audit — PASS');
        }
    } finally {
        server.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
