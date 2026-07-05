import { SoundLibrary } from './soundLibrary.js';
import { TextureLibrary } from './textureLibrary.js';
import { TextureHilod } from './textureHilod.js';


export const EXPORT_STEPS = ['info', 'branding', 'content', 'credits', 'review', 'targets', 'store', 'package'];

export const EXPORT_STEP_LABELS = ['INFO', 'ICONS', 'SCENE', 'CREDITS', 'REVIEW', 'TARGETS', 'STORE', 'SHIP'];

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

export function defaultExportDraft(base = {}) {
    return {
        name: base.name || 'My Threshold Game',
        author: base.author || '',
        description: base.description || '',
        includeSoundBlobs: false,
        targets: { web: true, android: true, windows: true, ios: false },
        branding: { ...DEFAULT_BRANDING, ...(base.branding || {}) },
        credits: {
            global: base.credits?.global || '',
            entries: { ...(base.credits?.entries || {}) },
        },
        store: { ...DEFAULT_STORE, ...(base.store || {}) },
        assetOpportunity: {
            registryEnabled: false,
            note: 'Future: link authored assets to store SKUs / collectible registry',
            ...(base.assetOpportunity || {}),
        },
    };
}

function slugify(name = '') {
    return String(name).replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'game';
}

function bundleIdFromName(name = '') {
    const slug = slugify(name).replace(/-/g, '');
    return `com.${slug.slice(0, 24) || 'threshold'}.game`;
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
            hasTextures: !!o.userData?.textures,
            textureHint: o.userData?.textureHint || null,
            gltfPath: o.userData?.gltfPath || null,
            soundClipId: o.userData?.soundClipId || null,
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
    const add = (id, label, kind) => {
        if (!entries[id]) {
            entries[id] = { id, label, kind, author: draft.author || '', license: 'All rights reserved', source: '' };
        }
    };
    inventory.soundRefs.forEach((s) => add(s.id, s.name, 'sound'));
    inventory.textureRefs.forEach((t) => add(t.id, t.name, 'texture'));
    inventory.models.forEach((m) => add(m.id || m.name, m.name, 'model'));
    inventory.videoRefs.forEach((v, i) => add(v.path || `video-${i}`, v.file || v.path, 'video'));
    return entries;
}

export function buildAssetRegistry(draft, inventory) {
    const entries = ensureCreditEntries(draft, inventory);
    const assets = Object.values(entries).map((entry) => ({
        ...entry,
        storeSku: null,
        registryUri: null,
    }));

    return {
        format: 'threshold-asset-registry',
        formatVersion: 1,
        game: draft.name,
        author: draft.author,
        bundleId: draft.branding?.bundleId,
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
            version: 1,
            status: 'scaffold',
            note: draft.assetOpportunity?.note,
            opportunity: 'Tie authored GIMP/Blender/sound/scene assets to store listings and future collectible registry',
            items: assets.map((a) => ({
                assetId: a.id,
                label: a.label,
                kind: a.kind,
                license: a.license,
                author: a.author,
                storeSku: a.storeSku,
                registryUri: a.registryUri,
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

    return { warnings, blockers, ok: blockers.length === 0 };
}

export function suggestBundleId(gameName) {
    return bundleIdFromName(gameName);
}

window.ExportWalkthrough = {
    EXPORT_STEPS,
    EXPORT_STEP_LABELS,
    defaultExportDraft,
    collectContentInventory,
    buildAssetRegistry,
    validateStep,
    suggestBundleId,
};