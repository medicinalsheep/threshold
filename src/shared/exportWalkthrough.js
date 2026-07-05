import { SoundLibrary } from './soundLibrary.js';
import { TextureLibrary } from './textureLibrary.js';
import { TextureHilod } from './textureHilod.js';
import { getTcLiteCredits } from './tcLite.js';
import { getTcVehCredits } from './tcVeh.js';
import { getTcChrCredits } from './tcChr.js';
import { getTcSfxCredits } from './tcSfx.js';
import { getTcShowCredits } from './tcShow.js';
import storeAssetsConfig from '../../config/store-assets.json';


export const EXPORT_STEPS = ['info', 'branding', 'content', 'credits', 'review', 'targets', 'store', 'packs', 'package'];

export const EXPORT_STEP_LABELS = ['INFO', 'ICONS', 'SCENE', 'CREDITS', 'REVIEW', 'TARGETS', 'STORE', 'PACKS', 'SHIP'];

const PACK_KINDS = storeAssetsConfig.packKinds || {};

const DEFAULT_BRANDING = {
    bundleId: 'com.threshold.game',
    iconPath: 'icons/appicon512.png',
    iconCustomized: false,
    checklist: {
        replacedAppIcon: false,
        ranBuildIcons: false,
        ranCapAssets: false,
    },
};

const DEFAULT_STORE = {
    contactEmail: '',
    supportUrl: '',
    privacyPolicyUrl: '',
};

const DEFAULT_ASSET_OPPORTUNITY = {
    registryEnabled: false,
    steam: { appId: '', depotId: '' },
    play: { applicationId: '' },
    itch: { gameSlug: '' },
    packs: [],
};

export function defaultExportDraft(base = {}) {
    return {
        name: base.name || 'My Threshold Game',
        author: base.author || '',
        description: base.description || '',
        includeSoundBlobs: false,
        targets: { web: true, android: true, windows: true, ios: false, steam: false },
        branding: { ...DEFAULT_BRANDING, ...(base.branding || {}) },
        credits: {
            global: base.credits?.global || '',
            entries: { ...(base.credits?.entries || {}) },
        },
        store: { ...DEFAULT_STORE, ...(base.store || {}) },
        assetOpportunity: {
            ...DEFAULT_ASSET_OPPORTUNITY,
            ...(base.assetOpportunity || {}),
            steam: { ...DEFAULT_ASSET_OPPORTUNITY.steam, ...(base.assetOpportunity?.steam || {}) },
            play: { ...DEFAULT_ASSET_OPPORTUNITY.play, ...(base.assetOpportunity?.play || {}) },
            itch: { ...DEFAULT_ASSET_OPPORTUNITY.itch, ...(base.assetOpportunity?.itch || {}) },
        },
    };
}

function slugify(name = '') {
    return String(name).replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'game';
}

function assetSlug(label = '', id = '') {
    return slugify(label || id).replace(/-/g, '_').slice(0, 32) || 'asset';
}

function bundleIdFromName(name = '') {
    const slug = slugify(name).replace(/-/g, '');
    return `com.${slug.slice(0, 24) || 'threshold'}.game`;
}

export function suggestStoreSku(bundleId, entry) {
    const base = (bundleId || 'com.threshold.game').split('.').pop() || 'game';
    const kind = entry.kind || 'asset';
    const slug = assetSlug(entry.label, entry.id);
    return `${base}.${kind}.${slug}`;
}

export function suggestRegistryUri(bundleId, entry) {
    const slug = assetSlug(entry.label, entry.id);
    return `threshold://${bundleId || 'com.threshold.game'}/asset/${slug}`;
}

export function collectContentInventory() {
    const State = window.State;
    const objects = State?.objects || [];
    const sounds = SoundLibrary.list();
    const textures = TextureLibrary.list();

    const sceneObjects = objects
        .filter((o) => !o.userData?.isPlayer)
        .map((o) => ({
            id: o.userData?.id || o.uuid,
            name: o.userData?.name || 'Object',
            type: o.userData?.type || 'mesh',
            assetKind: o.userData?.assetKind || o.userData?.type || 'mesh',
            hasTextures: !!o.userData?.textures,
            textureHint: o.userData?.textureHint || null,
            gltfPath: o.userData?.gltfPath || null,
            soundClipId: o.userData?.soundClipId || null,
            isTC: !!(o.userData?.isTC || o.userData?.isThresholdChild),
            tcEd: o.userData?.tcEd || o.userData?.childEdition || null,
            license: o.userData?.license || null,
            author: o.userData?.author || null,
            sku: o.userData?.storeSku || null,
            uri: o.userData?.registryUri || null,
        }));

    const textureRefs = textures.map((t) => ({
        id: t.id,
        name: t.name,
        path: t.sourcePath || t.name,
        kind: 'texture',
    }));

    const soundRefs = sounds.map((s) => ({
        id: s.id,
        name: s.name,
        context: s.context || '',
        kind: 'sound',
    }));

    const models = objects
        .filter((o) => o.userData?.type === 'gltf')
        .map((o) => ({
            id: o.userData?.id,
            name: o.userData?.name,
            path: o.userData?.gltfPath || o.userData?.gltfFile,
            lodCount: o.userData?.lodPaths?.length || 1,
            kind: 'model',
        }));

    const hilod = TextureHilod.collectExportEntries(objects);
    const videoRefs = (State?.cinematicCatalog || []).map((v) => ({
        path: v.path,
        file: v.file,
        kind: 'video',
    }));

    return {
        objectCount: sceneObjects.length,
        sceneObjects,
        textureRefs,
        soundRefs,
        models,
        hilodGroups: hilod.length,
        videoRefs,
        scripts: {
            hasRunning: !!(window.Runtime?.runningCode),
            hasProject: !!(window.ProjectVault?.captureCurrent?.()?.scriptInput),
        },
    };
}

export function ensureCreditEntries(draft, inventory) {
    const entries = { ...(draft.credits?.entries || {}) };
    const bundleId = draft.branding?.bundleId || 'com.threshold.game';

    const add = (id, label, kind, defaults = {}) => {
        if (!entries[id]) {
            entries[id] = {
                id,
                label,
                kind,
                author: defaults.author || draft.author || '',
                license: defaults.license || 'All rights reserved',
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
        if (entries[id].storeSku === undefined) entries[id].storeSku = '';
        if (entries[id].registryUri === undefined) entries[id].registryUri = '';
        if (!entries[id].storeSku) entries[id].storeSku = suggestStoreSku(bundleId, entries[id]);
        if (!entries[id].registryUri) entries[id].registryUri = suggestRegistryUri(bundleId, entries[id]);
    };

    getTcLiteCredits().forEach((c) => add(c.id, c.label, c.kind, c));
    getTcVehCredits().forEach((c) => add(c.id, c.label, c.kind, c));
    getTcChrCredits().forEach((c) => add(c.id, c.label, c.kind, c));
    getTcSfxCredits().forEach((c) => add(c.id, c.label, c.kind, c));
    getTcShowCredits().forEach((c) => add(c.id, c.label, c.kind, c));

    inventory.sceneObjects
        .filter((o) => o.isTC)
        .forEach((o) => add(o.id, o.name, o.assetKind || o.type, {
            author: o.author || 'Threshold',
            license: o.license || 'Original — TC',
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

export function buildKindPacks(draft, assets) {
    const bundleId = draft.branding?.bundleId || 'com.threshold.game';
    const byKind = {};
    assets.forEach((a) => {
        const kind = a.kind || 'asset';
        if (!byKind[kind]) byKind[kind] = [];
        byKind[kind].push(a);
    });

    return Object.entries(byKind).map(([kind, items]) => {
        const meta = PACK_KINDS[kind] || { label: `${kind} pack`, suffix: kind };
        const packId = `${kind}-pack`;
        return {
            id: packId,
            label: meta.label,
            kind,
            assetIds: items.map((i) => i.id),
            storeSku: `${bundleId.split('.').pop() || 'game'}.${meta.suffix || kind}`,
            playSku: `${meta.suffix || kind}_pack`,
            steamDepotSubdir: `bundle/${meta.suffix || kind}/`,
            itchPackId: `${slugify(draft.name)}-${meta.suffix || kind}`,
        };
    });
}

export function buildAssetRegistry(draft, inventory) {
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

export function validateStep(stepId, draft, inventory) {
    const warnings = [];
    const blockers = [];

    if (stepId === 'info') {
        if (!draft.name?.trim()) blockers.push('Game name is required');
        if (!draft.author?.trim()) warnings.push('Author name helps store listings and credits');
    }

    if (stepId === 'branding') {
        if (!draft.branding?.bundleId?.includes('.')) blockers.push('Bundle ID should look like com.you.game');
        const chk = draft.branding?.checklist || {};
        if (!chk.replacedAppIcon && draft.branding?.iconCustomized) {
            warnings.push('Confirm custom icon replaced in icons/appicon512.png');
        }
        if (draft.targets?.android || draft.targets?.ios) {
            if (!chk.ranCapAssets) warnings.push('Run npm run cap:assets after replacing appicon512.png');
        }
        if (draft.targets?.windows && !chk.ranBuildIcons) {
            warnings.push('Run npm run build:icons for Windows Electron icon');
        }
    }

    if (stepId === 'credits') {
        const entries = draft.credits?.entries || {};
        const missingLicense = Object.values(entries).filter((e) => !e.license?.trim());
        if (missingLicense.length) warnings.push(`${missingLicense.length} asset(s) missing license text`);
    }

    if (stepId === 'store') {
        if ((draft.targets?.android || draft.targets?.ios) && !draft.store?.contactEmail?.includes('@')) {
            warnings.push('Contact email recommended for Play/App Store privacy policy');
        }
    }

    if (stepId === 'targets') {
        if (draft.targets?.steam && !draft.assetOpportunity?.steam?.appId?.trim()) {
            warnings.push('Steam target selected — set App ID in PACKS step (or enable after PACKS)');
        }
    }

    if (stepId === 'packs') {
        if (draft.assetOpportunity?.registryEnabled) {
            const entries = Object.values(draft.credits?.entries || {});
            const unmapped = entries.filter((e) => !e.storeSku?.trim() && !e.registryUri?.trim());
            if (unmapped.length === entries.length && entries.length) {
                warnings.push('Enable mapping but no SKUs set — use Suggest SKUs or fill manually');
            }
            if (draft.targets?.windows && !draft.assetOpportunity?.steam?.appId?.trim()) {
                warnings.push('Steam App ID recommended when targeting Windows / Steam depot');
            }
        }
    }

    return { warnings, blockers, ok: blockers.length === 0 };
}

export function suggestBundleId(gameName) {
    return bundleIdFromName(gameName);
}

export function suggestAllStoreLinks(draft) {
    const bundleId = draft.branding?.bundleId || suggestBundleId(draft.name);
    const entries = { ...(draft.credits?.entries || {}) };
    Object.values(entries).forEach((entry) => {
        if (!entry.storeSku?.trim()) entry.storeSku = suggestStoreSku(bundleId, entry);
        if (!entry.registryUri?.trim()) entry.registryUri = suggestRegistryUri(bundleId, entry);
    });
    draft.credits.entries = entries;
    draft.assetOpportunity.play.applicationId = bundleId;
    draft.assetOpportunity.itch.gameSlug = slugify(draft.name);
    return draft;
}

window.ExportWalkthrough = {
    EXPORT_STEPS,
    EXPORT_STEP_LABELS,
    defaultExportDraft,
    collectContentInventory,
    buildAssetRegistry,
    buildKindPacks,
    validateStep,
    suggestBundleId,
    suggestStoreSku,
    suggestRegistryUri,
    suggestAllStoreLinks,
};