import { VERSION } from '../config.js';
import { Sync } from './sync.js';
import { SoundLibrary } from './soundLibrary.js';
import { TextureLibrary } from './textureLibrary.js';
import { ProjectVault } from './projectVault.js';

const BUILD_PROFILES = {
    web: {
        label: 'Web (GitHub Pages / static host)',
        status: 'ready',
        tool: 'vite build',
        notes: 'Deploy dist-pages to any static host.',
    },
    android: {
        label: 'Android APK (Capacitor)',
        status: 'scaffold',
        tool: 'capacitor',
        notes: 'npm run init:native then package:android — open Android Studio to build APK.',
    },
    windows: {
        label: 'Windows (.exe)',
        status: 'scaffold',
        tool: 'electron',
        notes: 'npm run package:win — Electron portable .exe from dist-pages.',
    },
    steam: {
        label: 'Steam',
        status: 'planned',
        tool: 'electron+steamworks',
        notes: 'Phase 3.5: Steamworks SDK in Electron build + depot upload.',
    },
    selfhost: {
        label: 'Self-host + local relay',
        status: 'ready',
        tool: 'relay/',
        notes: 'Host dist-pages + optional relay/ PeerJS server.',
    },
};

export const GameExport = {
    buildManifest(options = {}) {
        const name = options.name || `Threshold Game ${Date.now().toString(36).slice(-4)}`;
        const world = Sync.capture();
        const sounds = SoundLibrary.list();
        const project = ProjectVault.captureCurrent?.() || {};

        return {
            format: 'threshold-game',
            formatVersion: 1,
            engineVersion: VERSION,
            exportedAt: new Date().toISOString(),
            game: {
                name,
                description: options.description || '',
                author: options.author || window.Session?.playerName || 'Creator',
            },
            world,
            scripts: {
                input: project.scriptInput || document.getElementById('comp-input')?.value || '',
                output: project.scriptOutput || document.getElementById('comp-output')?.value || '',
                running: project.runningCode || window.Runtime?.runningCode || '',
            },
            sounds: sounds.map((s) => ({
                id: s.id,
                name: s.name,
                context: s.context,
                note: 'Blob stored locally — re-record or bundle in Phase 3 native export',
            })),
            textures: TextureLibrary.collectManifestEntries(world?.objects || []).map((t) => ({
                ...t,
                note: 'Blob stored locally — re-import or bundle in native export',
            })),
            gimp: {
                manifestName: 'threshold_manifest.json',
                pluginPath: 'plugins/threshold-gimp/threshold_export.py',
                install: 'npm run gimp:install',
                note: 'Export maps in GIMP → Engine Texture tab → GIMP SYNC (Electron loads files from disk)',
            },
            agents: options.agents || window.AgentHub?.exportConfigs?.() || [],
            relay: {
                mode: options.relayMode || (import.meta.env.VITE_PEER_HOST ? 'custom' : 'peerjs-cloud'),
                peerHost: import.meta.env.VITE_PEER_HOST || null,
            },
            buildProfiles: BUILD_PROFILES,
            packaging: {
                webRoot: 'dist-pages/',
                entry: 'index.html',
                capacitor: { webDir: 'dist-pages', appId: 'com.threshold.game', appName: name },
                electron: { main: 'electron/main.js', preload: 'electron/preload.js' },
                steam: { appId: null, depotId: null, note: 'Assign after Steamworks partner setup' },
            },
        };
    },

    downloadManifest(options = {}) {
        const manifest = this.buildManifest(options);
        const slug = (manifest.game.name || 'game').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}.threshold-game.json`;
        a.click();
        URL.revokeObjectURL(url);
        return manifest;
    },

    getBuildProfiles() {
        return { ...BUILD_PROFILES };
    },
};

window.GameExport = GameExport;