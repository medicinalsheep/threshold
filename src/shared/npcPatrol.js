/** Simple waypoint patrol for starter / scene NPCs */

export const NpcPatrol = {
    routes: new Map(),

    register(npc, waypoints = [], speed = 1.15) {
        if (!npc || !waypoints.length) return;
        const id = npc.userData?.id || npc.uuid;
        this.routes.set(id, {
            npc,
            points: waypoints.map((p) => ({ x: p.x, y: p.y ?? 0, z: p.z })),
            speed,
            idx: 0,
            wait: 0,
        });
        npc.userData.patrolId = id;
    },

    tick(dt = 0.016) {
        const State = window.State;
        if (State?.isPaused || State?.cutscenePlaying) return;

        const Vis = window.VisibilitySystem;
        this.routes.forEach((route) => {
            const { npc, points, speed } = route;
            if (!npc?.parent) return;
            // E1: keep sim motion; skip skeletal anim when off-screen (D/E)
            const anim = !Vis || Vis.shouldProcessLod(npc);

            if (route.wait > 0) {
                route.wait -= dt;
                if (anim) window.HumanMesh?.updateIdle?.(npc, performance.now() * 0.001, dt);
                return;
            }

            const target = points[route.idx];
            if (!target) return;

            const dx = target.x - npc.position.x;
            const dz = target.z - npc.position.z;
            const dist = Math.hypot(dx, dz);

            if (dist < 0.18) {
                route.idx = (route.idx + 1) % points.length;
                route.wait = 1.4 + Math.random() * 1.8;
                if (anim) window.HumanMesh?.updateIdle?.(npc, performance.now() * 0.001, dt);
                return;
            }

            const step = speed * dt;
            npc.position.x += (dx / dist) * step;
            npc.position.z += (dz / dist) * step;
            npc.rotation.y = Math.atan2(dx, dz);
            if (anim) window.HumanMesh?.updateWalk?.(npc, speed, dt, false);
        });
    },
};

window.NpcPatrol = NpcPatrol;