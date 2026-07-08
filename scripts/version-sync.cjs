#!/usr/bin/env node
/**
 * Sync shipped version from src/config.js → package.json + doc headers.
 * Usage: node scripts/version-sync.cjs [--check]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const checkOnly = process.argv.includes('--check');

function readVersion() {
    const config = fs.readFileSync(path.join(ROOT, 'src/config.js'), 'utf8');
    const m = config.match(/export const VERSION = '([^']+)'/);
    if (!m) throw new Error('VERSION not found in src/config.js');
    return m[1];
}

function writeIfChanged(file, transform) {
    const full = path.join(ROOT, file);
    const before = fs.readFileSync(full, 'utf8');
    const after = transform(before);
    if (before === after) return false;
    if (!checkOnly) fs.writeFileSync(full, after);
    return true;
}

const version = readVersion();
let changed = 0;

function bump(n) {
    changed += n;
    console.log(`  ${checkOnly ? 'DRIFT' : 'updated'} (${n} file(s))`);
}

if (writeIfChanged('package.json', (s) => s.replace(/"version": "[^"]+"/, `"version": "${version}"`))) bump(1);
if (writeIfChanged('package-lock.json', (s) => {
    let n = 0;
    return s.replace(/^  "version": "[^"]+"/m, () => { n += 1; return `  "version": "${version}"`; })
        .replace(/^      "version": "[^"]+"/m, () => { n += 1; return `      "version": "${version}"`; });
})) bump(1);

const headerFiles = [
    'README.md',
    'AGENTS.md',
    'docs/README.md',
    'docs/CAPABILITIES.md',
    'docs/PRODUCT_ROADMAP.md',
    'docs/GETTING_STARTED.md',
    'docs/ASSET_CAPABILITIES.md',
    'docs/CREATIVE_OS.md',
    'docs/ROADMAP.md',
    'docs/CONSOLIDATION_PLAN.md',
];

const patterns = [
    [/· \*\*Version:\*\* \d+\.\d+\.\d+/g, `· **Version:** ${version}`],
    [/\*\*Version:\*\* \d+\.\d+\.\d+/g, `**Version:** ${version}`],
    [/\*\*Current version:\*\* \*\*\d+\.\d+\.\d+\*\*/g, `**Current version:** **${version}**`],
    [/\*\*Current:\*\* \d+\.\d+\.\d+/g, `**Current:** ${version}`],
    [/\(currently \*\*\d+\.\d+\.\d+\*\*\)/g, `(currently **${version}**)`],
    [/# Getting started with Threshold \(v\d+\.\d+\.\d+\)/, `# Getting started with Threshold (v${version})`],
    [/\*\*Current version:\*\* v\d+\.\d+\.\d+/, `**Current version:** v${version}`],
    [/Capabilities \(v\d+\.\d+\)/, `Capabilities (v${version.split('.').slice(0, 2).join('.')})`],
];

for (const file of headerFiles) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    let src = fs.readFileSync(full, 'utf8');
    let next = src;
    for (const [re, rep] of patterns) next = next.replace(re, rep);
    if (next !== src) {
        if (!checkOnly) fs.writeFileSync(full, next);
        changed += 1;
        console.log(`  ${checkOnly ? 'DRIFT' : 'updated'}: ${file}`);
    }
}

if (checkOnly) {
    if (changed) {
        console.error(`\nversion:sync --check FAILED — ${changed} file(s) out of sync with ${version}`);
        process.exit(1);
    }
    console.log(`version:sync — all tracked headers match ${version}`);
} else {
    console.log(`\nversion:sync — aligned to ${version} (${changed} file(s) touched)`);
}