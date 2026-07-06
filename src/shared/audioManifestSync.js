/** Sprint G — host audio manifest + guest clip pull */

import { SoundLibrary } from './soundLibrary.js';

const MAX_PUSH_BYTES = 480 * 1024;

function isStarterClipId(id) {
    return String(id || '').startsWith('starter_');
}

export function collectSceneSoundClipIds() {
    const ids = new Set();
    (window.State?.objects || []).forEach((o) => {
        const clip = o.userData?.soundClipId;
        if (clip) ids.add(clip);
    });
    return [...ids];
}

export function buildHostAudioManifest() {
    const ids = collectSceneSoundClipIds();
    const list = SoundLibrary.list();
    return ids
        .filter((id) => !isStarterClipId(id))
        .map((id) => {
            const meta = list.find((c) => c.id === id);
            return {
                id,
                name: meta?.name || id,
                size: meta?.size || 0,
                mime: meta?.mime || 'audio/webm',
            };
        });
}

export function getMissingClips(manifest = []) {
    const have = new Set(SoundLibrary.list().map((c) => c.id));
    return manifest.filter((m) => m?.id && !have.has(m.id));
}

async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            resolve(String(dataUrl).split(',')[1] || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export const AudioManifestSync = {
    _guestMissing: [],
    _guestReceived: 0,
    _pushing: new Set(),

    resetGuest() {
        this._guestMissing = [];
        this._guestReceived = 0;
    },

    getGuestStatus() {
        const total = this._guestMissing.length + this._guestReceived;
        if (!total) return null;
        return {
            missing: this._guestMissing.length,
            received: this._guestReceived,
            total,
        };
    },

    async onGuestManifest(manifest = []) {
        const missing = getMissingClips(manifest);
        this._guestMissing = missing;
        this._guestReceived = manifest.length - missing.length;

        if (!missing.length) {
            window.UI?.status?.('Audio manifest synced — all custom clips local');
            window.CreatorHud?.updateSync?.();
            return;
        }

        window.UI?.status?.(`Pulling ${missing.length} custom sound clip(s) from host…`);
        window.Network?.requestAudioClips?.(missing.map((m) => m.id));
        window.CreatorHud?.updateSync?.();
    },

    async hostPushClip(conn, clipId) {
        if (!conn?.open || this._pushing.has(clipId)) return false;
        const meta = await SoundLibrary.getMeta(clipId);
        const blob = await SoundLibrary.getBlob(clipId);
        if (!blob || !meta) return false;
        if (blob.size > MAX_PUSH_BYTES) {
            conn.send?.({
                type: 'AUDIO_CLIP_SKIP',
                id: clipId,
                reason: `Clip too large (${Math.round(blob.size / 1024)}KB) — use EXPORT bundle`,
            });
            return false;
        }

        this._pushing.add(clipId);
        try {
            const data = await blobToBase64(blob);
            conn.send?.({
                type: 'AUDIO_CLIP',
                id: clipId,
                name: meta.name,
                mime: meta.mime || blob.type || 'audio/webm',
                size: blob.size,
                data,
            });
            return true;
        } finally {
            this._pushing.delete(clipId);
        }
    },

    async hostHandlePull(conn, clipIds = []) {
        const ids = [...new Set(clipIds)].filter((id) => id && !isStarterClipId(id));
        for (const id of ids) {
            await this.hostPushClip(conn, id);
        }
    },

    async receiveClip(payload) {
        if (!payload?.id || !payload?.data) return false;
        const binary = atob(payload.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: payload.mime || 'audio/webm' });
        await SoundLibrary.saveClipWithId(payload.id, payload.name || payload.id, blob, {
            context: 'network-sync',
        });
        this._guestReceived += 1;
        this._guestMissing = this._guestMissing.filter((m) => m.id !== payload.id);
        window.CreatorHud?.updateSync?.();
        if (!this._guestMissing.length) {
            window.UI?.status?.('Custom audio clips synced from host');
        }
        return true;
    },

    onClipSkipped(payload) {
        if (!payload?.id) return;
        this._guestMissing = this._guestMissing.filter((m) => m.id !== payload.id);
        window.UI?.status?.(`Skipped audio ${payload.id}: ${payload.reason || 'too large'}`);
        window.CreatorHud?.updateSync?.();
    },
};

window.AudioManifestSync = AudioManifestSync;