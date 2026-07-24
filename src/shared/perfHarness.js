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
        this._durationMs = Math.max(1500, Number(durationMs) || 5000);
        this._warmMs = Math.max(0, Number(opts.warmMs ?? 1000));
        this._label = opts.label || 'sample';
        this._frameTimes = [];
        this._prevFrame = 0;
        this._sampleStart = 0;
        this._maxDt = Number(opts.maxDtMs) || 100; // drop hitch spikes from stats

        window.UI?.status?.(`PERF sample ${this._durationMs / 1000}s (warm ${this._warmMs}ms)…`);

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
                const elapsed = now - this._sampleStart;
                // Discard warm-up + extreme hitch frames (tab focus, GC)
                if (elapsed >= this._warmMs && dt > 0 && dt < this._maxDt) {
                    this._frameTimes.push(dt);
                }

                if (elapsed < this._durationMs) {
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
            warmMs: this._warmMs,
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

    /**
     * Headless / CI scenario: spawn N cubes, optional Neg LOD, tier, orbit camera, measure.
     * @param {{
     *   cubes?: number,
     *   negLod?: boolean,
     *   tier?: string,
     *   durationMs?: number,
     *   orbit?: boolean,
     *   orbitRadius?: number,
     *   label?: string,
     *   clearProps?: boolean,
     * }} [opts]
     */
    async runScenario(opts = {}) {
        const cubes = Math.max(0, Math.min(2000, Number(opts.cubes) || 200));
        const negLod = opts.negLod !== false;
        const tier = opts.tier || 'compatibility';
        const durationMs = Math.max(2000, Number(opts.durationMs) || 5000);
        const warmMs = Math.max(0, Number(opts.warmMs ?? 1000));
        const orbit = opts.orbit !== false;
        const orbitRadius = Number(opts.orbitRadius) || 28;
        const label = opts.label || `cubes${cubes}_${negLod ? 'neg' : 'full'}_${tier}`;

        // EDIT world so World.createObject is allowed
        if (window.State && !window.State.isPaused) {
            window.State.isPaused = true;
            window.UI?.updateSimMode?.();
            window.dispatchEvent(new CustomEvent('threshold:pause', { detail: { paused: true, reason: 'perf' } }));
        }
        window.SurfaceProfile?.set?.('creator');
        window.GraphicsProfile?.apply?.(tier, { silent: true, persist: false });

        if (opts.clearProps !== false) {
            this._clearPerfProps();
        }

        const World = window.World;
        const THREE = window.THREE;
        const spawned = [];
        if (World?.createObject && cubes > 0) {
            const side = Math.ceil(Math.sqrt(cubes));
            const spacing = 2.2;
            const origin = -((side - 1) * spacing) / 2;
            let n = 0;
            for (let z = 0; z < side && n < cubes; z += 1) {
                for (let x = 0; x < side && n < cubes; x += 1) {
                    // Vary colors so appearance-tint path is exercised
                    const hue = (n * 0.07) % 1;
                    const color = THREE
                        ? new THREE.Color().setHSL(hue, 0.55, 0.48).getHex()
                        : 0x888888;
                    const mesh = World.createObject('cube', `perf_${n}`, color, false);
                    if (mesh) {
                        mesh.position.set(origin + x * spacing, 0.5, origin + z * spacing);
                        mesh.userData.isPerfProp = true;
                        mesh.userData.locked = true;
                        if (negLod) {
                            window.NegativeLod?.enableObject?.(mesh, {
                                distance: window.NegativeLod?.config?.defaultDistance || 100,
                                source: 'perf-scenario',
                            });
                        } else {
                            window.NegativeLod?.disableObject?.(mesh, { clearFlag: true, forceOff: true });
                        }
                        spawned.push(mesh);
                        n += 1;
                    }
                }
            }
        }

        window.NegativeLod?.applyTierPolicy?.(tier);
        window.VisibilitySystem?.invalidateSpatial?.();

        // Resume PLAY for realistic render loop cost
        if (window.State) {
            window.State.isPaused = false;
            window.UI?.updateSimMode?.();
            window.dispatchEvent(new CustomEvent('threshold:pause', { detail: { paused: false } }));
        }

        // Warm a few frames
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        let orbitStop = null;
        if (orbit && window.Engine?.camera) {
            orbitStop = this._startOrbit(orbitRadius);
        }

        try {
            const result = await this.measure(durationMs, { label, warmMs });
            result.scenario = {
                cubes,
                spawned: spawned.length,
                negLod,
                tier,
                orbit,
                orbitRadius,
                warmMs,
            };
            this._lastResult = result;
            this._paintSetup(result);
            return result;
        } finally {
            if (typeof orbitStop === 'function') orbitStop();
        }
    },

    _clearPerfProps() {
        const State = window.State;
        const Engine = window.Engine;
        if (!State?.objects) return;
        const keep = [];
        for (const o of State.objects) {
            if (o?.userData?.isPerfProp || String(o?.userData?.name || '').startsWith('perf_')) {
                try {
                    window.NegativeLod?.disableObject?.(o, { clearFlag: true });
                    Engine?.scene?.remove?.(o);
                    o.geometry?.dispose?.();
                    const mats = Array.isArray(o.material) ? o.material : [o.material];
                    mats.forEach((m) => m?.dispose?.());
                } catch { /* ignore */ }
            } else {
                keep.push(o);
            }
        }
        State.objects = keep;
        window.VisibilitySystem?.invalidateSpatial?.();
    },

    _startOrbit(radius = 28) {
        const cam = window.Engine?.camera;
        if (!cam) return () => {};
        const controls = window.Engine?.controls;
        const prevEnabled = controls?.enabled;
        if (controls) controls.enabled = false;
        let t0 = performance.now();
        let alive = true;
        const tick = (now) => {
            if (!alive) return;
            const t = (now - t0) / 1000;
            const y = 10 + Math.sin(t * 0.4) * 2;
            cam.position.set(Math.sin(t * 0.55) * radius, y, Math.cos(t * 0.55) * radius);
            cam.lookAt(0, 1.5, 0);
            cam.updateMatrixWorld?.(true);
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        return () => {
            alive = false;
            if (controls) controls.enabled = prevEnabled !== false;
        };
    },
};

export function initPerfHarness() {
    PerfHarness.initUi();
}

window.PerfHarness = PerfHarness;
window.initPerfHarness = initPerfHarness;
