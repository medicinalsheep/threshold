/**
 * Repeatable perf sample: frame times + Neg LOD + Visibility + draw stats.
 * SETUP → PERF or window.PerfHarness.measure()
 * @see docs/PERF_NEXT.md
 */

function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[i];
}

function sceneCounts() {
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
}

export const PerfHarness = {
    _running: false,
    _lastResult: null,
    _frameTimes: [],
    _sampleRaf: 0,
    _sampleStart: 0,
    _prevFrame: 0,
    _durationMs: 5000,
    _label: 'sample',
    _resolve: null,

    get lastResult() {
        return this._lastResult;
    },

    get isRunning() {
        return this._running;
    },

    /** Instant snapshot (no wait). */
    snapshot(extra = {}) {
        const neg = window.NegativeLod?.getStats?.() || {};
        const vis = window.VisibilitySystem?.getStats?.() || {};
        const scene = sceneCounts();
        return {
            t: new Date().toISOString(),
            version: document.querySelector('meta[name="threshold-version"]')?.content
                || document.getElementById('app-version')?.textContent
                || null,
            tier: window.State?.graphicsTier || null,
            detectedTier: window.State?.graphicsDetectedTier || null,
            paused: !!window.State?.isPaused,
            fpsHud: window.CreatorHud?._fps ?? null,
            scene,
            negativeLod: {
                registered: neg.registered ?? 0,
                flat: neg.flat ?? 0,
                full: neg.full ?? 0,
                switches: neg.switches ?? 0,
                scanned: neg.scanned ?? 0,
                poolSize: neg.poolSize ?? 0,
            },
            visibility: {
                A: vis.A ?? 0,
                B: vis.B ?? 0,
                C: vis.C ?? 0,
                D: vis.D ?? 0,
                E: vis.E ?? 0,
                shadowsDimmed: vis.shadowsDimmed ?? 0,
                physicsAsleep: vis.physicsAsleep ?? 0,
                spatialMode: vis.spatialMode ?? 'off',
                spatialCandidates: vis.spatialCandidates ?? 0,
                spatialCells: vis.spatialCells ?? 0,
                fullSweep: !!vis.fullSweep,
            },
            ...extra,
        };
    },

    /**
     * Sample frame deltas for durationMs, then return stats + end snapshot.
     * @param {number} [durationMs=5000]
     * @param {{ label?: string }} [opts]
     */
    measure(durationMs = 5000, opts = {}) {
        if (this._running) {
            return Promise.reject(new Error('PerfHarness already running'));
        }
        this._running = true;
        this._durationMs = Math.max(1000, Number(durationMs) || 5000);
        this._label = opts.label || 'sample';
        this._frameTimes = [];
        this._prevFrame = 0;
        this._sampleStart = 0;

        window.UI?.status?.(`PERF sample ${this._durationMs / 1000}s…`);

        return new Promise((resolve, reject) => {
            this._resolve = resolve;
            const onFrame = (now) => {
                if (!this._running) return;
                if (!this._sampleStart) {
                    this._sampleStart = now;
                    this._prevFrame = now;
                    this._sampleRaf = requestAnimationFrame(onFrame);
                    return;
                }
                const dt = now - this._prevFrame;
                this._prevFrame = now;
                if (dt > 0 && dt < 250) this._frameTimes.push(dt);

                if (now - this._sampleStart < this._durationMs) {
                    this._sampleRaf = requestAnimationFrame(onFrame);
                    return;
                }
                this._finish(resolve);
            };
            try {
                this._sampleRaf = requestAnimationFrame(onFrame);
            } catch (e) {
                this._running = false;
                reject(e);
            }
        });
    },

    _finish(resolve) {
        if (this._sampleRaf) cancelAnimationFrame(this._sampleRaf);
        this._sampleRaf = 0;
        this._running = false;

        const times = this._frameTimes.slice().sort((a, b) => a - b);
        const n = times.length;
        const sum = times.reduce((a, b) => a + b, 0);
        const mean = n ? sum / n : 0;
        const fpsAvg = mean > 0 ? 1000 / mean : 0;
        // 1% low: average of slowest 1% frames → fps of that avg
        const worstCount = Math.max(1, Math.ceil(n * 0.01));
        const worst = times.slice(-worstCount);
        const worstMean = worst.reduce((a, b) => a + b, 0) / worst.length;
        const fps1pct = worstMean > 0 ? 1000 / worstMean : 0;

        const result = {
            label: this._label,
            durationMs: this._durationMs,
            frames: n,
            fpsAvg: Math.round(fpsAvg * 10) / 10,
            fps1pctLow: Math.round(fps1pct * 10) / 10,
            frameMs: {
                p50: Math.round(percentile(times, 50) * 100) / 100,
                p95: Math.round(percentile(times, 95) * 100) / 100,
                p99: Math.round(percentile(times, 99) * 100) / 100,
                mean: Math.round(mean * 100) / 100,
            },
            end: this.snapshot(),
        };
        this._lastResult = result;
        this._paintSetup(result);
        window.UI?.status?.(
            `PERF ${result.label}: ${result.fpsAvg} fps avg · ${result.fps1pctLow} 1%low · p95 ${result.frameMs.p95}ms · neg ${result.end.negativeLod.flat}/${result.end.negativeLod.registered} flat`,
        );
        window.dispatchEvent(new CustomEvent('threshold:perf-sample', { detail: result }));
        resolve(result);
    },

    cancel() {
        if (!this._running) return;
        this._running = false;
        if (this._sampleRaf) cancelAnimationFrame(this._sampleRaf);
        this._sampleRaf = 0;
        this._resolve = null;
        window.UI?.status?.('PERF sample cancelled');
    },

    downloadLast() {
        const data = this._lastResult || this.snapshot({ note: 'instant-snapshot' });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `threshold-perf-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    _paintSetup(result) {
        const el = document.getElementById('perf-harness-results');
        if (!el || !result) return;
        const neg = result.end?.negativeLod || {};
        const vis = result.end?.visibility || {};
        el.textContent = [
            `${result.label} · ${result.frames} frames · ${result.durationMs}ms`,
            `FPS avg ${result.fpsAvg} · 1% low ${result.fps1pctLow}`,
            `frame ms p50 ${result.frameMs.p50} · p95 ${result.frameMs.p95} · p99 ${result.frameMs.p99}`,
            `tier ${result.end?.tier} · objs ${result.end?.scene?.objects} · draw ${result.end?.scene?.draws}`,
            `NegLOD flat ${neg.flat}/${neg.registered} · switches ${neg.switches}`,
            `Vis A${vis.A}/B${vis.B}/C${vis.C}/D${vis.D}/E${vis.E} · sh${vis.shadowsDimmed} ps${vis.physicsAsleep}`,
        ].join('\n');
    },

    initUi() {
        document.getElementById('perf-harness-run')?.addEventListener('click', () => {
            const sec = parseFloat(document.getElementById('perf-harness-seconds')?.value) || 5;
            void this.measure(sec * 1000, { label: 'setup' }).catch((e) => {
                window.UI?.status?.(String(e.message || e).slice(0, 80));
            });
        });
        document.getElementById('perf-harness-download')?.addEventListener('click', () => {
            this.downloadLast();
        });
        document.getElementById('perf-harness-snapshot')?.addEventListener('click', () => {
            this._lastResult = {
                label: 'snapshot',
                durationMs: 0,
                frames: 0,
                fpsAvg: window.CreatorHud?._fps ?? 0,
                fps1pctLow: 0,
                frameMs: { p50: 0, p95: 0, p99: 0, mean: 0 },
                end: this.snapshot(),
            };
            this._paintSetup(this._lastResult);
            window.UI?.status?.('PERF snapshot captured');
        });
    },
};

export function initPerfHarness() {
    PerfHarness.initUi();
}

window.PerfHarness = PerfHarness;
window.initPerfHarness = initPerfHarness;
