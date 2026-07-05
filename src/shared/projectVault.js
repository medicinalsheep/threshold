import { Sync } from './sync.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

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
    cloudEnabled: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),

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

        let cloud = false;
        if (this.cloudEnabled) {
            try {
                await this._cloudUpsert(record);
                cloud = true;
            } catch (e) {
                console.warn('Cloud project save failed:', e);
            }
        }

        const index = getIndex().filter((e) => e.id !== id);
        index.unshift({ id, name: record.name, savedAt: record.savedAt, cloud });
        setIndex(index);
        return { ...record, cloud };
    },

    async loadProject(id) {
        const trimmed = String(id || '').trim().toUpperCase();
        if (!trimmed) throw new Error('Enter a project ID');

        const db = await openDb();
        let record = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(trimmed);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!record && this.cloudEnabled) {
            record = await this._cloudLoad(trimmed);
            if (record) {
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE, 'readwrite');
                    tx.objectStore(STORE).put(record);
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error);
                });
            }
        }

        if (!record) throw new Error('Project not found on this device or cloud');
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

    getCloudHint() {
        return this.cloudEnabled
            ? 'Cloud sync enabled — project IDs work across devices.'
            : 'Local vault only — set Supabase env for cloud project sync.';
    },

    async _cloudUpsert(record) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                id: record.id,
                name: record.name,
                script_input: record.scriptInput || '',
                script_output: record.scriptOutput || '',
                running_code: record.runningCode || '',
                world: record.world || null,
                updated_at: new Date().toISOString()
            })
        });
        if (!res.ok) throw new Error(await res.text());
    },

    async _cloudLoad(id) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}&select=*`, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        if (!res.ok) throw new Error(await res.text());
        const rows = await res.json();
        const row = rows[0];
        if (!row) return null;
        return {
            id: row.id,
            name: row.name,
            savedAt: new Date(row.updated_at).getTime(),
            scriptInput: row.script_input,
            scriptOutput: row.script_output,
            runningCode: row.running_code,
            world: row.world
        };
    }
};

window.ProjectVault = ProjectVault;