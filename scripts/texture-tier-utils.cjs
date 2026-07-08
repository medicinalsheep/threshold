/** Shared HILOD tier caps — PNG masters, downscale targets, WebP encode dims */

/** Downscale targets after master export (quality-first — no _512) */
const HILOD_OUTPUT_TIERS = [
    { suffix: '_1k', px: 1024 },
    { suffix: '_2k', px: 2048 },
];

const MASTER_PX = 2048;
const WEBP_QUALITY = 82;

/** Max dimension when encoding WebP (delivery size, not source PNG size) */
function maxDimFor(name = '') {
    const lower = String(name).toLowerCase();
    if (lower.includes('_4k')) return 2048;
    if (lower.includes('_2k')) return 1024;
    if (lower.includes('_1k')) return 512;
    return 1024;
}

const HILOD_SUFFIXES = ['_1k', '_2k', '_4k', ''];

module.exports = {
    HILOD_OUTPUT_TIERS,
    MASTER_PX,
    WEBP_QUALITY,
    maxDimFor,
    HILOD_SUFFIXES,
};