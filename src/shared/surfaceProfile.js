/**
 * Surface profiles — same live URL, different chrome.
 * player  = play / test / join (mobile default) — not the same as PLAY interaction mode
 * creator = build + AI tools (desktop default)
 * full    = power user (?surface=full)
 *
 * @see docs/BUILD_FROM.md · docs/UI_AND_AGENTS.md
 */
import { ViewPrefs } from './viewPrefs.js';

export const SURFACE = {
    PLAYER: 'player',
    CREATOR: 'creator',
    FULL: 'full',
};

const PREF_KEY = 'surfaceProfile';
const COACH_KEY = 'surfaceCoachDismissed';
const BODY_PREFIX = 'surface-';
const CYCLE = [SURFACE.PLAYER, SURFACE.CREATOR, SURFACE.FULL];

const HINTS = {
    [SURFACE.PLAYER]:
        'Play surface — AI & Ollama hidden. Tap Creator tools (or the PLAY badge) to build.',
    [SURFACE.CREATOR]:
        'Creator tools on — local minis & export available. Switch to Play surface for a cleaner phone UI.',
    [SURFACE.FULL]:
        'Full surface — all tools visible.',
};

const STATUS = {
    [SURFACE.PLAYER]: 'Play surface — creator tools & AI hidden (not the same as PLAY mode)',
    [SURFACE.CREATOR]: 'Creator tools on — Ollama OK after npm run ollama:serve',
    [SURFACE.FULL]: 'Full surface — all tools',
};

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
        // Only treat mode as surface when it is a surface keyword (not session play/build)
        if (surface === 'player' || surface === 'play') return SURFACE.PLAYER;
        if (surface === 'full') return SURFACE.FULL;
        if (surface === 'creator' || surface === 'build' || surface === 'dev') return SURFACE.CREATOR;
        if (mode === 'player') return SURFACE.PLAYER;
        if (mode === 'full') return SURFACE.FULL;
        if (mode === 'creator' || mode === 'dev') return SURFACE.CREATOR;
        // mode=play|build alone = session intent — not surface
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
    _coachTimer: null,

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
        // First ENTER while on player surface → one-shot coach
        if (!window.__surfaceCoachBound) {
            window.__surfaceCoachBound = true;
            window.addEventListener('threshold:enter-engine', () => {
                this.maybeShowPlayerCoach();
            });
        }
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
        document.body.classList.toggle('surface-coach-active', false);

        if (opts.persist !== false && !this._fromQuery) {
            ViewPrefs.set(PREF_KEY, p);
        }

        this.syncUi();
        window.dispatchEvent(new CustomEvent('threshold:surface-change', {
            detail: { profile: p, fromQuery: this._fromQuery },
        }));

        if (!opts.silent) {
            window.UI?.status?.(STATUS[p] || `Surface: ${p}`);
        }
        return p;
    },

    set(profile) {
        this._fromQuery = false;
        // Leaving player surface dismisses coach permanently
        if (profile !== SURFACE.PLAYER) {
            this.dismissCoach({ silent: true });
        }
        return this.apply(profile, { persist: true, silent: false });
    },

    /** Cycle player → creator → full → player (badge one-tap). */
    cycle() {
        const i = CYCLE.indexOf(this.profile);
        const next = CYCLE[(i + 1) % CYCLE.length];
        return this.set(next);
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

        const badge = document.getElementById('surface-profile-badge');
        if (badge && !badge.dataset.surfaceCycleBound) {
            badge.dataset.surfaceCycleBound = '1';
            badge.setAttribute('role', 'button');
            badge.setAttribute('tabindex', '0');
            badge.classList.add('surface-badge-clickable');
            const cycle = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.cycle();
            };
            badge.addEventListener('click', cycle);
            badge.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') cycle(e);
            });
        }

        // Dismiss coach on click
        document.getElementById('surface-coach-dismiss')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.dismissCoach();
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
            badge.title = `UI surface: ${p} · click to cycle · ?surface=player|creator|full (not PLAY/ARRANGE/EDIT mode)`;
            badge.dataset.surface = p;
            badge.setAttribute('aria-label', `UI surface ${p}. Click to cycle Play, Creator, Full.`);
            badge.classList.toggle('surface-badge-pulse', p === SURFACE.PLAYER && !ViewPrefs.get(COACH_KEY, false));
        }
        const hintText = HINTS[p] || HINTS[SURFACE.CREATOR];
        const lobbyHint = document.getElementById('surface-profile-hint');
        if (lobbyHint) lobbyHint.textContent = hintText;
        const setupHint = document.getElementById('setup-surface-hint');
        if (setupHint) setupHint.textContent = hintText;

        // Lobby bookmark help
        const urlHint = document.getElementById('surface-url-hint');
        if (urlHint) {
            urlHint.textContent = 'Bookmark: ?surface=player | creator | full';
        }
    },

    maybeShowPlayerCoach() {
        if (!this.isPlayer()) return;
        if (ViewPrefs.get(COACH_KEY, false)) return;
        // Prefer status (always present) + optional coach strip
        const msg = 'Play surface: AI hidden. Tap PLAY badge (top) or SCENE → Creator tools… to build.';
        window.UI?.status?.(msg);
        const el = document.getElementById('surface-coach');
        if (el) {
            el.hidden = false;
            el.classList.add('visible');
            document.body.classList.add('surface-coach-active');
            const text = el.querySelector('.surface-coach-text');
            if (text) text.textContent = msg;
        }
        // Auto-dismiss after long delay so it is not permanent chrome
        if (this._coachTimer) clearTimeout(this._coachTimer);
        this._coachTimer = setTimeout(() => this.dismissCoach({ silent: true }), 14000);
    },

    dismissCoach({ silent = false } = {}) {
        ViewPrefs.set(COACH_KEY, true);
        if (this._coachTimer) {
            clearTimeout(this._coachTimer);
            this._coachTimer = null;
        }
        const el = document.getElementById('surface-coach');
        if (el) {
            el.hidden = true;
            el.classList.remove('visible');
        }
        document.body.classList.remove('surface-coach-active');
        const badge = document.getElementById('surface-profile-badge');
        badge?.classList.remove('surface-badge-pulse');
        if (!silent) window.UI?.status?.('Got it — use the PLAY/CREATE badge anytime');
    },
};

export function initSurfaceProfile() {
    SurfaceProfile.init();
}

// keep helpers referenced for Pages / tooling that sniff module text
void isLocalHost;
void isPagesHost;

window.SurfaceProfile = SurfaceProfile;
window.initSurfaceProfile = initSurfaceProfile;
