#!/usr/bin/env node
/** Compress sounds/import/* → public/bundle/sounds/starter/ (ffmpeg or VLC) */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const IMPORT = path.join(ROOT, 'sounds', 'import');
const OUT = path.join(ROOT, 'public', 'bundle', 'sounds', 'starter');
const SR = 22050;

function run(cmd) {
    execSync(cmd, { stdio: 'inherit' });
}

function compressOne(src, destOgg) {
    if (fs.existsSync(destOgg)) fs.unlinkSync(destOgg);
    try {
        run(`ffmpeg -y -i "${src}" -ac 1 -ar ${SR} -c:a libvorbis -q:a 5 "${destOgg}"`);
        return 'ffmpeg';
    } catch { /* */ }
    try {
        run(`"${process.env.VLC_PATH || 'vlc'}" -I dummy "${src}" --sout="#transcode{acodec=vorb,ab=64,channels=1,samplerate=${SR}}:std{access=file,mux=ogg,dst=${destOgg}}" vlc://quit`);
        return 'vlc';
    } catch { /* */ }
    const wavDest = destOgg.replace(/\.ogg$/i, '.wav');
    fs.copyFileSync(src, wavDest);
    return 'copy-wav';
}

function main() {
    if (!fs.existsSync(IMPORT)) {
        console.log('[compress-starter-sfx] mkdir sounds/import and drop WAV/MP3 sources');
        fs.mkdirSync(IMPORT, { recursive: true });
        return;
    }
    fs.mkdirSync(OUT, { recursive: true });
    const files = fs.readdirSync(IMPORT).filter((f) => /\.(wav|mp3|m4a|webm|ogg)$/i.test(f));
    if (!files.length) {
        console.log('[compress-starter-sfx] no audio in sounds/import/');
        return;
    }
    files.forEach((f) => {
        const base = path.basename(f, path.extname(f));
        const tool = compressOne(path.join(IMPORT, f), path.join(OUT, `${base}.ogg`));
        console.log(`[compress-starter-sfx] ${f} via ${tool}`);
    });
}

main();