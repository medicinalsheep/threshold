const DB_NAME = 'threshold_sounds_v1';
const STORE = 'clips';
const INDEX_KEY = 'threshold_sound_index';

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
    localStorage.setItem(INDEX_KEY, JSON.stringify(list.slice(0, 80)));
}

function randomId() {
    return `sfx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function pickMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export const SoundLibrary = {
    recorder: null,
    stream: null,
    chunks: [],
    recording: false,

    async init() {
        return getIndex();
    },

    list() {
        return getIndex().sort((a, b) => b.createdAt - a.createdAt);
    },

    async getMeta(id) {
        return this.list().find((c) => c.id === id) || null;
    },

    hasAllClipIds(ids = []) {
        if (!ids.length) return true;
        const have = new Set(this.list().map((c) => c.id));
        return ids.every((id) => have.has(id));
    },

    countClipIds(ids = []) {
        const have = new Set(this.list().map((c) => c.id));
        return ids.filter((id) => have.has(id)).length;
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

    async saveClipWithId(id, name, blob, meta = {}) {
        const existing = this.list().find((c) => c.id === id);
        if (existing) return existing;

        const record = {
            id,
            name: name || id,
            createdAt: Date.now(),
            mime: blob.type || 'audio/wav',
            size: blob.size,
            context: meta.context || '',
            targetType: meta.targetType || 'world',
            targetId: meta.targetId || null,
            isTC: !!(meta.isTC || meta.isThresholdChild),
            tcEd: meta.tcEd || meta.childEdition || null,
            license: meta.license || null,
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
        window.dispatchEvent(new CustomEvent('sound-library-change'));
        return record;
    },

    async saveClip(name, blob, meta = {}) {
        const id = randomId();
        const record = {
            id,
            name: name || `Sound ${id.slice(-4)}`,
            createdAt: Date.now(),
            mime: blob.type || 'audio/webm',
            size: blob.size,
            context: meta.context || '',
            targetType: meta.targetType || 'world',
            targetId: meta.targetId || null,
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
        window.dispatchEvent(new CustomEvent('sound-library-change'));
        return record;
    },

    async deleteClip(id) {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(id);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        setIndex(getIndex().filter((c) => c.id !== id));
        window.dispatchEvent(new CustomEvent('sound-library-change'));
    },

    async assignToObject(obj, clipId, trigger = 'collision') {
        if (!obj?.userData) return;
        obj.userData.soundMode = 'clip';
        obj.userData.soundClipId = clipId;
        obj.userData.soundTrigger = trigger;
    },

    async startRecording() {
        if (this.recording) return false;
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Microphone not supported on this device');
        }
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.chunks = [];
        const mime = pickMimeType();
        this.recorder = mime
            ? new MediaRecorder(this.stream, { mimeType: mime })
            : new MediaRecorder(this.stream);
        this.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.chunks.push(e.data);
        };
        this.recorder.start(100);
        this.recording = true;
        return true;
    },

    async stopRecording() {
        if (!this.recording || !this.recorder) return null;
        return new Promise((resolve) => {
            this.recorder.onstop = () => {
                const type = this.recorder.mimeType || 'audio/webm';
                const blob = new Blob(this.chunks, { type });
                this.chunks = [];
                this.recording = false;
                this.stream?.getTracks().forEach((t) => t.stop());
                this.stream = null;
                this.recorder = null;
                resolve(blob);
            };
            this.recorder.stop();
        });
    },

    cancelRecording() {
        if (this.recorder?.state === 'recording') this.recorder.stop();
        this.stream?.getTracks().forEach((t) => t.stop());
        this.chunks = [];
        this.recording = false;
        this.stream = null;
        this.recorder = null;
    },
};

window.SoundLibrary = SoundLibrary;