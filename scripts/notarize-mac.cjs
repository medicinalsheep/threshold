#!/usr/bin/env node
/**
 * macOS notarization helper for electron-builder afterSign / CLI staple.
 *
 * Env (all required for notary):
 *   CSC_LINK, CSC_KEY_PASSWORD          — Developer ID Application cert
 *   APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID
 *
 * electron-builder:
 *   afterSign: "scripts/notarize-mac.cjs"
 *
 * CLI staple:
 *   node scripts/notarize-mac.cjs --staple dist-electron/Threshold-*.dmg
 *
 * @see docs/MAC_NOTARIZE.md
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function notarizeContext(context) {
    if (process.platform !== 'darwin') {
        console.log('[notarize-mac] skip — not darwin');
        return;
    }
    const appId = process.env.APP_BUNDLE_ID
        || require('../config/native-app.json')?.appId
        || 'com.threshold.suite';
    const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
    if (!fs.existsSync(appPath)) {
        console.warn('[notarize-mac] app not found', appPath);
        return;
    }

    const appleId = process.env.APPLE_ID;
    const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
    const teamId = process.env.APPLE_TEAM_ID;
    if (!appleId || !appleIdPassword || !teamId) {
        console.warn('[notarize-mac] missing APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID — skip notary');
        return;
    }

    console.log('[notarize-mac] notarizing', appPath);
    // electron-builder bundles @electron/notarize
    let notarize;
    try {
        ({ notarize } = require('@electron/notarize'));
    } catch {
        console.warn('[notarize-mac] @electron/notarize not available — skip');
        return;
    }
    await notarize({
        appBundleId: appId,
        appPath,
        appleId,
        appleIdPassword,
        teamId,
    });
    console.log('[notarize-mac] notarize submitted/complete');
}

function staple(file) {
    if (!file || !fs.existsSync(file)) {
        console.error('[notarize-mac] staple file missing', file);
        process.exit(1);
    }
    console.log('[notarize-mac] staple', file);
    execSync(`xcrun stapler staple ${JSON.stringify(file)}`, { stdio: 'inherit' });
    execSync(`xcrun stapler validate ${JSON.stringify(file)}`, { stdio: 'inherit' });
}

// electron-builder afterSign exports a function
exports.default = async function afterSign(context) {
    await notarizeContext(context);
};

// CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args[0] === '--staple' && args[1]) {
        staple(args[1]);
    } else if (args[0] === '--check') {
        const keys = ['CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'];
        keys.forEach((k) => console.log(`${process.env[k] ? '✓' : '✗'} ${k}`));
        process.exit(keys.every((k) => process.env[k]) ? 0 : 1);
    } else {
        console.log(`
notarize-mac

  afterSign hook for electron-builder (default export)
  node scripts/notarize-mac.cjs --check
  node scripts/notarize-mac.cjs --staple path/to.dmg
`);
    }
}
