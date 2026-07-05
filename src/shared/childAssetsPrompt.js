/**
 * PromptGen ASSETS block — Threshold Child bundled originals (R3).
 */

import { getChildVehicleSpecs, getChildCharacterSpecs, getChildAudioSpecs } from './thresholdChildMeta.js';

export function getChildAssetsCommentBlock() {
    const lines = ['// ASSETS: Threshold Child bundled originals (cite in EXPORT CREDITS)'];

    getChildVehicleSpecs().forEach((v) => {
        lines.push(`// - vehicle: ${v.label} | import/${v.slug}.glb + LOD | license: Original — Threshold Child edition | id: ${v.id}`);
    });

    lines.push('// - scene: Threshold Circuit Span | procedural | license: Original — Threshold Child edition | id: child_circuit_span');
    lines.push('// - scene: Threshold Checkpoint | procedural | license: Original — Threshold Child edition | id: child_checkpoint');

    getChildCharacterSpecs().forEach((c) => {
        lines.push(`// - character: ${c.label} | HumanMesh procedural | license: Original — Threshold Child edition | id: ${c.id}`);
    });

    getChildAudioSpecs().forEach((s) => {
        lines.push(`// - sound: ${s.label} | synthesized WAV | license: Original — Threshold Child edition | soundClipId: ${s.id}`);
    });

    lines.push('// Wire: userData.soundClipId + soundTrigger on matching object ids above');
    lines.push('// Wire: userData.textureHint only for GIMP/Blender user art — not required for Child originals');
    return lines.join('\n');
}

export function getChildAssetsPromptBlock() {
    return `
THRESHOLD CHILD ASSETS (include in generated // ASSETS: comment block):
${getChildAssetsCommentBlock()}

When extending the showcase: do NOT World.clearWorld() — add checkpoints, timers, or NPC patrol scripts.
Reference Child object ids: child_runner, child_hauler, child_circuit_span, child_marshal, child_mechanic, child_checkpoint.
`.trim();
}

window.ChildAssetsPrompt = {
    getChildAssetsCommentBlock,
    getChildAssetsPromptBlock,
};