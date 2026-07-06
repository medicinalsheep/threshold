/** Sprint I — guest starter rebuild visibility */

const MAX_HISTORY = 10;

export const GuestRebuildTelemetry = {
    _last: null,
    _history: [],

    record(result = {}) {
        const entry = {
            rebuilt: result.rebuilt || [],
            upgrades: result.upgrades || [],
            skipped: result.skipped ?? false,
            at: Date.now(),
            mode: window.Network?.mode || 'solo',
        };
        this._last = entry;
        this._history.unshift(entry);
        if (this._history.length > MAX_HISTORY) this._history.pop();

        const total = entry.rebuilt.length + entry.upgrades.length;
        if (total > 0) {
            console.info('[guest-rebuild]', [...entry.rebuilt, ...entry.upgrades].join(', '));
            window.UI?.status?.(`Guest rebuild: +${total} layer${total === 1 ? '' : 's'} (${entry.rebuilt.length} modules, ${entry.upgrades.length} upgrades)`);
        }

        window.dispatchEvent(new CustomEvent('threshold:guest-rebuild', { detail: entry }));
        window.CreatorHud?.updateSync?.();
        return entry;
    },

    getLast() {
        return this._last;
    },

    getHistory() {
        return this._history;
    },

    summary() {
        if (!this._last) return null;
        const rebuilt = this._last.rebuilt?.length || 0;
        const upgrades = this._last.upgrades?.length || 0;
        const total = rebuilt + upgrades;
        if (!total) return { total: 0, label: 'rebuild ok', detail: 'No missing starter layers' };
        const parts = [...(this._last.rebuilt || []), ...(this._last.upgrades || [])];
        return {
            total,
            label: `rebuild +${total}`,
            detail: parts.slice(0, 6).join(', ') + (parts.length > 6 ? '…' : ''),
            at: this._last.at,
        };
    },

    renderSyncStoryLines() {
        const lines = [];
        const last = this.summary();
        if (last?.total) {
            lines.push(`<p class="sync-story-audio"><strong>Last guest rebuild</strong> — ${last.label}: ${last.detail}</p>`);
        }
        if (this._history.length > 1) {
            lines.push(`<p class="sync-story-foot">${this._history.length} rebuild events this session.</p>`);
        }
        return lines.join('');
    },
};

window.GuestRebuildTelemetry = GuestRebuildTelemetry;