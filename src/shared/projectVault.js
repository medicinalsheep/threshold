import { Sync } from './sync.js';

const DB_NAME = 'threshold_projects_v1';
const STORE = 'projects';
const INDEX_KEY = 'threshold_project_index';

function randomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function getIndex() {
    try {
        return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
    } catch {
        return [];
    }
}

function setIndex(list) {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list.slice(0, 40)));
}

export const ProjectVault = {
    captureCurrent() {
        return {
            scriptInput: document.getElementById('comp-input')?.value || '',
            scriptOutput: document.getElementById('comp-output')?.value || '',
            runningCode: window.Runtime?.runningCode || '',
            world: Sync.capture(),
        };
    },

    async saveProject(name) {
        const payload = this.captureCurrent();
        const id = randomId();
        const record = {
            id,
            name: name || `Project-${id}`,
            savedAt: Date.now(),
            ...payload,
        };

        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(record);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });

        const index = getIndex().filter((e) => e.id !== id);
        index.unshift({ id, name: record.name, savedAt: record.savedAt });
        setIndex(index);
        return record;
    },

    async loadProject(id) {
        const db = await openDb();
        const record = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        if (!record) throw new Error('Project not found');
        return record;
    },

    listLocal() {
        return getIndex();
    },

    async deleteProject(id) {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(id);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        setIndex(getIndex().filter((e) => e.id !== id));
    },

    applyToCompiler(record) {
        const input = document.getElementById('comp-input');
        const output = document.getElementById('comp-output');
        const running = document.getElementById('comp-running');
        if (input) input.value = record.scriptInput || '';
        if (output) output.value = record.scriptOutput || '';
        if (running && record.runningCode) {
            window.Runtime?.setRunningCode?.(record.runningCode, 'project-vault');
        }
        window.Compiler?.checkReady?.();
    },
};

window.ProjectVault = ProjectVault;