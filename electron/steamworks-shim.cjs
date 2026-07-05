/**
 * Optional Steamworks bridge — loads steamworks.js when installed.
 * Falls back to a no-op stub so Electron runs outside Steam.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STEAM_APP_CONFIG = path.join(ROOT, 'config', 'steam-app.json');
const STEAM_RELEASE_CONFIG = path.join(ROOT, 'config', 'steam-release.json');

function readJson(filePath) {
    try {
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        /* ignore */
    }
    return null;
}

function resolveAppId() {
    if (process.env.STEAM_APP_ID) return String(process.env.STEAM_APP_ID).trim();
    const appCfg = readJson(STEAM_APP_CONFIG);
    if (appCfg?.appId) return String(appCfg.appId);
    const releaseCfg = readJson(STEAM_RELEASE_CONFIG);
    if (process.env.STEAM_DEV === '1' && releaseCfg?.devAppId) return String(releaseCfg.devAppId);
    return null;
}

function tryLoadClient(appId) {
    if (!appId) {
        return { client: null, reason: 'No Steam App ID — set STEAM_APP_ID or config/steam-app.json' };
    }
    try {
        const steamworks = require('steamworks.js');
        const client = steamworks.init(Number(appId));
        return { client, appId, reason: null };
    } catch (err) {
        return {
            client: null,
            appId,
            reason: err?.message || 'steamworks.js not installed — npm install steamworks.js (optional)',
        };
    }
}

function createStub(appId, reason) {
    const noop = () => false;
    const noopAsync = async () => ({ ok: false, reason });
    return {
        available: false,
        appId: appId || null,
        reason: reason || 'Steamworks unavailable',
        achievement: {
            activate: noop,
            isActivated: () => false,
            clear: noop,
        },
        overlay: {
            activate: noop,
        },
        user: {
            getSteamId: () => null,
            getPersonaName: () => null,
        },
        network: {
            isOnline: () => false,
        },
        shutdown: noopAsync,
    };
}

function wrapClient(client, appId) {
    return {
        available: true,
        appId,
        reason: null,
        achievement: {
            activate(id) {
                try {
                    return !!client.achievement.activate(String(id));
                } catch {
                    return false;
                }
            },
            isActivated(id) {
                try {
                    return !!client.achievement.isActivated(String(id));
                } catch {
                    return false;
                }
            },
            clear(id) {
                try {
                    return !!client.achievement.clear(String(id));
                } catch {
                    return false;
                }
            },
        },
        overlay: {
            activate(dialog = '') {
                try {
                    if (client.overlay?.activateDialog) {
                        return !!client.overlay.activateDialog(String(dialog || 'friends'));
                    }
                    if (client.overlay?.activate) return !!client.overlay.activate();
                    return false;
                } catch {
                    return false;
                }
            },
        },
        user: {
            getSteamId() {
                try {
                    return client.localplayer?.getSteamId?.() ?? client.user?.getSteamId?.() ?? null;
                } catch {
                    return null;
                }
            },
            getPersonaName() {
                try {
                    return client.localplayer?.getName?.() ?? client.user?.getPersonaName?.() ?? null;
                } catch {
                    return null;
                }
            },
        },
        network: {
            isOnline() {
                try {
                    return !!client.network?.isOnline?.();
                } catch {
                    return false;
                }
            },
        },
        shutdown() {
            try {
                client.shutdown?.();
            } catch {
                /* ignore */
            }
            return { ok: true };
        },
    };
}

let steamApi = null;

function initSteamworks() {
    if (steamApi) return steamApi;
    const appId = resolveAppId();
    const { client, reason } = tryLoadClient(appId);
    steamApi = client ? wrapClient(client, appId) : createStub(appId, reason);
    if (steamApi.available) {
        console.log(`[steam] Initialized App ID ${steamApi.appId}`);
    } else {
        console.log(`[steam] Stub mode — ${steamApi.reason}`);
    }
    return steamApi;
}

function getSteamworks() {
    return steamApi || initSteamworks();
}

module.exports = {
    initSteamworks,
    getSteamworks,
    resolveAppId,
};