/**
 * Phase I/N — optional KTX2/Basis transcoding for native builds.
 * Set window.__THRESHOLD_KTX2__ in Electron/Capacitor preload to enable path probing.
 */
import { ThresholdShell } from './thresholdShell.js';
import { AssetBundle } from './assetBundle.js';

let _ktx2Loader = null;

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
    if (!sourcePath || !ThresholdShell.isNative) return null;
    const ktx2Path = ktx2SiblingPath(sourcePath);
    if (!ktx2Path || ktx2Path === sourcePath) return null;
    const buf = await AssetBundle.readBinary(ktx2Path);
    return buf ? ktx2Path : null;
}

export const NativeTextureCodec = {
    get ktx2Enabled() {
        return ThresholdShell.isNative && !!window.__THRESHOLD_KTX2__;
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

    /** Returns original URL until basis_transcoder.wasm is bundled. */
    async resolveTextureUrl(url, meta = {}) {
        if (!this.ktx2Enabled || !meta?.ktx2Path) return url;
        if (!_ktx2Loader && window.THREE?.KTX2Loader) {
            _ktx2Loader = new window.THREE.KTX2Loader();
            _ktx2Loader.setTranscoderPath(`${import.meta.env.BASE_URL || '/'}basis/`);
        }
        return url;
    },

    note() {
        return this.ktx2Enabled
            ? 'KTX2 paths probed — bundle basis_transcoder.wasm to enable decode'
            : 'Set window.__THRESHOLD_KTX2__ in native shell to probe .ktx2 siblings';
    },
};

window.NativeTextureCodec = NativeTextureCodec;