/** UI unlocks as the user builds — start minimal, grow on intent. */

import { ViewPrefs } from './viewPrefs.js';

const UNLOCKS_KEY = 'progressiveUnlocks';

function loadUnlocks() {
    return ViewPrefs.get(UNLOCKS_KEY, {});
}

function saveUnlocks(unlocks) {
    ViewPrefs.set(UNLOCKS_KEY, unlocks);
}

function setTabVisible(tabSelector, visible) {
    document.querySelectorAll(tabSelector).forEach((el) => {
        el.classList.toggle('ui-locked', !visible);
        el.style.display = visible ? '' : 'none';
    });
}

function setDockTabVisible(tabId, visible) {
    document.querySelectorAll(`[data-dock-tab="${tabId}"]`).forEach((el) => {
        el.classList.toggle('ui-locked', !visible);
        el.style.display = visible ? '' : 'none';
    });
}

export const ProgressiveUi = {
    unlocks: loadUnlocks(),

    init() {
        this.applyAll();
        this.bindHooks();
    },

    isUnlocked(key) {
        return !!this.unlocks[key];
    },

    unlock(key, { silent = false } = {}) {
        if (this.unlocks[key]) return false;
        this.unlocks[key] = true;
        saveUnlocks(this.unlocks);
        this.applyAll();
        if (!silent) {
            const labels = {
                dock: 'Scene panel unlocked',
                compiler: 'Compiler tab unlocked',
                prompter: 'PromptGen tab unlocked',
                agents: 'AI agents unlocked',
                toolbar: 'Toolbar tools unlocked',
            };
            window.UI?.status?.(labels[key] || 'New tools available');
        }
        return true;
    },

    applyAll() {
        const u = this.unlocks;
        const minimal = !u.toolbar;

        document.body.classList.toggle('ui-minimal', minimal);
        document.body.classList.toggle('ui-dock-locked', !u.dock);

        setTabVisible('[data-target="view-compiler"]', u.compiler);
        setTabVisible('[data-target="view-prompter"]', u.prompter);

        setDockTabVisible('inspect', u.dock);
        setDockTabVisible('env', u.dock);
        setDockTabVisible('skin', u.dock);
        setDockTabVisible('sfx', u.dock);
        setDockTabVisible('agents', u.agents);

        const dock = document.getElementById('scene-dock');
        if (dock && !u.dock) {
            window.SceneDock?.closeTab?.();
            window.SceneDock?.setFullyHidden?.(true, false);
        }

        const survivalHud = document.getElementById('survival-needs-hud');
        if (survivalHud && minimal) survivalHud.classList.remove('visible', 'active');

        const proximity = document.getElementById('proximity-panel');
        if (proximity) proximity.classList.toggle('ui-locked', !u.dock);

        const tcCard = document.getElementById('tc-quest-card');
        if (tcCard) tcCard.classList.remove('visible');
    },

    bindHooks() {
        const Network = window.Network;
        if (Network?.mode === 'host' || Network?.mode === 'solo') {
            this.unlock('toolbar', { silent: true });
        }

        window.addEventListener('threshold:object-added', () => {
            const count = window.State?.objects?.filter((o) => !o.userData?.locked)?.length || 0;
            const total = window.State?.objects?.length || 0;
            if (total >= 2) this.unlock('dock', { silent: count < 3 });
            if (total >= 3) this.unlock('compiler', { silent: true });
            if (total >= 4) this.unlock('prompter', { silent: true });
        });

        document.getElementById('ctx-insert')?.addEventListener('click', () => {
            this.unlock('dock', { silent: true });
            this.unlock('compiler', { silent: true });
        });

        document.querySelector('[data-target="view-compiler"]')?.addEventListener('click', () => {
            this.unlock('compiler', { silent: true });
        });

        document.querySelector('[data-target="view-prompter"]')?.addEventListener('click', () => {
            this.unlock('prompter', { silent: true });
        });
    },

    onHostSession() {
        this.unlock('toolbar', { silent: true });
        this.unlock('agents', { silent: true });
    },

    onStudioInteract() {
        this.unlock('agents', { silent: true });
        this.unlock('compiler', { silent: true });
        this.unlock('dock', { silent: true });
    },

    resetForNewWorld() {
        this.unlocks = {};
        saveUnlocks(this.unlocks);
        this.applyAll();
    },
};

window.ProgressiveUi = ProgressiveUi;