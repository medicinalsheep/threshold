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

function initLobbyReleaseStrip() {
    const el = document.getElementById('lobby-release-strip');
    if (!el) return;
    const logUrl = 'https://github.com/medicinalsheep/threshold/blob/main/docs/CHANGELOG.md';
    el.innerHTML = `v${VERSION} · guided onboarding · <a href="${logUrl}" target="_blank" rel="noopener noreferrer">changelog</a>`;
}

function initLobbyModePicker() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('mode');
    let saved = ViewPrefs.get('sessionMode', 'play');
    if (urlMode === 'build' || urlMode === 'play') {
        saved = urlMode;
        ViewPrefs.set('sessionMode', saved);
    }
    const setActive = (mode) => {
        document.querySelectorAll('.lobby-mode-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        ViewPrefs.set('sessionMode', mode);
    };
    setActive(saved === 'build' ? 'build' : 'play');
    document.getElementById('lobby-mode-play')?.addEventListener('click', () => setActive('play'));
    document.getElementById('lobby-mode-build')?.addEventListener('click', () => setActive('build'));
}

function persistLobbyMode() {
    const active = document.querySelector('.lobby-mode-btn.active')?.dataset?.mode;
    if (active) ViewPrefs.set('sessionMode', active);
}

export function initLobby(onReady) {
    const overlay = document.getElementById('lobby-overlay');
    const joinInput = document.getElementById('lobby-join-code');
    const statusEl = document.getElementById('lobby-status');
    const urlRoom = new URLSearchParams(window.location.search).get('room');
    if (urlRoom) {
        joinInput.value = urlRoom.toUpperCase();
    }

    const savedName = localStorage.getItem('threshold_player_name');
    if (savedName && document.getElementById('lobby-name')) {
        document.getElementById('lobby-name').value = savedName;
    }

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
        onReady?.();
    };

    document.getElementById('lobby-create')?.addEventListener('click', async () => {
        setStatus('Creating session...');
        try {
            Session.init();
            const name = document.getElementById('lobby-name')?.value?.trim();
            if (name) {
                Session.playerName = name;
                localStorage.setItem('threshold_player_name', name);
            }
            const voipConfig = readLobbyVoipConfig();
            const roomId = Session.playerKey;
            await Network.startHost(roomId, { voipConfig });
            window.Voip?.init?.(voipConfig);
            await window.Voip?.startIfNeeded?.();
            setStatus(`Session live — ${summarizeVoipConfig(voipConfig)}`);
            persistLobbyMode();
            enterApp();
        } catch (e) {
            console.error('[lobby] create session', e);
            setStatus(e?.message || String(e) || 'Failed to create session', true);
        }
    });

    document.getElementById('lobby-join')?.addEventListener('click', async () => {
        const code = joinInput?.value?.trim().toUpperCase();
        if (!code) { setStatus('Enter a room code', true); return; }
        setStatus('Joining...');
        try {
            Session.init();
            const name = document.getElementById('lobby-name')?.value?.trim();
            if (name) {
                Session.playerName = name;
                localStorage.setItem('threshold_player_name', name);
            }
            await Network.joinRoom(code);
            persistLobbyMode();
            enterApp();
        } catch (e) {
            setStatus('Could not join — check code & host is online', true);
        }
    });

    document.getElementById('lobby-solo')?.addEventListener('click', () => {
        Session.init();
        const name = document.getElementById('lobby-name')?.value?.trim();
        if (name) {
            Session.playerName = name;
            localStorage.setItem('threshold_player_name', name);
        }
        const tpl = document.getElementById('lobby-template')?.value || 'wardenclyffe';
        setSelectedTemplateId(tpl);
        persistLobbyMode();
        Network.startSolo();
        enterApp();
    });

    document.getElementById('lobby-tc')?.addEventListener('click', () => {
        Session.init();
        const name = document.getElementById('lobby-name')?.value?.trim();
        if (name) {
            Session.playerName = name;
            localStorage.setItem('threshold_player_name', name);
        }
        setSelectedTemplateId('tc-circuit');
        const sel = document.getElementById('lobby-template');
        if (sel) sel.value = 'tc-circuit';
        persistLobbyMode();
        Network.startSolo();
        setStatus('TC Circuit template loading…');
        enterApp();
    });

    document.getElementById('lobby-spectate')?.addEventListener('click', async () => {
        const code = joinInput?.value?.trim().toUpperCase();
        if (!code) { setStatus('Enter a room code to spectate', true); return; }
        setStatus('Joining as spectator...');
        try {
            Session.init();
            const name = document.getElementById('lobby-name')?.value?.trim();
            if (name) {
                Session.playerName = name;
                localStorage.setItem('threshold_player_name', name);
            }
            await Network.spectateRoom(code);
            enterApp();
            window.Spectate?.setFollowHost?.(true);
            document.querySelector('[data-target="view-spectate"]')?.click();
        } catch (e) {
            setStatus(e.message || 'Could not spectate — check code & host', true);
        }
    });

    if (urlRoom) {
        setStatus(`Room code detected: ${urlRoom.toUpperCase()} — tap Join`);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const worldCode = urlParams.get('world');
    const autoplay = urlParams.get('autoplay') === '1';
    if (worldCode && autoplay) {
        Session.init();
        const name = document.getElementById('lobby-name')?.value?.trim();
        if (name) {
            Session.playerName = name;
            localStorage.setItem('threshold_player_name', name);
        }
        Network.startSolo();
        setStatus(`Loading world ${worldCode.toUpperCase()}…`);
        enterApp();
    }
}