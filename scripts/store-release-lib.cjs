/**
 * Phase L — store release helpers
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STORE_CONFIG_PATH = path.join(ROOT, 'config', 'store-release.json');
const TEMPLATE_DIR = path.join(ROOT, 'docs', 'templates');
const NATIVE_APP_PATH = path.join(ROOT, 'config', 'native-app.json');
const CAPACITOR_CONFIG = path.join(ROOT, 'capacitor.config.json');
const PKG_PATH = path.join(ROOT, 'package.json');
const STORE_ASSETS_CONFIG = path.join(ROOT, 'config', 'store-assets.json');

function loadStoreConfig() {
    return JSON.parse(fs.readFileSync(STORE_CONFIG_PATH, 'utf8'));
}

function loadManifest(manifestPath) {
    const resolved = path.resolve(ROOT, manifestPath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`Manifest not found: ${resolved}`);
    }
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function slugify(name = '') {
    return String(name).replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'game';
}

function fillTemplate(template, vars) {
    let out = template;
    Object.entries(vars).forEach(([key, value]) => {
        out = out.split(`{{${key}}}`).join(String(value ?? ''));
    });
    return out;
}

function manifestVars(manifest, options = {}) {
    const game = manifest.game || {};
    const packaging = manifest.packaging || {};
    const branding = manifest.branding || {};
    const store = manifest.store || packaging.store || {};
    const name = game.name || 'Threshold Game';
    const author = game.author || 'Creator';
    const bundleId = branding.bundleId
        || packaging.ios?.bundleId
        || packaging.capacitor?.appId
        || options.bundleId
        || 'com.threshold.game';
    const slug = slugify(name);
    return {
        GAME_NAME: name,
        AUTHOR: author,
        DESCRIPTION: game.description || `${name} — a Threshold creative world.`,
        DATE: new Date().toISOString().slice(0, 10),
        YEAR: new Date().getFullYear(),
        BUNDLE_ID: bundleId,
        PACKAGE_NAME: bundleId,
        SKU: `${slug}-${Date.now().toString(36).slice(-4)}`,
        CONTACT_EMAIL: options.contactEmail || store.contactEmail || 'support@example.com',
        SUPPORT_URL: options.supportUrl || store.supportUrl || 'https://example.com/support',
        PRIVACY_POLICY_URL: options.privacyPolicyUrl || store.privacyPolicyUrl || `https://example.com/${slug}/privacy`,
    };
}

function resolveTargets(manifest, cliTargets = null) {
    const t = cliTargets || manifest.targets || {};
    return {
        android: !!t.android,
        ios: !!t.ios,
        windows: t.windows !== false,
        macos: !!t.macos,
        steam: !!t.steam,
        web: t.web !== false,
    };
}

function applyNativeAppConfig(manifest, options = {}) {
    const vars = manifestVars(manifest, options);
    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
    const nativeApp = {
        format: 'threshold-native-app',
        appliedAt: new Date().toISOString(),
        sourceManifest: options.sourceManifest || null,
        appId: vars.BUNDLE_ID,
        appName: vars.GAME_NAME,
        version: pkg.version,
        author: vars.AUTHOR,
    };
    fs.mkdirSync(path.dirname(NATIVE_APP_PATH), { recursive: true });
    fs.writeFileSync(NATIVE_APP_PATH, JSON.stringify(nativeApp, null, 2));

    if (fs.existsSync(CAPACITOR_CONFIG)) {
        const cap = JSON.parse(fs.readFileSync(CAPACITOR_CONFIG, 'utf8'));
        cap.appId = vars.BUNDLE_ID;
        cap.appName = vars.GAME_NAME;
        fs.writeFileSync(CAPACITOR_CONFIG, JSON.stringify(cap, null, 2));
    }

    return nativeApp;
}

function generateStoreBundle(manifest, options = {}) {
    const vars = manifestVars(manifest, options);
    const slug = slugify(vars.GAME_NAME);
    const outDir = path.resolve(ROOT, options.out || path.join('dist-store', slug));
    fs.mkdirSync(outDir, { recursive: true });

    const privacyTpl = fs.readFileSync(path.join(TEMPLATE_DIR, 'privacy-policy.template.md'), 'utf8');
    fs.writeFileSync(path.join(outDir, 'privacy-policy.md'), fillTemplate(privacyTpl, vars));

    const appStoreTpl = fs.readFileSync(path.join(TEMPLATE_DIR, 'app-store-metadata.template.json'), 'utf8');
    const playTpl = fs.readFileSync(path.join(TEMPLATE_DIR, 'play-console-metadata.template.json'), 'utf8');

    const appStoreMeta = JSON.parse(fillTemplate(appStoreTpl, vars));
    const playMeta = JSON.parse(fillTemplate(playTpl, vars));

    fs.writeFileSync(path.join(outDir, 'app-store-metadata.json'), JSON.stringify(appStoreMeta, null, 2));
    fs.writeFileSync(path.join(outDir, 'play-console-metadata.json'), JSON.stringify(playMeta, null, 2));

    if (manifest.assetRegistry) {
        fs.writeFileSync(
            path.join(outDir, 'asset-registry.json'),
            JSON.stringify(manifest.assetRegistry, null, 2)
        );
    }

    const creditsMd = buildCreditsMarkdown(manifest, vars);
    fs.writeFileSync(path.join(outDir, 'credits.md'), creditsMd);

    const assetMaps = generateStoreAssetMaps(manifest, vars, outDir);

    const storeCfg = loadStoreConfig();
    const targets = resolveTargets(manifest, options.targets);
    const checklist = {};
    Object.entries(storeCfg.targets).forEach(([id, target]) => {
        if (targets[id]) checklist[id] = target;
    });

    const relOut = path.relative(ROOT, outDir).replace(/\\/g, '/');
    const prep = {
        format: 'threshold-store-prep',
        preparedAt: new Date().toISOString(),
        game: vars.GAME_NAME,
        bundleId: vars.BUNDLE_ID,
        engineVersion: manifest.engineVersion,
        outDir: relOut,
        targets,
        checklist,
        privacyPolicy: `${relOut}/privacy-policy.md`,
        credits: `${relOut}/credits.md`,
        assetRegistry: manifest.assetRegistry ? `${relOut}/asset-registry.json` : null,
        storeAssets: assetMaps.summary,
        manifestCredits: Object.keys(manifest.credits?.entries || {}).length,
        nextSteps: buildNextSteps(targets, storeCfg, assetMaps.summary),
    };
    fs.writeFileSync(path.join(outDir, 'store-prep.json'), JSON.stringify(prep, null, 2));
    return prep;
}

function buildCreditsMarkdown(manifest, vars) {
    const lines = [
        `# Credits — ${vars.GAME_NAME}`,
        '',
        `**Author:** ${vars.AUTHOR}`,
        '',
    ];
    if (manifest.credits?.global) {
        lines.push(manifest.credits.global, '');
    }
    const entries = Object.values(manifest.credits?.entries || {});
    if (entries.length) {
        lines.push('## Assets', '');
        entries.forEach((e) => {
            lines.push(`### ${e.label || e.id} (${e.kind || 'asset'})`);
            lines.push(`- **License:** ${e.license || 'All rights reserved'}`);
            lines.push(`- **Rights holder:** ${e.author || vars.AUTHOR}`);
            if (e.source) lines.push(`- **Source:** ${e.source}`);
            lines.push('');
        });
    }
    lines.push('---', '', `Generated by Threshold store:prep · ${vars.DATE}`);
    return lines.join('\n');
}

function loadStoreAssetsConfig() {
    return JSON.parse(fs.readFileSync(STORE_ASSETS_CONFIG, 'utf8'));
}

function getRegistryItems(manifest) {
    const registry = manifest.assetRegistry || {};
    const fromStore = registry.storeAssets?.items || [];
    if (fromStore.length) return fromStore;
    const entries = Object.values(manifest.credits?.entries || {});
    return entries.map((e) => ({
        assetId: e.id,
        label: e.label,
        kind: e.kind,
        license: e.license,
        author: e.author,
        storeSku: e.storeSku || null,
        registryUri: e.registryUri || null,
    }));
}

function assetSlug(label = '', id = '') {
    return slugify(label || id).replace(/-/g, '_').slice(0, 32) || 'asset';
}

function getOpportunity(manifest) {
    return manifest.assetOpportunity
        || manifest.assetRegistry?.storeAssets?.opportunity
        || {};
}

function buildPlayInAppProducts(manifest, vars) {
    const items = getRegistryItems(manifest).filter((i) => i.storeSku);
    const packs = manifest.assetRegistry?.storeAssets?.packs || [];
    const opportunity = getOpportunity(manifest);
    const products = items.map((i) => ({
        sku: i.storeSku,
        type: i.play?.productType || 'managed',
        title: i.label,
        description: `${i.label} (${i.kind}) for ${vars.GAME_NAME}`,
        assetId: i.assetId,
        kind: i.kind,
    }));
    packs.forEach((p) => {
        if (!p.storeSku) return;
        products.push({
            sku: p.playSku || p.storeSku,
            type: 'managed',
            title: p.label,
            description: `${p.label} — ${p.assetIds?.length || 0} assets`,
            packId: p.id,
            kind: p.kind,
            assetIds: p.assetIds,
        });
    });
    return {
        format: 'threshold-play-iap',
        version: 1,
        packageName: vars.BUNDLE_ID,
        applicationId: opportunity.play?.applicationId || vars.BUNDLE_ID,
        products,
        note: 'Play Console → Monetize → Products — create matching SKUs',
    };
}

function buildSteamDepotAssets(manifest, vars) {
    const items = getRegistryItems(manifest);
    const opportunity = getOpportunity(manifest);
    const steam = opportunity.steam || manifest.packaging?.steam || {};
    const packs = manifest.assetRegistry?.storeAssets?.packs || [];
    return {
        format: 'threshold-steam-depot',
        version: 1,
        appId: steam.appId || null,
        depotId: steam.depotId || null,
        depotRoot: 'dist-pages/bundle/',
        graphicsProfile: 'steam',
        files: items.map((i) => ({
            assetId: i.assetId,
            label: i.label,
            kind: i.kind,
            depotPath: `bundle/${i.kind}/${assetSlug(i.label, i.assetId)}`,
            storeSku: i.storeSku,
            registryUri: i.registryUri,
        })),
        packs: packs.map((p) => ({
            id: p.id,
            label: p.label,
            steamDepotSubdir: p.steamDepotSubdir,
            assetIds: p.assetIds,
            storeSku: p.storeSku,
        })),
        note: 'Use export:graphics --profile steam then upload bundle/ via steamcmd / ContentBuilder',
    };
}

function buildItchAssetPacks(manifest, vars) {
    const opportunity = getOpportunity(manifest);
    const gameSlug = opportunity.itch?.gameSlug || slugify(vars.GAME_NAME);
    const packs = manifest.assetRegistry?.storeAssets?.packs || [];
    const items = getRegistryItems(manifest).filter((i) => i.storeSku);
    return {
        format: 'threshold-itch-packs',
        version: 1,
        gameSlug,
        baseGame: {
            title: vars.GAME_NAME,
            author: vars.AUTHOR,
            artifact: 'dist-electron/*.exe or dist-pages zip',
        },
        packs: packs.map((p) => ({
            id: p.itchPackId || p.id,
            label: p.label,
            kind: p.kind,
            suggestedPriceUsd: null,
            assetIds: p.assetIds,
            storeSku: p.storeSku,
        })),
        individualAssets: items.map((i) => ({
            assetId: i.assetId,
            label: i.label,
            itchFileId: i.itch?.packId || `${gameSlug}-${i.kind}-${assetSlug(i.label, i.assetId)}`,
            storeSku: i.storeSku,
        })),
        note: 'itch.io → Edit project → Upload DLC files or separate downloads per pack',
    };
}

function buildCollectibleRegistry(manifest, vars) {
    const items = getRegistryItems(manifest).filter((i) => i.registryUri);
    const opportunity = getOpportunity(manifest);
    return {
        format: 'threshold-collectible-registry',
        version: 1,
        game: vars.GAME_NAME,
        bundleId: vars.BUNDLE_ID,
        registryRoot: `threshold://${vars.BUNDLE_ID}`,
        enabled: !!opportunity.registryEnabled,
        items: items.map((i) => ({
            assetId: i.assetId,
            uri: i.registryUri,
            label: i.label,
            kind: i.kind,
            license: i.license,
            author: i.author,
            storeSku: i.storeSku,
        })),
        note: 'Optional collectible / metadata registry — IPFS, on-chain, or threshold:// URIs',
    };
}

function generateStoreAssetMaps(manifest, vars, outDir) {
    const cfg = loadStoreAssetsConfig();
    const platforms = cfg.platforms || {};
    const play = buildPlayInAppProducts(manifest, vars);
    const steam = buildSteamDepotAssets(manifest, vars);
    const itch = buildItchAssetPacks(manifest, vars);
    const registry = buildCollectibleRegistry(manifest, vars);

    const files = {};
    if (platforms.play?.outputFile) {
        const p = path.join(outDir, platforms.play.outputFile);
        fs.writeFileSync(p, JSON.stringify(play, null, 2));
        files.play = platforms.play.outputFile;
    }
    if (platforms.steam?.outputFile) {
        const p = path.join(outDir, platforms.steam.outputFile);
        fs.writeFileSync(p, JSON.stringify(steam, null, 2));
        files.steam = platforms.steam.outputFile;
    }
    if (platforms.itch?.outputFile) {
        const p = path.join(outDir, platforms.itch.outputFile);
        fs.writeFileSync(p, JSON.stringify(itch, null, 2));
        files.itch = platforms.itch.outputFile;
    }
    if (platforms.registry?.outputFile) {
        const p = path.join(outDir, platforms.registry.outputFile);
        fs.writeFileSync(p, JSON.stringify(registry, null, 2));
        files.registry = platforms.registry.outputFile;
    }

    const summary = {
        format: 'threshold-store-assets-prep',
        status: manifest.assetRegistry?.storeAssets?.status || 'scaffold',
        mappedCount: manifest.assetRegistry?.storeAssets?.mappedCount || 0,
        files,
        platforms: Object.keys(files),
        steamAppId: steam.appId,
        steamDepotId: steam.depotId,
        playProductCount: play.products.length,
        registryItemCount: registry.items.length,
    };
    fs.writeFileSync(path.join(outDir, 'store-assets-prep.json'), JSON.stringify(summary, null, 2));
    return { summary, play, steam, itch, registry };
}

function buildNextSteps(targets, storeCfg, assetSummary = null) {
    const steps = ['npm run store:prep -- --manifest <game>.threshold-game.json'];
    if (assetSummary?.mappedCount > 0 || assetSummary?.status === 'mapped') {
        steps.push('npm run store:assets -- --manifest <game>.threshold-game.json');
    }
    if (targets.android) steps.push(`npm run ${storeCfg.targets.android.packageScript}`);
    if (targets.ios) steps.push(`npm run ${storeCfg.targets.ios.packageScript}`);
    if (targets.windows) steps.push(`npm run ${storeCfg.targets.windows.packageScript}`);
    if (targets.macos) steps.push(`npm run ${storeCfg.targets.macos.packageScript}`);
    if (targets.steam || (targets.windows && assetSummary?.steamAppId)) {
        steps.push('npm run package:steam -- --manifest <game>.threshold-game.json');
        steps.push('npm run steam:depot -- --manifest <game>.threshold-game.json');
    } else if (targets.windows && assetSummary?.steamAppId) {
        steps.push('npm run export:graphics -- --profile steam --install');
    }
    return steps;
}

function printChecklist(prep) {
    console.log(`\nStore prep: ${prep.game} (${prep.bundleId})`);
    console.log(`Output: ${prep.outDir}/\n`);
    Object.entries(prep.checklist).forEach(([id, target]) => {
        console.log(`── ${target.label} (${id}) ──`);
        target.checklist.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
        console.log(`  Artifact: ${target.artifact}\n`);
    });
}

module.exports = {
    ROOT,
    loadStoreConfig,
    loadManifest,
    manifestVars,
    resolveTargets,
    applyNativeAppConfig,
    generateStoreBundle,
    generateStoreAssetMaps,
    printChecklist,
    slugify,
};