import { ViewPrefs } from './viewPrefs.js';
import { stripCodeFences } from './agentPrompts.js';

const QUEUE_KEY = 'trainingImportQueue';

function formatUserContent(input, task = 'dev_suggest') {
    const text = String(input || '').trim();
    if (!text) return '';
    if (text.includes('```') || task === 'npc_chat' || task === 'intent_classify') return text;
    return `Improve or complete:\n\`\`\`js\n${text}\n\`\`\``;
}

function inferTaskTier(output, taskHint, input = '') {
    if (taskHint === 'scene_script' || taskHint === 'prompter_generate') {
        return { task: 'scene_script', tier: 'large' };
    }
    if (taskHint === 'npc_chat' || taskHint === 'intent_classify') {
        return { task: taskHint, tier: 'small' };
    }
    const user = String(input || '');
    if (user.includes('Improve or complete') || user.includes('Fix this')) {
        return { task: user.includes('Fix this') ? 'dev_patch' : 'dev_suggest', tier: 'medium' };
    }
    const code = stripCodeFences(output);
    const creates = (code.match(/World\.createObject/g) || []).length;
    if (/^\(function\s*\(|^\(\s*\)\s*=>/.test(code) && creates >= 2 && code.length > 320) {
        return { task: 'scene_script', tier: 'large' };
    }
    return { task: taskHint || 'dev_suggest', tier: 'medium' };
}

function downloadBlob(filename, content, mime = 'application/json') {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

export const TrainingImport = {
    buildRow(input, output, options = {}) {
        const cleanIn = String(input || '').trim();
        const cleanOut = stripCodeFences(output);
        if (!cleanIn || !cleanOut) return null;

        const { task, tier } = inferTaskTier(cleanOut, options.task, cleanIn);
        const userContent = options.userContent || formatUserContent(cleanIn, task);

        return {
            task,
            tier,
            messages: [
                { role: 'user', content: userContent },
                { role: 'assistant', content: cleanOut },
            ],
            meta: options.meta || {},
        };
    },

    buildRawPair(input, output, options = {}) {
        const row = this.buildRow(input, output, options);
        if (!row) return null;
        return {
            input: row.messages[0].content,
            output: row.messages[1].content,
            task: row.task,
            tier: row.tier,
            meta: row.meta,
        };
    },

    getCompilerPair() {
        const input = document.getElementById('comp-input')?.value?.trim() || '';
        const output = document.getElementById('comp-output')?.value?.trim() || '';
        return { input, output };
    },

    getQueue() {
        return ViewPrefs.get(QUEUE_KEY, []);
    },

    enqueue(row) {
        const q = this.getQueue();
        q.push({ ...row, queuedAt: new Date().toISOString() });
        ViewPrefs.set(QUEUE_KEY, q.slice(-50));
        return q.length;
    },

    clearQueue() {
        ViewPrefs.set(QUEUE_KEY, []);
        this.syncQueueUi();
    },

    syncQueueUi() {
        const n = this.getQueue().length;
        const btn = document.getElementById('agent-training-export-queue');
        if (btn) {
            btn.style.display = n > 0 ? 'block' : 'none';
            btn.textContent = `EXPORT QUEUE (${n})`;
        }
    },

    captureFromCompiler(options = {}) {
        const { input, output } = this.getCompilerPair();
        if (!input) throw new Error('Compiler input is empty');
        if (!output?.trim()) throw new Error('Compiler output is empty — run SMART DEV suggest first');

        const row = this.buildRow(input, output, options);
        if (!row) throw new Error('Could not build training pair');

        const raw = {
            input: row.messages[0].content,
            output: row.messages[1].content,
            task: row.task,
            tier: row.tier,
            meta: row.meta,
        };

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const base = `threshold-training-pair-${ts}`;

        if (options.download !== false) {
            downloadBlob(`${base}.json`, JSON.stringify(raw, null, 2));
            downloadBlob(`${base}.jsonl`, `${JSON.stringify({ task: row.task, messages: row.messages })}\n`, 'application/x-ndjson');
        }

        if (options.queue) this.enqueue(row);
        this.syncQueueUi();

        return { row, raw, base };
    },

    exportQueue() {
        const q = this.getQueue();
        if (!q.length) throw new Error('Training queue is empty');
        const lines = q.map((r) => JSON.stringify({ task: r.task, messages: r.messages })).join('\n');
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        downloadBlob(`threshold-training-queue-${ts}.jsonl`, `${lines}\n`, 'application/x-ndjson');
        return q.length;
    },

    cliImportHint(base) {
        return `npm run bootcamp:import -- --file training/bootcamp/datasets/raw/${base}.json`;
    },
};

window.TrainingImport = TrainingImport;