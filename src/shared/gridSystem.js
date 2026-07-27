/**
 * Grid units + snap (Phase 1 / 10.15.1).
 * Standard: 1 world unit = 1 meter.
 */
import { ViewPrefs } from './viewPrefs.js';

const PRESETS = [0.25, 0.5, 1, 2, 5];
/** World extent of the helper (meters) — covers walkable void. */
const GRID_WORLD_SIZE = 80;

export const GridSystem = {
    /** 1 unit = 1 meter (engine convention). */
    UNIT: 'm',

    presets: PRESETS,

    getCellSize() {
        const n = Number(ViewPrefs.get('gridSize', 1));
        return Number.isFinite(n) && n > 0 ? n : 1;
    },

    setCellSize(meters) {
        let m = Number(meters);
        if (!Number.isFinite(m) || m <= 0) m = 1;
        m = Math.min(50, Math.max(0.05, m));
        // Snap to nice values when close to presets
        for (const p of PRESETS) {
            if (Math.abs(m - p) < 0.001) m = p;
        }
        ViewPrefs.set('gridSize', m);
        this.rebuildHelper();
        this.applyTransformSnap();
        this.syncUi();
        window.dispatchEvent(new CustomEvent('threshold:grid-change', {
            detail: { cellSize: m, snap: this.isSnapEnabled() },
        }));
        return m;
    },

    isSnapEnabled() {
        return ViewPrefs.get('gridSnap', true) !== false;
    },

    setSnapEnabled(on) {
        ViewPrefs.set('gridSnap', !!on);
        this.applyTransformSnap();
        this.syncUi();
        window.dispatchEvent(new CustomEvent('threshold:grid-change', {
            detail: { cellSize: this.getCellSize(), snap: !!on },
        }));
        return !!on;
    },

    toggleSnap() {
        return this.setSnapEnabled(!this.isSnapEnabled());
    },

    /**
     * Snap world position to grid (Y optional).
     * @param {{x:number,y:number,z:number}|THREE.Vector3} pos
     * @param {{ y?: boolean }} [opts]
     */
    snapPosition(pos, opts = {}) {
        const cell = this.getCellSize();
        if (!this.isSnapEnabled() || cell <= 0) {
            return { x: pos.x, y: pos.y, z: pos.z };
        }
        const sx = Math.round(pos.x / cell) * cell;
        const sz = Math.round(pos.z / cell) * cell;
        const sy = opts.y ? Math.round(pos.y / cell) * cell : pos.y;
        return { x: sx, y: sy, z: sz };
    },

    /** Snap yaw to 15° or 90° steps when snap on. */
    snapRotationY(rad, stepDeg = 15) {
        if (!this.isSnapEnabled()) return rad;
        const step = (stepDeg * Math.PI) / 180;
        return Math.round(rad / step) * step;
    },

    applyTransformSnap() {
        const tc = window.Engine?.transformControl;
        if (!tc) return;
        const cell = this.getCellSize();
        const on = this.isSnapEnabled();
        if (on && cell > 0) {
            tc.setTranslationSnap(cell);
            tc.setRotationSnap((15 * Math.PI) / 180);
            tc.setScaleSnap(0.1);
        } else {
            tc.setTranslationSnap(null);
            tc.setRotationSnap(null);
            tc.setScaleSnap(null);
        }
    },

    /**
     * Rebuild GridHelper so divisions match cell size over GRID_WORLD_SIZE meters.
     */
    rebuildHelper(opts = {}) {
        const Engine = window.Engine;
        const THREE = window.THREE;
        const State = window.State;
        if (!Engine?.scene || !THREE) return null;

        const cell = this.getCellSize();
        const size = opts.worldSize ?? GRID_WORLD_SIZE;
        // Number of cells across the helper
        let divisions = Math.round(size / cell);
        divisions = Math.min(200, Math.max(4, divisions));
        // Actual size so cell edges align: divisions * cell
        const worldSize = divisions * cell;

        if (Engine.gridHelper) {
            Engine.scene.remove(Engine.gridHelper);
            Engine.gridHelper.geometry?.dispose?.();
            if (Array.isArray(Engine.gridHelper.material)) {
                Engine.gridHelper.material.forEach((m) => m.dispose?.());
            } else {
                Engine.gridHelper.material?.dispose?.();
            }
        }

        // Terminal-friendly: major green / minor dim
        const major = opts.majorColor ?? 0x2a6b3a;
        const minor = opts.minorColor ?? 0x1a1f1c;
        Engine.gridHelper = new THREE.GridHelper(worldSize, divisions, major, minor);
        Engine.gridHelper.position.y = 0.07;
        Engine.gridHelper.userData = {
            isGridHelper: true,
            cellSize: cell,
            worldSize,
            divisions,
            unit: 'm',
        };
        Engine.scene.add(Engine.gridHelper);
        Engine.gridHelper.visible = State?.gridVisible !== false;
        return Engine.gridHelper;
    },

    syncUi() {
        const cell = this.getCellSize();
        const snap = this.isSnapEnabled();
        const sizeSel = document.getElementById('grid-size');
        const sizeCustom = document.getElementById('grid-size-custom');
        const snapBtn = document.getElementById('btn-grid-snap');
        const unitLabel = document.getElementById('grid-unit-label');
        const sizeLabel = document.getElementById('grid-size-label');

        if (sizeSel) {
            const match = PRESETS.find((p) => Math.abs(p - cell) < 0.001);
            if (match != null) {
                sizeSel.value = String(match);
                if (sizeCustom) sizeCustom.style.display = 'none';
            } else {
                sizeSel.value = 'custom';
                if (sizeCustom) {
                    sizeCustom.style.display = '';
                    sizeCustom.value = String(cell);
                }
            }
        }
        if (sizeLabel) sizeLabel.textContent = `${cell} m`;
        if (unitLabel) unitLabel.textContent = '1 unit = 1 m';
        if (snapBtn) {
            snapBtn.textContent = snap ? 'ON' : 'OFF';
            snapBtn.classList.toggle('active', snap);
        }
    },

    initUi() {
        this.syncUi();
        // Rebuild helper once Engine is ready (may already exist from init)
        if (window.Engine?.scene) {
            this.rebuildHelper();
            this.applyTransformSnap();
        }

        document.getElementById('grid-size')?.addEventListener('change', (e) => {
            const v = e.target.value;
            if (v === 'custom') {
                const custom = document.getElementById('grid-size-custom');
                if (custom) {
                    custom.style.display = '';
                    custom.focus();
                }
                return;
            }
            this.setCellSize(parseFloat(v));
            window.UI?.status?.(`Grid cell ${this.getCellSize()} m`);
        });

        document.getElementById('grid-size-custom')?.addEventListener('change', (e) => {
            const m = parseFloat(e.target.value);
            if (Number.isFinite(m) && m > 0) {
                this.setCellSize(m);
                window.UI?.status?.(`Grid cell ${this.getCellSize()} m`);
            }
        });

        document.getElementById('btn-grid-snap')?.addEventListener('click', () => {
            const on = this.toggleSnap();
            window.UI?.status?.(on ? `Snap ON · ${this.getCellSize()} m` : 'Snap OFF');
        });
    },
};

window.GridSystem = GridSystem;
