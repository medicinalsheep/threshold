/** Surface-aware footstep cadence while walking */

const SURFACE_CLIPS = {
    concrete: 'starter_footstep_concrete',
    metal: 'starter_footstep_metal',
    grass: 'starter_footstep_grass',
    wood: 'starter_footstep_wood',
    gravel: 'starter_footstep_gravel',
    dirt: 'starter_footstep_gravel',
    asphalt: 'starter_footstep_asphalt',
    default: 'starter_footstep_concrete',
};

const SURFACE_INTERVAL = {
    grass: 420,
    wood: 360,
    gravel: 340,
    dirt: 360,
    asphalt: 390,
    metal: 350,
    concrete: 380,
};

export const Footsteps = {
    _lastAt: 0,
    _phase: 0,

    resolveSurface(ground = {}) {
        const body = ground.hit?.body;
        if (body?.surfaceType) return body.surfaceType;
        const State = window.State;
        const entry = State?.physicsObjects?.find((p) => p.body === body);
        const mesh = entry?.mesh;
        if (mesh?.userData?.surfaceType) return mesh.userData.surfaceType;
        const id = mesh?.userData?.id || '';
        if (id.includes('metal') || id === 'gun_target' || id.includes('grate')) return 'metal';
        if (id.includes('grass')) return 'grass';
        if (id.includes('wood')) return 'wood';
        if (id.includes('gravel')) return 'gravel';
        if (id.includes('dirt')) return 'dirt';
        if (id.includes('asphalt') || id.includes('stripe')) return 'asphalt';
        if (id.includes('ground') || id.includes('platform') || id === 'starter_ground') return 'concrete';
        return 'default';
    },

    tick({ speed = 0, sprinting = false, grounded = false, ground = null } = {}) {
        if (!grounded || speed < 0.35 || window.State?.isPaused) return;

        const now = performance.now();
        const surface = this.resolveSurface(ground);
        const baseInterval = SURFACE_INTERVAL[surface] || SURFACE_INTERVAL.concrete;
        const interval = sprinting ? baseInterval * 0.68 : baseInterval;
        this._phase += speed * 0.016 * (sprinting ? 1.35 : 1);

        if (now - this._lastAt < interval) return;
        if (Math.sin(this._phase * 9) < 0.15) return;

        this._lastAt = now;
        const clip = SURFACE_CLIPS[surface] || SURFACE_CLIPS.default;
        const vol = sprinting ? 0.38 : 0.28;
        window.StarterSfx?.playStarterSfx?.(clip, vol);
    },
};

window.Footsteps = Footsteps;