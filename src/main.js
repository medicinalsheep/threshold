import './css/main.css';
import './css/engine.css';
import './css/compiler.css';
import './css/prompter.css';
import './css/responsive.css';
import './css/lobby.css';

import { VERSION } from './config.js';
import { initAuth } from './auth/main.js';
import './shared/runtime.js';
import { initLobby } from './lobby/main.js';
import { initEngine } from './engine/main.js';
import { initCompiler } from './compiler/main.js';
import { initPrompter } from './prompter/main.js';
import { ViewPrefs } from './shared/viewPrefs.js';
import { initFullscreen } from './shared/fullscreen.js';

console.log(`Starting Threshold Suite v${VERSION}...`);

const versionEl = document.getElementById('app-version');
if (versionEl) versionEl.textContent = `v${VERSION}`;

function isEngineViewActive() {
    const engine = document.getElementById('view-engine');
    if (!engine) return false;
    return engine.classList.contains('active') && engine.style.display !== 'none';
}

function updateChromeMetrics() {
    const immersive = document.body.classList.contains('ui-immersive');
    const collapsed = document.body.classList.contains('nav-collapsed');
    const nav = document.getElementById('app-nav');

    let navH = 0;
    if (!immersive && !collapsed) {
        navH = nav?.offsetHeight || 50;
    }

    let toolbarH = 0;
    if (!immersive && isEngineViewActive()) {
        const toolbar = document.querySelector('#view-engine .engine-toolbar');
        if (toolbar) {
            const rect = toolbar.getBoundingClientRect();
            toolbarH = Math.max(0, Math.ceil(rect.bottom));
        }
    }

    const chromeTop = Math.max(navH, toolbarH);
    document.documentElement.style.setProperty('--nav-height', `${navH}px`);
    document.documentElement.style.setProperty('--toolbar-height', `${toolbarH}px`);
    document.documentElement.style.setProperty('--chrome-top', `${chromeTop}px`);

    const dock = document.getElementById('scene-dock');
    let dockGutter = 0;
    if (!immersive && dock) {
        dockGutter = dock.classList.contains('expanded') ? 280 : 56;
    }
    document.documentElement.style.setProperty('--dock-gutter', `${dockGutter}px`);
}

const updateNavHeight = updateChromeMetrics;

function setNavCollapsed(collapsed) {
    document.body.classList.toggle('nav-collapsed', collapsed);
    ViewPrefs.set('navCollapsed', collapsed);
    updateNavHeight();
    window.dispatchEvent(new Event('resize'));
}

if (ViewPrefs.get('navCollapsed', false)) {
    document.body.classList.add('nav-collapsed');
}

updateChromeMetrics();
window.addEventListener('resize', updateChromeMetrics);
window.addEventListener('immersive-change', updateChromeMetrics);

initFullscreen();

document.getElementById('nav-collapse-btn')?.addEventListener('click', () => setNavCollapsed(true));
document.getElementById('nav-restore-btn')?.addEventListener('click', () => setNavCollapsed(false));

initAuth();

const tabs = document.querySelectorAll('.tab-btn');
const views = document.querySelectorAll('.view-section');
const navToggle = document.getElementById('nav-toggle');
const tabsContainer = document.getElementById('app-tabs');

tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const targetId = tab.getAttribute('data-target');
        views.forEach((view) => {
            view.style.display = view.id === targetId ? 'flex' : 'none';
        });

        tabsContainer?.classList.remove('open');

        if (targetId === 'view-engine') {
            setTimeout(() => {
                updateChromeMetrics();
                window.dispatchEvent(new Event('resize'));
            }, 10);
            window.UI?.setCodingPause?.(false);
        } else {
            setTimeout(updateChromeMetrics, 0);
        }
        if (targetId === 'view-compiler' || targetId === 'view-prompter') {
            window.UI?.setCodingPause?.(true);
        }
    });
});

navToggle?.addEventListener('click', () => {
    tabsContainer?.classList.toggle('open');
    setTimeout(updateNavHeight, 0);
});

document.getElementById('global-theme-btn')?.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    window.dispatchEvent(new CustomEvent('theme-change'));
});

initLobby(() => {
    initEngine();
    initCompiler();
    initPrompter();
});