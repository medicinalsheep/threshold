#!/usr/bin/env node
/** H3 — open SKIN on creator and assert procedural-hero copy. */
const puppeteer = require('puppeteer');

const URL = process.env.H3_URL || 'http://127.0.0.1:5173/?surface=creator';

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForSelector('#lobby-solo', { timeout: 45000 });
        await page.click('#lobby-solo');
        await page.waitForFunction(
            () => document.getElementById('lobby-overlay')?.classList.contains('hidden'),
            { timeout: 30000 },
        );
        await page.waitForFunction(
            () => window.AppearanceProfile && window.AvatarManifest,
            { timeout: 60000 },
        );
        await page.evaluate(() => {
            document.querySelector('[data-dock-tab="skin"]')?.click();
            const panel = document.getElementById('player-skin-panel');
            if (panel) panel.style.display = 'block';
            window.AppearanceProfile?.initBodyPresetSelect?.();
        });
        await new Promise((r) => setTimeout(r, 400));
        const info = await page.evaluate(() => {
            const hint = document.getElementById('skin-body-hint')?.innerText || '';
            const sel = document.getElementById('skin-body-preset');
            const opts = [...(sel?.options || [])].map((o) => ({
                v: o.value,
                t: o.textContent,
                title: o.title,
            }));
            const status = document.getElementById('skin-custom-status')?.textContent || '';
            return { hint, opts, status };
        });
        console.log(JSON.stringify(info, null, 2));
        const ok = /procedural hero/i.test(info.hint)
            && info.opts.some((o) => /procedural/i.test(o.t))
            && !info.opts.some((o) => /Male formed/i.test(o.t))
            && /procedural hero/i.test(info.status);
        if (!ok) {
            console.error('H3 UI FAIL');
            process.exit(1);
        }
        console.log('H3 UI PASS');
    } finally {
        await browser.close();
    }
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
