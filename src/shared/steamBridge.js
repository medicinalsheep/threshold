/**
 * Phase M — Renderer Steam API (achievements, overlay).
 * No-op on web/Capacitor; active when Electron + steamworks.js + Steam client.
 */

const unlockedThisSession = new Set();

function steamApi() {
    return window.ThresholdShell?.steam || null;
}

export const SteamBridge = {
    get available() {
        return !!this._status?.available;
    },

    _status: null,

    async init() {
        const api = steamApi();
        if (!api?.status) {
            this._status = { available: false, reason: 'Not Electron shell' };
            return this._status;
        }
        try {
            this._status = await api.status();
            if (this._status.available) {
                document.body.classList.add('shell-steam');
                console.log(`[Steam] ${this._status.persona || 'connected'} (${this._status.appId})`);
            }
        } catch (err) {
            this._status = { available: false, reason: err?.message || 'Steam status failed' };
        }
        return this._status;
    },

    async status() {
        if (!this._status) await this.init();
        return this._status;
    },

    async unlock(id, { silent = true } = {}) {
        if (!id || unlockedThisSession.has(id)) return { ok: false, skipped: true };
        const api = steamApi();
        if (!api?.unlockAchievement) return { ok: false, reason: 'No Steam API' };
        const already = await api.isAchievementUnlocked(id);
        if (already) {
            unlockedThisSession.add(id);
            return { ok: true, already: true };
        }
        const result = await api.unlockAchievement(id);
        if (result?.ok) {
            unlockedThisSession.add(id);
            if (!silent) window.UI?.status?.(`Achievement: ${id}`);
        }
        return result;
    },

    async openOverlay(dialog = 'friends') {
        const api = steamApi();
        if (!api?.openOverlay) return { ok: false };
        return api.openOverlay(dialog);
    },

    async listAchievements() {
        const api = steamApi();
        if (!api?.listAchievements) return [];
        return api.listAchievements();
    },
};

export function initSteamBridge() {
    if (window.ThresholdShell?.kind !== 'electron') return;
    SteamBridge.init().catch(() => {});
    window.SteamBridge = SteamBridge;
}