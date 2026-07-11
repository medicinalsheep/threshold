/**
 * Player display name — custom lobby input (X OAuth removed).
 */

const NAME_KEY = 'threshold_player_name';
const CUSTOM_KEY = 'threshold_player_name_custom';

export const DisplayName = {
    NAME_KEY,

    getCustom() {
        return localStorage.getItem(CUSTOM_KEY)
            || localStorage.getItem(NAME_KEY)
            || '';
    },

    setCustom(name) {
        const n = String(name || '').trim().slice(0, 24);
        localStorage.setItem(CUSTOM_KEY, n);
        if (n) localStorage.setItem(NAME_KEY, n);
        this.applyResolvedToStorage();
        window.dispatchEvent(new CustomEvent('display-name-change', { detail: this.resolve() }));
        return n;
    },

    /** Resolved display name for Session / multiplayer */
    resolve() {
        const custom = this.getCustom();
        if (custom) return custom.slice(0, 24);
        return localStorage.getItem(NAME_KEY) || 'Player';
    },

    applyResolvedToStorage() {
        const n = this.resolve();
        localStorage.setItem(NAME_KEY, n);
        if (window.Session) {
            window.Session.playerName = n;
            window.Session.updateUi?.();
        }
        return n;
    },

    /** Read from lobby controls + persist (safe — never throws) */
    commitFromLobby() {
        try {
            const input = document.getElementById('lobby-name');
            if (input) {
                const n = String(input.value || '').trim().slice(0, 24);
                if (n) {
                    localStorage.setItem(CUSTOM_KEY, n);
                    localStorage.setItem(NAME_KEY, n);
                }
            }
            const resolved = this.resolve() || 'Player';
            localStorage.setItem(NAME_KEY, resolved);
            if (window.Session) {
                window.Session.playerName = resolved;
                try { window.Session.updateUi?.(); } catch { /* ignore */ }
            }
            try { this.syncUi(); } catch { /* ignore */ }
            return resolved;
        } catch (e) {
            console.warn('[display-name] commit', e);
            return localStorage.getItem(NAME_KEY) || 'Player';
        }
    },

    syncUi() {
        const input = document.getElementById('lobby-name');
        const hint = document.getElementById('lobby-name-hint');
        if (input) {
            input.readOnly = false;
            input.classList.remove('lobby-name-from-x');
            input.value = this.getCustom() || this.resolve();
            input.title = 'Display name in multiplayer';
        }
        if (hint) {
            hint.textContent = 'Shown in multiplayer · optional';
        }
        document.querySelectorAll('[data-display-name]').forEach((el) => {
            el.textContent = this.resolve();
        });
    },

    bindUi() {
        if (this._bound) return;
        this._bound = true;
        document.getElementById('lobby-name')?.addEventListener('input', (e) => {
            const n = String(e.target.value || '').slice(0, 24);
            localStorage.setItem(CUSTOM_KEY, n);
            localStorage.setItem(NAME_KEY, n.trim() || n);
        });
        document.getElementById('lobby-name')?.addEventListener('change', () => {
            this.setCustom(document.getElementById('lobby-name')?.value);
        });
        this.syncUi();
    },
};

window.DisplayName = DisplayName;
