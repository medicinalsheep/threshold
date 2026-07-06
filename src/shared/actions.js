import { Network } from './network.js';
import { Sync } from './sync.js';
import { Permissions } from './permissions.js';
import { Session } from './session.js';

export const Actions = {
    dispatch(action, payload = {}) {
        if (Network.mode === 'guest') {
            if (Permissions.isWorldEditAction(action) && !Permissions.canEditWorld(Session.playerKey)) {
                const msg = window.CollaborateGuard?.sceneLocked
                    ? 'Scene locked — ask host to unlock or run edits'
                    : 'Admin permission required';
                window.UI?.status?.(msg);
                return;
            }
            Network.sendToHost(action, payload);
            return;
        }

        Sync.applyAction(action, payload);

        if (Network.mode === 'host') {
            Network.scheduleBroadcast();
        }
    }
};