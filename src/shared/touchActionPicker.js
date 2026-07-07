import { CONTROL_ACTIONS, CONTROL_GROUPS } from './controls.js';
import { STANDARD_TOUCH_BUTTONS } from './touchControls.js';

let _onPick = null;
let _selected = 'interact';

function el(id) {
    return document.getElementById(id);
}

function defaultLabel(action) {
    const builtIn = STANDARD_TOUCH_BUTTONS.find((b) => b.action === action);
    if (builtIn?.label) return String(builtIn.label).slice(0, 4);
    const meta = CONTROL_ACTIONS[action];
    if (!meta) return 'BTN';
    return meta.label.split(/[\s/]/)[0].slice(0, 4).toUpperCase() || 'BTN';
}

function setVisible(on) {
    const modal = el('touch-action-picker-modal');
    if (!modal) return;
    modal.classList.toggle('open', on);
    document.body.classList.toggle('touch-picker-open', on);
}

function renderActions(filter = '') {
    const grid = el('touch-action-picker-grid');
    if (!grid) return;

    const q = filter.trim().toLowerCase();
    const html = CONTROL_GROUPS.map((group) => {
        const items = Object.entries(CONTROL_ACTIONS).filter(([id, meta]) => {
            if (meta.group !== group.id) return false;
            if (!q) return true;
            return id.includes(q)
                || meta.label.toLowerCase().includes(q)
                || group.label.toLowerCase().includes(q);
        });
        if (!items.length) return '';
        return `
            <div class="touch-action-picker-group">
                <span class="touch-action-picker-group-label">${group.label}</span>
                <div class="touch-action-picker-chips">
                    ${items.map(([id, meta]) => `
                        <button type="button"
                            class="touch-action-chip${id === _selected ? ' active' : ''}"
                            data-touch-action="${id}"
                            title="${meta.label}">
                            ${meta.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = html || '<p class="insert-hint">No actions match your search.</p>';
    grid.querySelectorAll('[data-touch-action]').forEach((btn) => {
        btn.addEventListener('click', () => selectAction(btn.dataset.touchAction));
    });
}

function selectAction(action) {
    if (!CONTROL_ACTIONS[action]) return;
    _selected = action;
    const labelInput = el('touch-action-picker-label');
    if (labelInput) labelInput.value = defaultLabel(action);
    const meta = el('touch-action-picker-meta');
    if (meta) meta.textContent = CONTROL_ACTIONS[action].label;
    gridHighlight(action);
}

function gridHighlight(action) {
    document.querySelectorAll('#touch-action-picker-grid [data-touch-action]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.touchAction === action);
    });
}

function confirmPick() {
    const labelInput = el('touch-action-picker-label');
    const label = (labelInput?.value || '').trim().slice(0, 4) || defaultLabel(_selected);
    const cb = _onPick;
    _onPick = null;
    setVisible(false);
    cb?.({ action: _selected, label });
}

export const TouchActionPicker = {
    init() {
        el('touch-action-picker-close')?.addEventListener('click', () => {
            _onPick = null;
            setVisible(false);
        });
        el('touch-action-picker-cancel')?.addEventListener('click', () => {
            _onPick = null;
            setVisible(false);
        });
        el('touch-action-picker-add')?.addEventListener('click', () => confirmPick());
        el('touch-action-picker-search')?.addEventListener('input', (e) => {
            renderActions(e.target.value);
            gridHighlight(_selected);
        });
        el('touch-action-picker-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'touch-action-picker-modal') {
                _onPick = null;
                setVisible(false);
            }
        });
    },

    open(onPick, preferredAction = 'interact') {
        _onPick = typeof onPick === 'function' ? onPick : null;
        _selected = CONTROL_ACTIONS[preferredAction] ? preferredAction : 'interact';
        const search = el('touch-action-picker-search');
        if (search) search.value = '';
        const labelInput = el('touch-action-picker-label');
        if (labelInput) labelInput.value = defaultLabel(_selected);
        const meta = el('touch-action-picker-meta');
        if (meta) meta.textContent = CONTROL_ACTIONS[_selected]?.label || '';
        renderActions();
        setVisible(true);
        labelInput?.focus();
    },
};

window.TouchActionPicker = TouchActionPicker;