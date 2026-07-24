#!/usr/bin/env node
/**
 * Store ship orchestrator — prep → package targets → upload guide.
 * Signing/notarization credentials stay local (never committed).
 *
 *   npm run store:ship -- --manifest exports/game.threshold-game.json
 *   npm run store:ship -- --manifest game.json --targets win,android
 *   npm run store:ship -- --manifest game.json --targets mac --notarize-check
 *
 * @see docs/STORE_RELEASE.md · docs/MAC_NOTARIZE.md
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ROOT, loadManifest, slugify } = require('./store-release-lib.cjs');

function parseArgs(argv) {
    const out = {
        manifest: null,
        targets: ['win'],
        skipPackage: false,
        notarizeCheck: false,
        contact: null,
        help: false,
    };
    for (let i = 2; i < argv.length; i += 1) {
        const a = argv[i];
        const n = argv[i + 1];
        if (a === '--manifest' || a === '-m') { out.manifest = n; i += 1; }
        else if (a === '--targets' || a === '-t') {
            out.targets = String(n || '').split(/[,+\s]+/).filter(Boolean);
            i += 1;
        }
        else if (a === '--skip-package') out.skipPackage = true;
        else if (a === '--notarize-check') out.notarizeCheck = true;
        else if (a === '--contact') { out.contact = n; i += 1; }
        else if (a === '--help' || a === '-h') out.help = true;
    }
    return out;
}

function run(cmd) {
    console.log(`\n> ${cmd}`);
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
}

function checkNotarizeEnv() {
    const need = [
        'CSC_LINK',
        'CSC_KEY_PASSWORD',
        'APPLE_ID',
        'APPLE_APP_SPECIFIC_PASSWORD',
        'APPLE_TEAM_ID',
    ];
    const missing = need.filter((k) => !process.env[k]);
    console.log('\n[store:ship] macOS notarize env check');
    need.forEach((k) => {
        console.log(`  ${process.env[k] ? '✓' : '✗'} ${k}`);
    });
    if (missing.length) {
        console.log('\nMissing env vars for notarization. See docs/MAC_NOTARIZE.md');
        return false;
    }
    console.log('All notarization env vars present (values not printed).');
    return true;
}

function main() {
    const args = parseArgs(process.argv);
    if (args.help || !args.manifest) {
        console.log(`
store:ship — prep + package + upload guide

  npm run store:ship -- --manifest <game>.threshold-game.json
  npm run store:ship -- --manifest <file> --targets win,android,steam
  npm run store:ship -- --manifest <file> --targets mac --notarize-check

Targets: win | mac | android | ios | steam | all
`);
        process.exit(args.help ? 0 : 1);
    }

    const manPath = path.isAbsolute(args.manifest)
        ? args.manifest
        : path.join(ROOT, args.manifest);
    if (!fs.existsSync(manPath)) {
        console.error('Manifest not found:', manPath);
        process.exit(1);
    }

    const contact = args.contact ? ` --contact ${JSON.stringify(args.contact)}` : '';
    run(`npm run store:prep -- --manifest ${JSON.stringify(manPath)}${contact}`);
    run(`npm run store:assets -- --manifest ${JSON.stringify(manPath)}`);

    let targets = args.targets;
    if (targets.includes('all')) {
        targets = ['win', 'android', 'ios', 'mac', 'steam'];
    }

    if (args.notarizeCheck || targets.includes('mac')) {
        checkNotarizeEnv();
    }

    if (!args.skipPackage) {
        for (const t of targets) {
            const id = t.toLowerCase();
            if (id === 'win') run(`npm run package:win -- --manifest ${JSON.stringify(manPath)}`);
            else if (id === 'mac') {
                if (process.platform !== 'darwin') {
                    console.warn('[store:ship] skip package:mac — not on darwin');
                } else {
                    run('npm run package:mac');
                }
            } else if (id === 'android') run('npm run package:android:release');
            else if (id === 'ios') run('npm run package:ios');
            else if (id === 'steam') {
                run(`npm run package:steam -- --manifest ${JSON.stringify(manPath)}`);
                run(`npm run steam:depot -- --manifest ${JSON.stringify(manPath)}`);
            } else {
                console.warn('[store:ship] unknown target', t);
            }
        }
    }

    run(`npm run store:upload -- --manifest ${JSON.stringify(manPath)}`);
    run('npm run store:verify');

    console.log('\n[store:ship] done — review dist-store/<slug>/upload-guide.md');
    console.log('Signing keys never leave your machine. macOS: docs/MAC_NOTARIZE.md');
}

main();
