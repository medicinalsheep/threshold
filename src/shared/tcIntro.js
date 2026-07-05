import { ViewPrefs } from './viewPrefs.js';
import { AssetBundle } from './assetBundle.js';
import { Cinematic } from './cinematic.js';

const INTRO_WEBM = 'video/tc_intro.webm';
const INTRO_MP4 = 'video/tc_intro.mp4';
const PREF_KEY = 'tcIntroSeen';

export function shouldPlayTcIntro() {
    return !!(ViewPrefs.get('playTcIntro', false) || ViewPrefs.get('loadTC', false));
}

export function markTcIntroSeen() {
    ViewPrefs.set(PREF_KEY, true);
    ViewPrefs.set('playTcIntro', false);
}

export async function introSourceAvailable() {
    for (const rel of [INTRO_WEBM, INTRO_MP4]) {
        try {
            const res = await fetch(AssetBundle.getUrl(rel), { method: 'HEAD' });
            if (res.ok) return rel;
        } catch { /* try next */ }
    }
    return null;
}

export async function playTcIntro(opts = {}) {
    if (!opts.force && ViewPrefs.get(PREF_KEY, false)) {
        return { played: false, reason: 'seen' };
    }
    if (!window.Engine?.camera || !window.Cinematic) {
        return { played: false, reason: 'no-engine' };
    }

    const src = await introSourceAvailable();
    if (!src) {
        return { played: false, reason: 'no-video' };
    }

    try {
        if (window.State) window.State.isPaused = true;
        const result = await Cinematic.play(src, {
            skippable: opts.skippable !== false,
            muted: !!opts.muted,
            distance: opts.distance ?? 3.8,
            onComplete: (meta) => {
                markTcIntroSeen();
                opts.onComplete?.(meta);
            },
        });
        return { played: true, source: src, result };
    } catch (e) {
        console.warn('[tc-intro]', e);
        return { played: false, reason: e.message };
    } finally {
        if (window.State && opts.resumePlay !== false) window.State.isPaused = false;
    }
}

export async function playTcIntroAfterShow(delayMs = 600) {
    if (!shouldPlayTcIntro()) return { played: false, reason: 'not-requested' };
    if (ViewPrefs.get(PREF_KEY, false)) return { played: false, reason: 'seen' };
    await new Promise((r) => setTimeout(r, delayMs));
    return playTcIntro({ skippable: true });
}

export function getTcIntroCredits() {
    return [{
        id: 'tc_intro',
        label: 'TC Intro Cutscene',
        kind: 'video',
        license: 'Original — TC',
        author: 'Threshold',
        source: INTRO_WEBM,
        storeSku: 'tc.video.intro',
        registryUri: 'threshold://com.threshold.tc/a/intro',
    }];
}

window.TcIntro = {
    playTcIntro,
    playTcIntroAfterShow,
    shouldPlayTcIntro,
    markTcIntroSeen,
    getTcIntroCredits,
};