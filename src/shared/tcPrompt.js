import { getTcVehSpecs, getTcChrSpecs, getTcSfxSpecs, TC_IDS } from './tcMeta.js';

export function getTcAssetsBlock() {
    const L = ['// ASSETS: TC bundled originals'];
    getTcVehSpecs().forEach((v) => L.push(`// - veh: ${v.nm} | import/${v.slug}.glb+LOD | TC | ${v.id}`));
    L.push(`// - scene: TC Span | procedural | TC | ${TC_IDS.span}`);
    L.push(`// - scene: TC Checkpoint | procedural | TC | ${TC_IDS.cp}`);
    getTcChrSpecs().forEach((c) => L.push(`// - chr: ${c.nm} | import/${c.gltfSlug}.glb+LOD | TC | ${c.id}`));
    getTcSfxSpecs().forEach((s) => L.push(`// - sfx: ${s.nm} | synth | TC | ${s.id}`));
    L.push('// - tex: TC Runner | textures/tc_run_albedo.png+HILOD | TC | tc_run');
    L.push('// - tex: TC Hauler | textures/tc_haul_albedo.png+HILOD | TC | tc_haul');
    L.push('// - tex: TC Marshal | textures/tc_msh_albedo.png+HILOD | TC | tc_msh');
    L.push('// - tex: TC Mechanic | textures/tc_mec_albedo.png+HILOD | TC | tc_mec');
    L.push('// - tex: TC Span | textures/tc_span_albedo.png+HILOD | TC | tc_span');
    L.push('// - video: TC Intro | video/tc_intro.webm | TC | tc_intro');
    return L.join('\n');
}

export function getTcPromptBlock() {
    return `TC ASSETS (preserve // ASSETS block in Compiler output):\n${getTcAssetsBlock()}\nExtend without World.clearWorld(). Ids: ${Object.values(TC_IDS).join(', ')}`;
}

window.TcPrompt = { getTcAssetsBlock, getTcPromptBlock };