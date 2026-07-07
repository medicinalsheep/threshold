/**
 * L-shaped corner hubs — fullscreen toggles, pop-up menus, play vs edit chrome.
 */

import { ViewPrefs } from './viewPrefs.js';
import { SceneDock } from './sceneDock.js';
import { TouchControls } from './touchControls.js';
import { toggleImmersive, isImmersive } from './fullscreen.js';

let openHub = null;

function closeAllHubs() {
    document.querySelectorAll('.corner-hub.open').forEach((h) => h.classList.remove('open'));
    openHub = null;
}

function toggleHub(id) {
    const hub = document.querySelector(`.corner-hub[data-hub="${id}"]`);
    if (!hub) return;
    if (openHub === id) {
        closeAllHubs();
        return;
    }
    closeAllHubs();
    hub.classList.add('open');
    openHub = id;
}

function clickExisting(id) {
    document.getElementById(id)?.click();
}

export const CornerHub = {
    init() {
        const root = document.getElementById('corner-hubs');
        if (!root) return;

        document.getElementById('hub-mode-toggle')?.addEventListener('click', () => {
            window.UI?.togglePause?.();
        });

        document.getElementById('hub-agent')?.addEventListener('click', () => {
            window.AgentPortal?.show?.();
        });

        document.getElementById('hub-link')?.addEventListener('click', () => {
            clickExisting('btn-copy-link');
        });

        document.getElementById('hub-tools-toggle')?.addEventListener('click', () => toggleHub('tools'));

        document.getElementById('hub-play-toggle')?.addEventListener('click', () => toggleHub('play'));

        document.getElementById('hub-scene-toggle')?.addEventListener('click', () => toggleHub('scene'));

        root.addEventListener('click', (e) => {
            const action = e.target.closest('[data-hub-action]');
            if (!action) return;
            e.preventDefault();
            this.runAction(action.dataset.hubAction);
            closeAllHubs();
        });

        document.getElementById('hub-touch-quick')?.addEventListener('click', () => {
            TouchControls.toggle();
            window.UI?.updateTouchToggle?.();
            this.syncTouchButton();
        });

        document.getElementById('hub-walk-fly')?.addEventListener('click', () => {
            clickExisting('btn-control-mode');
            this.syncWalkFly();
        });

        document.getElementById('hub-fullscreen')?.addEventListener('click', () => {
            void toggleImmersive();
        });

        document.addEventListener('pointerdown', (e) => {
            if (!e.target.closest('.corner-hub')) closeAllHubs();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllHubs();
        });

        window.addEventListener('immersive-change', () => this.syncFullscreenButton());
        this.onModeChange(window.SimMode?.isEdit?.() ?? false);
        this.syncTouchButton();
        this.syncWalkFly();
        this.syncFullscreenButton();
        this.syncAgentChip();
    },

    openSceneTab(tabId) {
        SceneDock.setFullyHidden?.(false, true);
        SceneDock.openTab(tabId);
    },

    runAction(action) {
        const map = {
            setup: () => this.openSceneTab('setup'),
            env: () => (SceneDock.toggleTab?.('env') || this.openSceneTab('env')),
            inspect: () => this.openSceneTab('inspect'),
            skin: () => this.openSceneTab('skin'),
            sfx: () => this.openSceneTab('sfx'),
            compiler: () => document.querySelector('[data-target="view-compiler"]')?.click(),
            prompter: () => document.querySelector('[data-target="view-prompter"]')?.click(),
            insert: () => window.UI?.openInsert?.(),
            saveworld: () => clickExisting('btn-save-world'),
            worlds: () => clickExisting('btn-load-world'),
            exportplay: () => clickExisting('btn-export-play'),
            export: () => clickExisting('btn-export-game'),
            tutorial: () => clickExisting('btn-restart-walkthrough'),
            tutorialfull: () => clickExisting('btn-restart-walkthrough-full'),
            console: () => clickExisting('btn-console-toggle'),
            keys: () => clickExisting('btn-bindings'),
            pause: () => window.UI?.togglePause?.(),
        };
        map[action]?.();
    },

    onModeChange(isEdit) {
        document.body.classList.toggle('corner-edit-mode', isEdit);
        document.body.classList.toggle('corner-play-mode', !isEdit);
        closeAllHubs();

        const modeBtn = document.getElementById('hub-mode-toggle');
        if (modeBtn) {
            modeBtn.textContent = isEdit ? 'EDIT' : 'PLAY';
            modeBtn.classList.toggle('hub-mode-edit', isEdit);
            modeBtn.classList.toggle('hub-mode-play', !isEdit);
            modeBtn.title = isEdit ? 'Tap to PLAY (resume simulation)' : 'Tap to EDIT (pause & build)';
        }

        document.querySelectorAll('.hub-edit-only').forEach((el) => {
            el.hidden = !isEdit;
        });
        document.querySelectorAll('.hub-play-only').forEach((el) => {
            el.hidden = isEdit;
        });

        const sceneToggle = document.getElementById('hub-scene-toggle');
        if (sceneToggle) {
            sceneToggle.textContent = isEdit ? 'SCENE' : 'SKIN';
        }
    },

    syncModeBadge() {
        this.onModeChange(window.SimMode?.isEdit?.() ?? false);
    },

    syncTouchButton() {
        const btn = document.getElementById('hub-touch-quick');
        if (!btn) return;
        const on = document.body.classList.contains('touch-on');
        btn.textContent = on ? 'TOUCH ✓' : 'TOUCH';
        btn.classList.toggle('hub-active', on);
    },

    syncWalkFly() {
        const btn = document.getElementById('hub-walk-fly');
        const modeBtn = document.getElementById('btn-control-mode');
        if (btn && modeBtn) btn.textContent = modeBtn.textContent || 'WALK';
    },

    syncFullscreenButton() {
        const btn = document.getElementById('hub-fullscreen');
        if (!btn) return;
        const on = isImmersive();
        btn.textContent = on ? 'EXIT' : 'FULL';
        btn.classList.toggle('hub-active', on);
    },

    syncAgentChip() {
        const chip = document.getElementById('agent-reconnect-chip');
        const hub = document.getElementById('hub-agent');
        if (!hub || !chip) return;
        const state = chip.dataset.state || 'off';
        hub.classList.toggle('hub-agent-ok', state === 'ok');
        hub.classList.toggle('hub-agent-warn', state === 'warn');
    },

    pulseHub(hubId) {
        const hub = document.querySelector(`.corner-hub[data-hub="${hubId}"]`);
        hub?.classList.add('hub-pulse');
        setTimeout(() => hub?.classList.remove('hub-pulse'), 1200);
    },
};

window.CornerHub = CornerHub;