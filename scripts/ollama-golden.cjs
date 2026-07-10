#!/usr/bin/env node
/**
 * Golden eval for Threshold mini models — format, modes, safety, plan, lite perf.
 * Exit 0 if pass rate >= --min (default 0.85).
 *
 * Usage:
 *   npm run ollama:golden
 *   node scripts/ollama-golden.cjs --min 0.9
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MIN = (() => {
    const i = process.argv.indexOf('--min');
    if (i >= 0) return Math.min(1, Math.max(0, parseFloat(process.argv[i + 1]) || 0.85));
    return 0.85;
})();

const NPC = process.env.GOLDEN_NPC || 'threshold-mini-npc';
const DEV = process.env.GOLDEN_DEV || 'threshold-mini-dev';

function httpJson(body, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request({
            hostname: '127.0.0.1',
            port: 11434,
            path: '/api/chat',
            method: 'POST',
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

async function chat(model, system, user, maxTokens = 256) {
    const t0 = Date.now();
    const data = await httpJson({
        model,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        stream: false,
        options: { num_predict: maxTokens, temperature: 0.15, num_ctx: 4096 },
    });
    return { text: (data.message?.content || '').trim(), ms: Date.now() - t0 };
}

// Mirrors runtime repairs (intent + render sanitize)
function parseIntent(text, message) {
    const raw = String(text || '');
    let intent = 'other';
    let api = null;
    const im = raw.match(/INTENT:\s*(\w+)/i);
    const am = raw.match(/API:\s*(.+)/i);
    if (im) intent = im[1].toLowerCase();
    if (am) api = am[1].trim().split(/\n/)[0];
    const wantsReal = /\b(realistic|default\s*lighting|pbr)/i.test(message)
        && !/\b(retro|terminal|toon|pixel|hyper)\b/i.test(message);
    if (wantsReal) {
        intent = 'graphics';
        api = 'Engine.setRenderMode(4)';
    }
    if (intent === 'style' && /\b(gimp|texture)/i.test(message)) intent = 'texture';
    if (!im && !am) {
        if (/friends|join|invite|guest/i.test(message)) return { intent: 'other', api: 'host', twoLine: false };
        if (/gimp|texture|hilod|webp|compress/i.test(message)) return { intent: 'texture', api: 'texture', twoLine: false };
        if (wantsReal) return { intent: 'graphics', api: 'Engine.setRenderMode(4)', twoLine: false };
    }
    return { intent, api, twoLine: !!(im && am), raw };
}

/** Mirror agentPrompts finalizeAgentCode (mode + slop sanitizers) */
function finalizeCode(code, user) {
    let out = String(code || '').trim();
    const fenced = out.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
    if (fenced) out = fenced[1].trim();
    out = out.replace(/World\.createObject\s*\(\s*['"]box['"]/gi, "World.createObject('cube'");
    out = out.replace(
        /World\.createObject\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"](cube|box|sphere|cone|torus)['"]\s*,/gi,
        (full, a, b) => {
            const types = new Set(['cube', 'box', 'sphere', 'cone', 'torus']);
            if (!types.has(String(a).toLowerCase()) && types.has(String(b).toLowerCase())) {
                const t = String(b).toLowerCase() === 'box' ? 'cube' : String(b).toLowerCase();
                return `World.createObject('${t}', '${a}',`;
            }
            return full;
        },
    );
    if (!/\b(clear\s*world|wipe\s*(the\s*)?scene)\b/i.test(user)) {
        out = out.replace(/World\.clearWorld\s*\([^)]*\)\s*;?/gi, '/* clearWorld removed */');
    }
    if (!/World\.createObject/i.test(out) && (/new\s+THREE\.Scene/i.test(out) || /scene\.add/i.test(out))) {
        out = "const m = World.createObject('cube', 'prop', 0x888888, false);";
    }
    let t = null;
    if (/\bterminal\b/i.test(user)) t = 2;
    else if (/\btoon\b/i.test(user)) t = 1;
    else if (/\b(realistic|default\s*lighting|pbr)/i.test(user)) t = 4;
    if (t != null) out = out.replace(/Engine\.setRenderMode\s*\(\s*[0-4]\s*\)/gi, `Engine.setRenderMode(${t})`);
    return out;
}

const INTENT_SYS = `You are the Threshold intent classifier — NOT an NPC.
Reply EXACTLY two lines:
INTENT: spawn|edit|physics|sound|texture|export|graphics|style|other
API: short primary API
Rules: gimp/hilod/webp→texture; realistic→graphics setRenderMode(4); lite tier→graphicsProfile;
friends join/guest edit→other host; generate blocked→validateProductionReady; export→ExportWizard.
Never NPC prose.`;

const CASES = [
    {
        id: 'intent_spawn',
        run: async () => {
            const { text, ms } = await chat(NPC, INTENT_SYS, 'Classify (two lines only — INTENT then API):\nspawn a red box', 64);
            const p = parseIntent(text, 'spawn a red box');
            return { ok: p.intent === 'spawn' && p.twoLine, detail: text, ms };
        },
    },
    {
        id: 'intent_friends_join',
        run: async () => {
            const msg = 'how do friends join';
            const { text, ms } = await chat(NPC, INTENT_SYS, `Classify (two lines only — INTENT then API):\n${msg}`, 64);
            const p = parseIntent(text, msg);
            return { ok: p.intent === 'other' && p.twoLine, detail: text, ms };
        },
    },
    {
        id: 'intent_guest_edit',
        run: async () => {
            const msg = 'can guests edit the world';
            const { text, ms } = await chat(NPC, INTENT_SYS, `Classify (two lines only — INTENT then API):\n${msg}`, 80);
            const p = parseIntent(text, msg);
            return { ok: p.intent === 'other' && /host|guest|authoritative|edit/i.test(text + (p.api || '')), detail: text, ms };
        },
    },
    {
        id: 'intent_gimp',
        run: async () => {
            const msg = 'add gimp texture to the crate';
            const { text, ms } = await chat(NPC, INTENT_SYS, `Classify (two lines only — INTENT then API):\n${msg}`, 64);
            const p = parseIntent(text, msg);
            return { ok: p.intent === 'texture', detail: text, ms };
        },
    },
    {
        id: 'intent_realistic',
        run: async () => {
            const msg = 'default realistic lighting';
            const { text, ms } = await chat(NPC, INTENT_SYS, `Classify (two lines only — INTENT then API):\n${msg}`, 64);
            const p = parseIntent(text, msg);
            return { ok: p.intent === 'graphics' && /setRenderMode\(4\)/.test(p.api || ''), detail: text, ms };
        },
    },
    {
        id: 'intent_terminal',
        run: async () => {
            const msg = 'make it look retro terminal green';
            const { text, ms } = await chat(NPC, INTENT_SYS, `Classify (two lines only — INTENT then API):\n${msg}`, 64);
            const p = parseIntent(text, msg);
            return { ok: p.intent === 'style' && /setRenderMode\(2\)/.test(text), detail: text, ms };
        },
    },
    {
        id: 'intent_hilod',
        run: async () => {
            const msg = 'generate hilod tiers from masters';
            const { text, ms } = await chat(NPC, INTENT_SYS, `Classify (two lines only — INTENT then API):\n${msg}`, 64);
            const p = parseIntent(text, msg);
            return { ok: p.intent === 'texture' && /hilod|texture|compress|webp/i.test(text), detail: text, ms };
        },
    },
    {
        id: 'intent_export',
        run: async () => {
            const msg = 'export web first only';
            const { text, ms } = await chat(NPC, INTENT_SYS, `Classify (two lines only — INTENT then API):\n${msg}`, 64);
            const p = parseIntent(text, msg);
            return { ok: p.intent === 'export', detail: text, ms };
        },
    },
    {
        id: 'intent_generate_blocked',
        run: async () => {
            const msg = 'why is generate blocked';
            const { text, ms } = await chat(NPC, INTENT_SYS, `Classify (two lines only — INTENT then API):\n${msg}`, 64);
            const p = parseIntent(text, msg);
            return { ok: p.intent === 'other' && p.twoLine, detail: text, ms };
        },
    },
    {
        id: 'npc_guest_denied',
        run: async () => {
            const { text, ms } = await chat(
                NPC,
                'You are a multiplayer rules coach. 1-3 sentences.',
                'You are a multiplayer rules coach. Player says: Can I spawn crates as a guest?',
                120,
            );
            const ok = !/^INTENT:/im.test(text) && /host|guest|only|cannot|can't|no\b/i.test(text);
            return { ok, detail: text, ms };
        },
    },
    {
        id: 'npc_cors',
        run: async () => {
            const { text, ms } = await chat(
                NPC,
                'You are an Ollama coach. 1-3 sentences.',
                'You are an Ollama coach. Player says: I get CORS 403 on GitHub Pages',
                120,
            );
            const ok = /ollama:serve|OLLAMA_ORIGINS|cors|origin|localhost|11434|proxy|serve/i.test(text);
            return { ok, detail: text, ms };
        },
    },
    {
        id: 'dev_type_first',
        run: async () => {
            const user = "Fix: World.createObject({ nam: 'crate', type: 'box', color: 0xff0000 });";
            const { text, ms } = await chat(
                DEV,
                'Return ONLY JS. World.createObject(type, name, colorHex, usePhysics) type FIRST. types: cube sphere cone torus.',
                user,
                120,
            );
            const fixed = finalizeCode(text, user);
            const ok = /createObject\s*\(\s*['"]cube['"]\s*,\s*['"]crate['"]/i.test(fixed)
                || (/createObject\s*\(\s*['"]cube['"]/i.test(fixed) && /crate/i.test(fixed));
            return { ok, detail: `raw=${text.slice(0, 80)} fixed=${fixed.slice(0, 80)}`, ms };
        },
    },
    {
        id: 'dev_no_clear',
        run: async () => {
            const user = 'Fix this Threshold script:\n```js\nWorld.clearWorld();\nWorld.createObject(\'cube\', \'a\', 0xffffff, false);\n```';
            const { text, ms } = await chat(
                DEV,
                'Return ONLY JS. Never clearWorld unless asked. Pause guard + mode 4.',
                user,
                200,
            );
            const fixed = finalizeCode(text, user);
            // Pass if clearWorld neutralized; createObject preferred but pause-guard IIFE ok
            const ok = !/World\.clearWorld\s*\(/i.test(fixed)
                && (/createObject/i.test(fixed) || /isPaused/i.test(fixed));
            return { ok, detail: `raw=${text.slice(0, 60)} fixed=${fixed.slice(0, 80)}`, ms };
        },
    },
    {
        id: 'dev_realistic_mode',
        run: async () => {
            const user = 'User asked: "default realistic lighting". Fix:\n```js\nEngine.setRenderMode(3);\n```';
            const { text, ms } = await chat(DEV, 'Return ONLY JS setRenderMode.', user, 48);
            const fixed = finalizeCode(text, user);
            const ok = /setRenderMode\s*\(\s*4\s*\)/.test(fixed);
            return { ok, detail: `raw=${text} fixed=${fixed}`, ms };
        },
    },
    {
        id: 'dev_terminal_mode',
        run: async () => {
            const user = 'User asked terminal green. Fix wrong mode:\n```js\nEngine.setRenderMode(1);\n```';
            const { text, ms } = await chat(DEV, 'Return ONLY JS setRenderMode. terminal→2 toon→1 realistic→4', user, 48);
            const fixed = finalizeCode(text, user);
            const ok = /setRenderMode\s*\(\s*2\s*\)/.test(fixed);
            return { ok, detail: `raw=${text} fixed=${fixed}`, ms };
        },
    },
    {
        id: 'dev_anti_three_scene',
        run: async () => {
            const user = 'Fix this Threshold script:\n```js\nconst scene = new THREE.Scene();\nscene.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xff0000})));\n```';
            const { text, ms } = await chat(
                DEV,
                'Return ONLY Threshold JS. Never new THREE.Scene or scene.add. Use World.createObject.',
                user,
                160,
            );
            const fixed = finalizeCode(text, user);
            const ok = /createObject/i.test(fixed) && !/new THREE\.Scene/i.test(fixed);
            return { ok, detail: `raw=${text.slice(0, 60)} fixed=${fixed.slice(0, 80)}`, ms };
        },
    },
    {
        id: 'plan_has_pipeline',
        run: async () => {
            const { text, ms } = await chat(
                DEV,
                `You are Threshold production planner (medium). Output a compact PLAN only — not JavaScript.
Use: PLAN: title, numbered 1-11 (scope collision mesh textures hilod weather atmosphere shaders interact codegen verify), PERF line.
Include hilod and sequential. Never invent pixel/retro unless user asked.`,
                'Write a Threshold production plan for:\nexterior wood crate, physics, rain, 2k, poly low.',
                450,
            );
            const ok = (/PLAN:/i.test(text) || /^\s*1\./m.test(text))
                && /hilod|texture|2k|webp|gimp|surface|wood|collision|codegen|verify|scope|PERF/i.test(text)
                && !/setRenderMode\(0\)/i.test(text);
            return { ok, detail: text.slice(0, 200), ms };
        },
    },
    {
        id: 'code_lite_few_meshes',
        run: async () => {
            const user = 'Generate realistic Threshold IIFE: IMPLEMENT PLAN lite_yard: grass pad + one wood bench only';
            const { text, ms } = await chat(
                DEV,
                'Return ONLY IIFE JS. Pause guard, mode 4, few meshes for Lite, World.createObject type first.',
                user,
                500,
            );
            const fixed = finalizeCode(text, user);
            const count = (fixed.match(/createObject/gi) || []).length;
            const ok = count >= 1 && count <= 6 && !/World\.clearWorld\s*\(/i.test(fixed);
            return { ok, detail: `createObject×${count} ${fixed.slice(0, 120)}`, ms };
        },
    },
]

async function main() {
    console.log(`ollama:golden — npc=${NPC} dev=${DEV} minPass=${MIN}\n`);

    // probe
    try {
        await new Promise((resolve, reject) => {
            http.get(`${BASE.replace(/\/$/, '')}/api/tags`, { timeout: 4000 }, (res) => {
                res.resume();
                res.statusCode < 300 ? resolve() : reject(new Error(`HTTP ${res.statusCode}`));
            }).on('error', reject);
        });
    } catch (e) {
        console.error(`Ollama offline: ${e.message}`);
        process.exit(2);
    }

    const results = [];
    let passed = 0;
    for (const c of CASES) {
        try {
            const r = await c.run();
            results.push({ id: c.id, ...r });
            console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${c.id}  (${r.ms}ms)`);
            if (!r.ok) console.log(`       ${String(r.detail || '').replace(/\n/g, ' ').slice(0, 140)}`);
            if (r.ok) passed++;
        } catch (e) {
            results.push({ id: c.id, ok: false, detail: e.message, ms: 0 });
            console.log(`FAIL  ${c.id}  ERR ${e.message}`);
        }
    }

    const rate = passed / CASES.length;
    console.log(`\nScore ${passed}/${CASES.length} (${Math.round(rate * 100)}%)  min=${Math.round(MIN * 100)}%`);

    const outDir = path.join(ROOT, 'dist-store');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'ollama-golden.json');
    fs.writeFileSync(outPath, JSON.stringify({
        format: 'threshold-ollama-golden',
        version: 1,
        ranAt: new Date().toISOString(),
        npc: NPC,
        dev: DEV,
        passed,
        total: CASES.length,
        rate,
        min: MIN,
        results,
    }, null, 2));
    console.log(`Wrote ${path.relative(ROOT, outPath)}`);

    if (rate + 1e-9 < MIN) {
        console.error('ollama:golden — FAIL');
        process.exit(1);
    }
    console.log('ollama:golden — PASS');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
