import { Permissions } from './permissions.js';

export const SimMode = {
    isEdit() {
        return !!window.State?.isPaused;
    },

    isPlay() {
        return !window.State?.isPaused;
    },

    canEditWorld() {
        if (this.isPlay()) return false;
        const mode = window.Network?.mode;
        if (mode === 'solo' || mode === 'host') return true;
        return Permissions.canEditWorld(window.Session?.playerKey);
    },

    canEditObject(obj) {
        if (!obj) return false;
        if (obj.userData?.isPlayer) return false;
        return this.canEditWorld();
    },

    canEditPlayerSkin() {
        return !!window.PlayerController?.spawned;
    },

    label() {
        return this.isEdit() ? 'EDIT' : 'PLAY';
    }
};

window.SimMode = SimMode;