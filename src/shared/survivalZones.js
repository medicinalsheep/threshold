/** Sprint J — passive survival zone modifiers from ambient props + shelter */

import { SITE } from './starterSiteLayout.js';

const ZONE_DEFS = [
    { zone: 'creek', pos: () => SITE.creek, radius: 5.2, water: 0.9, stressRelief: 0.15, sheltered: false },
    { zone: 'coffee', pos: () => ({ x: 0, y: 0, z: 0 }), radius: 4.5, rest: 0.35, calm: 0.45, food: 0.08, sheltered: true },
    { zone: 'tesla', pos: () => ({ x: 0, y: 0, z: 0 }), radius: 8.5, rest: 0.55, calm: 0.7, stressRelief: 0.25, sheltered: true },
    { zone: 'interior', pos: () => ({ x: 0, y: 0, z: 0 }), radius: 6, rest: 0.4, calm: 0.35, sheltered: true },
];

function distSq(a, b) {
    const dx = a.x - b.x;
    const dy = (a.y || 0) - (b.y || 0);
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

function resolveZonePos(def) {
    const State = window.State;
    if (!State?.objects?.length) return def.pos();

    const marker = State.objects.find((o) => o.userData?.ambientZone === def.zone);
    if (marker?.position) {
        return { x: marker.position.x, y: marker.position.y, z: marker.position.z };
    }
    return def.pos();
}

export const SurvivalZones = {
    getModifiers(pos) {
        if (!pos) {
            return { water: 0, rest: 0, food: 0, stressRelief: 0, calm: 0, sheltered: false, labels: [] };
        }

        const out = {
            water: 0,
            rest: 0,
            food: 0,
            stressRelief: 0,
            calm: 0,
            sheltered: false,
            labels: [],
        };

        ZONE_DEFS.forEach((def) => {
            const center = resolveZonePos(def);
            const r2 = def.radius * def.radius;
            const d2 = distSq(pos, center);
            if (d2 >= r2) return;
            const t = 1 - Math.sqrt(d2) / def.radius;
            const w = t * t;

            if (def.water) out.water += def.water * w;
            if (def.rest) out.rest += def.rest * w;
            if (def.food) out.food += def.food * w;
            if (def.stressRelief) out.stressRelief += def.stressRelief * w;
            if (def.calm) out.calm += def.calm * w;
            if (def.sheltered && w > 0.12) {
                out.sheltered = true;
                out.labels.push(def.zone);
            }
        });

        return out;
    },
};

window.SurvivalZones = SurvivalZones;