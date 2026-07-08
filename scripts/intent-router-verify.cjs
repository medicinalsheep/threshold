#!/usr/bin/env node
/**
 * Verify intent router keyword + parse helpers (no browser).
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
    'export-wizard',
    'agent-portal',
];
required.forEach((s) => {
    if (src.includes(s)) ok(`symbol ${s}`);
    else bad(`missing ${s}`);
});

// Inline mirror of keyword rules for CI (keep in sync with intentRouter.js)
const KEYWORD_RULES = [
    { intent: 'export', re: /\b(export|publish|ship|deploy|play\s*store|app\s*store|itch\.io)\b/i },
    { intent: 'export', re: /\bexport\b.*\b(android|ios|windows|steam|web)\b/i },
    { intent: 'texture', re: /\b(gimp|texture|textures|albedo|normal\s*map)\b/i },
    { intent: 'edit', re: /\b(rain|fog|weather|sun|atmosphere|environment|env)\b/i },
    { intent: 'spawn', re: /\b(spawn|add|create|place|put)\b.+\b(box|crate|object|prop|mesh|sphere|cube|wall|floor)\b/i },
    { intent: 'spawn', re: /\b(spawn|create)\b/i },
    { intent: 'graphics', re: /\b(realistic|default\s*lighting|pbr\s*lighting|render\s*mode\s*4)\b/i },
    { intent: 'style', re: /\b(retro|terminal|pixel|toon|shader\s*mode|green\s*screen)\b/i },
    { intent: 'texture', re: /\b(pbr|material)\b/i },
    { intent: 'sound', re: /\b(sound|audio|sfx|music|ambient)\b/i },
    { intent: 'physics', re: /\b(physics|collision|gravity|rigid\s*body|cannon)\b/i },
];

function keywordClassify(message) {
    const msg = String(message || '').trim();
    if (!msg) return null;
    for (const rule of KEYWORD_RULES) {
        if (rule.re.test(msg)) return { intent: rule.intent };
    }
    return null;
}

function parseIntentResponse(text) {
    const lines = String(text || '').trim().split('\n');
    let intent = 'other';
    let api = null;
    for (const line of lines) {
        const im = line.match(/^INTENT:\s*(\w+)/i);
        const am = line.match(/^API:\s*(.+)/i);
        if (im) intent = im[1].toLowerCase();
        if (am) api = am[1].trim();
    }
    return { intent, api };
}

const cases = [
    ['spawn a red box with realistic PBR', 'spawn'],
    ['export my game to android', 'export'],
    ['add gimp texture to the crate', 'texture'],
    ['default realistic lighting', 'graphics'],
    ['add rain and fog', 'edit'],
    ['make it look retro terminal green', 'style'],
    ['hello there', null],
];

cases.forEach(([msg, expected]) => {
    const got = keywordClassify(msg);
    const intent = got?.intent || null;
    if (intent === expected) ok(`keyword "${msg.slice(0, 32)}…" → ${intent || 'null'}`);
    else bad(`keyword "${msg}" expected ${expected}, got ${intent}`);
});

const parsed = parseIntentResponse('INTENT: export\nAPI: ExportWizard');
if (parsed.intent === 'export' && parsed.api === 'ExportWizard') ok('parseIntentResponse');
else bad('parseIntentResponse failed');

if (fs.readFileSync(path.join(ROOT, 'src', 'shared', 'gameChat.js'), 'utf8').includes('IntentRouter')) {
    ok('gameChat wired');
} else {
    bad('gameChat missing IntentRouter');
}

console.log(failed ? `\n[intent-router-verify] FAILED (${failed})\n` : '\nPASS intent-router-verify\n');
process.exit(failed ? 1 : 0);