export const VIDEO_MANIFEST_FORMAT = 'threshold-video-manifest';
export const VIDEO_MANIFEST_NAME = 'threshold_video_manifest.json';

export const VideoManifest = {
    parse(raw) {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid video manifest JSON');
        }
        if (data.format && data.format !== VIDEO_MANIFEST_FORMAT) {
            throw new Error(`Expected ${VIDEO_MANIFEST_FORMAT}, got ${data.format}`);
        }
        if (!Array.isArray(data.videos)) {
            throw new Error('Manifest missing videos array');
        }
        return data;
    },

    entries(manifest) {
        return (manifest?.videos || []).map((entry) => ({
            id: entry.id || entry.file?.replace(/\.[^.]+$/, '') || 'video',
            label: entry.label || entry.id || entry.file,
            file: entry.file,
            path: entry.path || `video/${entry.file}`,
            loop: !!entry.loop,
            skippable: entry.skippable !== false,
        }));
    },

    summarize(manifest) {
        return this.entries(manifest).map((e) => `${e.id}: ${e.path}`).join(' · ');
    },
};

window.VideoManifest = VideoManifest;