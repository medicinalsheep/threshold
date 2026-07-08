#!/usr/bin/env node
/**
 * Phase 7 — Store upload guide generator (signing stays local).
 * Reads dist-store/<slug>/store-prep.json and writes upload-guide.md with per-platform steps.
 *
 *   npm run store:upload -- --manifest exports/my-game.threshold-game.json
 *   npm run store:upload -- --slug my-game
 */
const fs = require('fs');
const path = require('path');
const { ROOT, loadManifest, slugify } = require('./store-release-lib.cjs');

function parseArgs(argv) {
    const args = { manifest: null, slug: null, out: null };
    for (let i = 2; i < argv.length; i += 1) {
        const a = argv[i];
        if (a === '--manifest' || a === '-m') args.manifest = argv[++i];
        else if (a === '--slug' || a === '-s') args.slug = argv[++i];
        else if (a === '--out' || a === '-o') args.out = argv[++i];
        else if (a === '--help' || a === '-h') args.help = true;
    }
    return args;
}

function buildGuide(prep, slug) {
    const lines = [
        `# Store upload guide — ${prep.gameName || slug}`,
        '',
        `Generated ${new Date().toISOString().slice(0, 10)} · Threshold v${prep.version || '?'}`,
        '',
        '> Signing keys and notarization stay on your machine. This file lists artifacts and upload order.',
        '',
    ];

    const targets = prep.checklist || {};
    Object.entries(targets).forEach(([id, block]) => {
        lines.push(`## ${block.label || id}`, '');
        if (block.artifact) lines.push(`**Artifact:** \`${block.artifact}\``, '');
        if (block.packageScript) {
            lines.push('```bash');
            lines.push(`npm run ${block.packageScript}`);
            lines.push('```', '');
        }
        (block.checklist || block.steps || []).forEach((step, i) => lines.push(`${i + 1}. ${step}`));
        lines.push('');
    });

    lines.push('## Pre-upload checklist', '');
    lines.push('- [ ] `npm run store:prep` + `npm run store:assets` completed');
    lines.push('- [ ] Privacy policy URL live (from `privacy-policy.md`)');
    lines.push('- [ ] Screenshots + icons at required resolutions');
    lines.push('- [ ] Signed build produced locally (never commit keystores)');
    lines.push('- [ ] `npm run store:verify` passed', '');
    lines.push('## Signing notes', '');
    lines.push('| Platform | Env / tool |');
    lines.push('|----------|------------|');
    lines.push('| Android | Android Studio keystore → `android/` signing config |');
    lines.push('| iOS | Xcode automatic signing + Apple Developer team |');
    lines.push('| Windows | `CSC_LINK` + `CSC_KEY_PASSWORD` for electron-builder |');
    lines.push('| macOS | Same + `APPLE_ID` + app-specific password for notarization |');
    lines.push('| Steam | Partner account + `upload-steam-depot.cmd` from `npm run steam:depot` |');
    lines.push('');

    return lines.join('\n');
}

function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        console.log(`
Store upload guide (signing local)

  npm run store:upload -- --manifest <game>.threshold-game.json
  npm run store:upload -- --slug <slug>

Writes dist-store/<slug>/upload-guide.md from store-prep.json.
`);
        process.exit(0);
    }

    let slug = args.slug;
    if (args.manifest) {
        const manifest = loadManifest(path.resolve(ROOT, args.manifest));
        slug = slugify(manifest.name || manifest.title || 'game');
    }
    if (!slug) {
        console.error('[store-upload] --manifest or --slug required');
        process.exit(1);
    }

    const storeDir = path.resolve(ROOT, args.out || path.join('dist-store', slug));
    const prepPath = path.join(storeDir, 'store-prep.json');
    if (!fs.existsSync(prepPath)) {
        console.error(`[store-upload] missing ${prepPath} — run npm run store:prep first`);
        process.exit(1);
    }

    const prep = JSON.parse(fs.readFileSync(prepPath, 'utf8'));
    const guide = buildGuide(prep, slug);
    const outPath = path.join(storeDir, 'upload-guide.md');
    fs.writeFileSync(outPath, guide);
    console.log(`[store-upload] ${outPath}`);
    console.log('[store-upload] Signing stays local — follow upload-guide.md per platform');
}

main();