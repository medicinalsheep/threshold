import Peer from 'peerjs';
import { getPeerOptions } from '../config.js';
import { Session } from './session.js';
import { Sync } from './sync.js';
import { AudioManifestSync, buildHostAudioManifest } from './audioManifestSync.js';
import { TextureManifestSync, buildHostTextureManifest } from './textureManifestSync.js';
import { Permissions } from './permissions.js';
import { defaultVoipHostConfig, normalizeVoipConfig, summarizeVoipConfig } from './voipConfig.js';
import { normalizeRoomCode } from './roomCode.js';
import { normalizePasscode, passcodeMatches } from './hostPasscode.js';

export const Network = {
    peer: null,
    hostConnection: null,
    connections: [],
    players: new Map(),
    mode: 'solo',
    roomId: '',
    peerCount: 0,
    voipConfig: defaultVoipHostConfig(),
    hostPasscode: '',
    joinPasscode: '',
    _joinPending: null,
    playerPositions: new Map(),
    playerAvatars: new Map(),
    _broadcastTimer: null,
    _liveTimer: null,
    _voipReady: false,
    _reconnectTimer: null,
    _reconnectAttempts: 0,
    _reconnecting: false,

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

    async startHost(roomId, options = {}) {
        this.destroy();
        this.mode = 'host';
        this.roomId = normalizeRoomCode(roomId);
        this.hostPasscode = normalizePasscode(options.passcode || '');
        this.voipConfig = normalizeVoipConfig(options.voipConfig || this.voipConfig);
        this.playerPositions.clear();
        Session.isHost = true;
        Session.hostKey = roomId;
        Session.grantAdmin(Session.playerKey);
        Session.updateUi();

        return new Promise((resolve, reject) => {
            this.peer = new Peer(roomId, getPeerOptions());
            this._wirePeerVoip(this.peer);

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
                    reject(new Error('Room ID taken — refresh the page or use Solo Play'));
                } else if (err.type === 'network' || err.type === 'server-error') {
                    reject(new Error('Peer server unreachable — check connection or try Solo Play'));
                } else {
                    reject(new Error(err.message || err.type || 'Peer connection failed'));
                }
            });

            this.peer.on('connection', (conn) => this._onGuestConnect(conn));
        });
    },

    async spectateRoom(roomId, options = {}) {
        this.mode = 'spectate';
        this.roomId = normalizeRoomCode(roomId);
        this.joinPasscode = normalizePasscode(options.passcode || '');
        Session.isHost = false;
        Session.isSpectator = true;
        Session.hostKey = roomId;
        Session.updateUi();

        return this._connectAsGuest(roomId, { spectate: true });
    },

    async joinRoom(roomId, options = {}) {
        this.mode = 'guest';
        this.roomId = normalizeRoomCode(roomId);
        this.joinPasscode = normalizePasscode(options.passcode || '');
        Session.isHost = false;
        Session.isSpectator = false;
        Session.hostKey = roomId;
        Session.updateUi();

        return this._connectAsGuest(roomId, { spectate: false });
    },

    _setJoinPending(resolve, reject) {
        this._clearJoinPending();
        this._joinPending = { resolve, reject };
        this._joinPendingTimer = setTimeout(() => {
            if (!this._joinPending) return;
            const err = new Error('Join timed out — check room code and passcode');
            this._joinPending.reject(err);
            this._clearJoinPending();
        }, 12000);
    },

    _clearJoinPending() {
        clearTimeout(this._joinPendingTimer);
        this._joinPendingTimer = null;
        this._joinPending = null;
    },

    _connectAsGuest(roomId, { spectate = false } = {}) {
        return new Promise((resolve, reject) => {
            this._setJoinPending(resolve, reject);
            this.peer = new Peer(getPeerOptions());
            this._wirePeerVoip(this.peer);

            this.peer.on('open', () => {
                const conn = this.peer.connect(roomId, { reliable: true });
                this.hostConnection = conn;
                this._setupConn(conn);

                conn.on('open', () => {
                    conn.send({
                        type: 'JOIN',
                        playerKey: Session.playerKey,
                        playerName: Session.playerName,
                        peerId: this.peer.id,
                        spectate,
                        passcode: this.joinPasscode,
                    });
                    this._reconnectAttempts = 0;
                    this._reconnecting = false;
                    this.updateUi();
                });
                conn.on('close', () => this._onHostLost());
                conn.on('error', (err) => {
                    this._clearJoinPending();
                    reject(err);
                });
            });

            this.peer.on('error', (err) => {
                this._clearJoinPending();
                reject(err);
            });
        });
    },

    setHostPasscode(code) {
        if (this.mode !== 'host') return false;
        this.hostPasscode = normalizePasscode(code);
        window.UI?.status?.(this.hostPasscode
            ? 'Session passcode updated — share it with guests'
            : 'Session passcode removed');
        window.UI?.renderHostPanel?.();
        return true;
    },

    hasHostPasscode() {
        return Boolean(normalizePasscode(this.hostPasscode));
    },

    startSolo() {
        this.mode = 'solo';
        this.roomId = '';
        this.hostPasscode = '';
        this.joinPasscode = '';
        this._clearJoinPending();
        this.playerPositions.clear();
        Session.isHost = false;
        Session.isSpectator = false;
        Session.hostKey = '';
        Session.grantAdmin(Session.playerKey);
        Session.updateUi();
        this.updateUi();
        window.Voip?.destroy?.();
    },

    _wirePeerVoip(peer) {
        if (!peer || peer._voipWired) return;
        peer._voipWired = true;
        peer.on('call', (call) => window.Voip?.answerIncoming?.(call));
    },

    _onGuestConnect(conn) {
        this._setupConn(conn);
    },

    _welcomeGuest(conn) {
        if (!conn?.open) return;
        conn.send({
            type: 'WELCOME',
            playerKey: Session.playerKey,
            voipConfig: this.voipConfig,
            voipSummary: summarizeVoipConfig(this.voipConfig),
        });
        this._broadcastVoipRoster();
        this._broadcastState();
    },

    _setupConn(conn) {
        if (!this.connections.includes(conn)) this.connections.push(conn);

        conn.on('data', (data) => this._handleMessage(data, conn));
        conn.on('close', () => {
            const meta = this.players.get(conn);
            if (meta && window.UI?.status) window.UI.status(`${meta.name} left`);
            if (meta?.key) this.playerPositions.delete(meta.key);
            this.players.delete(conn);
            this.connections = this.connections.filter((c) => c !== conn);
            this.updateUi();
            window.UI?.renderHostPanel?.();
            if (this.mode === 'host') this._broadcastVoipRoster();
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
            peerId: data.peerId || conn.peer || null,
            conn,
        });
        window.UI?.renderHostPanel?.();
        this._broadcastVoipRoster();
        if (window.TcCircuit?.state?.running) {
            window.TcCircuit.state.players[key] = window.TcCircuit.state.players[key] || {
                key,
                name: data.playerName || `Player-${key}`,
                lap: 0,
                lastLapSec: null,
                bestSec: null,
                totalSec: 0,
            };
            this.scheduleBroadcast();
        }
    },

    getVoipRoster() {
        const roster = [{
            key: Session.playerKey,
            name: Session.playerName,
            peerId: this.peer?.id || this.roomId,
            spectator: false,
        }];
        this.players.forEach((p) => {
            roster.push({
                key: p.key,
                name: p.name,
                peerId: p.peerId,
                spectator: !!p.spectator,
            });
        });
        return roster;
    },

    getPlayerPositions() {
        const out = {};
        this.playerAvatars.forEach((av, key) => {
            out[key] = { x: av.x, y: av.y, z: av.z };
        });
        this.playerPositions.forEach((pos, key) => {
            if (!out[key]) out[key] = pos;
        });
        return out;
    },

    getPlayerAvatars() {
        const out = {};
        this.playerAvatars.forEach((av, key) => { out[key] = av; });
        return out;
    },

    getVehicleClaims() {
        return window.TcDrive?.getClaims?.() || {};
    },

    updateLocalAvatar(avatar) {
        if (!avatar || !Number.isFinite(avatar.x)) return;
        const key = String(Session.playerKey || '').toUpperCase();
        this.playerAvatars.set(key, avatar);
        this.playerPositions.set(key, { x: avatar.x, y: avatar.y, z: avatar.z });
        if (this.mode === 'host') this.scheduleLiveSync();
    },

    setPlayerPosition(key, pos) {
        if (!key || !pos) return;
        const k = String(key).toUpperCase();
        this.playerPositions.set(k, pos);
        const prev = this.playerAvatars.get(k) || {};
        this.playerAvatars.set(k, { ...prev, x: pos.x, y: pos.y, z: pos.z, mode: prev.mode || 'fly' });
        if (this.mode === 'host') this.scheduleLiveSync();
    },

    setPlayerAvatar(key, avatar) {
        if (!key || !avatar || !Number.isFinite(avatar.x)) return;
        const k = String(key).toUpperCase();
        this.playerAvatars.set(k, avatar);
        this.playerPositions.set(k, { x: avatar.x, y: avatar.y, z: avatar.z });
        if (this.mode === 'host') this.scheduleLiveSync();
    },

    sendPlayerAvatar(avatar) {
        if (this.mode === 'spectate') return;
        if (this.mode === 'host') {
            this.updateLocalAvatar(avatar);
            return;
        }
        if (this.mode !== 'guest' || !this.hostConnection?.open) return;
        this.hostConnection.send({
            type: 'ACTION',
            action: 'PLAYER_AVATAR',
            payload: { avatar },
            from: Session.playerKey,
        });
    },

    scheduleLiveSync() {
        if (this.mode !== 'host') return;
        clearTimeout(this._liveTimer);
        this._liveTimer = setTimeout(() => this._broadcastLive(), 80);
    },

    _broadcastLive() {
        if (this.mode !== 'host') return;
        const state = Sync.captureLive();
        const msg = { type: 'LIVE_STATE', state };
        this.connections.forEach((c) => { if (c.open) c.send(msg); });
    },

    _broadcastVoipRoster() {
        if (this.mode !== 'host') return;
        const msg = {
            type: 'VOIP_ROSTER',
            roster: this.getVoipRoster(),
            voipConfig: this.voipConfig,
            playerPositions: this.getPlayerPositions(),
        };
        this.connections.forEach((c) => { if (c.open) c.send(msg); });
        window.Voip?.setConfig?.(this.voipConfig);
        window.Voip?.setRoster?.(msg.roster);
        window.Voip?.setPlayerPositions?.(msg.playerPositions);
        window.Voip?.startIfNeeded?.();
    },

    async _applyVoipSession(voipConfig, voipSummary) {
        if (voipConfig) {
            this.voipConfig = normalizeVoipConfig(voipConfig);
            window.Voip?.init?.(this.voipConfig);
            window.Voip?.setConfig?.(this.voipConfig);
        }
        if (voipSummary && window.UI?.status) {
            window.UI.status(`Voice: ${voipSummary}`);
        }
        await window.Voip?.startIfNeeded?.();
    },

    _handleMessage(data, conn) {
        if (!data?.type) return;

        if (this.mode === 'host') {
            if (data.type === 'JOIN') {
                if (!passcodeMatches(this.hostPasscode, data.passcode)) {
                    conn.send?.({
                        type: 'JOIN_DENIED',
                        message: 'Wrong passcode — ask the host',
                    });
                    setTimeout(() => conn.close?.(), 50);
                    if (window.UI?.status) window.UI.status('Join blocked — wrong passcode');
                    return;
                }
                this._registerPlayer(conn, data);
                if (window.UI?.status) window.UI.status(`${data.playerName || 'Player'} joined`);
                this._welcomeGuest(conn);
                void this._pushAudioManifestToConn(conn);
                void this._pushTextureManifestToConn(conn);
                return;
            }
            if (data.type === 'AUDIO_PULL') {
                void AudioManifestSync.hostHandlePull(conn, data.clipIds || []);
                return;
            }
            if (data.type === 'TEXTURE_PULL') {
                void TextureManifestSync.hostHandlePull(conn, data.textureIds || []);
                return;
            }
            if (data.type === 'ACTION') {
                const from = (data.from || '').toUpperCase();
                const meta = this.players.get(conn);
                if (meta?.spectator) {
                    conn.send?.({ type: 'DENIED', action: data.action, message: 'Spectators are read-only' });
                    return;
                }
                if (data.action === 'PLAYER_POS') {
                    if (meta?.key) this.setPlayerPosition(meta.key, data.payload?.position);
                    return;
                }
                if (data.action === 'PLAYER_AVATAR') {
                    if (meta?.key) this.setPlayerAvatar(meta.key, data.payload?.avatar);
                    return;
                }
                if (data.action === 'VEHICLE_CLAIM' || data.action === 'VEHICLE_RELEASE'
                    || data.action === 'LAP_CROSS' || data.action === 'CIRCUIT_START'
                    || data.action === 'CIRCUIT_STOP') {
                    Sync.applyAction(data.action, { ...data.payload, fromKey: from });
                    this.scheduleLiveSync();
                    return;
                }
                if (data.action === 'RUN_CODE' && window.CollaborateGuard?.shouldQueueAiRun?.(data.payload, from)) {
                    const entry = window.CollaborateGuard.queueRun(from, data.payload, conn);
                    conn.send?.({ type: 'AI_RUN_PENDING', id: entry.id });
                    return;
                }
                if (Permissions.isWorldEditAction(data.action) && !Permissions.canEditWorld(from)) {
                    const msg = window.CollaborateGuard?.sceneLocked
                        ? 'Scene locked — host-only edits'
                        : 'No admin permission';
                    conn.send?.({ type: 'DENIED', action: data.action, message: msg });
                    return;
                }
                Sync.applyAction(data.action, { ...data.payload, fromKey: from, authorKey: from });
                this.scheduleBroadcast();
            }
        } else if (this.mode === 'guest' || this.mode === 'spectate') {
            if (data.type === 'FULL_STATE') {
                void Sync.applyState(data.state).then(() => {
                    const applied = window.ImmersiveReplay?.getStatus?.();
                    if (applied?.zones || applied?.hooks || applied?.graphs) {
                        window.UI?.status?.(`Immersive replay — ${applied.zones} zone(s) · ${applied.hooks} hook(s) · ${applied.graphs} graph(s)`);
                    }
                });
                if (data.state?.playerAvatars) {
                    window.TcDrive?.applyNetworkState?.(data.state.playerAvatars, data.state.vehicleClaims);
                } else if (data.state?.playerPositions) {
                    window.Voip?.setPlayerPositions?.(data.state.playerPositions);
                }
                this._reconnectAttempts = 0;
                this._reconnecting = false;
                window.UI?.renderHostPanel?.();
                window.Spectate?.updateHud?.();
            }
            if (data.type === 'AUDIO_MANIFEST') {
                void AudioManifestSync.onGuestManifest(data.manifest || []);
            }
            if (data.type === 'AUDIO_CLIP') {
                void AudioManifestSync.receiveClip(data);
            }
            if (data.type === 'AUDIO_CLIP_SKIP') {
                AudioManifestSync.onClipSkipped(data);
            }
            if (data.type === 'TEXTURE_MANIFEST') {
                void TextureManifestSync.onGuestManifest(data.manifest || []);
            }
            if (data.type === 'TEXTURE_BLOB') {
                void TextureManifestSync.receiveTexture(data);
            }
            if (data.type === 'TEXTURE_BLOB_SKIP') {
                TextureManifestSync.onTextureSkipped(data);
            }
            if (data.type === 'AI_RUN_PENDING') {
                window.UI?.status?.('Waiting for host to approve AI / compiler run…');
            }
            if (data.type === 'AI_RUN_RESULT') {
                window.CollaborateGuard?.onGuestResult?.(data);
            }
            if (data.type === 'HANDOFF_SNAPSHOT') {
                window.HostMigration?.onHandoffSnapshot?.(data);
            }
            if (data.type === 'LIVE_STATE' && data.state) {
                Sync.applyLiveState(data.state);
            }
            if (data.type === 'JOIN_DENIED') {
                if (window.UI?.status) window.UI.status(data.message || 'Could not join session');
                this._joinPending?.reject?.(new Error(data.message || 'Could not join session'));
                this._clearJoinPending();
                this.hostConnection?.close?.();
                return;
            }
            if (data.type === 'WELCOME') {
                if (window.UI?.status) window.UI.status('Connected to host — synced bindings & scene');
                void this._applyVoipSession(data.voipConfig, data.voipSummary);
                if (this._joinPending) {
                    this._joinPending.resolve(this.roomId);
                    this._clearJoinPending();
                }
            }
            if (data.type === 'VOIP_ROSTER') {
                if (data.voipConfig) this.voipConfig = normalizeVoipConfig(data.voipConfig);
                window.Voip?.setConfig?.(this.voipConfig);
                window.Voip?.setRoster?.(data.roster || []);
                window.Voip?.setPlayerPositions?.(data.playerPositions || {});
                window.Voip?.startIfNeeded?.();
            }
            if (data.type === 'DENIED' && window.UI?.status) {
                window.UI.status(data.message || 'Action denied by host');
            }
        }
    },

    sendToHost(action, payload = {}) {
        if (action === 'PLAYER_POS' && this.mode === 'guest') {
            if (!this.hostConnection?.open) return;
            this.hostConnection.send({
                type: 'ACTION',
                action: 'PLAYER_POS',
                payload,
                from: Session.playerKey,
            });
            return;
        }
        if (action === 'PLAYER_AVATAR' && this.mode === 'guest') {
            this.sendPlayerAvatar(payload.avatar || payload);
            return;
        }
        if (this.mode === 'spectate') {
            if (action !== 'PLAYER_POS' && window.UI?.status) window.UI.status('Spectators cannot send actions');
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

    requestAudioClips(clipIds = []) {
        if ((this.mode !== 'guest' && this.mode !== 'spectate') || !this.hostConnection?.open) return;
        this.hostConnection.send({ type: 'AUDIO_PULL', clipIds });
    },

    requestTextureBlobs(textureIds = []) {
        if ((this.mode !== 'guest' && this.mode !== 'spectate') || !this.hostConnection?.open) return;
        this.hostConnection.send({ type: 'TEXTURE_PULL', textureIds });
    },

    async _pushAudioManifestToConn(conn) {
        const manifest = buildHostAudioManifest();
        if (!manifest.length || !conn?.open) return;
        conn.send({ type: 'AUDIO_MANIFEST', manifest });
        await AudioManifestSync.hostHandlePull(conn, manifest.map((m) => m.id));
    },

    async _pushTextureManifestToConn(conn) {
        const manifest = buildHostTextureManifest();
        if (!manifest.length || !conn?.open) return;
        conn.send({ type: 'TEXTURE_MANIFEST', manifest });
        await TextureManifestSync.hostHandlePull(conn, manifest.map((m) => m.id));
    },

    _onHostLost() {
        if (this.mode !== 'guest' && this.mode !== 'spectate') return;
        if (this._reconnecting) return;
        this._reconnecting = true;
        window.UI?.status?.('Host disconnected — reconnecting… (15s grace)');
        this._scheduleReconnect();
    },

    _scheduleReconnect() {
        clearTimeout(this._reconnectTimer);
        if (this._reconnectAttempts >= 5) {
            this._reconnecting = false;
            window.UI?.status?.('Could not reconnect — see migration steps');
            window.HostMigration?.onReconnectFailed?.();
            return;
        }
        this._reconnectTimer = setTimeout(() => this._tryReconnect(), 3000);
    },

    _tryReconnect() {
        const roomId = this.roomId;
        if (!roomId || this.mode === 'solo' || this.mode === 'host') {
            this._reconnecting = false;
            return;
        }
        this._reconnectAttempts += 1;
        const spectate = this.mode === 'spectate';
        try {
            if (this.peer?.open) {
                const conn = this.peer.connect(roomId, { reliable: true });
                this.hostConnection = conn;
                this._setupConn(conn);
                conn.on('open', () => {
                    conn.send({
                        type: 'JOIN',
                        playerKey: Session.playerKey,
                        playerName: Session.playerName,
                        peerId: this.peer.id,
                        spectate,
                        passcode: this.joinPasscode,
                    });
                    this._reconnectAttempts = 0;
                    this._reconnecting = false;
                    if (!spectate && window.State?.lastLiveState) {
                        window.Sync?.restoreSessionPrefs?.(window.State.lastLiveState);
                    }
                    window.UI?.status?.('Reconnected to host');
                    this.updateUi();
                });
                conn.on('close', () => this._onHostLost());
                conn.on('error', () => this._scheduleReconnect());
            } else {
                const joiner = spectate ? this.spectateRoom.bind(this) : this.joinRoom.bind(this);
                joiner(roomId).then(() => {
                    window.UI?.status?.('Reconnected to host');
                }).catch(() => this._scheduleReconnect());
            }
        } catch {
            this._scheduleReconnect();
        }
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

        const syncBtn = document.getElementById('btn-sync-story');
        if (syncBtn) syncBtn.style.display = (this.mode === 'host' || this.mode === 'guest' || this.mode === 'spectate') ? 'inline-block' : 'none';

        window.CreatorHud?.updateSync?.();
    },

    destroy() {
        this._clearJoinPending();
        clearTimeout(this._broadcastTimer);
        clearTimeout(this._liveTimer);
        clearTimeout(this._reconnectTimer);
        this._reconnectAttempts = 0;
        this._reconnecting = false;
        window.Voip?.destroy?.();
        this.connections.forEach((c) => c.close());
        this.hostConnection?.close();
        this.peer?.destroy();
        this.connections = [];
        this.players.clear();
        this.playerPositions.clear();
        this.playerAvatars.clear();
        this.hostConnection = null;
        this.peer = null;
        this._voipReady = false;
    }
};

window.Network = Network;