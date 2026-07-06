/** Sprint H — host texture manifest + guest blob pull */

import { TextureLibrary } from './textureLibrary.js';

const MAX_PUSH_BYTES = 768 * 1024;

function isBundledTexture(meta) {
    const path = String(meta?.sourcePath || meta?.name || '').toLowerCase();
    return path.includes('textures/starter')
        || path.includes('threshold_manifest')
        || path.startsWith('textures/starter_');
}

export function collectSceneTextureIds() {
    const ids = new Set();
    (window.State?.objects || []).forEach((o) => {
        const tex = o.userData?.textures;
        if (!tex) return;
        Object.values(tex).forEach((id) => { if (id) ids.add(id); });
    });
    return [...ids];
}

export function buildHostTextureManifest() {
    const list = TextureLibrary.list();
    return collectSceneTextureIds()
        .map((id) => list.find((t) => t.id === id))
        .filter((meta) => meta && !isBundledTexture(meta))
        .map((meta) => ({
            id: meta.id,
            name: meta.name,
            size: meta.size || 0,
            mime: meta.mime || 'image/png',
            sourcePath: meta.sourcePath || null,
        }));
}

export function getMissingTextures(manifest = []) {
    const have = new Set(TextureLibrary.list().map((t) => t.id));
    return manifest.filter((m) => m?.id && !have.has(m.id));
}

async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export const TextureManifestSync = {
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
        const missing = getMissingTextures(manifest);
        this._guestMissing = missing;
        this._guestReceived = manifest.length - missing.length;

        if (!missing.length) {
            window.TextureBridge?.rehydrateScene?.();
            await window.TextureHilod?.rehydrateAfterSync?.();
            window.CreatorHud?.updateSync?.();
            return;
        }

        window.UI?.status?.(`Pulling ${missing.length} custom texture(s) from host…`);
        window.Network?.requestTextureBlobs?.(missing.map((m) => m.id));
        window.CreatorHud?.updateSync?.();
    },

    async hostPushTexture(conn, textureId) {
        if (!conn?.open || this._pushing.has(textureId)) return false;
        const meta = await TextureLibrary.getMeta(textureId);
        const blob = await TextureLibrary.getBlob(textureId);
        if (!blob || !meta || isBundledTexture(meta)) return false;
        if (blob.size > MAX_PUSH_BYTES) {
            conn.send?.({
                type: 'TEXTURE_BLOB_SKIP',
                id: textureId,
                reason: `Texture too large (${Math.round(blob.size / 1024)}KB) — use EXPORT bundle`,
            });
            return false;
        }

        this._pushing.add(textureId);
        try {
            const data = await blobToBase64(blob);
            conn.send?.({
                type: 'TEXTURE_BLOB',
                id: textureId,
                name: meta.name,
                mime: meta.mime || blob.type || 'image/png',
                size: blob.size,
                sourcePath: meta.sourcePath || null,
                data,
            });
            return true;
        } finally {
            this._pushing.delete(textureId);
        }
    },

    async hostHandlePull(conn, textureIds = []) {
        for (const id of [...new Set(textureIds)]) {
            await this.hostPushTexture(conn, id);
        }
    },

    async receiveTexture(payload) {
        if (!payload?.id || !payload?.data) return false;
        const binary = atob(payload.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: payload.mime || 'image/png' });
        await TextureLibrary.saveWithId(payload.id, blob, {
            name: payload.name,
            sourcePath: payload.sourcePath,
            mime: payload.mime,
        });
        this._guestReceived += 1;
        this._guestMissing = this._guestMissing.filter((m) => m.id !== payload.id);
        window.TextureBridge?.rehydrateScene?.();
        await window.TextureHilod?.rehydrateAfterSync?.();
        window.CreatorHud?.updateSync?.();
        if (!this._guestMissing.length) {
            window.UI?.status?.('Custom textures synced from host');
        }
        return true;
    },

    onTextureSkipped(payload) {
        if (!payload?.id) return;
        this._guestMissing = this._guestMissing.filter((m) => m.id !== payload.id);
        window.UI?.status?.(`Skipped texture ${payload.id}: ${payload.reason || 'too large'}`);
        window.CreatorHud?.updateSync?.();
    },
};

window.TextureManifestSync = TextureManifestSync;