/** Awareness overlay — highlights interactables / NPCs; green circle HUD when active */

const SCAN_MS = 100;
const RADIUS = 18;
const HIGHLIGHT = 0x2acc44;

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
    return !!(ud.thirdEyeTarget || ud.interactAction || ud.isAiTerminal || ud.isCharacter);
}

export const ThirdEye = {
    active: false,
    _indicator: null,
    _crosshair: null,
    _saved: new Map(),
    _lastScan: 0,

    init() {
        this._indicator = document.getElementById('third-eye-indicator');
        this._crosshair = document.getElementById('fps-crosshair');
    },

    toggle() {
        this.active = !this.active;
        if (this.active) {
            window.StarterSfx?.playStarterSfx?.('starter_terminal_chirp', 0.28);
            this._scan();
        } else {
            this._clearHighlights();
        }
        this.updateHud();
        window.UI?.status?.(this.active ? 'Third Eye — awareness on' : 'Third Eye — off');
        return this.active;
    },

    updateHud() {
        const walk = window.State?.controlMode === 'walk' && window.PlayerController?.spawned;
        const fps = walk && window.State?.viewMode === 'fps';
        this._crosshair?.classList.toggle('visible', fps);
        this._indicator?.classList.toggle('visible', this.active);
    },

    _applyHighlight(root) {
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
            mat.emissive.setHex(HIGHLIGHT);
            mat.emissiveIntensity = 0.32 + Math.sin(performance.now() * 0.004) * 0.14;
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
    },

    _scan() {
        const pos = getPlayerPosition();
        const State = window.State;
        if (!pos || !State?.objects?.length) return;

        this._clearHighlights();
        const pulse = 0.32 + Math.sin(performance.now() * 0.004) * 0.14;

        State.objects.forEach((obj) => {
            if (!isTarget(obj)) return;
            if (distTo(pos, obj) > RADIUS) return;
            this._applyHighlight(obj);
            obj.traverse?.((c) => {
                if (c.isMesh && c.material?.emissive) c.material.emissiveIntensity = pulse;
            });
        });
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