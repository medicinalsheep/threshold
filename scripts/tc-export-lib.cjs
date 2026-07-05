/**
 * S1 — synthesize TC Show .threshold-game.json from on-disk assets (mirrors EXPORT wizard).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STORE_ASSETS_CONFIG = path.join(ROOT, 'config', 'store-assets.json');

const TC_BID = 'com.threshold.tc';
const TC_LIC = 'Original — TC';
const TC_AUTH = 'Threshold';

const TC_IDS = {
    run: 'tc_run',
    haul: 'tc_haul',
    span: 'tc_span',
    msh: 'tc_msh',
    mec: 'tc_mec',
    cp: 'tc_cp',
};

const TC_SFX = {
    imp: 'tc_sfx_imp',
    ft: 'tc_sfx_ft',
    eng: 'tc_sfx_eng',
    cp: 'tc_sfx_cp',
    go: 'tc_sfx_go',
};

function slugify(name = '') {
    return String(name).replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'game';
}

function assetSlug(label = '', id = '') {
    return slugify(label || id).replace(/-/g, '_').slice(0, 32) || 'asset';
}

function tcSku(kind, slug) {
    return `tc.${kind}.${slug}`;
}

function tcUri(slug) {
    return `threshold://${TC_BID}/a/${slug}`;
}

function suggestStoreSku(bundleId, entry) {
    const base = (bundleId || TC_BID).split('.').pop() || 'tc';
    const kind = entry.kind || 'asset';
    const slug = assetSlug(entry.label, entry.id);
    return `${base}.${kind}.${slug}`;
}

function suggestRegistryUri(bundleId, entry) {
    const slug = assetSlug(entry.label, entry.id);
    return `threshold://${bundleId || TC_BID}/asset/${slug}`;
}

function readJson(filePath, fallback = null) {
    const resolved = path.resolve(ROOT, filePath);
    if (!fs.existsSync(resolved)) return fallback;
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function getTcVehSpecs() {
    return [
        { id: TC_IDS.run, nm: 'TC Runner', slug: 'run', k: 'vehicle' },
        { id: TC_IDS.haul, nm: 'TC Hauler', slug: 'haul', k: 'vehicle' },
    ];
}

function getTcChrSpecs() {
    return [
        { id: TC_IDS.msh, nm: 'TC Marshal', k: 'character' },
        { id: TC_IDS.mec, nm: 'TC Mechanic', k: 'character' },
    ];
}

function getTcSfxSpecs() {
    return [
        { id: TC_SFX.imp, nm: 'TC Impact', k: 'sound' },
        { id: TC_SFX.ft, nm: 'TC Footstep', k: 'sound' },
        { id: TC_SFX.eng, nm: 'TC Engine', k: 'sound' },
        { id: TC_SFX.cp, nm: 'TC Checkpoint', k: 'sound' },
        { id: TC_SFX.go, nm: 'TC Start', k: 'sound' },
    ];
}

function getTcLiteCredits() {
    return [{
        id: TC_IDS.span, label: 'TC Span', kind: 'scene', license: TC_LIC, author: TC_AUTH,
        source: 'TC procedural', storeSku: tcSku('scene', 'span'), registryUri: tcUri('span'),
    }];
}

function getTcVehCredits() {
    return getTcVehSpecs().map((s) => ({
        id: s.id, label: s.nm, kind: s.k, license: TC_LIC, author: TC_AUTH,
        source: 'TC GLB+LOD', storeSku: tcSku(s.k, s.slug), registryUri: tcUri(s.slug),
    }));
}

function getTcChrCredits() {
    return getTcChrSpecs().map((s) => ({
        id: s.id, label: s.nm, kind: s.k, license: TC_LIC, author: TC_AUTH,
        source: 'TC GLB or HumanMesh',
        storeSku: tcSku(s.k, s.id.replace(/^tc_/, '')),
        registryUri: tcUri(s.id.replace(/^tc_/, '')),
    }));
}

function getTcSfxCredits() {
    return getTcSfxSpecs().map((s) => ({
        id: s.id, label: s.nm, kind: s.k, license: TC_LIC, author: TC_AUTH,
        source: 'TC synth',
        storeSku: tcSku(s.k, s.id.replace(/^tc_sfx_/, '')),
        registryUri: tcUri(s.id.replace(/^tc_sfx_/, '')),
    }));
}

function getTcShowCredits() {
    return [{
        id: TC_IDS.cp, label: 'TC Checkpoint', kind: 'scene', license: TC_LIC, author: TC_AUTH,
        source: 'TC show prop', storeSku: tcSku('scene', 'cp'), registryUri: tcUri('cp'),
    }];
}

function getTcTexCredits() {
    return [
        { id: 'tc_tex_run', label: 'TC Runner PBR', kind: 'texture', license: TC_LIC, source: 'tc-gen-tex r6' },
        { id: 'tc_tex_haul', label: 'TC Hauler PBR', kind: 'texture', license: TC_LIC, source: 'tc-gen-tex r6' },
        { id: 'tc_tex_msh', label: 'TC Marshal PBR', kind: 'texture', license: TC_LIC, source: 'tc-gen-tex r6' },
        { id: 'tc_tex_mec', label: 'TC Mechanic PBR', kind: 'texture', license: TC_LIC, source: 'tc-gen-tex r6' },
        { id: 'tc_tex_span', label: 'TC Span PBR', kind: 'texture', license: TC_LIC, source: 'tc-gen-tex r6' },
    ];
}

function getTcIntroCredits() {
    return [{
        id: 'tc_intro',
        label: 'TC Intro Cutscene',
        kind: 'video',
        license: TC_LIC,
        author: TC_AUTH,
        source: 'video/tc_intro.webm',
        storeSku: 'tc.video.intro',
        registryUri: 'threshold://com.threshold.tc/a/intro',
    }];
}

function defaultExportDraft(base = {}) {
    return {
        name: base.name || 'TC Show',
        author: base.author || TC_AUTH,
        description: base.description || '',
        targets: { web: true, android: true, windows: true, ios: false, steam: false, ...(base.targets || {}) },
        branding: {
            bundleId: TC_BID,
            iconPath: 'icons/appicon512.png',
            iconCustomized: false,
            checklist: { replacedAppIcon: false, ranBuildIcons: false, ranCapAssets: false },
            ...(base.branding || {}),
        },
        credits: {
            global: base.credits?.global || 'Original TC assets — Threshold Child showcase edition.',
            entries: { ...(base.credits?.entries || {}) },
        },
        store: {
            contactEmail: base.store?.contactEmail || '',
            supportUrl: base.store?.supportUrl || '',
            privacyPolicyUrl: base.store?.privacyPolicyUrl || '',
            ...(base.store || {}),
        },
        assetOpportunity: {
            registryEnabled: true,
            steam: { appId: '', depotId: '' },
            play: { applicationId: TC_BID },
            itch: { gameSlug: 'tc-show' },
            packs: [],
            ...(base.assetOpportunity || {}),
        },
    };
}

function ensureCreditEntries(draft, inventory) {
    const entries = { ...(draft.credits?.entries || {}) };
    const bundleId = draft.branding?.bundleId || TC_BID;

    const add = (id, label, kind, defaults = {}) => {
        if (!entries[id]) {
            entries[id] = {
                id,
                label,
                kind,
                author: defaults.author || draft.author || TC_AUTH,
                license: defaults.license || TC_LIC,
                source: defaults.source || '',
                storeSku: defaults.storeSku || '',
                registryUri: defaults.registryUri || '',
            };
        } else {
            if (defaults.author && !entries[id].author) entries[id].author = defaults.author;
            if (defaults.license && entries[id].license === 'All rights reserved') entries[id].license = defaults.license;
            if (defaults.source && !entries[id].source) entries[id].source = defaults.source;
            if (defaults.storeSku && !entries[id].storeSku) entries[id].storeSku = defaults.storeSku;
            if (defaults.registryUri && !entries[id].registryUri) entries[id].registryUri = defaults.registryUri;
        }
        entries[id].label = entries[id].label || label;
        entries[id].kind = entries[id].kind || kind;
        if (!entries[id].storeSku) entries[id].storeSku = suggestStoreSku(bundleId, entries[id]);
        if (!entries[id].registryUri) entries[id].registryUri = suggestRegistryUri(bundleId, entries[id]);
    };

    getTcLiteCredits().forEach((c) => add(c.id, c.label, c.kind, c));
    getTcVehCredits().forEach((c) => add(c.id, c.label, c.kind, c));
    getTcChrCredits().forEach((c) => add(c.id, c.label, c.kind, c));
    getTcSfxCredits().forEach((c) => add(c.id, c.label, c.kind, c));
    getTcShowCredits().forEach((c) => add(c.id, c.label, c.kind, c));
    getTcTexCredits().forEach((c) => add(c.id, c.label, c.kind, c));
    getTcIntroCredits().forEach((c) => add(c.id, c.label, c.kind, c));

    inventory.sceneObjects
        .filter((o) => o.isTC)
        .forEach((o) => add(o.id, o.name, o.assetKind || o.type, {
            author: o.author || TC_AUTH,
            license: o.license || TC_LIC,
            source: 'TC scene',
            storeSku: o.sku || '',
            registryUri: o.uri || '',
        }));

    inventory.soundRefs.forEach((s) => add(s.id, s.name, 'sound'));
    inventory.textureRefs.forEach((t) => add(t.id, t.name, 'texture'));
    inventory.models.forEach((m) => add(m.id || m.name, m.name, 'model'));
    inventory.videoRefs.forEach((v, i) => add(v.path || `video-${i}`, v.file || v.path, 'video'));
    return entries;
}

function buildKindPacks(draft, assets) {
    const bundleId = draft.branding?.bundleId || TC_BID;
    const packKinds = JSON.parse(fs.readFileSync(STORE_ASSETS_CONFIG, 'utf8')).packKinds || {};
    const byKind = {};
    assets.forEach((a) => {
        const kind = a.kind || 'asset';
        if (!byKind[kind]) byKind[kind] = [];
        byKind[kind].push(a);
    });

    return Object.entries(byKind).map(([kind, items]) => {
        const meta = packKinds[kind] || { label: `${kind} pack`, suffix: kind };
        const packId = `${kind}-pack`;
        return {
            id: packId,
            label: meta.label,
            kind,
            assetIds: items.map((i) => i.id),
            storeSku: `${bundleId.split('.').pop() || 'tc'}.${meta.suffix || kind}`,
            playSku: `${meta.suffix || kind}_pack`,
            steamDepotSubdir: `bundle/${meta.suffix || kind}/`,
            itchPackId: `${slugify(draft.name)}-${meta.suffix || kind}`,
        };
    });
}

function buildAssetRegistry(draft, inventory) {
    const storeAssetsConfig = JSON.parse(fs.readFileSync(STORE_ASSETS_CONFIG, 'utf8'));
    const entries = ensureCreditEntries(draft, inventory);
    const bundleId = draft.branding?.bundleId;
    const assets = Object.values(entries).map((entry) => ({
        ...entry,
        storeSku: entry.storeSku || null,
        registryUri: entry.registryUri || null,
    }));

    const mappedCount = assets.filter((a) => a.storeSku || a.registryUri).length;
    const packs = buildKindPacks(draft, assets);
    const enabled = !!draft.assetOpportunity?.registryEnabled;

    return {
        format: 'threshold-asset-registry',
        formatVersion: 2,
        game: draft.name,
        author: draft.author,
        bundleId,
        inventory: {
            objects: inventory.objectCount,
            sounds: inventory.soundRefs.length,
            textures: inventory.textureRefs.length,
            models: inventory.models.length,
            videos: inventory.videoRefs.length,
            hilodGroups: inventory.hilodGroups,
        },
        assets,
        branding: draft.branding,
        globalCredits: draft.credits?.global || '',
        storeAssets: {
            format: 'threshold-store-assets',
            version: 2,
            status: enabled && mappedCount > 0 ? 'mapped' : (enabled ? 'enabled' : 'scaffold'),
            mappedCount,
            platforms: storeAssetsConfig.platforms,
            opportunity: draft.assetOpportunity,
            packs,
            items: assets.map((a) => ({
                assetId: a.id,
                label: a.label,
                kind: a.kind,
                license: a.license,
                author: a.author,
                storeSku: a.storeSku,
                registryUri: a.registryUri,
                play: a.storeSku ? { sku: a.storeSku, productType: 'managed' } : null,
                steam: draft.assetOpportunity?.steam?.depotId
                    ? { depotId: draft.assetOpportunity.steam.depotId, depotPath: `bundle/${a.kind}/${assetSlug(a.label, a.id)}` }
                    : null,
                itch: a.storeSku ? { packId: `${slugify(draft.name)}-${a.kind}-${assetSlug(a.label, a.id)}` } : null,
            })),
        },
    };
}

function collectTcInventory() {
    const blenderMan = readJson('import/threshold_blender_manifest.json', { models: [] });
    const gimpMan = readJson('textures/threshold_manifest.json', { textures: [] });
    const videoMan = readJson('video/threshold_video_manifest.json', { videos: [] });

    const tcModels = (blenderMan.models || []).filter((m) => /^tc_/.test(m.id || ''));
    const tcTextures = (gimpMan.textures || []).filter((t) => /^tc_/.test(t.id || ''));
    const hilodGroups = tcTextures.filter((t) => (t.variants || []).length > 0).length;

    const sceneObjects = [
        ...getTcVehSpecs().map((s) => ({
            id: s.id, name: s.nm, type: 'gltf', assetKind: s.k, isTC: true,
            author: TC_AUTH, license: TC_LIC,
        })),
        ...getTcChrSpecs().map((s) => ({
            id: s.id, name: s.nm, type: 'human', assetKind: s.k, isTC: true,
            author: TC_AUTH, license: TC_LIC,
        })),
        { id: TC_IDS.span, name: 'TC Span', type: 'mesh', assetKind: 'scene', isTC: true, author: TC_AUTH, license: TC_LIC },
        { id: TC_IDS.cp, name: 'TC Checkpoint', type: 'prop', assetKind: 'scene', isTC: true, author: TC_AUTH, license: TC_LIC },
    ];

    return {
        objectCount: sceneObjects.length,
        sceneObjects,
        textureRefs: tcTextures.map((t) => ({
            id: t.id,
            name: t.objectName || t.id,
            path: t.path,
            kind: 'texture',
        })),
        soundRefs: getTcSfxSpecs().map((s) => ({ id: s.id, name: s.nm, kind: 'sound' })),
        models: tcModels.map((m) => ({
            id: m.id,
            name: m.objectName || m.id,
            path: m.path,
            kind: 'model',
        })),
        videoRefs: (videoMan.videos || [])
            .filter((v) => v.id === 'tc_intro' || /^tc_/.test(v.id || ''))
            .map((v) => ({ path: v.path, file: v.file, kind: 'video' })),
        hilodGroups,
    };
}

function buildTcManifest(options = {}) {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const draft = defaultExportDraft({
        name: options.name || 'TC Show',
        author: options.author || TC_AUTH,
        description: options.description
            || 'TC showcase — full EXPORT demo (veh+chr GLB+LOD, SFX, textures, intro cutscene).',
        store: options.store,
        targets: options.targets,
        assetOpportunity: options.assetOpportunity,
    });
    draft.branding.bundleId = options.bundleId || TC_BID;

    const inventory = collectTcInventory();
    const assetRegistry = buildAssetRegistry(draft, inventory);
    draft.credits.entries = assetRegistry.assets.reduce((acc, a) => {
        acc[a.id] = a;
        return acc;
    }, {});

    const blenderMan = readJson('import/threshold_blender_manifest.json', { models: [] });
    const gimpMan = readJson('textures/threshold_manifest.json', { textures: [] });
    const videoMan = readJson('video/threshold_video_manifest.json', { videos: [] });
    const lodDistances = readJson('config/lod-distances.json', { distances: [0, 12, 28] }).distances;

    return {
        format: 'threshold-game',
        formatVersion: 1,
        engineVersion: pkg.version,
        exportedAt: new Date().toISOString(),
        source: 'tc-export-manifest',
        tcEdition: 'tc-show',
        game: {
            name: draft.name,
            description: draft.description,
            author: draft.author,
        },
        branding: draft.branding,
        credits: draft.credits,
        assetRegistry,
        assetOpportunity: draft.assetOpportunity,
        store: draft.store,
        exportWalkthrough: {
            version: 2,
            docs: 'docs/EXPORT_WALKTHROUGH.md',
            storeAssetsDocs: 'docs/STORE_ASSETS.md',
            steps: ['info', 'branding', 'content', 'credits', 'review', 'targets', 'store', 'packs', 'package'],
        },
        targets: draft.targets,
        videos: (videoMan.videos || []).filter((v) => v.id === 'tc_intro'),
        textures: (gimpMan.textures || []).filter((t) => /^tc_/.test(t.id || '')),
        models: (blenderMan.models || [])
            .filter((m) => /^tc_/.test(m.id || ''))
            .map((m) => ({
                objectName: m.objectName,
                gltfFile: m.file,
                gltfPath: m.path,
                lods: m.lods || [],
                lodDistances: m.lodDistances || lodDistances,
                hasPhysics: !!m.hasPhysics,
                tcEd: m.tcEd,
                realism: m.realism,
            })),
        bundle: {
            dir: 'dist-pages/bundle/',
            dirs: ['textures', 'import', 'video'],
            index: 'bundle/bundle-index.json',
            note: 'npm run bundle:assets copies textures/ + import/ + video/ into native/web builds',
        },
        packaging: {
            webRoot: 'dist-pages/',
            entry: 'index.html',
            capacitor: { webDir: 'dist-pages', appId: draft.branding.bundleId, appName: draft.name },
            electron: { main: 'electron/main.cjs', preload: 'electron/preload.cjs' },
            android: {
                packageName: draft.branding.bundleId,
                appName: draft.name,
                cli: 'npm run package:android',
                releaseCli: 'npm run package:android:release',
            },
            storeRelease: {
                prepCli: 'npm run store:prep -- --manifest exports/tc-show.threshold-game.json',
                assetsCli: 'npm run store:assets -- --manifest exports/tc-show.threshold-game.json',
                docs: 'docs/STORE_RELEASE.md',
            },
        },
        ship: {
            cli: 'npm run tc:ship',
            verifyCli: 'npm run tc:ship:verify',
            manifestPath: 'exports/tc-show.threshold-game.json',
        },
    };
}

module.exports = {
    ROOT,
    TC_BID,
    slugify,
    buildTcManifest,
    collectTcInventory,
    defaultExportDraft,
};