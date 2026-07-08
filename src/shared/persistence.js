import { Sync } from './sync.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_URL } from '../config.js';

const DB_NAME = 'threshold_scenes_v1';
const STORE = 'scenes';
const LOCAL_INDEX = 'threshold_scene_index';

function randomSceneCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'code' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function getLocalIndex() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_INDEX) || '[]');
    } catch {
        return [];
    }
}

function setLocalIndex(list) {
    localStorage.setItem(LOCAL_INDEX, JSON.stringify(list));
}

export const Persistence = {
    cloudEnabled: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),

    async saveWorld(name) {
        const code = randomSceneCode();
        const record = {
            code,
            name: name || `World-${code}`,
            data: Sync.capture(),
            savedAt: Date.now()
        };

        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(record);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });

        const index = getLocalIndex().filter((e) => e.code !== code);
        index.unshift({ code, name: record.name, savedAt: record.savedAt, cloud: false });
        setLocalIndex(index.slice(0, 50));

        if (this.cloudEnabled) {
            try {
                await this._cloudUpsert(record);
                const idx = getLocalIndex();
                const entry = idx.find((e) => e.code === code);
                if (entry) entry.cloud = true;
                setLocalIndex(idx);
            } catch (e) {
                console.warn('Cloud save failed:', e);
            }
        }

        return record;
    },

    async loadWorld(code) {
        const trimmed = (code || '').trim().toUpperCase();
        if (!trimmed) throw new Error('Enter a world code');

        if (this.cloudEnabled) {
            try {
                const cloud = await this._cloudLoad(trimmed);
                if (cloud) {
                    await Sync.applyState(cloud.data);
                    return cloud;
                }
            } catch (e) {
                console.warn('Cloud load failed:', e);
            }
        }

        const db = await openDb();
        const record = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(trimmed);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!record) throw new Error('World not found on this device — try cloud code or import file');
        await Sync.applyState(record.data);
        return record;
    },

    listLocal() {
        return getLocalIndex();
    },

    getShareUrl(code) {
        const base = APP_URL.split('?')[0];
        const sep = base.includes('?') ? '&' : '?';
        return `${base}${sep}world=${code}`;
    },

    async importFile(file) {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (parsed.format === 'threshold-game' && parsed.world) {
            const state = { ...parsed.world, immersive: parsed.immersive || null };
            const record = {
                code: randomSceneCode(),
                name: parsed.game?.name || 'Imported game',
                data: state,
                savedAt: Date.now(),
            };
            const db = await openDb();
            await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).put(record);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
            await Sync.applyState(state);
            return record;
        }

        const record = parsed;
        if (!record.data) throw new Error('Invalid world file');
        const db = await openDb();
        const code = record.code || randomSceneCode();
        record.code = code;
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(record);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        await Sync.applyState(record.data);
        return record;
    },

    exportFile(record) {
        const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `threshold_world_${record.code}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    async _cloudUpsert(record) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/scenes`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                code: record.code,
                name: record.name,
                data: record.data,
                updated_at: new Date().toISOString()
            })
        });
        if (!res.ok) throw new Error(await res.text());
    },

    async _cloudLoad(code) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/scenes?code=eq.${code}&select=*`, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        if (!res.ok) throw new Error(await res.text());
        const rows = await res.json();
        return rows[0] || null;
    }
};

window.Persistence = Persistence;