#!/usr/bin/env node
/** TC intro video — R7 (Python imageio when available) */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PY = path.join(ROOT, 'plugins', 'threshold-video', 'build_tc_intro.py');
const WEBM = path.join(ROOT, 'video', 'tc_intro.webm');
const PUB = path.join(ROOT, 'public', 'bundle', 'video');

function findPython() {
    const candidates = [process.env.PYTHON, 'python', 'python3', 'py'];
    for (const cmd of candidates) {
        if (!cmd) continue;
        const args = cmd === 'py' ? ['-3', '--version'] : ['--version'];
        const r = spawnSync(cmd, args, { encoding: 'utf8' });
        if (r.status === 0) return cmd;
    }
    return null;
}

function main() {
    const py = findPython();
    if (!py || !fs.existsSync(PY)) {
        console.error('[tc-gen-vid] Python or build_tc_intro.py missing');
        process.exit(1);
    }
    const args = py === 'py' ? ['-3', PY] : [PY];
    const r = spawnSync(py, args, { stdio: 'inherit', cwd: ROOT });
    if (r.status !== 0) {
        console.error('[tc-gen-vid] build failed — pip install pillow imageio imageio-ffmpeg');
        process.exit(r.status || 1);
    }
    if (!fs.existsSync(WEBM)) {
        console.error('[tc-gen-vid] no output webm');
        process.exit(1);
    }
    fs.mkdirSync(PUB, { recursive: true });
    for (const f of fs.readdirSync(path.join(ROOT, 'video'))) {
        if (/^tc_intro\.(webm|mp4)$/.test(f) || f === 'threshold_video_manifest.json') {
            fs.copyFileSync(path.join(ROOT, 'video', f), path.join(PUB, f));
        }
    }
    console.log('[tc-gen-vid] done');
}

main();