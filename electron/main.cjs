const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { initSteamworks } = require('./steamworks-shim.cjs');
const { registerSteamIpc } = require('./steam.cjs');

initSteamworks();
registerSteamIpc(ipcMain);

const DIST_INDEX = path.join(__dirname, '..', 'dist-pages', 'index.html');
const BUNDLE_ROOT = path.join(__dirname, '..', 'dist-pages', 'bundle');

function resolveBundlePath(relPath = '') {
    const norm = String(relPath).replace(/\\/g, '/').replace(/^\/+/, '');
    const safe = path.normalize(norm).replace(/^(\.\.(\/|\\|$))+/, '');
    const resolved = path.resolve(BUNDLE_ROOT, safe);
    if (!resolved.startsWith(BUNDLE_ROOT)) return null;
    return resolved;
}

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        minWidth: 900,
        minHeight: 600,
        backgroundColor: '#0a0a0a',
        icon: path.join(__dirname, 'resources', 'icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    mainWindow.loadFile(DIST_INDEX);
    mainWindow.maximize();

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('shell:fullscreen', (_e, on) => {
    if (!mainWindow) return false;
    if (on) {
        if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
        mainWindow.maximize();
    } else {
        mainWindow.unmaximize();
    }
    return mainWindow.isMaximized();
});

ipcMain.handle('shell:fullscreen:is', () => mainWindow?.isMaximized() ?? false);

ipcMain.handle('shell:fs:readText', async (_e, filePath) => {
    return fs.readFile(filePath, 'utf8');
});

ipcMain.handle('shell:fs:readBinary', async (_e, filePath) => {
    const buf = await fs.readFile(filePath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
});

ipcMain.handle('shell:fs:writeText', async (_e, filePath, content) => {
    await fs.writeFile(filePath, content, 'utf8');
    return true;
});

ipcMain.handle('shell:fs:pickFile', async (_e, filters = []) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters,
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
});

ipcMain.handle('shell:fs:pickSave', async (_e, defaultName, filters = []) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName,
        filters,
    });
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
});

ipcMain.handle('shell:bundle:readBinary', async (_e, relPath) => {
    const filePath = resolveBundlePath(relPath);
    if (!filePath) return null;
    try {
        const buf = await fs.readFile(filePath);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    } catch {
        return null;
    }
});

ipcMain.handle('shell:saveManifest', async (_e, defaultName, json) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName,
        filters: [{ name: 'Threshold Game', extensions: ['threshold-game.json', 'json'] }],
    });
    if (result.canceled || !result.filePath) return null;
    await fs.writeFile(result.filePath, json, 'utf8');
    return result.filePath;
});