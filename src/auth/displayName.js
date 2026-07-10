/**
 * Player display name — custom input OR optional X profile fields.
 * source: custom | x_username | x_name
 */

const NAME_KEY = 'threshold_player_name';
const SOURCE_KEY = 'threshold_name_source';
const CUSTOM_KEY = 'threshold_player_name_custom';

function xUser() {
    return window.XAuth?.getUser?.() || null;
}

export const DisplayName = {
    NAME_KEY,
    SOURCE_KEY,

    getSource() {
        const s = localStorage.getItem(SOURCE_KEY) || 'custom';
        if (s === 'x_username' || s === 'x_name') return s;
        return 'custom';
    },

    setSource(source) {
        const s = source === 'x_username' || source === 'x_name' ? source : 'custom';
        localStorage.setItem(SOURCE_KEY, s);
        this.syncUi();
        this.applyResolvedToStorage();
        window.dispatchEvent(new CustomEvent('display-name-change', { detail: this.resolve() }));
        return s;
    },

    getCustom() {
        return localStorage.getItem(CUSTOM_KEY)
            || (this.getSource() === 'custom' ? localStorage.getItem(NAME_KEY) : '')
            || '';
    },

    setCustom(name) {
        const n = String(name || '').trim().slice(0, 24);
        localStorage.setItem(CUSTOM_KEY, n);
        if (this.getSource() === 'custom' && n) {
            localStorage.setItem(NAME_KEY, n);
        }
        this.applyResolvedToStorage();
        window.dispatchEvent(new CustomEvent('display-name-change', { detail: this.resolve() }));
        return n;
    },

    /** Resolved display name for Session / multiplayer */
    resolve() {
        const source = this.getSource();
        const xu = xUser();
        if (source === 'x_username' && xu?.username) {
            return String(xu.username).slice(0, 24);
        }
        if (source === 'x_name' && (xu?.name || xu?.username)) {
            return String(xu.name || xu.username).slice(0, 24);
        }
        const custom = this.getCustom();
        if (custom) return custom.slice(0, 24);
        if (xu?.username) return String(xu.username).slice(0, 24);
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
            const sourceEl = document.getElementById('lobby-name-source');
            const input = document.getElementById('lobby-name');
            const rawSource = sourceEl?.value || this.getSource();
            let source = rawSource === 'x_username' || rawSource === 'x_name' ? rawSource : 'custom';
            // Fall back to custom if X source but not signed in
            if (source.startsWith('x_') && !xUser()) source = 'custom';
            localStorage.setItem(SOURCE_KEY, source);

            if (source === 'custom' && input) {
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
        const source = this.getSource();
        const sourceEl = document.getElementById('lobby-name-source');
        const input = document.getElementById('lobby-name');
        const hint = document.getElementById('lobby-name-hint');
        const xu = xUser();
        const signedIn = Boolean(xu);

        if (sourceEl) {
            sourceEl.value = source;
            // Disable X options if not signed in
            [...sourceEl.options].forEach((opt) => {
                if (opt.value.startsWith('x_')) {
                    opt.disabled = !signedIn;
                    if (opt.value === 'x_username' && xu?.username) {
                        opt.textContent = `X handle (@${xu.username})`;
                    }
                    if (opt.value === 'x_name' && xu) {
                        opt.textContent = `X name (${xu.name || xu.username || '…'})`;
                    }
                }
            });
            if (!signedIn && source.startsWith('x_')) {
                sourceEl.value = 'custom';
                localStorage.setItem(SOURCE_KEY, 'custom');
            }
        }

        if (input) {
            const usingX = this.getSource().startsWith('x_') && signedIn;
            input.readOnly = usingX;
            input.classList.toggle('lobby-name-from-x', usingX);
            if (usingX) {
                input.value = this.resolve();
                input.title = 'Using X profile — switch source to Custom to type a name';
            } else {
                input.readOnly = false;
                input.value = this.getCustom() || this.resolve();
                input.title = 'Display name in multiplayer';
            }
        }

        if (hint) {
            if (!signedIn) {
                hint.textContent = 'Optional: Sign in with X to use your @handle or X display name.';
            } else if (this.getSource() === 'x_username') {
                hint.textContent = `Using X handle @${xu.username} — change source anytime.`;
            } else if (this.getSource() === 'x_name') {
                hint.textContent = `Using X name “${xu.name || xu.username}” — change source anytime.`;
            } else {
                hint.textContent = 'Custom name (or pick X handle / X name from the menu).';
            }
        }

        // Preview chips
        document.querySelectorAll('[data-display-name]').forEach((el) => {
            el.textContent = this.resolve();
        });
    },

    bindUi() {
        if (this._bound) return;
        this._bound = true;

        document.getElementById('lobby-name-source')?.addEventListener('change', (e) => {
            this.setSource(e.target.value);
        });
        document.getElementById('lobby-name')?.addEventListener('input', (e) => {
            if (this.getSource() !== 'custom') return;
            const n = String(e.target.value || '').slice(0, 24);
            localStorage.setItem(CUSTOM_KEY, n);
            localStorage.setItem(NAME_KEY, n.trim() || n);
        });
        document.getElementById('lobby-name')?.addEventListener('change', () => {
            if (this.getSource() === 'custom') this.setCustom(document.getElementById('lobby-name')?.value);
        });

        window.addEventListener('x-auth-change', () => {
            // On first X login, offer X handle if still default/custom empty
            const xu = xUser();
            const custom = this.getCustom();
            const source = this.getSource();
            if (xu && source === 'custom' && (!custom || /^Player/i.test(custom))) {
                // Soft default: prefer handle but leave source custom until user picks X
                // Don't force — just refresh options
            }
            this.syncUi();
        });

        this.syncUi();
    },
};

window.DisplayName = DisplayName;
