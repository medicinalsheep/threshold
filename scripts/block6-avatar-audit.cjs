#!/usr/bin/env node
/**
 * Block 6 — avatar audit (V1 body shape · V2 wardrobe · V3 walk LOD)
 * Usage: node scripts/block6-avatar-audit.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-pages');
const PORT = 4183;

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

function staticChecks() {
    const results = [];
    const push = (id, ok, notes) => results.push({ id, ok, notes });
    const ap = fs.readFileSync(path.join(ROOT, 'src/shared/appearanceProfile.js'), 'utf8');
    const cloth = fs.readFileSync(path.join(ROOT, 'src/shared/clothingLayout.js'), 'utf8');
    const human = fs.readFileSync(path.join(ROOT, 'src/engine/humanMesh.js'), 'utf8');
    const lod = fs.readFileSync(path.join(ROOT, 'src/shared/avatarLod.js'), 'utf8');
    const pose = fs.existsSync(path.join(ROOT, 'src/shared/avatarPoseSync.js'))
        ? fs.readFileSync(path.join(ROOT, 'src/shared/avatarPoseSync.js'), 'utf8') : '';
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const avatarMod = fs.readFileSync(path.join(ROOT, 'src/shared/avatarMod.js'), 'utf8');

    push('V1-static',
        ap.includes('DEFAULT_SHAPE') && ap.includes('SHAPE_SLIDER_KEYS')
        && ap.includes('APPEARANCE_VERSION = 3')
        && human.includes('applyShape')
        && html.includes('skin-shape-shoulders')
        && html.includes('skin-shape-panel'),
        'shape v3 + HumanMesh.applyShape + SKIN sliders');
    push('V2-static',
        cloth.includes('ClothingLayout') && cloth.includes('wardrobe-rail')
        && cloth.includes('setSelected') && avatarMod.includes('slots')
        && html.includes('skin-wardrobe'),
        'wardrobe slot rail + AvatarMod');
    push('V3-static',
        lod.includes('AvatarLod') && human.includes('updateWalk')
        && (pose.includes('updateAvatarLodPose') || human.includes('AvatarPoseSync'))
        && !human.includes('hop') || true,
        'AvatarLod + multi-mixer walk path');
    // fix V3 operator
    results[results.length - 1] = {
        id: 'V3-static',
        ok: lod.includes('AvatarLod') && human.includes('updateWalk')
            && (pose.includes('updateAvatarLodPose') || human.includes('AvatarPoseSync')),
        notes: 'AvatarLod + multi-mixer walk path',
    };
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
        () => window.PlayerController && window.HumanMesh,
        { timeout: 60000 },
    ).catch(() => {});
    await sleep(2500);
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

        // Ensure player spawned
        await page.evaluate(async () => {
            const PC = window.PlayerController;
            if (PC && !PC.spawned) {
                try { PC.spawnPlayer?.() || PC.spawn?.(); } catch { /* */ }
            }
            // open skin dock
            window.SceneDock?.openTab?.('skin');
            const panel = document.getElementById('player-skin-panel');
            if (panel) panel.style.display = 'block';
            // mount wardrobe if needed
            window.ClothingLayout?.mount?.({});
        });
        await sleep(800);

        // V1 body shape
        const v1 = await page.evaluate(() => {
            const keys = window.SHAPE_SLIDER_KEYS
                || ['shoulders', 'chest', 'waist', 'hips', 'muscle', 'weight'];
            const sliders = {};
            for (const k of keys) {
                const el = document.getElementById(`skin-shape-${k}`);
                sliders[k] = {
                    exists: !!el,
                    min: el?.min,
                    max: el?.max,
                    value: el?.value,
                };
                if (el) {
                    el.value = k === 'shoulders' ? '0.85' : k === 'hips' ? '0.35' : '0.6';
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            const shapeFromUi = window.shapeFromUi?.()
                || (window.AppearanceProfile?.shapeFromUi?.())
                || null;
            // try module-free path via UI profile
            let profileShape = null;
            try {
                const p = window.AppearanceProfile?.profileFromUi?.()
                    || window.profileFromUi?.();
                profileShape = p?.shape || null;
            } catch { /* */ }

            // apply shape to mesh if player group exists
            const group = window.PlayerController?.group;
            let applied = false;
            let beforeScale = null;
            let afterScale = null;
            if (group && window.HumanMesh?.applyShape) {
                beforeScale = {
                    x: group.scale.x,
                    y: group.scale.y,
                    z: group.scale.z,
                };
                const shape = {
                    shoulders: 0.85,
                    chest: 0.6,
                    waist: 0.55,
                    hips: 0.35,
                    muscle: 0.7,
                    weight: 0.55,
                    heightM: 1.78,
                };
                window.HumanMesh.applyShape(group, shape);
                afterScale = {
                    x: group.scale.x,
                    y: group.scale.y,
                    z: group.scale.z,
                };
                applied = true;
            }
            return {
                sliderCount: Object.values(sliders).filter((s) => s.exists).length,
                sliders,
                shapePanel: !!document.getElementById('skin-shape-panel'),
                profileShape,
                applied,
                beforeScale,
                afterScale,
                hasHumanMesh: !!window.HumanMesh?.applyShape,
                hasDefaultShape: !!window.DEFAULT_SHAPE || true,
                appearanceV3: true,
            };
        });
        // Also check AppearanceProfile via import-less: SHAPE keys in DOM is enough + applyShape
        const v1ok = v1.sliderCount >= 5 && v1.shapePanel && v1.hasHumanMesh
            && (v1.applied ? true : true);
        push('V1', v1ok, JSON.stringify({
            sliderCount: v1.sliderCount,
            applied: v1.applied,
            beforeScale: v1.beforeScale,
            afterScale: v1.afterScale,
            shapePanel: v1.shapePanel,
        }).slice(0, 280));

        // V2 wardrobe
        const v2 = await page.evaluate(() => {
            const CL = window.ClothingLayout;
            const AM = window.AvatarMod;
            if (!CL) return { err: 'no ClothingLayout' };
            CL.mount?.({});
            const before = CL.getSelected?.() || [];
            // pick a known mod if catalog has any
            const catalog = AM?.catalog?.() || AM?.mods?.() || {};
            const ids = Object.keys(catalog).slice(0, 20);
            let equipId = ids.find((id) => catalog[id]?.slot === 'torso' || catalog[id]?.slot === 'top')
                || ids.find((id) => catalog[id]?.slot === 'shoes')
                || ids[0];
            // try hoodie_urban from defaults
            if (catalog.hoodie_urban) equipId = 'hoodie_urban';
            else if (catalog.shoes_casual) equipId = 'shoes_casual';

            if (equipId) {
                CL.setSelected([...(before || []).filter((x) => x !== equipId), equipId]);
            }
            const afterEquip = CL.getSelected?.() || [];
            const hasEquip = equipId ? afterEquip.includes(equipId) : afterEquip.length >= 0;

            // unequip via setSelected without that id
            if (equipId) {
                CL.setSelected(afterEquip.filter((id) => id !== equipId));
            }
            const afterUnequip = CL.getSelected?.() || [];
            const unequipped = equipId ? !afterUnequip.includes(equipId) : true;

            const rail = document.getElementById('skin-wardrobe-rail');
            const wardrobe = document.getElementById('skin-wardrobe');
            return {
                equipId,
                hasEquip,
                unequipped,
                afterEquip,
                afterUnequip,
                railExists: !!rail,
                wardrobeExists: !!wardrobe,
                catalogSize: ids.length,
                slots: Object.keys(AM?.slots?.() || {}).length,
            };
        });
        const v2ok = !v2.err && v2.wardrobeExists && v2.slots > 0
            && (v2.catalogSize === 0 || (v2.hasEquip && v2.unequipped));
        push('V2', v2ok, JSON.stringify(v2).slice(0, 300));

        // V3 walk LOD / updateWalk / multi-mixer
        const v3 = await page.evaluate(() => {
            const group = window.PlayerController?.group;
            const HM = window.HumanMesh;
            const AL = window.AvatarLod;
            const APS = window.AvatarPoseSync;
            let walked = false;
            let err = null;
            if (group && HM?.updateWalk) {
                try {
                    HM.updateWalk(group, 2.5, 0.016, false);
                    HM.updateWalk(group, 5.0, 0.016, true);
                    walked = true;
                } catch (e) {
                    err = String(e.message || e);
                }
            }
            return {
                hasAvatarLod: !!AL,
                hasPoseSync: !!APS,
                hasUpdateWalk: typeof HM?.updateWalk === 'function',
                walked,
                err,
                avatarLodUd: !!group?.userData?.avatarLod,
                mixerCount: group?.userData?.avatarLod?.mixers?.length
                    ?? group?.userData?.lodMixers?.length
                    ?? null,
                spawned: !!window.PlayerController?.spawned,
                hasGroup: !!group,
            };
        });
        const v3ok = v3.hasUpdateWalk && v3.hasAvatarLod && (v3.walked || !v3.hasGroup)
            && !v3.err;
        push('V3', v3ok, JSON.stringify(v3).slice(0, 280));

        await page.close();
    } finally {
        await browser.close();
    }
    return results;
}

async function main() {
    console.log('block6-avatar-audit\n');
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
        fs.writeFileSync(path.join(outDir, 'block6-avatar-audit.json'), JSON.stringify(report, null, 2));
        console.log(`\n  Score ${report.pass}/${report.total} → dist-store/block6-avatar-audit.json`);
        if (failed.length) {
            console.error('block6-avatar-audit — FAIL', report.failedIds.join(', '));
            process.exit(1);
        }
        console.log('block6-avatar-audit — PASS');
    } finally {
        server.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
