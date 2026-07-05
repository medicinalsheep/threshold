/**
 * KTX2 / WebP texture path resolution — web + native.
 * Basis transcoder ships in public/basis/ (copied at bundle time).
 */
import { ThresholdShell } from './thresholdShell.js';
import { AssetBundle } from './assetBundle.js';

let _ktx2Loader = null;
let _ktx2Ready = false;

function ktx2SiblingPath(sourcePath = '') {
    if (!sourcePath) return null;
    return sourcePath.replace(/\.(png|jpe?g|webp)$/i, '.ktx2');
}

function webpSiblingPath(sourcePath = '') {
    if (!sourcePath || !/\.png$/i.test(sourcePath)) return null;
    return sourcePath.replace(/\.png$/i, '.webp');
}

async function probeWebpPath(sourcePath) {
    const webp = webpSiblingPath(sourcePath);
    if (!webp) return null;
    const blob = await AssetBundle.fetchBlob(webp);
    if (blob) return webp;
    if (ThresholdShell.isNative) {
        const buf = await AssetBundle.readBinary(webp);
        return buf ? webp : null;
    }
    return null;
}

async function probeKtx2Path(sourcePath) {
    if (!sourcePath) return null;
    const ktx2Path = ktx2SiblingPath(sourcePath);
    if (!ktx2Path || ktx2Path === sourcePath) return null;
    const blob = await AssetBundle.fetchBlob(ktx2Path);
    if (blob) return ktx2Path;
    if (ThresholdShell.isNative) {
        const buf = await AssetBundle.readBinary(ktx2Path);
        return buf ? ktx2Path : null;
    }
    return null;
}

async function ensureKtx2Loader() {
    if (_ktx2Ready) return _ktx2Loader;
    const KTX2 = window.KTX2Loader;
    const renderer = window.Engine?.renderer;
    if (!KTX2 || !renderer) return null;
    if (!_ktx2Loader) {
        _ktx2Loader = new KTX2();
        const base = `${import.meta.env.BASE_URL || '/'}basis/`;
        _ktx2Loader.setTranscoderPath(base);
        _ktx2Loader.detectSupport(renderer);
    }
    _ktx2Ready = true;
    return _ktx2Loader;
}

export const NativeTextureCodec = {
    get ktx2Enabled() {
        return !!window.__THRESHOLD_KTX2__;
    },

    ktx2SiblingPath,

    async resolveSourcePath(sourcePath = '', meta = {}) {
        const explicit = meta.ktx2Path || meta.sourceKtx2;
        if (explicit) return explicit;
        if (this.ktx2Enabled) {
            const ktx2 = await probeKtx2Path(sourcePath);
            if (ktx2) return ktx2;
        }
        const webp = await probeWebpPath(sourcePath);
        return webp || sourcePath;
    },

    async loadTextureFromUrl(url, { isKtx2 = false } = {}) {
        if (isKtx2 || /\.ktx2$/i.test(url)) {
            const ktx = await ensureKtx2Loader();
            if (ktx) return ktx.loadAsync(url);
        }
        return new Promise((resolve, reject) => {
            const tl = new window.THREE.TextureLoader();
            tl.load(url, resolve, undefined, reject);
        });
    },

    async resolveTextureUrl(url, meta = {}) {
        return url;
    },

    note() {
        return this.ktx2Enabled
            ? 'KTX2 + WebP siblings probed at runtime'
            : 'KTX2 disabled — WebP/PNG only';
    },
};

window.NativeTextureCodec = NativeTextureCodec;