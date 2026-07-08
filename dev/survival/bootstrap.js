/**
 * Opt-in survival vitals pack — NOT bundled in default GitHub Pages build.
 * Load via VITE_SURVIVAL_DEV=true (npm run dev:survival).
 */
import './survivalNeeds.js';
import './survivalZones.js';
import './survivalInteract.js';
import './survivalWorldHooks.js';
import './survivalNeedsHud.js';
import './survivalGameplay.js';

export function initSurvivalDev() {
    window.initSurvivalNeeds?.();
    window.initSurvivalNeedsHud?.();
    window.initSurvivalGameplay?.();
    const hooks = window.applySurvivalWorldHooks?.();
    if (hooks?.patched) {
        window.UI?.status?.(`Survival dev pack — ${hooks.patched} world hook(s) patched`);
    } else {
        window.UI?.status?.('Survival dev pack loaded — tag props with survivalKind in BUILD');
    }
    return hooks;
}