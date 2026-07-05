import voipDefaults from '../../config/voip.json';

export const VOIP_MODE_LABELS = {
    off: 'Off',
    webrtc: 'In-game proximity',
    discord: 'Discord (external)',
    hybrid: 'In-game + Discord',
};

export const VOIP_TRANSMISSION_LABELS = {
    ptt: 'Push-to-talk',
    open: 'Open mic (proximity gated)',
};

/** Most compatible default: WebRTC + PTT + proximity — works in browser without Discord app */
export function defaultVoipHostConfig(overrides = {}) {
    const base = { ...(voipDefaults.defaults || {}) };
    return {
        ...base,
        ...overrides,
        enabled: overrides.enabled !== undefined ? !!overrides.enabled : base.enabled !== false,
    };
}

export function normalizeVoipConfig(raw = {}) {
    const d = defaultVoipHostConfig();
    const mode = ['off', 'webrtc', 'discord', 'hybrid'].includes(raw.mode) ? raw.mode : d.mode;
    const transmission = ['ptt', 'open'].includes(raw.transmission) ? raw.transmission : d.transmission;
    return {
        enabled: raw.enabled !== false && mode !== 'off',
        mode,
        transmission,
        proximity: raw.proximity !== false,
        maxDistance: Math.max(4, Math.min(80, Number(raw.maxDistance) || d.maxDistance)),
        minVolume: Math.max(0, Math.min(0.5, Number(raw.minVolume) ?? d.minVolume)),
        falloff: raw.falloff === 'exponential' ? 'exponential' : 'linear',
        pttKey: raw.pttKey || d.pttKey,
        discordInvite: String(raw.discordInvite || '').trim(),
        spectatorsHear: !!raw.spectatorsHear,
        spectatorsSpeak: !!raw.spectatorsSpeak,
    };
}

export function voipUsesWebRtc(config) {
    const c = normalizeVoipConfig(config);
    return c.enabled && (c.mode === 'webrtc' || c.mode === 'hybrid');
}

export function voipUsesDiscord(config) {
    const c = normalizeVoipConfig(config);
    return c.enabled && (c.mode === 'discord' || c.mode === 'hybrid') && !!c.discordInvite;
}

export function summarizeVoipConfig(config) {
    const c = normalizeVoipConfig(config);
    if (!c.enabled || c.mode === 'off') return 'Voice off';
    const parts = [VOIP_MODE_LABELS[c.mode] || c.mode];
    if (voipUsesWebRtc(c)) {
        parts.push(VOIP_TRANSMISSION_LABELS[c.transmission] || c.transmission);
        if (c.proximity) parts.push(`hear ≤${c.maxDistance}m`);
        else parts.push('global range');
    }
    if (voipUsesDiscord(c)) parts.push('Discord link');
    return parts.join(' · ');
}

export function readLobbyVoipConfig() {
    const enabled = document.getElementById('lobby-voip-enabled')?.checked !== false;
    const mode = document.getElementById('lobby-voip-mode')?.value || 'webrtc';
    const transmission = document.getElementById('lobby-voip-transmission')?.value || 'ptt';
    const proximity = document.getElementById('lobby-voip-proximity')?.checked !== false;
    const discordInvite = document.getElementById('lobby-voip-discord')?.value?.trim() || '';
    const spectatorsHear = document.getElementById('lobby-voip-spec-hear')?.checked === true;
    return normalizeVoipConfig({
        enabled,
        mode,
        transmission,
        proximity,
        discordInvite,
        spectatorsHear,
        spectatorsSpeak: false,
    });
}

export function applyLobbyVoipVisibility() {
    const mode = document.getElementById('lobby-voip-mode')?.value || 'webrtc';
    const webrtc = mode === 'webrtc' || mode === 'hybrid';
    const discord = mode === 'discord' || mode === 'hybrid';
    document.querySelectorAll('.lobby-voip-webrtc-only').forEach((el) => {
        el.style.display = webrtc ? '' : 'none';
    });
    document.querySelectorAll('.lobby-voip-discord-only').forEach((el) => {
        el.style.display = discord ? '' : 'none';
    });
}

window.VoipConfig = {
    defaultVoipHostConfig,
    normalizeVoipConfig,
    summarizeVoipConfig,
    voipUsesWebRtc,
    voipUsesDiscord,
    readLobbyVoipConfig,
};