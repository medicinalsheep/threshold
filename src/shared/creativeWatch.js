import { CREATIVE_WATCH_URL } from '../config.js';
import { TextureBridge } from './textureBridge.js';
import { GltfImport } from './gltfImport.js';

let source = null;
let enabled = false;

function shouldConnect() {
    if (!CREATIVE_WATCH_URL) return false;
    if (import.meta.env.DEV) return true;
    if (import.meta.env.VITE_CREATIVE_WATCH === 'true') return true;
    return false;
}

async function probeHealth(baseUrl) {
    try {
        const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1500) });
        return res.ok;
    } catch {
        return false;
    }
}

function handleEvent(event) {
    if (!event?.type) return;

    switch (event.type) {
        case 'texture':
            TextureBridge.hotReloadFromWatch(event);
            break;
        case 'gimp-manifest':
            TextureBridge.hotReloadManifestFromWatch(event);
            break;
        case 'gltf':
            GltfImport.hotReloadFromWatch(event);
            break;
        case 'blender-manifest':
            GltfImport.hotReloadManifestFromWatch(event);
            break;
        default:
            break;
    }
}

export const CreativeWatch = {
    get connected() {
        return enabled && source?.readyState === EventSource.OPEN;
    },

    async init() {
        if (!shouldConnect()) return false;
        const baseUrl = CREATIVE_WATCH_URL.replace(/\/$/, '');
        const ok = await probeHealth(baseUrl);
        if (!ok) {
            console.log('[creative-watch] relay offline — run: npm run textures:watch');
            return false;
        }

        if (source) {
            source.close();
            source = null;
        }

        source = new EventSource(`${baseUrl}/events`);
        source.onopen = () => {
            enabled = true;
            console.log('[creative-watch] connected — hot-reload active');
            window.UI?.status?.('Creative watch connected — texture/GLTF hot-reload on');
        };
        source.onmessage = (msg) => {
            try {
                handleEvent(JSON.parse(msg.data));
            } catch (e) {
                console.warn('[creative-watch] bad event', e);
            }
        };
        source.onerror = () => {
            if (enabled) {
                console.warn('[creative-watch] disconnected');
                window.UI?.status?.('Creative watch disconnected');
            }
            enabled = false;
        };
        return true;
    },

    stop() {
        source?.close();
        source = null;
        enabled = false;
    },
};

window.CreativeWatch = CreativeWatch;