#!/usr/bin/env node
/**
 * Import compiler / scene training pairs into bootcamp JSONL.
 *
 * npm run bootcamp:import -- --file training/bootcamp/datasets/raw/pair.json
 * npm run bootcamp:import -- --input "// draft" --output "(function(){...})();"
 * npm run bootcamp:import -- --file batch.jsonl
 * cat pair.json | npm run bootcamp:import -- --stdin
 */
const fs = require('fs');
const path = require('path');
const { loadBootcampConfig, bootcampPath } = require('./bootcamp-lib.cjs');

function arg(name) {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : null;
}

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const file = arg('--file');
const tierArg = arg('--tier');
const taskArg = arg('--task');
const inputArg = arg('--input');
const outputArg = arg('--output');
const dryRun = flags.has('--dry-run');
const saveRaw = !flags.has('--no-save-raw');

const destMap = {
    small: 'datasets/small/npc.jsonl',
    medium: 'datasets/medium/compiler.jsonl',
    large: 'datasets/large/scenes.jsonl',
};

function defaultTask(tier) {
    if (tier === 'small') return 'npc_chat';
    if (tier === 'large') return 'scene_script';
    return 'dev_suggest';
}

function defaultTier(task) {
    if (task === 'scene_script' || task === 'prompter_generate') return 'large';
    if (task === 'npc_chat' || task === 'intent_classify') return 'small';
    return 'medium';
}

function formatUserContent(content, task) {
    const text = String(content || '').trim();
    if (!text) return '';
    if (text.includes('```') || task === 'npc_chat' || task === 'intent_classify') return text;
    return `Improve or complete:\n\`\`\`js\n${text}\n\`\`\``;
}

function inferFromAssistant(assistant, task, tier, userContent = '') {
    if (taskArg || tierArg) {
        return { task: taskArg || task, tier: tierArg || tier };
    }
    const user = String(userContent || '');
    if (user.includes('Improve or complete') || user.includes('Fix this Threshold')) {
        const patch = user.includes('Fix this') || /hasPhysic|nam:|typo/i.test(user);
        return { task: patch ? 'dev_patch' : 'dev_suggest', tier: 'medium' };
    }
    const code = String(assistant || '').trim();
    const creates = (code.match(/World\.createObject/g) || []).length;
    if (/^\(function\s*\(|^\(\s*\)\s*=>/.test(code) && creates >= 2 && code.length > 320) {
        return { task: 'scene_script', tier: 'large' };
    }
    return { task, tier };
}

function normalizeRaw(raw) {
    if (raw.messages?.length >= 2) {
        let task = raw.task || taskArg || defaultTask(tierArg || 'medium');
        let tier = raw.tier || tierArg || defaultTier(task);
        ({ task, tier } = inferFromAssistant(raw.messages[1].content, task, tier, raw.messages[0].content));
        return {
            task,
            tier,
            user: raw.messages[0].content,
            assistant: raw.messages[1].content,
        };
    }
    let task = raw.task || taskArg || defaultTask(tierArg || 'medium');
    const user = raw.input || raw.prompt || raw.user || '';
    const assistant = String(raw.output || raw.code || raw.assistant || '').trim();
    let tier = raw.tier || tierArg || defaultTier(task);
    ({ task, tier } = inferFromAssistant(assistant, task, tier, user));
    return {
        task,
        tier,
        user: formatUserContent(user, task),
        assistant,
    };
}

function toRow(norm) {
    if (!norm.user || !norm.assistant) {
        throw new Error('Pair needs input + output (or messages[0/1])');
    }
    return {
        task: norm.task,
        messages: [
            { role: 'user', content: norm.user },
            { role: 'assistant', content: norm.assistant },
        ],
    };
}

function loadEntries() {
    if (inputArg != null && outputArg != null) {
        return [normalizeRaw({ input: inputArg, output: outputArg, task: taskArg, tier: tierArg })];
    }

    if (flags.has('--stdin')) {
        const text = fs.readFileSync(0, 'utf8').trim();
        if (!text) throw new Error('--stdin received empty payload');
        if (text.includes('\n') && !text.trimStart().startsWith('{')) {
            return text.split('\n').filter(Boolean).map((line) => normalizeRaw(JSON.parse(line)));
        }
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed.map(normalizeRaw);
        return [normalizeRaw(parsed)];
    }

    if (!file) {
        console.log('Usage: npm run bootcamp:import -- --file <path> [--tier small|medium|large] [--task dev_suggest]');
        console.log('       npm run bootcamp:import -- --input "..." --output "..."');
        console.log('       npm run bootcamp:import -- --file batch.jsonl');
        console.log('       cat pair.json | npm run bootcamp:import -- --stdin');
        console.log('Flags: --dry-run  --no-save-raw');
        process.exit(1);
    }

    const cfg = loadBootcampConfig();
    const abs = path.isAbsolute(file) ? file : bootcampPath(cfg, file);
    if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);

    const text = fs.readFileSync(abs, 'utf8').trim();
    if (abs.endsWith('.jsonl')) {
        return text.split('\n').filter(Boolean).map((line) => {
            const parsed = JSON.parse(line);
            if (parsed.messages) return normalizeRaw(parsed);
            return normalizeRaw(parsed);
        });
    }

    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(normalizeRaw);
    return [normalizeRaw(parsed)];
}

function appendRow(cfg, norm, row) {
    const dest = bootcampPath(cfg, destMap[norm.tier] || destMap.medium);
    if (dryRun) {
        console.log(`  [dry-run] ${norm.tier} → ${path.relative(cfg.root, dest)} (${norm.task})`);
        return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.appendFileSync(dest, `${JSON.stringify(row)}\n`);
    console.log(`  ✓ ${norm.tier} → ${path.relative(cfg.root, dest)} (${norm.task})`);
}

function saveRawCopy(cfg, rawSource) {
    if (!saveRaw || dryRun) return;
    const rawDir = bootcampPath(cfg, 'datasets/raw');
    fs.mkdirSync(rawDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(rawDir, `imported-${stamp}.json`);
    fs.writeFileSync(dest, JSON.stringify(rawSource, null, 2));
    console.log(`  raw copy → ${path.relative(cfg.root, dest)}`);
}

const cfg = loadBootcampConfig();
let entries;
try {
    entries = loadEntries();
} catch (e) {
    console.error(`bootcamp:import — ${e.message}`);
    process.exit(1);
}

console.log(`bootcamp:import — ${entries.length} pair(s)${dryRun ? ' (dry-run)' : ''}\n`);

let failed = 0;
entries.forEach((norm, i) => {
    try {
        const row = toRow(norm);
        appendRow(cfg, norm, row);
        if (i === 0 && entries.length === 1) {
            saveRawCopy(cfg, {
                input: norm.user,
                output: norm.assistant,
                task: norm.task,
                tier: norm.tier,
            });
        }
    } catch (e) {
        console.error(`  ✗ pair ${i + 1}: ${e.message}`);
        failed += 1;
    }
});

if (failed) {
    console.log('\nbootcamp:import — FAIL');
    process.exit(1);
}

console.log(dryRun ? '\nbootcamp:import — dry-run OK' : '\nbootcamp:import — PASS');
if (!dryRun) console.log('  Next: npm run bootcamp:build && npm run models:mini');
process.exit(0);