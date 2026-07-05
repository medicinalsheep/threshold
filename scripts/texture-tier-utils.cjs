/** Shared HILOD tier caps — PNG / WebP / KTX2 compress scripts */

function maxDimFor(name) {
    if (name.includes('_4k')) return 1024;
    if (name.includes('_2k')) return 512;
    if (name.includes('_1k')) return 256;
    if (name.includes('_512')) return 128;
    return 512;
}

const HILOD_SUFFIXES = ['_512', '_1k', '_2k', '_4k', ''];

module.exports = { maxDimFor, HILOD_SUFFIXES };