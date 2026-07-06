const DB_NAME = 'threshold_textures_v1';
const STORE = 'textures';
const INDEX_KEY = 'threshold_texture_index';

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
    localStorage.setItem(INDEX_KEY, JSON.stringify(list.slice(0, 120)));
}

function randomId() {
    return `tex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function guessMime(name = '') {
    const lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
}

export const TextureLibrary = {
    async init() {
        return getIndex();
    },

    list() {
        return getIndex().sort((a, b) => b.createdAt - a.createdAt);
    },

    async getMeta(id) {
        return this.list().find((t) => t.id === id) || null;
    },

    async getBlob(id) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(id);
            req.onsuccess = () => resolve(req.result?.blob || null);
            req.onerror = () => reject(req.error);
        });
    },

    async saveWithId(id, blob, meta = {}) {
        const existing = this.list().find((t) => t.id === id);
        if (existing) return existing;

        const record = {
            id,
            name: meta.name || id,
            createdAt: Date.now(),
            mime: meta.mime || blob.type || guessMime(meta.name || ''),
            size: blob.size,
            sourcePath: meta.sourcePath || null,
        };

        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put({ id, blob, meta: record });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });

        const index = getIndex();
        index.unshift(record);
        setIndex(index);
        window.dispatchEvent(new CustomEvent('texture-library-change'));
        return record;
    },

    async saveFromFile(file, meta = {}) {
        const id = randomId();
        const record = {
            id,
            name: meta.name || file.name || `Texture ${id.slice(-4)}`,
            createdAt: Date.now(),
            mime: file.type || guessMime(file.name),
            size: file.size,
            sourcePath: meta.sourcePath || file.name || null,
        };

        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put({ id, blob: file, meta: record });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });

        const index = getIndex();
        index.unshift(record);
        setIndex(index);
        window.dispatchEvent(new CustomEvent('texture-library-change'));
        return record;
    },

    async deleteTexture(id) {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(id);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        setIndex(getIndex().filter((t) => t.id !== id));
        window.dispatchEvent(new CustomEvent('texture-library-change'));
    },

    collectManifestEntries(worldObjects = []) {
        const entries = [];
        const seen = new Set();
        worldObjects.forEach((obj) => {
            const tex = obj.userData?.textures;
            if (!tex) return;
            Object.entries(tex).forEach(([slot, id]) => {
                if (!id) return;
                const key = `${obj.userData?.id || obj.name}:${slot}:${id}`;
                if (seen.has(key)) return;
                seen.add(key);
                const meta = this.list().find((t) => t.id === id);
                entries.push({
                    id,
                    path: meta?.sourcePath || meta?.name || id,
                    objectId: obj.userData?.id || null,
                    objectName: obj.userData?.name || null,
                    slot,
                });
            });
        });
        return entries;
    },
};

window.TextureLibrary = TextureLibrary;