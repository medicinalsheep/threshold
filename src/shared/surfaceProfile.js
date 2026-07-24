/**
 * Surface profiles — same live URL, different chrome.
 * player  = play / test / join (mobile default)
 * creator = build + AI tools (desktop default)
 * full    = power user (URL ?mode=full)
 *
 * @see docs/BUILD_FROM.md
 */
import { ViewPrefs } from './viewPrefs.js';

export const SURFACE = {
    PLAYER: 'player',
    CREATOR: 'creator',
    FULL: 'full',
};

const PREF_KEY = 'surfaceProfile';
const BODY_PREFIX = 'surface-';

function isLocalHost() {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
}

function isPagesHost() {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h.includes('github.io') || h.includes('github.dev');
}

function readQueryMode() {
    try {
        const q = new URLSearchParams(window.location.search);
        // Prefer explicit ?surface= to avoid clashing with lobby ?mode=play|build
        const surface = (q.get('surface') || '').toLowerCase().trim();
        const mode = (q.get('mode') || '').toLowerCase().trim();
        const raw = surface || mode;
        if (raw === 'player') return SURFACE.PLAYER;
        if (raw === 'full') return SURFACE.FULL;
        if (raw === 'creator' || raw === 'dev') return SURFACE.CREATOR;
        // mode=play alone = session play, not surface (unless surface= set)
        // mode=build alone = session build — optional creator nudge left to lobby
        if (surface === 'play') return SURFACE.PLAYER;
        if (surface === 'build') return SURFACE.CREATOR;
    } catch { /* ignore */ }
    return null;
}

function detectDeviceDefault() {
    try {
        const coarse = window.matchMedia('(pointer: coarse)').matches;
        const narrow = window.matchMedia('(max-width: 900px)').matches;
        const mobileUa = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');
        if (coarse || mobileUa || narrow) return SURFACE.PLAYER;
    } catch { /* ignore */ }
    return SURFACE.CREATOR;
}

export const SurfaceProfile = {
    profile: SURFACE.CREATOR,
    _fromQuery: false,

    /** Resolve once: URL > saved pref > device default */
    resolve() {
        const fromQuery = readQueryMode();
        if (fromQuery) {
            this._fromQuery = true;
            return fromQuery;
        }
        this._fromQuery = false;
        const saved = ViewPrefs.get(PREF_KEY, null);
        if (saved === SURFACE.PLAYER || saved === SURFACE.CREATOR || saved === SURFACE.FULL) {
            return saved;
        }
        return detectDeviceDefault();
    },

    init() {
        this.apply(this.resolve(), { persist: false, silent: true });
        this.bindUi();
        window.addEventListener('resize', () => {
            // Only auto-flip when user has never set a pref and no URL force
            if (this._fromQuery || ViewPrefs.get(PREF_KEY, null)) return;
            const next = detectDeviceDefault();
            if (next !== this.profile) this.apply(next, { persist: false, silent: true });
        });
    },

    /**
     * @param {'player'|'creator'|'full'} profile
     * @param {{ persist?: boolean, silent?: boolean }} [opts]
     */
    apply(profile, opts = {}) {
        const p = profile === SURFACE.FULL || profile === SURFACE.PLAYER || profile === SURFACE.CREATOR
            ? profile
            : SURFACE.CREATOR;
        this.profile = p;

        document.body.classList.remove(
            `${BODY_PREFIX}${SURFACE.PLAYER}`,
            `${BODY_PREFIX}${SURFACE.CREATOR}`,
            `${BODY_PREFIX}${SURFACE.FULL}`,
        );
        document.body.classList.add(`${BODY_PREFIX}${p}`);
        document.body.dataset.surface = p;

        if (opts.persist !== false && !this._fromQuery) {
            ViewPrefs.set(PREF_KEY, p);
        }

        this.syncUi();
        window.dispatchEvent(new CustomEvent('threshold:surface-change', {
            detail: { profile: p, fromQuery: this._fromQuery },
        }));

        if (!opts.silent) {
            const labels = {
                player: 'Play surface — creator tools hidden',
                creator: 'Creator surface — build + AI tools',
                full: 'Full surface — all tools',
            };
            window.UI?.status?.(labels[p] || `Surface: ${p}`);
        }
        return p;
    },

    set(profile) {
        this._fromQuery = false;
        return this.apply(profile, { persist: true, silent: false });
    },

    get() {
        return this.profile;
    },

    isPlayer() {
        return this.profile === SURFACE.PLAYER;
    },

    isCreator() {
        return this.profile === SURFACE.CREATOR || this.profile === SURFACE.FULL;
    },

    isFull() {
        return this.profile === SURFACE.FULL;
    },

    /** Dev / AI chrome (Compiler, Portal, Ollama walls, export wizard). */
    allowsDevChrome() {
        return !this.isPlayer();
    },

    /**
     * Ollama localhost probes — skip on player surface (esp. Pages CORS noise).
     * Creator/full always may probe.
     */
    allowsOllamaProbe() {
        if (this.isPlayer()) return false;
        return true;
    },

    /** Soft: auto Agent Portal / reconnect chip ollama scans */
    allowsAgentAuto() {
        return this.allowsDevChrome();
    },

    bindUi() {
        document.querySelectorAll('[data-surface-set]').forEach((btn) => {
            if (btn.dataset.surfaceBound) return;
            btn.dataset.surfaceBound = '1';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const next = btn.getAttribute('data-surface-set');
                if (next) this.set(next);
            });
        });
        this.syncUi();
    },

    syncUi() {
        const p = this.profile;
        document.querySelectorAll('[data-surface-set]').forEach((btn) => {
            const target = btn.getAttribute('data-surface-set');
            btn.classList.toggle('active', target === p);
            btn.setAttribute('aria-pressed', target === p ? 'true' : 'false');
        });
        const badge = document.getElementById('surface-profile-badge');
        if (badge) {
            badge.textContent = p === SURFACE.PLAYER ? 'PLAY' : p === SURFACE.FULL ? 'FULL' : 'CREATE';
            badge.title = `UI surface: ${p} · ?mode=play|creator|full`;
            badge.dataset.surface = p;
        }
        const hint = document.getElementById('surface-profile-hint');
        if (hint) {
            hint.textContent = p === SURFACE.PLAYER
                ? 'Play surface on — tap Creator tools to build / use AI'
                : 'Creator tools on — switch to Play for a cleaner mobile layout';
        }
    },
};

export function initSurfaceProfile() {
    SurfaceProfile.init();
}

window.SurfaceProfile = SurfaceProfile;
window.initSurfaceProfile = initSurfaceProfile;
