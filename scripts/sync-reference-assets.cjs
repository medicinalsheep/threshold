#!/usr/bin/env node
/**
 * Threshold Child editions are procedural — no file sync required.
 * External seeds stay in reference/_dev-seeds/ (gitignored).
 */
console.log('Threshold Child editions load from src/shared/thresholdChildAssets.js');
console.log('No sync needed for procedural Child Lite.');
console.log('');
console.log('Optional dev seeds: npm run reference:fetch → reference/_dev-seeds/');
console.log('Policy: docs/THRESHOLD_CHILD_ASSETS.md');