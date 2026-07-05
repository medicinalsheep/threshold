/**
 * Creative watch relay — SSE hot-reload for textures/ + import/
 * Engine connects when VITE_CREATIVE_WATCH_URL is set (default http://localhost:3927)
 *
 * Usage: npm run textures:watch
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PORT = parseInt(process.env.CREATIVE_WATCH_PORT || '3927', 10);
const WATCH_DIRS = ['textures', 'import', 'video'];
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MODEL_EXT = new Set(['.glb', '.gltf']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.ogg', '.m4v']);
const MANIFESTS = {
    textures: 'threshold_manifest.json',
    import: 'threshold_blender_manifest.json',
    video: 'threshold_video_manifest.json',
};

const clients = new Set();
const debounce = new Map();

function rel(filePath) {
    return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function abs(relPath) {
    const resolved = path.resolve(ROOT, relPath);
    if (!resolved.startsWith(ROOT)) return null;
    return resolved;
}

function broadcast(event) {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of clients) {
        try {
            res.write(payload);
        } catch {
            clients.delete(res);
        }
    }
    const label = event.file || event.path || event.type;
    console.log(`[creative-watch] ${event.type}: ${label}`);
}

function schedule(kind, filePath) {
    const key = `${kind}:${filePath}`;
    if (debounce.has(key)) clearTimeout(debounce.get(key));
    debounce.set(
        key,
        setTimeout(() => {
            debounce.delete(key);
            emitChange(kind, filePath);
        }, 120)
    );
}

const HILOD_RE = /_(512|1k|2k|4k)(\.[^.]+)$/i;

function parseTextureFile(fileName) {
    const lower = fileName.toLowerCase();
    let hilod = '';
    let stem = lower;
    const hilodMatch = lower.match(HILOD_RE);
    if (hilodMatch) {
        hilod = `_${hilodMatch[1].toLowerCase()}`;
        stem = lower.slice(0, lower.length - hilod.length);
    }
    for (const slot of ['albedo', 'roughness', 'metalness', 'normal']) {
        const suffix = `_${slot}`;
        if (
            stem.endsWith(`${suffix}.png`)
            || stem.endsWith(`${suffix}.jpg`)
            || stem.endsWith(`${suffix}.jpeg`)
            || stem.endsWith(`${suffix}.webp`)
        ) {
            const slug = stem.slice(0, stem.lastIndexOf(suffix));
            return { slot, slug, hilod, objectName: slug.replace(/_/g, ' ') };
        }
    }
    return null;
}

function mirrorToBundle(relPath) {
    const src = path.join(ROOT, relPath);
    const dest = path.join(ROOT, 'public', 'bundle', relPath);
    if (!fs.existsSync(src) || !fs.statSync(src).isFile()) return;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
        fs.copyFileSync(src, dest);
    } catch {
        /* optional */
    }
}

function compressWebpSibling(filePath) {
    if (!filePath.toLowerCase().endsWith('.png')) return;
    const script = path.join(__dirname, 'compress-one.cjs');
    spawn(process.execPath, [script, filePath], { stdio: 'ignore', cwd: ROOT }).unref();
}

function emitChange(kind, filePath) {
    const relative = rel(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    if (fileName === MANIFESTS.textures && kind === 'textures') {
        broadcast({ type: 'gimp-manifest', path: relative, watchUrl: assetUrl(relative) });
        return;
    }
    if (fileName === MANIFESTS.import && kind === 'import') {
        broadcast({ type: 'blender-manifest', path: relative, watchUrl: assetUrl(relative) });
        return;
    }
    if (fileName === MANIFESTS.video && kind === 'video') {
        broadcast({ type: 'video-manifest', path: relative, watchUrl: assetUrl(relative) });
        return;
    }

    if (kind === 'textures' && ext === '.png') {
        compressWebpSibling(filePath);
        mirrorToBundle(relative);
    }

    if (kind === 'textures' && IMAGE_EXT.has(ext)) {
        mirrorToBundle(relative);
        const parsed = parseTextureFile(fileName);
        broadcast({
            type: 'texture',
            path: relative,
            file: fileName,
            watchUrl: assetUrl(relative),
            slot: parsed?.slot || null,
            slug: parsed?.slug || null,
            hilod: parsed?.hilod || '',
            objectName: parsed?.objectName || null,
        });
        return;
    }

    if (kind === 'import' && MODEL_EXT.has(ext)) {
        const lodMatch = fileName.match(/^(.+)_lod[12]\.(glb|gltf)$/i);
        const slug = lodMatch ? lodMatch[1] : fileName.replace(/\.(glb|gltf)$/i, '');
        broadcast({
            type: 'gltf',
            path: relative,
            file: fileName,
            watchUrl: assetUrl(relative),
            slug,
            objectName: slug.replace(/_/g, ' '),
        });
        return;
    }

    if (kind === 'video' && VIDEO_EXT.has(ext)) {
        broadcast({
            type: 'video',
            path: relative,
            file: fileName,
            watchUrl: assetUrl(relative),
            id: fileName.replace(/\.[^.]+$/, ''),
        });
    }
}

function assetUrl(relPath) {
    return `http://127.0.0.1:${PORT}/asset?path=${encodeURIComponent(relPath)}`;
}

function watchDir(dirName) {
    const dirPath = path.join(ROOT, dirName);
    fs.mkdirSync(dirPath, { recursive: true });

    try {
        fs.watch(dirPath, { persistent: true }, (_event, fileName) => {
            if (!fileName) return;
            schedule(dirName, path.join(dirPath, fileName));
        });
        console.log(`[creative-watch] watching ${dirName}/`);
    } catch (err) {
        console.warn(`[creative-watch] could not watch ${dirName}/:`, err.message);
    }

    for (const manifest of new Set(Object.values(MANIFESTS))) {
        const manifestPath = path.join(dirPath, manifest);
        if (fs.existsSync(manifestPath)) {
            fs.watch(manifestPath, () => schedule(dirName, manifestPath));
        }
    }
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    if (url.pathname === '/gimp-sync' && req.method === 'POST') {
        const manPath = path.join(ROOT, 'textures', MANIFESTS.textures);
        if (fs.existsSync(manPath)) {
            broadcast({
                type: 'gimp-manifest',
                path: 'textures/threshold_manifest.json',
                watchUrl: assetUrl('textures/threshold_manifest.json'),
            });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, service: 'creative-watch', port: PORT }));
        return;
    }

    if (url.pathname === '/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });
        res.write(': connected\n\n');
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
    }

    if (url.pathname === '/asset') {
        const relPath = url.searchParams.get('path');
        const filePath = relPath ? abs(relPath) : null;
        if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.glb': 'model/gltf-binary',
            '.gltf': 'model/gltf+json',
            '.json': 'application/json',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg',
            '.m4v': 'video/mp4',
        };
        res.writeHead(200, {
            'Content-Type': types[ext] || 'application/octet-stream',
            'Cache-Control': 'no-store',
        });
        fs.createReadStream(filePath).pipe(res);
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Threshold creative watch on http://127.0.0.1:${PORT}`);
    console.log(`  SSE:  /events`);
    console.log(`  Assets: /asset?path=textures/foo_albedo.png`);
    console.log(`           /asset?path=video/intro.mp4`);
    console.log('');
    console.log('Run Engine (npm run dev or electron:dev) — hot-reload applies automatically.');
    WATCH_DIRS.forEach(watchDir);
});