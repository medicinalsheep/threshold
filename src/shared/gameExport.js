import { VERSION } from '../config.js';
import { Sync } from './sync.js';
import { SoundLibrary } from './soundLibrary.js';
import { TextureLibrary } from './textureLibrary.js';
import { ProjectVault } from './projectVault.js';
import { getGraphicsExportBlock } from './graphicsExportProfiles.js';
import { TextureHilod } from './textureHilod.js';
import { LOD_DISTANCES } from './lodConfig.js';
import { Cinematic } from './cinematic.js';

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
    ios: {
        label: 'iOS (Capacitor / App Store)',
        status: 'scaffold',
        tool: 'capacitor+xcode',
        notes: 'npm run package:ios — requires macOS + Xcode. Archive → TestFlight → App Store.',
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

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result || '';
            const base64 = String(dataUrl).split(',')[1] || '';
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export const GameExport = {
    async buildManifest(options = {}) {
        const name = options.name || `Threshold Game ${Date.now().toString(36).slice(-4)}`;
        const world = Sync.capture();
        const sounds = SoundLibrary.list();
        const project = ProjectVault.captureCurrent?.() || {};

        let soundEntries = sounds.map((s) => ({
            id: s.id,
            name: s.name,
            context: s.context,
            mime: s.mime,
            size: s.size,
            note: options.includeSoundBlobs ? 'Base64 embedded in manifest' : 'Blob stored locally — enable sidecar or bundle in native export',
        }));

        if (options.includeSoundBlobs) {
            soundEntries = await Promise.all(
                sounds.map(async (s) => {
                    const blob = await SoundLibrary.getBlob(s.id);
                    if (!blob) {
                        return {
                            id: s.id,
                            name: s.name,
                            context: s.context,
                            encoding: null,
                            note: 'Blob missing from IndexedDB',
                        };
                    }
                    const data = await blobToBase64(blob);
                    return {
                        id: s.id,
                        name: s.name,
                        context: s.context,
                        mime: blob.type || s.mime || 'audio/webm',
                        size: blob.size,
                        encoding: 'base64',
                        data,
                    };
                })
            );
        }

        const bundledVideos = await Cinematic.listBundled();
        const playedVideos = Cinematic.collectExportEntries();
        const videoMap = new Map();
        [...bundledVideos, ...playedVideos].forEach((entry) => {
            if (!entry?.path) return;
            videoMap.set(entry.path, { ...entry, source: bundledVideos.some((b) => b.path === entry.path) ? 'bundle' : 'runtime' });
        });
        const videoEntries = [...videoMap.values()];

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
            sounds: soundEntries,
            videos: videoEntries,
            cinematic: {
                api: "World.playCutscene('video/intro.mp4', { skippable: true, onComplete: (m) => {} })",
                stop: 'World.stopCutscene()',
                list: 'World.listVideos()',
                folder: 'video/',
                manifestName: 'threshold_video_manifest.json',
                formats: ['mp4', 'webm'],
                note: 'HTML5 VideoTexture cutscenes — no VLC; bundle via npm run bundle:assets',
            },
            textures: TextureLibrary.collectManifestEntries(world?.objects || []).map((t) => ({
                ...t,
                note: 'Re-import via GIMP SYNC or ship via npm run bundle:assets → dist-pages/bundle/',
            })),
            gimp: {
                manifestName: 'threshold_manifest.json',
                pluginPath: 'plugins/threshold-gimp/threshold_export.py',
                install: 'npm run gimp:install',
                slots: ['albedo', 'roughness', 'metalness', 'normal'],
                note: 'Export maps in GIMP → Engine Texture tab → GIMP SYNC (Electron/bundle loads from disk)',
            },
            blender: {
                manifestName: 'threshold_blender_manifest.json',
                addonPath: 'plugins/threshold-blender/threshold_blender',
                install: 'npm run blender:install',
                importDir: 'import/',
                headlessExport: 'npm run blender:export -- --blend scene.blend --object "Name"',
                note: 'Blender File → Export → Threshold GLTF (.glb) → Engine INSERT → GLTF',
            },
            creativeCli: {
                texturesWatch: 'npm run textures:watch',
                blenderExport: 'npm run blender:export',
                bundleAssets: 'npm run bundle:assets',
                watchUrl: 'http://127.0.0.1:3927',
                watchEnv: 'VITE_CREATIVE_WATCH=true',
                note: 'textures:watch for dev hot-reload; bundle:assets before package:win / package:android / package:ios',
            },
            bundle: {
                dir: 'dist-pages/bundle/',
                dirs: ['textures', 'import', 'video'],
                index: 'bundle/bundle-index.json',
                note: 'npm run bundle:assets copies textures/ + import/ into native/web builds',
            },
            graphics: {
                ...(window.GraphicsProfile?.exportSnapshot?.() || {
                    tier: options.graphicsTier || 'realistic',
                    renderMode: 4,
                }),
                ...getGraphicsExportBlock(resolveActiveGraphicsProfile(options.targets)),
                textures: TextureHilod.collectExportEntries(world?.objects || []),
                lodDistances: LOD_DISTANCES,
                hilodNote: 'Runtime picks map suffix by camera distance + graphics tier; export:graphics prunes per platform',
            },
            models: collectGltfModelEntries(world?.objects || []),
            agents: options.agents || window.AgentHub?.exportConfigs?.() || [],
            relay: {
                mode: options.relayMode || (import.meta.env.VITE_PEER_HOST ? 'custom' : 'peerjs-cloud'),
                peerHost: import.meta.env.VITE_PEER_HOST || null,
            },
            buildProfiles: BUILD_PROFILES,
            targets: options.targets || { web: true, android: true, windows: true, ios: false },
            packaging: {
                webRoot: 'dist-pages/',
                entry: 'index.html',
                capacitor: {
                    webDir: 'dist-pages',
                    appId: options.bundleId || 'com.threshold.game',
                    appName: name,
                },
                electron: { main: 'electron/main.cjs', preload: 'electron/preload.cjs' },
                ios: {
                    bundleId: options.bundleId || 'com.threshold.game',
                    appName: name,
                    minOsVersion: '14.0',
                    scheme: 'https',
                    cli: 'npm run package:ios',
                    openXcode: 'npm run cap:open:ios',
                    init: 'npm run init:native',
                    testFlight: 'Xcode → Product → Archive → Distribute → TestFlight',
                    appStoreConnect: 'Create app record matching bundleId; upload build from Xcode Organizer',
                    signing: 'Apple Developer account + provisioning profile in Xcode Signing & Capabilities',
                    safeArea: 'viewport-fit=cover + env(safe-area-inset-*) in CSS',
                    note: 'Build/archive requires macOS. Sync assets on any OS via package:ios.',
                },
                steam: { appId: null, depotId: null, note: 'Assign after Steamworks partner setup' },
            },
        };
    },

    async downloadManifest(options = {}) {
        const manifest = await this.buildManifest(options);
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

function collectGltfModelEntries(objects = []) {
    return objects
        .filter((o) => o.userData?.type === 'gltf' || o.type === 'gltf')
        .map((o) => {
            const ud = o.userData || {};
            return {
                objectName: ud.name,
                gltfFile: ud.gltfFile,
                gltfPath: ud.gltfPath,
                lods: ud.lodPaths || (ud.gltfPath ? [{ level: 0, path: ud.gltfPath, file: ud.gltfFile, distance: 0 }] : []),
                lodDistances: ud.lodDistances || LOD_DISTANCES,
                hasPhysics: !!ud.hasPhysics,
            };
        })
        .filter((m) => m.lods?.length || m.gltfPath);
}

function resolveActiveGraphicsProfile(targets = {}) {
    if (targets.steam) return 'steam';
    if (targets.windows) return 'windows';
    if (targets.ios) return 'ios';
    if (targets.android) return 'android';
    if (targets.web) return 'web';
    return null;
}

window.GameExport = GameExport;