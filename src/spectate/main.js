import { getRenderMode } from '../shared/renderModes.js';

let active = false;
let followHost = false;

function resolveHostAvatar() {
    const hostKey = String(window.Session?.hostKey || window.Network?.roomId || '').toUpperCase();
    if (!hostKey) return null;

    const avatars = window.State?.syncPlayerAvatars || window.Network?.getPlayerAvatars?.();
    if (!avatars) return null;

    if (avatars instanceof Map) return avatars.get(hostKey) || null;
    return avatars[hostKey] || avatars[window.Session?.hostKey] || null;
}

function hostVitalsSummary() {
    const av = resolveHostAvatar();
    if (!av?.v || !Array.isArray(av.v) || av.v.length < 3) return '';
    const [hp, food, water] = av.v;
    return `Host · HP ${hp} · F ${food} · W ${water}`;
}

export const Spectate = {
    isActive() { return active; },

    isFollowingHost() {
        return followHost && (active || window.Network?.mode === 'spectate');
    },

    setFollowHost(on) {
        followHost = !!on;
        this.updateHud();
        if (followHost && window.State?.hostCamera) {
            window.UI?.status('Following host camera');
        }
    },

    setActive(on) {
        active = !!on;
        document.body.classList.toggle('spectate-mode', active);
        document.getElementById('spectate-hud')?.classList.toggle('hidden', !active);
        if (active) {
            window.Engine?._releaseLookLock?.();
            this.updateHud();
        }
        window.dispatchEvent(new Event('resize'));
    },

    init() {
        document.getElementById('spectate-follow-host')?.addEventListener('click', () => {
            this.setFollowHost(true);
        });
        document.getElementById('spectate-free-cam')?.addEventListener('click', () => {
            this.setFollowHost(false);
            window.Engine?.controls && (window.Engine.controls.enabled = true);
            window.UI?.status('Spectate: free orbit camera');
        });
        document.getElementById('spectate-exit')?.addEventListener('click', () => {
            document.querySelector('[data-target="view-engine"]')?.click();
        });
    },

    updateHud() {
        const mode = getRenderMode(window.State?.renderMode ?? 4);
        const net = window.Network;
        const netLabel = net?.mode === 'spectate' ? `watching ${net.roomId}`
            : net?.mode === 'host' ? `host ${net.roomId}`
                : net?.mode === 'guest' ? `guest ${net.roomId}` : 'solo preview';
        const el = document.getElementById('spectate-render-info');
        const follow = this.isFollowingHost();
        const audio = window.AudioManifestSync?.getGuestStatus?.();
        const audioNote = audio?.missing ? ` · audio ${audio.received}/${audio.total}` : '';
        if (el) {
            el.textContent = `${mode.short} · ${netLabel} · ${follow ? 'host cam' : 'free cam'}${audioNote}`;
        }

        const vitalsEl = document.getElementById('spectate-host-vitals');
        const vitalsText = (net?.mode === 'spectate' || this.isSpectatorSession()) ? hostVitalsSummary() : '';
        if (vitalsEl) {
            vitalsEl.textContent = vitalsText;
            vitalsEl.classList.toggle('visible', !!vitalsText);
        }

        document.getElementById('spectate-follow-host')?.classList.toggle('active', follow);
        document.getElementById('spectate-free-cam')?.classList.toggle('active', !follow);
    },

    shouldFollowHost() { return active && followHost; },

    isSpectatorSession() {
        return window.Network?.mode === 'spectate' || window.Session?.isSpectator;
    },
};

export function initSpectate() {
    Spectate.init();
    window.Spectate = Spectate;
}