/** Sprint B — performance HUD + multiplayer sync status for creators */

import { ViewPrefs } from './viewPrefs.js';

const PERF_INTERVAL_MS = 400;

function isTypingTarget() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

export const CreatorHud = {
    _perfEl: null,
    _syncEl: null,
    _perfVisible: true,
    _frameCount: 0,
    _lastPerfAt: 0,
    _fps: 0,

    init() {
        this._perfEl = document.getElementById('creator-perf-hud');
        this._syncEl = document.getElementById('creator-sync-chip');
        this._perfVisible = ViewPrefs.get('creatorPerfHud', true);

        document.getElementById('btn-perf-hud-toggle')?.addEventListener('click', () => {
            this.setPerfVisible(!this._perfVisible);
        });

        window.addEventListener('keydown', (e) => {
            if (e.code !== 'Backquote' || e.ctrlKey || e.metaKey || e.altKey) return;
            if (isTypingTarget()) return;
            if (!document.getElementById('view-engine')?.classList.contains('active')) return;
            e.preventDefault();
            this.setPerfVisible(!this._perfVisible);
        });

        this._lastPerfAt = performance.now();
        this._applyPerfVisibility();
        const btn = document.getElementById('btn-perf-hud-toggle');
        if (btn) btn.classList.toggle('active', this._perfVisible);
        this.updateSync();
    },

    setPerfVisible(on) {
        this._perfVisible = !!on;
        ViewPrefs.set('creatorPerfHud', this._perfVisible);
        this._applyPerfVisibility();
        const btn = document.getElementById('btn-perf-hud-toggle');
        if (btn) btn.classList.toggle('active', this._perfVisible);
    },

    _applyPerfVisibility() {
        this._perfEl?.classList.toggle('visible', this._perfVisible);
    },

    tick(time) {
        this._frameCount += 1;
        if (time - this._lastPerfAt < PERF_INTERVAL_MS) return;
        const elapsed = Math.max(1, time - this._lastPerfAt);
        this._fps = Math.round((this._frameCount * 1000) / elapsed);
        this._frameCount = 0;
        this._lastPerfAt = time;
        this.updatePerf();
        this.updateSync();
    },

    _sceneStats() {
        const State = window.State;
        const Engine = window.Engine;
        let meshes = 0;
        Engine?.scene?.traverse?.((c) => {
            if (c.isMesh) meshes += 1;
        });
        const render = Engine?.renderer?.info?.render;
        return {
            objects: State?.objects?.length ?? 0,
            bodies: State?.physicsObjects?.length ?? 0,
            meshes,
            draws: render?.calls ?? 0,
            tris: render?.triangles ?? 0,
        };
    },

    updatePerf() {
        if (!this._perfEl || !this._perfVisible) return;
        const State = window.State;
        const tier = State?.graphicsTier || 'realistic';
        const mode = State?.renderMode ?? 4;
        const s = this._sceneStats();
        const neg = window.NegativeLod?.getStats?.() || {};
        const vis = window.VisibilitySystem?.getStats?.() || {};
        const last = window.PerfHarness?.lastResult;
        const sampleBit = last?.fpsAvg
            ? `sample ${last.fpsAvg}fps p95 ${last.frameMs?.p95 ?? '—'}ms`
            : null;
        this._perfEl.textContent = [
            `FPS ${this._fps}`,
            sampleBit,
            `objs ${s.objects}`,
            `draw ${s.draws}`,
            `neg ${neg.flat ?? 0}/${neg.registered ?? 0}`,
            `vis A${vis.A ?? 0}/C${vis.C ?? 0}/E${vis.E ?? 0}${vis.spatialMode && vis.spatialMode !== 'off' ? `/${vis.spatialMode}` : ''}`,
            `tier ${tier}`,
            mode === 4 ? 'pbr' : `retro${mode}`,
        ].filter(Boolean).join(' · ');
        this._perfEl.title = [
            `${s.tris.toLocaleString()} triangles`,
            `bodies ${s.bodies} · mesh ${s.meshes}`,
            `NegLOD flat/reg · Vis A–E (sh${vis.shadowsDimmed ?? 0}/ps${vis.physicsAsleep ?? 0})`,
            '` toggles HUD · SETUP → PERF for 5s sample + JSON',
        ].join(' · ');
    },

    updateSync() {
        if (!this._syncEl) return;
        const Network = window.Network;
        const State = window.State;
        const mode = Network?.mode || 'solo';
        const rain = Math.round((window.WeatherSystem?.getIntensity?.() ?? 0) * 100);
        const weatherOn = window.WeatherSystem?._active;

        let role = 'SOLO';
        let roleClass = 'solo';
        if (mode === 'host') {
            const n = Network?.peerCount ?? 0;
            role = `HOST · ${n} guest${n === 1 ? '' : 's'}`;
            roleClass = 'host';
        } else if (mode === 'guest') {
            role = `GUEST · ${Network?.roomId || '?'}`;
            roleClass = 'guest';
        } else if (mode === 'spectate') {
            role = `SPECTATE · ${Network?.roomId || '?'}`;
            roleClass = 'spectate';
        }

        const avatarCount = mode === 'host'
            ? (Network?.playerAvatars?.size ?? 0)
            : Object.keys(State?.syncPlayerAvatars || {}).length;
        const appearanceLabel = mode === 'solo'
            ? 'appearances local'
            : `appearances ${avatarCount || '—'}`;

        const weatherLabel = weatherOn
            ? (rain > 4 ? `weather ${rain}%` : 'weather on')
            : 'weather off';

        const audioTitle = [
            'Recorded SFX and GIMP texture blobs stay on each device until exported.',
            'Host syncs world transforms, weather, graphics tier, and player appearances.',
            'Use EXPORT or assets:pack to ship audio/textures in standalone builds.',
        ].join(' ');

        const parts = [
            `<span class="sync-role sync-${roleClass}">${role}</span>`,
            `<span class="sync-pill">${weatherLabel}</span>`,
            `<span class="sync-pill">${appearanceLabel}</span>`,
        ];

        if (mode !== 'solo') {
            const audioStatus = window.AudioManifestSync?.getGuestStatus?.();
            if ((mode === 'guest' || mode === 'spectate') && audioStatus?.total) {
                const label = audioStatus.missing
                    ? `audio ${audioStatus.received}/${audioStatus.total} ⓘ`
                    : `audio synced ⓘ`;
                parts.push(`<span class="sync-pill sync-audio${audioStatus.missing ? ' sync-audio-pending' : ''}" title="${audioTitle}">${label}</span>`);
            } else {
                parts.push(`<span class="sync-pill sync-audio" title="${audioTitle}">audio local only ⓘ</span>`);
            }

            const texStatus = window.TextureManifestSync?.getGuestStatus?.();
            if ((mode === 'guest' || mode === 'spectate') && texStatus?.total) {
                const label = texStatus.missing
                    ? `tex ${texStatus.received}/${texStatus.total} ⓘ`
                    : `tex synced ⓘ`;
                parts.push(`<span class="sync-pill sync-tex${texStatus.missing ? ' sync-audio-pending' : ''}" title="GIMP SYNC texture blobs from host">${label}</span>`);
            }
        }

        if (window.CollaborateGuard?.sceneLocked && mode !== 'solo') {
            parts.push('<span class="sync-pill sync-lock" title="Only host can edit world">scene locked</span>');
        }
        if (mode === 'host' && window.CollaborateGuard?.pendingCount?.() > 0) {
            const n = window.CollaborateGuard.pendingCount();
            parts.push(`<span class="sync-pill sync-ai-pending" title="Click PLAYERS or approve in modal">${n} AI pending</span>`);
        }

        const rebuild = window.GuestRebuildTelemetry?.summary?.();
        if ((mode === 'guest' || mode === 'spectate') && rebuild?.total) {
            parts.push(`<span class="sync-pill sync-rebuild" title="${rebuild.detail}">${rebuild.label}</span>`);
        }
        const handoff = window.HostMigration?.getHandoff?.();
        if (handoff?.code && mode !== 'host') {
            parts.push(`<span class="sync-pill sync-handoff" title="Host handoff snapshot">handoff ${handoff.code}</span>`);
        }

        const editLock = State?.isPaused ? 'EDIT' : 'PLAY';
        parts.push(`<span class="sync-pill sync-mode">${editLock}</span>`);

        this._syncEl.innerHTML = parts.join('');
        this._syncEl.title = mode === 'solo'
            ? 'Solo session — full local edit. Join multiplayer to see sync details.'
            : 'Live sync status — click for SYNC STORY';
        this._syncEl.classList.toggle('sync-chip-clickable', mode !== 'solo');
    },
};

export function initCreatorHud() {
    CreatorHud.init();
}

window.CreatorHud = CreatorHud;
window.initCreatorHud = initCreatorHud;