/** Native shell bridge — Electron preload or Capacitor WebView */

function shellApi() {
    return window.ThresholdShell || null;
}

export const ThresholdShell = {
    get kind() {
        const api = shellApi();
        if (api?.kind) return api.kind;
        if (window.Capacitor?.isNativePlatform?.()) return 'capacitor';
        return 'web';
    },

    get platform() {
        const api = shellApi();
        if (api?.platform) return api.platform;
        if (window.Capacitor?.getPlatform) return window.Capacitor.getPlatform();
        return 'web';
    },

    get isNative() {
        const api = shellApi();
        if (api?.isNative) return true;
        return window.Capacitor?.isNativePlatform?.() ?? false;
    },

    async enterFullscreen() {
        const api = shellApi();
        if (api?.fullscreen?.enter) return api.fullscreen.enter();
        return false;
    },

    async exitFullscreen() {
        const api = shellApi();
        if (api?.fullscreen?.exit) return api.fullscreen.exit();
        return false;
    },

    async toggleFullscreen() {
        const api = shellApi();
        if (api?.fullscreen?.toggle) return api.fullscreen.toggle();
        if (api?.fullscreen?.isActive) {
            const on = await api.fullscreen.isActive();
            return api.fullscreen.enter ? api.fullscreen[on ? 'exit' : 'enter']() : false;
        }
        return false;
    },

    async isFullscreen() {
        const api = shellApi();
        if (api?.fullscreen?.isActive) return api.fullscreen.isActive();
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    },

    async saveManifest(filename, json) {
        const api = shellApi();
        if (api?.fs?.saveManifest) return api.fs.saveManifest(filename, json);
        if (api?.fs?.pickSave) {
            const filePath = await api.fs.pickSave(filename, [
                { name: 'Threshold Game', extensions: ['json'] },
            ]);
            if (!filePath) return null;
            await api.fs.writeText(filePath, json);
            return filePath;
        }
        return null;
    },

    async pickFile(filters) {
        const api = shellApi();
        if (api?.fs?.pickFile) return api.fs.pickFile(filters);
        return null;
    },

    async readBinary(filePath) {
        const api = shellApi();
        if (api?.fs?.readBinary) return api.fs.readBinary(filePath);
        return null;
    },

    async readText(filePath) {
        const api = shellApi();
        if (api?.fs?.readText) return api.fs.readText(filePath);
        return null;
    },

    micSupported() {
        const api = shellApi();
        if (api?.mic?.supported != null) return api.mic.supported;
        return !!navigator.mediaDevices?.getUserMedia;
    },
};

export function initThresholdShell() {
    if (ThresholdShell.isNative) {
        document.body.classList.add(`shell-${ThresholdShell.kind}`);
        document.body.classList.add(`platform-${ThresholdShell.platform}`);
        console.log(`Threshold native shell: ${ThresholdShell.kind} (${ThresholdShell.platform})`);
    }
    window.ThresholdShellBridge = ThresholdShell;
}