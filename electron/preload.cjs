const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ThresholdShell', {
    platform: process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux',
    isNative: true,
    kind: 'electron',
    versions: {
        electron: process.versions.electron,
        chrome: process.versions.chrome,
    },
    fullscreen: {
        enter: () => ipcRenderer.invoke('shell:fullscreen', true),
        exit: () => ipcRenderer.invoke('shell:fullscreen', false),
        toggle: async () => {
            const on = await ipcRenderer.invoke('shell:fullscreen:is');
            return ipcRenderer.invoke('shell:fullscreen', !on);
        },
        isActive: () => ipcRenderer.invoke('shell:fullscreen:is'),
    },
    fs: {
        readText: (filePath) => ipcRenderer.invoke('shell:fs:readText', filePath),
        writeText: (filePath, content) => ipcRenderer.invoke('shell:fs:writeText', filePath, content),
        pickFile: (filters) => ipcRenderer.invoke('shell:fs:pickFile', filters),
        pickSave: (defaultName, filters) => ipcRenderer.invoke('shell:fs:pickSave', defaultName, filters),
        saveManifest: (defaultName, json) => ipcRenderer.invoke('shell:saveManifest', defaultName, json),
    },
    mic: {
        supported: true,
        note: 'Uses WebView getUserMedia — grant mic permission in OS settings if needed.',
    },
});