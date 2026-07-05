import { getTcVehSpecs, getTcChrSpecs, getTcSfxSpecs, TC_IDS } from './tcMeta.js';

export function getTcAssetsBlock() {
    const L = ['// ASSETS: TC bundled originals'];
    getTcVehSpecs().forEach((v) => L.push(`// - veh: ${v.nm} | import/${v.slug}.glb+LOD | TC | ${v.id}`));
    L.push(`// - scene: TC Span | procedural | TC | ${TC_IDS.span}`);
    L.push(`// - scene: TC Checkpoint | procedural | TC | ${TC_IDS.cp}`);
    getTcChrSpecs().forEach((c) => L.push(`// - chr: ${c.nm} | import/${c.gltfSlug}.glb+LOD | TC | ${c.id}`));
    getTcSfxSpecs().forEach((s) => L.push(`// - sfx: ${s.nm} | synth | TC | ${s.id}`));
    return L.join('\n');
}

export function getTcPromptBlock() {
    return `TC ASSETS (preserve // ASSETS block in Compiler output):\n${getTcAssetsBlock()}\nExtend without World.clearWorld(). Ids: ${Object.values(TC_IDS).join(', ')}`;
}

window.TcPrompt = { getTcAssetsBlock, getTcPromptBlock };