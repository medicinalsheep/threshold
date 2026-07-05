/**
 * Phase M — Steamworks IPC handlers (achievements, overlay, persona).
 */
const { getSteamworks } = require('./steamworks-shim.cjs');
const fs = require('fs');
const path = require('path');

const ACHIEVEMENTS_PATH = path.join(__dirname, '..', 'config', 'steam-release.json');

function loadAchievementCatalog() {
    try {
        const cfg = JSON.parse(fs.readFileSync(ACHIEVEMENTS_PATH, 'utf8'));
        return cfg.achievements || [];
    } catch {
        return [];
    }
}

function registerSteamIpc(ipcMain) {
    ipcMain.handle('steam:status', () => {
        const api = getSteamworks();
        return {
            available: api.available,
            appId: api.appId,
            reason: api.reason,
            persona: api.available ? api.user.getPersonaName() : null,
            steamId: api.available ? api.user.getSteamId() : null,
            online: api.available ? api.network.isOnline() : false,
        };
    });

    ipcMain.handle('steam:achievements:list', () => loadAchievementCatalog());

    ipcMain.handle('steam:achievement:unlock', (_e, id) => {
        const api = getSteamworks();
        if (!api.available || !id) return { ok: false, reason: api.reason };
        const ok = api.achievement.activate(String(id));
        return { ok, id: String(id) };
    });

    ipcMain.handle('steam:achievement:isUnlocked', (_e, id) => {
        const api = getSteamworks();
        if (!api.available || !id) return false;
        return api.achievement.isActivated(String(id));
    });

    ipcMain.handle('steam:overlay:open', (_e, dialog) => {
        const api = getSteamworks();
        if (!api.available) return { ok: false, reason: api.reason };
        const ok = api.overlay.activate(dialog || 'friends');
        return { ok };
    });
}

module.exports = { registerSteamIpc, loadAchievementCatalog };