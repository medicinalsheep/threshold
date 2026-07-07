/** Awareness overlay — highlights interactables / NPCs; green circle HUD when active */

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
    active: false,
    _indicator: null,
    _crosshair: null,
    _saved: new Map(),
    _lastScan: 0,
    _lockCount: 0,
    _altPeek: false,
    _altTriggered: false,
    _altWired: false,

    init() {
        this._indicator = document.getElementById('third-eye-indicator');
        this._crosshair = document.getElementById('fps-crosshair');
        this._wireAltPeek();
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
            if (!this.active) {
                this._altTriggered = true;
                this._enablePeek({ fromAlt: true });
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code !== 'AltLeft' && e.code !== 'AltRight') return;
            if (!this._altPeek) return;
            this._altPeek = false;
            if (this._altTriggered) {
                this._disablePeek({ fromAlt: true });
                this._altTriggered = false;
            }
        });

        window.addEventListener('blur', () => {
            if (!this._altPeek) return;
            this._altPeek = false;
            if (this._altTriggered) {
                this._disablePeek({ fromAlt: true });
                this._altTriggered = false;
            }
        });
    },

    _canAltPeek() {
        const walkPlay = window.Engine?._isWalkPlayLook?.();
        if (!walkPlay) return false;
        if (window.State?.isPaused) return false;
        return true;
    },

    isPointerFree() {
        return this.active || this._altPeek;
    },

    _enablePeek({ fromAlt = false } = {}) {
        window.Engine?._releaseLookLock?.();
        if (!this.active) {
            this.active = true;
            window.StarterSfx?.playStarterSfx?.('starter_terminal_chirp', fromAlt ? 0.12 : 0.28);
            this._scan();
        }
        this.updateHud();
        document.body.classList.toggle('third-eye-active', this.active);
        document.body.classList.toggle('third-eye-alt-peek', fromAlt || this._altPeek);
        if (fromAlt) {
            window.UI?.status?.('Alt — Third Eye peek (release Alt to aim)');
        }
    },

    _disablePeek({ fromAlt = false } = {}) {
        if (!fromAlt || this._altTriggered) {
            this.active = false;
            this._clearHighlights();
            document.body.classList.remove('third-eye-active', 'third-eye-alt-peek');
            this.updateHud();
            if (fromAlt) window.UI?.status?.('Third Eye peek off — LMB aim');
        }
    },

    toggle() {
        if (this._altPeek) return this.active;
        if (this.active) {
            this._disablePeek({});
            window.UI?.status?.('Third Eye — off');
        } else {
            this._enablePeek({});
            window.UI?.status?.('Third Eye — click UI & props · F to interact');
        }
        return this.active;
    },

    updateHud() {
        const walk = window.State?.controlMode === 'walk' && window.PlayerController?.spawned;
        const fps = walk && window.State?.viewMode === 'fps';
        const peek = this.isPointerFree();
        this._crosshair?.classList.toggle('visible', fps && !peek);
        this._indicator?.classList.toggle('visible', this.active);
        if (this._indicator && this.active) {
            const lockNote = this._lockCount
                ? ` · ${this._lockCount} locked`
                : '';
            const altNote = this._altPeek ? ' · Alt peek' : '';
            this._indicator.title = `Third Eye active${lockNote}${altNote}`;
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
                    c.material.emissiveIntensity = locked
                        ? pulse + 0.08
                        : pulse;
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