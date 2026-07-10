/** Awareness overlay + UI mouse mode
 * - Third Eye (F): free mouse + green interactable highlights
 * - UI mouse (M): free mouse only — click hubs/UI without highlight scan
 * - Alt hold: temporary UI mouse peek (no highlights)
 */

import { ViewPrefs } from './viewPrefs.js';

const PEEK_PREFS_KEY = 'thirdEyePeekPrefs';
const SCAN_MS = 100;
const RADIUS = 18;
const HIGHLIGHT = 0x2acc44;
const LOCK_HIGHLIGHT = 0xffa030;

function getPlayerPosition() {
    const PC = window.PlayerController;
    if (PC?.spawned && PC.group) return PC.group.position;
    return window.Engine?.camera?.position || null;
}

function distTo(pos, obj) {
    const p = obj.position;
    return Math.sqrt((pos.x - p.x) ** 2 + (pos.y - p.y) ** 2 + (pos.z - p.z) ** 2);
}

function isTarget(obj) {
    const ud = obj?.userData;
    if (!ud || ud.isPlayer) return false;
    if (ud.locked) return true;
    return !!(ud.thirdEyeTarget || ud.interactAction || ud.isAiTerminal || ud.isCharacter);
}

export const ThirdEye = {
    /** Awareness mode — highlights interactables */
    active: false,
    /** Sticky UI-only pointer mode — no highlights */
    uiMouseMode: false,
    _indicator: null,
    _uiMouseIndicator: null,
    _crosshair: null,
    _saved: new Map(),
    _lastScan: 0,
    _lockCount: 0,
    _altPeek: false,
    _altTriggered: false,
    _altWired: false,
    _enteredFullscreen: false,

    init() {
        this._indicator = document.getElementById('third-eye-indicator');
        this._uiMouseIndicator = document.getElementById('ui-mouse-indicator');
        this._crosshair = document.getElementById('fps-crosshair');
        this._wireAltPeek();
        this._bindFullscreenPref();
        this.updateHud();
    },

    _peekPrefs() {
        return ViewPrefs.get(PEEK_PREFS_KEY, { fullscreenPeek: false });
    },

    _bindFullscreenPref() {
        const el = document.getElementById('third-eye-fullscreen-peek');
        if (!el || el.dataset.wired) return;
        el.dataset.wired = '1';
        el.checked = this._peekPrefs().fullscreenPeek;
        el.addEventListener('change', () => {
            ViewPrefs.set(PEEK_PREFS_KEY, { fullscreenPeek: el.checked });
            window.UI?.status?.(el.checked ? 'Alt peek will try native fullscreen' : 'Alt peek — windowed');
        });
    },

    _wireAltPeek() {
        if (this._altWired) return;
        this._altWired = true;

        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (e.code !== 'AltLeft' && e.code !== 'AltRight') return;
            if (!this._canAltPeek()) return;
            if (this._altPeek) return;
            if (document.body.classList.contains('hub-layout-edit')) return;

            const immersive = document.body.classList.contains('ui-immersive') || !!document.fullscreenElement;
            if (immersive) e.preventDefault();

            this._altPeek = true;
            // Alt = temporary UI mouse only (no Third Eye highlights)
            if (!this.uiMouseMode && !this.active) {
                this._altTriggered = true;
                this._enterUiPointer({ fromAlt: true, sticky: false });
            } else {
                window.Engine?._releaseLookLock?.();
                this.updateHud();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code !== 'AltLeft' && e.code !== 'AltRight') return;
            if (!this._altPeek) return;
            this._altPeek = false;
            if (this._altTriggered) {
                this._exitUiPointer({ fromAlt: true });
                this._altTriggered = false;
            } else {
                this._exitFullscreenPeek();
                this.updateHud();
            }
        });

        window.addEventListener('blur', () => {
            if (!this._altPeek) return;
            this._altPeek = false;
            if (this._altTriggered) {
                this._exitUiPointer({ fromAlt: true });
                this._altTriggered = false;
            } else {
                this._exitFullscreenPeek();
            }
        });
    },

    _canAltPeek() {
        const walkPlay = window.Engine?._isWalkPlayLook?.();
        if (!walkPlay) return false;
        if (window.State?.isPaused) return false;
        return true;
    },

    /** Free mouse for UI — Third Eye, sticky UI mouse, or Alt peek */
    isPointerFree() {
        return this.active || this.uiMouseMode || this._altPeek;
    },

    /** True when awareness highlights are on */
    isAwarenessActive() {
        return this.active;
    },

    async _tryFullscreenPeek() {
        if (!this._peekPrefs().fullscreenPeek || document.fullscreenElement) return;
        try {
            await document.documentElement.requestFullscreen();
            this._enteredFullscreen = true;
        } catch {
            this._enteredFullscreen = false;
        }
    },

    _exitFullscreenPeek() {
        if (!this._enteredFullscreen || !document.fullscreenElement) {
            this._enteredFullscreen = false;
            return;
        }
        document.exitFullscreen?.().catch(() => {});
        this._enteredFullscreen = false;
    },

    _syncBodyClasses() {
        document.body.classList.toggle('third-eye-active', this.active);
        document.body.classList.toggle('ui-mouse-mode', this.uiMouseMode || (this._altPeek && !this.active));
        document.body.classList.toggle('third-eye-alt-peek', this._altPeek);
        document.body.classList.toggle('pointer-free-play', this.isPointerFree());
    },

    /** UI pointer free without highlight scan */
    _enterUiPointer({ fromAlt = false, sticky = false } = {}) {
        if (fromAlt) void this._tryFullscreenPeek();
        window.Engine?._releaseLookLock?.();
        if (sticky) this.uiMouseMode = true;
        this._syncBodyClasses();
        this.updateHud();
        if (fromAlt) {
            window.UI?.status?.('Alt — UI mouse (release Alt to aim)');
        }
    },

    _exitUiPointer({ fromAlt = false } = {}) {
        if (fromAlt) {
            // Don't clear sticky uiMouseMode on Alt release
            this._exitFullscreenPeek();
            this._syncBodyClasses();
            this.updateHud();
            if (!this.uiMouseMode && !this.active) {
                window.UI?.status?.('UI mouse peek off — LMB aim');
            }
            return;
        }
        this.uiMouseMode = false;
        this._syncBodyClasses();
        this.updateHud();
    },

    toggleUiMouse() {
        if (this._altPeek) return this.uiMouseMode;
        if (this.uiMouseMode) {
            this.uiMouseMode = false;
            // If Third Eye was not on, restore aim lock path
            this._syncBodyClasses();
            this.updateHud();
            window.UI?.status?.('UI mouse — off · click canvas to aim');
        } else {
            // Sticky free mouse without awareness highlights
            if (this.active) {
                this._disableAwareness({});
            }
            this.uiMouseMode = true;
            window.Engine?._releaseLookLock?.();
            this._syncBodyClasses();
            this.updateHud();
            window.UI?.status?.('UI mouse — click hubs & panels · M to aim again');
        }
        return this.uiMouseMode;
    },

    _enableAwareness({ fromAlt = false } = {}) {
        // fromAlt no longer enables awareness — kept for API compatibility
        if (fromAlt) {
            this._enterUiPointer({ fromAlt: true, sticky: false });
            return;
        }
        window.Engine?._releaseLookLock?.();
        // Turning on awareness can coexist with ui mouse; prefer exclusive clarity
        if (this.uiMouseMode) {
            this.uiMouseMode = false;
        }
        if (!this.active) {
            this.active = true;
            window.StarterSfx?.playStarterSfx?.('starter_terminal_chirp', 0.28);
            this._scan();
        }
        this._syncBodyClasses();
        this.updateHud();
    },

    _disableAwareness({ fromAlt = false } = {}) {
        if (fromAlt) return;
        this.active = false;
        this._clearHighlights();
        this._syncBodyClasses();
        this.updateHud();
    },

    /** @deprecated use awareness enable — kept for callers */
    _enablePeek(opts = {}) {
        this._enableAwareness(opts);
    },

    _disablePeek(opts = {}) {
        this._disableAwareness(opts);
    },

    toggle() {
        if (this._altPeek) return this.active;
        if (this.active) {
            this._disableAwareness({});
            window.UI?.status?.('Third Eye — off');
        } else {
            this._enableAwareness({});
            window.UI?.status?.('Third Eye — highlights on · click UI & props · F interact');
        }
        return this.active;
    },

    updateHud() {
        const walk = window.State?.controlMode === 'walk' && window.PlayerController?.spawned;
        const fps = walk && window.State?.viewMode === 'fps';
        const peek = this.isPointerFree();
        this._crosshair?.classList.toggle('visible', fps && !peek);
        this._indicator?.classList.toggle('visible', this.active);
        this._uiMouseIndicator?.classList.toggle(
            'visible',
            (this.uiMouseMode || this._altPeek) && !this.active,
        );
        if (this._indicator && this.active) {
            const lockNote = this._lockCount ? ` · ${this._lockCount} locked` : '';
            this._indicator.title = `Third Eye active${lockNote}`;
        }
        if (this._uiMouseIndicator) {
            this._uiMouseIndicator.title = this._altPeek
                ? 'UI mouse (Alt peek)'
                : 'UI mouse mode — no highlights';
        }
    },

    _applyHighlight(root, locked = false) {
        const color = locked ? LOCK_HIGHLIGHT : HIGHLIGHT;
        const intensity = locked ? 0.38 : 0.32;
        root.traverse((c) => {
            if (!c.isMesh || !c.material) return;
            const mat = c.material;
            if (!this._saved.has(mat)) {
                const emSnap = mat.emissive?.clone?.() || (mat.emissive ? mat.emissive.getHex() : 0);
                this._saved.set(mat, {
                    emissive: emSnap,
                    emissiveIntensity: mat.emissiveIntensity ?? 0,
                    hadEmissive: !!mat.emissive,
                });
            }
            if (!mat.emissive) return;
            mat.emissive.setHex(color);
            mat.emissiveIntensity = intensity + Math.sin(performance.now() * 0.004) * 0.14;
        });
    },

    _clearHighlights() {
        this._saved.forEach((snap, mat) => {
            if (!mat.emissive) return;
            if (snap.hadEmissive && snap.emissive?.isColor) mat.emissive.copy(snap.emissive);
            else if (typeof snap.emissive === 'number') mat.emissive.setHex(snap.emissive);
            else mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = snap.emissiveIntensity;
        });
        this._saved.clear();
        this._lockCount = 0;
    },

    _scan() {
        const pos = getPlayerPosition();
        const State = window.State;
        if (!pos || !State?.objects?.length) return;

        this._clearHighlights();
        const pulse = 0.32 + Math.sin(performance.now() * 0.004) * 0.14;
        let lockCount = 0;

        State.objects.forEach((obj) => {
            if (!isTarget(obj)) return;
            if (distTo(pos, obj) > RADIUS) return;
            const locked = !!obj.userData?.locked;
            if (locked) lockCount += 1;
            this._applyHighlight(obj, locked);
            obj.traverse?.((c) => {
                if (c.isMesh && c.material?.emissive) {
                    c.material.emissiveIntensity = locked ? pulse + 0.08 : pulse;
                }
            });
        });

        this._lockCount = lockCount;
        this.updateHud();
    },

    tick() {
        this.updateHud();
        if (!this.active) return;
        const now = performance.now();
        if (now - this._lastScan < SCAN_MS) return;
        this._lastScan = now;
        this._scan();
    },
};

window.ThirdEye = ThirdEye;
