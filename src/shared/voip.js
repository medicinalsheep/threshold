import {
    normalizeVoipConfig,
    summarizeVoipConfig,
    voipUsesDiscord,
    voipUsesWebRtc,
} from './voipConfig.js';

const POS_INTERVAL_MS = 180;
const PROX_TICK_MS = 50;

export const Voip = {
    config: null,
    roster: [],
    localStream: null,
    calls: new Map(),
    audioCtx: null,
    pttDown: false,
    selfMuted: false,
    deafened: false,
    _posTimer: null,
    _proxTimer: null,
    _pttBound: false,
    _initialized: false,
    playerPositions: new Map(),

    init(config) {
        this.config = normalizeVoipConfig(config);
        this._bindPtt();
        this._startPositionReporter();
        this._startProximityLoop();
        this._updateHud();
        this._initialized = true;
    },

    destroy() {
        clearInterval(this._posTimer);
        clearInterval(this._proxTimer);
        this._posTimer = null;
        this._proxTimer = null;
        this.calls.forEach((entry) => {
            try { entry.call?.close(); } catch (_) { /* */ }
            entry.source?.disconnect();
        });
        this.calls.clear();
        this.localStream?.getTracks().forEach((t) => t.stop());
        this.localStream = null;
        if (this.audioCtx?.state !== 'closed') {
            this.audioCtx?.close().catch(() => {});
        }
        this.audioCtx = null;
        this.roster = [];
        this.playerPositions.clear();
        this._initialized = false;
        document.getElementById('voip-hud')?.classList.remove('active');
    },

    async startIfNeeded() {
        const net = window.Network;
        if (!net || net.mode === 'solo' || !this.config?.enabled) return;
        if (window.Session?.isSpectator && !this.config.spectatorsSpeak) {
            this._updateHud();
            return;
        }
        if (!voipUsesWebRtc(this.config)) {
            this._updateHud();
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            window.UI?.status?.('Microphone not supported — voice unavailable');
            return;
        }
        try {
            if (!this.localStream) {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                    video: false,
                });
                this._applyTransmission();
            }
            await this.reconcileRoster(this.roster);
            this._updateHud();
        } catch (e) {
            window.UI?.status?.(`Mic permission denied — ${e.message || 'voice off'}`);
        }
    },

    setConfig(config) {
        this.config = normalizeVoipConfig(config);
        this._applyTransmission();
        this._updateHud();
    },

    setRoster(roster = []) {
        this.roster = roster.filter((r) => r.peerId && r.key);
        return this.reconcileRoster(this.roster);
    },

    setPlayerPositions(map = {}) {
        this.playerPositions.clear();
        Object.entries(map || {}).forEach(([key, pos]) => {
            if (pos && Number.isFinite(pos.x)) this.playerPositions.set(String(key).toUpperCase(), pos);
        });
    },

    async reconcileRoster(roster = []) {
        const net = window.Network;
        const peer = net?.peer;
        if (!peer || !voipUsesWebRtc(this.config) || !this.localStream) return;

        const selfKey = (window.Session?.playerKey || '').toUpperCase();
        const want = new Map();
        roster.forEach((r) => {
            const key = String(r.key).toUpperCase();
            if (key === selfKey || !r.peerId) return;
            want.set(key, r);
        });

        for (const [key, entry] of [...this.calls.entries()]) {
            if (!want.has(key)) {
                try { entry.call?.close(); } catch (_) { /* */ }
                entry.source?.disconnect();
                this.calls.delete(key);
            }
        }

        for (const [key, meta] of want.entries()) {
            if (this.calls.has(key)) continue;
            try {
                const call = peer.call(meta.peerId, this.localStream, { metadata: { playerKey: selfKey } });
                if (!call) continue;
                this._wireCall(key, meta, call);
            } catch (e) {
                console.warn('[voip] call failed', key, e);
            }
        }
    },

    answerIncoming(call) {
        if (!voipUsesWebRtc(this.config) || !this.localStream) {
            try { call.close(); } catch (_) { /* */ }
            return;
        }
        const remoteKey = (call.metadata?.playerKey || call.peer || 'unknown').toUpperCase();
        const meta = this.roster.find((r) => String(r.key).toUpperCase() === remoteKey) || { key: remoteKey, name: remoteKey };
        if (this.calls.has(remoteKey)) {
            try { this.calls.get(remoteKey).call?.close(); } catch (_) { /* */ }
        }
        call.answer(this.localStream);
        this._wireCall(remoteKey, meta, call);
    },

    _wireCall(playerKey, meta, call) {
        const ctx = this._ensureAudioCtx();
        const entry = { call, meta, gain: ctx.createGain(), source: null };
        entry.gain.gain.value = this.config.proximity ? 0 : 1;
        entry.gain.connect(ctx.destination);

        call.on('stream', (stream) => {
            if (entry.source) entry.source.disconnect();
            entry.source = ctx.createMediaStreamSource(stream);
            entry.source.connect(entry.gain);
            this._updateProximity();
        });
        call.on('close', () => {
            entry.source?.disconnect();
            this.calls.delete(playerKey);
            this._updateHud();
        });
        call.on('error', () => {
            entry.source?.disconnect();
            this.calls.delete(playerKey);
        });

        this.calls.set(playerKey, entry);
        this._updateHud();
    },

    _ensureAudioCtx() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }
        return this.audioCtx;
    },

    _bindPtt() {
        if (this._pttBound) return;
        this._pttBound = true;
        const onDown = (e) => {
            if (!this._initialized || !voipUsesWebRtc(this.config)) return;
            if (this.config.transmission !== 'ptt') return;
            if (window.Controls?.isAction?.('voipPtt') || e.code === this.config.pttKey) {
                this.pttDown = true;
                this._applyTransmission();
                this._updateHud();
            }
        };
        const onUp = (e) => {
            if (this.config.transmission !== 'ptt') return;
            const pttCodes = window.Controls?.getActiveBindings?.()?.voipPtt || [this.config.pttKey];
            if (pttCodes.includes(e.code)) {
                this.pttDown = false;
                this._applyTransmission();
                this._updateHud();
            }
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        document.getElementById('voip-ptt-btn')?.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.pttDown = true;
            this._applyTransmission();
            this._updateHud();
        });
        document.getElementById('voip-ptt-btn')?.addEventListener('pointerup', () => {
            this.pttDown = false;
            this._applyTransmission();
            this._updateHud();
        });
        document.getElementById('voip-ptt-btn')?.addEventListener('pointerleave', () => {
            if (this.pttDown) {
                this.pttDown = false;
                this._applyTransmission();
                this._updateHud();
            }
        });
    },

    _applyTransmission() {
        const track = this.localStream?.getAudioTracks?.()[0];
        if (!track) return;
        if (this.selfMuted) {
            track.enabled = false;
            return;
        }
        if (this.config.transmission === 'open') {
            track.enabled = true;
            return;
        }
        track.enabled = !!this.pttDown;
    },

    toggleMute() {
        this.selfMuted = !this.selfMuted;
        this._applyTransmission();
        this._updateHud();
        return this.selfMuted;
    },

    toggleDeafen() {
        this.deafened = !this.deafened;
        this._updateProximity();
        this._updateHud();
        return this.deafened;
    },

    getLocalPosition() {
        const driveAv = window.TcDrive?.getAvatar?.();
        if (driveAv) return driveAv;
        const PC = window.PlayerController;
        if (PC?.spawned && PC.group) {
            const p = PC.group.position;
            return { x: p.x, y: p.y, z: p.z };
        }
        const cam = window.Engine?.camera;
        if (cam) return { x: cam.position.x, y: cam.position.y, z: cam.position.z };
        return { x: 0, y: 0, z: 0 };
    },

    _startPositionReporter() {
        clearInterval(this._posTimer);
        this._posTimer = setInterval(() => {
            const net = window.Network;
            if (!net || net.mode === 'solo' || !this.config?.enabled) return;
            if (window.Session?.isSpectator && !this.config.spectatorsSpeak) return;
            const driveAv = window.TcDrive?.getAvatar?.();
            if (driveAv) {
                if (net.mode === 'host') net.updateLocalAvatar(driveAv);
                else if (net.mode === 'guest') net.sendPlayerAvatar(driveAv);
                return;
            }
            const pos = this.getLocalPosition();
            const av = { ...pos, mode: window.PlayerController?.spawned ? 'walk' : 'fly' };
            const vitals = window.SurvivalNeeds?.pack?.();
            if (vitals) av.v = vitals;
            if (net.mode === 'host') net.updateLocalAvatar(av);
            else if (net.mode === 'guest') net.sendPlayerAvatar(av);
        }, POS_INTERVAL_MS);
    },

    _startProximityLoop() {
        clearInterval(this._proxTimer);
        this._proxTimer = setInterval(() => this._updateProximity(), PROX_TICK_MS);
    },

    _distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    _gainForDistance(dist) {
        const max = this.config.maxDistance || 24;
        const min = this.config.minVolume ?? 0.08;
        if (!this.config.proximity) return this.deafened ? 0 : 1;
        if (dist >= max) return this.deafened ? 0 : min;
        const t = 1 - dist / max;
        let g = this.config.falloff === 'exponential' ? t * t : t;
        g = min + (1 - min) * g;
        return this.deafened ? 0 : g;
    },

    _updateProximity() {
        if (!voipUsesWebRtc(this.config)) return;
        const selfKey = (window.Session?.playerKey || '').toUpperCase();
        const local = this.getLocalPosition();
        this.calls.forEach((entry, key) => {
            const remote = this.playerPositions.get(key) || entry.meta?.position;
            if (!remote) {
                entry.gain.gain.value = this.config.proximity ? this.config.minVolume : 1;
                return;
            }
            const dist = this._distance(local, remote);
            entry.gain.gain.value = this._gainForDistance(dist);
        });
    },

    openDiscord() {
        const url = this.config?.discordInvite;
        if (!url) {
            window.UI?.status?.('No Discord invite set by host');
            return;
        }
        const href = /^https?:\/\//i.test(url) ? url : `https://discord.gg/${url.replace(/^\/+/, '')}`;
        window.open(href, '_blank', 'noopener,noreferrer');
    },

    _updateHud() {
        const hud = document.getElementById('voip-hud');
        const summary = document.getElementById('voip-summary');
        const pttBtn = document.getElementById('voip-ptt-btn');
        const discordBtn = document.getElementById('voip-discord-btn');
        if (!hud) return;

        const net = window.Network;
        const active = net && net.mode !== 'solo' && this.config?.enabled && this.config.mode !== 'off';
        hud.classList.toggle('active', !!active);
        if (!active) return;

        if (summary) summary.textContent = summarizeVoipConfig(this.config);
        const webrtc = voipUsesWebRtc(this.config);
        const showPtt = webrtc && this.config.transmission === 'ptt';
        if (pttBtn) {
            pttBtn.style.display = showPtt ? '' : 'none';
            pttBtn.classList.toggle('voip-ptt-active', !!this.pttDown);
            pttBtn.textContent = this.pttDown ? 'TX…' : 'PTT';
        }
        if (discordBtn) {
            discordBtn.style.display = voipUsesDiscord(this.config) ? '' : 'none';
        }
        const muteBtn = document.getElementById('voip-mute-btn');
        if (muteBtn) muteBtn.classList.toggle('voip-muted', this.selfMuted);
        const deafBtn = document.getElementById('voip-deafen-btn');
        if (deafBtn) deafBtn.classList.toggle('voip-muted', this.deafened);

        const links = document.getElementById('voip-links');
        if (links) {
            const n = this.calls.size;
            links.textContent = webrtc ? `${n} voice link${n === 1 ? '' : 's'}` : '';
        }
    },
};

window.Voip = Voip;