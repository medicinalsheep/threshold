const HOLD_MS = 480;
const DOUBLE_MS = 380;

export const TouchControls = {
    enabled: false,
    left: { x: 0, y: 0, active: false },
    right: { x: 0, y: 0, active: false },
    buttons: { jump: false, action: false, sprint: false },
    _pointers: new Map(),
    _holdTimer: null,
    _holdPoint: null,

    init() {
        const coarse = window.matchMedia('(pointer: coarse)').matches;
        const narrow = window.innerWidth < 900;
        this.enabled = coarse || narrow;
        const root = document.getElementById('touch-controls');
        if (!root) return;
        root.classList.toggle('visible', this.enabled);

        root.querySelectorAll('[data-touch-btn]').forEach((btn) => {
            const key = btn.dataset.touchBtn;
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.buttons[key] = true;
                btn.classList.add('pressed');
            });
            btn.addEventListener('pointerup', () => {
                this.buttons[key] = false;
                btn.classList.remove('pressed');
            });
            btn.addEventListener('pointerleave', () => {
                this.buttons[key] = false;
                btn.classList.remove('pressed');
            });
        });

        this._bindStick('touch-stick-left', 'left');
        this._bindStick('touch-stick-right', 'right');

        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas) {
            canvas.addEventListener('pointerdown', (e) => this._onCanvasPointer(e));
            canvas.addEventListener('pointerup', (e) => this._onCanvasUp(e));
            canvas.addEventListener('pointermove', (e) => this._onCanvasMove(e));
            canvas.addEventListener('pointercancel', (e) => this._onCanvasUp(e));
        }
    },

    _bindStick(id, slot) {
        const zone = document.getElementById(id);
        const knob = zone?.querySelector('.touch-knob');
        if (!zone || !knob) return;
        const maxR = 42;

        zone.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            zone.setPointerCapture(e.pointerId);
            this._pointers.set(e.pointerId, { slot, startX: e.clientX, startY: e.clientY });
            this[slot].active = true;
        });

        zone.addEventListener('pointermove', (e) => {
            const p = this._pointers.get(e.pointerId);
            if (!p || p.slot !== slot) return;
            let dx = e.clientX - p.startX;
            let dy = e.clientY - p.startY;
            const len = Math.hypot(dx, dy);
            if (len > maxR) { dx = (dx / len) * maxR; dy = (dy / len) * maxR; }
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            this[slot].x = dx / maxR;
            this[slot].y = dy / maxR;
        });

        const end = (e) => {
            const p = this._pointers.get(e.pointerId);
            if (!p || p.slot !== slot) return;
            this._pointers.delete(e.pointerId);
            this[slot].active = false;
            this[slot].x = 0;
            this[slot].y = 0;
            knob.style.transform = '';
        };
        zone.addEventListener('pointerup', end);
        zone.addEventListener('pointercancel', end);
    },

    _onCanvasPointer(e) {
        if (!this.enabled || e.target.closest('#touch-controls')) return;
        if (e.pointerType === 'touch') {
            this._holdPoint = { x: e.clientX, y: e.clientY, time: Date.now() };
            clearTimeout(this._holdTimer);
            this._holdTimer = setTimeout(() => {
                if (this._holdPoint) window.Engine?.openContextAtScreen?.(this._holdPoint.x, this._holdPoint.y);
                this._holdPoint = null;
            }, HOLD_MS);
        }
        const now = Date.now();
        if (this._lastTap && now - this._lastTap.time < DOUBLE_MS
            && Math.hypot(e.clientX - this._lastTap.x, e.clientY - this._lastTap.y) < 40) {
            clearTimeout(this._holdTimer);
            this._holdPoint = null;
            window.Engine?.openContextAtScreen?.(e.clientX, e.clientY);
            this._lastTap = null;
            return;
        }
        this._lastTap = { x: e.clientX, y: e.clientY, time: now };
    },

    _onCanvasMove(e) {
        if (this._holdPoint && Math.hypot(e.clientX - this._holdPoint.x, e.clientY - this._holdPoint.y) > 18) {
            clearTimeout(this._holdTimer);
            this._holdPoint = null;
        }
    },

    _onCanvasUp() {
        clearTimeout(this._holdTimer);
        this._holdPoint = null;
    },

    applyToControls(Controls) {
        if (!this.enabled) return;
        const dead = 0.2;
        if (this.left.active) {
            if (this.left.y < -dead) Controls.gamepadActions.forward = true;
            if (this.left.y > dead) Controls.gamepadActions.back = true;
            if (this.left.x < -dead) Controls.gamepadActions.left = true;
            if (this.left.x > dead) Controls.gamepadActions.right = true;
        }
        if (this.right.active) {
            Controls.cameraStick.x = this.right.x;
            Controls.cameraStick.y = this.right.y;
        }
        if (this.buttons.jump) Controls.gamepadActions.jump = true;
        if (this.buttons.sprint) Controls.gamepadActions.sprint = true;
        if (this.buttons.action && !this._actionLatch) {
            Controls.justPressed.interact = true;
            this._actionLatch = true;
        }
        if (!this.buttons.action) this._actionLatch = false;
    }
};

window.TouchControls = TouchControls;