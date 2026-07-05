import { Session } from '../shared/session.js';
import { Network } from '../shared/network.js';

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

    const enterApp = () => {
        overlay?.classList.add('hidden');
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
            const roomId = Session.playerKey;
            await Network.startHost(roomId);
            setStatus('Session live — share your link!');
            enterApp();
        } catch (e) {
            setStatus(e.message || 'Failed to create session', true);
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
        Network.startSolo();
        enterApp();
    });

    if (urlRoom) {
        setStatus(`Room code detected: ${urlRoom.toUpperCase()} — tap Join`);
    }
}