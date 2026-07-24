#!/usr/bin/env node
/** Static smoke: perf harness surface (no browser). Always safe for CI. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let failed = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function fail(m) { console.error(`  ✗ ${m}`); failed += 1; }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

console.log('perf-harness-verify\n');

const ph = read('src/shared/perfHarness.js');
for (const t of [
    'export const PerfHarness',
    'measure(',
    'runScenario',
    '_startOrbit',
    '_clearPerfProps',
    'warmMs',
    '_maxDt',
    'window.PerfHarness',
]) {
    if (ph.includes(t)) ok(`perfHarness.js ${t}`);
    else fail(`perfHarness.js missing ${t}`);
}

const cli = read('scripts/perf-harness.cjs');
for (const t of [
    'puppeteer',
    'runScenario',
    'dist-store',
    'perf-latest.json',
    '--compare',
    'vite preview',
]) {
    if (cli.includes(t)) ok(`perf-harness.cjs ${t}`);
    else fail(`perf-harness.cjs missing ${t}`);
}

const pkg = JSON.parse(read('package.json'));
if (pkg.scripts?.['perf:harness'] && pkg.scripts?.['perf:verify']) ok('package.json perf scripts');
else fail('package.json missing perf:harness / perf:verify');

const html = read('index.html');
if (html.includes('perf-harness-run') && html.includes('PERF — measure')) ok('SETUP PERF UI');
else fail('SETUP PERF UI missing');

const docs = read('docs/PERF_NEXT.md');
if (docs.includes('perf-harness') || docs.includes('CI headless')) ok('PERF_NEXT mentions harness');
else fail('PERF_NEXT missing harness note');

if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
}
console.log('\nAll perf-harness static checks passed.');
