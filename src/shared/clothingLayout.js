/**
 * Clothing / accessories design layout — slot rail + catalog board over AvatarMod.
 * Does not replace AvatarComposer/AvatarMod apply path; only presentation + selection.
 */

import { AvatarMod, resolveMods } from './avatarMod.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
}

function slotEntries() {
    const slots = AvatarMod.slots() || {};
    return Object.entries(slots)
        .map(([id, def]) => ({ id, ...def }))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function equippedBySlot(selectedIds = []) {
    const catalog = AvatarMod.catalog() || {};
    const resolved = resolveMods(selectedIds);
    const bySlot = new Map();
    const accessories = [];
    for (const id of resolved) {
        const spec = catalog[id];
        if (!spec) continue;
        const slot = spec.slot || 'accessory';
        const def = AvatarMod.slots()?.[slot];
        if (def?.exclusive === false || slot === 'accessory') {
            accessories.push(id);
        } else {
            bySlot.set(slot, id);
        }
    }
    return { bySlot, accessories, resolved };
}

export const ClothingLayout = {
    _selected: [],
    _filterSlot: null,
    _filterCategory: null,
    _q: '',
    _bound: false,
    _onChange: null,

    getSelected() {
        return [...this._selected];
    },

    setSelected(ids = [], opts = {}) {
        this._selected = resolveMods(Array.isArray(ids) ? ids : []);
        if (!opts.silent) this.render();
        if (!opts.silent) this._emit();
        return this._selected;
    },

    onChange(fn) {
        this._onChange = typeof fn === 'function' ? fn : null;
    },

    _emit() {
        this._onChange?.(this.getSelected());
        window.dispatchEvent(new CustomEvent('clothing-layout-change', {
            detail: { mods: this.getSelected() },
        }));
    },

    mount(opts = {}) {
        const root = document.getElementById('skin-wardrobe');
        if (!root) return false;

        if (Array.isArray(opts.selected)) {
            this._selected = resolveMods(opts.selected);
        }

        if (opts.onChange) this.onChange(opts.onChange);

        if (!this._bound) {
            this._bound = true;
            root.addEventListener('click', (e) => this._onClick(e));
            root.addEventListener('change', (e) => this._onChangeEvent(e));
            root.addEventListener('input', (e) => {
                const search = e.target?.closest?.('#skin-wardrobe-search');
                if (search) {
                    this._q = search.value.trim();
                    this.renderCatalog();
                }
            });
        }

        this.render();
        return true;
    },

    /** Full wardrobe paint into #skin-wardrobe */
    render() {
        const root = document.getElementById('skin-wardrobe');
        if (!root) return;

        const presetsEl = document.getElementById('skin-mod-presets');
        if (presetsEl && !presetsEl.dataset.wardrobeReady) {
            presetsEl.dataset.wardrobeReady = '1';
            presetsEl.innerHTML = AvatarMod.renderPresetButtonsHtml?.() || '';
            presetsEl.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-mod-preset]');
                if (!btn) return;
                const preset = AvatarMod.presets()?.[btn.dataset.modPreset];
                if (!preset) return;
                this.setSelected(preset.mods || []);
                window.UI?.status?.(`Outfit: ${btn.textContent.trim()}`);
                // Live apply if player spawned
                if (window.PlayerController?.spawned) {
                    void window.UI?.reloadPlayerSkin?.();
                }
            });
        }

        root.innerHTML = `
            <div class="wardrobe-board">
                <div class="wardrobe-rail" id="skin-wardrobe-rail" aria-label="Equipment slots"></div>
                <div class="wardrobe-main">
                    <div class="wardrobe-filters" id="skin-wardrobe-filters"></div>
                    <input type="search" id="skin-wardrobe-search" class="insert-input wardrobe-search"
                        placeholder="Search gear…" value="${esc(this._q)}" autocomplete="off">
                    <div class="wardrobe-catalog" id="skin-wardrobe-catalog"></div>
                    <p class="insert-hint wardrobe-hint">Exclusive slots: last pick wins. Accessories stack (max 6). Catalog supports optional GLB overrides later.</p>
                </div>
            </div>
        `;

        this.renderRail();
        this.renderFilters();
        this.renderCatalog();
        this.syncMirror();
    },

    renderRail() {
        const el = document.getElementById('skin-wardrobe-rail');
        if (!el) return;
        const { bySlot, accessories } = equippedBySlot(this._selected);
        const catalog = AvatarMod.catalog() || {};
        const slots = slotEntries();

        el.innerHTML = slots.map((slot) => {
            const exclusive = slot.exclusive !== false && slot.id !== 'accessory';
            let equipped = [];
            if (slot.id === 'accessory' || !exclusive) {
                equipped = accessories
                    .filter((id) => (catalog[id]?.slot || 'accessory') === slot.id)
                    .map((id) => ({ id, label: catalog[id]?.label || id }));
            } else if (bySlot.has(slot.id)) {
                const id = bySlot.get(slot.id);
                equipped = [{ id, label: catalog[id]?.label || id }];
            }
            const filled = equipped.length > 0;
            const active = this._filterSlot === slot.id ? ' active' : '';
            const pieces = equipped.length
                ? equipped.map((p) => `
                    <button type="button" class="wardrobe-rail-piece" data-unequip="${esc(p.id)}" title="Unequip ${esc(p.label)}">
                        ${esc(p.label)} <span aria-hidden="true">×</span>
                    </button>`).join('')
                : '<span class="wardrobe-rail-empty">empty</span>';

            return `
                <button type="button" class="wardrobe-rail-slot${filled ? ' filled' : ''}${active}"
                    data-filter-slot="${esc(slot.id)}" title="${esc(slot.label || slot.id)}">
                    <span class="wardrobe-rail-label">${esc(slot.label || slot.id)}</span>
                    <span class="wardrobe-rail-items">${pieces}</span>
                </button>
            `;
        }).join('');
    },

    renderFilters() {
        const el = document.getElementById('skin-wardrobe-filters');
        if (!el) return;
        const cats = AvatarMod.categories() || [];
        const allCat = this._filterCategory == null ? ' active' : '';
        const allSlot = this._filterSlot == null ? ' active' : '';

        el.innerHTML = `
            <div class="wardrobe-chip-row">
                <button type="button" class="wardrobe-chip${allCat}" data-filter-category="">All</button>
                ${cats.map((c) => {
                    const act = this._filterCategory === c.id ? ' active' : '';
                    return `<button type="button" class="wardrobe-chip${act}" data-filter-category="${esc(c.id)}">${esc(c.label || c.id)}</button>`;
                }).join('')}
            </div>
            <div class="wardrobe-chip-row wardrobe-chip-row-slots">
                <button type="button" class="wardrobe-chip wardrobe-chip-slot${allSlot}" data-clear-slot-filter>All slots</button>
                ${this._filterSlot
                    ? `<span class="wardrobe-chip active wardrobe-chip-slot">${esc(AvatarMod.slots()?.[this._filterSlot]?.label || this._filterSlot)}</span>`
                    : ''}
            </div>
        `;
    },

    renderCatalog() {
        const el = document.getElementById('skin-wardrobe-catalog');
        if (!el) return;
        const set = new Set(this._selected);
        const items = AvatarMod.list({
            category: this._filterCategory || undefined,
            slot: this._filterSlot || undefined,
            q: this._q || undefined,
        });

        if (!items.length) {
            el.innerHTML = '<p class="insert-hint">No gear matches filters</p>';
            this.syncMirror();
            return;
        }

        el.innerHTML = `
            <div class="wardrobe-catalog-grid">
                ${items.map((m) => {
                    const on = set.has(m.id);
                    const tags = (m.tags || []).slice(0, 3).join(' · ');
                    const glb = m.glb ? ' · GLB' : '';
                    return `
                        <label class="wardrobe-card${on ? ' equipped' : ''}" title="${esc(tags)}${glb}">
                            <input type="checkbox" data-mod-id="${esc(m.id)}" ${on ? 'checked' : ''}>
                            <span class="wardrobe-card-label">${esc(m.label || m.id)}</span>
                            <span class="wardrobe-card-meta">${esc(m.slot || '')}${m.category ? ` · ${esc(m.category)}` : ''}</span>
                        </label>
                    `;
                }).join('')}
            </div>
        `;
        this.syncMirror();
    },

    /** Keep #skin-mod-list checkboxes in sync for legacy modsFromUi fallback */
    syncMirror() {
        const list = document.getElementById('skin-mod-list');
        if (!list) return;
        const set = new Set(this._selected);
        list.innerHTML = this._selected.map((id) => `
            <input type="checkbox" data-mod-id="${esc(id)}" checked>
        `).join('');
        // Ensure unchecked ids are not present — ClothingLayout.getSelected is source of truth
        void set;
    },

    _collectFromCatalogDom() {
        const catalog = document.getElementById('skin-wardrobe-catalog');
        if (!catalog) return null;
        // Merge: keep selected that are filtered out, update visible
        const visible = new Map();
        catalog.querySelectorAll('input[data-mod-id]').forEach((el) => {
            visible.set(el.dataset.modId, el.checked);
        });
        let next = [...this._selected];
        visible.forEach((checked, id) => {
            const has = next.includes(id);
            if (checked && !has) next.push(id);
            if (!checked && has) next = next.filter((x) => x !== id);
        });
        return resolveMods(next);
    },

    _onClick(e) {
        const unequip = e.target.closest?.('[data-unequip]');
        if (unequip) {
            e.preventDefault();
            e.stopPropagation();
            const id = unequip.dataset.unequip;
            this.setSelected(this._selected.filter((x) => x !== id));
            if (window.PlayerController?.spawned) void window.UI?.reloadPlayerSkin?.();
            return;
        }

        const slotBtn = e.target.closest?.('[data-filter-slot]');
        if (slotBtn && !e.target.closest('[data-unequip]')) {
            const slot = slotBtn.dataset.filterSlot;
            this._filterSlot = this._filterSlot === slot ? null : slot;
            this.renderFilters();
            this.renderCatalog();
            this.renderRail();
            return;
        }

        const cat = e.target.closest?.('[data-filter-category]');
        if (cat) {
            const id = cat.dataset.filterCategory || null;
            this._filterCategory = id || null;
            this.renderFilters();
            this.renderCatalog();
            return;
        }

        if (e.target.closest?.('[data-clear-slot-filter]')) {
            this._filterSlot = null;
            this.renderFilters();
            this.renderCatalog();
            this.renderRail();
        }
    },

    _onChangeEvent(e) {
        const input = e.target?.closest?.('input[data-mod-id]');
        if (!input) return;

        // Exclusive slot: uncheck siblings in catalog
        if (input.checked) {
            const id = input.dataset.modId;
            const spec = AvatarMod.catalog()?.[id];
            const slot = spec?.slot;
            const exclusive = slot && AvatarMod.slots()?.[slot]?.exclusive;
            if (exclusive) {
                const catalog = document.getElementById('skin-wardrobe-catalog');
                catalog?.querySelectorAll('input[data-mod-id]').forEach((el) => {
                    if (el === input) return;
                    const s = AvatarMod.catalog()?.[el.dataset.modId];
                    if (s?.slot === slot) el.checked = false;
                });
            }
        }

        const next = this._collectFromCatalogDom();
        if (next) {
            this._selected = next;
            this.renderRail();
            this.renderCatalog();
            this.syncMirror();
            this._emit();
            if (window.PlayerController?.spawned) {
                void window.UI?.reloadPlayerSkin?.();
            }
        }
    },
};

window.ClothingLayout = ClothingLayout;
