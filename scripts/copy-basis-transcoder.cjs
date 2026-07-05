#!/usr/bin/env node
/** Copy Three.js Basis transcoder into public/basis/ for KTX2Loader */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'basis');
const DEST = path.join(ROOT, 'public', 'basis');

if (!fs.existsSync(SRC)) {
    console.log('[copy-basis] three basis libs missing — skip');
    process.exit(0);
}

fs.mkdirSync(DEST, { recursive: true });
for (const f of ['basis_transcoder.js', 'basis_transcoder.wasm']) {
    fs.copyFileSync(path.join(SRC, f), path.join(DEST, f));
}
console.log('[copy-basis] basis transcoder → public/basis/');