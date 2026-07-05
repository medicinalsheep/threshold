/**
 * Phase J — targeted graphics export helpers (Node CLI)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROFILES_PATH = path.join(ROOT, 'config', 'graphics-export-profiles.json');
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const MODEL_EXT = /\.(glb|gltf)$/i;
const HILOD_RE = /_(512|1k|2k|4k)(\.[^.]+)$/i;

const TIER_PRESETS = {
    compatibility: {
        tier: 'compatibility',
        renderMode: 0,
        env: { waterEnabled: false, atmosphereEnabled: false, fogDensity: 0.022 },
        physicsIterations: 8,
        pixelRatioCap: 1,
        shadowMapSize: 1024,
    },
    balanced: {
        tier: 'balanced',
        renderMode: 3,
        env: { waterEnabled: false, atmosphereEnabled: true, fogDensity: 0.018 },
        physicsIterations: 12,
        pixelRatioCap: 1.5,
        shadowMapSize: 2048,
    },
    realistic: {
        tier: 'realistic',
        renderMode: 4,
        env: { waterEnabled: true, atmosphereEnabled: true, fogDensity: 0.015 },
        physicsIterations: 15,
        pixelRatioCap: null,
        shadowMapSize: 2048,
    },
    ultra: {
        tier: 'ultra',
        renderMode: 4,
        env: { waterEnabled: true, atmosphereEnabled: true, fogDensity: 0.012 },
        physicsIterations: 20,
        pixelRatioCap: 2,
        shadowMapSize: 4096,
    },
};

function loadConfig() {
    return JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
}

function listProfiles() {
    const cfg = loadConfig();
    return Object.entries(cfg.profiles).map(([id, p]) => ({ id, ...p }));
}

function getProfile(profileId) {
    const cfg = loadConfig();
    const profile = cfg.profiles[profileId];
    if (!profile) {
        throw new Error(`Unknown profile "${profileId}". Valid: ${Object.keys(cfg.profiles).join(', ')}`);
    }
    return { id: profileId, ...profile };
}

function getTierPreset(tierId) {
    return TIER_PRESETS[tierId] || TIER_PRESETS.balanced;
}

function preferenceOrder(textureMax, cfg) {
    const key = String(textureMax);
    if (cfg.textureMaxPreference?.[key]) return cfg.textureMaxPreference[key];
    if (textureMax <= 512) return ['_512', ''];
    if (textureMax <= 1024) return ['_1k', '_512', ''];
    if (textureMax <= 2048) return ['_2k', '_1k', ''];
    return ['_4k', '_2k', '_1k', ''];
}

function textureBaseKey(fileName) {
    return fileName.replace(HILOD_RE, '$2');
}

function hasHilodSuffix(fileName) {
    return HILOD_RE.test(fileName);
}

function variantSuffix(fileName) {
    const m = fileName.match(/_(512|1k|2k|4k)(\.[^.]+)$/i);
    return m ? `_${m[1].toLowerCase()}` : '';
}

function selectTextureFiles(fileNames, textureMax) {
    const cfg = loadConfig();
    const order = preferenceOrder(textureMax, cfg);
    const groups = new Map();

    fileNames.filter((f) => IMAGE_EXT.test(f)).forEach((file) => {
        const base = textureBaseKey(file);
        if (!groups.has(base)) groups.set(base, []);
        groups.get(base).push(file);
    });

    const selected = [];
    const skipped = [];

    for (const [base, variants] of groups) {
        let pick = null;
        for (const suf of order) {
            if (suf === '') {
                pick = variants.find((v) => !hasHilodSuffix(v));
            } else {
                pick = variants.find((v) => variantSuffix(v) === suf);
            }
            if (pick) break;
        }
        if (!pick) pick = variants[0];
        selected.push(pick);
        variants.filter((v) => v !== pick).forEach((v) => skipped.push(v));
    }

    return { selected, skipped, groups: groups.size };
}

function collectDirFiles(dirPath, relBase = dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    const out = [];
    for (const entry of fs.readdirSync(dirPath)) {
        const full = path.join(dirPath, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            out.push(...collectDirFiles(full, relBase));
        } else {
            out.push(path.relative(relBase, full).replace(/\\/g, '/'));
        }
    }
    return out;
}

function resolveSourceDirs() {
    const dirs = [];
    const bundle = path.join(ROOT, 'dist-pages', 'bundle');
    const textures = path.join(ROOT, 'textures');
    const importDir = path.join(ROOT, 'import');
    if (fs.existsSync(path.join(bundle, 'textures'))) {
        dirs.textures = path.join(bundle, 'textures');
    } else if (fs.existsSync(textures)) {
        dirs.textures = textures;
    }
    if (fs.existsSync(path.join(bundle, 'import'))) {
        dirs.import = path.join(bundle, 'import');
    } else if (fs.existsSync(importDir)) {
        dirs.import = importDir;
    }
    return dirs;
}

function copyFile(src, dest) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
}

function filterGimpManifest(manifestPath, selectedTextureFiles) {
    if (!fs.existsSync(manifestPath)) return null;
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const selected = new Set(selectedTextureFiles.map((f) => path.basename(f)));
    if (Array.isArray(data.textures)) {
        data.textures = data.textures.filter((entry) => {
            const file = entry.file || path.basename(entry.path || '');
            return selected.has(file);
        });
    }
    data.graphicsProfile = data.graphicsProfile || {};
    return data;
}

function buildGraphicsBlock(profile, tierPreset) {
    return {
        profile: profile.id,
        label: profile.label,
        tier: profile.tier,
        textureMax: profile.textureMax,
        renderMode: tierPreset.renderMode,
        env: { ...tierPreset.env },
        physicsIterations: tierPreset.physicsIterations,
        pixelRatioCap: tierPreset.pixelRatioCap,
        shadowMapSize: tierPreset.shadowMapSize,
        exportCli: `npm run export:graphics -- --profile ${profile.id}`,
    };
}

function sliceGameManifest(gameManifest, profile, graphicsBlock, textureEntries) {
    const sliced = {
        ...gameManifest,
        format: gameManifest.format || 'threshold-game',
        engineVersion: gameManifest.engineVersion,
        exportedAt: new Date().toISOString(),
        graphics: {
            ...(gameManifest.graphics || {}),
            ...graphicsBlock,
            profiles: loadConfig().profiles,
            activeProfile: profile.id,
        },
        textures: textureEntries,
        packaging: {
            ...(gameManifest.packaging || {}),
            activeTarget: profile.id,
            note: `Targeted export for ${profile.label} — run ${profile.packageScript || 'native package CLI'}`,
        },
    };
    if (gameManifest.world?.graphics) {
        sliced.world = {
            ...gameManifest.world,
            graphics: graphicsBlock,
        };
    } else if (gameManifest.world) {
        sliced.world = {
            ...gameManifest.world,
            graphics: graphicsBlock,
        };
    }
    return sliced;
}

function buildExportManifest(profile, options = {}) {
    const tierPreset = getTierPreset(profile.tier);
    const graphicsBlock = buildGraphicsBlock(profile, tierPreset);
    return {
        format: 'threshold-graphics-export',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        profile: profile.id,
        profileLabel: profile.label,
        sourceManifest: options.sourceManifest || null,
        graphics: graphicsBlock,
        bundle: options.bundle || { root: 'bundle/', files: {} },
        textures: options.textureEntries || [],
        notes: profile.notes,
        nextStep: profile.packageScript
            ? `npm run ${profile.packageScript}`
            : 'Deploy dist-export bundle to static host',
    };
}

module.exports = {
    ROOT,
    loadConfig,
    listProfiles,
    getProfile,
    getTierPreset,
    selectTextureFiles,
    collectDirFiles,
    resolveSourceDirs,
    copyFile,
    filterGimpManifest,
    buildGraphicsBlock,
    sliceGameManifest,
    buildExportManifest,
    IMAGE_EXT,
    MODEL_EXT,
};