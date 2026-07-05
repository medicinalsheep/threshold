import { Network } from './network.js';
import { Session } from './session.js';

const ADMIN_ONLY_ACTIONS = new Set([
    'RUN_CODE', 'INSERT_CHARACTER', 'INSERT_CUSTOM', 'INSERT_PLAYER',
    'INSERT_SAVED', 'CLEAR_WORLD', 'PAUSE', 'SET_ADMINS', 'UPDATE_HOST_BINDINGS'
]);

export const Permissions = {
    isWorldEditAction(action) {
        return ADMIN_ONLY_ACTIONS.has(action);
    },

    canEditWorld(fromKey) {
        const mode = Network.mode;
        if (mode === 'solo' || mode === 'host') return true;
        if (mode === 'guest') return Session.isAdmin(fromKey || Session.playerKey);
        return false;
    },

    canPause() {
        const mode = Network.mode;
        return mode === 'host' || mode === 'solo';
    },

    canEditHostBindings() {
        return Network.mode === 'host' || Network.mode === 'solo';
    },

    canManagePlayers() {
        return Network.mode === 'host';
    }
};

window.Permissions = Permissions;