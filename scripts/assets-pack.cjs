#!/usr/bin/env node
/** One-shot default asset pipeline — textures, sounds, WebP, build, bundle */
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(label, args) {
    console.log(`\n[assets-pack] ${label}`);
    const r = spawnSync(npm, ['run', ...args], { cwd: ROOT, stdio: 'inherit', shell: false });
    if (r.status !== 0) {
        console.error(`[assets-pack] FAILED: ${label}`);
        process.exit(r.status || 1);
    }
}

run('textures', ['tc:gen:tex']);
run('sounds', ['sounds:gen']);
run('webp', ['tex:compress']);
run('build', ['build']);
run('bundle', ['bundle:assets']);
console.log('\n[assets-pack] DONE — run npm run assets:verify');