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
    const name = game.name || 'Threshold Game';
    const author = game.author || 'Creator';
    const bundleId = packaging.ios?.bundleId
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
        CONTACT_EMAIL: options.contactEmail || 'support@example.com',
        SUPPORT_URL: options.supportUrl || 'https://example.com/support',
        PRIVACY_POLICY_URL: options.privacyPolicyUrl || `https://example.com/${slug}/privacy`,
    };
}

function resolveTargets(manifest, cliTargets = null) {
    const t = cliTargets || manifest.targets || {};
    return {
        android: !!t.android,
        ios: !!t.ios,
        windows: t.windows !== false,
        macos: !!t.macos,
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

    const storeCfg = loadStoreConfig();
    const targets = resolveTargets(manifest, options.targets);
    const checklist = {};
    Object.entries(storeCfg.targets).forEach(([id, target]) => {
        if (targets[id]) checklist[id] = target;
    });

    const prep = {
        format: 'threshold-store-prep',
        preparedAt: new Date().toISOString(),
        game: vars.GAME_NAME,
        bundleId: vars.BUNDLE_ID,
        engineVersion: manifest.engineVersion,
        outDir: path.relative(ROOT, outDir).replace(/\\/g, '/'),
        targets,
        checklist,
        privacyPolicy: path.join(path.relative(ROOT, outDir), 'privacy-policy.md').replace(/\\/g, '/'),
        nextSteps: buildNextSteps(targets, storeCfg),
    };
    fs.writeFileSync(path.join(outDir, 'store-prep.json'), JSON.stringify(prep, null, 2));
    return prep;
}

function buildNextSteps(targets, storeCfg) {
    const steps = ['npm run store:prep -- --manifest <game>.threshold-game.json'];
    if (targets.android) steps.push(`npm run ${storeCfg.targets.android.packageScript}`);
    if (targets.ios) steps.push(`npm run ${storeCfg.targets.ios.packageScript}`);
    if (targets.windows) steps.push(`npm run ${storeCfg.targets.windows.packageScript}`);
    if (targets.macos) steps.push(`npm run ${storeCfg.targets.macos.packageScript}`);
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
    printChecklist,
    slugify,
};