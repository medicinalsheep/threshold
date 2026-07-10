#!/usr/bin/env node
/**
 * Verify intent router keyword + parse helpers (no browser).
 * Keep KEYWORD_RULES / parse logic aligned with src/shared/intentRouter.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'shared', 'intentRouter.js');

let failed = 0;
function ok(msg) { console.log(`  ✓ ${msg}`); }
function bad(msg) { console.error(`  ✗ ${msg}`); failed += 1; }

const src = fs.readFileSync(SRC, 'utf8');
const required = [
    'parseIntentResponse',
    'keywordClassify',
    'dispatchIntent',
    'classifyAndRoute',
    'wantsRealisticLighting',
    'export-wizard',
    'agent-portal',
];
required.forEach((s) => {
    if (src.includes(s)) ok(`symbol ${s}`);
    else bad(`missing ${s}`);
});

const VALID_INTENTS = new Set([
    'spawn', 'edit', 'physics', 'sound', 'texture', 'export', 'graphics', 'style', 'other',
]);

const KEYWORD_RULES = [
    { intent: 'export', re: /\b(export|publish|ship|deploy|play\s*store|app\s*store|itch\.io)\b/i },
    { intent: 'export', re: /\bexport\b.*\b(android|ios|windows|steam|web)\b/i },
    { intent: 'texture', re: /\b(gimp|texture|textures|albedo|normal\s*map|textures:watch)\b/i },
    { intent: 'edit', re: /\b(rain|fog|weather|sun|atmosphere|environment|env)\b/i },
    { intent: 'spawn', re: /\b(spawn|add|create|place|put)\b.+\b(box|crate|object|prop|mesh|sphere|cube|wall|floor)\b/i },
    { intent: 'spawn', re: /\b(spawn|create)\b/i },
    { intent: 'graphics', re: /\b(realistic|default\s*lighting|normal\s*lighting|pbr\s*lighting|render\s*mode\s*4|mode\s*4)\b/i },
    { intent: 'graphics', re: /\b(make\s+it\s+look\s+realistic|use\s+realistic|pbr\s+mode)\b/i },
    { intent: 'style', re: /\b(retro|terminal|pixel|toon|shader\s*mode|green\s*screen|hyper\s*neon)\b/i },
    { intent: 'texture', re: /\b(pbr|material)\b/i },
    { intent: 'sound', re: /\b(sound|audio|sfx|music|ambient)\b/i },
    { intent: 'physics', re: /\b(physics|collision|gravity|rigid\s*body|cannon)\b/i },
    { intent: 'other', re: /\b(friends?\s+join|room\s*code|invite\s+link|multiplayer\s+invite|how\s+do\s+(friends|people)\s+join)\b/i },
    { intent: 'other', re: /\b(who\s+can\s+edit|host\s+authoritative|guests?\s+edit)\b/i },
];

function wantsRealisticLighting(message) {
    const m = String(message || '');
    if (/\b(retro|terminal|toon|pixel|hyper|neon\s*style|green\s*screen)\b/i.test(m)) return false;
    return /\b(realistic|default\s*lighting|normal\s*lighting|pbr\s*lighting|render\s*mode\s*4|mode\s*4|make\s+it\s+look\s+realistic)\b/i.test(m);
}

function keywordClassify(message) {
    const msg = String(message || '').trim();
    if (!msg) return null;
    for (const rule of KEYWORD_RULES) {
        if (rule.re.test(msg)) {
            let api = null;
            if (rule.intent === 'graphics' || wantsRealisticLighting(msg)) api = 'Engine.setRenderMode(4)';
            else if (rule.intent === 'style') {
                if (/\bterminal\b/i.test(msg)) api = 'Engine.setRenderMode(2)';
                else if (/\btoon\b/i.test(msg)) api = 'Engine.setRenderMode(1)';
                else if (/\bpixel\b/i.test(msg)) api = 'Engine.setRenderMode(0)';
                else if (/\bhyper\b/i.test(msg)) api = 'Engine.setRenderMode(3)';
            } else if (rule.intent === 'texture') api = 'userData.textures + textures:watch';
            else if (rule.intent === 'spawn') api = 'World.createObject';
            else if (rule.intent === 'export') api = 'ExportWizard';
            else if (rule.intent === 'other' && /\b(join|invite|room\s*code|friends?)\b/i.test(msg)) {
                api = 'Lobby invite + room codes';
            }
            return { intent: rule.intent, api, source: 'keyword' };
        }
    }
    return null;
}

function parseIntentResponse(text, message = '') {
    const raw = String(text || '').trim();
    let intent = 'other';
    let api = null;
    const im = raw.match(/INTENT:\s*(\w+)/i);
    const am = raw.match(/API:\s*(.+)/i);
    if (im) intent = im[1].toLowerCase();
    if (am) api = am[1].trim().split(/\n/)[0].trim();
    if (!im && !am) {
        const kw = keywordClassify(message);
        if (kw) return { ...kw, raw, repaired: 'prose-fallback' };
        return { intent: 'other', api: null, raw, repaired: 'prose-empty' };
    }
    if (!VALID_INTENTS.has(intent)) intent = 'other';
    if (wantsRealisticLighting(message)) {
        intent = 'graphics';
        api = 'Engine.setRenderMode(4)';
    } else if (intent === 'graphics' && api && /setRenderMode\s*\(\s*[0-3]\s*\)/i.test(api)
        && !/\b(retro|terminal|toon|pixel|hyper)\b/i.test(message)) {
        api = 'Engine.setRenderMode(4)';
    }
    if (intent === 'style' && /\b(gimp|texture|textures|albedo|normal\s*map)\b/i.test(message)) {
        intent = 'texture';
        if (!api || /shader|render\s*mode/i.test(api)) api = 'userData.textures + textures:watch';
    }
    return { intent, api, raw };
}

const cases = [
    ['spawn a red box with realistic PBR', 'spawn'],
    ['export my game to android', 'export'],
    ['add gimp texture to the crate', 'texture'],
    ['default realistic lighting', 'graphics'],
    ['make it look realistic', 'graphics'],
    ['add rain and fog', 'edit'],
    ['make it look retro terminal green', 'style'],
    ['how do friends join', 'other'],
    ['hello there', null],
];

console.log('intent-router-verify\n');
cases.forEach(([msg, expected]) => {
    const got = keywordClassify(msg);
    const intent = got?.intent || null;
    if (intent === expected) ok(`keyword "${msg.slice(0, 36)}" → ${intent || 'null'}`);
    else bad(`keyword "${msg}" expected ${expected}, got ${intent}`);
});

// Parse repairs
const repairs = [
    {
        msg: 'default realistic lighting',
        text: 'INTENT: graphics\nAPI: Engine.setRenderMode(3)',
        expectIntent: 'graphics',
        expectApi: /setRenderMode\(4\)/,
    },
    {
        msg: 'add gimp texture to the crate',
        text: 'INTENT: style\nAPI: ShaderRegistry',
        expectIntent: 'texture',
        expectApi: /texture/i,
    },
    {
        msg: 'how do friends join',
        text: 'Share the room code or invite link from the lobby.',
        expectIntent: 'other',
        expectApi: /Lobby|invite|room/i,
    },
];

repairs.forEach((c) => {
    const got = parseIntentResponse(c.text, c.msg);
    const pass = got.intent === c.expectIntent && c.expectApi.test(String(got.api || ''));
    if (pass) ok(`repair "${c.msg.slice(0, 28)}" → ${got.intent} ${got.api}`);
    else bad(`repair "${c.msg}" got ${got.intent} ${got.api}`);
});

// agentPrompts intent prefix
const prompts = fs.readFileSync(path.join(ROOT, 'src', 'shared', 'agentPrompts.js'), 'utf8');
if (prompts.includes('Classify (two lines only')) ok('agentPrompts intent user prefix');
else bad('agentPrompts missing Classify prefix');
if (prompts.includes('NOT an NPC')) ok('agentPrompts intent not-NPC guard');
else bad('agentPrompts missing not-NPC guard');

console.log(failed ? '\nintent-router-verify — FAIL' : '\nintent-router-verify — PASS');
process.exit(failed ? 1 : 0);
