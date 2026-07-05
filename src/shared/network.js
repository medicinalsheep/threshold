import Peer from 'peerjs';
import { getPeerOptions } from '../config.js';
import { Session } from './session.js';
import { Sync } from './sync.js';
import { Permissions } from './permissions.js';

export const Network = {
    peer: null,
    hostConnection: null,
    connections: [],
    players: new Map(),
    mode: 'solo',
    roomId: '',
    peerCount: 0,
    _broadcastTimer: null,

    getShareUrl() {
        if (!this.roomId) return window.location.href.split('?')[0];
        const base = window.location.href.split('?')[0];
        return `${base}?room=${this.roomId}`;
    },

    getPlayerList() {
        const list = [{ key: Session.playerKey, name: Session.playerName, admin: true, self: true, spectator: false }];
        this.players.forEach((p) => {
            if (p.key !== Session.playerKey) list.push({ ...p, self: false });
        });
        return list;
    },

    async startHost(roomId) {
        this.mode = 'host';
        this.roomId = roomId;
        Session.isHost = true;
        Session.hostKey = roomId;
        Session.grantAdmin(Session.playerKey);
        Session.updateUi();

        return new Promise((resolve, reject) => {
            this.peer = new Peer(roomId, getPeerOptions());

            this.peer.on('open', () => {
                this.updateUi();
                import('./steamBridge.js').then(({ SteamBridge }) => {
                    SteamBridge.unlock('MULTIPLAYER_HOST');
                }).catch(() => {});
                resolve(roomId);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                if (err.type === 'unavailable-id') {
                    reject(new Error('Room ID taken — try again'));
                } else {
                    reject(err);
                }
            });

            this.peer.on('connection', (conn) => this._onGuestConnect(conn));
        });
    },

    async spectateRoom(roomId) {
        this.mode = 'spectate';
        this.roomId = roomId;
        Session.isHost = false;
        Session.isSpectator = true;
        Session.hostKey = roomId;
        Session.updateUi();

        return new Promise((resolve, reject) => {
            this.peer = new Peer(getPeerOptions());
            this.peer.on('open', () => {
                const conn = this.peer.connect(roomId, { reliable: true });
                this.hostConnection = conn;
                this._setupConn(conn);
                conn.on('open', () => {
                    conn.send({
                        type: 'JOIN',
                        playerKey: Session.playerKey,
                        playerName: Session.playerName,
                        spectate: true,
                    });
                    this.updateUi();
                    resolve(roomId);
                });
                conn.on('error', reject);
            });
            this.peer.on('error', reject);
        });
    },

    async joinRoom(roomId) {
        this.mode = 'guest';
        this.roomId = roomId;
        Session.isHost = false;
        Session.isSpectator = false;
        Session.hostKey = roomId;
        Session.updateUi();

        return new Promise((resolve, reject) => {
            this.peer = new Peer(getPeerOptions());

            this.peer.on('open', () => {
                const conn = this.peer.connect(roomId, { reliable: true });
                this.hostConnection = conn;
                this._setupConn(conn);

                conn.on('open', () => {
                    conn.send({
                        type: 'JOIN',
                        playerKey: Session.playerKey,
                        playerName: Session.playerName
                    });
                    this.updateUi();
                    resolve(roomId);
                });

                conn.on('error', reject);
            });

            this.peer.on('error', reject);
        });
    },

    startSolo() {
        this.mode = 'solo';
        this.roomId = '';
        Session.isHost = false;
        Session.isSpectator = false;
        Session.hostKey = '';
        Session.grantAdmin(Session.playerKey);
        Session.updateUi();
        this.updateUi();
    },

    _onGuestConnect(conn) {
        this._setupConn(conn);
        conn.on('open', () => {
            conn.send({ type: 'WELCOME', playerKey: Session.playerKey });
            this._broadcastState();
        });
    },

    _setupConn(conn) {
        if (!this.connections.includes(conn)) this.connections.push(conn);

        conn.on('data', (data) => this._handleMessage(data, conn));
        conn.on('close', () => {
            const meta = this.players.get(conn);
            if (meta && window.UI?.status) window.UI.status(`${meta.name} left`);
            this.players.delete(conn);
            this.connections = this.connections.filter((c) => c !== conn);
            this.updateUi();
            window.UI?.renderHostPanel?.();
        });

        this.updateUi();
    },

    _registerPlayer(conn, data) {
        const key = (data.playerKey || '').toUpperCase();
        const spectator = !!data.spectate;
        this.players.set(conn, {
            key,
            name: data.playerName || `Player-${key}`,
            admin: spectator ? false : Session.isAdmin(key),
            spectator,
            conn
        });
        window.UI?.renderHostPanel?.();
    },

    _handleMessage(data, conn) {
        if (!data?.type) return;

        if (this.mode === 'host') {
            if (data.type === 'JOIN') {
                this._registerPlayer(conn, data);
                if (window.UI?.status) window.UI.status(`${data.playerName || 'Player'} joined`);
                this._broadcastState();
                return;
            }
            if (data.type === 'ACTION') {
                const from = (data.from || '').toUpperCase();
                const meta = this.players.get(conn);
                if (meta?.spectator) {
                    conn.send?.({ type: 'DENIED', action: data.action, message: 'Spectators are read-only' });
                    return;
                }
                if (Permissions.isWorldEditAction(data.action) && !Permissions.canEditWorld(from)) {
                    conn.send?.({ type: 'DENIED', action: data.action, message: 'No admin permission' });
                    return;
                }
                Sync.applyAction(data.action, data.payload);
                this.scheduleBroadcast();
            }
        } else if (this.mode === 'guest' || this.mode === 'spectate') {
            if (data.type === 'FULL_STATE') {
                Sync.applyState(data.state);
                window.UI?.renderHostPanel?.();
                window.Spectate?.updateHud?.();
            }
            if (data.type === 'WELCOME' && window.UI?.status) {
                window.UI.status('Connected to host — synced bindings & scene');
            }
            if (data.type === 'DENIED' && window.UI?.status) {
                window.UI.status(data.message || 'Action denied by host');
            }
        }
    },

    sendToHost(action, payload = {}) {
        if (this.mode === 'spectate') {
            if (window.UI?.status) window.UI.status('Spectators cannot send actions');
            return;
        }
        if (this.mode !== 'guest' || !this.hostConnection?.open) {
            if (window.UI?.status) window.UI.status('Not connected to host');
            return;
        }
        this.hostConnection.send({
            type: 'ACTION',
            action,
            payload,
            from: Session.playerKey
        });
    },

    scheduleBroadcast() {
        if (this.mode !== 'host') return;
        clearTimeout(this._broadcastTimer);
        this._broadcastTimer = setTimeout(() => this._broadcastState(), 120);
    },

    _broadcastState() {
        if (this.mode !== 'host') return;
        const state = Sync.capture();
        const msg = { type: 'FULL_STATE', state };
        this.connections.forEach((c) => { if (c.open) c.send(msg); });
    },

    setPlayerAdmin(playerKey, admin) {
        if (this.mode !== 'host') return;
        const key = String(playerKey).toUpperCase();
        if (admin) Session.grantAdmin(key);
        else Session.revokeAdmin(key);

        this.players.forEach((p, conn) => {
            if (p.key === key) p.admin = admin;
        });

        Sync.applyAction('SET_ADMINS', { admins: Session.getAdminList() });
        this.scheduleBroadcast();
        window.UI?.renderHostPanel?.();
    },

    updateUi() {
        const countEl = document.getElementById('session-peer-count');
        const linkEl = document.getElementById('session-share-link');
        const modeEl = document.getElementById('session-host-status');

        const count = this.mode === 'host' ? this.connections.length : (this.hostConnection?.open ? 1 : 0);
        this.peerCount = this.mode === 'host' ? this.connections.length : 0;

        const specCount = this.mode === 'host'
            ? [...this.players.values()].filter((p) => p.spectator).length
            : 0;
        if (countEl) {
            if (this.mode === 'host') countEl.textContent = `${this.peerCount} joined${specCount ? ` · ${specCount} watching` : ''}`;
            else if (this.mode === 'guest') countEl.textContent = 'connected';
            else if (this.mode === 'spectate') countEl.textContent = 'spectating';
            else countEl.textContent = 'solo';
        }
        if (linkEl && this.mode === 'host') linkEl.value = this.getShareUrl();
        if (modeEl) {
            if (this.mode === 'host') modeEl.textContent = `HOST · ${this.roomId}`;
            else if (this.mode === 'guest') modeEl.textContent = `GUEST · ${this.roomId}`;
            else if (this.mode === 'spectate') modeEl.textContent = `WATCH · ${this.roomId}`;
            else modeEl.textContent = 'SOLO';
        }

        const hostPanelBtn = document.getElementById('btn-host-panel');
        if (hostPanelBtn) hostPanelBtn.style.display = (this.mode === 'host' || this.mode === 'guest' || this.mode === 'spectate') ? 'inline-block' : 'none';
    },

    destroy() {
        clearTimeout(this._broadcastTimer);
        this.connections.forEach((c) => c.close());
        this.hostConnection?.close();
        this.peer?.destroy();
        this.connections = [];
        this.players.clear();
        this.hostConnection = null;
        this.peer = null;
    }
};

window.Network = Network;