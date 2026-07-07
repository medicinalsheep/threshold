const STORAGE_KEY = 'threshold-panel-layout-v3';
const MIN_W = 220;
const MIN_H = 140;

function viewportSize() {
    const vv = window.visualViewport;
    return {
        w: Math.round(vv?.width ?? window.innerWidth),
        h: Math.round(vv?.height ?? window.innerHeight),
    };
}

function readBounds() {
    const root = getComputedStyle(document.documentElement);
    const chromeTop = parseInt(root.getPropertyValue('--chrome-top'), 10)
        || parseInt(root.getPropertyValue('--nav-height'), 10)
        || 50;
    const pad = 8;
    const vp = viewportSize();
    return {
        nav: chromeTop,
        pad,
        maxW: vp.w - pad * 2,
        maxH: vp.h - chromeTop - pad * 2,
    };
}

function loadAll() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveOne(id, rect, locked) {
    const all = loadAll();
    all[id] = { ...rect, locked: !!locked };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function clampRect(rect, limits = {}) {
    const { nav, pad, maxW, maxH } = readBounds();
    const minW = limits.minW ?? MIN_W;
    const minH = limits.minH ?? MIN_H;
    const capW = limits.maxW ?? maxW;
    const capH = limits.maxH ?? maxH;
    const w = Math.min(Math.max(rect.w, minW), capW);
    const h = Math.min(Math.max(rect.h, minH), capH);
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
    const limits = options.limits || {};
    const w = Math.min(options.w || panel.offsetWidth || 400, limits.maxW ?? maxW);
    const h = Math.min(options.h || panel.offsetHeight || 400, limits.maxH ?? maxH);
    let x;
    let y;
    const anchor = options.anchor || 'center';

    const vpH = window.innerHeight;
    const usableH = vpH - nav - pad * 2;

    if (anchor === 'top-left') {
        x = pad;
        y = nav + pad;
    } else if (anchor === 'left-center') {
        x = pad;
        y = nav + pad + Math.max(0, (usableH - h) / 2);
    } else if (anchor === 'top-right') {
        x = window.innerWidth - w - pad;
        y = nav + pad;
    } else if (anchor === 'right-center') {
        x = window.innerWidth - w - pad;
        y = nav + pad + Math.max(0, (usableH - h) / 2);
    } else if (anchor === 'bottom-right') {
        x = window.innerWidth - w - pad;
        y = window.innerHeight - h - 72;
    } else if (anchor === 'bottom-center') {
        x = (window.innerWidth - w) / 2;
        y = window.innerHeight - h - 72;
    } else {
        x = (window.innerWidth - w) / 2;
        y = nav + pad + Math.max(0, usableH / 2);
    }

    return clampRect({ x, y, w, h }, limits);
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
    return panel.querySelector('.panel-chrome-header')
        || panel.querySelector('.panel-drag-handle')
        || panel.querySelector('.insert-header')
        || panel.querySelector('h3');
}

function ensureScrollRegion(panel, handle, resizeEl, contentSelector) {
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

function syncLockUi(panel, lockBtn, locked) {
    panel.classList.toggle('panel-locked', locked);
    if (lockBtn) {
        lockBtn.textContent = locked ? '🔒' : 'LOCK';
        lockBtn.title = locked ? 'Unlock to move or resize' : 'Lock position';
        lockBtn.setAttribute('aria-pressed', locked ? 'true' : 'false');
    }
}

export function setupFloatPanel(panel, options = {}) {
    if (!panel || panel.dataset.floatReady) return panel?._floatApi;

    const id = options.id || panel.id;
    if (!id) return null;

    const limits = {
        minW: options.minW ?? MIN_W,
        minH: options.minH ?? MIN_H,
        maxW: options.maxW,
        maxH: options.maxH,
    };

    panel.dataset.floatReady = '1';
    panel.classList.add('float-panel');

    const handle = findHandle(panel, options.handleSelector);
    if (handle) {
        handle.classList.add('panel-drag-handle');
        if (!handle.title && !handle.querySelector('.panel-chrome-title')) {
            handle.title = 'Drag to move';
        }
    }

    const lockBtn = handle?.querySelector('.panel-lock-btn');

    let resizeEl = panel.querySelector('.panel-resize-handle');
    if (!resizeEl) {
        resizeEl = document.createElement('div');
        resizeEl.className = 'panel-resize-handle';
        resizeEl.title = 'Drag to resize';
        panel.appendChild(resizeEl);
    }

    ensureScrollRegion(panel, handle, resizeEl, options.contentSelector);

    const saved = loadAll()[id];
    let locked = saved?.locked ?? false;
    let rect = saved ? clampRect(saved, limits) : defaultRect(panel, { ...options.defaultSize, limits });

    const api = {
        id,
        isLocked: () => locked,
        setLocked: (value) => {
            locked = !!value;
            syncLockUi(panel, lockBtn, locked);
            saveOne(id, rect, locked);
        },
        clamp: () => {
            rect = clampRect(rect, limits);
            applyRect(panel, rect);
            saveOne(id, rect, locked);
        },
        ensureMinWidth: (minW) => {
            const rightEdge = rect.x + rect.w;
            if (rect.w < minW) {
                rect.w = minW;
                const anchor = options.anchor || options.defaultSize?.anchor;
                if (anchor?.includes('right')) {
                    rect.x = rightEdge - rect.w;
                }
                rect = clampRect(rect, limits);
                applyRect(panel, rect);
                saveOne(id, rect, locked);
            }
        },
        setStripWidth: (stripW, remember = true) => {
            const anchor = options.anchor || options.defaultSize?.anchor || '';
            const rightEdge = rect.x + rect.w;
            if (remember && rect.w > stripW + 8) {
                panel._floatExpandedW = rect.w;
            }
            rect.w = Math.max(stripW, limits.minW ?? MIN_W);
            if (anchor.includes('right')) {
                rect.x = rightEdge - rect.w;
            }
            rect = clampRect(rect, limits);
            applyRect(panel, rect);
            panel.classList.add('float-strip');
            saveOne(id, rect, locked);
        },
        restoreExpandedWidth: (fallbackW = 300) => {
            const anchor = options.anchor || options.defaultSize?.anchor || '';
            const rightEdge = rect.x + rect.w;
            const target = Math.max(panel._floatExpandedW || fallbackW, fallbackW);
            rect.w = Math.min(target, limits.maxW ?? readBounds().maxW);
            if (anchor.includes('right')) {
                rect.x = rightEdge - rect.w;
            }
            rect = clampRect(rect, limits);
            applyRect(panel, rect);
            panel.classList.remove('float-strip');
            saveOne(id, rect, locked);
        },
        reset: () => {
            rect = defaultRect(panel, { ...options.defaultSize, limits });
            locked = false;
            syncLockUi(panel, lockBtn, locked);
            applyRect(panel, rect);
            saveOne(id, rect, locked);
        },
        getRect: () => ({ ...rect }),
    };

    applyRect(panel, rect);
    syncLockUi(panel, lockBtn, locked);

    lockBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        api.setLocked(!locked);
    });

    lockBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());

    if (handle) {
        handle.addEventListener('pointerdown', (e) => {
            if (locked) return;
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
                }, limits);
                applyRect(panel, rect);
            };

            const onUp = () => {
                handle.classList.remove('dragging');
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
                saveOne(id, rect, locked);
            };

            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
        });
    }

    resizeEl.addEventListener('pointerdown', (e) => {
        if (locked) return;
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
            }, limits);
            applyRect(panel, rect);
        };

        const onUp = () => {
            resizeEl.classList.remove('resizing');
            resizeEl.removeEventListener('pointermove', onMove);
            resizeEl.removeEventListener('pointerup', onUp);
            saveOne(id, rect, locked);
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

const CHROME_PANELS = [
    {
        selector: '#engine-toolbar',
        id: 'engine-toolbar',
        handleSelector: '.panel-chrome-header',
        defaultSize: { w: 500, h: 128, anchor: 'left-center' },
        minW: 260,
        minH: 88,
        maxW: 920,
        maxH: 420,
        anchor: 'left-center',
    },
    {
        selector: '#scene-dock',
        id: 'scene-dock',
        handleSelector: '.panel-chrome-header',
        defaultSize: { w: 56, h: 340, anchor: 'right-center' },
        minW: 52,
        minH: 160,
        maxW: 400,
        maxH: 680,
        anchor: 'right-center',
    },
];

const PANEL_CONFIG = [
    {
        selector: '#proximity-panel',
        id: 'proximity-panel',
        handleSelector: '.panel-chrome-header',
        defaultSize: { w: 300, h: 88, anchor: 'bottom-center' },
        minW: 220,
        minH: 72,
        maxW: 480,
        maxH: 160,
        anchor: 'bottom-center',
    },
    { selector: '#insert-sheet', defaultSize: { w: 420, h: 440 } },
    { selector: '#bindings-sheet', defaultSize: { w: 440, h: 520 } },
    { selector: '#host-panel-sheet', defaultSize: { w: 400, h: 480 } },
    { selector: '#world-sheet', defaultSize: { w: 420, h: 520 } },
    { selector: '#json-modal', defaultSize: { w: 600, h: 500 } },
];

export function initPanelDrag() {
    CHROME_PANELS.forEach((cfg) => {
        const el = document.querySelector(cfg.selector);
        if (el) setupFloatPanel(el, cfg);
    });

    PANEL_CONFIG.forEach((cfg) => {
        const el = document.querySelector(cfg.selector);
        if (el) setupFloatPanel(el, cfg);
    });

    const allSelectors = [
        ...CHROME_PANELS.map((c) => c.selector),
        ...PANEL_CONFIG.map((c) => c.selector),
    ];


    const clampAll = () => {
        allSelectors.forEach((selector) => {
            document.querySelector(selector)?._floatApi?.clamp();
        });
        resolveChromeOverlap();
    };

    window.addEventListener('resize', clampAll);
    window.addEventListener('orientationchange', () => setTimeout(clampAll, 250));
    window.visualViewport?.addEventListener('resize', clampAll);
    document.addEventListener('immersive-change', clampAll);
}

function rectsOverlap(a, b, gap = 12) {
    return !(a.x + a.w + gap <= b.x
        || b.x + b.w + gap <= a.x
        || a.y + a.h + gap <= b.y
        || b.y + b.h + gap <= a.y);
}

function resolveChromeOverlap() {
    const toolbar = document.getElementById('engine-toolbar');
    const dock = document.getElementById('scene-dock');
    const tApi = toolbar?._floatApi;
    const dApi = dock?._floatApi;
    if (!tApi || !dApi || tApi.isLocked?.() || dApi.isLocked?.()) return;

    const t = tApi.getRect();
    const d = dApi.getRect();
    if (!rectsOverlap(t, d)) return;

    const { pad, nav, maxH } = readBounds();
    const portrait = window.innerHeight > window.innerWidth;
    const dockRect = portrait
        ? { x: pad, y: nav + pad + t.h + 12, w: Math.max(d.w, 280), h: Math.min(d.h, maxH * 0.45) }
        : {
            x: window.innerWidth - Math.max(d.w, 56) - pad,
            y: nav + pad + Math.max(0, (maxH - d.h) / 2),
            w: d.w,
            h: d.h,
        };
    dock._floatRect = clampRect(dockRect, {
        minW: 52,
        minH: 120,
        maxW: 480,
        maxH: 720,
    });
    applyRect(dock, dock._floatRect);
    saveOne('scene-dock', dock._floatRect, dApi.isLocked());
}

window.PanelDrag = { initPanelDrag, setupFloatPanel, ensurePanelVisible };