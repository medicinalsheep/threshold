/** Sprint A — scene undo stack (pre-compile / pre-clearWorld snapshots) */

import { Sync } from './sync.js';
import { ViewPrefs } from './viewPrefs.js';

const MAX_ENTRIES = 24;

function compilerMeta(extra = {}) {
    return {
        scriptInput: document.getElementById('comp-input')?.value || '',
        scriptOutput: document.getElementById('comp-output')?.value || '',
        runningCode: window.Runtime?.runningCode || '',
        ...extra,
    };
}

export const SceneHistory = {
    _stack: [],
    _restoring: false,

    shouldTrack() {
        if (this._restoring) return false;
        if (Sync.isApplying?.()) return false;
        const mode = window.Network?.mode;
        if (mode === 'guest' || mode === 'spectate') return false;
        return !!window.State && !!window.Sync?.capture;
    },

    push(label = 'checkpoint', meta = {}) {
        if (!this.shouldTrack()) return false;
        const state = Sync.capture();
        if (!state) return false;
        const authorKey = meta.authorKey || window.Session?.playerKey || 'local';
        this._stack.push({
            label,
            at: Date.now(),
            state,
            meta: compilerMeta({ ...meta, authorKey }),
        });
        if (this._stack.length > MAX_ENTRIES) this._stack.shift();
        this._notify();
        return true;
    },

    canUndo(opts = {}) {
        if (this._restoring) return false;
        const mineOnly = opts.mineOnly ?? ViewPrefs.get('undoMineOnly', false);
        if (mineOnly) return this.mineOnlyCount() > 0;
        return this._stack.length > 0;
    },

    depth() {
        return this._stack.length;
    },

    _popEntry(mineOnly = false) {
        if (!this._stack.length) return null;
        if (!mineOnly) return this._stack.pop();

        const key = String(window.Session?.playerKey || '').toUpperCase();
        for (let i = this._stack.length - 1; i >= 0; i -= 1) {
            const author = String(this._stack[i].meta?.authorKey || '').toUpperCase();
            if (author === key) {
                return this._stack.splice(i, 1)[0];
            }
        }
        return null;
    },

    async undo(opts = {}) {
        const mineOnly = opts.mineOnly ?? ViewPrefs.get('undoMineOnly', false);
        if (!this._stack.length) {
            if (!opts.silent) window.UI?.status?.('Nothing to undo');
            return false;
        }
        this._restoring = true;
        try {
            const entry = this._popEntry(mineOnly);
            if (!entry) {
                if (!opts.silent) {
                    window.UI?.status?.(mineOnly ? 'No undo checkpoint for your edits' : 'Nothing to undo');
                }
                return false;
            }
            await Sync.applyState(entry.state);
            const input = document.getElementById('comp-input');
            const output = document.getElementById('comp-output');
            if (input && entry.meta.scriptInput != null) input.value = entry.meta.scriptInput;
            if (output && entry.meta.scriptOutput != null) output.value = entry.meta.scriptOutput;
            if (entry.meta.runningCode != null) {
                window.Runtime?.setRunningCode?.(entry.meta.runningCode, 'undo');
            }
            const who = entry.meta?.authorKey ? ` · ${entry.meta.authorKey}` : '';
            if (!opts.silent) window.UI?.status?.(`Undid — ${entry.label}${who}`);
            this._notify();
            if (window.Network?.mode === 'host') window.Network?.scheduleBroadcast?.();
            return true;
        } catch (e) {
            console.warn('[scene-history] undo failed', e);
            if (!opts.silent) window.UI?.status?.(`Undo failed: ${e.message}`);
            return false;
        } finally {
            this._restoring = false;
        }
    },

    async revertFailedRun() {
        return this.undo({ silent: true });
    },

    clear() {
        this._stack = [];
        this._notify();
    },

    mineOnlyCount() {
        const key = String(window.Session?.playerKey || '').toUpperCase();
        return this._stack.filter((e) => String(e.meta?.authorKey || '').toUpperCase() === key).length;
    },

    _notify() {
        window.dispatchEvent(new CustomEvent('threshold:history-change', {
            detail: {
                depth: this._stack.length,
                canUndo: this.canUndo(),
                mineOnly: ViewPrefs.get('undoMineOnly', false),
                mineCount: this.mineOnlyCount(),
            },
        }));
    },
};

export function initSceneHistory() {
    const btn = document.getElementById('btn-scene-undo');
    if (btn) {
        btn.addEventListener('click', () => { void SceneHistory.undo(); });
    }

    const mineCb = document.getElementById('undo-mine-only');
    if (mineCb) {
        mineCb.checked = ViewPrefs.get('undoMineOnly', false);
        mineCb.addEventListener('change', () => {
            ViewPrefs.set('undoMineOnly', !!mineCb.checked);
            SceneHistory._notify();
        });
    }

    window.addEventListener('threshold:history-change', () => {
        if (!btn) return;
        const mineOnly = ViewPrefs.get('undoMineOnly', false);
        const n = mineOnly ? SceneHistory.mineOnlyCount() : SceneHistory.depth();
        btn.disabled = n < 1;
        const scope = mineOnly ? 'your edits' : 'any author';
        btn.title = n
            ? `Restore previous scene (${n} checkpoint${n === 1 ? '' : 's'} — ${scope})`
            : 'No scene history yet';
        btn.textContent = n
            ? (mineOnly ? `UNDO MINE (${n})` : `UNDO SCENE (${n})`)
            : (mineOnly ? 'UNDO MINE' : 'UNDO SCENE');
    });

    window.addEventListener('keydown', (e) => {
        if (!(e.ctrlKey || e.metaKey) || e.code !== 'KeyZ' || e.shiftKey) return;
        const el = document.activeElement;
        const id = el?.id;
        if (el?.tagName === 'TEXTAREA' && ['comp-input', 'comp-output', 'comp-running', 'prompt-output', 'prompt-idea'].includes(id)) {
            return;
        }
        if (!SceneHistory.canUndo({ mineOnly: ViewPrefs.get('undoMineOnly', false) })) return;
        e.preventDefault();
        void SceneHistory.undo();
    });

    SceneHistory._notify();
}

window.SceneHistory = SceneHistory;
window.initSceneHistory = initSceneHistory;