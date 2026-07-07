/** Proximity interact — walk up to terminals / NPCs and press interact */

const DEFAULT_RADIUS = 2.4;

function getPlayerPosition() {
    const PC = window.PlayerController;
    if (PC?.spawned && PC.group) return PC.group.position;
    const cam = window.Engine?.camera;
    if (cam) return cam.position;
    return null;
}

function distToObject(pos, obj) {
    const p = obj.position;
    const dx = pos.x - p.x;
    const dy = pos.y - p.y;
    const dz = pos.z - p.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function findInteractRoot(obj) {
    if (!obj) return null;
    let node = obj;
    while (node) {
        if (node.userData?.interactAction || node.userData?.isAiTerminal) return node;
        node = node.parent;
    }
    return null;
}

export const WorldInteract = {
    _hintEl: null,
    _near: null,

    init() {
        this._hintEl = document.getElementById('interact-hint');
    },

    findNearest(maxRadius = DEFAULT_RADIUS) {
        const pos = getPlayerPosition();
        const State = window.State;
        if (!pos || !State?.objects?.length) return null;

        let best = null;
        let bestD = maxRadius;

        State.objects.forEach((obj) => {
            const root = findInteractRoot(obj);
            if (!root || root === window.PlayerController?.group) return;
            const r = root.userData.interactRadius ?? maxRadius;
            const d = distToObject(pos, root);
            if (d <= r && d < bestD) {
                bestD = d;
                best = root;
            }
        });

        return best;
    },

    activate(target) {
        const root = findInteractRoot(target) || target;
        if (!root) return false;

        if (root.userData?.isAiTerminal || root.userData?.soundTrigger === 'interact') {
            window.AudioSys?.playObjectSound?.(root, 'interact');
            if (root.userData?.isAiTerminal) {
                window.StarterSfx?.playStarterSfx?.('starter_terminal_chirp', 0.42);
            }
        }

        const action = root.userData.interactAction || 'agents';
        const label = root.userData.interactLabel || root.userData.name || 'Terminal';

        if (action === 'studio') {
            window.ProgressiveUi?.onStudioInteract?.();
            window.SceneDock?.openTab?.('agents');
            window.UI?.status?.(`${label} — Agents open · Compiler & PromptGen in toolbar`);
            return true;
        }
        if (action === 'agents') {
            window.SceneDock?.openTab?.('agents');
            window.UI?.status?.(`${label} — AI agents · attach Grok or local scripts`);
            return true;
        }
        if (action === 'skin') {
            window.SceneDock?.openTab?.('skin');
            window.UI?.status?.(`${label} — assign your local avatar / GLTF model`);
            return true;
        }
        if (action === 'prompter') {
            if (root.userData?.id === 'starter_tesla_journal') {
                window.StarterTeslaInteract182?.onJournalInteract?.(root);
            }
            document.querySelector('[data-target="view-prompter"]')?.click();
            window.UI?.status?.(`${label} — PromptGen open`);
            return true;
        }
        if (action === 'compiler') {
            document.querySelector('[data-target="view-compiler"]')?.click();
            window.UI?.status?.(`${label} — Compiler open`);
            return true;
        }
        if (action === 'insert') {
            window.UI?.openInsert?.();
            return true;
        }
        if (action === 'survival') {
            window.SurvivalInteract?.activate?.(root);
            return true;
        }
        if (action === 'rp') {
            const id = root.userData?.id;
            if (id === 'starter_interior_door') window.StarterInterior17?.onDoorInteract?.(root);
            if (id === 'starter_tesla_door') window.StarterTeslaLab18?.onDoorInteract?.(root);
            if (id === 'starter_tesla_exterior_door') window.StarterTeslaExterior18?.onDoorInteract?.(root);
            if (id === 'starter_elevator_kiosk') window.StarterInterior17?.onElevatorInteract?.(root);
            if (id === 'starter_shop_counter') window.StarterInterior17?.onShopInteract?.(root);
            if (id === 'starter_tesla_rotary') window.StarterTeslaInteract182?.onRotaryInteract?.(root);
            if (id === 'starter_tesla_journal') window.StarterTeslaInteract182?.onJournalInteract?.(root);
            if (id !== 'starter_tesla_journal' && id !== 'starter_tesla_rotary') {
                window.UI?.status?.(root.userData.interactHint || `${label} — RP interact`);
            }
            return true;
        }

        window.UI?.status?.(`${label} — interact`);
        window.ActionHints?.onFirstInteract?.();
        return true;
    },

    tryInteract() {
        const near = this.findNearest();
        if (near) return this.activate(near);
        return false;
    },

    tick() {
        const near = this.findNearest();
        const el = this._hintEl;
        if (!el) return;

        if (near && window.State?.controlMode === 'walk') {
            const label = near.userData.interactHint || near.userData.interactLabel || near.userData.name || 'Terminal';
            let suffix = '';
            const sk = near.userData.survivalKind;
            if (sk || near.userData.interactAction === 'survival') {
                suffix = window.SurvivalInteract?.getPreview?.(sk) || '';
            }
            el.textContent = `[F] ${label}${suffix}`;
            el.classList.add('visible');
            document.getElementById('proximity-panel')?.classList.add('has-hint');
            this._near = near;
        } else {
            el.classList.remove('visible');
            document.getElementById('proximity-panel')?.classList.remove('has-hint');
            this._near = null;
        }
    },
};

window.WorldInteract = WorldInteract;