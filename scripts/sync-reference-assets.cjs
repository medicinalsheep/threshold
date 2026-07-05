#!/usr/bin/env node
/**
 * TC editions load from src/shared/tc*.js — GLBs synced via tc:build.
 * External seeds stay in reference/_dev-seeds/ (gitignored).
 */
console.log('TC editions load from src/shared/tcShow.js, tcVeh.js, tcChr.js, tcLite.js, tcSfx.js');
console.log('Run npm run tc:build to sync GLBs to public/bundle/import/');
console.log('');
console.log('Optional dev seeds: npm run reference:fetch → reference/_dev-seeds/');
console.log('Policy: docs/THRESHOLD_CHILD_ASSETS.md');