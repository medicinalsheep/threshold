/** Minimal session chrome — SETUP always available; full tools opt-in */

import { ViewPrefs } from './viewPrefs.js';

const PREFS_KEY = 'sessionUiPrefs';

function loadPrefs() {
    return ViewPrefs.get(PREFS_KEY, { showAllTools: false });
}

function savePrefs(prefs) {
    ViewPrefs.set(PREFS_KEY, prefs);
}

function setNavTabVisible(selector, visible) {
    document.querySelectorAll(selector).forEach((el) => {
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

export const SessionUi = {
    prefs: loadPrefs(),

    init() {
        this.apply();
        this.bind();
    },

    isMinimal() {
        return !this.prefs.showAllTools;
    },

    setShowAllTools(on, { silent = false } = {}) {
        this.prefs.showAllTools = !!on;
        savePrefs(this.prefs);
        this.apply();
        if (!silent) {
            window.UI?.status?.(on ? 'All tools visible' : 'Minimal UI — SETUP tab for agents & briefs');
        }
    },

    apply() {
        const minimal = this.isMinimal();
        document.body.classList.toggle('ui-minimal', minimal);
        document.body.classList.toggle('ui-full-tools', !minimal);

        setNavTabVisible('[data-target="view-compiler"]', !minimal);
        setNavTabVisible('[data-target="view-prompter"]', !minimal);
        setNavTabVisible('[data-target="view-spectate"]', !minimal);

        setDockTabVisible('setup', true);
        setDockTabVisible('inspect', !minimal);
        setDockTabVisible('env', !minimal);
        setDockTabVisible('skin', !minimal);
        setDockTabVisible('sfx', !minimal);

        const restore = document.getElementById('dock-restore-btn');
        if (restore) restore.textContent = minimal ? 'SETUP' : 'SCENE';

        const toggle = document.getElementById('setup-show-all-tools');
        if (toggle) toggle.checked = !minimal;

        const survivalHud = document.getElementById('survival-needs-hud');
        if (survivalHud && minimal) survivalHud.classList.remove('visible', 'active');

        const tcCard = document.getElementById('tc-quest-card');
        if (tcCard) tcCard.classList.remove('visible');

        const proximity = document.getElementById('proximity-panel');
        if (proximity) proximity.classList.toggle('ui-locked', minimal);
    },

    bind() {
        document.getElementById('btn-open-setup')?.addEventListener('click', () => {
            window.SceneDock?.setFullyHidden?.(false, true);
            window.SceneDock?.openTab?.('setup');
        });

        document.getElementById('setup-show-all-tools')?.addEventListener('change', (e) => {
            this.setShowAllTools(e.target.checked);
        });

        document.getElementById('setup-open-export')?.addEventListener('click', () => {
            document.getElementById('toolbar-more-menu')?.classList.remove('open');
            window.QuickExportPlay?.start?.() || window.ExportWizard?.open?.();
        });

    },

    onSessionStart() {
        this.init();
        setTimeout(() => {
            window.UI?.status?.('Open SETUP — connect Grok/Ollama, start a design brief');
            window.SceneDock?.setFullyHidden?.(false, false);
            window.SceneDock?.openTab?.('setup');
            window.AgentStatus?.refresh?.();
        }, 600);
    },
};

window.SessionUi = SessionUi;
window.ProgressiveUi = SessionUi;