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
        btn.title = expanded ? 'Hide scene panel' : 'Show scene panel';
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

function setFullyHidden(hidden, persist = true) {
    const dock = document.getElementById('scene-dock');
    const restore = document.getElementById('dock-restore-btn');
    if (!dock) return;
    dock.classList.toggle('dock-full-hidden', hidden);
    restore?.classList.toggle('visible', hidden);
    if (hidden) {
        setExpanded(false, persist);
        panels().forEach((panel) => {
            panel.style.display = 'none';
            panel.classList.remove('dock-active');
        });
        tabs().forEach((tab) => tab.classList.remove('active'));
        dock.classList.remove('has-panel');
        activeTab = null;
    }
    if (persist) ViewPrefs.set('dockHidden', hidden);
    window.dispatchEvent(new Event('resize'));
}

export const SceneDock = {
    init() {
        const dock = document.getElementById('scene-dock');
        if (!dock) return;

        const lastTab = ViewPrefs.get('dockTab', null);
        const hidden = ViewPrefs.get('dockHidden', false);
        const expanded = !hidden && ViewPrefs.get('dockExpanded', false) && !!lastTab;
        setFullyHidden(hidden, false);
        setExpanded(expanded, false);
        if (lastTab && expanded) this.openTab(lastTab);

        tabs().forEach((tab) => {
            tab.addEventListener('click', () => {
                setFullyHidden(false, true);
                this.openTab(tab.dataset.dockTab);
            });
        });

        document.getElementById('dock-collapse')?.addEventListener('click', () => {
            const dock = document.getElementById('scene-dock');
            if (dock?.classList.contains('dock-full-hidden')) {
                setFullyHidden(false, true);
                setExpanded(true, true);
                const tab = activeTab || ViewPrefs.get('dockTab', 'inspect');
                this.openTab(tab);
                return;
            }
            if (dock?.classList.contains('expanded')) {
                setExpanded(false, true);
                this.closeTab();
            } else {
                setFullyHidden(false, true);
                setExpanded(true, true);
                this.openTab(activeTab || ViewPrefs.get('dockTab', 'inspect'));
            }
        });

        document.getElementById('dock-restore-btn')?.addEventListener('click', () => {
            setFullyHidden(false, true);
            setExpanded(true, true);
            const minimal = document.body.classList.contains('ui-minimal');
            const tab = activeTab || ViewPrefs.get('dockTab', minimal ? 'setup' : 'inspect');
            this.openTab(tab);
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

        setFullyHidden(false, true);
        activeTab = tabId;
        setExpanded(true);

        panels().forEach((panel) => {
            const match = panel.dataset.dockPanel === tabId;
            panel.classList.toggle('dock-active', match);
            panel.style.display = match ? '' : 'none';
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

    setFullyHidden(hidden, persist = true) {
        setFullyHidden(hidden, persist);
    },
};

window.SceneDock = SceneDock;