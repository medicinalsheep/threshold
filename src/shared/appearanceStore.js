/** AppearanceStore — player profile persistence (R8.2) */

import {
    DEFAULT_PROFILE,
    normalizeProfile,
    profileFromLegacyAppearance,
    profileForNetwork,
} from './appearanceProfile.js';

const STORAGE_KEY = 'threshold_player_appearance_v1';

export const AppearanceStore = {
    getPlayerProfile() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return normalizeProfile(JSON.parse(raw));
        } catch { /* fresh */ }
        return normalizeProfile(DEFAULT_PROFILE);
    },

    setPlayerProfile(profile) {
        const p = normalizeProfile(profile);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        } catch (e) {
            console.warn('[appearance-store]', e);
        }
        return p;
    },

    getNetworkProfile() {
        return profileForNetwork(this.getPlayerProfile());
    },

    fromLegacy(appearance) {
        return profileFromLegacyAppearance(appearance);
    },
};

window.AppearanceStore = AppearanceStore;