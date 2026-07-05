/** Animated starter props — flags, birds, lights, creek, power lines, fence, dust */

const hooks = [];

export function registerStarterAnim(fn) {
    hooks.push(fn);
}

export const StarterAnim = {
    tick(timeMs, dt = 0.016) {
        hooks.forEach((fn) => fn(timeMs * 0.001, dt));
    },

    wireScene() {
        const State = window.State;
        const objects = State?.objects || [];
        const banner = objects.find((o) => o.userData?.id === 'starter_banner');
        const ring = objects.find((o) => o.userData?.isRotating);
        const birds = objects.filter((o) => o.userData?.animBird);
        const lamps = objects.filter((o) => o.userData?.animLamp);
        const turbine = objects.find((o) => o.userData?.id === 'starter_windmill');

        if (banner) {
            registerStarterAnim((t) => {
                banner.rotation.z = Math.sin(t * 1.8) * 0.06;
                banner.position.y = 1.35 + Math.sin(t * 2.2) * 0.04;
            });
        }

        if (ring) {
            registerStarterAnim((t, dt) => {
                ring.rotation.z += dt * 0.35;
            });
        }

        birds.forEach((bird, i) => {
            const base = bird.userData.animBase || bird.position.clone();
            bird.userData.animBase = base;
            registerStarterAnim((t) => {
                bird.position.y = base.y + Math.sin(t * 3 + i) * 0.35;
                bird.position.x = base.x + Math.sin(t * 0.7 + i * 2) * 0.5;
                bird.rotation.y = Math.sin(t * 1.2 + i) * 0.4;
            });
        });

        lamps.forEach((lamp, i) => {
            const bulb = lamp.userData.bulbMesh;
            if (!bulb?.material) return;
            registerStarterAnim((t) => {
                const pulse = 0.85 + Math.sin(t * 4 + i * 1.7) * 0.08;
                bulb.material.emissiveIntensity = 0.55 * pulse;
            });
        });

        if (turbine?.userData?.bladeGroup) {
            registerStarterAnim((t, dt) => {
                turbine.userData.bladeGroup.rotation.z += dt * 0.9;
            });
        }
    },
};

window.StarterAnim = StarterAnim;