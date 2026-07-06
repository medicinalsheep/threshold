/** Phase 15 — wildlife ambience: dog, cat, crickets/cicadas, owl, fish splash */

import { SITE, court } from './starterSiteLayout.js';

const grass = court(-4.2, 2.4);
const GRASS_ZONE = { x: grass.x, y: 0.2, z: grass.z, radius: 5, volume: 0.2 };
const cat = court(-7, 5);
const ALLEY_CAT = { x: cat.x, y: 0.35, z: cat.z, radius: 4 };
const CREEK_SPLASH = { x: SITE.creek.x, y: 0.2, z: SITE.creek.z, radius: 4.2 };
const DOG_NPC_ID = 'mechanic_npc';

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function dist3(a, b) {
    const dx = a.x - b.x;
    const dy = (a.y ?? 0) - (b.y ?? 0);
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function zoneVol(zone, pos, mul = 1) {
    const d = dist3(pos, zone);
    if (d >= zone.radius) return 0;
    const t = 1 - d / zone.radius;
    return zone.volume * t * t * mul;
}

export const WildlifeAmbient = {
    _active: false,
    _phase: 'day',
    _cicadaHandle: null,
    _cricketHandle: null,
    _cicadaStarting: false,
    _cricketStarting: false,
    _nextDog: 0,
    _nextCat: 0,
    _nextFish: 0,
    _nextOwl: 0,

    getHour() {
        return window.State?.env?.timeOfDay ?? 14;
    },

    getPhase(hour = this.getHour()) {
        if (hour >= 6 && hour < 18) return 'day';
        if (hour >= 18 && hour < 21) return 'dusk';
        return 'night';
    },

    _listenerPos() {
        const PC = window.PlayerController;
        if (PC?.spawned && PC.group) return PC.group.position;
        return window.Engine?.camera?.position;
    },

    _npcPos(id) {
        const obj = window.State?.objects?.find((o) => o.userData?.id === id);
        return obj?.position || null;
    },

    start() {
        if (this._active) return;
        this._active = true;
        const now = performance.now();
        this._nextDog = now + 12000;
        this._nextCat = now + 18000;
        this._nextFish = now + 8000;
        this._nextOwl = now + 22000;
        void this._applyPhase(this.getPhase());
    },

    async startStaggered() {
        if (this._active) return;
        this._active = true;
        const now = performance.now();
        this._nextDog = now + 12000;
        this._nextCat = now + 18000;
        this._nextFish = now + 8000;
        this._nextOwl = now + 22000;
        await delay(640);
        await this._applyPhase(this.getPhase());
    },

    stop() {
        this._active = false;
        this._cicadaHandle?.stop?.();
        this._cricketHandle?.stop?.();
        this._cicadaHandle = null;
        this._cricketHandle = null;
        this._cicadaStarting = false;
        this._cricketStarting = false;
    },

    onTimeOfDayChange(hour) {
        if (!this._active) return;
        void this._applyPhase(this.getPhase(hour));
    },

    async _applyPhase(phase) {
        this._phase = phase;
        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        if (rain > 0.65) {
            this._cicadaHandle?.setVolume?.(0);
            this._cricketHandle?.setVolume?.(0);
            return;
        }

        if (phase === 'day') {
            await this._ensureCicada(true);
            this._stopCricket();
        } else if (phase === 'night') {
            this._stopCicada();
            await this._ensureCricket(true);
        } else {
            await this._ensureCicada(true);
            await this._ensureCricket(true);
        }
        this._updateInsectVolumes();
    },

    async _ensureCicada(startIfMissing = false) {
        if (this._cicadaHandle || this._cicadaStarting) return;
        if (!startIfMissing) return;
        const AudioSys = window.AudioSys;
        if (!AudioSys?.playClipLoop) return;
        this._cicadaStarting = true;
        try {
            const handle = await AudioSys.playClipLoop('starter_amb_cicada', 0);
            if (this._active && (this._phase === 'day' || this._phase === 'dusk')) {
                this._cicadaHandle = handle;
            } else {
                handle?.stop?.();
            }
        } finally {
            this._cicadaStarting = false;
        }
    },

    async _ensureCricket(startIfMissing = false) {
        if (this._cricketHandle || this._cricketStarting) return;
        if (!startIfMissing) return;
        const AudioSys = window.AudioSys;
        if (!AudioSys?.playClipLoop) return;
        this._cricketStarting = true;
        try {
            const handle = await AudioSys.playClipLoop('starter_amb_crickets', 0);
            if (this._active && (this._phase === 'night' || this._phase === 'dusk')) {
                this._cricketHandle = handle;
            } else {
                handle?.stop?.();
            }
        } finally {
            this._cricketStarting = false;
        }
    },

    _stopCicada() {
        this._cicadaHandle?.stop?.();
        this._cicadaHandle = null;
    },

    _stopCricket() {
        this._cricketHandle?.stop?.();
        this._cricketHandle = null;
    },

    _updateInsectVolumes() {
        const pos = this._listenerPos();
        if (!pos) return;
        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        const rainMul = 1 - rain * 0.55;
        const grass = zoneVol(GRASS_ZONE, pos) * rainMul;

        let cicadaMul = 0;
        let cricketMul = 0;
        if (this._phase === 'day') cicadaMul = 1;
        else if (this._phase === 'night') cricketMul = 1;
        else {
            cicadaMul = 0.45;
            cricketMul = 0.55;
        }

        if (this._cicadaHandle?.setVolume) {
            this._cicadaHandle.setVolume(grass * cicadaMul);
        }
        if (this._cricketHandle?.setVolume) {
            this._cricketHandle.setVolume(grass * cricketMul);
        }
    },

    _playOneShot(clipId, vol, rate) {
        window.AudioSys?.playClipVariation?.(clipId, {
            volume: vol,
            playbackRate: rate ?? (0.92 + Math.random() * 0.14),
        });
    },

    tick(_dt) {
        if (!this._active || window.State?.isPaused) return;

        const phase = this.getPhase();
        if (phase !== this._phase) void this._applyPhase(phase);

        this._updateInsectVolumes();
        this._tickBirdsDuck();

        const now = performance.now();
        const pos = this._listenerPos();
        if (!pos) return;

        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        if (rain > 0.75) return;

        const sam = this._npcPos(DOG_NPC_ID);
        if (sam && now >= this._nextDog && dist3(pos, sam) < 5.5) {
            this._playOneShot('starter_wildlife_dog_bark', 0.42 + Math.random() * 0.2);
            this._nextDog = now + 14000 + Math.random() * 22000;
        }

        if (now >= this._nextCat && dist3(pos, ALLEY_CAT) < ALLEY_CAT.radius) {
            this._playOneShot('starter_wildlife_cat_meow', 0.38 + Math.random() * 0.18);
            this._nextCat = now + 16000 + Math.random() * 28000;
        }

        if (now >= this._nextFish && dist3(pos, CREEK_SPLASH) < CREEK_SPLASH.radius) {
            this._playOneShot('starter_wildlife_fish_splash', 0.32 + Math.random() * 0.22, 0.88 + Math.random() * 0.2);
            this._nextFish = now + 7000 + Math.random() * 14000;
        }

        const hour = this.getHour();
        const owlWindow = hour >= 17.5 || hour < 6.5;
        if (owlWindow && phase !== 'day' && now >= this._nextOwl) {
            this._playOneShot('starter_wildlife_owl_hoot', 0.28 + Math.random() * 0.2, 0.78 + Math.random() * 0.18);
            this._nextOwl = now + 28000 + Math.random() * 45000;
        }
    },

    _tickBirdsDuck() {
        const RA = window.RecordedAmbient;
        if (!RA?._birdHandle) return;
        const phase = this._phase;
        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        if (phase === 'night' || rain > 0.4) {
            RA._birdHandle.setVolume?.(0.02);
        } else if (RA._birdHandle.setVolume) {
            RA._birdHandle.setVolume(0.08 + (1 - rain) * 0.14);
        }
    },
};

window.WildlifeAmbient = WildlifeAmbient;

window.addEventListener('threshold:timeofday', (e) => {
    WildlifeAmbient.onTimeOfDayChange(e.detail?.hours);
});