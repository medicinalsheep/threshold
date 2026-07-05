import { ViewPrefs } from './viewPrefs.js';
import { ThresholdShell } from './thresholdShell.js';

function nativeElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function isNativeFullscreen() {
    return !!nativeElement();
}

function requestNative() {
    const el = document.documentElement;
    const fn = el.requestFullscreen?.bind(el) || el.webkitRequestFullscreen?.bind(el);
    if (!fn) return Promise.resolve(false);
    return fn().then(() => true).catch(() => false);
}

function exitNative() {
    const fn = document.exitFullscreen?.bind(document) || document.webkitExitFullscreen?.bind(document);
    if (!fn) return Promise.resolve();
    return fn().catch(() => {});
}

export function isImmersive() {
    return document.body.classList.contains('ui-immersive');
}

function syncButtons() {
    const on = isImmersive();
    const exit = document.getElementById('btn-exit-immersive');
    ['btn-fullscreen', 'btn-fullscreen-toolbar'].forEach((id) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.textContent = on ? 'EXIT' : 'FULL';
        btn.title = on ? 'Exit windowed fullscreen' : 'Windowed fullscreen';
        btn.setAttribute('aria-label', on ? 'Exit windowed fullscreen' : 'Enter windowed fullscreen');
    });
    if (exit) {
        exit.hidden = !on;
    }
}

export function setImmersive(on, { persist = true } = {}) {
    document.body.classList.toggle('ui-immersive', on);
    if (persist) ViewPrefs.set('immersive', on);
    syncButtons();
    window.dispatchEvent(new CustomEvent('immersive-change', { detail: { immersive: on } }));
    window.dispatchEvent(new Event('resize'));
}

/** Windowed fullscreen — hide UI chrome; native shell maximizes instead of exclusive fullscreen. */
export async function enterWindowedFullscreen() {
    if (ThresholdShell.isNative) {
        await ThresholdShell.enterFullscreen();
    }
    setImmersive(true);
}

export async function leaveWindowedFullscreen() {
    if (ThresholdShell.isNative) {
        await ThresholdShell.exitFullscreen();
    }
    setImmersive(false);
}

async function enterImmersive() {
    await enterWindowedFullscreen();
}

async function leaveImmersive() {
    await leaveWindowedFullscreen();
}

export async function toggleImmersive() {
    if (isImmersive()) {
        await leaveImmersive();
    } else {
        await enterImmersive();
    }
}

function onFullscreenChange() {
    if (!isNativeFullscreen() && isImmersive()) {
        setImmersive(false, { persist: true });
        return;
    }
    syncButtons();
    window.dispatchEvent(new Event('resize'));
}

function bindToggle(...ids) {
    ids.forEach((id) => {
        document.getElementById(id)?.addEventListener('click', () => toggleImmersive());
    });
}

export function initFullscreen() {
    bindToggle('btn-fullscreen', 'btn-fullscreen-toolbar');

    document.getElementById('btn-exit-immersive')?.addEventListener('click', () => {
        leaveImmersive();
    });

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    if (ViewPrefs.get('immersive', false)) {
        void enterImmersive();
    } else {
        syncButtons();
    }
}

export function isWindowedFullscreen() {
    return isImmersive();
}