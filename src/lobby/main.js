import { VERSION } from '../config.js';
import { Session } from '../shared/session.js';
import { Network } from '../shared/network.js';
import { enterWindowedFullscreen } from '../shared/fullscreen.js';
import { setSelectedTemplateId, initLobbyTemplatePicker } from '../shared/starterTemplates.js';
import { ViewPrefs } from '../shared/viewPrefs.js';
import { QuickExportPlay } from '../shared/quickExportPlay.js';
import {
    applyLobbyVoipVisibility,
    readLobbyVoipConfig,
    summarizeVoipConfig,
} from '../shared/voipConfig.js';
import { generateHostRoomId, normalizeRoomCode } from '../shared/roomCode.js';
import { normalizePasscode } from '../shared/hostPasscode.js';

function initLobbyReleaseStrip() {
    const el = document.getElementById('lobby-release-strip');
    if (!el) return;
    const logUrl = 'https://github.com/medicinalsheep/threshold/blob/main/docs/CHANGELOG.md';
    el.innerHTML = `v${VERSION} · VOIP lobby + stable panels · <a href="${logUrl}" target="_blank" rel="noopener noreferrer">changelog</a>`;
}

function initLobbyModePicker() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('mode');
    let saved = ViewPrefs.get('sessionMode', 'play');
    // mode=play|build = session; mode=player|creator|full = surface (handled by SurfaceProfile)
    if (urlMode === 'build' || urlMode === 'play') {
        saved = urlMode;
        ViewPrefs.set('sessionMode', saved);
    }
    const setActive = (mode) => {
        document.querySelectorAll('.lobby-mode-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        ViewPrefs.set('sessionMode', mode);
        // BUILD preference nudges creator surface (unless URL forced surface)
        if (mode === 'build' && window.SurfaceProfile && !window.SurfaceProfile._fromQuery) {
            if (window.SurfaceProfile.isPlayer()) {
                window.SurfaceProfile.set('creator');
            }
        }
    };
    setActive(saved === 'build' ? 'build' : 'play');
    document.getElementById('lobby-mode-play')?.addEventListener('click', () => setActive('play'));
    document.getElementById('lobby-mode-build')?.addEventListener('click', () => setActive('build'));
    // Re-bind surface chips after lobby DOM is live
    window.SurfaceProfile?.bindUi?.();
}

function setLobbyMode(mode) {
    const m = mode === 'build' ? 'build' : 'play';
    document.querySelectorAll('.lobby-mode-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.mode === m);
    });
    ViewPrefs.set('sessionMode', m);
}

function persistLobbyMode() {
    const active = document.querySelector('.lobby-mode-btn.active')?.dataset?.mode;
    if (active) ViewPrefs.set('sessionMode', active);
}

/** Solo ENTER → defaults BUILD so insert/delete work without hunting the mode toggle. */
function enterSoloBuild() {
    setLobbyMode('build');
    setSelectedTemplateId('grid');
    const sel = document.getElementById('lobby-template');
    if (sel) sel.value = 'grid';
}

async function copyLobbyText(text, okMsg, failMsg) {
    if (!text) return false;
    try {
        await navigator.clipboard.writeText(text);
        return okMsg;
    } catch {
        return failMsg || text;
    }
}

function showLobbySharePanel(roomId, passcode = '') {
    const form = document.getElementById('lobby-session-form');
    const panel = document.getElementById('lobby-share-panel');
    const codeEl = document.getElementById('lobby-share-code');
    const linkEl = document.getElementById('lobby-share-link');
    const passHint = document.getElementById('lobby-share-pass-hint');
    const statusEl = document.getElementById('lobby-share-status');

    form?.classList.add('hidden');
    panel?.classList.remove('hidden');

    const code = normalizeRoomCode(roomId);
    const link = Network.getShareUrl();
    if (codeEl) codeEl.value = code;
    if (linkEl) linkEl.value = link;
    if (statusEl) {
        statusEl.textContent = passcode
            ? 'Session live — share code + passcode with friends'
            : 'Session live — copy code or link below';
    }
    if (passHint) passHint.classList.toggle('hidden', !passcode);
}

function hideLobbySharePanel() {
    document.getElementById('lobby-session-form')?.classList.remove('hidden');
    document.getElementById('lobby-share-panel')?.classList.add('hidden');
}

function bindLobbySharePanel(setStatus, enterApp) {
    document.getElementById('lobby-copy-code')?.addEventListener('click', async () => {
        const code = document.getElementById('lobby-share-code')?.value || '';
        const msg = await copyLobbyText(code, 'Room code copied', code);
        setStatus(msg);
    });

    document.getElementById('lobby-copy-link')?.addEventListener('click', async () => {
        const link = document.getElementById('lobby-share-link')?.value || Network.getShareUrl();
        const msg = await copyLobbyText(link, 'Invite link copied — send to friends', link);
        setStatus(msg);
    });

    document.getElementById('lobby-enter-session')?.addEventListener('click', () => {
        hideLobbySharePanel();
        enterApp();
    });
}

export function initLobby(onReady) {
    const overlay = document.getElementById('lobby-overlay');
    const joinInput = document.getElementById('lobby-join-code');
    const statusEl = document.getElementById('lobby-status');
    const urlRoom = new URLSearchParams(window.location.search).get('room');
    if (urlRoom) {
        joinInput.value = normalizeRoomCode(urlRoom);
    }

    // Display name: custom and/or X profile (handle / name)
    window.DisplayName?.bindUi?.();
    window.DisplayName?.syncUi?.();

    const setStatus = (msg, isError = false) => {
        if (statusEl) {
            statusEl.textContent = msg;
            statusEl.style.color = isError ? '#ff5555' : '#888';
        }
    };

    document.getElementById('lobby-voip-mode')?.addEventListener('change', applyLobbyVoipVisibility);
    document.getElementById('lobby-voip-enabled')?.addEventListener('change', applyLobbyVoipVisibility);
    applyLobbyVoipVisibility();
    initLobbyTemplatePicker();
    QuickExportPlay.bindOnce();
    initLobbyModePicker();
    initLobbyReleaseStrip();

    const enterApp = () => {
        overlay?.classList.add('hidden');
        void enterWindowedFullscreen();
        window.dispatchEvent(new CustomEvent('threshold:enter-engine'));
        onReady?.();
    };

    bindLobbySharePanel(setStatus, enterApp);

    const applyDisplayName = () => {
        try {
            const n = window.DisplayName?.commitFromLobby?.();
            if (n) Session.playerName = n;
            else {
                const typed = document.getElementById('lobby-name')?.value?.trim();
                if (typed) {
                    Session.playerName = typed;
                    localStorage.setItem('threshold_player_name', typed);
                }
            }
        } catch (e) {
            console.warn('[lobby] display name', e);
            const typed = document.getElementById('lobby-name')?.value?.trim();
            if (typed) Session.playerName = typed;
            if (!Session.playerName) Session.playerName = `Player-${Session.playerKey || '1'}`;
        }
        return Session.playerName;
    };

    document.getElementById('lobby-create')?.addEventListener('click', async () => {
        setStatus('Creating multiplayer session…');
        const btn = document.getElementById('lobby-create');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'CONNECTING…';
        }
        try {
            Session.init();
            applyDisplayName();
            const voipConfig = readLobbyVoipConfig();
            const passcode = normalizePasscode(document.getElementById('lobby-host-passcode')?.value);
            let roomId = generateHostRoomId(Session.playerName, Session.playerKey);
            let attempts = 0;
            while (attempts < 4) {
                try {
                    await Network.startHost(roomId, { voipConfig, passcode });
                    break;
                } catch (e) {
                    const taken = String(e?.message || '').includes('Room ID taken');
                    if (!taken || attempts >= 3) throw e;
                    roomId = generateHostRoomId(Session.playerName, Session.playerKey);
                    attempts += 1;
                    setStatus(`Room taken — retrying (${attempts + 1}/4)…`);
                }
            }
            // Never block session start on mic permission / VoIP
            try {
                window.Voip?.init?.(voipConfig);
                void window.Voip?.startIfNeeded?.()?.catch?.((err) => {
                    console.warn('[lobby] voip start', err);
                    window.UI?.status?.(err?.message || 'Voice unavailable — session still live');
                });
            } catch (voipErr) {
                console.warn('[lobby] voip init', voipErr);
            }
            setSelectedTemplateId('grid');
            persistLobbyMode();
            showLobbySharePanel(Network.roomId, passcode);
            setStatus(`Host live — ${summarizeVoipConfig(voipConfig)} · copy invite, then ENTER SESSION`);
            // Focus primary enter so multiplayer hosts aren't stuck on the share panel
            requestAnimationFrame(() => {
                document.getElementById('lobby-enter-session')?.focus?.();
            });
        } catch (e) {
            console.error('[lobby] create session', e);
            setStatus(e?.message || String(e) || 'Failed to create session — try ENTER for solo', true);
            hideLobbySharePanel();
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'CREATE SESSION';
            }
        }
    });

    document.getElementById('lobby-join')?.addEventListener('click', async () => {
        const code = normalizeRoomCode(joinInput?.value);
        if (!code) { setStatus('Enter a room code', true); return; }
        setStatus('Joining…');
        const btn = document.getElementById('lobby-join');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '…';
        }
        try {
            Session.init();
            applyDisplayName();
            const passcode = normalizePasscode(document.getElementById('lobby-join-passcode')?.value);
            await Network.joinRoom(code, { passcode });
            persistLobbyMode();
            enterApp();
        } catch (e) {
            console.error('[lobby] join', e);
            setStatus(e?.message || 'Could not join — check code & host is online', true);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'JOIN';
            }
        }
    });

    document.getElementById('lobby-solo')?.addEventListener('click', () => {
        const btn = document.getElementById('lobby-solo');
        if (btn) btn.disabled = true;
        try {
            setStatus('Starting solo…');
            Session.init();
            applyDisplayName();
            enterSoloBuild();
            Network.startSolo();
            enterApp();
        } catch (e) {
            console.error('[lobby] solo enter', e);
            setStatus(e?.message || 'Could not start solo session', true);
            if (btn) btn.disabled = false;
        }
    });

    document.getElementById('lobby-tc')?.addEventListener('click', () => {
        try {
            setStatus('TC Circuit loading…');
            Session.init();
            applyDisplayName();
            setSelectedTemplateId('tc-circuit');
            const sel = document.getElementById('lobby-template');
            if (sel) sel.value = 'tc-circuit';
            persistLobbyMode();
            Network.startSolo();
            enterApp();
        } catch (e) {
            console.error('[lobby] tc enter', e);
            setStatus(e?.message || 'Could not start TC Circuit', true);
        }
    });

    document.getElementById('lobby-spectate')?.addEventListener('click', async () => {
        const code = normalizeRoomCode(joinInput?.value);
        if (!code) { setStatus('Enter a room code to spectate', true); return; }
        setStatus('Joining as spectator…');
        try {
            Session.init();
            applyDisplayName();
            const passcode = normalizePasscode(document.getElementById('lobby-join-passcode')?.value);
            await Network.spectateRoom(code, { passcode });
            enterApp();
            window.Spectate?.setFollowHost?.(true);
            document.querySelector('[data-target="view-spectate"]')?.click();
        } catch (e) {
            setStatus(e?.message || 'Could not spectate — check code & host', true);
        }
    });

    if (urlRoom) {
        setStatus(`Invite link detected — room code filled · tap JOIN (add passcode if host set one)`);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const worldCode = urlParams.get('world');
    const autoplay = urlParams.get('autoplay') === '1';
    if (worldCode && autoplay) {
        Session.init();
        applyDisplayName();
        enterSoloBuild();
        Network.startSolo();
        setStatus(`Loading world ${worldCode.toUpperCase()}…`);
        enterApp();
    }
}