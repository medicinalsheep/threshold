const PLAYERS_KEY = 'threshold_saved_players';
const HOST_KEY = 'threshold_host_state';

function randomKey(len = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

export const Session = {
    playerKey: '',
    playerName: 'Player',
    isHost: false,
    hostKey: '',
    isPaused: false,

    init() {
        if (this._inited) { this.updateUi(); return; }
        this._inited = true;
        const stored = sessionStorage.getItem('threshold_player_key');
        this.playerKey = stored || randomKey();
        sessionStorage.setItem('threshold_player_key', this.playerKey);
        this.playerName = localStorage.getItem('threshold_player_name') || `Player-${this.playerKey}`;
        this.syncFromHostState();
        window.addEventListener('storage', (e) => {
            if (e.key === HOST_KEY) this.syncFromHostState();
        });
        this.updateUi();
    },

    claimHost() {
        this.isHost = true;
        this.hostKey = this.playerKey;
        this.writeHostState();
        this.updateUi();
    },

    releaseHost() {
        if (!this.isHost) return;
        this.isHost = false;
        this.hostKey = '';
        localStorage.removeItem(HOST_KEY);
        this.updateUi();
    },

    joinHost(key) {
        const trimmed = (key || '').trim().toUpperCase();
        if (!trimmed) return false;
        this.isHost = false;
        this.hostKey = trimmed;
        this.syncFromHostState();
        this.updateUi();
        return true;
    },

    canControlPause() {
        return this.isHost;
    },

    setPaused(paused) {
        if (!this.canControlPause()) return false;
        this.isPaused = paused;
        this.writeHostState();
        window.dispatchEvent(new CustomEvent('threshold:pause', { detail: { paused } }));
        this.updateUi();
        return true;
    },

    togglePause() {
        return this.setPaused(!this.isPaused);
    },

    writeHostState() {
        if (!this.isHost) return;
        localStorage.setItem(HOST_KEY, JSON.stringify({
            hostKey: this.hostKey,
            paused: this.isPaused,
            updated: Date.now()
        }));
    },

    syncFromHostState() {
        if (this.isHost) return;
        try {
            const raw = localStorage.getItem(HOST_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (this.hostKey && data.hostKey !== this.hostKey) return;
            this.isPaused = !!data.paused;
            window.dispatchEvent(new CustomEvent('threshold:pause', { detail: { paused: this.isPaused } }));
        } catch { /* ignore */ }
        this.updateUi();
    },

    getSavedPlayers() {
        try {
            return JSON.parse(localStorage.getItem(PLAYERS_KEY) || '{}');
        } catch {
            return {};
        }
    },

    savePlayer(name, code, objects = []) {
        const players = this.getSavedPlayers();
        players[this.playerKey] = {
            key: this.playerKey,
            name: name || this.playerName,
            code: code || '',
            objects,
            savedAt: Date.now()
        };
        localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
        if (name) {
            this.playerName = name;
            localStorage.setItem('threshold_player_name', name);
        }
        return players[this.playerKey];
    },

    getPlayer(key) {
        const k = (key || '').trim().toUpperCase();
        return this.getSavedPlayers()[k] || null;
    },

    importPlayer(data) {
        if (!data?.key) return false;
        const players = this.getSavedPlayers();
        players[data.key.toUpperCase()] = data;
        localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
        return true;
    },

    listPlayerKeys() {
        return Object.values(this.getSavedPlayers()).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    },

    updateUi() {
        const keyEl = document.getElementById('session-player-key');
        const hostEl = document.getElementById('session-host-status');
        const pauseBtn = document.getElementById('btn-host-pause');
        if (keyEl) keyEl.textContent = this.playerKey;
        if (hostEl) {
            if (this.isHost) hostEl.textContent = `HOST · ${this.hostKey}`;
            else if (this.hostKey) hostEl.textContent = `GUEST · ${this.hostKey}`;
            else hostEl.textContent = 'SOLO';
        }
        if (pauseBtn) {
            pauseBtn.textContent = this.isPaused ? 'RESUME' : 'PAUSE';
            pauseBtn.disabled = !this.canControlPause();
            pauseBtn.classList.toggle('active', this.isPaused);
        }

        this.refreshSavedPlayerList();
    },

    refreshSavedPlayerList() {
        const select = document.getElementById('insert-saved-player');
        if (!select) return;
        const players = this.listPlayerKeys();
        select.innerHTML = '<option value="">— choose saved player —</option>';
        players.forEach((p) => {
            const opt = document.createElement('option');
            opt.value = p.key;
            opt.textContent = `${p.name} (${p.key})`;
            select.appendChild(opt);
        });
    }
};