import { ViewPrefs } from './viewPrefs.js';
import { spawnTcLite } from './tcLite.js';
import { spawnTcVeh } from './tcVeh.js';
import { spawnTcShow } from './tcShow.js';

export function shouldLoadTC() {
    return !!(ViewPrefs.get('loadTC', false) || ViewPrefs.get('loadThresholdChild', false));
}

export function setLoadTC(on) {
    ViewPrefs.set('loadTC', !!on);
    ViewPrefs.set('loadThresholdChild', !!on);
}

/** @deprecated */
export function setLoadThresholdChild(on) { setLoadTC(on); }
export function shouldLoadThresholdChild() { return shouldLoadTC(); }

export async function bootstrapReferenceIfRequested() {
    if (!shouldLoadTC()) return null;
    setLoadTC(false);

    const show = await spawnTcShow();
    if (show.n >= 4) return show;

    const veh = await spawnTcVeh();
    if (veh.n >= 2) return veh;

    return spawnTcLite();
}

window.ReferenceEdition = {
    spawnTcShow,
    spawnTcVeh,
    spawnTcLite,
    setLoadTC,
    setLoadThresholdChild,
    shouldLoadTC,
    bootstrapReferenceIfRequested,
};