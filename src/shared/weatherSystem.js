/** Dynamic weather — real clipped rain/thunder loops + particle visuals */

const RAIN_LAYERS = [
    { key: 'light', clipId: 'starter_rain_light', base: 0.14 },
    { key: 'heavy', clipId: 'starter_rain_heavy', base: 0.18 },
    { key: 'roof', clipId: 'starter_rain_roof', base: 0.08 },
];

const THUNDER_NEAR = [
    'starter_thunder_near',
    'starter_thunder_near_b',
    'starter_thunder_near_c',
];

const THUNDER_DISTANT = [
    'starter_thunder_distant',
    'starter_thunder_distant_b',
    'starter_thunder_distant_c',
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

export const WeatherSystem = {
    _active: false,
    _intensity: 0,
    _targetIntensity: 0.5,
    _rainHandles: {},
    _nextThunder: 0,
    _nextGust: 0,
    _particles: null,
    _particleVel: null,
    _particleData: null,
    _wetTargets: [],
    _fogBase: null,

    init() {
        this._collectWetTargets();
        const fog = window.Engine?.scene?.fog;
        if (fog?.isFogExp2) this._fogBase = fog.density;
        else if (fog?.isFog) this._fogBase = fog.near;
    },

    start(opts = {}) {
        if (!window.AudioSys?.playClipLoop) return;
        this._active = true;
        this._targetIntensity = opts.intensity ?? 0.55;
        if (opts.intensity != null) this._intensity = opts.intensity * 0.4;
        else if (this._intensity < 0.05) this._intensity = 0.12;

        const now = performance.now();
        this._nextThunder = now + 8000 + Math.random() * 14000;
        this._nextGust = now + 12000 + Math.random() * 18000;

        this._startRainLoops();
        this._ensureParticles(true);
        this._applyWetness();
    },

    stop() {
        this._active = false;
        Object.values(this._rainHandles).forEach((h) => h?.stop?.());
        this._rainHandles = {};
        if (this._particles) {
            this._particles.visible = false;
        }
        this._restoreWetness();
        const fog = window.Engine?.scene?.fog;
        if (fog?.isFogExp2 && this._fogBase != null) fog.density = this._fogBase;
        else if (fog?.isFog && this._fogBase != null) fog.near = this._fogBase;
    },

    setWeather(opts = {}) {
        if (opts.rain === false || opts.enabled === false) {
            this.stop();
            return this;
        }
        if (opts.intensity != null) {
            this._targetIntensity = Math.max(0, Math.min(1, opts.intensity));
        }
        if (!this._active) this.start(opts);
        return this;
    },

    getIntensity() {
        return this._intensity;
    },

    _collectWetTargets() {
        const objects = window.State?.objects || [];
        this._wetTargets = objects.filter((o) => {
            const st = o.userData?.surfaceType;
            return st === 'asphalt' || st === 'concrete' || o.userData?.id === 'starter_ground';
        }).map((mesh) => {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
                if (m && m.roughness != null && m.userData?._dryRoughness == null) {
                    m.userData = m.userData || {};
                    m.userData._dryRoughness = m.roughness;
                }
            });
            return mesh;
        });
    },

    _applyWetness() {
        const wet = this._intensity;
        this._wetTargets.forEach((mesh) => {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
                if (!m || m.userData?._dryRoughness == null) return;
                m.roughness = lerp(m.userData._dryRoughness, Math.max(0.42, m.userData._dryRoughness - 0.28), wet);
            });
        });
        const fog = window.Engine?.scene?.fog;
        if (fog?.isFogExp2 && this._fogBase != null) {
            fog.density = lerp(this._fogBase, this._fogBase * 1.38, wet);
        } else if (fog?.isFog && this._fogBase != null) {
            fog.near = lerp(this._fogBase, this._fogBase * 0.55, wet);
        }
    },

    _restoreWetness() {
        this._wetTargets.forEach((mesh) => {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
                if (!m || m.userData?._dryRoughness == null) return;
                m.roughness = m.userData._dryRoughness;
            });
        });
    },

    async _startRainLoops() {
        const AudioSys = window.AudioSys;
        for (const layer of RAIN_LAYERS) {
            if (this._rainHandles[layer.key]) continue;
            const handle = await AudioSys.playClipLoop(layer.clipId, 0);
            if (handle) this._rainHandles[layer.key] = handle;
        }
    },

    _rainLayerVol(layer, intensity) {
        const t = intensity;
        if (layer.key === 'light') return layer.base * (1 - t * 0.55) * (0.35 + t * 0.65);
        if (layer.key === 'heavy') return layer.base * t * t;
        if (layer.key === 'roof') return layer.base * (0.25 + t * 0.75);
        return layer.base * t;
    },

    _scheduleThunder(now) {
        const base = lerp(22000, 7000, this._intensity);
        this._nextThunder = now + base + Math.random() * base * 0.8;
    },

    _scheduleGust(now) {
        this._nextGust = now + 14000 + Math.random() * 22000;
    },

    _playThunder() {
        const i = this._intensity;
        if (i < 0.12) return;
        const nearChance = lerp(0.12, 0.42, i);
        const isNear = Math.random() < nearChance;
        const clipId = pick(isNear ? THUNDER_NEAR : THUNDER_DISTANT);
        const vol = isNear
            ? 0.55 + Math.random() * 0.35
            : 0.22 + Math.random() * 0.28;
        const rate = isNear
            ? 0.92 + Math.random() * 0.12
            : 0.78 + Math.random() * 0.18;
        window.AudioSys?.playClipVariation?.(clipId, { volume: vol * i, playbackRate: rate });
    },

    _playGust() {
        if (this._intensity < 0.35) return;
        window.AudioSys?.playClipVariation?.('starter_wind_gust_real', {
            volume: 0.18 + Math.random() * 0.22,
            playbackRate: 0.85 + Math.random() * 0.25,
        });
    },

    _ensureParticles(visible = false) {
        const Engine = window.Engine;
        const THREE = window.THREE;
        if (!Engine?.scene || !THREE) return;

        if (!this._particles) {
            const count = 2200;
            const pos = new Float32Array(count * 3);
            const vel = new Float32Array(count);
            for (let i = 0; i < count; i++) {
                pos[i * 3] = (Math.random() - 0.5) * 28;
                pos[i * 3 + 1] = Math.random() * 14 + 2;
                pos[i * 3 + 2] = (Math.random() - 0.5) * 28;
                vel[i] = 6 + Math.random() * 8;
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            const mat = new THREE.PointsMaterial({
                color: 0xa8b8c8,
                size: 0.045,
                transparent: true,
                opacity: 0.55,
                depthWrite: false,
            });
            this._particles = new THREE.Points(geo, mat);
            this._particles.userData = { id: 'weather_rain_particles', type: 'weather', locked: true };
            this._particleVel = vel;
            this._particleData = pos;
            Engine.scene.add(this._particles);
        }
        this._particles.visible = visible;
    },

    _tickParticles(dt) {
        if (!this._particles?.visible || !this._particleData) return;
        const pos = this._particleData;
        const vel = this._particleVel;
        const wind = Math.sin(performance.now() * 0.0004) * 0.6;
        const fallMul = 0.8 + this._intensity * 0.9;
        for (let i = 0; i < vel.length; i++) {
            pos[i * 3 + 1] -= vel[i] * fallMul * dt;
            pos[i * 3] += wind * dt;
            if (pos[i * 3 + 1] < 0) {
                pos[i * 3 + 1] = 10 + Math.random() * 6;
                pos[i * 3] = (Math.random() - 0.5) * 28;
                pos[i * 3 + 2] = (Math.random() - 0.5) * 28;
            }
        }
        this._particles.geometry.attributes.position.needsUpdate = true;
        if (this._particles.material) {
            this._particles.material.opacity = 0.2 + this._intensity * 0.45;
        }
    },

    tick(dt = 0.016) {
        if (!this._active || window.State?.isPaused) return;
        const now = performance.now();

        // Slowly drift intensity for organic storms
        const drift = (Math.sin(now * 0.00008) + Math.sin(now * 0.00023 + 1.2)) * 0.04;
        this._targetIntensity = Math.max(0.2, Math.min(0.92, this._targetIntensity + drift * dt * 0.15));
        this._intensity = lerp(this._intensity, this._targetIntensity, 0.018);

        RAIN_LAYERS.forEach((layer) => {
            const h = this._rainHandles[layer.key];
            if (h?.setVolume) h.setVolume(this._rainLayerVol(layer, this._intensity));
        });

        if (now >= this._nextThunder) {
            this._playThunder();
            this._scheduleThunder(now);
        }
        if (now >= this._nextGust) {
            this._playGust();
            this._scheduleGust(now);
        }

        this._ensureParticles(this._intensity > 0.08);
        this._tickParticles(dt);
        this._applyWetness();
    },
};

window.WeatherSystem = WeatherSystem;