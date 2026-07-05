import { ViewPrefs } from './viewPrefs.js';

let activeTab = null;

function panels() {
    return document.querySelectorAll('[data-dock-panel]');
}

function tabs() {
    return document.querySelectorAll('[data-dock-tab]');
}

function setExpanded(expanded, persist = true) {
    const dock = document.getElementById('scene-dock');
    if (!dock) return;
    dock.classList.toggle('expanded', expanded);
    dock.classList.toggle('collapsed', !expanded);
    const btn = document.getElementById('dock-collapse');
    if (btn) {
        btn.textContent = expanded ? '▶' : '◀';
        btn.title = expanded ? 'Collapse panel dock' : 'Expand panel dock';
    }
    if (persist) ViewPrefs.set('dockExpanded', expanded);

    const api = dock?._floatApi;
    if (api) {
        if (expanded) api.ensureMinWidth(300);
        else api.ensureMinWidth(56);
        api.clamp();
    }

    window.dispatchEvent(new Event('resize'));
}

export const SceneDock = {
    init() {
        const dock = document.getElementById('scene-dock');
        if (!dock) return;

        const lastTab = ViewPrefs.get('dockTab', null);
        const expanded = ViewPrefs.get('dockExpanded', false) && !!lastTab;
        setExpanded(expanded, false);
        if (lastTab) this.openTab(lastTab);

        tabs().forEach((tab) => {
            tab.addEventListener('click', () => this.openTab(tab.dataset.dockTab));
        });

        document.getElementById('dock-collapse')?.addEventListener('click', () => {
            const isExpanded = dock.classList.contains('expanded');
            setExpanded(!isExpanded);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#scene-dock') && !e.target.closest('#btn-env-toggle')) {
                return;
            }
        });
    },

    openTab(tabId) {
        const dock = document.getElementById('scene-dock');
        if (!dock || !tabId) return;

        activeTab = tabId;
        setExpanded(true);

        panels().forEach((panel) => {
            const match = panel.dataset.dockPanel === tabId;
            panel.classList.toggle('dock-active', match);
            panel.style.display = match ? 'block' : 'none';
            if (match) panel.classList.remove('hidden');
        });

        tabs().forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.dockTab === tabId);
        });

        dock.classList.add('has-panel');
        ViewPrefs.set('dockTab', tabId);
    },

    closeTab() {
        const dock = document.getElementById('scene-dock');
        panels().forEach((panel) => {
            panel.style.display = 'none';
            panel.classList.remove('dock-active');
        });
        tabs().forEach((tab) => tab.classList.remove('active'));
        dock?.classList.remove('has-panel');
        activeTab = null;
    },

    toggleTab(tabId) {
        if (activeTab === tabId && document.getElementById('scene-dock')?.classList.contains('expanded')) {
            this.closeTab();
            setExpanded(false);
        } else {
            this.openTab(tabId);
        }
    },

    restoreLastTab() {
        const last = ViewPrefs.get('dockTab', null);
        if (last) this.openTab(last);
    },

    refreshSoundLibrary() {
        window.UI?.renderSoundLibrary?.();
    },
};

window.SceneDock = SceneDock;