import { ViewPrefs } from './viewPrefs.js';
import { AiMemoryFreeze } from './aiMemoryFreeze.js';
import { WorkFolderScope } from './workFolderScope.js';

const PREFS_KEY = 'ollamaRunPrefs';

let chain = Promise.resolve();
let active = null;
let queueDepth = 0;

function loadPrefs() {
    return ViewPrefs.get(PREFS_KEY, { allowParallelLocal: false });
}

function savePrefs(patch) {
    const next = { ...loadPrefs(), ...patch };
    ViewPrefs.set(PREFS_KEY, next);
    window.dispatchEvent(new CustomEvent('ollama-queue-change', { detail: next }));
    return next;
}

function emitStatus(extra = {}) {
    window.dispatchEvent(new CustomEvent('ollama-queue-status', {
        detail: {
            active: active?.model || null,
            taskId: active?.taskId || null,
            tier: active?.tier || null,
            queueDepth,
            allowParallel: loadPrefs().allowParallelLocal,
            ...extra,
        },
    }));
}

export const OllamaRunQueue = {
    getPrefs() { return loadPrefs(); },
    setPrefs(patch) { return savePrefs(patch); },
    getStatus() {
        return { active: active?.model || null, taskId: active?.taskId || null, queueDepth, allowParallel: loadPrefs().allowParallelLocal };
    },
    _parallelGuard() {
        const objects = window.State?.objects || [];
        const gltfCount = objects.filter((o) => o.userData?.type === 'gltf' || o.userData?.isGltf).length;
        const scope = WorkFolderScope.getScope();
        if (scope.parkMode === 'none' && gltfCount > 6) {
            const msg = `Parallel local + ${gltfCount} GLBs + full world may OOM — switch working folder to Scene or Build`;
            window.UI?.status?.(msg);
            return { warn: true, gltfCount, scope: scope.id };
        }
        if (gltfCount > 12) {
            throw new Error(`Too many GLB models (${gltfCount}) for parallel local run — use sequential queue or park GLBs`);
        }
        return null;
    },

    async run(meta, fn) {
        if (loadPrefs().allowParallelLocal) {
            this._parallelGuard();
            emitStatus({ note: 'parallel-local' });
            await AiMemoryFreeze.enter(meta);
            try { return await fn(); } finally { await AiMemoryFreeze.exit(); }
        }
        queueDepth += 1;
        emitStatus();
        const job = chain.then(async () => {
            active = meta;
            queueDepth = Math.max(0, queueDepth - 1);
            emitStatus({ phase: 'running' });
            await AiMemoryFreeze.enter(meta);
            try { return await fn(); } finally {
                await AiMemoryFreeze.exit();
                active = null;
                emitStatus({ phase: 'idle' });
            }
        });
        chain = job.catch(() => {});
        return job;
    },
    reset() { chain = Promise.resolve(); active = null; queueDepth = 0; emitStatus(); },
};

window.OllamaRunQueue = OllamaRunQueue;