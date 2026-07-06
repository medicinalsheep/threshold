/** Sprint J — survival vitals: health, food, water, rest, stamina, stress */

const STAT_KEYS = ['health', 'food', 'water', 'rest', 'stamina', 'stress'];

const DEFAULTS = {
    health: 88,
    food: 72,
    water: 68,
    rest: 75,
    stamina: 100,
    stress: 18,
};

function clamp(v, lo = 0, hi = 100) {
    return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

export const SurvivalNeeds = {
    _stats: { ...DEFAULTS },
    _active: false,
    _lastStatus: '',
    _restChannel: null,

    init() {
        this.reset();
        this._active = true;
    },

    reset() {
        this._stats = { ...DEFAULTS };
        this._restChannel = null;
        this._lastStatus = '';
    },

    isActive() {
        const State = window.State;
        const Session = window.Session;
        if (!this._active) return false;
        if (Session?.isSpectator || window.Network?.mode === 'spectate') return false;
        if (!window.PlayerController?.spawned) return false;
        if (window.TcDrive?.active || State?.controlMode === 'vehicle') return false;
        return State?.controlMode === 'walk';
    },

    snapshotForHandoff() {
        return { ...this._stats };
    },

    restoreHandoff(snapshot) {
        if (!snapshot) return;
        this.setAll(snapshot);
        window.SurvivalNeedsHud?.flash?.('rest');
    },

    get(key) {
        return this._stats[key] ?? 0;
    },

    getAll() {
        return { ...this._stats };
    },

    setAll(stats = {}) {
        STAT_KEYS.forEach((k) => {
            if (Number.isFinite(stats[k])) this._stats[k] = clamp(stats[k]);
        });
    },

    pack() {
        return STAT_KEYS.map((k) => Math.round(clamp(this._stats[k])));
    },

    unpack(arr) {
        if (!Array.isArray(arr)) return;
        STAT_KEYS.forEach((k, i) => {
            if (Number.isFinite(arr[i])) this._stats[k] = clamp(arr[i]);
        });
    },

    canSprint() {
        if (!this.isActive()) return true;
        const { food, water, stamina, health } = this._stats;
        return food > 8 && water > 8 && stamina > 4 && health > 5;
    },

    getSprintMultiplier() {
        if (!this.isActive()) return 1;
        if (!this.canSprint()) return 1;
        const { stamina, rest, stress } = this._stats;
        const staminaT = clamp(stamina / 100, 0, 1);
        const restT = clamp(rest / 100, 0, 1);
        const stressPenalty = lerp(1, 0.55, clamp((stress - 40) / 60, 0, 1));
        const lowStamina = stamina < 25 ? lerp(0.45, 1, stamina / 25) : 1;
        return clamp(0.35 + staminaT * 0.35 + restT * 0.3, 0.35, 1) * stressPenalty * lowStamina;
    },

    getWalkSpeedMultiplier() {
        if (!this.isActive()) return 1;
        const { health, food, water, rest, stress } = this._stats;
        let mult = 1;
        if (food < 20) mult *= lerp(0.62, 1, food / 20);
        if (water < 20) mult *= lerp(0.68, 1, water / 20);
        if (rest < 18) mult *= lerp(0.7, 1, rest / 18);
        if (health < 30) mult *= lerp(0.55, 1, health / 30);
        if (stress > 55) mult *= lerp(1, 0.72, (stress - 55) / 45);
        return clamp(mult, 0.45, 1);
    },

    getMaxStamina() {
        const rest = this._stats.rest;
        return clamp(lerp(38, 100, rest / 100), 38, 100);
    },

    applyInteract(kind, sourceId) {
        if (!this.isActive()) return false;
        const now = performance.now();
        const cdKey = `${kind}:${sourceId || 'generic'}`;
        if (!this._cooldowns) this._cooldowns = new Map();
        const until = this._cooldowns.get(cdKey) || 0;
        if (now < until) {
            const sec = Math.ceil((until - now) / 1000);
            window.UI?.status?.(`Recovering — ${sec}s`);
            return false;
        }

        const effects = INTERACT_EFFECTS[kind];
        if (!effects) return false;

        STAT_KEYS.forEach((k) => {
            if (Number.isFinite(effects[k])) {
                this._stats[k] = clamp(this._stats[k] + effects[k]);
            }
        });

        this._cooldowns.set(cdKey, now + (effects.cooldownMs || 42000));
        this._stats.stamina = Math.min(this.getMaxStamina(), this._stats.stamina);

        if (effects.status) {
            window.UI?.status?.(effects.status);
        }
        window.SurvivalNeedsHud?.flash?.(kind);
        window.StarterSfx?.playStarterSfx?.(effects.sfx || 'starter_terminal_chirp', 0.32);
        return true;
    },

    getRestProgress() {
        const ch = this._restChannel;
        if (!ch) return null;
        const now = performance.now();
        const total = ch.durationMs || (ch.until - ch.startAt) || 1;
        const left = Math.max(0, ch.until - now);
        return {
            pct: Math.min(1, 1 - left / total),
            secLeft: Math.ceil(left / 1000),
        };
    },

    startRestChannel(sourceId, durationMs = 6000) {
        if (!this.isActive()) return false;
        const now = performance.now();
        const cdKey = `rest:${sourceId || 'generic'}`;
        if (!this._cooldowns) this._cooldowns = new Map();
        if (now < (this._cooldowns.get(cdKey) || 0)) {
            window.UI?.status?.('Bench still warm — wait a moment');
            return false;
        }
        this._restChannel = {
            sourceId,
            startAt: now,
            durationMs,
            until: now + durationMs,
            cdKey,
            cooldownMs: 52000,
        };
        window.UI?.status?.('Resting… movement slowed');
        window.SurvivalNeedsHud?.flash?.('rest');
        return true;
    },

    _tickRestChannel(dt) {
        const ch = this._restChannel;
        if (!ch) return 1;
        const now = performance.now();
        this._stats.rest += 5.2 * dt;
        this._stats.stamina += 8.5 * dt;
        this._stats.stress -= 4.8 * dt;
        this._stats.health += 0.35 * dt;
        this._stats.stamina = Math.min(this.getMaxStamina(), this._stats.stamina);
        STAT_KEYS.forEach((k) => { this._stats[k] = clamp(this._stats[k]); });

        if (now >= ch.until) {
            this._cooldowns.set(ch.cdKey, now + ch.cooldownMs);
            this._restChannel = null;
            window.UI?.status?.('Rested — stamina and calm restored');
        }
        return 0.42;
    },

    tick(dt, ctx = {}) {
        if (!this.isActive()) return;

        const editScale = window.State?.isPaused ? 0.08 : 1;
        dt *= editScale;

        let moveMult = 1;
        if (this._restChannel) {
            moveMult = this._tickRestChannel(dt);
        }

        const { sprinting, speed = 0, position } = ctx;
        const moving = speed > 0.25;
        const zone = window.SurvivalZones?.getModifiers?.(position) || {};
        const rain = (window.WeatherSystem?.getIntensity?.() ?? 0) * (zone.sheltered ? 0.15 : 1);
        const exertion = sprinting ? 1.65 : (moving ? 1.12 : 1);

        // Base drains
        this._stats.food -= (0.26 + (sprinting ? 0.38 : 0)) * dt * exertion;
        this._stats.water -= (0.34 + (sprinting ? 0.48 : 0) + rain * 0.22) * dt * exertion;
        const hour = window.State?.env?.timeOfDay ?? 14;
        const nightRest = (hour >= 20 || hour < 6) ? 1.22 : 1;
        this._stats.rest -= (0.18 + (sprinting ? 0.22 : 0)) * dt * nightRest;

        // Stamina
        const maxSta = this.getMaxStamina();
        if (sprinting && moving) {
            const drain = 20 + (this._stats.stress > 60 ? 6 : 0);
            this._stats.stamina -= drain * dt;
        } else if (!this._restChannel) {
            const foodT = clamp(this._stats.food / 50, 0.2, 1);
            const waterT = clamp(this._stats.water / 50, 0.2, 1);
            const regen = 9.5 * foodT * waterT * clamp(this._stats.rest / 40, 0.15, 1);
            this._stats.stamina += regen * dt;
        }
        this._stats.stamina = clamp(this._stats.stamina, 0, maxSta);

        // Passive zone recovery
        if (zone.water) this._stats.water += zone.water * dt;
        if (zone.rest) this._stats.rest += zone.rest * dt;
        if (zone.food) this._stats.food += zone.food * dt;
        if (zone.stressRelief) this._stats.stress -= zone.stressRelief * dt;
        if (zone.calm) this._stats.stress -= zone.calm * dt;

        // Stress dynamics
        let stressDelta = 0.04;
        if (this._stats.food < 28) stressDelta += (28 - this._stats.food) * 0.006;
        if (this._stats.water < 28) stressDelta += (28 - this._stats.water) * 0.007;
        if (this._stats.rest < 25) stressDelta += (25 - this._stats.rest) * 0.005;
        if (sprinting && this._stats.stamina < 18) stressDelta += 0.55;
        if (rain > 0.2 && !zone.sheltered && moving) stressDelta += rain * 0.35;
        if (zone.sheltered) stressDelta -= 0.12;
        this._stats.stress += stressDelta * dt;

        // Health
        if (this._stats.food < 12 || this._stats.water < 12) {
            this._stats.health -= 0.09 * dt;
        } else if (this._stats.stress > 82) {
            this._stats.health -= 0.05 * dt;
        } else if (
            this._stats.food > 52
            && this._stats.water > 52
            && this._stats.rest > 38
            && this._stats.stress < 58
            && !sprinting
        ) {
            this._stats.health += 0.14 * dt;
        }

        STAT_KEYS.forEach((k) => { this._stats[k] = clamp(this._stats[k]); });

        this._ctxCache = { sprinting, moving, speed, zone, rain, moveMult };

        if (this._stats.health <= 0) {
            this._stats.health = 0;
            this._onCritical();
        }

        this._checkLowStatWarnings();
        window.SurvivalRun?.tick?.();
        window.SurvivalNikolaBark?.tick?.();
        window.SurvivalNeedsHud?.tick?.(dt);
    },

    _checkLowStatWarnings() {
        if (!this._warnCooldowns) this._warnCooldowns = new Map();
        const now = performance.now();
        const checks = [
            { key: 'food', threshold: 20, msg: 'Hungry — find coffee or a snack', sfx: 'starter_interior_coffee_murmur', vol: 0.18 },
            { key: 'water', threshold: 20, msg: 'Thirsty — creek south or coffee nook', sfx: 'starter_amb_creek', vol: 0.2 },
            { key: 'health', threshold: 28, msg: 'Health low — rest or eat before exploring', sfx: 'starter_gun_reload', vol: 0.15 },
        ];
        checks.forEach(({ key, threshold, msg, sfx, vol }) => {
            const val = this._stats[key];
            const wasLow = this._warnCooldowns.get(`${key}_low`) === true;
            const isLow = val < threshold;
            if (isLow && !wasLow && now > (this._warnCooldowns.get(`${key}_until`) || 0)) {
                window.UI?.status?.(msg);
                window.StarterSfx?.playStarterSfx?.(sfx, vol);
                this._warnCooldowns.set(`${key}_until`, now + 45000);
            }
            this._warnCooldowns.set(`${key}_low`, isLow);
        });
    },

    _onCritical() {
        const now = performance.now();
        if (this._collapseUntil && now < this._collapseUntil) return;
        this._collapseUntil = now + 8000;
        this._stats.health = 22;
        this._stats.stamina = 18;
        this._stats.stress = Math.min(100, this._stats.stress + 28);
        window.UI?.status?.('Collapsed from exhaustion — vitals stabilized at low reserve');
        this._playCollapseFx();
    },

    _playCollapseFx() {
        const vignette = document.getElementById('survival-collapse-vignette');
        vignette?.classList.remove('active');
        void vignette?.offsetWidth;
        vignette?.classList.add('active');
        clearTimeout(this._collapseFxTimer);
        this._collapseFxTimer = setTimeout(() => vignette?.classList.remove('active'), 3400);
        window.SurvivalNeedsHud?.flash?.('critical');
        window.StarterSfx?.playStarterSfx?.('starter_thunder_distant', 0.42);
        window.StarterSfx?.playStarterSfx?.('starter_gun_reload', 0.22);
    },

    getStatusEffects() {
        const s = this._stats;
        const z = this._ctxCache?.zone || {};
        const out = [];
        if (s.food < 20) out.push({ id: 'starving', label: 'Hungry', severity: 'warn' });
        if (s.water < 20) out.push({ id: 'dehydrated', label: 'Thirsty', severity: 'warn' });
        if (s.rest < 20) out.push({ id: 'exhausted', label: 'Tired', severity: 'warn' });
        if (s.stamina < 15) out.push({ id: 'winded', label: 'Winded', severity: 'mid' });
        if (s.stress > 70) out.push({ id: 'anxious', label: 'Stressed', severity: 'warn' });
        if (s.health < 25) out.push({ id: 'critical', label: 'Critical', severity: 'bad' });
        if (this._restChannel) out.push({ id: 'resting', label: 'Resting', severity: 'good' });
        if (z.sheltered) out.push({ id: 'sheltered', label: 'Sheltered', severity: 'good' });
        (z.labels || []).forEach((label) => {
            out.push({ id: `zone_${label}`, label, severity: 'good' });
        });
        if ((this._ctxCache?.rain ?? 0) > 0.35 && !z.sheltered) {
            out.push({ id: 'rain', label: 'Rain exposure', severity: 'mid' });
        }
        if (!this.canSprint() && s.stamina > 0) out.push({ id: 'no_sprint', label: 'Cannot sprint', severity: 'mid' });
        return out;
    },

    getMovementMultiplier() {
        return this._ctxCache?.moveMult ?? 1;
    },
};

const INTERACT_EFFECTS = {
    food: {
        food: 30,
        water: 10,
        rest: 6,
        stress: -14,
        health: 4,
        cooldownMs: 38000,
        status: 'Coffee — warmth, calories, calm',
        sfx: 'starter_interior_coffee_murmur',
    },
    water: {
        water: 42,
        stress: -8,
        rest: 3,
        cooldownMs: 32000,
        status: 'Creek water — hydrated',
        sfx: 'starter_amb_creek',
    },
    snack: {
        food: 18,
        water: 4,
        stress: -6,
        cooldownMs: 45000,
        status: 'Snack from counter — quick fuel',
    },
};

export function initSurvivalNeeds() {
    SurvivalNeeds.init();
}

window.SurvivalNeeds = SurvivalNeeds;
window.initSurvivalNeeds = initSurvivalNeeds;