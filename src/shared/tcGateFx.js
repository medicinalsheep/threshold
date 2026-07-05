import gateCfg from '../../config/tc-gates.json';

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function attachGate(cp) {
    const T = window.THREE;
    if (!cp || !T) return null;
    if (cp.userData?.tcGate?.bar) return cp.userData.tcGate;

    const mat = new T.MeshStandardMaterial({
        color: 0x39ff14,
        emissive: 0x1a8822,
        emissiveIntensity: 0.35,
        roughness: 0.35,
        metalness: 0.2,
    });
    const postMat = new T.MeshStandardMaterial({ color: 0x2a3344, roughness: 0.55 });

    const left = new T.Mesh(new T.CylinderGeometry(0.06, 0.07, 1.35, 10), postMat);
    left.position.set(-1.15, 0.68, 0);
    const right = left.clone();
    right.position.x = 1.15;

    const bar = new T.Mesh(new T.BoxGeometry(2.35, 0.07, 0.07), mat);
    bar.position.set(0, 1.32, 0);

    const gateRoot = new T.Group();
    gateRoot.name = 'tc_gate';
    gateRoot.add(left, right, bar);
    cp.add(gateRoot);

    let beacon = null;
    cp.traverse((c) => {
        if (beacon) return;
        if (c.isMesh && c.geometry?.type === 'SphereGeometry') beacon = c;
    });

    const gate = {
        bar,
        beacon,
        restRotX: 0,
        openRotX: -Math.PI / 2.15,
        openUntil: 0,
        flash: 0,
    };
    cp.userData.tcGate = gate;
    return gate;
}

export const TcGateFx = {
    _lastPulse: 0,

    ensureGate(cp) {
        return attachGate(cp);
    },

    trigger(cp = null) {
        const checkpoint = cp || window.TcCircuit?.findCheckpoint?.();
        if (!checkpoint) return;
        const gate = attachGate(checkpoint);
        if (!gate) return;

        const now = performance.now();
        gate.openUntil = now + (gateCfg.gateOpenMs || 1400);
        gate.flash = 1;
        this._lastPulse = now;
        window.AudioSys?.playObjectSound?.(checkpoint, 'interact');

        if (gate.beacon?.material?.emissive) {
            gate.beacon.material.emissiveIntensity = 1.1;
        }
    },

    onCircuitPulse(ts) {
        const pulse = Number(ts);
        if (!Number.isFinite(pulse) || pulse <= this._lastPulse) return;
        this._lastPulse = pulse;
        this.trigger();
    },

    tick() {
        const cp = window.TcCircuit?.findCheckpoint?.();
        if (!cp) return;
        const gate = attachGate(cp);
        if (!gate?.bar) return;

        const now = performance.now();
        const open = gate.openUntil > now;
        const target = open ? gate.openRotX : gate.restRotX;
        gate.bar.rotation.x += (target - gate.bar.rotation.x) * 0.2;

        const circuitLive = !!window.TcCircuit?.state?.running;
        if (gate.beacon?.material) {
            let intensity = gateCfg.beaconIdlePulse ?? 0.45;
            if (circuitLive) {
                intensity = 0.42 + Math.sin(now * 0.005) * 0.22;
            }
            if (gate.flash > 0.01) {
                intensity = Math.max(intensity, 0.65 + gate.flash * 0.55);
                gate.flash *= 0.88;
            }
            gate.beacon.material.emissiveIntensity = intensity;
        }

        if (open && gate.bar.material?.emissiveIntensity != null) {
            gate.bar.material.emissiveIntensity = 0.35 + Math.sin(now * 0.02) * 0.25;
        } else if (gate.bar.material) {
            gate.bar.material.emissiveIntensity = 0.35;
        }
    },
};

window.TcGateFx = TcGateFx;