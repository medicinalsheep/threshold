import * as THREE from 'three';
import { AssetBundle } from './assetBundle.js';
import { ThresholdShell } from './thresholdShell.js';

const VIDEO_MIME = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.m4v': 'video/mp4',
};

let active = null;
let skipHandler = null;
let keyHandler = null;

function mimeFromPath(filePath = '') {
    const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    return VIDEO_MIME[ext] || 'video/mp4';
}

function normalizeVideoPath(source = '') {
    const norm = String(source).replace(/\\/g, '/');
    if (/^https?:\/\//i.test(norm) || norm.startsWith('blob:')) return norm;
    if (norm.startsWith('video/') || norm.startsWith('bundle/video/')) return norm.replace(/^bundle\//, '');
    return `video/${norm}`;
}

function planeSizeForCamera(camera, distance, aspect) {
    const vFov = (camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * aspect;
    return { width, height };
}

function showSkipHint(skippable) {
    const el = document.getElementById('cutscene-skip-hint');
    if (!el) return;
    el.classList.toggle('visible', !!skippable);
    el.textContent = skippable ? 'Click or press ESC to skip' : '';
}

function bindSkipHandlers(skippable, onSkip) {
    unbindSkipHandlers();
    if (!skippable) return;

    skipHandler = (e) => {
        if (e.target?.closest?.('#export-wizard-modal.open, #insert-modal.open')) return;
        onSkip('skipped');
    };
    keyHandler = (e) => {
        if (e.key === 'Escape') onSkip('skipped');
    };
    document.addEventListener('click', skipHandler, true);
    document.addEventListener('keydown', keyHandler);
}

function unbindSkipHandlers() {
    if (skipHandler) document.removeEventListener('click', skipHandler, true);
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    skipHandler = null;
    keyHandler = null;
    showSkipHint(false);
}

async function resolveVideoUrl(source) {
    if (!source) throw new Error('No video source');
    const raw = String(source);
    if (/^https?:\/\//i.test(raw) || raw.startsWith('blob:')) return raw;

    const rel = normalizeVideoPath(raw);

    if (ThresholdShell.isNative) {
        const buf = await AssetBundle.readBinary(rel);
        if (buf) {
            const blob = new Blob([buf], { type: mimeFromPath(rel) });
            return URL.createObjectURL(blob);
        }
    }

    return AssetBundle.getUrl(rel);
}

function trackCatalogEntry(source) {
    const State = window.State;
    if (!State) return;
    if (!State.cinematicCatalog) State.cinematicCatalog = [];
    const path = normalizeVideoPath(source);
    if (!State.cinematicCatalog.some((e) => e.path === path)) {
        State.cinematicCatalog.push({
            path,
            file: path.split('/').pop(),
            addedAt: Date.now(),
        });
    }
}

export const Cinematic = {
    get playing() {
        return !!active;
    },

    get activeSource() {
        return active?.sourcePath || null;
    },

    async resolveUrl(source) {
        return resolveVideoUrl(source);
    },

    async listBundled() {
        const index = await AssetBundle.getIndex();
        const files = index?.files?.video || [];
        return files
            .filter((rel) => /\.(mp4|webm|ogg|m4v)$/i.test(rel))
            .map((rel) => ({
                path: rel.startsWith('video/') ? rel : `video/${rel}`,
                file: rel.split('/').pop(),
            }));
    },

    async play(source, options = {}) {
        const Engine = window.Engine;
        const State = window.State;
        if (!Engine?.camera || !Engine?.scene) {
            throw new Error('Engine not ready');
        }

        if (active) await this.stop('replaced');

        const sourcePath = normalizeVideoPath(source);
        const url = await resolveVideoUrl(source);
        trackCatalogEntry(sourcePath);

        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.playsInline = true;
        video.preload = 'auto';
        video.muted = !!options.muted;
        video.loop = !!options.loop;
        video.volume = typeof options.volume === 'number' ? options.volume : 1;
        video.src = url;

        await new Promise((resolve, reject) => {
            const onReady = () => {
                video.removeEventListener('loadeddata', onReady);
                video.removeEventListener('error', onErr);
                resolve();
            };
            const onErr = () => {
                video.removeEventListener('loadeddata', onReady);
                video.removeEventListener('error', onErr);
                reject(new Error(`Video failed to load: ${sourcePath}`));
            };
            video.addEventListener('loadeddata', onReady);
            video.addEventListener('error', onErr);
            video.load();
        });

        const texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const distance = options.distance ?? 4;
        const aspect = video.videoWidth > 0 && video.videoHeight > 0
            ? video.videoWidth / video.videoHeight
            : 16 / 9;
        const { width, height } = planeSizeForCamera(Engine.camera, distance, aspect);

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            toneMapped: false,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
        mesh.renderOrder = 9999;

        const root = new THREE.Group();
        root.name = 'ThresholdCutscene';
        root.add(mesh);
        Engine.camera.add(root);
        root.position.set(0, 0, -distance);

        const controlsWereEnabled = Engine.controls?.enabled !== false;
        if (Engine.controls) Engine.controls.enabled = false;
        if (State) State.cutscenePlaying = true;

        const skippable = options.skippable !== false;
        showSkipHint(skippable);

        const finish = async (reason) => {
            if (!active || active.finishToken !== finishToken) return;
            unbindSkipHandlers();
            if (Engine.controls && controlsWereEnabled) Engine.controls.enabled = true;
            if (State) State.cutscenePlaying = false;

            try {
                video.pause();
            } catch {
                /* ignore */
            }

            Engine.camera.remove(root);
            texture.dispose();
            material.dispose();
            mesh.geometry.dispose();

            if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            video.removeAttribute('src');
            video.load();

            const cb = active.onComplete;
            const meta = { source: sourcePath, reason };
            active = null;
            window.UI?.status?.(reason === 'ended' ? 'Cutscene ended' : 'Cutscene skipped');
            if (typeof cb === 'function') cb(meta);
            if (typeof options.onEnd === 'function') options.onEnd(meta);
        };

        const finishToken = Symbol('cutscene-finish');
        active = {
            sourcePath,
            file: sourcePath.split('/').pop(),
            url,
            video,
            texture,
            root,
            mesh,
            onComplete: options.onComplete || null,
            finishToken,
            stop: finish,
        };

        video.addEventListener('ended', () => finish('ended'), { once: true });

        if (skippable) {
            bindSkipHandlers(true, () => finish('skipped'));
        }

        try {
            await video.play();
        } catch (e) {
            await finish('error');
            throw e;
        }

        window.UI?.status?.(`Cutscene: ${active.file}`);
        return { playing: true, source: sourcePath, file: active.file };
    },

    async stop(reason = 'stopped') {
        if (!active) return { playing: false };
        await active.stop(reason);
        return { playing: false };
    },

    tick() {
        if (active?.video && !active.video.paused && !active.video.ended) {
            active.texture.needsUpdate = true;
        }
    },

    async hotReloadFromWatch(event = {}) {
        if (!active?.video) return null;
        const file = event.file || event.path?.split(/[/\\]/).pop();
        if (!file || (active.file !== file && !active.sourcePath?.endsWith(file))) return null;

        if (!event.watchUrl) return null;
        try {
            const url = `${event.watchUrl}${event.watchUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
            active.video.src = url;
            active.url = url;
            active.video.load();
            await active.video.play();
            window.UI?.status?.(`Cutscene hot-reloaded: ${file}`);
            return { reloaded: true, file };
        } catch (e) {
            window.UI?.status?.(e.message || 'Cutscene hot-reload failed');
            return null;
        }
    },

    collectExportEntries() {
        const State = window.State;
        const catalog = State?.cinematicCatalog || [];
        return catalog.map((entry) => ({
            path: entry.path,
            file: entry.file,
            note: 'Ship via npm run bundle:assets → video/ in dist-pages/bundle/',
        }));
    },
};

window.Cinematic = Cinematic;