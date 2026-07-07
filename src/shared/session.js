import { generatePlayerKey } from './roomCode.js';

const PLAYERS_KEY = 'threshold_saved_players';
const HOST_KEY = 'threshold_host_state';

export const Session = {
    playerKey: '',
    playerName: 'Player',
    isHost: false,
    hostKey: '',
    isSpectator: false,
    isPaused: false,
    pauseReason: '',
    admins: new Set(),
    autoCodingPause: true,

    init() {
        if (this._inited) { this.updateUi(); return; }
        this._inited = true;
        const stored = sessionStorage.getItem('threshold_player_key');
        this.playerKey = stored || generatePlayerKey();
        sessionStorage.setItem('threshold_player_key', this.playerKey);
        this.playerName = localStorage.getItem('threshold_player_name') || `Player-${this.playerKey}`;
        this.autoCodingPause = localStorage.getItem('threshold_auto_coding_pause') !== 'false';
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
        return this.isHost || window.Network?.mode === 'solo';
    },

    setPaused(paused, reason = '') {
        if (!this.canControlPause()) return false;
        this.isPaused = paused;
        this.pauseReason = paused ? (reason || 'Paused') : '';
        this.writeHostState();
        window.dispatchEvent(new CustomEvent('threshold:pause', { detail: { paused, reason: this.pauseReason } }));
        this.updateUi();
        return true;
    },

    isAdmin(key) {
        const k = (key || this.playerKey || '').toUpperCase();
        return this.admins.has(k);
    },

    setAdmins(keys = []) {
        this.admins = new Set(keys.map((k) => String(k).toUpperCase()));
        this.updateUi();
    },

    grantAdmin(key) {
        if (!key) return;
        this.admins.add(String(key).toUpperCase());
        this.updateUi();
    },

    revokeAdmin(key) {
        if (!key) return;
        this.admins.delete(String(key).toUpperCase());
        this.updateUi();
    },

    getAdminList() {
        return [...this.admins];
    },

    setAutoCodingPause(enabled) {
        this.autoCodingPause = !!enabled;
        localStorage.setItem('threshold_auto_coding_pause', enabled ? 'true' : 'false');
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