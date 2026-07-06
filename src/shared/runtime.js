import { SceneHistory } from './sceneHistory.js';

function isWorldMutating(code) {
    return /World\.(createObject|clearWorld|addCustom|spawn)|State\.objects\.push/.test(code);
}

function parseEvalLine(err) {
    const stack = err?.stack || '';
    const m = stack.match(/<anonymous>:(\d+):(\d+)/)
        || stack.match(/eval.*?:(\d+):(\d+)/)
        || stack.match(/:(\d+):(\d+)\)?$/m);
    if (!m) return { line: null, column: null };
    return { line: parseInt(m[1], 10), column: parseInt(m[2], 10) };
}

function highlightCompilerError(line) {
    const output = document.getElementById('comp-output');
    const status = document.getElementById('comp-status');
    document.querySelectorAll('.comp-textarea').forEach((ta) => ta.classList.remove('comp-error-highlight'));
    if (line && output) {
        output.classList.add('comp-error-highlight');
        const lines = output.value.split('\n');
        let pos = 0;
        for (let i = 0; i < line - 1 && i < lines.length; i += 1) {
            pos += lines[i].length + 1;
        }
        output.focus();
        output.setSelectionRange(pos, pos + (lines[line - 1]?.length || 0));
    }
    if (status) {
        status.textContent = line ? `ERROR line ${line}` : 'ERROR';
        status.style.opacity = 1;
        status.style.color = '#ff6b6b';
    }
}

function clearCompilerErrorHighlight() {
    document.querySelectorAll('.comp-textarea').forEach((ta) => ta.classList.remove('comp-error-highlight'));
    const status = document.getElementById('comp-status');
    if (status) status.style.color = '';
}

export const Runtime = {
    runningCode: '',
    lastError: '',
    lastErrorLine: null,

    setRunningCode(code, source = 'unknown') {
        this.runningCode = code || '';
        this.lastError = '';
        this.lastErrorLine = null;
        clearCompilerErrorHighlight();
        const el = document.getElementById('comp-running');
        if (el) el.value = this.runningCode;
        window.dispatchEvent(new CustomEvent('threshold:code-update', {
            detail: { code: this.runningCode, source },
        }));
    },

    execute(code, source = 'compiler') {
        const trimmed = (code || '').trim();
        if (!trimmed) return { ok: false, error: 'No code to run' };

        this.setRunningCode(trimmed, source);

        if (!window.State?.isPaused) {
            const worldMutating = isWorldMutating(trimmed);
            const playerSafe = /PlayerController|applySkin|\.traverse\s*\(/i.test(trimmed);
            if (worldMutating && !playerSafe) {
                return { ok: false, error: 'PLAY mode — world locked. Pause (EDIT) to run world code.' };
            }
        }

        const mutates = isWorldMutating(trimmed);
        let checkpoint = false;
        if (mutates) {
            checkpoint = SceneHistory.push(`before:${source}`, { code: trimmed.slice(0, 240) });
        }

        try {
            // eslint-disable-next-line no-eval
            const result = eval(trimmed);
            if (window.UI?.status) window.UI.status('Code running');
            return { ok: true, result };
        } catch (e) {
            const { line } = parseEvalLine(e);
            this.lastError = e.message;
            this.lastErrorLine = line;
            highlightCompilerError(line);
            if (checkpoint) {
                void SceneHistory.revertFailedRun();
            }
            if (window.UI?.status) window.UI.status(`Error: ${e.message}${line ? ` (line ${line})` : ''}`);
            return { ok: false, error: e.message, line };
        }
    },
};

window.Runtime = Runtime;