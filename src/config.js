export const VERSION = '10.12.12';
export const CREATIVE_WATCH_URL = import.meta.env.VITE_CREATIVE_WATCH_URL || 'http://127.0.0.1:3927';
export const EDITION = import.meta.env.VITE_EDITION || 'web';
export const IS_GROK_EDITION = EDITION === 'grok';
export const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/';
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://medicinalsheep.github.io/threshold/';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const PEER_HOST = import.meta.env.VITE_PEER_HOST || '';
export const PEER_PORT = import.meta.env.VITE_PEER_PORT ? parseInt(import.meta.env.VITE_PEER_PORT, 10) : undefined;
export const PEER_PATH = import.meta.env.VITE_PEER_PATH || '/peerjs';
export const PEER_SECURE = import.meta.env.VITE_PEER_SECURE === 'true';

function parseIceServers() {
    const raw = import.meta.env.VITE_ICE_SERVERS;
    if (!raw) return undefined;
    try {
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
}

export const ICE_SERVERS = parseIceServers();

export function getPeerOptions() {
    const opts = { debug: 1 };
    if (PEER_HOST) {
        opts.host = PEER_HOST;
        if (PEER_PORT) opts.port = PEER_PORT;
        opts.path = PEER_PATH;
        opts.secure = PEER_SECURE;
    }
    if (ICE_SERVERS?.length) {
        opts.config = { iceServers: ICE_SERVERS };
    }
    return opts;
}
