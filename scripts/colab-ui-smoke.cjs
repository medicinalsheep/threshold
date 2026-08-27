#!/usr/bin/env node
/** Creator vs player smoke for optional Colab pipeline UI. */
const puppeteer = require('puppeteer');

const BASE = process.env.COLAB_SMOKE_URL || 'http://127.0.0.1:5173';

async function enter(page) {
    await page.waitForSelector('#lobby-solo', { timeout: 45000 });
    await page.click('#lobby-solo');
    await page.waitForFunction(
        () => document.getElementById('lobby-overlay')?.classList.contains('hidden'),
        { timeout: 30000 },
    );
    await page.waitForFunction(
        () => window.ColabPipeline?._bound && window.SurfaceProfile,
        { timeout: 60000 },
    );
    await page.evaluate(() => window.AgentPortal?.hide?.());
}

async function creatorChecks(browser) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${BASE}/?surface=creator`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await enter(page);
    const before = await page.evaluate(() => {
        const details = document.getElementById('setup-colab-details');
        const hub = document.querySelector('[data-hub-action="colab"]');
        const portal = document.getElementById('agent-portal-open-colab');
        const vis = (el) => !!(el && getComputedStyle(el).display !== 'none' && !el.hidden);
        return {
            surface: window.SurfaceProfile?.get?.(),
            details: !!details,
            hub: !!hub,
            portal: !!portal,
            detailsHiddenBySurface: details ? getComputedStyle(details).display === 'none' : true,
            hubHiddenBySurface: hub ? getComputedStyle(hub).display === 'none' : true,
        };
    });
    await page.evaluate(() => {
        window.SceneDock?.openTab?.('setup');
        const d = document.getElementById('setup-colab-details');
        if (d) d.open = true;
    });
    await page.evaluate(() => document.getElementById('setup-open-colab')?.click());
    await page.waitForFunction(() => {
        const p = document.getElementById('colab-pipeline-panel');
        return p && !p.hidden;
    }, { timeout: 8000 });
    await page.evaluate(() => {
        const chk = document.getElementById('colab-pipeline-optin');
        if (chk && !chk.checked) chk.click();
    });
    await page.waitForFunction(() => window.ColabPipeline?.isOptedIn?.() === true, { timeout: 3000 });
    await page.waitForFunction(() => {
        const chips = document.getElementById('agent-status-chips')?.innerText || '';
        return /Colab/i.test(chips);
    }, { timeout: 12000 }).catch(() => {});
    const after = await page.evaluate(() => {
        const panel = document.getElementById('colab-pipeline-panel');
        const status = document.getElementById('colab-pipeline-status')?.textContent || '';
        const chip = window.ColabPipeline?.chip?.();
        const chips = document.getElementById('agent-status-chips')?.innerText || '';
        const ext = [...panel.querySelectorAll('a')].some((a) => /Google\.colab/i.test(a.href));
        const notebook = [...panel.querySelectorAll('a')].some((a) => /threshold_pbr_starter/i.test(a.href));
        return {
            panelOpen: panel && !panel.hidden,
            status,
            chip,
            chipsHasColab: /Colab/i.test(chips),
            ext,
            notebook,
            title: document.getElementById('colab-pipeline-title')?.textContent || '',
        };
    });
    await page.evaluate(() => document.getElementById('colab-pipeline-close')?.click());
    const closed = await page.evaluate(() => document.getElementById('colab-pipeline-panel')?.hidden === true);
    await page.evaluate(() => window.CornerHub?.runAction?.('colab'));
    const reopened = await page.evaluate(() => document.getElementById('colab-pipeline-panel')?.hidden === false);
    await page.close();
    return { before, after, closed, reopened };
}

async function playerChecks(browser) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${BASE}/?surface=player`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await enter(page);
    const info = await page.evaluate(() => {
        const details = document.getElementById('setup-colab-details');
        const hub = document.querySelector('[data-hub-action="colab"]');
        const portal = document.getElementById('agent-portal-open-colab');
        const panel = document.getElementById('colab-pipeline-panel');
        const cs = (el) => (el ? getComputedStyle(el).display : 'missing');
        window.ColabPipeline?.open?.();
        return {
            surface: window.SurfaceProfile?.get?.(),
            detailsDisplay: cs(details),
            hubDisplay: cs(hub),
            portalDisplay: cs(portal),
            panelDisplay: cs(panel),
            chip: window.ColabPipeline?.chip?.(),
        };
    });
    await page.close();
    return info;
}

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
        const creator = await creatorChecks(browser);
        const player = await playerChecks(browser);
        console.log(JSON.stringify({ creator, player }, null, 2));
        const ok = creator.before.surface === 'creator'
            && creator.before.details && creator.before.hub && creator.before.portal
            && !creator.before.detailsHiddenBySurface
            && creator.after.panelOpen
            && /opted in/i.test(creator.after.status)
            && creator.after.chip
            && creator.after.ext
            && creator.after.notebook
            && creator.closed
            && creator.reopened
            && player.surface === 'player'
            && player.detailsDisplay === 'none'
            && player.hubDisplay === 'none'
            && player.portalDisplay === 'none'
            && player.chip == null;
        if (!ok) {
            console.error('COLAB UI SMOKE FAIL');
            process.exit(1);
        }
        console.log('COLAB UI SMOKE PASS');
    } finally {
        await browser.close();
    }
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
