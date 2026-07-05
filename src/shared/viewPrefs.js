const PREFIX = 'threshold-view-';

export const ViewPrefs = {
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(PREFIX + key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch {
            return fallback;
        }
    },

    set(key, value) {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
    },
};