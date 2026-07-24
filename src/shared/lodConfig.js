import lodDistances from '../../config/lod-distances.json';

export const LOD_DISTANCES = lodDistances.distances || [0, 35, 75];
export const LOD_HYSTERESIS_BAND = Number(lodDistances.hysteresisBand) || 4;

export function pickLodLevel(distance, distances = LOD_DISTANCES) {
    let level = 0;
    for (let i = 0; i < distances.length; i++) {
        if (distance >= distances[i]) level = i;
    }
    return Math.min(level, distances.length - 1);
}

window.LodConfig = { LOD_DISTANCES, LOD_HYSTERESIS_BAND, pickLodLevel };