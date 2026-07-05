/** Surface-aware footstep cadence while walking */

const SURFACE_CLIPS = {
    concrete: 'starter_footstep_concrete',
    metal: 'starter_footstep_metal',
    default: 'starter_footstep_concrete',
};

export const Footsteps = {
    _lastAt: 0,
    _phase: 0,

    resolveSurface(ground = {}) {
        const body = ground.hit?.body;
        if (body?.surfaceType) return body.surfaceType;
        const State = window.State;
        const entry = State?.physicsObjects?.find((p) => p.body === body);
        const id = entry?.mesh?.userData?.id || '';
        if (id.includes('metal') || id === 'gun_target') return 'metal';
        if (id.includes('ground') || id.includes('platform') || id === 'starter_ground') return 'concrete';
        return 'default';
    },

    tick({ speed = 0, sprinting = false, grounded = false, ground = null } = {}) {
        if (!grounded || speed < 0.35 || window.State?.isPaused) return;

        const now = performance.now();
        const interval = sprinting ? 260 : 380;
        this._phase += speed * 0.016 * (sprinting ? 1.35 : 1);

        if (now - this._lastAt < interval) return;
        if (Math.sin(this._phase * 9) < 0.15) return;

        this._lastAt = now;
        const surface = this.resolveSurface(ground);
        const clip = SURFACE_CLIPS[surface] || SURFACE_CLIPS.default;
        const vol = sprinting ? 0.38 : 0.28;
        window.StarterSfx?.playStarterSfx?.(clip, vol);
    },
};

window.Footsteps = Footsteps;