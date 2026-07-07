import { ViewPrefs } from './viewPrefs.js';

export const PREFS_KEY = 'workFolderScope';

/** What stays loaded while local models run — reduces OOM on modest PCs. */
export const WORK_SCOPES = {
    minimal: {
        id: 'minimal',
        label: 'Minimal grid',
        hint: 'Grid + player only — frees the most RAM for local models',
        parkMode: 'full',
        suspendAmbient: true,
        suspendLod: true,
    },
    scene: {
        id: 'scene',
        label: 'Active scene',
        hint: 'Keep placed objects; park GLB imports & LOD extras',
        parkMode: 'gltf',
        suspendAmbient: true,
        suspendLod: true,
    },
    build: {
        id: 'build',
        label: 'Build focus',
        hint: 'Scene + primitives; park GLB, LOD extras & ambient audio',
        parkMode: 'heavy',
        suspendAmbient: true,
        suspendLod: true,
    },
    full: {
        id: 'full',
        label: 'Full world',
        hint: 'Freeze screen only — no asset unload (strong PC)',
        parkMode: 'none',
        suspendAmbient: false,
        suspendLod: false,
    },
};

function loadPrefs() {
    return ViewPrefs.get(PREFS_KEY, { scopeId: 'scene', freezeOnLocal: true });
}

function savePrefs(patch) {
    const next = { ...loadPrefs(), ...patch };
    ViewPrefs.set(PREFS_KEY, next);
    window.dispatchEvent(new CustomEvent('work-folder-change', { detail: next }));
    return next;
}

export const WorkFolderScope = {
    scopes: WORK_SCOPES,

    getPrefs() {
        return loadPrefs();
    },

    setPrefs(patch) {
        return savePrefs(patch);
    },

    getScope() {
        const id = loadPrefs().scopeId || 'scene';
        return WORK_SCOPES[id] || WORK_SCOPES.scene;
    },

    shouldFreezeOnLocal() {
        return loadPrefs().freezeOnLocal !== false;
    },

    scopeLabel() {
        return this.getScope().label;
    },

    renderSelectHtml(selectId = 'work-folder-scope', extraClass = '') {
        const prefs = loadPrefs();
        const cls = extraClass ? ` ${extraClass}` : '';
        const opts = Object.values(WORK_SCOPES).map((s) => {
            const sel = s.id === prefs.scopeId ? ' selected' : '';
            return `<option value="${s.id}"${sel} title="${s.hint}">${s.label}</option>`;
        }).join('');
        return `<select id="${selectId}" class="insert-input${cls}" title="Working folder — what stays in memory during local model runs">${opts}</select>`;
    },

    bindSelect(selectId = 'work-folder-scope') {
        const el = document.getElementById(selectId);
        if (!el || el.dataset.wired) return;
        el.dataset.wired = '1';
        el.addEventListener('change', () => {
            this.setPrefs({ scopeId: el.value });
            window.UI?.status?.(`Working folder: ${this.scopeLabel()}`);
        });
    },

    bindFreezeCheckbox(checkId = 'work-folder-freeze') {
        const el = document.getElementById(checkId);
        if (!el || el.dataset.wired) return;
        el.dataset.wired = '1';
        el.checked = this.shouldFreezeOnLocal();
        el.addEventListener('change', () => {
            this.setPrefs({ freezeOnLocal: el.checked });
            window.UI?.status?.(el.checked ? 'Freeze screen during local models' : 'No freeze — local models run live');
        });
    },
};

window.WorkFolderScope = WorkFolderScope;