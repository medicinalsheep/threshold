import './css/main.css';
import './css/engine.css';
import './css/compiler.css';
import './css/prompter.css';
import './css/responsive.css';
import './css/corner-hub.css';
import './css/lobby.css';
import './css/spectate.css';

import { VERSION } from './config.js';
import { initAuth } from './auth/main.js';
import './shared/runtime.js';
import { initLobby } from './lobby/main.js';
import { initSpectate } from './spectate/main.js';
import { ViewPrefs } from './shared/viewPrefs.js';
import { initFullscreen } from './shared/fullscreen.js';
import { initThresholdShell } from './shared/thresholdShell.js';
import { initSteamBridge } from './shared/steamBridge.js';
import './shared/voip.js';

console.log(`Starting Threshold Suite v${VERSION}...`);

if (window.matchMedia('(pointer: coarse)').matches) {
    document.body.classList.add('touch-device');
}

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

    const chromeTop = navH;
    document.documentElement.style.setProperty('--nav-height', `${navH}px`);
    document.documentElement.style.setProperty('--toolbar-height', `0px`);
    document.documentElement.style.setProperty('--chrome-top', `${chromeTop}px`);
    document.documentElement.style.setProperty('--dock-gutter', `0px`);
}

const updateNavHeight = updateChromeMetrics;

function setNavCollapsed(collapsed) {
    document.body.classList.toggle('nav-collapsed', collapsed);
    ViewPrefs.set('navCollapsed', collapsed);
    updateNavHeight();
    window.dispatchEvent(new Event('resize'));
}

const defaultNavCollapsed = ViewPrefs.get('navCollapsedEngine', true);
if (ViewPrefs.get('navCollapsed', defaultNavCollapsed)) {
    document.body.classList.add('nav-collapsed');
}

updateChromeMetrics();
window.addEventListener('resize', updateChromeMetrics);
window.addEventListener('immersive-change', updateChromeMetrics);

initFullscreen();

document.getElementById('nav-collapse-btn')?.addEventListener('click', () => setNavCollapsed(true));
document.getElementById('nav-restore-btn')?.addEventListener('click', () => setNavCollapsed(false));

window.addEventListener('threshold:enter-engine', () => {
    if (ViewPrefs.get('navCollapsedEngine', true) !== false) setNavCollapsed(true);
});

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
        const isSpectate = targetId === 'view-spectate';
        const showEngine = targetId === 'view-engine' || isSpectate;

        views.forEach((view) => {
            if (view.id === 'view-engine') {
                view.style.display = showEngine ? 'flex' : 'none';
            } else {
                view.style.display = view.id === targetId ? 'flex' : 'none';
            }
        });

        window.Spectate?.setActive(isSpectate);
        tabsContainer?.classList.remove('open');

        document.body.classList.toggle('engine-chrome', showEngine);

        if (showEngine) {
            if (ViewPrefs.get('navCollapsedEngine', true)) setNavCollapsed(true);
            setTimeout(() => {
                updateChromeMetrics();
                window.dispatchEvent(new Event('resize'));
            }, 10);
            window.UI?.setCodingPause?.(false);
            window.CornerHub?.syncModeBadge?.();
            window.HubLayout?.applyPositions?.();
        } else {
            setNavCollapsed(false);
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

initThresholdShell();
initSteamBridge();

initSpectate();

initLobby(async () => {
    const [engineMod, compilerMod, prompterMod] = await Promise.all([
        import('./engine/main.js'),
        import('./compiler/main.js'),
        import('./prompter/main.js'),
    ]);
    engineMod.initEngine();
    compilerMod.initCompiler();
    prompterMod.initPrompter();
});