import Peer from 'peerjs';
import { Session } from './session.js';
import { Sync } from './sync.js';

export const Network = {
    peer: null,
    hostConnection: null,
    connections: [],
    mode: 'solo',
    roomId: '',
    peerCount: 0,
    _broadcastTimer: null,

    getShareUrl() {
        if (!this.roomId) return window.location.href.split('?')[0];
        const base = window.location.href.split('?')[0];
        return `${base}?room=${this.roomId}`;
    },

    async startHost(roomId) {
        this.mode = 'host';
        this.roomId = roomId;
        Session.isHost = true;
        Session.hostKey = roomId;
        Session.updateUi();

        return new Promise((resolve, reject) => {
            this.peer = new Peer(roomId, { debug: 1 });

            this.peer.on('open', () => {
                this.updateUi();
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

    async joinRoom(roomId) {
        this.mode = 'guest';
        this.roomId = roomId;
        Session.isHost = false;
        Session.hostKey = roomId;
        Session.updateUi();

        return new Promise((resolve, reject) => {
            this.peer = new Peer();

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
        Session.hostKey = '';
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
            this.connections = this.connections.filter((c) => c !== conn);
            this.updateUi();
        });

        this.updateUi();
    },

    _handleMessage(data, conn) {
        if (!data?.type) return;

        if (this.mode === 'host') {
            if (data.type === 'JOIN') {
                if (window.UI?.status) window.UI.status(`${data.playerName || 'Player'} joined`);
                this._broadcastState();
                return;
            }
            if (data.type === 'ACTION') {
                Sync.applyAction(data.action, data.payload);
                this.scheduleBroadcast();
            }
        } else if (this.mode === 'guest') {
            if (data.type === 'FULL_STATE') {
                Sync.applyState(data.state);
            }
            if (data.type === 'WELCOME' && window.UI?.status) {
                window.UI.status('Connected to host');
            }
        }
    },

    sendToHost(action, payload = {}) {
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

    updateUi() {
        const countEl = document.getElementById('session-peer-count');
        const linkEl = document.getElementById('session-share-link');
        const modeEl = document.getElementById('session-host-status');

        const count = this.mode === 'host' ? this.connections.length : (this.hostConnection?.open ? 1 : 0);
        this.peerCount = this.mode === 'host' ? this.connections.length : 0;

        if (countEl) countEl.textContent = this.mode === 'host' ? `${this.peerCount} joined` : (this.mode === 'guest' ? 'connected' : 'solo');
        if (linkEl && this.mode === 'host') linkEl.value = this.getShareUrl();
        if (modeEl) {
            if (this.mode === 'host') modeEl.textContent = `HOST · ${this.roomId}`;
            else if (this.mode === 'guest') modeEl.textContent = `GUEST · ${this.roomId}`;
            else modeEl.textContent = 'SOLO';
        }
    },

    destroy() {
        clearTimeout(this._broadcastTimer);
        this.connections.forEach((c) => c.close());
        this.hostConnection?.close();
        this.peer?.destroy();
        this.connections = [];
        this.hostConnection = null;
        this.peer = null;
    }
};

window.Network = Network;