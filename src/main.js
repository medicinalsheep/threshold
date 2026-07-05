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

console.log(`Starting Threshold Suite v${VERSION}...`);

const versionEl = document.getElementById('app-version');
if (versionEl) versionEl.textContent = `v${VERSION}`;

function updateNavHeight() {
    const nav = document.getElementById('app-nav');
    if (nav) document.documentElement.style.setProperty('--nav-height', `${nav.offsetHeight}px`);
}

updateNavHeight();
window.addEventListener('resize', updateNavHeight);

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
            setTimeout(() => window.dispatchEvent(new Event('resize')), 10);
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