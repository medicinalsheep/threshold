/** TC (Threshold Child) — abbreviated ids + metadata */

export const TC_LIC = 'Original — TC';
export const TC_AUTH = 'Threshold';

export const TC_ED = {
    lite: 'tc-lite',
    veh: 'tc-veh',
    chr: 'tc-chr',
    sfx: 'tc-sfx',
    show: 'tc-show',
};

export const TC_BID = 'com.threshold.tc';

export const TC_META = {
    lite: { ed: TC_ED.lite, ver: '1.1', bid: TC_BID, pfx: 'tc' },
    veh: { ed: TC_ED.veh, ver: '1.1', bid: TC_BID, pfx: 'tc' },
    chr: { ed: TC_ED.chr, ver: '1.0', bid: TC_BID, pfx: 'tc' },
    sfx: { ed: TC_ED.sfx, ver: '1.0', bid: TC_BID, pfx: 'tc' },
    show: { ed: TC_ED.show, ver: '1.0', bid: TC_BID, pfx: 'tc' },
};

export const TC_IDS = {
    run: 'tc_run',
    haul: 'tc_haul',
    span: 'tc_span',
    msh: 'tc_msh',
    mec: 'tc_mec',
    cp: 'tc_cp',
};

export const TC_SFX = {
    imp: 'tc_sfx_imp',
    ft: 'tc_sfx_ft',
    eng: 'tc_sfx_eng',
    cp: 'tc_sfx_cp',
    go: 'tc_sfx_go',
};

export function tcSku(kind, slug) {
    return `tc.${kind}.${slug}`;
}

export function tcUri(slug) {
    return `threshold://${TC_BID}/a/${slug}`;
}

export function buildTcUd(spec, meta = TC_META.lite) {
    const slug = spec.id.replace(/^tc_/, '');
    return {
        id: spec.id,
        name: spec.nm || spec.label || spec.id,
        type: spec.typ || spec.type,
        assetKind: spec.k || spec.kind,
        isTC: true,
        tcEd: meta.ed,
        tcVer: meta.ver,
        license: TC_LIC,
        author: TC_AUTH,
        tcSrc: spec.src || 'TC bundled',
        registryUri: spec.uri || tcUri(slug),
        storeSku: spec.sku || tcSku(spec.k || spec.kind, slug),
        hasPhysics: spec.phys ?? spec.hasPhysics ?? false,
        mass: spec.mass ?? 1,
        friction: spec.fric ?? spec.friction ?? 0.4,
        restitution: spec.rest ?? spec.restitution ?? 0.2,
        soundTrigger: spec.sndTrig || spec.soundTrigger || 'collision',
        soundFreq: spec.sndHz ?? spec.soundFreq ?? 180,
        soundType: spec.sndTyp || spec.soundType || 'sine',
        locked: !!spec.lock || !!spec.locked,
        renderModeHint: 4,
    };
}

export function getTcVehSpecs() {
    return [
        {
            id: TC_IDS.run,
            nm: 'TC Runner',
            objectName: 'TC Runner',
            slug: 'tc_run',
            typ: 'gltf',
            k: 'vehicle',
            phys: true,
            mass: 3.4,
            fric: 0.36,
            rest: 0.14,
            sndHz: 220,
            sndTyp: 'square',
            pos: { x: -3.5, y: 0, z: 1 },
        },
        {
            id: TC_IDS.haul,
            nm: 'TC Hauler',
            objectName: 'TC Hauler',
            slug: 'tc_haul',
            typ: 'gltf',
            k: 'vehicle',
            phys: true,
            mass: 5.8,
            fric: 0.44,
            rest: 0.1,
            sndHz: 140,
            sndTyp: 'sawtooth',
            pos: { x: 3.5, y: 0, z: -1 },
        },
    ];
}

export function getTcChrSpecs() {
    return [
        {
            id: TC_IDS.msh,
            nm: 'TC Marshal',
            typ: 'human',
            k: 'character',
            pos: { x: -1.5, y: 0, z: -6 },
            rotY: 0.4,
            mesh: { bodyColor: 0x1a2a44, pantsColor: 0x111822, skinColor: 0xffd4b8, hairColor: 0x1a1010 },
            gltfSlug: 'tc_msh',
            persona: 'Circuit official — EXPORT walkthrough.',
        },
        {
            id: TC_IDS.mec,
            nm: 'TC Mechanic',
            typ: 'human',
            k: 'character',
            pos: { x: 5, y: 0, z: 0 },
            rotY: -1.2,
            mesh: { bodyColor: 0xcc6622, pantsColor: 0x333344, skinColor: 0xe8b896, hairColor: 0x3d2817 },
            gltfSlug: 'tc_mec',
            persona: 'Garage tech — vehicle tuning.',
        },
    ];
}

export function getTcSfxSpecs() {
    return [
        { id: TC_SFX.imp, nm: 'TC Impact', k: 'sound', trig: 'collision', tgts: [TC_IDS.run, TC_IDS.haul], syn: { type: 'square', freq: 120, dur: 0.18, dec: 0.08 } },
        { id: TC_SFX.ft, nm: 'TC Footstep', k: 'sound', trig: 'ambient', tgts: [TC_IDS.msh, TC_IDS.mec], syn: { type: 'triangle', freq: 280, dur: 0.06, dec: 0.04 } },
        { id: TC_SFX.eng, nm: 'TC Engine', k: 'sound', trig: 'ambient', tgts: [TC_IDS.haul], syn: { type: 'sawtooth', freq: 55, dur: 0.45, dec: 0.2 } },
        { id: TC_SFX.cp, nm: 'TC Checkpoint', k: 'sound', trig: 'interact', tgts: [TC_IDS.cp], syn: { type: 'sine', freq: 660, dur: 0.12, dec: 0.06 } },
        { id: TC_SFX.go, nm: 'TC Start', k: 'sound', trig: 'interact', tgts: [TC_IDS.span], syn: { type: 'sine', freq: 880, dur: 0.2, dec: 0.1 } },
    ];
}

/** Map legacy saved-world ids → TC */
export const TC_ID_ALIAS = {
    child_runner: TC_IDS.run,
    child_hauler: TC_IDS.haul,
    child_circuit_span: TC_IDS.span,
    child_marshal: TC_IDS.msh,
    child_mechanic: TC_IDS.mec,
    child_checkpoint: TC_IDS.cp,
};

export function normTcId(id) {
    return TC_ID_ALIAS[id] || id;
}

window.TcMeta = { TC_ED, TC_IDS, TC_SFX, TC_LIC, buildTcUd, getTcVehSpecs, getTcChrSpecs, getTcSfxSpecs, normTcId };