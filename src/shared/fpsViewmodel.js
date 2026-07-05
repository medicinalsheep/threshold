/** Minimal FPS arms + pistol mesh parented to camera */

export const FpsViewmodel = {
    group: null,
    _mounted: false,

    mount(camera) {
        const T = window.THREE;
        if (!T || !camera || this._mounted) return;

        const g = new T.Group();
        g.name = 'fps_viewmodel';

        const armMat = new T.MeshStandardMaterial({ color: 0xd4a882, roughness: 0.72, metalness: 0.02 });
        const gunMat = new T.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.35, metalness: 0.55 });

        const forearm = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.32), armMat);
        forearm.position.set(0.22, -0.18, -0.42);
        const grip = new T.Mesh(new T.BoxGeometry(0.07, 0.14, 0.1), gunMat);
        grip.position.set(0.22, -0.22, -0.52);
        const barrel = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.22, 10), gunMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0.22, -0.16, -0.68);

        g.add(forearm, grip, barrel);
        g.position.set(0.14, -0.12, -0.35);
        camera.add(g);
        this.group = g;
        this._mounted = true;
    },

    unmount(camera) {
        if (!this.group || !camera) return;
        camera.remove(this.group);
        this.group = null;
        this._mounted = false;
    },

    setVisible(visible) {
        if (this.group) this.group.visible = visible;
    },

    setAiming(blend = 0) {
        if (!this.group) return;
        const T = window.THREE;
        if (!T) return;
        const b = Math.max(0, Math.min(1, blend));
        this.group.position.set(
            T.MathUtils.lerp(0.14, 0.06, b),
            T.MathUtils.lerp(-0.12, -0.15, b),
            T.MathUtils.lerp(-0.35, -0.52, b)
        );
        this.group.rotation.x = T.MathUtils.lerp(0, -0.08, b);
        this.group.rotation.y = T.MathUtils.lerp(0, 0.04, b);
        this.group.rotation.z = T.MathUtils.lerp(0, 0.03, b);
    },

    setHolstered(holstered = false) {
        if (!this.group) return;
        this.group.visible = window.State?.viewMode === 'fps' && !holstered;
    },

    playReload() {
        if (!this.group) return;
        const T = window.THREE;
        if (!T) return;
        const start = performance.now();
        const tick = () => {
            const e = (performance.now() - start) / 280;
            if (e >= 1) {
                this.group.rotation.x = 0;
                return;
            }
            this.group.rotation.x = -0.35 * Math.sin(e * Math.PI);
            requestAnimationFrame(tick);
        };
        tick();
    },

    tick(speed = 0) {
        if (!this.group?.visible) return;
        const t = performance.now() * 0.001;
        this.group.position.y = -0.12 + Math.sin(t * 14) * 0.008 * Math.min(speed / 3, 1.2);
        this.group.rotation.z = Math.sin(t * 7) * 0.02 * Math.min(speed / 3, 1);
    },
};

window.FpsViewmodel = FpsViewmodel;