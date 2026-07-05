const STORAGE_KEY = 'threshold-panel-layout-v1';
const MIN_W = 220;
const MIN_H = 140;

function readBounds() {
    const nav = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'), 10) || 50;
    const pad = 8;
    return {
        nav,
        pad,
        maxW: window.innerWidth - pad * 2,
        maxH: window.innerHeight - nav - pad * 2,
    };
}

function loadAll() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveOne(id, rect) {
    const all = loadAll();
    all[id] = rect;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function clampRect(rect) {
    const { nav, pad, maxW, maxH } = readBounds();
    const w = Math.min(Math.max(rect.w, MIN_W), maxW);
    const h = Math.min(Math.max(rect.h, MIN_H), maxH);
    const maxX = window.innerWidth - w - pad;
    const maxY = window.innerHeight - h - pad;
    return {
        x: Math.max(pad, Math.min(rect.x, maxX)),
        y: Math.max(nav + pad, Math.min(rect.y, maxY)),
        w,
        h,
    };
}

function defaultRect(panel, options = {}) {
    const { nav, pad, maxW, maxH } = readBounds();
    const w = Math.min(options.w || panel.offsetWidth || 400, maxW);
    const h = Math.min(options.h || panel.offsetHeight || 400, maxH);
    let x;
    let y;
    const anchor = options.anchor || 'center';

    if (anchor === 'top-left') {
        x = pad;
        y = nav + 60;
    } else if (anchor === 'top-right') {
        x = window.innerWidth - w - pad;
        y = nav + 60;
    } else if (anchor === 'bottom-right') {
        x = window.innerWidth - w - pad;
        y = window.innerHeight - h - 72;
    } else {
        x = (window.innerWidth - w) / 2;
        y = nav + pad + Math.max(0, (window.innerHeight - nav - h - pad * 2) / 2);
    }

    return clampRect({ x, y, w, h });
}

function applyRect(panel, rect) {
    panel.style.position = 'fixed';
    panel.style.left = `${rect.x}px`;
    panel.style.top = `${rect.y}px`;
    panel.style.width = `${rect.w}px`;
    panel.style.height = `${rect.h}px`;
    panel.style.transform = 'none';
    panel.style.margin = '0';
    panel.style.maxWidth = 'none';
    panel.style.maxHeight = 'none';
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
    panel._floatRect = rect;
}

function findHandle(panel, selector) {
    if (selector) {
        const el = panel.querySelector(selector);
        if (el) return el;
    }
    return panel.querySelector('.panel-drag-handle')
        || panel.querySelector('.insert-header')
        || panel.querySelector('h3');
}

function ensureScrollRegion(panel, handle, resizeEl) {
    if (panel.querySelector('.float-panel-scroll')) return;

    const scroll = document.createElement('div');
    scroll.className = 'float-panel-scroll';
    let node = handle?.nextElementSibling;
    while (node && node !== resizeEl) {
        const next = node.nextElementSibling;
        scroll.appendChild(node);
        node = next;
    }
    if (scroll.childNodes.length) {
        panel.insertBefore(scroll, resizeEl);
    }
}

export function setupFloatPanel(panel, options = {}) {
    if (!panel || panel.dataset.floatReady) return panel?._floatApi;

    const id = options.id || panel.id;
    if (!id) return null;

    panel.dataset.floatReady = '1';
    panel.classList.add('float-panel');

    const handle = findHandle(panel, options.handleSelector);
    if (handle) {
        handle.classList.add('panel-drag-handle');
        if (!handle.title) handle.title = 'Drag to move';
    }

    let resizeEl = panel.querySelector('.panel-resize-handle');
    if (!resizeEl) {
        resizeEl = document.createElement('div');
        resizeEl.className = 'panel-resize-handle';
        resizeEl.title = 'Drag to resize';
        panel.appendChild(resizeEl);
    }

    ensureScrollRegion(panel, handle, resizeEl);

    const saved = loadAll()[id];
    let rect = saved ? clampRect(saved) : defaultRect(panel, options.defaultSize);

    const api = {
        id,
        clamp: () => {
            rect = clampRect(rect);
            applyRect(panel, rect);
            saveOne(id, rect);
        },
        reset: () => {
            rect = defaultRect(panel, options.defaultSize);
            applyRect(panel, rect);
            saveOne(id, rect);
        },
    };

    applyRect(panel, rect);

    if (handle) {
        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('button, input, select, textarea, a, label')) return;
            e.preventDefault();

            const startX = e.clientX;
            const startY = e.clientY;
            const startRect = { ...rect };
            handle.setPointerCapture(e.pointerId);
            handle.classList.add('dragging');

            const onMove = (ev) => {
                rect = clampRect({
                    ...startRect,
                    x: startRect.x + (ev.clientX - startX),
                    y: startRect.y + (ev.clientY - startY),
                });
                applyRect(panel, rect);
            };

            const onUp = () => {
                handle.classList.remove('dragging');
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
                saveOne(id, rect);
            };

            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
        });
    }

    resizeEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startRect = { ...rect };
        resizeEl.setPointerCapture(e.pointerId);
        resizeEl.classList.add('resizing');

        const onMove = (ev) => {
            rect = clampRect({
                ...startRect,
                w: startRect.w + (ev.clientX - startX),
                h: startRect.h + (ev.clientY - startY),
            });
            applyRect(panel, rect);
        };

        const onUp = () => {
            resizeEl.classList.remove('resizing');
            resizeEl.removeEventListener('pointermove', onMove);
            resizeEl.removeEventListener('pointerup', onUp);
            saveOne(id, rect);
        };

        resizeEl.addEventListener('pointermove', onMove);
        resizeEl.addEventListener('pointerup', onUp);
    });

    panel._floatApi = api;
    return api;
}

export function ensurePanelVisible(selector) {
    const panel = document.querySelector(selector);
    panel?._floatApi?.clamp();
}

const PANEL_CONFIG = [
    { selector: '#insert-sheet', defaultSize: { w: 420, h: 440 } },
    { selector: '#bindings-sheet', defaultSize: { w: 440, h: 520 } },
    { selector: '#host-panel-sheet', defaultSize: { w: 400, h: 480 } },
    { selector: '#world-sheet', defaultSize: { w: 420, h: 520 } },
    { selector: '#env-panel', defaultSize: { w: 260, h: 320, anchor: 'top-left' } },
    { selector: '#inspector', defaultSize: { w: 280, h: 420, anchor: 'top-right' } },
    { selector: '#player-skin-panel', defaultSize: { w: 240, h: 300, anchor: 'bottom-right' } },
    { selector: '#json-modal', defaultSize: { w: 600, h: 500 } },
];

export function initPanelDrag() {
    PANEL_CONFIG.forEach(({ selector, defaultSize }) => {
        const el = document.querySelector(selector);
        if (el) setupFloatPanel(el, { defaultSize });
    });

    window.addEventListener('resize', () => {
        PANEL_CONFIG.forEach(({ selector }) => {
            document.querySelector(selector)?._floatApi?.clamp();
        });
    });
}

window.PanelDrag = { initPanelDrag, setupFloatPanel, ensurePanelVisible };