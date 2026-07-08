/** Phase 19 — Wardenclyffe unified site (Option A: narrative-first) */

export const BUILDING = {
    w: 12,
    d: 5.2,
    h: 3.6,
    wall: 0.22,
    floorY: 0.14,
    southZ: 2.6,
    doorW: 1.55,
};

export const LAB = {
    w: 10.8,
    d: 4.0,
    wallH: 3.15,
    halfW: 5.4,
    halfD: 2.0,
};

export const SITE = {
    building: { x: 0, y: 0, z: 0 },
    spawn: { x: 0, y: 0, z: 2 },
    courtyard: { x: 0, y: 0, z: 0 },
    lab: { x: 0, y: BUILDING.floorY, z: 0 },
    labDoor: { x: 0, y: BUILDING.floorY, z: LAB.halfD - 0.05 },
    interiorEntry: { x: 0, y: BUILDING.floorY, z: 0.55 },
    courtyardEntry: { x: 0, y: 0, z: 2 },
    tower: { x: 0, y: 0, z: -14 },
    field: { x: 0, y: 0, z: 0, w: 32, d: 32 },
    highway: { x: 24, y: 0, z: 8 },
    creek: { x: -16, y: 0, z: 10 },
    treeLineZ: -22,
    cameraSpawn: { x: 18, y: 4.2, z: 18 },
    cameraTarget: { x: 0, y: 0, z: 0 },
};

export const EXTERIOR_SPAWN = { ...SITE.spawn };
export const BUILDING_CENTER = { ...SITE.building };
export const LAB_ORIGIN = { ...SITE.lab };
export const TOWER_BASE = { ...SITE.tower };
export const DOOR_POS = { ...SITE.labDoor };

/** Local offset inside lab room → world position */
export function labPos(lx, lz, ly = 0) {
    return { x: LAB_ORIGIN.x + lx, y: LAB_ORIGIN.y + ly, z: LAB_ORIGIN.z + lz };
}

/** Local XZ offset from courtyard center → world position */
export function court(lx, lz, ly = 0) {
    return { x: SITE.courtyard.x + lx, y: ly, z: SITE.courtyard.z + lz };
}

window.StarterSite = SITE;
window.EXTERIOR_SPAWN = EXTERIOR_SPAWN;
window.BUILDING_CENTER = BUILDING_CENTER;
window.LAB_ORIGIN = LAB_ORIGIN;
window.TOWER_BASE = TOWER_BASE;
window.DOOR_POS = DOOR_POS;
window.courtStarter = court;
window.labPosStarter = labPos;
window.StarterBuilding = BUILDING;
window.StarterLabDims = LAB;