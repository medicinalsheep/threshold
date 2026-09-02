#!/usr/bin/env node
/**
 * Wave 9 pre-train probe — origin (empty SYSTEM vs coach override),
 * walk/avatar, lobby opener, art slug. Writes dist-store/wave9-mini-probe.json
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist-store', 'wave9-mini-probe.json');
const NPC = 'threshold-mini-npc';
const DEV = 'threshold-mini-dev';
const MOB = 'threshold-mini-mobile';

function httpJson(body, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request({
            hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
            timeout: timeoutMs,
        }, (res) => {
            let d = '';
            res.on('data', (c) => { d += c; });
            res.on('end', () => {
                try { resolve(JSON.parse(d)); } catch (e) { reject(new Error(d.slice(0, 200))); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(payload);
        req.end();
    });
}

async function chat(model, system, user, numPredict = 160) {
    const t0 = Date.now();
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: user });
    const data = await httpJson({
        model, messages, stream: false,
        options: { num_predict: numPredict, temperature: 0.12 },
    });
    return { text: (data.message?.content || '').trim(), ms: Date.now() - t0 };
}

const results = [];
function score(id, ok, text, ms, notes = '') {
    results.push({ id, ok, ms, notes, text: String(text).slice(0, 280) });
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id}  ${(ms / 1000).toFixed(1)}s  ${String(text).replace(/\n/g, ' · ').slice(0, 140)}`);
}

function originOk(t) {
    const s = String(t || '');
    const hasAuthor = /medicinalsheep/i.test(s);
    const claimsAnthropic = /\b(anthropic|claude)\b/i.test(s)
        && !/not\s+(anthropic|claude)|never\s+(anthropic|claude)/i.test(s);
    const claimsUk = /uk\s+studio/i.test(s) && !/not\s+a\s+uk|no\s+uk|none/i.test(s);
    const claimsOllamaGames = /ollama\s+games/i.test(s) && !/not\s+(ollama\s+games)/i.test(s);
    return hasAuthor && !claimsAnthropic && !claimsUk && !claimsOllamaGames;
}

async function main() {
    console.log('wave9-mini-probe\n');

    // Origin — empty SYSTEM (Modelfile ORIGIN should win)
    for (const [id, model, q] of [
        ['O-npc-who', NPC, 'Who made Threshold?'],
        ['O-npc-anthropic', NPC, 'Is this made by Anthropic?'],
        ['O-npc-uk', NPC, 'Which UK studio developed this?'],
        ['O-mob-who', MOB, 'Who made Threshold?'],
        ['O-dev-who', DEV, 'Who made Threshold? Short answer.'],
    ]) {
        const { text, ms } = await chat(model, '', q, 120);
        score(id, originOk(text), text, ms);
    }

    // Origin — coach SYSTEM override (mirrors ollama:golden)
    {
        const { text, ms } = await chat(NPC, 'You are a Threshold coach. Short product-accurate answers.', 'Who made Threshold?', 120);
        score('O-npc-who-coach-sys', originOk(text), text, ms, 'golden-style system override');
    }

    // Walk / avatar — should be weak pre-wave9
    const walkQs = [
        ['W-clips', NPC, 'What animation clips do starter avatars ship?'],
        ['W-audit', NPC, 'How do I verify player walk is not broken?'],
        ['W-tps', NPC, 'Player walk is frozen. What should I check in TPS?'],
        ['W-honest', NPC, 'Are starter avatars real Blender characters?'],
        ['W-intent-walk', NPC, 'Classify (two lines only — INTENT then API):\nrun avatar walk audit'],
        ['W-intent-opener', NPC, 'Classify (two lines only — INTENT then API):\ncopy grok opener from lobby'],
    ];
    for (const [id, model, q] of walkQs) {
        const { text, ms } = await chat(model, '', q, 140);
        let ok = false;
        if (id === 'W-clips') {
            ok = /idle/i.test(text) && /walk/i.test(text) && /run/i.test(text);
        } else if (id === 'W-audit') {
            ok = /avatar:audit|walk:verify|walk:smoke/i.test(text) && !/perf:harness/i.test(text);
        } else if (id === 'W-tps') {
            ok = /third[-\s]?person/i.test(text)
                && !/performance system|gpu temp/i.test(text);
        } else if (id === 'W-honest') {
            ok = /procedural|mannequin|avatar:gen/i.test(text)
                && !/threshold-mini-npc is a local fine-tune/i.test(text);
        } else if (id === 'W-intent-walk') {
            ok = /INTENT:/i.test(text) && /avatar:audit|walk:verify|walk:smoke/i.test(text);
        } else if (id === 'W-intent-opener') {
            ok = /INTENT:/i.test(text) && /how to|opener|thresholdOpener/i.test(text);
        }
        score(id, ok, text, ms);
    }

    // Lobby opener + surface (product)
    {
        const { text, ms } = await chat(NPC, '', 'How do I give Grok a Threshold starter prompt without hitting ENTER?', 140);
        score('L-opener', /how to|opener|thresholdOpener/i.test(text), text, ms);
    }

    // Art slug still (wave8)
    {
        const { text, ms } = await chat(NPC, '', 'You are a GIMP mentor. Player says: What files for Engine object name Mat Brick Wall?', 120);
        score('A-slug', /textures\/mat_brick_wall_albedo\.png/.test(text), text, ms);
    }

    // Dev: walk smoke mention
    {
        const { text, ms } = await chat(DEV, '', 'Write a short production plan for fixing frozen player walk (Threshold 10.21.5).', 280);
        score('D-walk-plan',
            /HumanMesh|updateWalk|avatar:audit|walk:smoke|locomotion|third person/i.test(text)
            && !/PLAN:.*wood crate|wet_hero material/i.test(text),
            text, ms);
    }

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const report = {
        at: new Date().toISOString(),
        pass: results.filter((r) => r.ok).length,
        fail: results.filter((r) => !r.ok).length,
        total: results.length,
        failedIds: results.filter((r) => !r.ok).map((r) => r.id),
        results,
    };
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(`\n  Score ${report.pass}/${report.total}  fail=${report.fail}`);
    console.log(`  → ${path.relative(ROOT, OUT)}`);
    process.exit(report.fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
