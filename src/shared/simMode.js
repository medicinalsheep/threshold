import { Permissions } from './permissions.js';

/**
 * PLAY = sim running · ARRANGE = pause + move props · EDIT = pause + gizmo/inspector
 * interactionMode on State: 'play' | 'arrange' | 'edit'
 */
export const SimMode = {
    mode() {
        const S = window.State;
        if (!S) return 'edit';
        if (S.interactionMode === 'arrange' || S.interactionMode === 'edit' || S.interactionMode === 'play') {
            return S.interactionMode;
        }
        return S.isPaused ? 'edit' : 'play';
    },

    isEdit() {
        // World-edit rights (insert, inspect) for both EDIT and ARRANGE
        return !!window.State?.isPaused;
    },

    isArrange() {
        return this.mode() === 'arrange';
    },

    isPlay() {
        return !window.State?.isPaused && this.mode() !== 'arrange';
    },

    canEditWorld() {
        if (this.isPlay()) return false;
        if (window.Session?.isSpectator || window.Network?.mode === 'spectate') return false;
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
        const m = this.mode();
        if (m === 'arrange') return 'ARRANGE';
        return this.isEdit() ? 'EDIT' : 'PLAY';
    },
};

window.SimMode = SimMode;
