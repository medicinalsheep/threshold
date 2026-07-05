#!/usr/bin/env node
/**
 * Phase J — Targeted graphics export per platform profile.
 *
 * Usage:
 *   npm run export:graphics -- --profile android
 *   npm run export:graphics -- --profile windows --manifest my-game.threshold-game.json
 *   npm run export:graphics -- --all-profiles --install
 */
const fs = require('fs');
const path = require('path');
const {
    ROOT,
    listProfiles,
    getProfile,
    selectTextureFiles,
    collectDirFiles,
    resolveSourceDirs,
    copyFile,
    filterGimpManifest,
    sliceGameManifest,
    buildExportManifest,
    buildTextureExportEntries,
    MODEL_EXT,
} = require('./graphics-export-lib.cjs');

function parseArgs(argv) {
    const args = {
        profile: null,
        manifest: null,
        out: null,
        install: false,
        allProfiles: false,
        help: false,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--profile' || a === '-p') args.profile = argv[++i];
        else if (a === '--manifest' || a === '-m') args.manifest = argv[++i];
        else if (a === '--out' || a === '-o') args.out = argv[++i];
        else if (a === '--install') args.install = true;
        else if (a === '--all-profiles') args.allProfiles = true;
    }
    return args;
}

function printHelp() {
    console.log(`
Threshold targeted graphics export (Phase J)

  npm run export:graphics -- --profile <id> [options]

Profiles:
${listProfiles().map((p) => `  ${p.id.padEnd(10)} tier=${p.tier} textureMax=${p.textureMax}  ${p.label}`).join('\n')}

Options:
  --manifest, -m   Path to .threshold-game.json (optional)
  --out, -o        Output directory (default: dist-export/<profile>/)
  --install        Copy pruned bundle → dist-pages/bundle/ for packaging
  --all-profiles   Export every profile to dist-export/<id>/
  --help, -h       Show this help
`);
}

function loadGameManifest(manifestPath) {
    if (!manifestPath) return null;
    const resolved = path.resolve(ROOT, manifestPath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`Manifest not found: ${resolved}`);
    }
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function exportProfile(profileId, options = {}) {
    const profile = getProfile(profileId);
    const outDir = path.resolve(ROOT, options.out || path.join('dist-export', profileId));
    const bundleOut = path.join(outDir, 'bundle');
    const texOut = path.join(bundleOut, 'textures');
    const importOut = path.join(bundleOut, 'import');

    const sources = resolveSourceDirs();
    const gameManifest = loadGameManifest(options.manifest);

    let textureFiles = [];
    if (sources.textures) {
        textureFiles = collectDirFiles(sources.textures);
    }

    const { selected, skipped, groups } = selectTextureFiles(textureFiles, profile.textureMax);

    fs.mkdirSync(texOut, { recursive: true });
    fs.mkdirSync(importOut, { recursive: true });

    let copiedTex = 0;
    if (sources.textures) {
        for (const rel of selected) {
            const src = path.join(sources.textures, rel);
            const dest = path.join(texOut, rel);
            copyFile(src, dest);
            copiedTex += 1;
        }
    }

    let copiedImport = 0;
    if (sources.import) {
        const importFiles = collectDirFiles(sources.import).filter((f) => MODEL_EXT.test(f));
        for (const rel of importFiles) {
            copyFile(path.join(sources.import, rel), path.join(importOut, rel));
            copiedImport += 1;
        }
        const blenderManifest = path.join(sources.import, 'threshold_blender_manifest.json');
        if (fs.existsSync(blenderManifest)) {
            copyFile(blenderManifest, path.join(importOut, 'threshold_blender_manifest.json'));
        }
    }

    const gimpManifestSrc = sources.textures
        ? path.join(sources.textures, 'threshold_manifest.json')
        : null;
    const gimpFiltered = gimpManifestSrc
        ? filterGimpManifest(gimpManifestSrc, selected)
        : null;
    if (gimpFiltered) {
        fs.writeFileSync(path.join(texOut, 'threshold_manifest.json'), JSON.stringify(gimpFiltered, null, 2));
    }

    const textureEntries = buildTextureExportEntries(selected, profileId, profile.textureMax);

    const bundleIndex = {
        format: 'threshold-asset-bundle',
        bundledAt: new Date().toISOString(),
        root: 'bundle/',
        profile: profileId,
        textureMax: profile.textureMax,
        tier: profile.tier,
        dirs: ['textures', 'import'],
        files: {
            textures: collectDirFiles(texOut),
            import: collectDirFiles(importOut),
        },
        pruned: skipped.length,
    };
    fs.writeFileSync(path.join(bundleOut, 'bundle-index.json'), JSON.stringify(bundleIndex, null, 2));

    const exportManifest = buildExportManifest(profile, {
        sourceManifest: options.manifest ? path.basename(options.manifest) : null,
        bundle: bundleIndex,
        textureEntries,
    });
    fs.writeFileSync(path.join(outDir, 'graphics-export.json'), JSON.stringify(exportManifest, null, 2));

    if (gameManifest) {
        const sliced = sliceGameManifest(gameManifest, profile, exportManifest.graphics, textureEntries);
        const slug = (gameManifest.game?.name || profileId).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        fs.writeFileSync(
            path.join(outDir, `${slug}.${profileId}.threshold-game.json`),
            JSON.stringify(sliced, null, 2)
        );
    }

    if (options.install) {
        const installBundle = path.join(ROOT, 'dist-pages', 'bundle');
        fs.rmSync(installBundle, { recursive: true, force: true });
        fs.mkdirSync(installBundle, { recursive: true });
        copyTree(bundleOut, installBundle);
        console.log(`[export-graphics] installed bundle → dist-pages/bundle/`);
    }

    console.log(
        `[export-graphics] ${profileId}: ${copiedTex} texture(s) (${groups} groups, ${skipped.length} pruned) + ${copiedImport} model(s) → ${path.relative(ROOT, outDir)}`
    );
    return { profileId, outDir, copiedTex, skipped: skipped.length, copiedImport };
}

function copyTree(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
        const s = path.join(src, entry);
        const d = path.join(dest, entry);
        if (fs.statSync(s).isDirectory()) copyTree(s, d);
        else copyFile(s, d);
    }
}

function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        printHelp();
        return;
    }

    if (args.allProfiles) {
        const results = listProfiles().map((p) =>
            exportProfile(p.id, {
                manifest: args.manifest,
                out: args.out ? path.join(args.out, p.id) : undefined,
                install: false,
            })
        );
        if (args.install) {
            console.log('[export-graphics] --install skipped with --all-profiles (use single --profile --install)');
        }
        console.log(`[export-graphics] exported ${results.length} profile(s) under dist-export/`);
        return;
    }

    if (!args.profile) {
        printHelp();
        process.exit(1);
    }

    exportProfile(args.profile, {
        manifest: args.manifest,
        out: args.out,
        install: args.install,
    });
}

main();