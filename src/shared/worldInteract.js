/** Proximity interact — walk up to terminals / NPCs and press interact (F) */

const DEFAULT_RADIUS = 2.8;

function getPlayerPosition() {
    const PC = window.PlayerController;
    if (PC?.spawned && PC.group) return PC.group.position;
    const cam = window.Engine?.camera;
    if (cam) return cam.position;
    return null;
}

/** Horizontal-first distance (tall kiosks still register at player feet). */
function distToObject(pos, obj) {
    let cx = obj.position?.x ?? 0;
    let cy = obj.position?.y ?? 0;
    let cz = obj.position?.z ?? 0;
    try {
        const THREE = window.THREE;
        if (THREE && obj.isObject3D) {
            const box = new THREE.Box3().setFromObject(obj);
            if (Number.isFinite(box.min.x) && Number.isFinite(box.max.x)) {
                const c = box.getCenter(new THREE.Vector3());
                cx = c.x;
                cy = c.y;
                cz = c.z;
            } else {
                const wp = new THREE.Vector3();
                obj.getWorldPosition(wp);
                cx = wp.x;
                cy = wp.y;
                cz = wp.z;
            }
        }
    } catch {
        /* keep local position */
    }
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const horiz = Math.sqrt(dx * dx + dz * dz);
    const dy = Math.abs(pos.y - cy);
    if (dy > 2.5) return horiz + (dy - 2.5) * 0.35;
    return horiz;
}

function isInteractable(node) {
    if (!node?.userData) return false;
    const u = node.userData;
    return !!(
        u.interactAction
        || u.isAiTerminal
        || u.interactHint
        || u.interactLabel
        || u.soundTrigger === 'interact'
        || u.survivalKind
    );
}

function findInteractRoot(obj) {
    if (!obj) return null;
    let node = obj;
    while (node) {
        if (isInteractable(node)) return node;
        node = node.parent;
    }
    return null;
}

function findInteractInTree(obj) {
    if (!obj) return null;
    const self = findInteractRoot(obj);
    if (self) return self;
    let found = null;
    obj.traverse?.((c) => {
        if (!found && isInteractable(c)) found = c;
    });
    return found;
}

export const WorldInteract = {
    _hintEl: null,
    _panelEl: null,
    _near: null,

    init() {
        this._hintEl = document.getElementById('interact-hint');
        this._panelEl = document.getElementById('proximity-panel');
    },

    findNearest(maxRadius = DEFAULT_RADIUS) {
        const pos = getPlayerPosition();
        const State = window.State;
        if (!pos || !State?.objects?.length) return null;

        let best = null;
        let bestD = maxRadius;

        State.objects.forEach((obj) => {
            if (obj === window.PlayerController?.group) return;
            const root = findInteractInTree(obj);
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
        const root = findInteractRoot(target) || findInteractInTree(target) || target;
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
            window.SessionUi?.setShowAllTools?.(true, { silent: true });
            window.SceneDock?.openTab?.('setup');
            window.UI?.status?.(`${label} — Agents open · Compiler & PromptGen in toolbar`);
            return true;
        }
        if (action === 'agents') {
            window.AgentPortal?.openFromTerminal?.();
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
        const el = this._hintEl || document.getElementById('interact-hint');
        const panel = this._panelEl || document.getElementById('proximity-panel');
        if (!el) return;

        const editing = document.body.classList.contains('hub-layout-edit');
        const walk = window.State?.controlMode === 'walk';

        if (near && walk) {
            const label = near.userData.interactHint || near.userData.interactLabel || near.userData.name || 'Interact';
            let suffix = '';
            const sk = near.userData.survivalKind;
            if (sk || near.userData.interactAction === 'survival') {
                suffix = window.SurvivalInteract?.getPreview?.(sk) || '';
            }
            // Key is shown in .proximity-key — keep text clean
            el.textContent = `${label}${suffix}`;
            el.classList.add('visible');
            panel?.classList.add('has-hint');
            panel?.classList.remove('proximity-idle');
            this._near = near;
        } else {
            el.classList.remove('visible');
            panel?.classList.remove('has-hint');
            this._near = null;
            if (editing) {
                el.textContent = 'Proximity chip — drag to place';
                panel?.classList.add('proximity-idle');
            } else {
                panel?.classList.remove('proximity-idle');
                el.textContent = '';
            }
        }
    },
};

window.WorldInteract = WorldInteract;
