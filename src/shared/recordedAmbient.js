/** User-recorded foley + birds — tagged clips from field recording */

const PROPS_BY_TAG = {
    plastic: ['starter_crate', 'model_kiosk'],
    papers: ['ai_terminal', 'starter_banner'],
    water_jug: ['starter_crate'],
    metal_glass: ['glass_pane', 'starter_crate'],
    metal: ['starter_crate'],
};

const POOLS = {
    prop: [
        'starter_rec_plastic',
        'starter_rec_plastic_tap',
        'starter_rec_papers',
        'starter_rec_papers_short',
        'starter_rec_water_jug',
        'starter_rec_metal_glass',
        'starter_rec_metal_glass_b',
        'starter_rec_metal_tap',
    ],
    birds: ['starter_rec_birds'],
};

export const RecordedAmbient = {
    _birdHandle: null,
    _nextFoley: 0,
    _active: false,
    _tags: null,

    async _loadTags() {
        if (this._tags) return this._tags;
        try {
            const res = await fetch(window.AssetBundle?.getUrl?.('config/recorded-sound-tags.json') || '/bundle/config/recorded-sound-tags.json');
            if (res.ok) this._tags = await res.json();
        } catch { /* */ }
        return this._tags;
    },

    start() {
        this._active = true;
        this._nextFoley = performance.now() + 9000;
        void this._loadTags();
        this._startBirdLoop();
    },

    stop() {
        this._active = false;
        this._birdHandle?.stop?.();
        this._birdHandle = null;
    },

    async _startBirdLoop() {
        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        if (rain > 0.35) return;
        const AudioSys = window.AudioSys;
        if (!AudioSys?.playClipLoop) return;
        this._birdHandle?.stop?.();
        this._birdHandle = await AudioSys.playClipLoop('starter_rec_birds', 0.12);
    },

    _nearestProp(pos, tag) {
        const ids = PROPS_BY_TAG[tag] || [];
        const objects = window.State?.objects || [];
        let best = null;
        let bestD = Infinity;
        objects.forEach((obj) => {
            const id = obj.userData?.id;
            if (!ids.includes(id)) return;
            const dx = pos.x - obj.position.x;
            const dz = pos.z - obj.position.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < bestD) { bestD = d; best = obj; }
        });
        return bestD < 6 ? best : null;
    },

    _clipForTag(tag) {
        const list = (this._tags?.tags?.[tag] || []).map((t) => t.clipId);
        if (!list.length) {
            const fallback = {
                plastic: ['starter_rec_plastic', 'starter_rec_plastic_tap'],
                papers: ['starter_rec_papers', 'starter_rec_papers_short'],
                water_jug: ['starter_rec_water_jug'],
                metal_glass: ['starter_rec_metal_glass', 'starter_rec_metal_glass_b'],
                metal: ['starter_rec_metal_tap'],
            };
            const pool = fallback[tag];
            if (!pool?.length) return null;
            return pool[Math.floor(Math.random() * pool.length)];
        }
        return list[Math.floor(Math.random() * list.length)];
    },

    playTag(tag, opts = {}) {
        const clipId = opts.clipId || this._clipForTag(tag);
        if (!clipId) return;
        window.AudioSys?.playClipVariation?.(clipId, {
            volume: opts.volume ?? (0.45 + Math.random() * 0.25),
            playbackRate: opts.rate ?? (0.9 + Math.random() * 0.18),
        });
    },

    tick() {
        if (!this._active || window.State?.isPaused) return;
        const now = performance.now();
        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;

        if (rain > 0.4 && this._birdHandle) {
            this._birdHandle.stop?.();
            this._birdHandle = null;
        } else if (rain < 0.3 && !this._birdHandle) {
            this._startBirdLoop();
        }
        if (this._birdHandle?.setVolume) {
            this._birdHandle.setVolume(0.08 + (1 - rain) * 0.14);
        }

        if (now < this._nextFoley || rain > 0.7) return;
        const pos = window.PlayerController?.group?.position || window.Engine?.camera?.position;
        if (!pos) return;

        const tags = ['plastic', 'papers', 'water_jug', 'metal_glass'];
        const tag = tags[Math.floor(Math.random() * tags.length)];
        if (!this._nearestProp(pos, tag)) {
            this._nextFoley = now + 6000 + Math.random() * 8000;
            return;
        }

        this.playTag(tag, { volume: 0.35 + Math.random() * 0.3 });
        this._nextFoley = now + 11000 + Math.random() * 18000;
    },
};

window.RecordedAmbient = RecordedAmbient;
window.World.playRecordedSfx = (tag, opts) => RecordedAmbient.playTag(tag, opts);