import circuitCfg from '../../config/tc-circuit.json';
import { Actions } from './actions.js';
import { RemotePlayers } from './remotePlayers.js';

function emptyCircuit() {
    return {
        running: false,
        checkpointId: circuitCfg.checkpointId || 'tc_cp',
        radius: circuitCfg.radius ?? 2.2,
        minLapSec: circuitCfg.minLapSec ?? 3,
        startedAt: null,
        lastGatePulse: 0,
        players: {},
        recent: [],
    };
}

function playerRow(key, name) {
    return {
        key: String(key).toUpperCase(),
        name: name || `Player-${key}`,
        lap: 0,
        lastLapSec: null,
        bestSec: null,
        totalSec: 0,
    };
}

export const TcCircuit = {
    state: emptyCircuit(),
    _local: { lapT0: 0, insideCp: false, ticking: false },
    _tickBound: null,

    findCheckpoint() {
        const id = this.state.checkpointId || 'tc_cp';
        const norm = window.TcMeta?.normTcId?.(id) || id;
        return (window.State?.objects || []).find(
            (o) => o.userData?.id === id || o.userData?.id === norm
        );
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
        return null;
    },

    _seedPlayers() {
        const net = window.Network;
        const Session = window.Session;
        const rows = {};
        if (net?.mode === 'host') {
            net.getPlayerList().forEach((p) => {
                rows[p.key] = playerRow(p.key, p.name);
            });
        } else if (Session) {
            rows[Session.playerKey] = playerRow(Session.playerKey, Session.playerName);
        }
        return rows;
    },

    start(options = {}, silent = false) {
        const net = window.Network;
        if (net?.mode === 'guest') {
            Actions.dispatch('CIRCUIT_START', options);
            return this.state;
        }
        if (net?.mode === 'spectate') {
            window.UI?.status?.('Spectators cannot start the circuit');
            return this.state;
        }

        const cp = this.findCheckpoint();
        if (!cp && !options.force) {
            window.UI?.status?.('TC Circuit — load TC showcase first (Lobby → TC →)');
            return this.state;
        }

        this.state = {
            ...emptyCircuit(),
            running: true,
            checkpointId: options.checkpointId || circuitCfg.checkpointId || 'tc_cp',
            radius: options.radius ?? circuitCfg.radius ?? 2.2,
            minLapSec: options.minLapSec ?? circuitCfg.minLapSec ?? 3,
            startedAt: new Date().toISOString(),
            players: this._seedPlayers(),
            recent: [],
        };
        this._local.lapT0 = performance.now();
        this._local.insideCp = false;
        this._bindTick();
        this._renderHud();
        window.TcGateFx?.ensureGate?.(cp);

        if (!silent) {
            window.UI?.status?.('TC Circuit live — drive through the green gate (tc_cp) to log laps');
        }
        if (net?.mode === 'host') net.scheduleBroadcast();
        return this.state;
    },

    stop(silent = false) {
        const net = window.Network;
        if (net?.mode === 'guest') {
            Actions.dispatch('CIRCUIT_STOP', {});
            return;
        }
        this.state.running = false;
        this._unbindTick();
        this._renderHud();
        if (!silent) window.UI?.status?.('TC Circuit stopped');
        if (net?.mode === 'host') net.scheduleBroadcast();
    },

    recordLap(playerKey, payload = {}) {
        const net = window.Network;
        if (net?.mode === 'guest') return;

        const key = String(playerKey || window.Session?.playerKey || '').toUpperCase();
        const elapsed = Number(payload.elapsedSec);
        if (!Number.isFinite(elapsed) || elapsed < (this.state.minLapSec || 3)) return;

        if (!this.state.players[key]) {
            const name = net?.getPlayerList?.().find((p) => p.key === key)?.name || key;
            this.state.players[key] = playerRow(key, name);
        }
        const row = this.state.players[key];
        row.lap += 1;
        row.lastLapSec = elapsed;
        row.bestSec = row.bestSec == null ? elapsed : Math.min(row.bestSec, elapsed);
        row.totalSec = (row.totalSec || 0) + elapsed;

        const event = {
            playerKey: key,
            name: row.name,
            lap: row.lap,
            elapsedSec: elapsed,
            at: new Date().toISOString(),
        };
        this.state.recent = [event, ...(this.state.recent || [])].slice(0, circuitCfg.maxRecent || 8);
        this.state.lastGatePulse = performance.now();

        const msg = `${row.name} lap ${row.lap}: ${elapsed.toFixed(2)}s · best ${row.bestSec.toFixed(2)}s`;
        window.UI?.status?.(msg);
        this._renderHud();

        if (net?.mode === 'host') net.scheduleLiveSync?.();
        return event;
    },

    applyState(circuit) {
        if (!circuit) {
            this.state = emptyCircuit();
            this._unbindTick();
            this._renderHud();
            return;
        }
        this.state = { ...emptyCircuit(), ...circuit };
        if (this.state.running) this._bindTick();
        else this._unbindTick();
        this._renderHud();
        if (this.state.lastGatePulse) window.TcGateFx?.onCircuitPulse?.(this.state.lastGatePulse);
    },

    captureState() {
        return this.state?.running || Object.keys(this.state?.players || {}).length
            ? { ...this.state, players: { ...this.state.players }, recent: [...(this.state.recent || [])] }
            : null;
    },

    onLocalCrossing(elapsedSec) {
        const key = String(window.Session?.playerKey || '').toUpperCase();
        const net = window.Network;

        window.TcGateFx?.trigger?.();
        if (net?.mode === 'host' || net?.mode === 'solo') {
            this.recordLap(key, { elapsedSec });
        } else if (net?.mode === 'guest') {
            Actions.dispatch('LAP_CROSS', { elapsedSec });
        }
        this._local.lapT0 = performance.now();
    },

    tick() {
        if (!this.state?.running) return;

        const cp = this.findCheckpoint();
        if (!cp) return;

        const pos = this.getLocalPosition();
        if (!pos) return;

        const dx = pos.x - cp.position.x;
        const dy = pos.y - cp.position.y;
        const dz = pos.z - cp.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const inside = dist < (this.state.radius || 2.2);

        if (inside && !this._local.insideCp) {
            const elapsed = (performance.now() - this._local.lapT0) / 1000;
            if (elapsed >= (this.state.minLapSec || 3)) {
                this.onLocalCrossing(elapsed);
            }
        }
        this._local.insideCp = inside;

        const net = window.Network;
        const avatars = net?.mode === 'host'
            ? net.getPlayerAvatars?.()
            : window.State?.syncPlayerAvatars;
        const roster = net?.mode === 'host'
            ? net.getPlayerList()
            : (this.state.players ? Object.values(this.state.players).map((p) => ({ key: p.key, name: p.name })) : []);
        if (avatars && Object.keys(avatars).length) {
            RemotePlayers.syncAvatars(avatars, roster);
        }
    },

    _bindTick() {
        if (this._local.ticking) return;
        this._local.ticking = true;
        this._tickBound = () => this.tick();
        const loop = () => {
            if (!this._local.ticking) return;
            this._tickBound();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    _unbindTick() {
        this._local.ticking = false;
        RemotePlayers.clear();
    },

    _renderHud() {
        const hud = document.getElementById('circuit-hud');
        const board = document.getElementById('circuit-board');
        const recent = document.getElementById('circuit-recent');
        if (!hud || !board) return;

        const active = !!this.state?.running;
        hud.classList.toggle('active', active);
        if (!active) {
            board.innerHTML = '';
            if (recent) recent.textContent = '';
            return;
        }

        const rows = Object.values(this.state.players || {}).sort((a, b) => {
            const ba = a.bestSec ?? Infinity;
            const bb = b.bestSec ?? Infinity;
            if (ba !== bb) return ba - bb;
            return (b.lap || 0) - (a.lap || 0);
        });

        board.innerHTML = rows.length
            ? rows.map((p, i) => `
                <div class="circuit-row${i === 0 && p.bestSec != null ? ' circuit-leader' : ''}">
                    <span class="circuit-name">${p.name}</span>
                    <span class="circuit-stat">L${p.lap || 0}</span>
                    <span class="circuit-stat">${p.lastLapSec != null ? `${p.lastLapSec.toFixed(1)}s` : '—'}</span>
                    <span class="circuit-stat">${p.bestSec != null ? `${p.bestSec.toFixed(1)}s` : '—'}</span>
                </div>`).join('')
            : '<div class="circuit-row"><span class="circuit-name">Waiting for racers…</span></div>';

        if (recent) {
            const last = (this.state.recent || [])[0];
            recent.textContent = last
                ? `Last: ${last.name} lap ${last.lap} · ${last.elapsedSec.toFixed(2)}s`
                : 'Drive through the green gate to start timing';
        }
    },
};

window.TcCircuit = TcCircuit;
window.World = window.World || {};
window.World.startTcCircuit = (opts) => TcCircuit.start(opts);
window.World.stopTcCircuit = () => TcCircuit.stop();