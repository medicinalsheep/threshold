import { ViewPrefs } from './viewPrefs.js';
import { spawnThresholdChildLite } from './thresholdChildAssets.js';

/** @deprecated Dev-only external seed — use Threshold Child editions */
export async function spawnExternalSeedLite() {
    console.warn('[reference] External seed editions are dev-only — use Threshold Child (lobby button)');
    return { spawned: 0, edition: null, error: 'external seeds disabled in shipped builds' };
}

export function shouldLoadThresholdChild() {
    return !!ViewPrefs.get('loadThresholdChild', false);
}

export function setLoadThresholdChild(on) {
    ViewPrefs.set('loadThresholdChild', !!on);
}

/** @deprecated alias */
export function setLoadReferenceLite(on) {
    setLoadThresholdChild(on);
}

export async function bootstrapReferenceIfRequested() {
    if (!shouldLoadThresholdChild()) return null;
    ViewPrefs.set('loadThresholdChild', false);
    return spawnThresholdChildLite();
}

window.ReferenceEdition = {
    spawnThresholdChildLite,
    setLoadThresholdChild,
    setLoadReferenceLite,
    shouldLoadThresholdChild,
    bootstrapReferenceIfRequested,
};