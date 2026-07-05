import { Network } from './network.js';
import { Sync } from './sync.js';

export const Actions = {
    dispatch(action, payload = {}) {
        if (Network.mode === 'guest') {
            Network.sendToHost(action, payload);
            return;
        }

        Sync.applyAction(action, payload);

        if (Network.mode === 'host') {
            Network.scheduleBroadcast();
        }
    }
};