/** Sprint J — [F] survival interactions */

export const SurvivalInteract = {
    activate(root) {
        const kind = root?.userData?.survivalKind;
        if (!kind) return false;

        const SN = window.SurvivalNeeds;
        if (!SN?.isActive?.()) {
            window.UI?.status?.('Spawn in walk mode to use survival props');
            return true;
        }

        const sourceId = root.userData?.id || root.name || kind;

        if (kind === 'rest') {
            const started = SN.startRestChannel?.(sourceId, 5800);
            if (started) {
                window.AudioSys?.playClip?.('starter_interior_coffee_murmur', 0.22);
            }
            window.ActionHints?.onFirstInteract?.();
            return true;
        }

        const ok = SN.applyInteract?.(kind, sourceId);
        if (ok) window.ActionHints?.onFirstInteract?.();
        return true;
    },
};

window.SurvivalInteract = SurvivalInteract;