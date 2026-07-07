/** Session UI — stable panels; SETUP tab for agents; optional compact mode */

import { ViewPrefs } from './viewPrefs.js';

const PREFS_KEY = 'sessionUiPrefs';

function loadPrefs() {
    return ViewPrefs.get(PREFS_KEY, { compactMode: true });
}

function savePrefs(prefs) {
    ViewPrefs.set(PREFS_KEY, prefs);
}

export const SessionUi = {
    prefs: loadPrefs(),

    init() {
        this.apply();
        this.bind();
    },

    isCompact() {
        return !!this.prefs.compactMode;
    },

    /** @deprecated use setCompactMode */
    setShowAllTools(on, opts) {
        this.setCompactMode(!on, opts);
    },

    setCompactMode(on, { silent = false } = {}) {
        this.prefs.compactMode = !!on;
        savePrefs(this.prefs);
        this.apply();
        if (!silent) {
            window.UI?.status?.(on ? 'Compact UI — SETUP + toolbar essentials' : 'Full panels visible');
        }
    },

    apply() {
        const compact = this.isCompact();
        document.body.classList.toggle('ui-minimal', compact);
        document.body.classList.toggle('ui-full-tools', !compact);

        const restore = document.getElementById('dock-restore-btn');
        if (restore) restore.textContent = 'SCENE';

        const toggle = document.getElementById('setup-show-all-tools');
        if (toggle) toggle.checked = !compact;
    },

    bind() {
        document.getElementById('btn-open-setup')?.addEventListener('click', () => {
            window.SceneDock?.setFullyHidden?.(false, true);
            window.SceneDock?.openTab?.('setup');
        });

        document.getElementById('setup-show-all-tools')?.addEventListener('change', (e) => {
            this.setCompactMode(!e.target.checked);
        });

        document.getElementById('setup-open-export')?.addEventListener('click', () => {
            document.getElementById('toolbar-more-menu')?.classList.remove('open');
            window.QuickExportPlay?.start?.() || window.ExportWizard?.open?.();
        });

        document.getElementById('setup-open-portal')?.addEventListener('click', () => {
            window.AgentPortal?.show?.();
        });
    },

    onSessionStart() {
        this.init();
        window.AgentStatus?.refresh?.();
        window.AgentReconnectChip?.refresh?.();
    },
};

window.SessionUi = SessionUi;
window.ProgressiveUi = SessionUi;