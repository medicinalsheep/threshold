/**
 * Phase I scaffold — optional KTX2/Basis transcoding for native builds.
 * Full transcoding requires @loaders.gl/textures or basis_transcoder.wasm in a future release.
 */
import { ThresholdShell } from './thresholdShell.js';

export const NativeTextureCodec = {
    get ktx2Enabled() {
        return ThresholdShell.isNative && !!window.__THRESHOLD_KTX2__;
    },

    /** Returns original URL until KTX2 pipeline is wired. */
    async resolveTextureUrl(url, meta = {}) {
        if (!this.ktx2Enabled || !meta?.ktx2Path) return url;
        return url;
    },

    note() {
        return this.ktx2Enabled
            ? 'KTX2 flag set — transcoder not bundled yet; serving PNG/WebP'
            : 'Set window.__THRESHOLD_KTX2__ in native shell to enable KTX2 path (scaffold)';
    },
};

window.NativeTextureCodec = NativeTextureCodec;