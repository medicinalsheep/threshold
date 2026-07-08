/** Sprint J/N — passive survival zone modifiers from ambient props + shelter */

import { SITE } from '../../src/shared/starterSiteLayout.js';

const ZONE_DEFS = [
    { zone: 'creek', pos: () => SITE.creek, radius: 5.2, water: 0.9, stressRelief: 0.15, sheltered: false },
    { zone: 'coffee', pos: () => ({ x: 0, y: 0, z: 0 }), radius: 4.5, rest: 0.35, calm: 0.45, food: 0.08, sheltered: true },
    { zone: 'tesla', pos: () => ({ x: 0, y: 0, z: 0 }), radius: 8.5, rest: 0.55, calm: 0.7, stressRelief: 0.25, sheltered: true },
    { zone: 'interior', pos: () => ({ x: 0, y: 0, z: 0 }), radius: 6, rest: 0.4, calm: 0.35, sheltered: true },
    { zone: 'construction', pos: () => ({ x: 0, y: 0, z: 0 }), radius: 5, stressRelief: 0.08, sheltered: false },
    { zone: 'power_hum', pos: () => ({ x: 0, y: 0, z: 0 }), radius: 4, calm: 0.2, sheltered: true },
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

function resolveZoneRadius(def) {
    const State = window.State;
    const marker = State?.objects?.find((o) => o.userData?.ambientZone === def.zone);
    if (marker?.userData?.zoneRadius) return marker.userData.zoneRadius;
    return def.radius;
}

function collectCustomZones() {
    const State = window.State;
    if (!State?.objects?.length) return [];

    const known = new Set(ZONE_DEFS.map((d) => d.zone));
    const seen = new Set();
    const custom = [];

    State.objects.forEach((obj) => {
        const zone = obj.userData?.ambientZone;
        if (!zone || known.has(zone) || seen.has(zone)) return;
        seen.add(zone);
        const ud = obj.userData;
        custom.push({
            zone,
            pos: () => ({ x: obj.position.x, y: obj.position.y, z: obj.position.z }),
            radius: ud.zoneRadius || 5,
            water: ud.zoneWater || 0,
            rest: ud.zoneRest || 0,
            food: ud.zoneFood || 0,
            stressRelief: ud.zoneStressRelief || 0,
            calm: ud.zoneCalm || 0,
            sheltered: !!ud.zoneSheltered,
        });
    });
    return custom;
}

function allZoneDefs() {
    return [...ZONE_DEFS, ...collectCustomZones()];
}

export const SurvivalZones = {
    listKnownZones() {
        return ZONE_DEFS.map((d) => d.zone);
    },

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

        allZoneDefs().forEach((def) => {
            const center = resolveZonePos(def);
            const radius = resolveZoneRadius(def);
            const r2 = radius * radius;
            const d2 = distSq(pos, center);
            if (d2 >= r2) return;
            const t = 1 - Math.sqrt(d2) / radius;
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